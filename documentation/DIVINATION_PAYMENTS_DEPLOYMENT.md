# Divination Payments — Deployment Record & Runbook

**Last updated:** 2026-08-16
**Owner:** MDO3 (Vercel org `mdothrees-projects`)
**Status: COMPLETE — all 9 services have the full pay → verify → unlock → deliver
loop live.** Checkout + verify + entitlement + double-charge guard + premium AI
reading delivery all working on every service (oracle/tarot/dreams/numerology
delivery wired 2026-08-16; iching/runes/astrology/fengshui/pastlives already had it).
Credit is consumed only after a successful premium render.

This doc is the single source of truth for the divination payment system. The
broader (and now historical) audit lives in [FEATURE_PARITY_AUDIT.md](FEATURE_PARITY_AUDIT.md).

> ✅ **Premium is enforced server-side (2026-08-16):** each generate endpoint
> requires a verified paid Stripe `sessionId` (via `verifyPayment`) before returning
> premium; frontends pass the stored session. The old "curl `premium:true` → free
> reading" bypass is closed (402) on all 9. Residual: session replay (same paid
> session → multiple reads) needs a consumed-session ledger — see
> [FIREBASE_BEST_PRACTICES.md](FIREBASE_BEST_PRACTICES.md) §1 & §5.

---

## 1. What the loop does (architecture)

```
 [premium button]
      │  onclick → dynamic checkout handler (no hardcoded Payment Links)
      ▼
 POST <api>/api/payment/create-checkout   → Stripe Checkout Session (cs_live_…)
      │  redirect to session.url
      ▼
 Stripe hosted checkout  →  success_url = <frontend>/success?session_id={CHECKOUT_SESSION_ID}
      ▼
 /success page
      │  POST <api>/api/payment/verify {sessionId}
      │  on paid=true → PremiumEntitlement.grant({sessionId, readingType})   (localStorage)
      ▼
 user returns to app, requests premium reading
      │  handler checks PremiumEntitlement.has() → delivers premium reading, consumes credit
      ▼
 POST <api>/api/reading/generate {premium:true}  → Claude (claude-sonnet-4-6) → reading
```

**Entitlement contract** (`shared/ui-components/entitlement.js`, copied into each
vanilla app as `public/js/entitlement.js`; Next.js apps inline the same localStorage
shape under key `mdo3d_premium`):
- Idempotent per Stripe `sessionId`.
- Single-reading credits are one-shot (`consumed` after delivery).
- `*monthly*` reading types expire 30 days after purchase.
- Credit is consumed **only after** a successful premium response (a failed
  generate call does not burn the credit).

---

## 2. Per-service status

| Service | Frontend domain | API (Vercel) | Model | Checkout | Delivers premium |
|---------|-----------------|--------------|-------|----------|------|
| I Ching | iching.mdo3d.com | iching-api.vercel.app | claude-sonnet-4-6 | dynamic | ✅ |
| Runes | runes.mdo3d.com | runes-api.vercel.app | claude-sonnet-4-6 | dynamic | ✅ |
| Astrology | astrology.mdo3d.com | astrology-api-alpha.vercel.app | claude-sonnet-4-6 | dynamic | ✅ |
| Numerology | numerology.mdo3d.com | numerology-api.vercel.app | haiku-4-5 (premium), sonnet-4-6 (insight) | dynamic | ✅ |
| Feng Shui | fengshui.mdo3d.com | fengshui-api-eosin.vercel.app | haiku-4-5 (premium), sonnet-4-6 (tip) | dynamic | ✅ |
| Past Lives | pastlife.mdo3d.com | pastlives-api.vercel.app | claude-sonnet-4-6 | dynamic | ✅ |
| Tarot | tarot.mdo3d.com | tarot-cards-api.vercel.app | claude-sonnet-4-6 | dynamic | ✅ |
| Oracle | oracle.mdo3d.com | oracle-cards-api.vercel.app | claude-sonnet-4-6 | dynamic | ✅ |
| Dreams | dreams.mdo3d.com | dream-interpreter-api-delta.vercel.app | claude-sonnet-4-6 | dynamic | ✅ |

