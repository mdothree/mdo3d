# Rigor paid path: Q7 fix (staged, not run)

> **Rev 2026-10-13 (supersedes the GO order below where they differ):** `RIGOR_GO.sh` now writes **no secret
> and no Stripe object**. The env is set first by the Principal (see `SECRETS_NEEDED.md`), and the preflight refuses
> to deploy while any required env name is missing from project `rigor`. Stages: unlink rigor-landing → domain
> (already attached; cert issued 2026-10-12) → DNS only (already) → deploy rigor-api `q7/paid-path` @ `0d7459d` →
> verify (`/health` 200 + `environment: production`, unsigned webhook 400, anon 401s, link `active=true` by
> read-only GET) → 7 tools → verify (`/`, `/success`, `/cancel` 200, checkout on, price 999) → fast-forward main.
> On a failed verify it **stops and reports, with no rollback**. Live root cause on 2026-10-13: `api.rigor.design` is
> 404, not 525. DNS/TLS/domain are fine; project `rigor`'s production deployment is a rigor-landing git build.


Principal decision Q7: *"for the rigor link thing, it sounds like the answer is to fix it, not take it down"*.
The Stripe Payment Link (`buy.stripe.com/…8k804`, Rigor Pro $9.99/mo) is **not paused**. This change makes paying
work end to end. One script runs it: `staged/rigor_fix/RIGOR_GO.sh` (needs the Principal's GO).

## Diagnosis (2026-10-12, read-only)

| Question | Finding | Evidence |
|---|---|---|
| Price shown vs charged | **Match.** The pages show $9.99/mo, and the link charges 999 USD per month (recurring, licensed, live), product "Rigor Pro". | Live resume (2×), interview, networking and salary link `8k804` with the text "Upgrade to Pro - $9.99/mo". The public checkout JSON of the link (the request a browser makes on page load; nothing was submitted) shows `unit_amount 999`, `currency usd`, `interval month`, `mode subscription`, `livemode true`. |
| Where a payer lands | Stripe's own confirmation page. `success_url`/`cancel_url` are placeholders, `after_completion=confirmation_page`, and the rigor `/success` page is never reached. Promotion codes are **off** on the link (`allow_promotion_codes:false`). | Same JSON. |
| Does paying grant Pro? | **No, never.** The link sends no `client_reference_id` (null), and the pages don't add one. The webhook handled `checkout.session.completed` only when `metadata.userId` was set (embedded checkout only), so a link payment was dropped. The stripe-hub receiver also ignored it (no serviceName, and no line items on the session object). Later subscription events find no `subscriptions/{uid}` with that customer, so they are no-ops. | `api/lib/stripeEvents.js` @ `863d3f2`. |
| What Pro unlocks | Unlimited AI calls on all 7 tools (`subscriptions/{uid}` plan pro/team and status active/trialing). Since #94, no plan means a 402 on the first call. | `api/lib/quota.js`. |
| Does a payer get anything today? | **No.** `api.rigor.design` returns 525 on every path, so even a Pro account can't run a tool. | `curl` /health, /api/analyze, OPTIONS: all 525. |
| Why 525 | (1) `api.rigor.design` was never attached to Vercel project `rigor`. It is a proxied CNAME to cname.vercel-dns.com with CF SSL "full", and Vercel has no cert for it. (2) **New:** project `rigor` is git-linked to **rigor-landing**, so every landing push redeploys the landing over the API. The API was CLI-deployed once (10-07), then overwritten by landing git deploys (10-07 … 10-12). (3) Production env has only ANTHROPIC/OPENAI. The Firebase Admin, Stripe, webhook and price vars are missing, and `lib/firebase.js` throws at cold start, so even OPTIONS would fail. | Vercel API: project domains = only `rigor-psi.vercel.app`; `link.repo = rigor-landing`; deployments list; env names. |
| Embedded checkout readiness | Not configured. The pages had placeholder `__STRIPE_PRO_PRICE_ID__` / `__STRIPE_PUBLISHABLE_KEY__` (no runtime env injection), so the embedded path could never have opened. | `public/js/config/env.js`, `paymentService.js`. |
| Honest claims | The Pro card claimed "Save history, Priority AI, Export PDF", and Team claimed "5 team members, Team dashboard, API access". None of these exist. No Team price exists. `success.html` said "You are now Pro!" without checking anything. | grep of the 7 tools. |
| Tokens | The `VERCEL_TOKEN_MDO3` user-scope token (no expiry) can read the project, domains, env names and deployments. The same scope covers domain attach, env upsert and link changes (writes were not exercised). The `CLOUDFLARE_TOKEN_MDO3` token reads the zone and the DNS record; edit rights are unknown, and the script falls back to a printed dashboard step. | GETs only. |

## The fix

**Approach:** keep "shown = charged" by selling the **same live price** that the link sells, through the API's embedded
checkout. That path carries the verified Firebase uid, so the purchase always maps to an account. It also has promo
codes on and returns to `/success`, and it needs **no Stripe object change**. Because the API creates the checkout
session, nobody can pay while the API is down. The link itself stays live, and payments through it are now honoured.

### rigor-api: branch `q7/paid-path` (on top of #94 `7e94bcc`)
- Webhook: a session without `metadata.userId` (the Payment Link) is matched by `client_reference_id` (`uid` or
  `rigor:<uid>`) or by the payer's email **only if that Firebase account's email is verified**. Otherwise it is parked
  in `unclaimed_payments/{sessionId}`. Non-rigor prices never grant anything and are never parked. The hub receiver
  recognises the rigor link (`RIGOR_PAYMENT_LINK_IDS`, default = the live link id).
- `POST /api/payment/confirm {sessionId?}` (signed in): reads the completed session from Stripe and grants the caller.
  This covers the caller's own embedded session, or an unclaimed link payment exactly once. Another account's session
  gets 403, a pending one gets 202, and the response is `{plan,status,active}`.
- `GET /health`: 200 only when every required env var is set, Firebase Admin initialises, and the Stripe key modes
  match. The response holds booleans only.
- Checkout: price alias `pro`/`team`, returns `publishableKey`, sets `client_reference_id rigor:<uid>` and
  `customer_email`, returns to `/success?session_id=…`, and gives 409 if the account is already subscribed.
- 11 serverless functions (the Hobby cap is 12). Webhook and hub share one file; portal, confirm and health share another.
- Tests: `test/q7-paid-path.test.js` (15) plus the #94 suite (11). **26/26 pass on xps**, with Stripe and Firebase
  stubbed and dummy keys.

### 7 tools: branch `q7/paid-path` (on top of #94 + go-final)
- Checkout **on**, with the `apiReachable()` probe still in front of it. The page sends `priceId:"pro"`, and
  Stripe.js uses the key the API returns.
- Pro card: $9.99/mo, "Unlimited use of all 7 Rigor career tools", "Full AI results", "Cancel anytime from Manage Plan".
  Team is hidden.
- `/success` runs `js/success.js` → `/api/payment/confirm` and shows one of four states: active, confirming (polls),
  sign in, or wrong account. It only says "active" when the API says so.
- xps Playwright (API and Stripe.js mocked): on all 7, checkout mounts with the API key and secret, $9.99 is shown,
  Team is hidden, and there are 0 page errors.

## The new GO order

1. GO_FINAL / cycle-5 `rigor` group as planned. The tools ship with the **gate** (checkout off, no 8k804 href).
2. `bash staged/rigor_fix/RIGOR_GO.sh check`: read-only preflight.
3. `bash staged/rigor_fix/RIGOR_GO.sh go`, which runs these stages in order:
   - **[1]** unlink rigor-landing from project `rigor`
   - **[2]** attach `api.rigor.design`
   - **[3]** switch Cloudflare to DNS-only
   - **[4]** set the production env from the operator file
   - **[5]** deploy rigor-api@q7/paid-path
   - **[6]** wait for the cert and `/health` 200
   - **[7]** verify: OPTIONS 204, anonymous 401 (analyze, checkout, confirm), unsigned webhook 400. With a test token,
     also unknown price 400, first unsubscribed call 402, and confirm inactive.
   - **[8]** deploy the tools. **Only if [7] passes** do they get `q7/paid-path` (checkout on). Otherwise they get the
     gate (`go-final`/`main`).
   - **[9]** verify: no `buy.stripe.com` href, `/success` 200, checkout flag, page price × 100 = Stripe 999
   - **[10]** fast-forward `main` ← `q7/paid-path` (never force)
4. Optional: `… go --stripe-live-write`. This step is **LIVE STRIPE WRITE (Principal)**: it creates the webhook endpoint
   if none reaches rigor, and points the Payment Link at `/success` with promo codes on. Every stage writes a rollback
   step to `RIGOR_ROLLBACK.steps`, and `RIGOR_GO.sh rollback` replays them newest first, with a prompt for each.

`wave94r` is superseded: `q7/paid-path` contains the #94 commits, and the script's /health gate now has a real
endpoint behind it.

## Operator inputs
- `~/latarence/secrets/sega_credentials.env`: `VERCEL_TOKEN_MDO3`, `CLOUDFLARE_TOKEN_MDO3` (used by variable).
- `RIGOR_ENV_FILE` (default `~/latarence/secrets/rigor_api.env`): `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
  `FIREBASE_PRIVATE_KEY` (one line, `\n` escapes), `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_IDS` (the price the link sells). Optional: `STRIPE_TEAM_PRICE_IDS`,
  `APPCHECK_ENFORCE`. `ANTHROPIC_API_KEY` is already on Vercel.
- Optional `RIGOR_TEST_ID_TOKEN`: the ID token of a signed-in, unsubscribed test account. Email/password sign-in
  must be on (#96).
- Prerequisite: a Stripe webhook that reaches rigor, either direct or through the hub. Without one the script stops
  before deploying, unless it is run with `--stripe-live-write`.

## For HQ
- RIGOR-PAY-BEFORE-API kit check: change "live $9.99 Stripe link absent" to **"checkout/link present only while
  `https://api.rigor.design/health` is 200"**.
- With #94 the old "4th call 402" check becomes **"1st unsubscribed call 402"**.
- Principal check in the Stripe Dashboard: has anyone already paid through `8k804`? Those payers got nothing. With
  this fix they get Pro by verifying their email on their rigor account, or by opening `/success?session_id=<their
  session>`. If they have no rigor account, refund them.
- Taste: the Stripe checkout shows the account's personal display name, with statement descriptor `MDO3D.COM`.

### 2026-10-13 fold-forward (main fast-forwards to the deploy ref)
Each tool's `q7/paid-path` now merges `go-final-r4` (which contains `main`), conflicts resolved to the paid-path side
(tree unchanged). Pinned in RIGOR_GO.sh `TOOL_PINS`: resume 30d2dab, cover b667a20, interview 7e37e9f, linkedin 17de643,
networking ad882d9, portfolio 805239c, salary e1d89ab. rigor-api `q7/paid-path` @ 0d7459d already contained `main` (863d3f2).
