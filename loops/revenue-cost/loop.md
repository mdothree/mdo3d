---
loop: revenue-cost
family: Finance
mode: monitor
cadence: daily
executor: analyst
runs_from: laptop (supervised) · control seat (scheduled)
targets: Stripe (MDO3D account) + Cloud Billing + Firebase usage across the 4 projects
context:
  - ../CONTROL.md
  - ../CENTRAL_MONITORING_PLAN.md
records_to: LEDGER.md (+ INBOX.md on escalation) + review/data/monitoring.json
status: draft
---

# Loop: revenue-cost

**One-line:** money in versus money out. Stripe revenue per tool, and GCP/Firebase usage
against free-tier limits so a runaway tool is caught before the bill is.

## CONTEXT (run first)
- Read [`../CONTROL.md`](../CONTROL.md); always a monitor.
- **Auth:** Stripe restricted (read-only) key from the gitignored secrets path; Cloud Billing +
  Monitoring read via the read-only SA token. If a credential is missing, record which parts ran
  and which were skipped rather than failing the whole run.

## SENSE (read-only)
- **Stripe:** charges, refunds, active subscriptions, and MRR for the trailing 1 and 30 days;
  attribute to tool via product/price metadata where present.
- **Cost:** Cloud Billing current month-to-date per project; any active budget-alert state.
- **Usage vs free tier:** Firestore reads/writes/deletes, Auth MAU, hosting bandwidth, function
  invocations (Cloud Monitoring `timeSeries`), expressed as percent of the free-tier ceiling.

## DECIDE
- All-clear: revenue steady or up, every project comfortably under free-tier and budget.
- Flag: a charge/refund anomaly, a project crossing ~80% of any free-tier limit, or
  month-to-date cost above its budget trendline.

## ACT (monitor only)
- Merge the revenue + cost + usage slice into `review/data/monitoring.json`. Never modify billing,
  Stripe, or quota.

## RECORD
- Append to [`../LEDGER.md`](../LEDGER.md): MRR, day revenue, per-project usage headroom.
- Anomaly → [`../INBOX.md`](../INBOX.md).

## Guardrails
- Read-only Stripe key (never a full-access key). Read-only billing/monitoring.
- Aggregates only; no customer records or payment details pulled.

## Escalation
- A project projected to blow past free tier into real cost, or a sudden revenue drop / refund
  spike → INBOX.md + PushNotification.

## Dispatch prompt
```
Read mdo3d/loops/CONTROL.md first; always MONITOR. Using a READ-ONLY Stripe key (gitignored secrets) and a
read-only Cloud Billing/Monitoring token, collect: Stripe charges/refunds/subscriptions + MRR for 1d and 30d
(attribute to tool by product metadata); Cloud Billing month-to-date per project + budget-alert state; and
Firestore ops / Auth MAU / hosting bandwidth / function invocations as percent of free-tier ceiling. Merge into
mdo3d/review/data/monitoring.json. Append a LEDGER row (MRR, day revenue, per-project headroom). Escalate to
INBOX.md + push if any project nears free-tier, cost exceeds budget trend, or revenue drops / refunds spike.
Aggregates only, read-only — never touch billing, Stripe, or quotas. If a credential is missing, run the parts
you can and record what was skipped.
```
