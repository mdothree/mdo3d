# MDO3D Loops — INBOX

Open escalations a loop could not safely handle. A loop writes here when it finds something
that needs a human decision or an action outside monitor scope. Clear an item when resolved.

---

## Open

- **2026-07-12 · site-health precursor** — `leads.mdo3d.com` returned 502 (Bad Gateway) during
  dashboard health checks. The leads deploy (littlemini Docker + Cloudflare Tunnel) appears
  down. Root `STATUS.md` also notes a pending `STRIPE_WEBHOOK_SECRET`. Needs a look.
- **2026-07-12 · central-monitoring auth** — decide the identity for the credential-dependent
  loops (recommend a dedicated read-only SA; see `CENTRAL_MONITORING_PLAN.md` section 4). The
  probe of the existing admin SA against the 4 business projects is paused pending go-ahead.

## Resolved

_(none yet)_
