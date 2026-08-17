# MDO3D — Designer Handoff Brief

**Prepared:** 2026-07-12
**Contact:** buttsstudios@gmail.com
**Live site:** https://mdo3d.com

---

## 1. What MDO3D Is

MDO3D is an **AI platform ecosystem** — a family of AI-powered tools spanning
spiritual guidance, professional development, productivity utilities, and
commerce. Each platform is built as a standalone product but shares one brand
identity.

**One-line description:**
> MDO3D builds AI-powered platforms across spiritual guidance, professional
> development, productivity, and commerce.

**Hero headline (current):**
> One ecosystem. *Many dimensions* of intelligence.

**Hero subhead (current):**
> MDO3D builds AI-powered tools across spiritual guidance, professional
> development, productivity utilities, and commerce — each platform engineered
> with precision and purpose.

---

## 2. Product Categories

The ecosystem is organized into these buckets. A designer should assume the
brand needs to flex across all of them without feeling either too "mystical" or
too "corporate":

| Category | Examples |
|---|---|
| **Spiritual Guidance** | Tarot, Oracle, Dream Interpreter, I Ching, Runes, Astrology, Numerology, Feng Shui, Past Life |
| **Professional & Career** | Resume Analyzer, Career Horoscope |
| **Utilities & Productivity** | Baby Name Oracle, misc tools |
| **Lead Generation** | leads.mdo3d.com |
| **Commerce** | Stripe-powered checkout across tools |
| **Plugins & Extensions** | WordPress divination blocks |

Each tool lives on its own subdomain (e.g. `tarot.mdo3d.com`,
`guidance.mdo3d.com`, `leads.mdo3d.com`).

---

## 3. Current Brand System (extracted from the live site)

This is the *existing* identity as implemented. Treat it as the starting point
to refine, not a hard constraint — but keep the ecosystem coherent.

### Color palette

**Light mode**
| Token | Hex | Use |
|---|---|---|
| Accent (primary) | `#4c2fa0` | Deep violet — primary brand color |
| Accent mid | `#7c5ccf` | Lighter violet — highlights, links, buttons |
| Accent soft | `#ede8ff` | Pale violet — backgrounds, chips |
| Ink | `#0a0a0f` | Near-black text |
| Ink 20 | `#9090a8` | Muted text |
| White | `#ffffff` | Page background |
| Favicon mark | `#2d1b69` | Rounded-square "M3" logo bg |

**Dark mode**
| Token | Hex |
|---|---|
| Accent | `#7c5ccf` |
| Accent mid | `#a78bfa` |
| Ink (text) | `#f8f8fc` |
| Background | `#131320` |

The brand is **violet/purple forward** with high-contrast near-black/off-white
neutrals. It supports both light and dark themes (theme toggle is live).

### Typography

| Role | Typeface | Notes |
|---|---|---|
| Display / headings | **DM Serif Display** | Elegant serif, used with italics for emphasis |
| Body / UI | **DM Sans** | Weights 300–600 |
| Mono / accents | **JetBrains Mono** | Labels, eyebrows, code-like details |

All three are free Google Fonts.

### Logo / mark

- Current mark is a simple **"M3"** in a rounded square (`#2d1b69` bg, white text).
- PNG logos are in `brand-assets/logos/` (`mdo3d.png`, `mdothree.png`, plus
  two additional `logo1/logo2` variants).
- **Note:** current logos are raster PNG only. A key ask for the designer is a
  proper **scalable (SVG/vector) logo system** and a favicon/app-icon set.

---

## 4. Tone & Positioning

- **Precision + purpose.** Copy leans on "engineered with precision," "many
  dimensions of intelligence." Technical credibility meets approachable AI.
- Should feel **modern, premium, and trustworthy** — not gimmicky, despite the
  spiritual/divination content. The professional and commerce arms need to sit
  comfortably next to the spiritual arm.
- Violet = the connective tissue that lets very different products read as one
  family.

---

## 5. What's In This Folder

```
MDO3D-Designer-Handoff/
├── MDO3D-Brand-Brief.md          ← this document
├── brand-assets/
│   ├── logos/                    PNG logos (mdo3d, mdothree, logo1, logo2)
│   ├── icons/                    favicon.ico, apple-touch-icon.png
│   └── social-og/                Open Graph share images (SVG + JPG)
└── reference/
    ├── live-landing-page.html    current mdo3d.com homepage (full source)
    └── live-guidance-page.html   current guidance subdomain page
```

Open the two files in `reference/` in a browser to see the current design system
live (colors, type, layout, dark mode, animations).

---

## 6. Suggested Scope for the Designer

Not prescriptive — a starting list:

1. **Logo system** — vector primary logo + monogram ("M3") + clear-space rules.
2. **Favicon / app icon set** — replace the inline SVG placeholder.
3. **Refined color palette** — formalize light/dark tokens, add semantic states.
4. **Type scale** — lock in the DM Serif / DM Sans / JetBrains Mono hierarchy.
5. **Component styling** — buttons, cards, tables, status chips (the site is a
   directory of tools, so cards/tables matter).
6. **Per-tool accent system** — optional sub-brand accents while keeping violet
   as the anchor.
7. **Social / OG templates** — see current versions in `social-og/`.

---

*Questions: buttsstudios@gmail.com*
