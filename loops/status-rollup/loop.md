---
loop: status-rollup
family: Remember
mode: operator
cadence: weekly
executor: analyst
runs_from: laptop (supervised) · control seat (scheduled)
targets: the other loops' output (LEDGER, monitoring.json) + the review dashboard
context:
  - ../CONTROL.md
  - ../LEDGER.md
  - ../../STATUS.md
records_to: LEDGER.md + ~/mdo3d/STATUS.md
status: draft
---

# Loop: status-rollup

**One-line:** turns the week of loop findings into a current `STATUS.md` narrative and a ranked
attention list, so the portfolio state is readable in one place without reading every ledger row.

## CONTEXT (run first)
- Read [`../CONTROL.md`](../CONTROL.md). This loop is `operator` because it writes `STATUS.md`;
  under `execution: monitor` it drafts the update to INBOX.md instead of writing STATUS.

## SENSE (read-only)
- Read the week's `LEDGER.md` rows, the latest `review/data/monitoring.json`, and the review
  dashboard summary (per-project verdicts, open items).
- Collect: current up/down, users and revenue trend, projects nearing quota/cost, un-shipped
  drift, unresolved INBOX items.

## DECIDE
- Determine what changed since the last STATUS update and what needs attention now.

## ACT (operator: write STATUS; monitor: draft to INBOX)
- Update `~/mdo3d/STATUS.md`: refresh the dashboard/health section, the per-project lines, and a
  short "attention this week" list ranked by impact. Preserve existing hand-written entries;
  update in place rather than append duplicates.

## RECORD
- Append to [`../LEDGER.md`](../LEDGER.md): "status rolled up; N items flagged."
- Carry unresolved escalations forward in [`../INBOX.md`](../INBOX.md).

## Guardrails
- Only edits `STATUS.md` and the loop ledgers. Never touches app code, infra, or the projects.
- Under `execution: monitor`, produce the draft but do not write STATUS.

## Escalation
- If the week shows a Live tool down the whole period, or revenue trending down two weeks
  running → surface at the top of STATUS and to INBOX.md.

## Dispatch prompt
```
Read mdo3d/loops/CONTROL.md first and resolve mode. If OPERATOR, update mdo3d/STATUS.md; if MONITOR, draft the
update into mdo3d/loops/INBOX.md instead. Read the week's mdo3d/loops/LEDGER.md rows, the latest
mdo3d/review/data/monitoring.json, and the review dashboard summary. Refresh STATUS.md: health/up-down,
users + revenue trend, projects nearing quota/cost, deploy drift, and a ranked "attention this week" list.
Update existing sections in place (don't duplicate); preserve hand-written entries. Append a LEDGER row.
Only edit STATUS.md and the loop ledgers — never app code, infra, or the projects.
```
