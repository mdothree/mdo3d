# MDO3D: agent context

Global agent rules: `~/latarence/docs/AGENTS.md` (doctrine: `~/latarence/docs/LAB_DOCTRINE.md`). CLAUDE.md imports this file. This file adds MDO3D specifics.

- **Status:** `STATUS.md` · **CoS seat:** `Organization/Chief-of-Staff/` · **HQ (MDO3 HQ, separate from AHL HQ):**
  `MDO_HQ_BOARD.md`, the `MDO_HANDOFF_*` letters go to `~/grok/inbox/` like AHL HQ's (lab rule 2026-10-14; older ones may still sit in `~/Downloads` on the laptop and bigmini) · **Fix queue:**
  `grok/FLEET_FIX_QUEUE.md`.
- **The MDO3 Google account is mdo3group@gmail (primary: Chrome Default, Vercel, Firebase, GoDaddy); mdothree@gmail holds some accounts.** Sites deploy on **Vercel** (Hobby cap: 100 deploys/day).
- **MDO production deploys need the Principal's go.** Stage them as one script per cycle (e.g.
  `MDO_DEPLOY_CYCLE5_2026-10-08.sh <project>`), run per project, with rollback.
- **Every Stripe link is LIVE.** Never charge, and never run tests against live keys.
- **Runwae Apparel** lives at `projects/external/runwae-apparel/` (a Butts Studios brand). The Runwae **app** is
  `projects/external/runwae/`. Don't mix them. **BlacklabB** (blacklabb.com) is MDO3/Lamar, never AHL.
