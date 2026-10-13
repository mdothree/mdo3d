# Secrets needed: rigor API (api.rigor.design) and Ronna API (api.ronnascanner.com)

*2026-10-13, MDO lane. Names only, never values. These are the steps the lane can't do: the Principal does them,
or a session he authorizes. After they're done, the lane runs `bash staged/rigor_fix/RIGOR_GO.sh check` and then
`go` in the batched deploy window.*

## Where things stand (2026-10-13, public probes)

| Host | Now | Root cause | What fixes it |
|---|---|---|---|
| `api.rigor.design` | `/` 200 (the landing page), `/health` and `/api/*` 404 (`x-vercel-error: NOT_FOUND`) | The DNS, TLS and domain are already correct. The record is DNS only → `cname.vercel-dns.com`, the Let's Encrypt cert for `CN=api.rigor.design` was issued 2026-10-12 17:39Z, and the host serves byte-identical content to `rigor-psi.vercel.app` (project `rigor`). The fault is that project `rigor` is git-linked to the **rigor-landing** repo. Its production deployment is a landing build, so no API is deployed. | The env below, then `RIGOR_GO.sh go`: unlink the landing repo, deploy rigor-api `q7/paid-path` @ `0d7459d`, then verify. |
| `api.ronnascanner.com` | 525 on every path (`server: cloudflare`) | The record is **proxied** (it resolves to CF 104.21.9.65 / 172.67.159.50), and Cloudflare's TLS handshake to the origin fails. The Vercel edge has **no certificate** for this name: an SNI probe to 76.76.21.21 gets "no peer certificate". A control `leads.ronnascanner.com` gets `CN=leads.ronnascanner.com`. So the hostname isn't attached to any Vercel project, because no Ronna backend is deployed (S8). SSL mode isn't the cause: Full works for the attached siblings, and Flexible would only turn the 525 into a redirect loop or a 404. No frontend calls `api.ronnascanner.com`: the 5 subs use same-origin `API_URL ""`. | Decision S8 first. If a backend is built, deploy it to a Vercel project, attach `api.ronnascanner.com`, and set the env below. If it's "coming soon", delete or park the DNS record so the host stops returning 525 (that needs a CF token with DNS edit). |

## A. rigor API: Vercel project `rigor` (prj_6XVgXk8RuUT56AlmiMHA6oHGOHFm), target **Production**

`RIGOR_GO.sh` refuses to deploy while any of these **names** is missing (it checks names through the Vercel API and
never reads values). `/health` returns 200 only when all of them are set and Firebase Admin initialises.

| Env name | Secret? | Value / where it comes from |
|---|---|---|
| `FIREBASE_PROJECT_ID` | no | `mdo3d-career` |
| `FIREBASE_CLIENT_EMAIL` | low | The `firebase-adminsdk-…@mdo3d-career.iam.gserviceaccount.com` service account. Firebase console → mdo3d-career → Project settings → Service accounts. |
| `FIREBASE_PRIVATE_KEY` | **yes** | A **new key** for that same service account ("Generate new private key"). Paste `private_key` on one line with literal `\n` escapes (the code un-escapes them). Don't commit the JSON, and delete the download. |
| `STRIPE_SECRET_KEY` | **yes** | The **live** MDO3 Stripe account that owns `plink_1TEwCoCRLa19N9qBx7eNHK7D` / `price_1TEwCiCRLa19N9qBTxS4Oo0K` (these ids contain `CRLa19N9q`). Use the same key as Vercel project `oracle-cards-api`'s `STRIPE_SECRET_KEY` if that's the same account, or better, a restricted `rk_live_` key with write access to Checkout Sessions, Customers, Subscriptions and Billing Portal, and read access to Events, Prices and Payment Links. |
| `STRIPE_PUBLISHABLE_KEY` | no (public) | The `pk_live_` key of the **same** account. Stripe → Developers → API keys. `/health` checks that the modes match. |
| `STRIPE_WEBHOOK_SECRET` | **yes** | The signing secret (`whsec_…`) of a **new live webhook endpoint**. URL `https://api.rigor.design/api/payment/webhook`, events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Creating it is a Stripe write, so it's the Principal's. The endpoint can exist before the API is live: Stripe retries for 3 days. |
| `STRIPE_PRO_PRICE_IDS` | no | `price_1TEwCiCRLa19N9qBTxS4Oo0K` (Rigor Pro, $9.99/mo, the price the link sells) |
| `ANTHROPIC_API_KEY` | **yes** | Already on the project (RIGOR_FIX 2026-10-12). Don't change it. Preflight confirms the name. |
| `RIGOR_PAYMENT_LINK_IDS` | no, optional | `plink_1TEwCoCRLa19N9qBx7eNHK7D` (this is also the code default, so it can stay unset) |
| `APPCHECK_ENFORCE` | no, optional | Leave unset or `false` |
| `STRIPE_TEAM_PRICE_IDS` | no, optional | Leave **unset**: no Team price exists, and Team is hidden on the tools. |
| `RIGOR_FREE_MONTHLY_LIMIT`, `RIGOR_FREE_FEEDBACK_LIMIT` | — | Ignored since #94 (paid from first use). Remove them when convenient. |

