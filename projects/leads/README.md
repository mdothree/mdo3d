# MDO3D Leads — new-business filings by state

New business filings from state registries, as leads: search/filter by state, county, filing type and keyword
vertical, export CSV. Paid-only (no free tier; promo codes are the early-access lever). Target URL:
leads.mdo3d.com (app) / leadsapi.mdo3d.com (API).

> **Email policy:** email addresses are never guessed. `guess_email_variants` is `false` in every profile, the
> API model forces it false, and the variant guesser has been removed from `src/runner.py` (tests enforce this).
> Only addresses published on the business's own site are kept; one that fails validation is dropped.

## Layout
```
src/runner.py            pipeline entry point (ingest, per-profile filter/enrich/deliver, cron helpers)
src/adapters/            state adapters: base.py (interface + Filing schema), fl.py, co.py
src/validate_email.py    MX/SMTP checks for published addresses
config/profiles.json     internal profiles (fallback when the DB has no paid customer profiles)
web/backend/             FastAPI API + SQLite (db.py) — filings search/export, profiles, Stripe, promo codes
web/frontend/            React app (owned by the web lane)
web/docker-compose.yml   frontend + backend + scheduler (+ optional tunnel)
ops/scheduler/           supercronic crontab, ingest / backup / delivery / healthcheck scripts
ops/DEPLOY_FLEET.sh      staged fleet deploy (needs the Principal's go)
tests/                   pytest suite (run on a fleet host, never the laptop)
docs/                    STATE_ADAPTERS.md, OTHER_STATES.md, DEPLOYMENT.md
```

## States
FL (Sunbiz SFTP) and CO (data.colorado.gov) are implemented. See `docs/STATE_ADAPTERS.md` for the interface and
`docs/OTHER_STATES.md` for what is next (free sources first; paid feeds are a spend decision).

## Running (on a fleet host — never the laptop)
```bash
cd ~/mdo3d/projects/leads
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
# .env: SUNBIZ_SFTP_HOST/USER/PASS (the state-published public login, see docs/OTHER_STATES.md)

# Ingest only: fetch + store filings in SQLite (no filtering, no enrichment, no email)
.venv/bin/python src/runner.py --ingest --states FL,CO --lookback 3
.venv/bin/python src/runner.py --ingest --states CO --date 20261009

# One profile, ignoring its schedule, without enrichment
.venv/bin/python src/runner.py --profile signals_institute --force --no-email-lookup

# Tests
.venv/bin/python -m pytest -q tests
```
Ingest logs one line per state and date, e.g. `[ingest] state=FL source_date=20261009 rows=1231 new=1231 status=ok`,
and records it in the `ingest_runs` table (the API's `/health` and `/coverage` show the latest).

Date options for profile runs: `--date YYYYMMDD`, `--date-from/--date-to`, `--last-week`, `--last-month`, or the
profile's `date_range` (`daily|weekly|monthly`).

## Profiles
Customer profiles live in SQLite (created in the app, activated by Stripe checkout or a promo code);
`config/profiles.json` holds internal ones. Fields:
- `states`: e.g. `["FL", "CO"]` — runs through the state adapters. Omit it to run the legacy FL-only path.
- `filing_types` (state codes; FL: FLAL, DOMP, FORP, DOMNP, FORNP, DOMLP), or `entity_kinds`
  (`llc`, `corporation`, `nonprofit`, `partnership`, `cooperative`, `trade_name`)
- `keywords` / `exclude_keywords` (entity name contains), `target_counties` (only where the state publishes county)
- `email_lookup` (search the business's own site for published addresses), `delivery.*` (frequency, recipients)

## API (web/backend/api.py)
| endpoint | access |
|---|---|
| `GET /health`, `GET /coverage`, `GET /verticals` | public (no filing content) |
| `GET /filings?state=&county=&filing_type=&entity_kind=&vertical=&q=&date_from=&date_to=&limit=&offset=` | signed in + paid |
| `GET /filings/export.csv` (same filters) | signed in + paid |
| `/profiles`, `/checkout`, `/redeem-code`, `/stripe-webhook` | as before |
| `POST /profiles/{id}/run` → `202 {run_id, status_url}` | owner + paid + active; 1 per profile per 10 min (`429` + `Retry-After`) |
| `GET /runs/{id}` → `queued \| running \| done \| error`, `leads`, `delivery` | owner |

Entitlement = the states of the user's **paid** profiles (a profile without `states` covers FL). No paid profile →
`402`; a state outside the bundle → `403`. Verticals match the entity **name** only, so the UI should say
"name contains", not "industry".

## Scheduling
In production the scheduler container (`ops/scheduler/crontab`, America/New_York) runs:
ingest 09:15 and 21:15 daily, the SQLite `.backup` at 03:30, and profile delivery at 08:00 **only if**
`LEADS_ENABLE_DELIVERY=1` (outbound email needs the Principal's OK). See `docs/DEPLOYMENT.md`.

**Manual runs:** `POST /profiles/{id}/run` only queues a row in `run_requests` (the API image has no pipeline
code). The scheduler's 1-minute tick (`runner.py --run-requests`) filters the **stored** filings for the
profile's states and date range (no source fetch, no email lookup unless `LEADS_RUN_EMAIL_LOOKUP=1`), saves the
leads, and emails them **only if `LEADS_ENABLE_DELIVERY=1`**; otherwise the run ends `delivery=disabled`.
Each run is capped by `LEADS_RUN_TIMEOUT_S` (900).
For a plain host crontab instead: `python3 cron.d/generate_cron.py && cron.d/install_cron.sh`
(replaces only lines tagged `# mdo3d-leads`).
