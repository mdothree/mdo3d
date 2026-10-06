# Rollout gap note (MDO3D)

**Written:** 2026-10-06 for gap G6 in `~/latarence/docs/ROLLOUT_LEDGER.md`. This note records a gap.
It defines no new process. Fill the gap only on owner direction.

## What exists today

- **Page-level wave table:** `MDO3D_SOCIAL_STRATEGY.md` §8 (Waves 0 to 5 for the `/company/mdo3`
  studio page: substrate, backfill, studio intro, steady rhythm, launch beats, proof, consumer channels).
- **Calendar:** `data/content-plan.md` (12 backfill drafts, all `drafted`), plus an untracked
  `data/social_media_posts.xlsx` (AHL schema header, no rows as of 2026-10-06).
- **Gate:** `review/app.py` on :8822 with `review/voice_qc.py`.
- **Loop:** `loops/social-content/` is `enabled: false` in `loops/CONTROL.md` until the calendar has rows.

## What AHL has that MDO3D lacks

AHL splits rollout into three documents under `~/ahl/distribution/`:
`docs/ROLLOUT_SEQUENCE.md` (what is announced, in what order, on which channel, and why),
`docs/ROLLOUT_PROGRAM_AND_TRACKING.md` (milestones plus output and traction tracking), and
`reports/rollout_schedule_*.md` (a dated calendar). MDO3D has only the first, in compressed form,
and only for the studio page. Missing:

1. **Milestones and tracking.** Nothing records what shipped (output) against what landed
   (traction) per wave. No equivalent of AHL's registry, and no measurement step for posts.
2. **A dated schedule.** §8 gives relative timing ("week 1", "weeks 2+"). No dated calendar file exists.
3. **Per-product channels.** §8 covers the studio page only. Products with their own pages are
   outside it. DailyAIToll has its own LinkedIn page (`projects/external/dailyaitoll/TODO.md`), and
   DailyAIToll and Runwae are excluded from the studio set "per request"
   (`README.md`, `MDO3D-Project-Summaries.md`, `loops/social-content/loop.md`). No doc says
   where, or whether, their social content is sequenced.
4. **Cross-entity intake.** No rule for content that arrives from another entity's play (for
   example the latarence ledger's P1 re-cut for DailyAIToll). AHL's rule for this is
   `~/ahl/distribution/docs/CONTENT_PORTFOLIO_AND_PIPELINE.md` §6.

## Candidate location

`~/mdo3d/social/ROLLOUT_PROGRAM.md`, sitting beside `MDO3D_SOCIAL_STRATEGY.md`. §8 stays as the
sequence. The new doc would hold milestones, tracking, the per-product channel decision
(items 3 and 4), and a pointer to dated schedules under `social/reports/`. Owner: the MDO3D
Chief of Staff seat (`Organization/Chief-of-Staff/`), once stood up.

## Decision needed before drafting

Whether DailyAIToll content may enter any MDO3D calendar, and if so whose page carries it
(the studio page, or DailyAIToll's own page). Until that is decided, P1's DailyAIToll re-cut stays held.
