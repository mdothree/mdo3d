# MDO3D — Organization

**The agent-operated Operating Org for MDO3D (Lamar).** Canonical home for how MDO3D *runs*: who owns
what, who reports to whom, where each office keeps its charter. Modeled on the Huntington Applied
Operating Org (`~/ahl/Organization/`), scaled to MDO3D.

> Central seat: `latarence` tracks this Chief of Staff — see `~/latarence/docs/CHIEFS_OF_STAFF.md`.

## Chart

```
Principal / Founder ─ the human
      │  sets targets, holds final authority
      │
Chief of Staff ─ Claude (the operator)            → Chief-of-Staff/README.md
      │  takes a target, dispatches it via loops/agents, reports back
      │
  ── OPERATE (standing offices — always on) ─────────────────────
      ├── Chief Reliability Officer ... site + deploy + security stay up
      ├── Chief Growth Officer ........ content, social, adoption
      └── (Chief of Staff holds) ...... status rollup + finance
```

## The offices

| Office | Owns | Loops (`loops/`) | Agents |
|---|---|---|---|
| **Chief of Staff** | Runs the operation; dispatches every target; status + finance | `status-rollup` · `revenue-cost` | dispatch |
| **Chief Reliability Officer** | Sites, deploys, Firebase, and security stay up | `site-health` · `ui-smoke` · `firebase-health` · `deploy-drift` · `security-scan` | `sentinel` · `builder` |
| **Chief Growth Officer** | Ship outward — content, social, usage | `social-content` · `usage-rollup` | `curator` · `outreach` |

## How an office works
Each office is a permanent **function**, staffed by **loops + agents** (not headcount). *Agents* here are
the global specialist subagent types (`builder`, `sentinel`, `curator`, `outreach`, `analyst`) the operator
dispatches — distinct from MDO3D's own runtime bots in [`agents/`](../agents/README.md) (arbitrage-agent,
openclaw). The Chief of
Staff commands the offices via the [`loops/` control plane](../loops/README.md); routine findings land
in [`loops/LEDGER.md`](../loops/LEDGER.md), escalations in [`loops/INBOX.md`](../loops/INBOX.md). The
mode switch (monitor↔operator) is [`loops/CONTROL.md`](../loops/CONTROL.md).

## Live state & sources (link, don't restate)
- [`STATUS.md`](../STATUS.md) — rolling snapshot (portfolio, content, leads)
- [`loops/LEDGER.md`](../loops/LEDGER.md) + [`loops/INBOX.md`](../loops/INBOX.md) — loop runs + escalations
- [`loops/CENTRAL_MONITORING_PLAN.md`](../loops/CENTRAL_MONITORING_PLAN.md) — monitoring design
- Review surface: `python3 review/app.py` → :8822

## Operating mode
Runs in [`loops/CONTROL.md`](../loops/CONTROL.md) — offices sense and escalate; they act only when the
Chief of Staff dispatches or `CONTROL.md` is flipped to `operator`.

---
**Lineage**: loops control plane ported from AHL; Operating Org stood up 2026-08-13.