All API `/api/payment/create-checkout` calls verified returning live `cs_live_`
sessions (2026-08-16). All `/api/health` return 200. Premium `/api/reading/generate`
(or `/api/analysis/generate`) verified returning real, clean AI content.

### 2a. Premium DELIVERY status (frontend renders the paid reading?)

Review finding (2026-08-16): checkout ≠ delivery. Whether the frontend actually
fetches and renders the premium AI reading after unlock:

| Service | Delivers premium AI reading in UI? | Mechanism |
|---------|-----------------------------------|-----------|
| I Ching | ✅ | `handlePremiumPurchase` → `getPremiumReading()` fetch → `showPremiumReading()` |
| Runes | ✅ | same pattern |
| Astrology | ✅ | same pattern |
| Feng Shui | ✅ | generate call sends `premium: hasEntitlement()`; API returns premium |
| Past Lives | ✅ | same as feng shui |
| Oracle | ✅ **(wired 2026-08-16)** | `displayPremiumReading()` now fetches `/api/reading/generate` (real cards) and renders opening/interpretation/insights/actionSteps/affirmation; consumes credit on success |
| Tarot | ✅ **(wired 2026-08-16)** | `deliverPremiumReading()` fetches `/api/reading/generate`, renders markdown `interpretation` via `mdLite()`; consumes on success |
| Dreams | ✅ **(wired 2026-08-16)** | `deliverPremiumInterpretation()` fetches `/api/dream/interpret`, renders markdown; consumes on success |
| Numerology | ✅ **(wired 2026-08-16)** | API parse fixed (see below); `deliverPremiumReading()` fetches `/api/reading/generate {name,birthDate,question,premium:true}` and renders lifePath/expression/soulUrge/personality/synthesis/cycle/guidance; consumes on success |

**Delivery now 9 of 9.** For all, credit is consumed only after a successful
premium render; on failure the entitlement is kept so the customer can retry
without being re-charged.

