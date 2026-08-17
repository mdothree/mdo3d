---
loop: site-health
family: Guard
mode: monitor
cadence: 30m
executor: sentinel
runs_from: laptop (supervised) · control seat (scheduled)
targets: all live MDO3D public subdomains (mdo3d.com, rigor.design, ronnascanner.com, mdothree.com)
context:
  - ../CONTROL.md
  - ../CENTRAL_MONITORING_PLAN.md
  - ../../STATUS.md
  - ../../documentation/MDO3D_GAP_ANALYSIS.md
  - ../../documentation/PROJECTS_STATUS.md
records_to: LEDGER.md (+ INBOX.md on escalation) + STATUS.md (state changes only)
status: draft
---

# Loop: site-health

**One-line:** the always-on uptime pulse. Is every deployed MDO3D tool reachable, returning a
healthy status, on a valid TLS cert. Runs with zero credentials (public probes only), so it is
the first loop to bring live.

## CONTEXT (run first)
- Read [`../CONTROL.md`](../CONTROL.md); resolve effective mode (this is always a monitor).
- **Resolve the live URL set at run time, do not hardcode:** union of
  (a) subdomains listed in `documentation/MDO3D_GAP_ANALYSIS.md` + `PROJECTS_STATUS.md`,
  (b) `firebase hosting:sites:list` per project if auth is available (optional),
  (c) the `deploy_url`s the review dashboard already discovers (`review/app.py` `discover_url`).
  Dedupe. A URL that has stopped resolving is itself a finding, not a silent skip.

## SENSE (read-only)
- For each URL: HTTP `GET` (follow redirects), capture final status, redirect chain, and latency.
  Treat 200 to 399 as up; 4xx/5xx or timeout as down.
- TLS: capture certificate `notAfter`; flag any cert expiring within 21 days.
- Note apex vs subdomain and whether an API endpoint (e.g. `leadsapi.mdo3d.com`) answers.

## DECIDE
- Baseline = the tool's expected status from the gap-analysis doc (Live tools must be up;
  Coming-soon/dev may legitimately 404 or redirect to a waitlist).
- Up + valid cert → all-clear. Down, 5xx, cert expiring, or a Live tool serving a placeholder
  → flag. A prior-up tool now down is a state change.

## ACT (monitor only)
- Do not restart, redeploy, or touch DNS. Diff this run against the last run; record what changed.

## RECORD
- Append to [`../LEDGER.md`](../LEDGER.md): up/down counts, newly-down URLs, certs expiring soon.
- On a state change (a tool flips up↔down), update `STATUS.md`. Steady-state all-clears stay in
  the ledger only.

## Guardrails
- Read-only. Public HTTP/TLS probes only; no auth, no writes, no DNS changes.
- Respect the status gate: a Coming-soon tool 404ing is not an outage.

## Escalation
- A **Live, revenue-bearing** tool down (checkout, leads, a paid tool), or an API endpoint down
  that fronts others → INBOX.md + PushNotification immediately; do not wait for the next cycle.
- Known open item: `leads.mdo3d.com` 502 (see INBOX.md).

## Dispatch prompt
```
Read mdo3d/loops/CONTROL.md first; resolve effective mode (this loop is always MONITOR — sense + record only).
Check MDO3D site health. Build the URL set at run time (do not hardcode): union of the subdomains in
mdo3d/documentation/MDO3D_GAP_ANALYSIS.md and PROJECTS_STATUS.md, the deploy_urls from mdo3d/review/app.py
discover_url, and (if firebase auth is available) `firebase hosting:sites:list` per project. Dedupe.
For each URL: GET (follow redirects) and record final status + latency; read the TLS cert notAfter and flag
any expiring within 21 days. Compare against expected status (Live tools must be up; Coming-soon/dev may 404).
Append one row to mdo3d/loops/LEDGER.md (up/down counts, newly-down URLs, certs expiring). On an up↔down state
change, update mdo3d/STATUS.md. Escalate to mdo3d/loops/INBOX.md + a push notification if a Live revenue-bearing
tool or a fronting API is down. Read-only: never restart, redeploy, or change DNS.
```
