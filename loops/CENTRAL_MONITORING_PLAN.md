# MDO3D Central Monitoring — Plan and Tradeoffs

**Status:** plan for review. Auth path is the gating decision (see section 4).
**Goal:** one place to see, across the whole MDO3D portfolio, whether every site is up, how
each product is growing, what it costs, and what needs attention. Feeds the review dashboard
Monitoring lane and `~/mdo3d/STATUS.md`, driven by the loops in this directory.

---

## 1. What we can collect centrally

The apps roll up into 4 Firebase/GCP projects and use Firestore, Auth, Analytics, Hosting,
and Functions, all on public subdomains with Stripe checkout. That gives five signal
sources, each with a clean central read:

| Signal | Source | Read method | Cost / latency |
|--------|--------|-------------|----------------|
| **Uptime + TLS** | public subdomains | HTTP HEAD/GET + cert expiry | free, real-time |
| **Users + growth** | Firebase Auth | Identity Toolkit `accounts:query` (count only) | cheap, real-time |
| **Business records** | Firestore | `runAggregationQuery` COUNT per collection | billed reads (small), real-time |
| **Engagement** | Analytics (GA4) | GA4 Data API | free, 24 to 48h latency |
| **Health + quota** | Cloud Monitoring | `timeSeries` (Firestore ops, function errors, bandwidth) | free, ~minutes |
| **Revenue** | Stripe | Stripe API (charges, subscriptions) | free, real-time |
| **Cost** | Cloud Billing | Billing API / budget alerts | free, ~daily |

"Anything feasible to collect centrally" resolves to these seven reads, done per project and
aggregated. None of them pull user PII content; users and records are counts.

## 2. Where the data goes

```
loops (site-health, usage-rollup, firebase-health, revenue-cost, deploy-drift)
        │  each writes its slice
        ▼
review/data/monitoring.json   ← single aggregated snapshot (gitignored)
        │
        ├──▶ review dashboard "Monitoring" lane  (per-project cards: up? users, records, cost, drift)
        └──▶ status-rollup loop → ~/mdo3d/STATUS.md  (weekly narrative + attention list)
```

`monitoring.json` is the one artifact every loop appends to and the dashboard reads. It holds
counts and status, not user data. It is gitignored by default (section 6).

## 3. Collection method — three options, and the pick

**A. REST + gcloud-minted token (recommended).** Each loop mints a short-lived access token
with `gcloud auth print-access-token` (as the chosen identity), then calls the Firestore,
Identity Toolkit, Monitoring, and GA4 REST APIs with stdlib `urllib`. Stripe via its REST API.

- Pro: no pip installs; fits the stdlib, no-dependency pattern of the dashboard; portable.
- Con: token juggling per run; COUNT/aggregation query bodies are slightly verbose.

**B. Firebase Admin SDK service.** A small Node or Python service using `firebase-admin` +
`google-cloud-*`.

- Pro: richest and simplest client code (listUsers, collection refs, etc.).
- Con: adds a dependency stack and a build/venv; heavier than the rest of this repo warrants.

**C. Cloud Monitoring metrics scope (native cross-project).** Create one scoping project that
includes all four, giving a single Cloud Monitoring dashboard across them.

- Pro: Google-native "monitor many projects at once"; good for infra metrics and alerting.
- Con: covers infra health well but not business progress (signups, records, revenue); it is
  a second dashboard to maintain outside the one we already have.

**Pick: A for the loops (business + health reads into our dashboard), plus C later as a bolt-on**
for infra alerting if we want paging. B is avoided to keep this repo dependency-light.

## 4. Auth — the gating decision (tradeoffs)

The four business projects are separate from the SA's home project (`pivotal-racer-397905`),
so whatever identity we use must have read roles on each of the four. Three paths:

