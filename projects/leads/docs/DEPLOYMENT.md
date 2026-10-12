# Leads platform deployment

## Status (2026-10-12)
- **leads.mdo3d.com / leadsapi.mdo3d.com are down (530).** Their tunnel ran on littlemini, which is on a disk hold
  (do not touch it).
- **New home: xps** (Linux x86_64, docker 28 + compose v2, ~434 GB free). littlemini2 (19 GiB) and bigmini are
  under the 20 GB floor.
- The stack is **staged, not deployed**: `ops/DEPLOY_FLEET.sh` is ready to run and needs the **Principal's go**
  (it deploys backend auth / DB / payments).
- Tested on xps under a throwaway compose project (port 18050, torn down with its volumes): backend and scheduler
  healthy, in-container ingest FL + CO, backup ok, delivery gate off.

## Why the fleet and not Vercel
Daily SFTP pulls (FL), multi-minute parse jobs, SQLite on a persistent disk and cron. Vercel Hobby crons run at
most daily with ±59 min precision, functions stop at 300 s, and there is no persistent disk. The frontend could go
to Vercel later; ingest + API stay on the fleet.

## Stack (`web/docker-compose.yml`, project name `leads`)
| service | container | port (host, 127.0.0.1 only) | notes |
|---|---|---|---|
| frontend | leads-frontend | `${LEADS_WEB_PORT:-3050}` (xps: 3150) | Vite build served by `serve`; healthcheck wget |
| backend | leads-backend | `${LEADS_API_PORT:-8050}` (xps: 8150) | FastAPI; `/health` healthcheck; reads `/data/leads.db` |
| scheduler | leads-scheduler | — | supercronic: ingest, nightly backup, gated delivery; healthcheck = DB readable + last ingest < 30 h |
| tunnel | leads-tunnel | host network | `--profile tunnel` only; cloudflared with `TUNNEL_TOKEN` |

xps:8050 is already taken by another stack, so the deploy script uses 8150/3150.

**Volumes:** `leads-data` (`/data`: `leads.db` in WAL mode, `raw/` downloads, `logs/`, `ingest_status.json`) and
`leads-backups` (`/backups`: `leads-<ts>.db.gz`, newest 14 kept, `LAST_BACKUP_OK`). Both survive releases and
rollbacks; only `docker compose down -v` deletes them.

