# MDO3D fleet fix queue

**Owner:** queue keeper (Hunt ops). One queue, deduped, high-confidence only. Builders (Claude side) drain it by ID.
**Re-seeded 2026-10-08** from HQ cycle-5 `FLEET_FIX_QUEUE_DRAFT.md` (HQ IDs verbatim, no remints). Dispatch: `~/latarence/coordination/dispatch/2026-10-08_MDO3D_hq_cycle5_fix_queue.md`; triage: `~/latarence/coordination/hq_intake/TRIAGE_MDO_CYCLE5_2026-10-08.md`; evidence: `~/Downloads/MDO dev handoff.md`.
**Rules:** No live Stripe charges. Deploy only from clean pushes. Vercel Hobby cap 100/day. Do not recast a P0 because a builder said fixed — HQ re-verifies the loop.
**Runwae repo:** `~/mdo3d/projects/external/runwae/runwae` (the old `~/buttsstudios/clients/runwae_template` path is stale).

**Counts:** P0 4 · P1 10 · P2 15 · P3 21 = **50 open** (+ legacy rows below).

| # | ID | Sev | Status | Owner | Surface | Blocker / next step |
|---|---|---|---|---|---|---|
| 1 | RIGOR-PAY-BEFORE-API | **P0** | FIXED-LOCAL (push+deploy BLOCKED: creds); op pause pending | op → dev | rigor resume/interview/networking/salary → LIVE $9.99/mo | Pause the link/product in Stripe now; gate Upgrade on API health |
| 2 | RUNWAE-ERROR-LOG-PUBLIC | **P0** | PUSHED 24b9ed6 (deploy BLOCKED: Vercel token) | op | runwae.com/error_log, /database-debug.log | CF WAF (token needs WAF scope) or runwae deploy `fdad811` |
| 3 | RONNA-ENV-SYNTAX | **P0** | FIXED-LOCAL (push+deploy BLOCKED: creds) | dev | js/config/env.js L8 on 5 ronna subdomains | One-line fix; redeploy 5 projects |
| 4 | RIGOR-API-525 | **P0** | NEW (supersedes RIGOR-API-ENV) | op | api.rigor.design | CF SSL mode/origin cert + Vercel env + domain → `rigor` |
| 5 | RUNWAE-PUBLIC-CONFIG-FILES | P1 | PUSHED 24b9ed6 (deploy BLOCKED: Vercel token) | op | runwae firebase.json, database.rules.json, vercel.json, inject-config.js, README.md, js/config.js | Same deploy/WAF as #2; `.vercelignore` |
| 6 | STRIPE-CHECKOUT-BUSINESS-NAME | P1 | CARRIED C4 (widened) | op | layoffleads, prompts, rigor, names | Stripe public details per account |
| 7 | RONNA-SUBDOMAIN-CONFIG | P1 | NEW | op | 5 ronna subs `__FIREBASE_*__` / `__STRIPE_*__` | Principal: Firebase project + Stripe keys |
| 8 | MDOTHREE-STRIPE-INJECT | P1 | CARRIED (was MDOTHREE-FIREBASE-INJECT) | op | modern-4 pk/portal REPLACE; json/text/pdf/image/qr env empty | Stripe pk + portal + `__ENV__` |
| 9 | MDOTHREE-PRO-FIREBASE-REPLACE | P1 | NEW | op | mdothree.com/pro | Firebase web config + portal URL |
| 10 | RONNA-LANDING-DEAD-CTAS | P1 | NEW | dev | ronnascanner.com `#` CTAs | Needs pricing/waitlist targets |
| 11 | RONNA-COPY-HONESTY | P1 | NEW | op → dev | ronnascanner.com stats claims | Principal copy decision |
| 12 | RIGOR-SUCCESS-CANCEL-404 | P1 | CARRIED C4 | dev | 7 rigor tools + landing | Queued deploy (cap) |
| 13 | LEGAL-SUBSITES-MISSING | P1 | NEW (class) | op → dev | 35/40 hosts | **BLOCKED:** governing jurisdiction |
| 14 | GUIDANCE-PROJECT-SPLIT | P1 | CARRIED C4 | op | guidance.mdo3d.com | **BLOCKED:** which-copy decision → redeploy |
| 15 | RUNWAE-PINCH-ZOOM-BLOCKED | P2 | PUSHED 9caeba2 (awaits deploy) | op | runwae /welcome | runwae deploy `9caeba2` |
| 16 | RUNWAE-SEO-NOT-LIVE | P2 | PUSHED ef49ef8 (awaits deploy) | op | runwae meta/sitemap | runwae deploy `ef49ef8` |
| 17 | RIGOR-STRIPE-ELEMENTS-PLACEHOLDER | P2 | NEW | op + dev | 7 rigor tools | Elements pk; pay link for cover/linkedin/portfolio |
| 18 | GUIDANCE-NO-OG-IMAGE | P2 | NEW | dev | guidance | Rides on #14 |
| 19 | GUIDANCE-MOBILE-OVERFLOW | P2 | NEW | dev | guidance @375 | Rides on #14 |
| 20 | GUIDANCE-MOBILE-CTA-OVERLAP | P2 | NEW | dev | guidance CTA section | Rides on #14 |
| 21 | HASH-MOBILE-NAV-OVERFLOW | P2 | NEW | dev | hash.mdothree.com | Add `overflow-x:auto` like siblings |
| 22 | RONNA-MOBILE-NAV-HIDDEN | P2 | NEW | dev | ronnascanner.com @375 | Add a mobile menu |
| 23 | RONNA-SIGNIN-LATARENCE | P2 | NEW | op | ronnascanner.com Sign In | Principal: intended? |
| 24 | RONNA-SUB-SIGNIN-DEAD | P2 | NEW | dev | 5 ronna subs | After #7 |
| 25 | RIGOR-HEADER-SIGNIN-DEAD | P2 | NEW | dev | 7 rigor tools | Wire to the existing auth modal |
| 26 | TAROT-PAID-SPREAD-DEMO | P2 | CARRIED C4 note | dev + op | tarot paid spreads | Pricing decision; TEST key |
| 27 | NUMEROLOGY-NO-RECALC | P2 | CARRIED C4 note | dev | numerology | — |
| 28 | HEADERS-CSP | P2 | CARRIED C2 | dev | all but layoffleads | vercel.json + deploy |
| 29 | BLACKLAB-DOOR | P2 | CARRIED C2 | op | blacklabb.com | Bubble domain/DNS |
| 30 | RUNWAE-UI | P3 | CARRIED 10-04 | op | runwae nav/FAQ/typos | runwae deploy |
| 31 | RUNWAE-ASSETS | P3 | CARRIED 10-04 | op | webfontloader 404 | runwae deploy |
| 32 | RUNWAE-DEAD-HEADER-LINKS | P3 | NEW | dev | runwae 11 `#` + Download | — |
| 33 | RUNWAE-STATS-NOT-VISIBLE | P3 | PUSHED 9caeba2 (awaits deploy) | op | runwae /welcome | runwae deploy |
| 34 | MDOTHREE-STRAY-FAVICON | P3 | CARRIED C4 | dev | json L34, pdf L44 | — |
| 35 | MDOTHREE-SIGNED-IN-BADGE | P3 | NEW | dev | hash/color/password | — |
| 36 | JSON-BEAUTIFY-EMPTY-SILENT | P3 | NEW | dev | json /format | — |
| 37 | IMAGE-CROP-NOSELECT-NAN | P3 | NEW | dev | image /crop | — |
| 38 | JSON-FIREBASE-IMPORT | P3 | CARRIED C4 | dev | json, text | — |
| 39 | RIGOR-EMPTY-INPUT-VALIDATION | P3 | NEW | dev | resume/salary/portfolio | — |
| 40 | SOFT-200-EMPTY | P3 | NEW | dev | 7 rigor + 5 ronna | Real 404 routing |
| 41 | FENGSHUI-A11Y-LABELS | P3 | CARRIED C4 | dev | fengshui | — |
| 42 | PASTLIFE-INTEREST-IGNORED | P3 | CARRIED C4 | dev | pastlife | — |
| 43 | ICHING-COPY-GLITCH | P3 | NEW | dev | iching copy | — |
| 44 | MDO3D-HERO-CARDS | P3 | NEW | dev | mdo3d.com hero | — |
| 45 | MDO3D-FOOTER-GITHUB-404 | P3 | CARRIED C3 | dev | mdo3d.com footer | — |
| 46 | LEGAL-DATE-2025 | P3 | CARRIED C3 | dev | mdo3d + mdothree legal | Confirm year |
| 47 | DAILYAITOLL-FAVICON-404 | P3 | CARRIED C3 | dev | dailyaitoll | + sitemap 404 |
| 48 | RONNA-MOBILE-CARD-OVERFLOW | P3 | NEW | dev | ronnascanner.com | — |
| 49 | LAYOFFLEADS-MOBILE-TABLE | P3 | NEW | dev | layoffleads results | — |
| 50 | PASTLIVES-SLUG | P3 | CARRIED 10-04 | op | NXDOMAIN slugs | Docs/DNS |