| Path | What it is | Blast radius | Setup | Durability | Recommendation |
|------|-----------|--------------|-------|-----------|----------------|
| **Existing platform-admin SA** | reuse `platform-admin-mdo3d@pivotal-racer-397905` (key already on disk) | **high** — broad admin across projects | none | standing | fast start, but over-privileged for read-only monitoring |
| **Dedicated read-only SA** | new SA with Viewer + Firebase Viewer + Monitoring Viewer, granted on the 4 projects only | **low** — read-only, scoped | ~20 min (create SA, grant 4 projects, download key) | standing | **recommended for anything scheduled/unattended** |
| **User login** | `gcloud auth login` as `mdo3group@gmail.com`; loops use your ADC | medium — your full access | quick | session-tied, breaks when creds rotate | fine for a one-off supervised run, not for a scheduled loop |

**Recommendation:** a dedicated read-only SA. A monitor should never hold write/admin. The key
lands in a gitignored secrets path and the loops read it via `GOOGLE_APPLICATION_CREDENTIALS`.
Until that exists, `site-health` runs today with zero credentials (public probes only), so
uptime monitoring is not blocked on the auth decision.

**Open item (flagged earlier):** we have not yet verified the SA can even reach the four
business projects. That probe touches production reads and a broad admin credential, so it is
paused pending your explicit go-ahead. The read-only-SA path sidesteps this by granting exactly
the roles we want on exactly the four projects.

## 5. Cadence and cost

- **site-health**: 30 min. Free (public probes). The one worth running often.
- **usage-rollup**: daily. Firestore COUNT reads are billed but tiny; daily keeps cost near zero
  and progress numbers fresh enough. Avoid high-frequency Firestore polling: reads are metered.
- **firebase-health / deploy-drift**: daily. Cloud Monitoring and hosting reads are free.
- **revenue-cost**: daily. Stripe + billing are free reads.
- **ui-smoke**: daily. Browser runs are the most expensive in wall-clock; keep them daily and
  scoped to the top live tools.
- **security-scan**: weekly. Static.

Tradeoff: freshness vs. metered reads. Uptime wants frequent (cheap); business counts want
daily (metered). The split above reflects that.

## 6. Guardrails and data handling

- **Monitor-first.** Every loop is read-only until explicitly promoted. Operator actions
  (restart a down site, rotate a leaked key) stay out until a monitor is trusted.
- **Counts, not content.** User and record reads are counts and aggregates. The monitor never
  exports user PII, message bodies, or documents.
- **Secrets gitignored.** The SA key and Stripe key live under a gitignored secrets path (the
  repo already ignores `.env`, `secrets.json`, `**/config/secret*.js`). Add `loops/secrets/`
  and `review/data/monitoring.json` to `.gitignore` before the first run.
- **Least privilege.** Read-only SA over the admin SA; scoped to the four projects.

## 7. Pull now, push later

This plan is **pull**: loops poll cloud APIs on a cadence, requiring zero changes to the apps.

- Pro: nothing to deploy into 20 apps; works today.
- Con: granularity is limited to what the APIs expose; no custom product events beyond GA4.

A later **push** phase (apps emit custom events/metrics to a central sink) would give
per-feature funnels, but it needs code in every app and is not worth it until the pull layer
proves what is missing. Start pull.

## 8. Tradeoffs summary

| Decision | Chosen | Alternative | Why |
|----------|--------|-------------|-----|
| Client | stdlib REST + gcloud token | Admin SDK; Monitoring scope | keep repo dependency-light; native scope as later bolt-on |
| Identity | dedicated read-only SA | reuse admin SA; user login | least privilege for an unattended monitor |
| Sink | `monitoring.json` → dashboard lane | hosted dashboard; GCP dashboards | reuse the dashboard already built |
| Cadence | uptime 30m, business daily | uniform frequent | uptime is free, Firestore reads are metered |
| Instrumentation | pull (poll APIs) | push (app events) | zero app changes now; revisit if pull is thin |
| Mode | monitor-first | operator | surfacing is always safe; acting may not be |

---

## Next actions

1. Decide the auth path (recommend: dedicated read-only SA). I can lay out the exact `gcloud`
   commands; you run the ones needing your Google login.
2. Ship `site-health` today (no auth) as the first live loop, supervised via `/loop`.
3. Add the `.gitignore` entries in section 6.
4. Build the `usage-rollup` collector against the chosen identity; wire `monitoring.json` into
   a Monitoring lane on the dashboard.
5. Bring the rest up in the order in the README.
