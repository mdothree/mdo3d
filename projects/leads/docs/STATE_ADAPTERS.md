# State adapters

Plan: `~/latarence/docs/plans/input_prompts_0/PART_C_product_research_content.md` §C5.
Status (2026-10-12): **wired.** FL (#1) and CO (#2) are implemented; the scheduler ingests both daily.

## Interface (`src/adapters/base.py`)
`StateAdapter` protocol, one per state:

| step | signature | job |
|---|---|---|
| fetch | `fetch(source_date, workdir) -> RawBatch` | download that date's raw files/pages only; record missing files |
| parse | `parse(raw) -> list[dict]` | state-specific records, source field names |
| normalize | `normalize(record) -> Filing` | map to the common schema |

`run_adapter(adapter, date, workdir)` chains them and dedupes on `(state, source_id)` (latest source date wins).
`adapters.get_adapter("CO")` / `adapters.ADAPTERS` list the implemented states.

**Common schema `Filing`:** state · source_id · entity · filing_type (state code) · entity_kind
(`llc|corporation|nonprofit|partnership|cooperative|trade_name|other`) · filed_date · status (state label) ·
active (True/False only when the state's status says so) · county · registered_agent · principal_address ·
naics_guess (+ naics_basis) · contacts · source_date · raw.

**Honesty rules in the schema:**
- Unknown stays `None`. Nothing (county, NAICS, contact, entity kind) is inferred without evidence; an unknown
  type code maps to `other`; `naics_guess` requires `naics_basis`.
- **No email guessing.** `Contact` rows exist only for values read from a public source and are `verified`.
  The runner's variant guesser has been removed (not just disabled); tests assert it stays gone.

## How it runs
- **Ingest only** (what the scheduler runs): `python src/runner.py --ingest --states FL,CO --lookback 3`.
  Fetches each state for each date, upserts into SQLite `filings` (`UNIQUE(state, source_id)`), records
  `ingest_runs`, and logs one line per state and date:
  `[ingest] state=CO source_date=20261009 rows=582 new=582 status=ok`. No filtering, enrichment or email.
- **Per profile:** a profile with `"states": ["FL", "CO"]` runs through the adapters (`filter_filings`); a profile
  **without** `states` runs the legacy FL path unchanged (`download_and_parse` + `filter_leads`).
  For non-FL states, FL `filing_types` map to entity kinds (FLAL→llc, DOMP/FORP→corporation, DOMNP/FORNP→nonprofit),
  or set `entity_kinds` directly. `target_counties` only excludes filings whose state publishes a county.
- The API reads `filings` (see `web/backend/api.py`: `/filings`, `/filings/export.csv`, `/coverage`).

## Adapter #1: Florida (`src/adapters/fl.py`) — free bulk SFTP
Division of Corporations public SFTP (state-published login in `.env`). Daily files `doc/cor/<date>c.txt` and
`doc/fic/<date>f.txt`; delegates to `runner.parse_corporate/parse_fic`, so output matches the legacy pipeline.
The corporate file has no county; the FIC file does. The daily corporate file also carries changes to older
entities (2026-10-08: 25 of 4,105 rows had filed dates before 2026-09-08), so "new filings" in the UI should use
the `filed_date` range filter.

## Adapter #2: Colorado (`src/adapters/co.py`) — free open-data API, no registration
"Business Entities in Colorado", Colorado Secretary of State on data.colorado.gov (Socrata `4ykn-tg5h`).
Licence **Public Domain** (dataset metadata; attribution CDOS); updated daily. Query:
`$where=entityformdate='YYYY-MM-DDT00:00:00'`, paged 1,000 rows by `entityid`. Optional `SOCRATA_APP_TOKEN`
raises the anonymous rate limit (free; not required). No county field. `Good Standing`/`Exists` = active;
`Delinquent`, `Noncompliant`, dissolved, withdrawn, merged and converted = not active.
Some rows carry future formation dates (delayed effective dates), so a date's query can include a few rows
filed earlier.

**Real fetches (xps, 2026-10-12):** CO 20261008 = 605 rows, 20261009 = 582, 20261010 = 282, 20261011 = 222;
FL 20261008 = 2,874, 20261009 = 1,231, 20261010 = 147, 20261011 = 116, 20261012 = 0 (no file yet).

### Why Colorado over the other free candidates
| dataset | licence | new-filings filter | notes |
|---|---|---|---|
| **CO** Business Entities (4ykn-tg5h) | Public Domain | `entityformdate` (daily) | ~500–600 new rows per weekday; principal address + agent |
| CT Business Registry – Business Master (n7gp-d28j) | Public Domain | `date_registration` | includes a `business_email_address` field and `naics_code`: good adapter #3 candidate; emails would be state-published (verified), not guessed |
| OR Active Businesses – ALL (tckn-sxa6) | no licence in metadata | `registry_date` | one row per associated *person* (names of individuals): heavier PII, needs grouping; "New Businesses Registered Last Month" (esjy-u4fc) is monthly only |

## Next states
1. More free open-data states (CT next; then check NY/WA open-data portals) — each is an S-sized adapter.
2. Registration-required (WV, AR): needs an account — Principal identity step.
3. Paid (KY monthly, TN, TX fees): **spend decision for the Principal**; not implemented.
See `docs/OTHER_STATES.md`.

## Tests
`pytest tests/` (run on a fleet host, never the laptop): protocol conformance, FL parse/normalize on a synthetic
fixed-width fixture (`tests/fixtures/make_fl_fixture.py`), CO paging/normalize on a synthetic JSON fixture,
dedupe in memory and in SQLite, per-state ingest logging, the `states` flag vs the legacy path, the email policy,
and the API. No network, no live Stripe, no email.
