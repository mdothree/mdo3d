# MDO cycle 8: P2/P3 on runwae + layoffleads, and the PERF-001 TBT follow-up (2026-10-12)

**Lane:** MDO pane %24.
**Scope:** dev-owned P2/P3 rows in `grok/FLEET_FIX_QUEUE.md` for runwae.com and layoffleads.com that were not already covered by `MDO_CYCLE8_QW26`, `MDO_CYCLE8_P1B` or `MDO_CYCLE8_P1_FIXES`. Also the PERF-001 follow-up: welcome TBT went from 368ms to 952ms after the P1b defer work.
**Evidence/specs used:** `hq_intake/LBL_MDO_CYCLE8.md`, plus `CYCLE6_A11Y`, `CYCLE6_DEVICE_MATRIX §F`, `CYCLE6_SEO_SHARE`, `CYCLE6_PUBLIC_SURFACE`, `CYCLE6_PERF`, `CYCLE7_CLASS_SWEEP` and `CYCLE9_HIDDEN_SURFACES`.

**Rules followed:**
- **runwae:** committed on `master` and pushed. It was **not deployed**, because it needs the Principal's GO. Deploy verify lines were added to `g_runwae` in `MDO_DEPLOY_CYCLE5_2026-10-08.sh`, and `bash -n` passes.
- **layoffleads:** auto-deploys on push, so these were low-risk UI and SEO changes only. Each one was verified live in a browser after the push.
- No keys were touched, no Stripe calls were made, and no "free" wording was added.
- All browser, axe and Lighthouse work ran on xps:
  - runwae: `~/mdo-qa/c8p23rw/`, scripts `c8p23rw_audit.mjs`, `_cc.mjs`, `_boxes.mjs`, `_shots.mjs`, `lh.mjs` and `lh2.mjs`
  - layoffleads: `~/mdo-qa/c8p23ll/`, script `c8p23ll_audit.mjs`

## Results

