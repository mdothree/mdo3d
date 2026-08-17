---
loop: usage-rollup
family: Produce
mode: monitor
cadence: daily
executor: analyst
runs_from: laptop (supervised) · control seat (scheduled)
targets: the 4 Firebase projects (mdo3d-leads, mdo3d-career, mdo3d-utilities, oracle-mdo3d)
context:
  - ../CONTROL.md
  - ../CENTRAL_MONITORING_PLAN.md
  - ../../review/README.md
records_to: LEDGER.md (+ INBOX.md on escalation) + review/data/monitoring.json + STATUS.md (weekly via status-rollup)
status: draft
---

# Loop: usage-rollup

**One-line:** the central progress read. Per project: how many users, how many key business
records, how much engagement, and which way each is trending. This is the "track progress
across them all" answer. Counts only, never user content.

## CONTEXT (run first)
- Read [`../CONTROL.md`](../CONTROL.md); always a monitor.
- **Auth:** mint a read token for the chosen identity (dedicated read-only SA per
  `CENTRAL_MONITORING_PLAN.md` section 4) via `gcloud auth print-access-token`, or
  `GOOGLE_APPLICATION_CREDENTIALS` pointed at the read-only SA key. If no read identity is
  configured yet, log one LEDGER row saying "blocked on auth" and stop; do not use the broad
  admin SA without explicit go-ahead.
- Resolve the project set from the `.firebaserc` files under `shared/*/`, not a hardcoded list.

## SENSE (read-only, counts only)
- **Users** per project: Identity Toolkit `accounts:query` with `returnUserInfo:false` for the
  total count; diff against yesterday's snapshot for net-new.
- **Business records** per project: `runAggregationQuery` COUNT on the collections that matter
  (leads → `leads`; oracle-mdo3d → `readings`; career → `analyses`; commerce → `orders`).
  Maintain the per-project collection list in this spec as it is learned; unknown collections
  are discovered by listing top-level collections once and recording candidates.
- **Engagement** (optional, if GA4 is linked): GA4 Data API for active users + key events over
  the trailing 1 and 7 days.

## DECIDE
- Compute per project: total users, net-new users, record counts, 7-day deltas. Roll up to a
  portfolio total.
- All-clear is not the point here; the output is the snapshot. Flag only anomalies: a count
  that dropped (possible data loss), a project returning errors, or a metric flat at zero for a
  Live tool (possible broken instrumentation).

## ACT (monitor only)
- Write the snapshot to `review/data/monitoring.json` (merge, do not clobber other loops'
  slices). Never write to the projects.

## RECORD
- Append to [`../LEDGER.md`](../LEDGER.md): portfolio totals + notable deltas.
- Anomaly (drop, error, silent Live tool) → [`../INBOX.md`](../INBOX.md).
- The weekly `status-rollup` loop turns the trend into `STATUS.md` prose; this loop does not.

## Guardrails
- **Counts and aggregates only.** Never export user records, emails, message/document bodies.
- Read-only identity (least privilege). Fail closed if only an admin credential is available.
- Firestore reads are metered: one COUNT per tracked collection per day, no full scans.

## Escalation
- A record count that fell sharply day-over-day (possible deletion/corruption) → INBOX.md +
  PushNotification; this is a data-integrity signal, not just a metric.

## Dispatch prompt
```
Read mdo3d/loops/CONTROL.md first; this loop is always MONITOR. Mint a READ-ONLY token for the configured
monitoring identity (dedicated read-only SA; gcloud auth print-access-token or GOOGLE_APPLICATION_CREDENTIALS).
If no read-only identity is configured, append a LEDGER row "blocked on auth" and STOP — do not use the broad
admin SA. Resolve the 4 Firebase projects from mdo3d/shared/*/.firebaserc. For each project collect COUNTS ONLY:
total users (Identity Toolkit accounts:query, returnUserInfo:false), and runAggregationQuery COUNT on the key
business collections; if GA4 is linked, active users + key events for 1d and 7d. Diff against the previous
snapshot for net-new. Merge the result into mdo3d/review/data/monitoring.json (do not clobber other loops'
slices). Append a LEDGER row with portfolio totals + deltas. Escalate to INBOX.md if a count dropped sharply,
a project errors, or a Live tool is flat at zero. Never export user PII/records — counts only. Read-only.
```
