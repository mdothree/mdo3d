# Status

**Last updated:** 2026-08-15

**Operating org:** [`Organization/README.md`](Organization/README.md) — the Chief of Staff seat (agent operator) that dispatches targets to the [`loops/`](loops/README.md) control plane or a specialist agent and keeps this file true. Tracked centrally by `~/latarence/docs/CHIEFS_OF_STAFF.md`.

## Filesystem cleanup + fixes (2026-08-15)

Full audit and executed trim — details in [`documentation/FILESYSTEM_AUDIT_2026-08-15.md`](documentation/FILESYSTEM_AUDIT_2026-08-15.md); functionality audit in [`documentation/FEATURE_PARITY_AUDIT.md`](documentation/FEATURE_PARITY_AUDIT.md).

- Repo trimmed ~106MB → ~82MB (build caches, tracked node_modules purged from index, stale `projects/blacklab/{dreams,oracle,tarot}` pre-migration copies removed — `projects/divination/` is canonical).
- Stranded April integration work committed (divination Stripe/Firebase, 62 files); `.gitignore` nested-repo paths corrected.
- **Numerology app fixed** (`6aeab3d`, `ca6b65e`): two JS syntax errors that broke the app entirely, plus Firebase init/premium wiring. **Needs redeploy** to reach `numerology.mdo3d.com`.
- Landing pages (mdothree + mdo3d-static) updated to link all live tools; chrome extension icons added (parallel session; links verified HTTP 200).
- Stale Feb/Mar docs in `documentation/` banner-marked as superseded.
- **🔴 SECURITY (action required):** exposed credentials found in prose docs and scrubbed 2026-08-15, but **rotation is still needed**: (1) MDO3 GitHub token (was in `MDO3D_GAP_ANALYSIS.md`, still in git history), (2) runwae live Stripe secret key (was in `RUNWAE_IMPROVEMENT_PLAN.md`), (3) prudent: leads Stripe key in `projects/leads/web/backend/.env`. Details in the filesystem audit doc, pass 6.
- **Open:** 35 of 44 nested repos carry uncommitted work (April wave) — needs per-repo review/commit; tracking decision for operational dirs (`review/`, `loops/`, `social/`, this file); two stale `projects/mdo3d/` landing copies pending Vercel dashboard check.

## Management dashboard (`review/`, 2026-07-12)

A single surface to manage the project portfolio, modeled on the Ridgefield review
dashboard and rebranded. Stdlib only, no pip installs.

- Run: `python3 review/app.py` at `http://127.0.0.1:8822`.
- Lanes: **projects** (each `projects/*` with sub-tools, status file, git last-commit age,
  next-actions from TODO.md, and a live deploy health check), **docs** (`documentation/*`),
  and **social** (future review lane, empty until content lands in `social/data/`).
- Projects sort attention-first: no status file, then stalest by last commit.
- Social lane runs a voice QC gate (`review/voice_qc.py`); voice guide scaffold in
  `comms/voice/`.
- Full notes in `review/README.md`.

**Health-check finding (2026-07-12):** `leads.mdo3d.com` returns 502 (see Leads below).

## Content generation (metrics/plots → posts)

**To generate content, start here.** The review surface exists; the generator does not yet.

- **Review (built):** `python3 review/app.py` → :8822; social lane + voice-QC gate (`review/voice_qc.py`),
  empty until content lands in `social/data/`.
- **Loops:** `loops/social-content/` (candidate) drafts + schedules once a generator feeds it.
- **Missing — the generator:** metrics/plots → styled branded cards. First candidate source is **DailyAIToll**
  (`projects/external/dailyaitoll/data/daily_rollup.json`, real data), which maps onto AHL's `scorecard`
  idiom. Leaning: generate via the central AHL hub (`~/ahl/distribution/tools/branded_results/` — add MDO3D
  projects to `brand_tokens.json` + a small driver), review here on :8822.
- **Central tracking / operating model:** `~/latarence/docs/CHIEFS_OF_STAFF.md`. Loops are ported
  (`loops/`); a Chief-of-Staff seat is not yet stood up.

## Leads (2026-05-26)

- Frontend: https://leads.mdo3d.com  (returning 502 as of 2026-07-12)
- API: https://leadsapi.mdo3d.com
- Host: littlemini (Docker) via Cloudflare Tunnel
- Stripe: MDO3D Stripe account
- Pending: set `STRIPE_WEBHOOK_SECRET` (Stripe webhook signing secret) on littlemini backend.