## Legacy rows (2026-09-01) → mapped to cycle 5

| Old ID | Maps to | Note |
|---|---|---|
| MDO-001 | post-pay delivery class (STRIPE-CHECKOUT-*, TAROT-PAID-SPREAD-DEMO; names delivery unproven) | Premium delivery unproven fleet-wide; needs Stripe TEST keys (Principal batch) |
| MDO-002 | leads.mdo3d.com 530 (Principal batch) | Was 502; now 530 |
| MDO-003 | token rotation (Principal batch) | Unchanged |
| MDO-004 | runwae RTDB rules | Rules committed + pushed (738ba95, 8aa6c3e). **Rules deploy NOT done:** lane guardrail "do NOT write runwae Firebase", plus HQ order is code first → needs operator go-ahead |
| MDO-005 | fengshui/pastlives nested remotes | Not in HQ's 50; still open |

**Held for Principal (dev will not guess):** RONNA-COPY-HONESTY, RONNA-SIGNIN-LATARENCE, RONNA-LANDING-DEAD-CTAS (targets), TAROT-PAID-SPREAD-DEMO, GUIDANCE-PROJECT-SPLIT, LEGAL-SUBSITES-MISSING, LEGAL-DATE-2025, MDO3D-FOOTER-GITHUB-404 (org).

