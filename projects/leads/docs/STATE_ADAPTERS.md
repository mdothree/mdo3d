# State adapters (DRAFT, 2026-10-12)

Plan: `~/latarence/docs/plans/input_prompts_0/PART_C_product_research_content.md` §C5 (dispatch C9 first moves).
Status: **interface drafted, not wired.** `src/runner.py` still runs the FL pipeline directly; nothing changes at runtime.

## Interface (`src/adapters/base.py`)
`StateAdapter` protocol, one per state:

| step | signature | job |
|---|---|---|
| fetch | `fetch(source_date, workdir) -> RawBatch` | download that date's raw files/pages only; record missing files |
| parse | `parse(raw) -> list[dict]` | state-specific records, source field names |
| normalize | `normalize(record) -> Filing` | map to the common schema |

`run_adapter(adapter, date, workdir)` chains them and dedupes on `(state, source_id)`.

**Common schema `Filing`:** state · source_id · entity · filing_type · filed_date · status · county ·
registered_agent · principal_address · naics_guess (+ naics_basis) · contacts · source_date · raw.

**Honesty rules in the schema:**
- Unknown stays `None`. Nothing (county, NAICS, contact) is inferred without evidence; `naics_guess` requires `naics_basis`.
- **No email guessing.** `Contact` rows exist only for values read from a public source (`source` URL) and are `verified`.
  The runner's variant guesser is hard-disabled (9118d2d).

## Adapter #1: Florida (`src/adapters/fl.py`)
Free bulk SFTP (Division of Corporations). It delegates to the existing `runner.connect_sftp/parse_corporate/parse_fic`,
so its output matches today's pipeline. The corporate file has no county; the FIC file does.

## Next states (order from the plan; not started)
1. Free bulk data first.
2. Registration-required (WV, AR).
3. Paid (KY monthly, TN, TX fees). **Paid feeds are a spend decision for the Principal.**

## To wire it (later, behind a flag)
- `runner.download_and_parse` → `run_adapter(ADAPTERS[state](), …)` per profile `states: ["FL"]`.
- `filter_leads` reads `Filing` fields.
- Store `Filing` rows in SQLite with `(state, source_id)` unique.

**Verify per state:** an ingest run logs row count > 0 with its date.