**Schedule** (`ops/scheduler/crontab`, America/New_York):
| when | job |
|---|---|
| 09:15 and 21:15 daily | `runner.py --ingest --states $LEADS_INGEST_STATES --lookback 3` (FL,CO,CT) |
| every minute | `runner.py --run-requests`: manual runs queued by `POST /profiles/{id}/run` (stored filings; email only if `LEADS_ENABLE_DELIVERY=1`) |
| 03:30 daily | `sqlite3 .backup` → `PRAGMA integrity_check` → gzip → prune |
| 08:00 daily | profile delivery, **only if `LEADS_ENABLE_DELIVERY=1`** (email needs the Principal's OK) |
| 08:30 daily | `runner.py --saved-searches`: each saved search is due 7 days after its last run, and gets the filings first seen since then (states re-checked against the plan). **Only if `LEADS_ENABLE_DELIVERY=1`.** |

## Deploying (`ops/DEPLOY_FLEET.sh`, run from the laptop; builds happen on xps)
```bash
ops/DEPLOY_FLEET.sh preflight   # disk, docker, ports, which shared/*.env exist (read-only)
ops/DEPLOY_FLEET.sh deploy      # git-archive the pushed tip of main -> xps:~/leads-app/releases/<sha>,
                                # link shared env files, compose up -d --build, local verify (auto-rollback on fail)
ops/DEPLOY_FLEET.sh tunnel      # start cloudflared (after operator steps O1-O2), public verify
ops/DEPLOY_FLEET.sh verify      # local + public curls: status + bytes; /filings without auth must be 401
ops/DEPLOY_FLEET.sh rollback    # previous release back into service; data volumes untouched
ops/DEPLOY_FLEET.sh status
```
The script header lists the **operator steps**:
- **O1:** secrets in `xps:~/leads-app/shared/{backend,frontend,leads,tunnel}.env`.
- **O2:** a new Cloudflare tunnel `mdo3d-leads-xps`. Delete the old `leads` / `leadsapi` CNAMEs, then add the
  public hostnames → `localhost:3150` / `localhost:8150`. Don't reuse tunnel 64d3ed96 (littlemini).
- **O3:** the Stripe webhook URL.
- **O4:** the Firebase authorized domain.
- **O5:** delivery stays off.

Releases are kept under `~/leads-app/releases/<sha>`, with `current`/`previous` symlinks. Schema changes are
additive (`CREATE TABLE IF NOT EXISTS`), so a rollback reads the same DB.

## Environment
- **backend.env:** `LEADS_API_KEY`, `FIREBASE_PROJECT_ID=leads-59279`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `LEADS_STRIPE_PRICE_IDS` (allowlist for the legacy `/checkout`), optional
  `LEADS_CORS_ORIGINS` and `LEADS_EXPORT_MAX_ROWS` (default 10000). Account-level plan settings:

  | var | default | meaning |
  |---|---|---|
  | `LEADS_CHECKOUT_ENABLED` | `0` | `1` opens `POST /v1/checkout`. While it is off, checkout answers 503 "Plans opening soon", `features.checkout` is false, and the legacy `/checkout` refuses to run with a live key. **Turning it on with a live key takes real payments, so it needs the Principal's go.** |
  | `LEADS_STRIPE_PRICE_ID` | — | the one price `/v1/checkout` sells (the client never sends a price). Checkout stays closed while it is unset. Which price, and so what we charge, is CONVERSION's call. |
  | `LEADS_PLAN_NAME` | — | label on the plan page (optional) |
  | `LEADS_PLAN_STATES` | `FL,CO,CT` | states a Stripe plan covers |
  | `LEADS_PROMO_STATES` | `FL,CO,CT` | states a promo code grants |
  | `LEADS_PROMO_ACCESS_DAYS` | `0` | promo access length in days (`0` = no end date) |
  | `LEADS_PROMO_ENABLED` | `1` | `0` stops promo redemption (503) |
  | `LEADS_ENABLE_DELIVERY` | `0` | compose passes the same value to the backend. The API only reports it (`email: "disabled"`); the scheduler does the sending. |
  | `LEADS_SAVED_SEARCH_MAX` / `LEADS_REDEEM_MAX_FAILURES` | `25` / `10` | saved searches per user / failed redemptions per user per hour |
- **frontend.env:** `VITE_API_URL=https://leadsapi.mdo3d.com`, the Firebase web config and
  `VITE_STRIPE_PUBLISHABLE_KEY`. It's copied into the build context because Vite reads it at build time.
- **leads.env** (scheduler): `SUNBIZ_SFTP_HOST/USER/PASS` (state-published public login) and an optional
  `SOCRATA_APP_TOKEN`. Add `MAILGUN_*` only once delivery is approved.
- **tunnel.env:** `TUNNEL_TOKEN`.

Stripe price IDs (MDO3D Stripe account; **every Stripe link is live**, so never test against these):

| Plan | Price ID |
|------|----------|
| Starter ($29/mo) | `price_1TbTQNCRLa19N9qBa7wk8c3j` |
| Pro ($79/mo) | `price_1TbTQNCRLa19N9qBezJO7C2P` |
| Enterprise ($249/mo) | `price_1TbTQOCRLa19N9qBpRYvkhZC` |

Pricing per state bundle is CONVERSION's call (plan §C5); `/filings` already scopes access by the `states` on a
paid profile.

## Access model (paid-only)
- No free tier. Access is **account level** (`account_access`), granted by a redeemed **promo code**
  (`POST /v1/access/redeem`, the early-access lever) or a completed Stripe checkout (`POST /v1/checkout`, then
  the `checkout.session.completed` webhook). `customer.subscription.updated/deleted` keep `renews_at` and the
  status current. Neither path creates a delivery profile or schedules email. The legacy per-profile paths
  (`/redeem-code`, `/checkout`) still work, and a paid profile still entitles its states.
- Promo codes live in the DB (never in the client). Create one on the host with
  `INSERT INTO codes (code, max_uses, expires_at) VALUES ('EARLY-XXXX', 25, '2026-12-31T00:00:00');`.
  `expires_at` is the redemption deadline. How long the access lasts and which states it covers come from
  `LEADS_PROMO_ACCESS_DAYS` / `LEADS_PROMO_STATES`. Each account can redeem a code once, and `max_uses` is
  enforced in one transaction.
- `/filings` and `/filings/export.csv` need a Firebase sign-in (not anonymous) **and** a paid profile. They
  fail closed: 401 without sign-in, 402 without a paid profile, 403 for a state outside the bundle.
- Tests run with `LEADS_TEST_MODE=1`, and the API refuses to start if a live Stripe key is present. Stripe calls
  are stubbed, and the webhook is checked with a locally signed test payload. No live Stripe call is made.

## Database (`$LEADS_DB_PATH`, default `data/leads.db`; `/data/leads.db` in containers)
`users`, `profiles`, `payments`, `leads` (per-profile delivered rows), `codes`, `code_redemptions`,
`account_access` (account-level grants: source stripe|promo, status, states, renews/expires),
`account_redemptions`, `saved_searches`,
**`filings`** (`UNIQUE(state, source_id)`), **`ingest_runs`** (state, source_date, rows, new_rows, status) and
**`run_requests`** (manual runs: queued → running → done/error, leads, delivery).

## Monitoring
```bash
curl -s https://leadsapi.mdo3d.com/health     # db_ok, stripe_mode, latest ingest runs
curl -s https://leadsapi.mdo3d.com/coverage   # per-state filings + freshness
ssh xps 'docker ps --filter name=leads-; docker logs leads-scheduler --tail 50'
ssh xps 'docker exec leads-scheduler cat /backups/LAST_BACKUP_OK /data/raw/ingest_status.json'
```

## Notes kept from the littlemini era
- Use `leadsapi.mdo3d.com`, not `api.leads.mdo3d.com`: Universal SSL `*.mdo3d.com` covers one level only.
- `name: leads` in the compose file avoids clashes with other stacks whose directory is also `web`.
- Firebase token verification needs `projectId` in the app options (`FIREBASE_PROJECT_ID`).
- `web/deploy/` (systemd unit, locally-managed tunnel config) is the legacy non-docker path.