## Dev log (SHA + deploy per ID)

### 2026-10-08 — Builder·MDO3D
- **RONNA-ENV-SYNTAX** — env.js L8 → `const meta = (import.meta && import.meta.env) || {};` committed in all 5: companies `774120d`, contacts `c2d534f`, emails `8aa0fbe`, leads `7465d67`, prospects `fa74c93`. **Not pushed or deployed.** The remote tokens are dead (`Invalid username or token`; leads uses the bare-token form, which prompts), and `gh` (buttstech) has pull-only access on mdothree. No Vercel CLI creds on this host. Live md5 is still `2f8cc1e5…` on all 5. Note: pushing also ships each repo's queued "Coming Soon banner" commit (4 of 5 repos are 1 ahead).
- **RUNWAE-ERROR-LOG-PUBLIC + RUNWAE-PUBLIC-CONFIG-FILES** — `24b9ed6` (pushed to origin/master along with the 6 queued commits 293d46d…9caeba2). `.vercelignore` now adds firebase.json, database.rules.json, README.md, STATUS.md and marketerLedger.txt. A new post-build `deployment/prune-public.js` (chained after inject-config.js in buildCommand) removes vercel.json, deployment/ and the logs from the `.` output. **Deviation:** `js/config.js` is kept, because account.html loads it for the public Mapbox `pk.` token; the fix is a Mapbox URL restriction (Principal batch). Also found publicly served: `ui-debug.log` (handled by `*.log`), `marketerLedger.txt`, `STATUS.md` (both now ignored), and `email.php` (PHP source served as text; no secrets). **Not deployed:** the push did not auto-deploy (polled 4 min), so it needs `vercel deploy --prod` with a valid VERCEL_TOKEN. Verify after deploy: /error_log, /database-debug.log and the 5 config paths → 404.
- **RIGOR-PAY-BEFORE-API** — the Upgrade `href` to `buy.stripe.com/…8k804` is replaced with `#` + the in-app pricing modal (API-gated embedded checkout, which can't charge while api.rigor.design returns 525). resume `dc0916e` (also binds the CTA button), interview `be7af5d`, networking `c881993`, salary `cf200d5`. **Not pushed or deployed** (same dead remote token). `grep -c 8k804` on local HTML = 0; live is still 1–2 per site until deployed.
- **RIGOR-API-525** — operator work; api.rigor.design/health → 525 at 2026-10-08.

## Verified-closed (keep for sibling context)

- Cycle 5 closed (per HQ): MDOTHREE-COLOR-INVALID-SILENT, MDOTHREE-COLOR-STALE, password meter, iching Cast, fengshui sleep tip, CONFIG NOT SET banner, OG sweep, sitemaps, names "no checkout" (corrected), oracle automation flake, text /word-count.
- 2026-08-17: retired model id (`claude-3-5-sonnet-20241022`) → 500s on premium, all 9 divination services. Class: env. Fixed fleet-wide.
- 2026-08-17: client-side-only premium enforcement (curl got paid readings free). Class: ACL. Server-side Stripe-session verification now on every generate endpoint + use-cap 3.
- 2026-08-17: oracle/tarot/dreams/numerology charging without delivering. Class: payment-delivery. All 9 now deliver; smoke-tested; bypass 402s.

## Cycle 5

Cluster status lines (append-only; one line per item: `ID · state · sha · cluster`).

