---
loop: firebase-health
family: Guard
mode: monitor
cadence: daily
executor: sentinel
runs_from: laptop (supervised) · control seat (scheduled)
targets: the 4 Firebase projects (mdo3d-leads, mdo3d-career, mdo3d-utilities, oracle-mdo3d)
context:
  - ../CONTROL.md
  - ../CENTRAL_MONITORING_PLAN.md
records_to: LEDGER.md (+ INBOX.md on escalation) + review/data/monitoring.json
status: draft
---

# Loop: firebase-health

**One-line:** are the Firebase backends themselves healthy. Firestore reachable, Auth
responding, Functions not erroring, quotas not near the wall. Complements site-health (front
door) by checking the backend behind each tool.

## CONTEXT (run first)
- Read [`../CONTROL.md`](../CONTROL.md); always a monitor.
- Auth: read-only SA token. No read identity → log "blocked on auth" and stop (never the admin SA).
- Resolve projects from `shared/*/.firebaserc`.

## SENSE (read-only)
- **Firestore:** a trivial read (list one collection, `pageSize=1`) returns 200 per project.
- **Auth:** Identity Toolkit responds; provider config present.
- **Functions:** Cloud Monitoring error rate + p95 latency per function over 24h.
- **Quota headroom:** Firestore ops, Auth MAU, hosting bandwidth as percent of limit (shared
  read with revenue-cost; whichever runs first fills the slice).

## DECIDE
- All-clear: every project reads clean, function error rate under threshold, quota comfortable.
- Flag: a project that fails its read, a function error rate above ~2%, or quota near the wall.

## ACT (monitor only)
- Merge the backend-health slice into `review/data/monitoring.json`.

## RECORD
- Append to [`../LEDGER.md`](../LEDGER.md): per-project reachable/errors, worst function, quota.
- Failure → [`../INBOX.md`](../INBOX.md).

## Guardrails
- Read-only. A single tiny probe read per project; no scans, no writes.

## Escalation
- Firestore or Auth unreachable for a Live project (the tool is effectively down even if the
  front door 200s) → INBOX.md + PushNotification.

## Dispatch prompt
```
Read mdo3d/loops/CONTROL.md first; always MONITOR. With a READ-ONLY SA token (never the admin SA), for each of
the 4 Firebase projects (from mdo3d/shared/*/.firebaserc): confirm a trivial Firestore read returns 200, confirm
Identity Toolkit/Auth responds, pull Cloud Monitoring function error-rate + p95 for 24h, and record Firestore/
Auth/bandwidth quota headroom. Merge into mdo3d/review/data/monitoring.json. Append a LEDGER row. Escalate to
INBOX.md + push if Firestore/Auth is unreachable for a Live project or a function error rate is high. Read-only,
one tiny probe read per project.
```