| HQ row | Surface | State | sha | Verify |
|---|---|---|---|---|
| **PERF-001 TBT follow-up** (#93) | runwae /welcome | pushed, needs deploy | runwae `fd07868` | See the PERF section below. TBT median fell from 2322 to 1004ms and main-thread work from 21.2 to 6.5s. LCP is unchanged. |
| SURF-003 (#112) | runwae | pushed, needs deploy | `fd07868` | `lottie-player@latest` is now pinned to `@2.0.12` and loaded with SRI. ScrollMagic and crypto-js have SRI. The ionicons runtime is no longer loaded on /welcome. GTM, AdSense, ManyChat and Typekit are dynamic tags that cannot carry SRI, so keeping them is a decision. |
| A11Y-003 (#103) runwae part | runwae | pushed, needs deploy | `fd07868` | Brand purple `#9389ff` is now `#6259e8`: white on it goes from 2.9:1 to 5.1:1. Grey `#888da8` is now `#676c88` (5.2:1). The change covers main.css, theme.css and Bootstrap css. Open mobile-menu text is white. axe color-contrast is **0** on welcome, login, faqs, privacy, terms, blog and a post (before: 13 / 11 / 35 / 78 / 96 / 76 / 23). |
| A11Y-004 (#138) runwae part | runwae | pushed, needs deploy | `fd07868` | `<main>` and `role=contentinfo` added to welcome, login, faqs, privacy, terms, blog and all 23 posts. axe `region` and `landmark-one-main` are 0 (welcome had region:29–33). |
| A11Y-015 (#143) runwae part | runwae | pushed, needs deploy | `fd07868` | A skip link to `#main-content` on the same 30 pages. It is hidden with clip-path, not `left:-9999px`, so it adds no RTL scroll area. |
| A11Y-005 (#104) runwae part | runwae | pushed, needs deploy | `fd07868` | Welcome outline is now h1 → h2 sections → h3 items. Taglines use `role=none` and section titles use `aria-level`, so computed styles are unchanged. Footer and legal headings are level 2. axe heading-order is 0 on welcome, privacy, terms and blog. |
| A11Y-007 (#106) | runwae | pushed, needs deploy | `fd07868` | The 4 social links have an `aria-label` on every page. The close-menu control is a `<button>`, and the menu toggle has `aria-expanded`, kept in sync and checked live in the DOM. axe link-name is 0. |
| A11Y-014 (#107) runwae part | runwae | pushed, needs deploy | `fd07868` | A `:focus-visible` ring (3px). An xps Tab walk found 0 focusable controls without a visible focus on welcome and login (before: 15–18). |
| A11Y-009 (#139) runwae part | runwae | pushed, needs deploy | `fd07868` | Links inside running text are underlined. link-in-text-block is 0 on login and terms. |
| A11Y-012 (#161) + IMG-RUNWAE-LOGO-ALT-LAZY (#125) | runwae | pushed, needs deploy | `fd07868` (+`1243764` header not lazy) | The logo has `alt=""` beside the "Runwae" wordmark, and the "Olympus" alt is gone. It uses 68px files (`img/logo-colored-68.png`, `img/logo-68.png`) shown at 34px; the old files were 526px. App-page sidebar logos are image-only links, so they keep `alt="Runwae"`. |
| MOBILE-GENERAL-TEXT-SIZE (#121) runwae part | runwae /welcome | pushed, needs deploy | `fd07868` | At 375px, text nodes under 12px went from 28 to **0**. |
| A11Y-013 (#142) runwae part | runwae | pushed, needs deploy | `fd07868` | Footer social icons now have 44×44 tap areas (were 13–17px). The footer is about 25px taller; nothing else moves. |
| C7-011 (#72) runwae part | runwae /login | pushed, needs deploy | `fd07868` | Fields get `label for`, `name`, `autocomplete` (name, username, email, new-password, current-password), `aria-required` and `minlength=6` on the sign-up password. Error lines use `role=alert` at 5:1 (were salmon, 2.3:1). axe label is 0 (before: 4). |
| C7-014 (#75) | runwae /css/main.css | pushed, needs deploy | `fd07868` | 33 `url()` references to images that are not in the repo are now `none`. Rendering is identical, because those images 404 today. This includes `landing-bg.jpg`, which `/welcome` requested. |
| SEO-007 (#167) runwae part | runwae | pushed, needs deploy | `fd07868` | `404.html` is a branded noindex page with links to home, blog and FAQs. The status stays 404, and axe is clean on it. |
| C7-004 (#62) | runwae blog ×3 | **already fixed at HEAD**, needs deploy | `ef49ef8` | All 23 posts, blog, faqs and the legal pages have `og:image` = `/og-image.png` (1200×630, file present). |
| IMG-RUNWAE-OG-NO-BRAND (#102) | runwae | already at HEAD, needs deploy | `ef49ef8` | `/og-image.png` is 1200×630 with the Runwae mark, wordmark and tagline. Viewed. |
| IMG-RUNWAE-NO-TWITTER-IMAGE (#123) | runwae | already at HEAD, needs deploy | `ef49ef8` | Has `twitter:card` = summary_large_image, plus `twitter:image` and its alt text. |
| IMG-RUNWAE-APPLE-150 (#124) | runwae | already at HEAD, needs deploy | `ef49ef8` | `<link rel=apple-touch-icon>` points to `/apple-touch-icon.png`, which is 180×180. The remaining 150px links are `apple-touch-startup-image`. |
| SEO-008 (#127) | runwae / layoffleads | runwae at HEAD (needs deploy); layoffleads **LIVE** | runwae `ef49ef8` · layoffleads `b81e505` | runwae has og:image:alt, og:site_name, apple-touch, manifest and JSON-LD. layoffleads gains og:image:alt and twitter:image:alt. |
| SEO-010 (#129) runwae part | runwae | needs deploy | `1243764` | `/` now redirects with a single 301 to `/welcome`. |
| SEO-006 (#111) layoffleads part | layoffleads | **LIVE** | layoffleads `b81e505` | Home title went from 70 to **56** characters and the description from 199 to **139**. The "Free preview" sentence was dropped, not reworded. Every generated `<title>` is now ≤60 on all but 1 of 3,062 indexable pages; that one keeps its full title so `check.mjs`'s unique-title rule holds. Every meta description is ≤160 (was 1,468 / 2,035 over the limits). og and twitter keep the full text. The runwae title rides on `ef49ef8`. |
| A11Y-005 (#104) layoffleads part | layoffleads | **LIVE** | `b81e505` | Footer column headings changed from h4 to h2 (same look). axe heading-order is 0 live. |
| TABLET-LAYOFFLEADS-TAPTARGETS (#160) + A11Y-013 layoffleads | layoffleads | **LIVE** | `b81e505` | Controls under 24px dropped to **0** on phone, iPad, iPad landscape and desktop. On touch screens, links, inputs, selects, buttons and the brand link are 44px tall, and the checkbox is 24px with a full-height label. Controls under 44px on iPad (home) went from 183 to 34; all 34 are 44px tall but narrow (state codes) or inline text links. |
| HID-013 (layoffleads part) | layoffleads | **LIVE** | `b81e505` | `.skip` uses clip-path instead of `left:-999px`, so there is no 2,279px RTL scroll area. |
| SEO-009 (#128) layoffleads part | layoffleads | no change needed | — | The sitemap lists every indexable page (now 3,062) with real per-page `lastmod`. |
| SURF-007 (#130) | runwae | partial | `fd07868` | /welcome no longer loads moment, fullcalendar, Chart.js, daterangepicker, selectize, swiper, isotope or the media players. Upgrading jQuery 3.2.1 and Bootstrap 4.0.0 is still open, because it needs an app regression pass across 10 app pages. |

**Live verify for layoffleads:** b81e505 was live about 40s after the push.
- The live Playwright filter QA (`c8ll_qa.mjs https://layoffleads.com`) **passes**.
- axe shows **0 violations** on `/` and `/state/ohio` at phone, iPad and desktop.
- 0 controls are under 24px.
- Title is 56 and description 139 characters; og:image:alt is present and there are 4 footer h2s.
- `node scripts/check.mjs` passes on the build.

## PERF-001 follow-up: welcome TBT

**Diagnosis.** On the `1243764` build, Lighthouse bootup-time put `lottie-player@latest` at **7.35s total and 4.25s scripting**. Ten autoplay, looping Lottie animations started at load, which also caused about 3.2s of style and layout work. Next came jQuery plus about 30 plugins that welcome never uses (base-init.js calls several without guards), the ionicons runtime (a 463ms long task), and the third-party tags: AdSense about 0.7s, gtag about 0.65s, ManyChat.

**What changed** (`fd07868`, /welcome only; app pages keep base-init.js):
1. **Lottie**
   - The player script is pinned to 2.0.12 with SRI.
   - It loads only after `load` + `requestIdleCallback`.
   - Each animation loads when it comes within 200px of the viewport, using `data-src` and an IntersectionObserver. Already-upgraded players are loaded explicitly, because 2.0.12 ignores a later `src` change.
   - Animations pause when off screen and stay still for `prefers-reduced-motion`.
   - `lottie-player{display:block}` reserves their boxes, so matchHeight and layout are unchanged (section heights verified identical).
2. **Scripts:** `js/welcome-init.js` replaces `base-init.js`. It keeps Headroom, the mobile menu, perfect-scrollbar and Material floating labels.
   - welcome now loads jQuery, perfect-scrollbar, matchHeight, Headroom, material, the Bootstrap bundle and welcome-init.
   - Dropped: about 30 plugins, the duplicate local ScrollMagic, svg-loader (56KB) and firebase-storage (unused).
   - Kept: Firebase app, auth, database and analytics, crypto-js, and the runwaejs scripts.
3. **Icons:** the 8 Ionicons are inlined as SVG from the repo's `/icons` set, so the ionicons runtime is not loaded. Icon boxes match within 1px.
4. **Not touched:** AdSense, GA/gtag (via Firebase Analytics `measurementId`), ManyChat and Typekit. These are decisions (listed below).

**Lighthouse** (xps, mobile, local dist, `lh2.mjs`; base = `1243764`, new = `fd07868`). The box was noisy, so the base and new runs were **interleaved ×6** and medians are shown:

| | TBT median (runs) | main-thread work | JS scripting | perf | requests | KB |
|---|---|---|---|---|---|---|
| base, all third parties | **2322ms** (1229/2322/4280/2493/1014/1353) | 21.2s | 7.6s | 37 | 128–132 | 1582–1588 |
| new, all third parties | **1004ms** (1004/1117/3625/955/914/924) | **6.5s** | **2.3s** | 43 | 68 | 1157 |
| base, ad/analytics/chat blocked | 1233ms | 14.1s | 5.2s | 46 | — | — |
| new, ad/analytics/chat blocked | **659ms** | 5.2s | 1.35s | 60 | — | — |

- **Quieter-box runs** (5 each, same build): new TBT median 826ms vs base 1325ms. With third parties blocked: **220ms vs 676ms**, perf **90 vs 57**.
- **LCP** is the `h1.welcomeTitle` text, which stays about 2.2–2.6s on a quiet box. That keeps the P1b LCP win: no blocking resources were added, and render-blocking stays at 9.
- **Speed index** is about 0.3–0.5s later, because the hero animation now paints after idle.
- **What is left of TBT is third-party:** AdSense, gtag and ManyChat, which are decision rows.
- **a11y** Lighthouse score: 91 → **100**.

## Decision rows: not done, listed for the Principal

- **AdSense** (`adsbygoogle.js` + `show_ads_impl`, about 0.7s of main thread) and **GA4/gtag** via Firebase Analytics `measurementId` (about 0.65s). Removing them or loading them after consent or idle is now the biggest remaining TBT lever. This also ties into **SURF-008 / HID-007**: cookies are set before any consent, and there is no banner.
- **ManyChat** widget (`widget.manychat.com`, `mccdn.me`).
- **Typekit** (PERF-010 runwae part): an extra font family next to Roboto.
- **C7-007** runwae Facebook link: the handle `facebook.com/runwaeplatform` is unverified. The link was left as it is.
- **CONTENT-STALE-YEAR-2025**, runwae part: the legal "Last updated August 1st, 2019" should change only with a legal review. Copy and jurisdiction belong to the Principal, and so does **LEGAL-REAL-PAGES-NO-GOVERNING-LAW**.
- **CONTENT-LEGAL-DRAFT-LABEL** (layoffleads "Plain-language draft.") and **CONTENT-LAYOFFLEADS-STATES** (40-jurisdiction filter vs "state WARN notices"): copy and legal, S4/S13.
- **C7-021**: layoffleads `/success` and `/cancel`. The Stripe return URLs must be read in Stripe (S6). `/thanks` is already live.
- **Brand colour:** A11Y-003 darkened the runwae purple across the site. If the Principal wants the lighter purple kept for decoration only, that is a follow-up.

## Still open / notes

- **runwae /faqs:** `nested-interactive` (27 accordion headers wrap links), `aria-required-children` (#accordion) and heading-order (10) are still open. Fixing them needs the accordion rebuilt; this pass did not touch that markup.
- **runwae legal and blog pages:** these still have text under 12px at 375px. The MOBILE-GENERAL-TEXT-SIZE count was for /welcome only.
- **runwae app pages** (explore, account and so on): only the global CSS changed (colours, focus ring), plus social labels and the Olympus alt. The xps check shows no new page errors; `/account` gives "Failed to fetch" in both builds, which is Firebase over the network.
- **Primary runwae checkout:** commits were made in a detached worktree. Afterwards the primary was moved to `fd07868` with `reset --mixed` (the cached diff was empty). Then `checkout fd07868 -- <changed paths>` ran, excluding `Bootstrap/`. The unrelated WIP (deleted `Bootstrap/dist/*`, `.gitignore`) was left alone. `deploy()` uses `git archive HEAD`, so the Bootstrap css colour change ships.
- **Deploy script** `g_runwae` now has 22 new checks for fd07868 (16 lines, one of them a loop over 7 pages).
  - They were tested on xps against a local server: all **PASS** on the new dist, and **FAIL** on the 1243764 dist (except the 404-status line, which is 404 in both).
  - The old "≥45 deferred scripts" check now expects ≥15, because fd07868 has 19.
  - `bash -n` passes.
