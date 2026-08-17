# MDO3D Social

Social content and the visual system for the MDO3D portfolio. The designer handoff bundle
landed here 2026-07-12; see `CONCEPTS.md` for the full breakdown.

## What's here

- `MDO3D Social Posts.dc.html` — the ready-to-publish post set (12 frames).
- `MDO3D Brand System.dc.html` — the design system (color, type, logo, components, voice).
- `support.js`, `assets/` — imports the two HTML files depend on (keep them alongside).
- `MDO3D-Project-Summaries.md` — source material for drafting, with per-tool promote status.
- `brand/` — brand brief, fuller asset set, and live-page reference from the handoff.
- `CONCEPTS.md` — design tokens, the post set, and status-gating rules.

## Editorial calendar (future)

- `data/` — drop the calendar as `*.xlsx`. The review dashboard's Social lane reads every
  `.xlsx` here and scans each post through the voice QC gate (`review/voice_qc.py`).
  Expected columns (same convention as Ridgefield):
  `Date · Brand · Platform · Category · Service/Product Line · Topic · Source Type ·
  Post Type · Hook · Core Insight · Post · CTA · Status · LinkedIn URL · Notes`.
  Rows with Status `Drafted` / `Needs review` show as pending.

## Rules

Only promote Live tools; Coming-soon tools get teaser/waitlist copy only; in-dev tools are
not announced. Runwae and DailyAIToll are excluded from this set. The copy voice guide is
`../comms/voice/VOICE_AND_GUIDELINES.md`; the Brand System's `#voice` section folds into it
when the pipeline goes live.