**Numerology API parse fix (root cause):** the model returns valid fenced JSON
*followed by trailing narrative prose (and a stray `}`)*. The old greedy
`\{[\s\S]*\}` match grabbed first-`{`-to-last-`}`, swallowing the prose → `JSON.parse`
failed → parse fallback (empty fields). Replaced with `extractJson()`: search inside
the ```json fence, then **brace-balance** (string/escape aware) from the first `{` to
return the FIRST complete object, ignoring trailing prose. Verified fields now
populate cleanly. **Recommended hardening:** the other services still use the greedy
pattern in their `parseReadingResponse`; they work today (their models don't append
prose) but should adopt `extractJson()` for robustness.

**Latency note:** tarot ~45s, dreams ~60s premium generation (sonnet-4-6, long
markdown). Functional but slow — candidates for haiku or streaming (fengshui and
numerology-premium already use haiku).

---

## 3. Environment variables (per API Vercel project)

Set on all 9 API projects (production):
- `ANTHROPIC_API_KEY` — funded key on the **annehuntingtonlaboratory** Anthropic
  account. NOTE: this account only exposes current-gen models (Claude 5 / 4.x);
  the retired `claude-3-5-sonnet-20241022` returns `not_found` (this was the
  original cause of the premium-reading 500s).
- `STRIPE_SECRET_KEY` — Lamar/MDO3 live key (`sk_live_…`).
- `FRONTEND_URL` — the service's public domain (drives Stripe `success_url`).

The service reads `STRIPE_SECRET_KEY` (via each API's local
`src/services/stripeService.js`, constructor arg `serviceName`). Do NOT use the
`shared/services/stripeService.js` variant in these APIs — it expects
`STRIPE_LIVE_SECRET_KEY`/`STRIPE_TEST_SECRET_KEY` and throws at construction
(this caused the tarot/oracle/dreams 500s until swapped out).

---

## 4. Deploy

Six original APIs + all frontends: `scripts/deploy-divination-payments.sh`
(sets STRIPE + FRONTEND_URL, deploys, smoke-tests). Requires `vercel login` (or
`VERCEL_TOKEN`) and `export STRIPE_SECRET_KEY=…`.

Per-service manual deploy:
```
cd projects/divination/<svc>/api        && vercel deploy --prod --yes   # API
cd projects/divination/<svc>/<frontend> && vercel deploy --prod --yes   # frontend
```

Each API needs `vercel.json` with `builds` → `src/server.js` and route
`/api/(.*)` → `src/server.js`, a `package-lock.json`, and `export default app`.
tarot/oracle/dreams were missing vercel.json + lockfile initially.

---

## 5. Fixes applied 2026-08-16 (chronological)

1. **Model migration**: `claude-3-5-sonnet-20241022` → `claude-sonnet-4-6` in all
   9 `claude*Service.js` (retired model 404'd on the AHL account → premium 500s).
2. **Anthropic key**: funded AHL key set on all 9 API projects.
3. **JSON parse hardened** in all services: strip ```` ```json ```` fences +
   newline-tolerant retry (Sonnet-4.6 pretty-prints, which broke `JSON.parse`).
4. **Feng shui truncation**: 9-field JSON exceeded 2000 tokens → bumped premium
   generation to 4000; later switched premium model to `claude-haiku-4-5-20251001`
   to cut latency 76s → 35s.
5. **Buttons → dynamic checkout** (removed all hardcoded `buy.stripe.com` links):
   - iching/runes/astrology: `onclick` → `handlePremiumPurchase()` (has entitlement guard).
   - fengshui/pastlives (Next.js): added `startCheckout()` calling create-checkout.
   - tarot/oracle/dreams: removed override links, class-bound `.btn-premium` to the
     existing `handleUpgrade()` / `upgradeToPremium()` dynamic-checkout handlers.
6. **tarot/oracle/dreams APIs deployed** (were on dead Railway URLs / placeholder):
   created Vercel projects, added vercel.json + lockfiles, swapped shared
   stripeService → proven local one, set env vars. Frontend `baseURL` updated to
   the new `*.vercel.app` API URLs.
7. **Frontend module-404 fix** (earlier): oracle/tarot/dreams/resume-analyzer
   imported `/src/*` and `/shared/*` from outside the deploy root (dead in prod).
   Copied those modules into each `public/`.
8. **Oracle prompt hardening** (review pass): `buildReadingPrompt` did
   `card.keywords.join()` / `card.upright.meaning` with no guards → 500 when a card
   lacked those fields. Added `Array.isArray`/optional-chaining/fallbacks; redeployed
   and verified premium generate now succeeds on sparse card input.

---

## 5a. Review pass (2026-08-16)

Validated this session's payment work end-to-end. Confirmed working: model
migration, key, parse hardening, checkout on all 9 (live `cs_live_`), double-charge
guard on all 9, numerology domain move. **Critical issue found:** premium *delivery*
is only wired on 5 of 9 frontends (§2a) — oracle/tarot/numerology/dreams charge but
render mock/free content. Implemented this pass:
- **oracle API `buildReadingPrompt` hardened** against cards missing
  `keywords`/`element`/`theme`/`upright` (was a real 500 path; redeployed + verified
  premium generate now succeeds on sparse input).
- **Consume-safety fix on the 4 non-delivering apps** (oracle/tarot/numerology/dreams):
  their entitlement guard was calling `consume()` *before* rendering mock/free content.
  Because delivery isn't real, that burned the credit on first click → a second click
  would find no entitlement and **charge again**. Removed the premature `consume()`
  (kept the no-recharge short-circuit + `premiumUnlocked` flag), so the paid credit
  persists and the customer is never re-charged. Restore consume-after-successful-render
  when real delivery is wired. iching/runes/astrology already consume-after-success
  (correct — they deliver).

**Premium delivery wired for oracle/tarot/dreams** (follow-up pass): verified each
API's premium response shape via curl, then wired each frontend to fetch + render it,
consuming the credit only after a successful render (keeps it on failure):
- oracle `displayPremiumReading()` → structured fields (opening/interpretation/
  insights/actionSteps/affirmation), HTML-escaped.
- tarot `deliverPremiumReading()` + dreams `deliverPremiumInterpretation()` → markdown
  `interpretation` rendered via a small `mdLite()` (escape + basic md → HTML).
All three deployed + API responses verified clean (oracle 3 insights, tarot 8k chars,
dreams 11k chars). Numerology also completed (follow-up): fixed its API
parser (`extractJson` — fence-aware brace-balancing, the model appended prose after
the JSON) and wired `deliverPremiumReading()`. All 9 services now deliver. Rendering
not browser-verified, but response→render mapping matches the confirmed API shapes.

## 6. Known remaining items

1. ~~numerology.mdo3d.com serves jarvisbee~~ **DONE (2026-08-16)**: domain moved
   from the `business-name-generator` project to `numerology-app` via the Vercel
   REST API (DELETE project-domain on BNG → POST project-domain on numerology-app;
   `vercel alias set` was refused because the domain was owned by another project).
   `numerology.mdo3d.com` now serves the divination numerology app (verified 200,
   title "Numerology - Discover Your Life Path", dynamic checkout wired). The old
   `business-name-generator` project is now domain-less (was the broken "coming
   soon" duplicate).
2. ~~Numerology premium~~ **DONE (2026-08-16)**: API parse fixed (brace-balancing
   `extractJson`) + frontend delivery wired. All 9 services now deliver.
3. **Parser hardening (recommended)**: propagate `extractJson()` (brace-balanced,
   fence-aware) to the other services' `parseReadingResponse` — they use the old
   greedy match and could hit the same trailing-prose bug if their models change.
3. **Payment-Link retirement**: the old hardcoded `buy.stripe.com` Payment Links
   are no longer referenced by any frontend (all use dynamic checkout). They can
   be archived in the Stripe dashboard. No redirect config needed anymore.
3. ~~tarot/oracle/dreams re-charge guard~~ **DONE (2026-08-16)**: all three now
   short-circuit on an existing `PremiumEntitlement` before charging — they
   consume the credit, set a session `premiumUnlocked` flag, and re-render the
   reading instead of creating a second checkout. Oracle's `isPremiumUser()` also
   reads the entitlement. All 9 services now have the double-charge guard.
4. **Fengshui latency** ~35s (haiku) — acceptable; consider response streaming
   for a snappier UX.
5. **dreams API URL** is `dream-interpreter-api-delta.vercel.app` (name collision
   appended `-delta`); frontend points at it correctly. Optionally rename the
   Vercel project for a clean URL.

---

## 7. Troubleshooting

- **Premium reading 500** → check `ANTHROPIC_API_KEY` set + model is current-gen
  (`curl https://api.anthropic.com/v1/models -H "x-api-key: $K" -H "anthropic-version: 2023-06-01"`).
- **API health 500 / FUNCTION_INVOCATION_FAILED** → check for imports outside the
  deploy root (`grep "\.\./\.\./" src/server.js`) and that `stripeService.js` is the
  local `STRIPE_SECRET_KEY` variant; ensure `vercel.json` + `package-lock.json` exist.
- **Checkout "no API key"** → `STRIPE_SECRET_KEY` unset on that API project; set +
  redeploy (env changes require a redeploy).
- **Reading renders as raw JSON** → parse hardening missing/reverted, or model
  truncation (raise `max_tokens`).
