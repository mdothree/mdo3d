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
- **Saved searches** render only when `features.saved_searches: true`; otherwise "coming soon".
- **States:** only states `GET /v1/states` reports `live` are selectable; others show "coming". If that
  endpoint is missing, only states with an adapter in `src/adapters/` are enabled (FL).
- House style: MDO tokens (`projects/mdo3d/landing`), light/dark via `prefers-color-scheme`, WCAG AA,
  44px targets, skip link + `<main>`, labelled controls. Results are a table at ≥768px and cards below.

## API contract

Canonical typed client: `web/client/search.ts` (`createLeadsClient`). `src/lib/api.js` mirrors it because
the Docker build context is `web/frontend` only. Requests send `Authorization: Bearer <Firebase ID token>`
when signed in. Errors are JSON `{"detail": "..."}`. The UI renders them like this: 401 → "Sign in",
402 → "An active plan is required", 403 → "That state is not in your plan", 400/422 → bad filter,
5xx or network failure → "Service unavailable — no results were generated."

**Live on the backend** (`web/backend/api.py`, commit 7c11b41):

| Method | Path | Notes |
|---|---|---|
| GET | `/coverage` | public. `{states:[{state, filings, latest_filed_date, latest_source_date, last_ingest_at}]}`. A state is selectable only when it has `filings > 0`. If the call fails, FL and CO (the adapters in `src/adapters/`) stay enabled and search then reports the outage. |
| GET | `/verticals` | public. `{verticals:[{id, label, match}]}`. Labelled "Name contains… (keyword group)": they match the entity **name** only, not an industry. |
| GET | `/filings` | paid. `state, filing_type, entity_kind, vertical, q, date_from, date_to, limit, offset` (also `county`, `include_inactive`). Returns `{filings, total, limit, offset, states}`. Rows are flat (`address_1, address_2, city, address_state, zip_code`) and `normalizeFiling()` maps them to `principal_address`. The UI defaults to the last 30 days of `filed_date`, because the daily feed also carries amendments to older entities. |
| GET | `/filings/export.csv` | paid. Same filters minus limit/offset, at most 10k rows. The UI notes truncation when `X-Truncated: 1` is readable. **Backend: add `expose_headers=["X-Total-Count","X-Truncated","Content-Disposition"]` to CORS** so the browser can read them. |
| GET | `/profiles` | Used for plan status (any `paid` profile means active, matching `entitled_states`) until `/v1/account` exists. |

The **county** filter is not shown: the FL corporate file and the CO dataset have no county field (the
adapters store `null`).

**Proposed, not built yet.** The UI treats a 404 as "not available yet" and never fakes success:

| Method | Path | Request → Response |
|---|---|---|
| GET | `/v1/account` | → `{email, plan:{active, name, source:"stripe"\|"promo"\|null, renews_at}, features:{checkout, saved_searches, promo_codes}}` |
| POST | `/v1/access/redeem` | `{code}` → `{ok, message}` (400 + `detail` for a bad code). Account-level, with no profile needed. Today `/redeem-code` needs a `profile_id`, and creating a delivery profile only to redeem would schedule emails. |
| POST | `/v1/checkout` | `{success_url, cancel_url}` → `{checkout_url:"https://checkout.stripe.com/..."}`. The button renders only when `features.checkout` is true. |
| GET/POST | `/v1/saved-searches` | → `{saved_searches:[{id, name, query, cadence:"weekly", created_at, last_sent_at}]}` / `{name, query, cadence}` |
| DELETE | `/v1/saved-searches/{id}` | → `{ok:true}` |

`contacts` carries **verified contacts only** (never guessed emails).