**For the GO script (not Vercel):** a Stripe **read** key, used for GETs only (link `active`, link price, price
amount, webhook endpoints). Supply it as `STRIPE_READ_KEY` in the window runner's environment: a restricted
`rk_live_` key with Payment Links, Prices and Webhook Endpoints set to **Read**. The alternative is
`~/latarence/secrets/rigor_api.env` containing `STRIPE_SECRET_KEY`. Without it, `go` refuses, because the
post-deploy check that the link is still `active=true` needs it.

**Firebase (console, no secret):** mdo3d-career → Authentication → Sign-in method has Email/Password on (#96), and
Authorized domains include the 7 `*.rigor.design` tool hosts (resume, cover, interview, linkedin, networking,
portfolio, salary).

## B. The one non-secret Stripe change (a live Stripe write, so it's the Principal's)

Do this **only after** `RIGOR_GO.sh go` passes step [5] (the API is verified):

- Payment Link `plink_1TEwCoCRLa19N9qBx7eNHK7D` → After payment → **Redirect to**
  `https://resume.rigor.design/success?session_id={CHECKOUT_SESSION_ID}`.
  The route exists: `public/success.html` + `js/success.js` are on `q7/paid-path` for all 7 tools, and
  `resume.rigor.design/success` is 200 live today. With `session_id`, the page claims Pro for the signed-in payer
  through `/api/payment/confirm`.
- Optional, same screen: turn on "Allow promotion codes" (for the early-access promo codes).
- **Don't** pause or deactivate the link. It stays active (`RIGOR_GO.sh` checks `active=true` before and after).

## C. Ronna API (`api.ronnascanner.com`): only if S8 = build the backend

The backend repo is `projects/ronnascanner/ronnascanner-api` (Vercel functions: `leads/scan`, `emails/find`,
`payment/*`). No Vercel project is linked yet. The deploy plan is the other agent's `staged/ronna_api/AUDIT.md`
(not written yet at 2026-10-13 16:40Z). The env names its code reads:

| Env name | Secret? | Source |
|---|---|---|
| `FIREBASE_PROJECT_ID` | no | The Firebase project chosen for Ronna in S7 (not chosen yet) |
| `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | yes | A new key for that project's `firebase-adminsdk` service account |
| `STRIPE_SECRET_KEY` | yes | The MDO3 live account, same as rigor (or a restricted key) |
| `STRIPE_WEBHOOK_SECRET` | yes | A new live endpoint `https://api.ronnascanner.com/api/payment/webhook` (events as in A) |
| `STRIPE_PRO_PRICE_IDS` / `STRIPE_TEAM_PRICE_IDS` | no | Ronna prices **don't exist yet**. They're a price decision (S8/S10), then a Stripe write. |
| `APOLLO_API_KEY` | yes | An Apollo.io account (none on file). This is the lead data source the backend needs. |
| `HUNTER_API_KEY` | yes | A Hunter.io account (none on file). Used for email finding. |

Then: attach `api.ronnascanner.com` to that Vercel project, which removes the 525 because Vercel issues the cert.
Leave the Cloudflare record proxied, or set it DNS only the way rigor did. Until S8 is decided, the honest
non-deploy fix is to delete the `api.ronnascanner.com` DNS record. It needs a Cloudflare token with
Zone → DNS → Edit on `ronnascanner.com`, and no client references the host.
