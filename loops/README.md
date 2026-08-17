# MDO3D Loops — the portfolio maintenance control plane

**Purpose:** the home for recurring, self-driving loops that keep the MDO3D portfolio of
websites and tools healthy without a human in the seat. Each loop is a thin, self-contained
spec that a Claude Code session runs cold on a cadence. It dispatches to tools that already
exist (gcloud, firebase, curl, the review dashboard), it does not reimplement them.

Modeled on `~/ahl/loops`. Same machine: a loop is a cold-runnable prompt, run via `/loop`
(supervised), the `schedule` skill (`CronCreate`, unattended), or an `Agent` dispatch. The
LEDGER and INBOX are plain markdown each loop writes as its final step. No bespoke daemon.

Central monitoring design and its tradeoffs live in [`CENTRAL_MONITORING_PLAN.md`](./CENTRAL_MONITORING_PLAN.md).
The switchboard is [`CONTROL.md`](./CONTROL.md); run history is [`LEDGER.md`](./LEDGER.md);
open escalations are [`INBOX.md`](./INBOX.md).

## The machine MDO3D actually runs on

Unlike the AHL fleet (self-hosted nodes), MDO3D is mostly managed cloud:

- **4 Firebase / GCP projects**: `mdo3d-leads`, `mdo3d-career`, `mdo3d-utilities`,
  `oracle-mdo3d` (business projects), plus GCP `pivotal-racer-397905` (owns the admin SA).
  Products in use: Firestore, Auth, Analytics, Hosting, Functions.
- **~20 tools on subdomains** across `mdo3d.com` (divination + guidance), `rigor.design`
  (career), `ronnascanner.com` / `leads.mdo3d.com` (leads), `mdothree.com` (utilities).
- **Stripe** (MDO3D account) for checkout across tools.
- **Hosting mix**: Firebase Hosting, Vercel static, and littlemini Docker + Cloudflare Tunnel
  (leads). A loop resolves what is live at run time; it never hardcodes the tool list.
- **Sign-off surface**: the review dashboard at `~/mdo3d/review` (a Monitoring lane will
  read the loops' output).

Because the surface is public and cloud-managed, MDO3D loops lean on **public probes** (HTTP,
TLS) and **read-only cloud API reads** (Firestore/Auth/Billing) rather than SSH into nodes.

## The model (same five beats as AHL)

```
CONTEXT → read CONTROL.md; resolve effective mode (monitor/operator/paused); resolve the
          live tool + project set (never hardcode)
SENSE   → gather ground truth read-only: HTTP/TLS probes, Firestore/Auth counts, Stripe,
          billing, git vs deployed
DECIDE  → compare against the loop's success criteria; is action needed?
ACT     → smallest safe action, or escalate (monitor loops only sense + record)
RECORD  → append one row to LEDGER.md; escalations to INBOX.md; update STATUS.md on state change
```

Monitor-first: every loop starts record-only. Promote to operator only after the monitor is
trusted, and only for loops whose spec allows it.

## The registry — what each loop monitors

### 🛡️ Guard — is every site up, honest, and secure

| Loop | Watches | Cadence | Mode | Auth needed | Status |
|------|---------|---------|------|-------------|--------|
| [site-health](./site-health/loop.md) | every deployed subdomain: HTTP status, redirects, TLS cert expiry. Catches outages (found `leads.mdo3d.com` 502). | 30 min | monitor | none (public) | draft |
| [ui-smoke](./ui-smoke/loop.md) | top live tools in a real browser: loads clean, no console errors, one key flow works (a reading generates, a resume analyzes). | daily | monitor | test user | draft |
| [firebase-health](./firebase-health/loop.md) | per project: Firestore reachable, Auth responding, Functions error rate, quota headroom. | daily | monitor | read-only SA | draft |
| [security-scan](./security-scan/loop.md) | Firestore/Storage rules not world-open, no secrets committed, no live API keys in client bundles beyond expected Firebase web keys. | weekly | monitor | read-only SA | draft |

### 💵 Finance — revenue in, cost under control

| Loop | Watches | Cadence | Mode | Auth needed | Status |
|------|---------|---------|------|-------------|--------|
| [revenue-cost](./revenue-cost/loop.md) | Stripe charges / refunds / MRR per tool; GCP + Firebase usage vs free-tier limits (Firestore ops, Auth MAU, hosting bandwidth); flag a cost spike or a tool nearing quota. | daily | monitor | Stripe key + billing read | draft |

### 🧭 Produce / Remember — track progress and keep state current

| Loop | Watches | Cadence | Mode | Auth needed | Status |
|------|---------|---------|------|-------------|--------|
| [usage-rollup](./usage-rollup/loop.md) | the central progress read: per project, total + new users (Auth), key Firestore collection counts (signups, leads, readings, orders), Analytics active users / engagement. Writes `review/data/monitoring.json` for the dashboard Monitoring lane. | daily | monitor | read-only SA (+ GA4) | draft |
| [status-rollup](./status-rollup/loop.md) | aggregates the other loops' latest findings + the dashboard state into `~/mdo3d/STATUS.md`. | weekly | operator (writes STATUS) | none | draft |

### 🔄 Sync — deployed matches source

| Loop | Watches | Cadence | Mode | Auth needed | Status |
|------|---------|---------|------|-------------|--------|
| [deploy-drift](./deploy-drift/loop.md) | for each tool: is the deployed version behind the repo HEAD (last hosting release vs last commit)? Flags un-shipped work and stale deploys. | daily | monitor | hosting read | draft |

### 📣 Grow — the social pipeline (future)

| Loop | Watches | Cadence | Mode | Auth needed | Status |
|------|---------|---------|------|-------------|--------|
| [social-content](./social-content/loop.md) | draft + route MDO3D social posts (from `social/`) through the review dashboard, respect the promote/teaser/hold status gate, bulk-schedule approved. Nothing auto-publishes. | weekly | operator (drafts) | social creds | candidate — needs the editorial calendar in `social/data/` |

## Bring-up order

1. **site-health** first: pure public probes, no credentials, immediate value (an outage board).
2. **usage-rollup** and **firebase-health** next, once the read-only auth path is chosen (see the plan). These are the "track progress across them all" answer.
3. **revenue-cost**, **deploy-drift**, **security-scan** as the auth and Stripe access settle.
4. **ui-smoke** once the key per-tool flows are named.
5. **status-rollup** last: it consumes the others.
6. **social-content** when the editorial calendar lands.

Bring each up supervised with `/loop`, prove it behaves as a monitor, then schedule it.
