---
loop: ui-smoke
family: Guard
mode: monitor
cadence: daily
executor: sentinel
runs_from: laptop (Playwright / Claude-in-Chrome)
targets: the top Live tools per category
context:
  - ../CONTROL.md
  - ../CENTRAL_MONITORING_PLAN.md
  - ../../social/MDO3D-Project-Summaries.md
records_to: LEDGER.md (+ INBOX.md on escalation) + review/data/monitoring.json
status: draft
---

# Loop: ui-smoke

**One-line:** the browser-level check. A page can 200 at the network and still console-error,
fail to load, or break its key flow. This drives the real UI and confirms the one thing each
Live tool must do actually works.

## CONTEXT (run first)
- Read [`../CONTROL.md`](../CONTROL.md); always a monitor.
- Pick the Live tools from `social/MDO3D-Project-Summaries.md` (status Live). Do not smoke
  Coming-soon/dev tools.
- Use a dedicated test account, never a real customer login. Avoid actions that charge (do not
  complete a paid checkout; stop at the paywall).

## SENSE (read-only-ish, no mutations)
- For each target tool: load the page, wait for ready, capture console errors and failed network
  requests. Then exercise one key flow to first result:
  - oracle / tarot / dreams → request a reading, confirm a result renders.
  - resume analyzer → submit a sample resume, confirm analysis renders.
  - leads → load the app shell, confirm it is not the 502 error page.
- Do not submit payment, create real records beyond a test, or send email.

## DECIDE
- All-clear: loads clean, no console errors, the key flow reaches a result.
- Flag: console errors, a blank/placeholder render, a login bounce, or a flow that never resolves.

## ACT (monitor only)
- Merge per-tool pass/fail + first console error into `review/data/monitoring.json`. Capture a
  screenshot only on failure, to a gitignored path.

## RECORD
- Append to [`../LEDGER.md`](../LEDGER.md): tools smoked, pass/fail, first error per failure.
- Failure of a Live tool → [`../INBOX.md`](../INBOX.md).

## Guardrails
- Test account only. No payments, no destructive actions, no real customer data.
- Do not trigger browser dialogs that block the automation session.

## Escalation
- A Live, revenue-bearing tool whose key flow is broken → INBOX.md + PushNotification.

## Dispatch prompt
```
Read mdo3d/loops/CONTROL.md first; always MONITOR. Using a test account (never a real customer, never a paid
checkout), browser-smoke the Live tools listed in mdo3d/social/MDO3D-Project-Summaries.md: load each, capture
console errors + failed requests, then run its one key flow to first result (reading renders / resume analysis
renders / leads shell loads and is not the 502 page). Merge pass/fail + first error into
mdo3d/review/data/monitoring.json (screenshot only on failure, gitignored). Append a LEDGER row. Escalate a
broken Live revenue tool to INBOX.md + push. No payments, no destructive actions, no dialogs that block the session.
```
