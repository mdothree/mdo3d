# MDO3D Leads — web frontend (leads.mdo3d.com)

React + Vite app for the per-state business-filings leads product. API: `https://leadsapi.mdo3d.com`
(`VITE_API_URL` overrides). Plan: `~/latarence/docs/plans/input_prompts_0/PART_C_product_research_content.md` §C5.

```bash
npm ci
npm run dev      # local dev
npm run build    # -> dist/ (served by `serve -s dist -l 3050` in the Dockerfile)
```

Build-time env (all optional): `VITE_API_URL`, `VITE_FIREBASE_*` (without them sign-in shows
"not available on this build"), `VITE_FIREBASE_APPCHECK_*`.

## Rules this app keeps

- **No mock or sample data in the app.** Loading / empty ("No filings match these filters.") /
  API-down ("Service unavailable — no results were generated.") are explicit states. Test fixtures live
  only in the QA harness (Playwright route interception), never here.
- **Paid-only.** No "free" wording. Search, CSV export and saved searches need an active plan; the
  backend decides (401 → sign in, 402/403 → plan required). Early access via promo code.
- **Checkout fails closed.** The checkout button renders only when `GET /v1/account` reports
  `features.checkout: true`, and the app only follows a backend-issued `https://checkout.stripe.com/…` URL.
  Otherwise the plan page says "Plans opening soon". The app never calls Stripe directly.
- **Saved searches** render only when `features.saved_searches: true`; otherwise "coming soon". The button
  says "Save search", plus "(weekly email)" only when `features.saved_search_email: true`.
- **States:** only states `GET /coverage` reports with filings are selectable; others show "coming". If that
  call fails, only states with an adapter in `src/adapters/` are enabled (FL, CO, CT).
- House style: MDO tokens (`projects/mdo3d/landing`), light/dark via `prefers-color-scheme`, WCAG AA,
  44px targets, skip link + `<main>`, labelled controls. Results are a table at ≥768px and cards below.

## API contract

Canonical typed client: `web/client/search.ts` (`createLeadsClient`). `src/lib/api.js` mirrors it because
the Docker build context is `web/frontend` only. Requests send `Authorization: Bearer <Firebase ID token>`
when signed in. Errors are JSON `{"detail": "..."}`. The UI renders them like this: 401 → "Sign in",
402 → "An active plan is required", 403 → "That state is not in your plan", 400/422 → bad filter,
5xx or network failure → "Service unavailable — no results were generated."

**Live on the backend** (`web/backend/api.py`; the account-level `/v1/*` endpoints and `/filing-types` were added after 98a9f41):

| Method | Path | Notes |
|---|---|---|
| GET | `/coverage` | public. `{states:[{state, filings, latest_filed_date, latest_source_date, last_ingest_at}]}`. A state is selectable only when it has `filings > 0`. If the call fails, FL, CO and CT (the adapters in `src/adapters/`) stay enabled and search then reports the outage. |
| GET | `/verticals` | public. `{verticals:[{id, label, match}]}`. Labelled "Name contains… (keyword group)": they match the entity **name** only, not an industry. |
| GET | `/filings` | paid. `state, filing_type, entity_kind, vertical, q, date_from, date_to, limit, offset` (also `county`, `include_inactive`). Returns `{filings, total, limit, offset, states}`. Rows are flat (`address_1, address_2, city, address_state, zip_code`) and `normalizeFiling()` maps them to `principal_address`. The UI defaults to the last 30 days of `filed_date`, because the daily feed also carries amendments to older entities. |
| GET | `/filings/export.csv` | paid. Same filters minus limit/offset, at most 10k rows. CORS exposes `X-Total-Count`, `X-Truncated` and `Content-Disposition`, so the UI can read the row count and note truncation. |
| GET | `/filing-types?state=XX` | public reference data. `{state, filing_types:[{code, label, entity_kind, filings}]}`. FL, CO and CT come from the adapters' code tables (with stored counts). Other states and unknown codes list the distinct codes stored for them, labelled by code. 422 for a malformed state. |
| GET | `/v1/account` | signed in. `{email, plan:{active, name, source:"stripe"\|"promo"\|null, states, renews_at, expires_at}, features:{checkout, saved_searches, saved_search_email, promo_codes}}`. `email` is the user's own and is the only PII returned. A legacy paid profile also counts as active. |
| POST | `/v1/access/redeem` | signed in. `{code}` → `{ok, message}`. Account level: it creates **no** profile and schedules no email. 400 + `detail` for a bad, expired or used-up code. 429 after repeated failures. 503 when promo codes are switched off. If the plan is already active, the code is not used. |
| POST | `/v1/checkout` | signed in. `{success_url, cancel_url}` → `{checkout_url:"https://checkout.stripe.com/...", session_id}`. The server picks the price (`LEADS_STRIPE_PRICE_ID`), so the client never sends one. **503 "Plans opening soon" unless `LEADS_CHECKOUT_ENABLED=1`** (the default is off, and then `features.checkout` is false). 409 if the plan is already active. The Stripe webhook grants account-level access. |
| GET/POST | `/v1/saved-searches` | signed in (POST also needs an active plan: 402, or 403 for a state outside it). GET → `{saved_searches:[{id, name, query, cadence:"weekly", created_at, last_sent_at}], email:"enabled"\|"disabled"}`. POST `{name, query, cadence:"weekly"}` → the saved search plus `email`. `query` takes the `/filings` filter keys (limit/offset are dropped; unknown keys → 422). The weekly email sends only when `LEADS_ENABLE_DELIVERY=1`; until then `email` is `"disabled"` and nothing is sent. |
| DELETE | `/v1/saved-searches/{id}` | owner only → `{ok:true}` (404 otherwise). |
| GET | `/profiles` | Legacy per-profile records. Plan status now comes from `/v1/account`. |

The **county** filter is not shown: the FL corporate file and the CO dataset have no county field (the
adapters store `null`).

This contract is accurate against `web/backend/api.py` as of ff95884. The UI treats a 404 from these
paths as "not available yet" (an older backend) and never fakes success. The filing-type select is filled
from `/filing-types` (cached per state); if a state returns no codes, or the call fails, the select is
disabled with a note and search covers every filing type. The "Save search" button adds "(weekly email)"
only when `features.saved_search_email` is true.

`contacts` carries **verified contacts only** (never guessed emails).
