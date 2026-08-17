---
loop: <kebab-name>
family: Guard | Finance | Produce | Remember | Sync | Grow
mode: monitor | operator
cadence: <human-readable target, e.g. "30m", "daily", "weekly">
executor: <sentinel | analyst | builder | curator | jarvis>
runs_from: <control seat — e.g. "laptop (supervised) · control seat (scheduled)">
targets: <dynamic set — e.g. "all live MDO3D subdomains" | "the 4 Firebase projects" | "Stripe + Cloud Billing">
context:                 # canonical docs a cold run must read first
  - ../CONTROL.md        # switchboard — resolve effective mode + cadence before acting
  - ../CENTRAL_MONITORING_PLAN.md
  - <the status/effort doc this loop serves>
records_to: LEDGER.md (+ INBOX.md on escalation) + <target status doc>
status: draft | active | blocked | candidate
---

# Loop: <name>

**One-line:** <what it keeps healthy>

## CONTEXT (run first)
- Read [`../CONTROL.md`](../CONTROL.md): resolve this loop's effective mode. `master_enabled:false`
  or `enabled:false` → log one LEDGER row and stop. Otherwise MONITOR (sense + record) or
  OPERATOR (act) per the switch. A spec `mode: monitor` loop is always read-only.
- Resolve the LIVE target set at run time (subdomains, projects). Never hardcode the tool list.

## SENSE (read-only)
- <ground-truth reads across the live targets>

## DECIDE
- <success criteria; when is action needed vs. all-clear>

## ACT
- <smallest safe action; or "monitor only — escalate">

## RECORD
- Append one row to [`../LEDGER.md`](../LEDGER.md).
- Anything unsafe to handle → [`../INBOX.md`](../INBOX.md). Update the target status doc only on a state change.

## Guardrails
- <loop-specific, on top of the monitor-first rule>

## Escalation
- <what stops the loop and how it surfaces: INBOX.md / PushNotification>

## Dispatch prompt
> Cold-runnable. Hand verbatim to `/loop`, the `schedule` skill, or `Agent`.

```
Read mdo3d/loops/CONTROL.md first and resolve this loop's effective mode (if paused/disabled, log one
LEDGER row and stop; if MONITOR, sense + record only; if OPERATOR, act under the guardrails).
Resolve the LIVE target set (never assume a fixed list).
<self-contained instruction — no session context, name all paths/tools; iterate over the live targets>
```
