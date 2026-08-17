# MDO3D Social — Concepts and Styling

Extracted from the `MDO3D designer handoff` bundle (Claude Design export), 2026-07-12.
Working area for the social post set and the visual system. Open the `.dc.html` files
directly in a browser to preview; do not commit rendered screenshots.

## Files

**Design**
- `MDO3D Social Posts.dc.html` — the ready-to-publish post set (12 frames). **Start here.**
- `MDO3D Brand System.dc.html` — the brand and design system, source of truth for color,
  type, logo, components, and voice. Sectioned by `#color`, `#type`, `#logo`,
  `#components`, `#voice`.
- `support.js` — shared script both HTML files import (`./support.js`).
- `assets/` — the marks the HTML references: `m3-tile.png`, `m3-mono-dark.png`,
  `m3-mono-light.png`, `eye-mark.png`.

**Source material and brand**
- `MDO3D-Project-Summaries.md` — one-line summary of every tool, grouped by category,
  with a promote/teaser/hold status. Draft posts from here.
- `brand/MDO3D-Brand-Brief.md` — positioning, hero copy, categories.
- `brand/brand-assets/` — fuller logo, icon, and social-OG asset set.
- `brand/reference/` — live landing and guidance page HTML for reference.

**Future**
- `data/` — drop the editorial calendar `*.xlsx` here. The review dashboard's Social
  lane reads it and runs each post through the voice QC gate.

## Post set (12 frames, 1080×1080 unless noted)

| # | Frame | Status |
|---|-------|--------|
| 01 | Ecosystem hero | brand |
| 02 | Oracle Cards | Live |
| 03 | Resume Analyzer | Live |
| 04 | Ecosystem breadth | brand |
| 05 | Guidance suite | Live |
| 06 | Astrology teaser (Story 1080×1920) | Soon |
| 07 | Dream Interpreter | Live |
| 08 | Interview Coach | Live |
| 09 | Smart Notes | Live |
| 10 | Lead Alchemist | Live |
| 11 | Plugins & Extensions | Live |
| 12 | Feng Shui teaser | Soon |

## Status gating (from the project summaries)

Only promote what is shipped. The summaries mark each tool:

- **Live** — promote now.
- **Coming soon** — teaser and waitlist only, no capability claims as if shipped.
- **In dev** — do not announce.

Runwae (commerce) and DailyAIToll are intentionally excluded from this set.

## Design system

**Type**
- Display: DM Serif Display (headlines).
- Body: DM Sans.
- Mono: JetBrains Mono (labels, tags, wordmark).

**Palette** — a violet-anchored system built to flex across categories without reading as
either too mystical or too corporate. Violet is the spine (`#7c5ccf`, `#4c2fa0`, `#2d1b69`,
`#241d3a`); category accents include a spiritual light-violet, a professional green
(`#0d7a4e`, `#2ea86d`), and gold, crimson, and blue accents. Exact tokens and their roles
live in `MDO3D Brand System.dc.html` under `#color`; treat that file as authoritative.

**Marks** — three elements: the primary MDO3D lockup, the M3 monogram tile (carries the
brand at small sizes, app icon and favicon), and the Oracle eye, reserved for the
spiritual-guidance arm.

**Voice** — the Brand System `#voice` section defines the copy voice. Fold it into
`../comms/voice/VOICE_AND_GUIDELINES.md` when the social pipeline goes live, alongside the
mechanical QC rules already enforced.
