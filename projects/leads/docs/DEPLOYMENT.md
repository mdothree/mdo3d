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
  `STRIPE_WEBHOOK_SECRET`, `LEADS_STRIPE_PRICE_IDS` (allowlist), optional `LEADS_CORS_ORIGINS` and
  `LEADS_EXPORT_MAX_ROWS` (default 10000).
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
- No free tier. A profile becomes `paid` through a completed Stripe checkout (`checkout.session.completed`
  webhook) or a redeemed **promo code**, the early-access lever. Create one with
  `INSERT INTO codes (code, max_uses, expires_at) VALUES ('EARLY-XXXX', 25, '2026-12-31T00:00:00');`.
- `/filings` and `/filings/export.csv` need a Firebase sign-in (not anonymous) **and** a paid profile. They
  fail closed: 401 without sign-in, 402 without a paid profile, 403 for a state outside the bundle.
- Tests run with `LEADS_TEST_MODE=1`, and the API refuses to start if a live Stripe key is present. Stripe calls
  are stubbed, and the webhook is checked with a locally signed test payload. No live Stripe call is made.

## Database (`$LEADS_DB_PATH`, default `data/leads.db`; `/data/leads.db` in containers)
`users`, `profiles`, `payments`, `leads` (per-profile delivered rows), `codes`, `code_redemptions`,
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
