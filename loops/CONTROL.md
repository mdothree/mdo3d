# MDO3D Loops — CONTROL (the switchboard)

The single switch panel for every MDO3D loop. Edit the YAML block, commit, and (for scheduled
loops) run the Apply step. Every loop reads this file in its CONTEXT beat, after resolving the
live target set and before it acts, so a flip takes effect on the next run.

Two things flip from here:
1. **Do loops implement changes?** the `execution` master switch (`monitor` = record-only
   fleet-wide; `operator` = operator-mode loops act for real).
2. **How often does each run?** the `cadence` line per loop (the source of truth; Apply
   reconciles the scheduler).

> **Dormancy note (2026-11-03, ORG-11).** Keep three things apart; "enabled" below means only the first. (1) *Declared intent* is this file (`master_enabled: true`, eight loops `enabled: true`). (2) *Scheduler registration* is a host cron/launchd entry; as of the last check (see "Effective state today" below) nothing is scheduled. (3) *Last completed run* is the newest non-setup row in `LEDGER.md`, which today is only the 2026-07-12 setup row. So these loops are specified, not running. That may be deliberate dormancy; no host scheduler was inspected for this note. Owner: the MDO3 CoS. Activation criterion: Apply has been run and `LEDGER.md` shows a run row for the loop; until then do not describe them as an always-on operator.

---

## The switches (source of truth)

```yaml
# ─────────────────────────── MASTER SWITCHES ───────────────────────────
master_enabled: true        # false = PAUSE EVERYTHING. Nothing senses, acts, or schedules.
execution: monitor          # monitor | operator
#   monitor  → every loop is record-only: SENSE + RECORD, never ACT. (safe default)
#   operator → loops whose spec mode is `operator` actually implement changes, under guardrails.
#              Spec `mode: monitor` loops stay read-only regardless.

# ───────────────────────────── PER-LOOP ─────────────────────────────────
# act:  inherit | monitor (force record-only) | operator (force acting)
# enabled: false → descheduled by Apply regardless of everything else.
# cadence: target interval; editing it here is the change.

loops:
  # Guard
  site-health:      { enabled: true,  act: inherit, cadence: "30m",    spec_mode: monitor }
  ui-smoke:         { enabled: true,  act: inherit, cadence: "daily",  spec_mode: monitor }
  firebase-health:  { enabled: true,  act: inherit, cadence: "daily",  spec_mode: monitor }
  security-scan:    { enabled: true,  act: inherit, cadence: "weekly", spec_mode: monitor }
  # Finance
  revenue-cost:     { enabled: true,  act: inherit, cadence: "daily",  spec_mode: monitor }
  # Produce / Remember
  usage-rollup:     { enabled: true,  act: inherit, cadence: "daily",  spec_mode: monitor }
  status-rollup:    { enabled: true,  act: inherit, cadence: "weekly", spec_mode: operator }
  # Sync
  deploy-drift:     { enabled: true,  act: inherit, cadence: "daily",  spec_mode: monitor }
  # Grow
  social-content:   { enabled: false, act: inherit, cadence: "weekly", spec_mode: operator }  # off until social/data/ has a calendar
```

## Effective state today

- `execution: monitor` — nothing acts yet. Every loop is a monitor while the set is proven.
- **Nothing is scheduled.** Bring each up supervised with `/loop`, prove it, then schedule via
  the `schedule` skill on the control seat.
- `site-health` is the only loop with no credential dependency; it can run now.
- The credential-dependent loops (usage-rollup, firebase-health, security-scan, revenue-cost)
  wait on the auth decision in `CENTRAL_MONITORING_PLAN.md` section 4.

## Apply

Scheduled loops read their cadence here. When you change a cadence or `enabled`, reconcile the
scheduler: for each enabled loop create/update its `schedule`-skill (`CronCreate`) task to match;
for a disabled loop, remove its task. Until any loop is scheduled, Apply is a no-op.
