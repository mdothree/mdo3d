---
loop: deploy-drift
family: Sync
mode: monitor
cadence: daily
executor: builder
runs_from: laptop (supervised) · control seat (scheduled)
targets: each tool's repo dir vs its live deployment
context:
  - ../CONTROL.md
  - ../CENTRAL_MONITORING_PLAN.md
  - ../../review/README.md
records_to: LEDGER.md (+ INBOX.md on escalation) + review/data/monitoring.json
status: draft
---

# Loop: deploy-drift

**One-line:** is what is live behind what is in the repo. Catches un-shipped work and stale
deploys per tool.

## CONTEXT (run first)
- Read [`../CONTROL.md`](../CONTROL.md); always a monitor.
- Hosting release reads use the read-only SA / firebase token; git reads are local.

## SENSE (read-only)
- Per project/tool: last git commit touching its dir (the dashboard already computes this via
  `review/app.py`); and the last deploy timestamp (Firebase Hosting `releases`, Vercel
  deployment, or the tunnel/container image date for littlemini-hosted tools).
- Compare: commits newer than the last deploy = un-shipped work; a deploy far older than the
  last commit, or a tool with commits but no deploy record = drift.

## DECIDE
- All-clear: deploy at or ahead of the latest relevant commit.
- Flag: un-shipped commits (with count and age), or a deploy staler than a threshold (e.g. 30
  days behind HEAD) for a Live tool.

## ACT (monitor only)
- Merge the drift slice into `review/data/monitoring.json`. Never deploy or push.

## RECORD
- Append to [`../LEDGER.md`](../LEDGER.md): tools with un-shipped work, stalest deploys.
- Notable drift → [`../INBOX.md`](../INBOX.md).

## Guardrails
- Read-only. Never trigger a build or deploy (operator promotion would be a separate decision).

## Escalation
- A Live tool with a broken or long-stale deploy that also shows a site-health or firebase-health
  problem (drift plus symptom) → INBOX.md.

## Dispatch prompt
```
Read mdo3d/loops/CONTROL.md first; always MONITOR. For each MDO3D tool, compare last git commit touching its
dir (see mdo3d/review/app.py git_activity) against its last deploy (Firebase Hosting releases / Vercel / tunnel
image date). Flag un-shipped commits (count + age) and deploys far behind HEAD for Live tools. Merge into
mdo3d/review/data/monitoring.json and append a LEDGER row. Escalate notable drift to INBOX.md. Read-only —
never build or deploy.
```
