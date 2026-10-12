# MDO3D fleet fix queue

**Owner:** queue keeper (Hunt ops). One queue, deduped, high-confidence only. Builders (Claude side) drain it by ID.
**Re-seeded 2026-10-11 (cycle 8)** from MDO HQ cycle-8 `FLEET_FIX_QUEUE_DRAFT.md` (2026-10-09 ~20:30 ET; 171 open; HQ IDs and HQ order VERBATIM, no remints). Source: `~/Downloads/MDO_CYCLE8_EVIDENCE_2026-10-09/FLEET_FIX_QUEUE_DRAFT.md` (+ `MDO dev handoff.md` §1A.4/§11A, `CYCLE8_FRICTION_INERTIA_2026-10-09.md`). Intake reads: `~/latarence/coordination/hq_intake/LBL_MDO_CYCLE8.md`, `LBL_DROP1011_A.md`, `LBL_DROP1011_B.md` §2c, `ASSURANCE.md` "MDO — cycle 8 … NEW vs this tracker". Dispatch/lane log: `~/latarence/coordination/dispatch/2026-10-08_MDO3D_hq_cycle5_fix_queue.md`. Triage: `documentation/MDO_CYCLE8_TRIAGE_2026-10-11.md`.
**Previous seed:** cycle 5 (50 IDs, 2ec1941/229c5b2). Every cycle-5 lane state/SHA is mapped into the `state` / `sha/evidence` columns below; the cycle-5 status lines are kept verbatim under "Cycle 5" (append-only history).
**Rules:** No live Stripe charges. Never touch keys. Deploy only from clean pushes, and MDO prod deploys need the Principal's GO (`bash ~/mdo3d/MDO_DEPLOY_CYCLE5_2026-10-08.sh <group>`; rollback lines → `MDO_ROLLBACK_CYCLE5.sh`). Vercel Hobby cap 100/day. Don't recast a P0 because a builder said fixed: HQ re-verifies (done = live URL + browser proof).
**Runwae repo:** `~/mdo3d/projects/external/runwae/runwae`.

**Counts (HQ):** P0 5 · P1 23 · P2 65 · P3 78 = **171 open** (HQ: OPEN 146 · NEEDS RE-CHECK 9 · BLOCKED 16; fixed to date 3). Severity per HQ cycle 8: RUNWAE-PINCH-ZOOM-BLOCKED → **P1**; MDOTHREE-STRAY-FAVICON and PASTLIFE-INTEREST-IGNORED → **P2**.
**Lane snapshot (2026-10-11):** all 5 P0s are code-complete and pushed except RIGOR-API-525 (operator, S5): ronna (ENV-SYNTAX + MOCK-FALLBACK), rigor (PAY-BEFORE-API) and runwae (ERROR-LOG-PUBLIC) are all **needs-deploy, awaiting the Principal's GO**. Deploy access (S11) is confirmed: gh mdothree push works, VERCEL_TOKEN_MDO3 is valid.

**Columns:** `P` = HQ severity (cycle-8 changes applied). `owner` = op (Vercel/CF/Stripe/Firebase console) / dev (code + deploy) / decision (Principal). `state` = `HQ <status> → lane state`, plus the HQ unblock tag (S1–S13 = HQ unblock sheet; QW1–QW6 = no-decision quick wins). `sha/evidence` = lane SHAs, or HQ's next step + spec ref when the lane has none.

## Tier 0: HQ unblock sheet (S1–S13; verbatim from the draft)
| S | Action | Who | Time | Rows unblocked |
|---|---|---|---|---|
| S1 | **Pause the Rigor Pro $9.99/mo payment link** (Stripe product/link `4gM3cu7p6dux8Ko1Fx8k804`). Re-enable after step 5. | Stripe dashboard | 2 min | RIGOR-PAY-BEFORE-API (P0). Stops charging for a dead service. |
| S2 | **Add one Cloudflare WAF rule** blocking runwae.com paths: `/error_log`, `/database-debug.log`, `/database.rules.json`, `/firebase.json`, `/vercel.json`, `/deployment/*`, `/README.md`, `/js/config.js` (needs a token with Zone>WAF>Edit, or click it in the dashboard). | Cloudflare | 10 min | RUNWAE-ERROR-LOG-PUBLIC (P0), RUNWAE-PUBLIC-CONFIG-FILES (P1); mitigation until the repo fix ships. |
| S3 | **Set a business name** on the live Stripe account (Settings > Public details). | Stripe | 5 min | STRIPE-CHECKOUT-BUSINESS-NAME (P1) on layoffleads, prompts, rigor, names. |
| S4 | **Decide the governing jurisdiction** (one sentence). | reply | 1 min | LEGAL-SUBSITES-MISSING + 4 related; legal pages on 35 hosts. |
| S5 | **Give the rigor API its env + domain**: Vercel env (Firebase admin service account for mdo3d-career, Stripe key/webhook secret/price IDs), Cloudflare SSL mode / origin cert, `api.rigor.design` -> project `rigor`. | Vercel + Cloudflare | 30-60 min | RIGOR-API-525 (P0); re-enables 7 tools; unlocks the quota/anon/webhook tests. |
| S6 | **Create Stripe TEST keys + test payment links** for names, layoffleads, prompts, rigor, mdothree; read the success/cancel return URLs. | Stripe | 15 min | MDOTHREE-STRIPE-INJECT, RIGOR-STRIPE-ELEMENTS-PLACEHOLDER, C7-021, RIGOR-SUCCESS-CANCEL-404 (verify) + the 5 e2e checkout tests the hunt can then run. |
| S7 | **Choose the Firebase project** for mdothree.com/pro and the ronna subs; add the prod hostnames to Firebase Authorized domains; restrict the web API keys. | Firebase / GCP console | 20 min | MDOTHREE-PRO-FIREBASE-REPLACE, RONNA-SUBDOMAIN-CONFIG, XB-003, SURF-005. |
| S8 | **ronnascanner: 'coming soon' or build the backend?** (until decided the scanner can only show invented leads once env.js is fixed). | reply | 1 decision | RONNA-MOCK-FALLBACK (P0), RONNA-API-404 + 7 related. |
| S9 | **guidance: which copy is canonical and which Vercel project serves it** (currently `guidance-mdo3d`, last deployed 2026-03-20). | reply | 1 decision | 10 guidance rows incl. SEO-002, GUIDANCE-PROJECT-SPLIT (P1). |
| S10 | **One price table** for tarot/oracle/runes spreads and mdothree ($4 vs $4.99). | reply | 1 decision | 7 rows incl. TAROT-PAID-SPREAD-DEMO. |
| S11 | **Confirm deploy access** for the three never-redeployed groups (runwae, guidance, ronna tool subs): token refresh or dashboard access, and whether the Pro plan lifts the 100/day cap. | Vercel | 15 min | About 77 rows touching those hosts; includes RONNA-ENV-SYNTAX (P0), RUNWAE-PINCH-ZOOM-BLOCKED (P1), XB-001. |
| S12 | **Publish DMARC** on the 7 mail domains with the already-valid Cloudflare token, point `blacklabb.com` at the right place, and clear the NXDOMAIN slugs. | Cloudflare / Bubble | 30 min | SURF-002, BLACKLAB-DOOR, PASTLIVES-SLUG. |
| S13 | **Copy/content batch**: answer the Principal-owned CONTENT-* questions in one sitting (testimonials source, entity names, social handles, cookie/consent, Oracle free limit, etc.). | reply | 1 sitting | 10 rows (CONTENT-*, SURF-008). |

## Queue (HQ cycle-8 order)
| # | HQ ID | P | surface | owner | state | sha/evidence |
|---|---|---|---|---|---|---|
| 1 | RIGOR-PAY-BEFORE-API | P0 | resume/interview/networking/salary.rigor.design → LIVE Rigor Pro $9.99/mo link | op→dev | HQ OPEN → pushed, needs-deploy (GO); op S1 link pause pending | resume 0dae395 · cover 71275c4 · interview 2e05672 · linkedin 37fd8f1 · networking 659c511 · portfolio 92e08ca · salary 37c1ee6 (earlier dc0916e/be7af5d/c881993/cf200d5); PRO_CHECKOUT_ENABLED=false; deploy `MDO_DEPLOY_CYCLE5_2026-10-08.sh rigor` · spec: FS §2 RIGOR-PAY-BEFORE-API |
| 2 | RUNWAE-ERROR-LOG-PUBLIC | P0 | runwae.com/error_log, /database-debug.log | op | HQ OPEN → pushed, needs-deploy (GO); S2 WAF = op fallback | fdad811, 24b9ed6 (HEAD 80b8677); deploy `… runwae` verifies 11 paths → 404 · spec: FS §2 RUNWAE-ERROR-LOG-PUBLIC |
| 3 | RUNWAE-PUBLIC-CONFIG-FILES | P1 | runwae.com /firebase.json /database.rules.json /vercel.json /deployment/inject-config.js /README.md /js/config | op | HQ OPEN → pushed, needs-deploy (GO) | 24b9ed6, d054efb; js/config.js kept public (Mapbox pk only) → restrict token; conflicts with HQ S2 list · spec: FS §2 RUNWAE-ERROR-LOG-PUBLIC + RUNWAE-PUBLIC-CONFIG-FILES |
| 4 | RIGOR-API-525 | P0 | api.rigor.design (/ /health /api/health) | op | HQ OPEN → blocked-on-operator (S5) | api 863d3f2 ready; checklist c5/rigor.md · spec: FS §2 RIGOR-API-525 |
| 5 | RONNA-ENV-SYNTAX | P0 | 5 ronna tool subs js/config/env.js L8 | dev | HQ OPEN → pushed, needs-deploy (GO) | companies 774120d · contacts c2d534f · emails 8aa0fbe · leads 7465d67 · prospects fa74c93; ships with MOCK-FALLBACK via `… ronna` (5daa0ff) · spec: FS §2 RONNA-ENV-SYNTAX |
| 6 | RONNA-MOCK-FALLBACK | P0 | 5 ronna tool apps: generateMockLeads/mockEmailResults/mockContacts | dev + decision | HQ OPEN → pushed, needs-deploy (GO) (honest 'unavailable' state; S8 still Principal's) | companies f497cda+dd44c1e · contacts 4c09cbb+0b18796 · emails aca7edf+5b38956 · prospects bb22bcc+aded2dc · leads 4d1e328+f1a10a6; script 5daa0ff · spec: FS §2 RONNA-MOCK-FALLBACK |
| 7 | RONNA-LANDING-DEAD-CTAS | P1 | ronnascanner.com Get Started ×2, View Pricing, Join Waitlist, footer Privacy/Terms | dev | HQ OPEN → held (S8: targets) | — · HQ next: Needs pricing/waitlist targets · spec: FS §3 RONNA-LANDING-DEAD-CTAS |
| 8 | RONNA-COPY-HONESTY | P1 | ronnascanner.com '50M+/500M+/95%' + 'Trusted by sales teams everywhere' | decision→dev | HQ BLOCKED → held (S8: copy) | — · HQ next: Principal copy decision · spec: FS §3 RONNA-COPY-HONESTY |
| 9 | RONNA-APIFETCH-DOUBLE-JSON | P1 | leads/js/app.js vs js/config/env.js | dev | HQ OPEN → in progress (lane P1 agent, 10-11) | — · HQ next: Even after env.js fix the scanner can only show mock data · spec: FS §1/§2 RONNA-MOCK-FALLBACK |
| 10 | RONNA-API-404 | P1 | leads…/api/leads/scan, contacts…/api/contacts/find | decision/dev | HQ BLOCKED → held (S8) | lane shipped honest 'unavailable' UI; backend vs coming-soon is Principal's · spec: FS §2 RONNA-API-404 |
| 11 | RONNA-SIGNIN-LATARENCE | P2 | ronnascanner.com header Sign In → https://latarence.com | decision | HQ OPEN → held (Principal) | — · HQ next: Principal: intended? · spec: FS §3 RONNA-* |
| 12 | RONNA-SUB-SIGNIN-DEAD | P2 | 5 ronna subs Sign In / Free Trial href `#` | dev | HQ OPEN → open (after S7 config) · %24 c8 P2/P3: fixed, pushed, needs-deploy (GO; real sign-in still S7) | — · HQ next: After env.js + config · spec: FS §3 · %24 c8: ronna batch companies 120de9d · contacts 0aa299d · emails b17179f · leads e6d5ba6 · prospects b68cc9c (#signin/#signup + js/boot.js opens the modal even if the Firebase module fails) |
| 13 | RONNA-LOADLIST-AWAIT-BUG | P2 | leads/js/app.js:262 `await (await import(...)).then(...)` | dev | HQ OPEN → open (S8+S11) · %24 c8 P2/P3: fixed, pushed, needs-deploy (GO) | — · HQ next: TypeError on every Load List · spec: FS §1; raw/cycle6-fixspec/patched/leads_app.diff · %24 c8: companies 80a0113 · contacts f1acb90 · emails 49dac9f · leads 8627bf9 · prospects fdaee8f (wider than ticket: undefined Firestore helpers on all 5 → firestoreService; eslint no-undef clean) |
| 14 | CONTENT-RONNA-VENDOR | P2 | 5 ronna subs footer 'Powered by Apollo, Hunter & Clearbit' (browser cf-04 confirms) | decision→dev | HQ OPEN → pushed, needs-deploy (GO) | footer claim removed in the RONNA-MOCK-FALLBACK commits · spec: CYCLE6_CONTENT §1 |
| 15 | STRIPE-CHECKOUT-BUSINESS-NAME | P1 | layoffleads, prompts, rigor, names Checkout | op | HQ OPEN → blocked-on-operator (S3) | — · HQ next: Stripe → Settings → Public details · spec: FS §3 STRIPE-CHECKOUT-BUSINESS-NAME |
| 16 | CONTENT-ENTITY-NAMES | P2 | Entity names differ: 'Butts Technologies, LLC' (guidance) / 'BlackLabb Technologies' (numerology) / 'MDO3D' (l | decision | HQ BLOCKED → open (S3+S11) | — · HQ next: Principal: legal entity · spec: CYCLE6_CONTENT §1 |
| 17 | LEGAL-SUBSITES-MISSING | P1 | 35/40 hosts /terms /privacy | decision→dev | HQ BLOCKED → held (S4 jurisdiction) | no-decision slice = C7-009 (QW1) · spec: FS §5 LEGAL-SUBSITES-MISSING |
| 18 | CONTENT-LEGAL-DRAFT-LABEL | P2 | layoffleads /terms /privacy 'Plain-language draft.' on a paid product | decision→dev | HQ OPEN → open (S4) | — · spec: CYCLE6_CONTENT §2 |
| 19 | CONTENT-STALE-YEAR-2025 | P2 | © 2025 on guidance + 5 ronna subs; mdo3d/mdothree legal 'October 5, 2025'; runwae legal Aug 1 2019 | dev | HQ OPEN → open (S4+S11) · %24 c8 P2/P3: ronna part fixed (© 2026), pushed, needs-deploy; legal dates still held (LEGAL-DATE-2025) · %24 c8P23: runwae part: decision (legal 'Last updated Aug 1 2019' changes only with a legal review) | — · HQ next: Broader than LEGAL-DATE-2025 · spec: CYCLE6_CONTENT §3 · %24 c8: ronna batch companies 120de9d · contacts 0aa299d · emails b17179f · leads e6d5ba6 · prospects b68cc9c  · %24 c8P23: — |
| 20 | CONTENT-LEGAL-JURISDICTION-PLACEHOLDER | P2 | prompts /terms §10 'jurisdiction where we are established' | decision | HQ BLOCKED → open (S4) | — · HQ next: Same jurisdiction decision · spec: CYCLE6_CONTENT §2 |
| 21 | LEGAL-DATE-2025 | P3 | mdo3d + mdothree legal 'Last updated: October 5, 2025' | dev | HQ OPEN → held (confirm year) | — · HQ next: See CONTENT-STALE-YEAR-2025 · spec: FS §5 |
| 22 | MDOTHREE-STRIPE-INJECT | P1 | color/hash/password/timestamp REPLACE_WITH_STRIPE…; json/text/pdf/image/qr ENV empty | op | HQ BLOCKED → blocked-on-operator (S6) | trial/pro gated off: PRO_CHECKOUT_ENABLED (json/text/pdf/image/qr, e.g. 44ae303) · spec: FS §3 MDOTHREE-STRIPE-INJECT |
| 23 | RIGOR-SUCCESS-CANCEL-404 | P1 | 7 rigor tools + landing /success /cancel | dev | HQ OPEN → config verified, needs-deploy (GO) | resume 0dae395 · cover 71275c4 · interview 2e05672 · linkedin 37fd8f1 · networking 659c511 · portfolio 92e08ca · salary 37c1ee6; cleanUrls + outputDirectory public · spec: FS §3 RIGOR-SUCCESS-CANCEL-404 |
| 24 | RIGOR-STRIPE-ELEMENTS-PLACEHOLDER | P2 | 7 rigor tools `Stripe(STRIPE_KEY \|\| "__STRIPE_PUBLISHABLE_KEY__")` | op + dev | HQ BLOCKED → blocked-on-operator (S6) | — · HQ next: Elements pk; pay link for cover/linkedin/portfolio · spec: FS §3 |
| 25 | C7-021 RETURN-URL-ASYMMETRY | P3 | mdothree.com /cancel 404 (/success 200); layoffleads.com /success /cancel /thanks 404; prompts /success /cancel 404 (/thanks 200) | op (verify) | HQ OPEN → open, no lane fix yet (QW6) | — · HQ next: Read the configured success/cancel URLs in Stripe; add pages · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md |
| 26 | GUIDANCE-PROJECT-SPLIT | P1 | guidance.mdo3d.com (Vercel `guidance-mdo3d`, LM Oct 4; md5 da65e48d…) | decision→op | HQ BLOCKED → held (S9) | — · HQ next: BLOCKED: which-copy decision then redeploy · spec: FS §4 GUIDANCE-* C7B-GUIDANCE-NAV-404 (alias): 6 service links 404 re-confirmed; legacy GUIDANCE-HUB-PATHS-404. |
| 27 | SEO-002 | P1 | guidance: no og/twitter/canonical/JSON-LD/robots/sitemap/favicon.ico | decision→op | HQ BLOCKED → open (S9+S11) | — · HQ next: Absorbs GUIDANCE-NO-OG-IMAGE scope · spec: CYCLE6_SEO_SHARE SEO-002 |
| 28 | GUIDANCE-NO-OG-IMAGE | P2 | guidance | dev | HQ BLOCKED → held (S9) | — · HQ next: Rides GUIDANCE-PROJECT-SPLIT / SEO-002 · spec: FS §4 GUIDANCE-* |
| 29 | GUIDANCE-MOBILE-OVERFLOW | P2 | guidance @375/390: 488–506px layout, `canvas#cosmos` 495px | dev | HQ BLOCKED → held (S9); CSS ready | — · HQ next: Device lane rates P1. Rides project split · spec: FS §4 GUIDANCE-* |
| 30 | GUIDANCE-MOBILE-CTA-OVERLAP | P2 | guidance CTA pair overlap | dev | HQ BLOCKED → held (S9); CSS ready | — · HQ next: Rides project split · spec: FS §4 GUIDANCE-* |
| 31 | GUIDANCE-SOON-STALE | P2 | guidance 'Arriving Soon' for Astrology/Feng Shui (both live) | decision→dev | HQ BLOCKED → open (S9+S11) | — · HQ next: FS §1; CONTENT-GUIDANCE-SOON-STALE · spec: FS §4 GUIDANCE-* |
| 32 | CONTENT-GUIDANCE-TESTIMONIALS | P2 | guidance 3 named testimonials (Sofia R., Aisha K., Jordan M.) with no review system | decision | HQ BLOCKED → open (S9+S11) | — · HQ next: Confirm source or remove · spec: CYCLE6_CONTENT §1 |
| 33 | C7-008 MDO3D-GUIDANCE-COPY-DEAD-FOOTER | P2 | mdo3d.com/guidance (listed in mdo3d.com sitemap) | dev | HQ OPEN → open (S9+S11) | — · HQ next: NEW-INSTANCE of GUIDANCE-PROJECT-SPLIT footer; rides which-copy decision or fix in place · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md |
| 34 | C7B-GUIDANCE-XLINK-404 | P2 | guidance.mdo3d.com footer mdo3d.com/professional, /utilities, /commerce | dev | HQ OPEN → open (S9+S11) | — · HQ next: Point at mdo3d.com/#professional etc. Rides GUIDANCE-PROJECT-SPLIT · spec: CYCLE7_BROWSER_DEEPFLOW_2026-10-09.md |
| 35 | IMG-GUIDANCE-NO-APPLE-ICON | P3 | guidance no apple-touch/manifest | dev | HQ OPEN → open (S9+S11) | — · spec: CYCLE6_DEVICE_MATRIX §F |
| 36 | MDOTHREE-PRO-FIREBASE-REPLACE | P1 | mdothree.com/pro | op | HQ BLOCKED → blocked-on-operator (S7) | — · HQ next: Needs Firebase web config + portal URL · spec: FS §3 |
| 37 | RONNA-SUBDOMAIN-CONFIG | P1 | 5 ronna subs `__FIREBASE_*__` / `__STRIPE_*__` placeholders | decision/op | HQ BLOCKED → blocked-on-operator (S7) | — · HQ next: Principal: which Firebase project + Stripe keys · spec: FS §5 RONNA-SUBDOMAIN-CONFIG |
| 38 | XB-003 | P2 | WebKit: 'current domain is not authorized for OAuth operations' on dreams, tarot, color, hash | op | HQ OPEN → open (S7) | — · HQ next: Add production hostnames to Firebase Authorized domains · spec: CYCLE6_BROWSERS XB-003 |
| 39 | SURF-005 | P3 | Firebase web apiKey public (expected); confirm GCP referrer/API restrictions; Stripe placeholders on 4 hosts | op | HQ OPEN → open (S7) | — · spec: CYCLE6_PUBLIC_SURFACE SURF-005 |
| 40 | TAROT-PAID-SPREAD-DEMO | P2 | tarot.mdo3d.com Three Card / Celtic | dev + decision | HQ OPEN → held (S10 price table) | — · HQ next: Pricing decision + TEST key · spec: FS §4 TAROT-PAID-SPREAD-DEMO |
| 41 | MDOTHREE-PRICE-MISMATCH | P2 | mdothree.com/pro '$4/mo' vs tool paywalls `$4.99` / yearly `$39.99` | decision→dev | HQ OPEN → open (S10) | — · HQ next: Pick one price · spec: FS §3 MDOTHREE-* |
| 42 | CONTENT-TAROT-PRICE-LABELS | P2 | tarot Single 'Free' vs button $2.99; '$2.99–$9.99' matches no spread | decision→dev | HQ OPEN → open (S10) | — · HQ next: One price table across divination · spec: CYCLE6_CONTENT §1 |
| 43 | CONTENT-ORACLE-PRICE-LABELS | P2 | oracle Three $4.99 / Celtic $9.99 vs button $2.99, pricing card $2.99 | decision→dev | HQ OPEN → open (S10) | — · HQ next: One price table across divination · spec: CYCLE6_CONTENT §1 |
| 44 | CONTENT-RUNES-PRICE | P2 | runes Three $4.99 / Five $7.99 vs every upsell $4.99 | decision→dev | HQ OPEN → open (S10) | — · HQ next: One price table across divination · spec: CYCLE6_CONTENT §1 |
| 45 | CONTENT-DIV-PRICE-MATRIX | P3 |  | decision→dev | HQ OPEN → open (S10) | — · HQ next: 'Deeper reading' price differs per divination site ($2.99/$4.99/$5.99/$9.99) · spec: CYCLE6_CONTENT |
| 46 | CONTENT-ORACLE-FREE-LIMIT | P3 |  | decision→dev | HQ OPEN → open (S10) | — · HQ next: oracle '1 free card daily' vs re-draw · spec: CYCLE6_CONTENT C7 browser: re-confirmed. |
| 47 | BLACKLAB-DOOR | P2 | blacklabb.com Bubble 'domain not supported' | op | HQ OPEN → blocked-on-operator (S12) | MDO-side; never AHL · spec: FS §4 BLACKLAB-DOOR |
| 48 | SURF-002 | P2 | No DMARC on all 7 MDO mail domains (mdo3d, mdothree, rigor, ronnascanner, layoffleads, prompts, runwae) | op | HQ OPEN → open (S12+S11) | — · HQ next: Publish `_dmarc` p=none then quarantine · spec: CYCLE6_PUBLIC_SURFACE SURF-002 |
| 49 | PASTLIVES-SLUG | P3 | pastlives/businessnames/baby-name-oracle .mdo3d.com NXDOMAIN | op | HQ OPEN → blocked-on-operator (S12) | — · spec: FS §5 |
| 50 | SURF-008 | P3 | runwae third-party cookies/tracking, no consent step | decision | HQ OPEN → open (S13+S11) | — · spec: CYCLE6_PUBLIC_SURFACE SURF-008 |
| 51 | CONTENT-DREAMS-FREE-JOURNAL | P3 |  | decision→dev | HQ OPEN → open (S13) | — · HQ next: journal listed both free and premium · spec: CYCLE6_CONTENT |
| 52 | CONTENT-MDOTHREE-HASH-BLURB | P3 |  | decision→dev | HQ OPEN → open (S13) | — · HQ next: 3 different hash algorithm lists · spec: CYCLE6_CONTENT |
| 53 | CONTENT-ASTRO-LOCATION | P3 |  | decision→dev | HQ OPEN → open (S13) | — · HQ next: astrology birth-location privacy wording · spec: CYCLE6_CONTENT |
| 54 | CONTENT-DAILYAITOLL-SHELL | P3 |  | decision→dev | HQ OPEN → open (S13) | — · HQ next: dailyaitoll shows dashes until JS/API loads · spec: CYCLE6_CONTENT |
| 55 | CONTENT-COMPARE-BRAND | P3 |  | decision→dev | HQ OPEN → open (S13) | — · HQ next: compare titled 'ClawBench' vs 'AI Assistant Compare' · spec: CYCLE6_CONTENT |
| 56 | CONTENT-PROMPTS-FULFILMENT | P3 |  | decision→dev | HQ OPEN → open (S13) | — · HQ next: 'within one business day' manual fulfilment promise; post-pay delivery never closed · spec: CYCLE6_CONTENT |
| 57 | CONTENT-LAYOFFLEADS-STATES | P3 |  | decision→dev | HQ OPEN → open (S13) | — · HQ next: 40-jurisdiction filter vs 'state WARN notices' · spec: CYCLE6_CONTENT |
| 58 | CONTENT-BRAND-INCONSISTENT | P3 |  | decision→dev | HQ OPEN → open (S13) | — · HQ next: MDO3D / mdothree / mdo three / Ronna / RonnaScanner / ronna.scanner · spec: CYCLE6_CONTENT |
| 59 | CONTENT-DAILYAITOLL-TONE | P3 |  | decision→dev | HQ OPEN → open (S13) | — · HQ next: headline opinionated vs 'no opinions' footer · spec: CYCLE6_CONTENT |
| 60 | C7-001 RUNWAE-BLOG-NAV-RELATIVE-LINKS-404 | P1 | runwae.com all 17 /blog/* posts: header/footer hrefs lack leading slash (welcome, blog, login?login, login?signup, faqs, privacy, terms) | dev | HQ OPEN → partial: pushed, needs-deploy; rest open (QW2) | 80b8677 made 15 old posts' assets `../`; 4 interview posts still 7 relative refs, 11 posts 1 (`href="welcome"`) · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md |
| 61 | C7-002 DIV-API-MALFORMED-JSON-500 | P2 | 7 divination APIs (iching, astrology-alpha, numerology, runes, tarot-cards, dream-interpreter-delta, oracle-cards) *.vercel.app | dev (API repos) | HQ OPEN → open, no lane fix yet (QW4) | — · HQ next: Shared JSON-parse error handler → 400. QUICK WIN · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md |
| 62 | C7-004 RUNWAE-BLOG-OGIMAGE-404 | P2 | runwae.com /blog/HowToMarketALemonadeStandUsingInfluencers, …AMixtapeUsingInfluencers, …SkincareProdcutsUsingInfluencers | dev | HQ OPEN → open, no lane fix yet (QW (dev quick win)) · %24 c8P23: already fixed at runwae HEAD → pushed, needs-deploy (GO) | — · HQ next: Restore images or point og:image at an existing asset · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md  · %24 c8P23: ef49ef8 (og:image → /og-image.png 1200×630 on all 23 posts + blog/faqs/legal; QW2 crawl 0 broken) |
| 63 | C7-005 LAYOFFLEADS-WARN-SOURCE-LINKS-404 | P2 | layoffleads.com home + company pages (official state WARN source links) | dev + content | HQ OPEN → open, no lane fix yet (QW6) | — · HQ next: Replace dead URLs; verify bot-blocked ones in a browser · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md |
| 64 | C7-006 DAILYAITOLL-CITATION-ROT | P2 | dailyaitoll.com dated pages (150 of 228 crawled) | dev + content | HQ OPEN → open, no lane fix yet (QW6) | — · HQ next: Replace/archive citations; add a link-check job · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md |
| 65 | C7-009 TOOLSITES-NO-LEGAL-OR-CONTACT-LINK | P2 | color/hash/password/timestamp/json/text/pdf/image/qr .mdothree.com (~100 pages) | dev | HQ OPEN → open, no lane fix yet (QW1) | — · HQ next: NEW-INSTANCE of LEGAL-SUBSITES-MISSING with NO jurisdiction blocker: footer-link to https://mdothree.com/terms + /privacy + hello@. QUICK WIN · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md |
| 66 | C7-010 DIVINATION-NO-ENTERTAINMENT-DISCLAIMER | P2 | astrology, fengshui, iching, names, numerology, pastlife, runes, tarot, guidance (9 of 11) | dev + decision (wording) | HQ OPEN → open, no lane fix yet (QW3) | — · HQ next: Reuse dreams/oracle wording on the 9. QUICK WIN · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md |
| 67 | C7B-PW-NOSETS-EMPTY | P2 | password.mdothree.com generator | dev | HQ OPEN → open, no lane fix yet (QW5) | — · HQ next: Require ≥1 set (disable Generate + message); skip empty history rows · spec: CYCLE7_BROWSER_DEEPFLOW_2026-10-09.md |
| 68 | C7B-TEXTDIFF-SURROGATE | P2 | text.mdothree.com character diff | dev | HQ OPEN → open, no lane fix yet (QW5) | — · HQ next: Diff by grapheme (Intl.Segmenter / Array.from) · spec: CYCLE7_BROWSER_DEEPFLOW_2026-10-09.md |
| 69 | C7B-RUNWAE-BLOG-ASSETS-404 | P2 | runwae.com /blog/<post> ×17 | dev | HQ OPEN → partial: pushed, needs-deploy (QW2) | 80b8677 (`../` asset paths); finish with root-relative · spec: CYCLE7_BROWSER_DEEPFLOW_2026-10-09.md |
| 70 | C7-003 DIV-API-OVERSIZE-500 | P3 | iching-api /api/reading/generate (pattern likely fleet-wide) | dev (API repos) | HQ OPEN → open, no lane fix yet (QW4) | — · HQ next: Map entity-too-large → 413 JSON; cap field lengths. QUICK WIN · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md |
| 71 | C7-007 SOCIAL-FOOTER-LINKS-DEAD | P3 | mdo3d.com footer twitter.com/mdo3d; runwae.com footer facebook.com/runwaeplatform | dev | HQ OPEN → open, no lane fix yet (QW (dev quick win)) · %24 c8P23: runwae part: decision (facebook.com/runwaeplatform handle; not changed) | — · HQ next: Create handle or remove icon (GitHub 404 already = MDO3D-FOOTER-GITHUB-404) · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md  · %24 c8P23: — |
| 72 | C7-011 AUTH-MODAL-FIELD-HYGIENE | P3 | 7 rigor + 5 ronna hosts sign-in/up modal; runwae login | dev | HQ OPEN → open, no lane fix yet (QW (dev quick win)) · %24 c8 P2/P3: ronna part fixed, pushed, needs-deploy; runwae login part open · %24 c8P23: runwae part: pushed, needs-deploy (GO) | — · HQ next: NEW-INSTANCE of A11Y-001. Add labels + autocomplete · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md · %24 c8: ronna batch companies 120de9d · contacts 0aa299d · emails b17179f · leads e6d5ba6 · prospects b68cc9c (name/autocomplete/aria-label/required; signup minlength 6)  · %24 c8P23: runwae fd07868 (login: label for, name, autocomplete name/username/email/new-password/current-password, aria-required, minlength 6, role=alert errors; axe label 0) |
| 73 | C7-012 ROBOTS-DISALLOW-JS-CONFIG | P3 | image/json/pdf/qr/text.mdothree.com robots.txt | dev | HQ OPEN → open, no lane fix yet (QW5) | — · HQ next: Remove the rules (config is not secret) · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md |
| 74 | C7-013 SITEMAP-LASTMOD-BUILD-STAMP | P3 | 31 sitemaps | dev | HQ OPEN → open, no lane fix yet (QW (dev quick win)) · %24 c8 P2/P3: mdothree part (9 tools + mdothree.com + build_seo.py) fixed, pushed, needs-deploy; other hosts open | — · HQ next: Emit real lastmod or omit · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md · %24 c8: color 7da16d5 · hash e14a485 · image 34719e2 · password 1540aa3 · pdf 6bba8f4 · qr 94ca195 · text 952931f · timestamp 92d9bf8 · mdo3d a2ccfcd (json+landing+generator) |
| 75 | C7-014 RUNWAE-CSS-STALE-IMAGE-REFS | P3 | runwae.com /css/main.css | dev | HQ OPEN → open, no lane fix yet (QW (dev quick win)) · %24 c8P23: pushed, needs-deploy (GO) | — · HQ next: Delete dead rules or restore assets · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md  · %24 c8P23: runwae fd07868 (33 dead url()s in main.css → none, same rendering, no 404 requests) |
| 76 | C7-015 RUNWAE-FAQ-BROKEN-ANCHOR-AND-DUP-IDS | P3 | runwae.com/faqs | dev | HQ OPEN → open, no lane fix yet (QW2) | — · HQ next: Fix anchor, dedupe ids · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md |
| 77 | C7-016 TAROT-DREAMS-HEALTH-PING-404 | P3 | tarot.mdo3d.com + dreams.mdo3d.com js/config/api.js | dev | HQ OPEN → open, no lane fix yet (QW4) | — · HQ next: Change path to /api/health · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md |
| 78 | C7-017 DIV-API-INCONSISTENT-ERRORS | P3 | 7 divination APIs | dev (API repos) | HQ OPEN → open, no lane fix yet (QW4) | — · HQ next: One shared error handler (JSON 404/405). QUICK WIN with C7-002/003 · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md |
| 79 | C7-018 INTERNAL-LINKS-VIA-308 | P3 | json 12, text 10, image 9, pdf 9, qr 6, color 3, mdothree.com 3, ronnascanner.com 5 (/leads →308) | dev | HQ OPEN → open, no lane fix yet (QW5) | — · HQ next: Link to clean URLs · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md |
| 80 | C7-019 INDEX-HTML-DUPLICATE-200 | P3 | dreams, fengshui, names, numerology, oracle, pastlife, tarot, compare /index.html | dev | HQ OPEN → open, no lane fix yet (QW5) | — · HQ next: Redirect /index.html → / · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md |
| 81 | C7-020 ORACLE-SAVE-READING-STUB-AND-DEBUG-CONSOLE | P3 | oracle.mdo3d.com js/app.js L366-371; tarot/dreams app.js | dev | HQ OPEN → open, no lane fix yet (QW5) | — · HQ next: Hide or implement Save; strip console.log · spec: CYCLE7_CLASS_SWEEP_2026-10-09.md |
| 82 | C7B-COLOR-STALE-RESULT | P3 | color.mdothree.com converter | dev | HQ OPEN → open, no lane fix yet (QW5) | — · HQ next: Clear results on invalid/empty · spec: CYCLE7_BROWSER_DEEPFLOW_2026-10-09.md |
| 83 | C7B-NUMEROLOGY-FUTURE-DATE | P3 | numerology.mdo3d.com | dev | HQ OPEN → open, no lane fix yet (QW5) | — · HQ next: Validate birth date (not future, sane range) · spec: CYCLE7_BROWSER_DEEPFLOW_2026-10-09.md |
| 84 | C7B-ASTRO-NO-VALIDATION | P3 | astrology.mdo3d.com | dev | HQ OPEN → open, no lane fix yet (QW5) | — · HQ next: Validate; hide moon/rising without time · spec: CYCLE7_BROWSER_DEEPFLOW_2026-10-09.md |
| 85 | C7B-LL-DATE-FILTER-SILENT | P3 | layoffleads.com filters | dev | HQ OPEN → open, no lane fix yet (QW5) | — · HQ next: Validate range; show Pro hint · spec: CYCLE7_BROWSER_DEEPFLOW_2026-10-09.md |
| 86 | C7B-PRO-BTN-INVISIBLE | P3 | color/password/timestamp.mdothree.com header | dev | HQ OPEN → open, no lane fix yet (QW5) | — · HQ next: Fix text colour/contrast · spec: CYCLE7_BROWSER_DEEPFLOW_2026-10-09.md |
| 87 | C7B-QR-COPY | P3 | qr.mdothree.com | dev | HQ OPEN → open, no lane fix yet (QW5) | — · HQ next: Say 'L' / shorten message · spec: CYCLE7_BROWSER_DEEPFLOW_2026-10-09.md |
| 88 | C7B-TS-WEEK | P3 | timestamp.mdothree.com | dev | HQ OPEN → open, no lane fix yet (QW5) | — · HQ next: Show UTC consistently / label local · spec: CYCLE7_BROWSER_DEEPFLOW_2026-10-09.md |
| 89 | C7B-DREAMS-MAXLEN | P3 | dreams.mdo3d.com | dev | HQ OPEN → open, no lane fix yet (QW5) | — · HQ next: Counter + empty-state message · spec: CYCLE7_BROWSER_DEEPFLOW_2026-10-09.md |
| 90 | RUNWAE-PINCH-ZOOM-BLOCKED | P1 | runwae.com/welcome 2nd viewport meta `maximum-scale=1,user-scalable=0` | op/dev | HQ OPEN → pushed, needs-deploy (GO) | 9caeba2 (+feff003 admin.html); HEAD has 0 user-scalable/maximum-scale; live = old build · spec: FS §4 RUNWAE-* |
| 91 | RUNWAE-OUTPUTDIR-ROOT | P1 | runwae vercel.json | dev | HQ OPEN → in progress (lane P1 agent, 10-11) | 24b9ed6 prune-public.js is the current mitigation · spec: FS §2 Fix B |
| 92 | XB-001 | P1 | runwae.com/welcome has no `<!DOCTYPE html>` → quirks mode in Chromium/Firefox/WebKit | dev | HQ OPEN → open (S11 (deploy round)) | — · HQ next: Likely root cause of the small/pale FAQ text (RUNWAE-UI). Adding DOCTYPE changes sizing → recheck · spec: CYCLE6_BROWSERS XB-001 |
| 93 | PERF-001 | P1 | runwae.com: perf 53, LCP 17.4s, 1,957 KB, 135 requests | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8P23: TBT follow-up: pushed, needs-deploy (GO) | — · HQ next: CYCLE6_PERF PERF-001 (AdSense 244KB, GTM 245KB, fontawesome-all, 64 blocking resources) · spec: CYCLE6_PERF PERF-001  · %24 c8P23: runwae fd07868 (welcome-init.js replaces base-init + ~30 unused plugins; lazy/idle Lottie, pinned; Ionicons inlined; xps interleaved ×6: TBT med 2322→1004ms, main-thread 21.2→6.5s, 1st-party-only TBT 1233→659; LCP unchanged ~2.4s quiet box; rest = AdSense/GTM/ManyChat = decision) |
| 94 | A11Y-001 | P1 | Inputs with no accessible name: pastlife date/time, color #colorPicker, timestamp #dateInput, pdf/image #fileI | dev | HQ OPEN → open (S11 (deploy round)) | — · HQ next: axe 4.14 critical `label` on 7 hosts · spec: CYCLE6_A11Y A11Y-001 |
| 95 | A11Y-002 | P1 | <select> with no name: timestamp #tsUnit, json #indent, qr #errorLevel, rigor portfolio #career-stage, ronna c | dev | HQ OPEN → open (S11 (deploy round)) | — · HQ next: axe critical `select-name` on 7 hosts · spec: CYCLE6_A11Y A11Y-002 |
| 96 | SEO-001 | P1 | 5 ronna tool subs: canonical + og:url → `ronnascanner.com/<tool>` which 308s back | dev | HQ OPEN → open (S11 (deploy round)) | — · HQ next: Set canonical to own host · spec: CYCLE6_SEO_SHARE SEO-001 |
| 97 | SEO-003 | P1 | runwae `/` → 307 → /welcome.html → 308 → /welcome (4 hops incl. www); title 'Welcome'; og:url 'Runwae.com/welc | dev | HQ OPEN → open (S11 (deploy round)) | — · HQ next: Overlaps RUNWAE-SEO-NOT-LIVE · spec: CYCLE6_SEO_SHARE SEO-003 |
| 98 | RUNWAE-SEO-NOT-LIVE | P2 | runwae title/og:url/twitter/canonical/sitemap | op | HQ OPEN → pushed, needs-deploy (GO) | ef49ef8 · spec: FS §4 RUNWAE-* |
| 99 | RONNA-MOBILE-NAV-HIDDEN | P2 | ronnascanner.com @375/390 | dev | HQ NEEDS RE-CHECK → LIVE (lane auto-deploy); HQ to re-check | ronnascanner-landing 8c19188 · spec: FS §0; CYCLE6_DEVICE_MATRIX §E |
| 100 | IMG-RONNASUB-NO-ICONS | P2 | 5 ronna subs: no favicon, no apple-touch | dev | HQ OPEN → partial: pushed, needs-deploy · %24 c8 P2/P3: fixed, pushed, needs-deploy | manifest icons on 5 subs + leads favicon: 0a18cbe/3b467d3/e320280/fdc06cd/116ee94 (filed as RONNA-LEADS-ICON-404) · spec: CYCLE6_DEVICE_MATRIX §F · %24 c8: ronna batch companies 120de9d · contacts 0aa299d · emails b17179f · leads e6d5ba6 · prospects b68cc9c (png icon link + 180×180 apple-touch-icon) |
| 101 | IMG-RONNA-MANIFEST-ICONS-404 | P2 | ronnascanner.com/manifest.json icons 192/512 → 404 | dev | HQ OPEN → open (S11 (deploy round)) | — · HQ next: CYCLE6_DEVICE_MATRIX §F · spec: CYCLE6_DEVICE_MATRIX §F |
| 102 | IMG-RUNWAE-OG-NO-BRAND | P2 | runwae og:image 1126×892 art only, no wordmark | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8P23: already fixed at runwae HEAD → pushed, needs-deploy (GO) | — · HQ next: _sheets/og.jpg · spec: CYCLE6_DEVICE_MATRIX §F  · %24 c8P23: ef49ef8 (/og-image.png 1200×630 with Runwae wordmark + tagline) |
| 103 | A11Y-003 | P2 | color-contrast: runwae 89 nodes (white on #9389ff 2.89:1); ronna `#nav-signup` white on #f97316 2.8:1 (6 hosts | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8 P2/P3: mdothree (9 tools + mdothree.com) + 5 ronna subs fixed, pushed, needs-deploy; runwae/mdo3d/oracle/guidance/rigor/ronnascanner.com apex open · %24 c8P23: runwae part: pushed, needs-deploy (GO) | — · HQ next: 27 hosts / 283 nodes · spec: CYCLE6_A11Y A11Y-003 · %24 c8: tools: color 8dd05e2+6ee4b8c · hash 5ae7a8a+058c900 · password 00a3647+c9e702a · timestamp e9af0f9+4e42b47 · image 940c1b6+797d26f · pdf 364dcf5+c61653b · qr 89c4d9f+d4f2a59 · text b734d6b+7ef395c · mdo3d 7aa4689+3d12af9 (json+landing); ronna batch companies 120de9d · contacts 0aa299d · emails b17179f · leads e6d5ba6 · prospects b68cc9c (#C2410C 5.18:1). xps axe: 0 contrast nodes on 10 home pages  · %24 c8P23: runwae fd07868 (#9389ff→#6259e8 5.1:1, #888da8→#676c88 5.2:1 in main/theme/Bootstrap css; axe color-contrast 0 on welcome/login/faqs/privacy/terms/blog/post) |
| 104 | A11Y-005 | P2 | Skipped heading levels (runwae 10, footers on mdo3d/guidance, fengshui/pastlife h3) | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8P23: runwae part: pushed, needs-deploy (GO) | — · spec: CYCLE6_A11Y A11Y-005  · %24 c8P23: runwae fd07868 (welcome outline h1→h2→h3 via aria-level/role=none, styles untouched; footer + legal headings level 2; axe heading-order 0 on welcome/privacy/terms/blog) |
| 105 | A11Y-006 | P2 | label-content-name-mismatch (mdo3d `.card-c1`, guidance, 8 hosts) | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8 P2/P3: pdf/image (+qr scan) drop zone fixed, pushed, needs-deploy; mdo3d/guidance/rigor/prompts open | — · spec: CYCLE6_A11Y A11Y-006 · %24 c8: pdf c61653b · image 797d26f · qr d4f2a59 (wrapper role/tabindex/reworded aria-label stripped in nav-toggle.js; xps axe 0) |
| 106 | A11Y-007 | P2 | runwae social links + hamburger `<a>` have no accessible name | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8P23: pushed, needs-deploy (GO) | — · spec: CYCLE6_A11Y A11Y-007  · %24 c8P23: runwae fd07868 (4 social links aria-label on all pages; close-menu is a <button>; menu toggle aria-expanded; axe link-name 0) |
| 107 | A11Y-014 | P2 | No visible focus: runwae 9 controls, dreams search input | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8P23: runwae part: pushed, needs-deploy (GO) | — · spec: CYCLE6_A11Y A11Y-014  · %24 c8P23: runwae fd07868 (:focus-visible ring 3px #4338ca; xps Tab walk: 0 controls without visible focus on welcome + login) |
| 108 | PERF-005 | P2 | leads.ronnascanner.com LCP 3.5s + console error | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8 P2/P3: open — console error was env.js (fixed); lazy Firebase waits on the ronna firebase WIP | — · spec: CYCLE6_PERF PERF-005 · %24 c8: — |
| 109 | PERF-006 | P2 | mdo3d.com / guidance render-blocking Google Fonts | dev | HQ OPEN → open (S11 (deploy round)) | — · spec: CYCLE6_PERF PERF-006 |
| 110 | SEO-004 | P2 | ronna subs share one og:image (90,750 B), no icons, empty robots/sitemap | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8 P2/P3: fixed, pushed, needs-deploy | — · HQ next: Overlaps IMG-RONNASUB-* · spec: CYCLE6_SEO_SHARE SEO-004 · %24 c8: ronna batch companies 120de9d · contacts 0aa299d · emails b17179f · leads e6d5ba6 · prospects b68cc9c (real robots.txt + sitemap.xml + vercel routes; per-tool og-card.png; icons) |
| 111 | SEO-006 | P2 | runwae title 'Welcome'; layoffleads title 74ch/desc 199ch; prompts title 76ch | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8P23: layoffleads part: LIVE (auto-deploy); runwae title rides ef49ef8 (needs-deploy) | — · spec: CYCLE6_SEO_SHARE SEO-006  · %24 c8P23: layoffleads b81e505 (home title 70→56, desc 199→139; all 3,062 indexable pages title ≤60 except 1 kept full to stay unique, desc ≤160) |
| 112 | SURF-003 | P2 | runwae: 8 third-party scripts, no SRI, one `lottie-player@latest` | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8P23: pushed, needs-deploy (GO); dynamic 3rd-party tags = decision | — · spec: CYCLE6_PUBLIC_SURFACE SURF-003  · %24 c8P23: runwae fd07868 (lottie-player @latest → 2.0.12 + SRI; SRI on ScrollMagic, crypto-js (+ionicons removed from welcome); GTM/AdSense/ManyChat/Typekit cannot take SRI → keep/remove is a decision) |
| 113 | MOBILE-RUNWAE-HSCROLL | P2 | runwae sideways scroll on phones (400/422; off-canvas `div.nav` right edge 730/752) | dev | HQ OPEN → pushed, needs-deploy (GO); re-measure | 4c30873, 80b8677 (scrollWidth 375 on HEAD) · spec: CYCLE6_DEVICE_MATRIX §F |
| 114 | RUNWAE-UI | P3 | runwae desktop nav hamburger-only; FAQ low contrast; 'Prodcuts'/'Marrch' typos | op | HQ OPEN → pushed, needs-deploy (GO) | 4c30873 (typos, desktop nav @1024); XB-001 still open · spec: FS §4 RUNWAE-* |
| 115 | RUNWAE-ASSETS | P3 | runwae /js/libs/webfontloader.min.js 404 on /privacy /terms | op | HQ OPEN → pushed, needs-deploy (GO) | 4c30873, 80b8677 · spec: FS §4 RUNWAE-* |
| 116 | RUNWAE-DEAD-HEADER-LINKS | P3 | runwae 11 header/icon links + Download = `#` | dev | HQ OPEN → pushed, needs-deploy (GO) | 4c30873 (0 `href="#"`) · spec: FS §4 RUNWAE-* C7 browser: re-confirmed. |
| 117 | RUNWAE-STATS-NOT-VISIBLE | P3 | no landing stats block on /welcome | op | HQ OPEN → pushed, needs-deploy (GO) | 4c30873 · spec: FS §4 RUNWAE-* |
| 118 | SOFT-200-EMPTY | P3 | 7 rigor + 5 ronna: 200/0 B on any path | dev | HQ OPEN → pushed, needs-deploy (GO) | ronna 7e9b1d7/0615b30/a7d3167/f03a159/e08429f; rigor: config verified (7 tool SHAs) · spec: FS §5 SOFT-200-EMPTY |
| 119 | RONNA-MOBILE-CARD-OVERFLOW | P3 | ronnascanner.com feature cards 7px over at 375 | dev | HQ NEEDS RE-CHECK → LIVE (lane auto-deploy); HQ to re-check | ronnascanner-landing 8c19188 (cards 16–359 @375) · spec: FS §0 |
| 120 | MOBILE-RONNASUB-HEADER-WRAP | P3 | 5 ronna subs 'Sign In' wraps to two lines @390 | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8 P2/P3: fixed, pushed, needs-deploy | — · spec: CYCLE6_DEVICE_MATRIX §F · %24 c8: ronna batch companies 120de9d · contacts 0aa299d · emails b17179f · leads e6d5ba6 · prospects b68cc9c (xps @390: one line, scrollWidth 390) |
| 121 | MOBILE-GENERAL-TEXT-SIZE | P3 | text <12px: mdo3d 30–93, guidance 36–37, runwae 28 | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8P23: runwae part: pushed, needs-deploy (GO) | — · spec: CYCLE6_DEVICE_MATRIX §F  · %24 c8P23: runwae fd07868 (welcome @375: 28 → 0 text nodes <12px) |
| 122 | IMG-RONNASUB-OG-GENERIC | P3 | 5 ronna subs share apex og card; og:url → apex path | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8 P2/P3: og image half fixed, pushed, needs-deploy (og:url = SEO-001) | — · spec: CYCLE6_DEVICE_MATRIX §F · %24 c8: ronna batch companies 120de9d · contacts 0aa299d · emails b17179f · leads e6d5ba6 · prospects b68cc9c (1200×630 og-card.png per tool, absolute own-host URL; was ./og-image.jpg 404 on 4 subs) |
| 123 | IMG-RUNWAE-NO-TWITTER-IMAGE | P3 | runwae no twitter:image/card | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8P23: already fixed at runwae HEAD → pushed, needs-deploy (GO) | — · spec: CYCLE6_DEVICE_MATRIX §F  · %24 c8P23: ef49ef8 (twitter:card summary_large_image + twitter:image + alt) |
| 124 | IMG-RUNWAE-APPLE-150 | P3 | runwae apple-touch icon 150×150 not 180 | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8P23: already fixed at runwae HEAD → pushed, needs-deploy (GO) | — · spec: CYCLE6_DEVICE_MATRIX §F  · %24 c8P23: ef49ef8 (<link rel=apple-touch-icon href=/apple-touch-icon.png> 180×180; the 150px links left are apple-touch-startup-image) |
| 125 | IMG-RUNWAE-LOGO-ALT-LAZY | P3 | runwae logo 526px shown at 34px, lazy above fold; one logo `alt="Olympus"` | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8P23: pushed, needs-deploy (GO) | — · spec: CYCLE6_DEVICE_MATRIX §F  · %24 c8P23: runwae fd07868 (68px logo files shown at 34px, header logo not lazy (1243764), alt="" next to the wordmark, 'Olympus' alt gone) |
| 126 | PERF-010 | P3 | fonts: Google-hosted blocking CSS; runwae Typekit | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8P23: runwae part: decision (Typekit removal); Google font CSS already non-blocking | — · spec: CYCLE6_PERF PERF-010  · %24 c8P23: 1243764 |
| 127 | SEO-008 | P3 | missing og:image:alt / og:site_name / apple-touch / manifest / JSON-LD on guidance, ronna subs, runwae | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8 P2/P3: ronna part fixed, pushed, needs-deploy; guidance/runwae open · %24 c8P23: runwae part: already at HEAD → needs-deploy (GO); layoffleads og:image:alt LIVE | — · spec: CYCLE6_SEO_SHARE SEO-008 · %24 c8: ronna batch companies 120de9d · contacts 0aa299d · emails b17179f · leads e6d5ba6 · prospects b68cc9c (og:site_name, og:image:alt, twitter:image:alt, JSON-LD WebApplication)  · %24 c8P23: runwae ef49ef8 (og:image:alt, og:site_name, apple-touch, manifest, JSON-LD) · layoffleads b81e505 |
| 128 | SEO-009 | P3 | ronnascanner sitemap lists 1 URL (not the tools); layoffleads 571 URLs | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8P23: layoffleads part: no change needed (sitemap lists every indexable page, now 3,062, real per-page lastmod) | — · spec: CYCLE6_SEO_SHARE SEO-009  · %24 c8P23: — |
| 129 | SEO-010 | P3 | redirect behaviour (runwae 4 hops; http→https untested, port 80 blocked) | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8P23: runwae part: pushed, needs-deploy (GO) | — · spec: CYCLE6_SEO_SHARE SEO-010  · %24 c8P23: 1243764 (/ → single 301 → /welcome; www hop depends on the Vercel domain redirect) |
| 130 | SURF-007 | P3 | runwae outdated front-end libs | dev | HQ OPEN → open (S11 (deploy round)) · %24 c8P23: partial — welcome no longer loads moment/fullcalendar/Chart/daterangepicker etc.; jQuery 3.2.1 / Bootstrap 4.0.0 upgrade still open (needs an app regression pass) | — · spec: CYCLE6_PUBLIC_SURFACE SURF-007  · %24 c8P23: runwae fd07868 |
| 131 | PERF-002 | P1 | color/hash/password/timestamp.mdothree.com: LCP ~6.8s, Firebase loaded eagerly twice | dev | HQ OPEN → in progress (lane P1 agent: HID-001 lazy Firebase) | — · HQ next: Lazy-load Firebase; remove duplicate compat+modular · spec: CYCLE6_PERF PERF-002 |
| 132 | HEADERS-CSP | P2 | CSP on only 2/39 hosts (layoffleads, rigor.design apex) | dev | HQ OPEN → partial: rigor landing LIVE; rigor tools pushed, needs-deploy; mdothree ×4 restore staged · %24 c8 P2/P3: ronna inline SW script moved to js/boot.js (Bridge F3), pushed; hash CSP drops cdnjs (SURF-004); mdothree ×4 CSP restore still staged for Principal GO (Bridge #5 §6.B) | rigor-landing 4edcb0a; rigor tools as RIGOR-PAY row; `staged/mdothree-csp-restore/*.patch` (image/pdf/qr/text, GO list) · spec: FS §4 HEADERS-CSP · %24 c8: ronna batch companies 120de9d · contacts 0aa299d · emails b17179f · leads e6d5ba6 · prospects b68cc9c · hash eedaa21 |
| 133 | NUMEROLOGY-NO-RECALC | P2 | numerology.mdo3d.com | dev | HQ OPEN → pushed, needs-deploy (GO) | 5f2651e · spec: FS §4 NUMEROLOGY-NO-RECALC |
| 134 | PASTLIFE-INTEREST-IGNORED | P2 | pastlife.mdo3d.com | dev (API repo) | HQ OPEN → pushed, needs-deploy (GO) (pastlives-api) | 5f2651e; live generic text = API Claude fallback · spec: FS §4 PASTLIFE-INTEREST-IGNORED |
| 135 | MDOTHREE-STRAY-FAVICON | P2 | json.mdothree.com / pdf.mdothree.com visible `{ }">` / `📄" />` (fragment sits in <head>, ends head early; alia | dev | HQ OPEN → pushed, needs-deploy (GO); HQ asks head diff | 5f2651e (json), 2502a7d (pdf) · spec: FS §5 MDOTHREE-STRAY-FAVICON → JSON-PDF-STRAY-HEAD |
| 136 | HASH-MOBILE-NAV-OVERFLOW | P2 | hash.mdothree.com nav.tool-nav right edge 661 on phones | dev | HQ OPEN → pushed, needs-deploy (GO) | 49ab0dc (live md5 ≠ HEAD) · spec: FS §4 HASH-MOBILE-NAV-OVERFLOW |
| 137 | RIGOR-HEADER-SIGNIN-DEAD-REST | P2 | cover, interview, networking, salary, linkedin, portfolio .rigor.design header Sign In/Get Started | dev | HQ NEEDS RE-CHECK → pushed, needs-deploy (GO); browser re-test in progress (lane P1 agent) | resume 0dae395 · cover 71275c4 · interview 2e05672 · linkedin 37fd8f1 · networking 659c511 · portfolio 92e08ca · salary 37c1ee6 · spec: FS §3 RIGOR-HEADER-SIGNIN-DEAD |
| 138 | A11Y-004 | P2 | No `<main>` on 18 hosts; content outside landmarks on 24 | dev | HQ OPEN → open · %24 c8 P2/P3: mdothree.com + 5 ronna subs fixed, pushed, needs-deploy · %24 c8P23: runwae part: pushed, needs-deploy (GO) | — · spec: CYCLE6_A11Y A11Y-004 · %24 c8: mdo3d 7aa4689 (mdothree.com <main id=main>) · ronna batch companies 120de9d · contacts 0aa299d · emails b17179f · leads e6d5ba6 · prospects b68cc9c (<main id=main-content>)  · %24 c8P23: runwae fd07868 (<main> + role=contentinfo on welcome, login, faqs, privacy, terms, blog, 23 posts; axe region/landmark-one-main 0) |
| 139 | A11Y-009 | P2 | link-in-text-block (4 hosts) | dev | HQ OPEN → open · %24 c8 P2/P3: mdothree.com part fixed, pushed, needs-deploy · %24 c8P23: runwae part: pushed, needs-deploy (GO) | — · spec: CYCLE6_A11Y A11Y-009 · %24 c8: mdo3d 7aa4689 + 3d12af9 (underlined footer links; legal/pro footer #34D399 underlined)  · %24 c8P23: runwae fd07868 (links inside running text underlined; axe link-in-text-block 0 on login/terms) |
| 140 | A11Y-010 | P2 | textareas labelled only by title (3 hosts) | dev | HQ OPEN → open | — · spec: CYCLE6_A11Y A11Y-010 |
| 141 | A11Y-011 | P2 | nested-interactive in drop zone role=button (2 hosts) | dev | HQ OPEN → open · %24 c8 P2/P3: fixed, pushed, needs-deploy | — · spec: CYCLE6_A11Y A11Y-011 · %24 c8: pdf c61653b · image 797d26f · qr d4f2a59 (native file input is the one control; focus ring on zone; xps axe nested-interactive 0, Space opens picker) |
| 142 | A11Y-013 | P2 | Tap targets at 375px: 299 of 932 controls too small | dev | HQ OPEN → partial (runwae 44px taps): pushed, needs-deploy · %24 c8 P2/P3: mdothree 9 tools + mdothree.com fixed, pushed, needs-deploy · %24 c8P23: runwae social icons 44×44 pushed (needs-deploy); layoffleads LIVE | 4c30873 · spec: CYCLE6_A11Y A11Y-013 · %24 c8: same shas as A11Y-003 (44px footer/phone tool-nav taps, 24px checkboxes/sliders/breadcrumbs)  · %24 c8P23: runwae fd07868 · layoffleads b81e505 (0 controls <24px on phone/iPad/landscape/desktop; <44 on iPad 183→34, all ≥24 tall-44 narrow words or inline text) |
| 143 | A11Y-015 | P2 | No skip link on 8 of 12 probed landings | dev | HQ OPEN → open · %24 c8 P2/P3: mdothree.com + color/hash/password/timestamp fixed, pushed, needs-deploy (ronna subs already had one) · %24 c8P23: runwae part: pushed, needs-deploy (GO) | — · spec: CYCLE6_A11Y A11Y-015 · %24 c8: mdo3d 7aa4689 · color 68d47fb · hash 47c6258 · password 01ad8da · timestamp 463d203  · %24 c8P23: runwae fd07868 (skip link → #main-content on 30 public pages; clip-path, not left:-9999px) |
| 144 | PERF-003 | P2 | resume.rigor.design + 6 siblings: Firebase eager, LCP ~6.3s | dev | HQ OPEN → open | — · spec: CYCLE6_PERF PERF-003 |
| 145 | PERF-004 | P2 | dreams/tarot LCP ~5.0s (Firebase compat + gapi eager) | dev | HQ OPEN → open | — · spec: CYCLE6_PERF PERF-004 |
| 146 | SURF-004 | P2 | hash tool loads crypto-js/bcryptjs from cdnjs with no SRI; Firebase gstatic no SRI on 26 hosts | dev | HQ OPEN → open · %24 c8 P2/P3: hash + qr libs self-hosted, pushed, needs-deploy; Firebase gstatic SRI not addressed (versioned Google CDN, ES-module imports) | — · HQ next: Self-host crypto libs · spec: CYCLE6_PUBLIC_SURFACE SURF-004 · %24 c8: hash eedaa21 (crypto-js 4.2.0 + bcryptjs 2.4.3 = cdnjs bytes, sha512 SRI) · qr 6bd6a1d (qrcode 1.5.1 + jsQR 1.4.0, sha256 SRI = npm) |
| 147 | CONTENT-ICHING-PLACEHOLDER-DATA | P2 | iching: all 64 hexagram `judgment` = '<Name> judgment' (+46 flat line texts) | dev | HQ OPEN → open | — · HQ next: Node-executed ichingDatabase.js · spec: CYCLE6_CONTENT §2 |
| 148 | MDO3D-FOOTER-GITHUB-404 | P3 | footer github.com/mdo3d → 404 (github.com/mdothree 200) | dev | HQ OPEN → held (org) | — · HQ next: C6 HTTP re-confirmed · spec: FS §5 |
| 149 | FENGSHUI-A11Y-LABELS | P3 | fengshui 4 <label> no `for` | dev | HQ OPEN → LIVE (lane auto-deploy); HQ still lists OPEN, re-check | 827602b · spec: FS §5 |
| 150 | JSON-FIREBASE-IMPORT | P3 | json/text `./firebase.js` vs `./config/firebase.js` | dev | HQ NEEDS RE-CHECK → pushed, needs-deploy (GO) | 5f2651e (json), b7b5c32 (text) · spec: FS §5 JSON-FIREBASE-IMPORT |
| 151 | MDOTHREE-SIGNED-IN-BADGE | P3 | hash/color/password '● signed in' for anonymous | dev | HQ OPEN → pushed, needs-deploy (GO) | hash 49ab0dc · color c5ce7ff · password a0b9cc3 · timestamp 321738c · spec: FS §5 MDOTHREE-SIGNED-IN-BADGE C7 browser: re-confirmed. |
| 152 | JSON-BEAUTIFY-EMPTY-SILENT | P3 | json /format empty Beautify | dev | HQ NEEDS RE-CHECK → pushed, needs-deploy (GO) | 5f2651e · spec: FS §5 |
| 153 | RIGOR-EMPTY-INPUT-VALIDATION | P3 | resume/salary/portfolio empty input silent | dev | HQ NEEDS RE-CHECK → pushed, needs-deploy (GO) | resume 0dae395 · cover 71275c4 · interview 2e05672 · linkedin 37fd8f1 · networking 659c511 · portfolio 92e08ca · salary 37c1ee6 · spec: FS §3 |
| 154 | ICHING-COPY-GLITCH | P3 | iching 'Wind来源于 fire' | dev | HQ NEEDS RE-CHECK → LIVE (lane auto-deploy); HQ to re-check | 0b4336f · spec: FS §4 ICHING-COPY-GLITCH |
| 155 | MDO3D-HERO-CARDS | P3 | mdo3d.com hero 'Oracle Cards' float / Resume card | dev | HQ NEEDS RE-CHECK → LIVE (lane auto-deploy); HQ to re-check | mdo3d-landing 45e8081 · spec: FS §5 |
| 156 | LAYOFFLEADS-MOBILE-TABLE | P3 | layoffleads results table @375 | dev | HQ NEEDS RE-CHECK → LIVE (lane auto-deploy); HQ to re-check | layoffleads 82223f9 · spec: FS §0 |
| 157 | RIGOR-RESUME-CONSOLE-404 | P3 | resume.rigor.design: one 404 in console after modal fix (resource not captured) | dev | HQ OPEN → open | — · HQ next: Identify URL |
| 158 | MOBILE-TAPTARGETS-MDOTHREE-TOOLS | P3 | color/hash/password/timestamp 16–21 controls <44px | dev | HQ OPEN → open · %24 c8 P2/P3: fixed, pushed, needs-deploy | — · spec: CYCLE6_DEVICE_MATRIX §F · %24 c8: color 6ee4b8c · hash 058c900 · password c9e702a · timestamp 4e42b47 (xps @375: home pages 0 controls <24px) |
| 159 | TABLET-MDO3D-NAV-HAMBURGER | P3 | mdo3d.com hamburger up to 834px (full nav only ≥1080) | dev | HQ OPEN → open | — · spec: CYCLE6_DEVICE_MATRIX §F |
| 160 | TABLET-LAYOFFLEADS-TAPTARGETS | P3 | layoffleads 85–128 small controls on tablets | dev | HQ OPEN → open · %24 c8P23: LIVE (auto-deploy) | — · spec: CYCLE6_DEVICE_MATRIX §F  · %24 c8P23: layoffleads b81e505 (touch: links/inputs/selects/buttons 44px tall, checkbox 24px + full-height label; iPad <44: 183→34, <24: 124→0) |
| 161 | A11Y-012 | P3 | empty-table-header / image-redundant-alt | dev | HQ OPEN → open · %24 c8P23: runwae part: pushed, needs-deploy (GO) | — · spec: CYCLE6_A11Y A11Y-012  · %24 c8P23: runwae fd07868 (logo alt="" beside the 'Runwae' text; axe image-redundant-alt 0) |
| 162 | PERF-007 | P3 | static assets max-age 4h; fingerprint + 1y immutable | dev | HQ OPEN → open | — · spec: CYCLE6_PERF PERF-007 |
| 163 | PERF-008 | P3 | third-party weight 60–90% on tool pages | dev | HQ OPEN → open | — · spec: CYCLE6_PERF PERF-008 |
| 164 | PERF-009 | P3 | json LCP 3.2s TBT 160ms | dev | HQ OPEN → open · %24 c8 P2/P3: main cause gone at HEAD (no Firebase on the json landing since 5f2651e); unused preconnects dropped; font preload not done | — · spec: CYCLE6_PERF PERF-009 · %24 c8: mdo3d 8944c60 |
| 165 | XB-004 | P3 | json + qr log '[Firebase] SDK not loaded.' in all 3 engines | dev | HQ OPEN → pushed, needs-deploy (json); qr open · %24 c8 P2/P3: qr part already fixed at HEAD (no compat SDK tags), needs-deploy | 5f2651e (= JSON-CONSOLE-FIREBASE-SDK-NOT-LOADED) · spec: CYCLE6_BROWSERS XB-004 · %24 c8: qr e3a5134 |
| 166 | XB-005 | P3 | WebKit hash: Firestore Listen channel aborted as pageerror ×2 | dev | HQ OPEN → open · %24 c8 P2/P3: fixed, pushed, needs-deploy (WebKit not runnable on xps: host deps) | — · spec: CYCLE6_BROWSERS XB-005 · %24 c8: hash b174c91 (guest page load no longer queries Firestore history) |
| 167 | SEO-007 | P3 | bare text/plain 404 on 12 hosts | dev | HQ OPEN → open · %24 c8P23: runwae part: pushed, needs-deploy (GO) | — · spec: CYCLE6_SEO_SHARE SEO-007  · %24 c8P23: runwae fd07868 (branded noindex 404.html, status stays 404) |
| 168 | SURF-006 | P3 | no security.txt (27× 404; 12× empty 200) | op | HQ OPEN → open | — · spec: CYCLE6_PUBLIC_SURFACE SURF-006 |
| 169 | SURF-009 | P3 | info leakage in HTML | dev | HQ OPEN → open · %24 c8 P2/P3: mdothree part fixed, pushed, needs-deploy | — · spec: CYCLE6_PUBLIC_SURFACE SURF-009 · %24 c8: same shas as C7-013 (marker is now <!-- SEO -->) |
| 170 | SURF-010 | P3 | rigor.design CSP quality: tools not covered; tighten connect-src | dev | HQ OPEN → partial: rigor tools CSP pushed, needs-deploy | see HEADERS-CSP · spec: CYCLE6_PUBLIC_SURFACE SURF-010 |
| 171 | SURF-011 | P3 | API/CORS posture | dev | HQ OPEN → open | — · spec: CYCLE6_PUBLIC_SURFACE SURF-011 |

**Fixed (verified live):**
- IMAGE-CROP-NOSELECT-NAN (C7, newly closed): cache-busted browser: no selection defaults to 10,8 → 180×135 and downloads (shot c7-03)
- RIGOR-HEADER-SIGNIN-DEAD (resume.rigor.design): Browser cf-02/cf-03 (14:40 ET): both open the auth modal; one console 404 (RIGOR-RESUME-CONSOLE-404)
- DAILYAITOLL-FAVICON-404: C6 HTTP: favicon-32.png 200 (1019 B), sitemap 200 (13537 B), robots 200; minor: /favicon.ico still 404

**Duplicates folded (not queued separately):** C7B-GUIDANCE-NAV-404→GUIDANCE-PROJECT-SPLIT (legacy GUIDANCE-HUB-PATHS-404), C7B-RUNWAE-TEAM-LINK→C7-001 RUNWAE-BLOG-NAV-RELATIVE-LINKS-404; info (not ticketed): C7-022 shared Firebase projects, C7-023 no analytics on 39/40 hosts, C7-024 port 80 untestable, C7B-TAROT-REPEAT (maybe chance), MDO3D-DIRECTORY-MISMATCH→Regenerate array from the real host list. Alias: CONTENT-MDO3D-PLATFORM-COUNT, CONTENT-RONNA-STATS→RONNA-COPY-HONESTY, CONTENT-RONNA-FAKE-RESULTS→RONNA-MOCK-FALLBACK, A11Y-008→RUNWAE-PINCH-ZOOM-BLOCKED, CONTENT-GUIDANCE-SOON-STALE→GUIDANCE-SOON-STALE, CONTENT-MDOTHREE-PRICE→MDOTHREE-PRICE-MISMATCH, CONTENT-STRAY-MARKUP-VISIBLE→MDOTHREE-STRAY-FAVICON, XB-002→RUNWAE-UI, SEO-005→SOFT-200-EMPTY, SURF-001→HEADERS-CSP, SEO-011→IMG-RONNASUB-NO-ICONS

**Cycle 7 quick wins (no Principal decision needed):** QW1 footer legal links on the 9 mdothree tool subs → mdothree.com/terms|privacy (C7-009) · QW2 runwae blog root-relative links (C7-001, C7B-RUNWAE-BLOG-ASSETS-404, C7-015) · QW3 divination disclaimer ×9 (C7-010) · QW4 API 400/413 + shared error handler + tarot/dreams `/api/health` (C7-002/003/016/017) · QW5 small fixes: C7B-PW-NOSETS-EMPTY, C7B-TEXTDIFF-SURROGATE, C7B-COLOR-STALE-RESULT, C7B-PRO-BTN-INVISIBLE, C7-012, C7-018/019/020 · QW6 verify Stripe return URLs (C7-021), replace dead WARN/citation links (C7-005/006). Details in `MDO dev handoff.md` §11A.

**Principal batch (blocks rows above):** Rigor Pro link pause + CF SSL + Vercel env · runwae WAF/deploy/test account · ronna direction (backend vs coming-soon, copy, Sign In, Firebase/Stripe) · jurisdiction · Stripe TEST keys + business names · mdothree Stripe pk/portal/Firebase + price · ★C7 Stripe return URLs, divination disclaimer wording, social handles · guidance which-copy, testimonials, entity name · mdo3d directory owner · tarot/oracle/runes pricing · Vercel Pro + VERCEL_TOKEN + mdothree-text push token · GCP + Mapbox restrictions + Firebase Authorized domains · DMARC/security.txt/DNS (blacklabb, pastlives slugs, leads.mdo3d.com 530) · token rotation · DailyAIToll Stripe + MX · runwaedev/v7 remote · contact receive test.


## Tracked outside HQ's 171 (do not remint; keep)
| ID | P | surface | owner | state | sha/evidence |
|---|---|---|---|---|---|
| HID-001 (+ PROD-013) | P1 | color/hash/password/timestamp: dead + silent if gstatic unreachable (eager Firebase) | dev | in progress (lane P1 agent; overlaps PERF-002) | HQ drop 10-11, `LBL_DROP1011_A.md` |
| HID-002 … HID-017 | P2/P3/INFO | fleet (pdf merge junk, aria-live, offline, runwae SW, reduced motion …) | dev | open | `LBL_DROP1011_A.md` |
| MDO3D-DIRECTORY-MISMATCH | info (HQ folded) | mdo3d.com "14 Live platforms" vs real host list | dev | open | `LBL_MDO_CYCLE8.md` |
| RONNA-LEADS-ICON-404 (intake) | P3 | leads.ronnascanner.com | dev | pushed, needs-deploy | 0a18cbe/3b467d3/e320280/fdc06cd/116ee94 |
| MDOTHREE-TRIAL-PATH-UNVERIFIED (intake) | P2 | json/text/pdf/image/qr trial | dev | pushed, needs-deploy (image LIVE 06f6ec4) | PRO_CHECKOUT_ENABLED gate (e.g. 44ae303, 2502a7d, b7b5c32) |
| DIV-CHECKOUT-UNVERIFIED (intake) | P2 | 9 divination checkout APIs | op | blocked-on-operator (TEST key, S6) | 9/9 health 200, OPTIONS 204, invalid POST 400 |
| POSTPAY-DELIVERY-NEVER-CLOSED / MDO-001 (intake) | P1-class | all paid MDO products; names $2.99 live | op → dev | escalated to Bridge; don't touch names' payment path | — |
| MDO-004 runwae RTDB rules (legacy) | — | runwae | op | code pushed, needs-deploy; rules blocked-on-operator | 8aa6c3e rules, feff003 code |
| MDO-002 leads.mdo3d.com 530 · MDO-003 token rotation · MDO-005 fengshui/pastlives nested remotes (legacy) | — | — | op | open (Principal batch) | — |
| Intake candidates: LEGAL-REAL-PAGES-NO-GOVERNING-LAW, FIREBASE-DUAL-SDK, CONTACT-MISSING, mobile WARN bundle | P3 | see History → "Intake-found (no HQ ID)" below | dev/decision | open / held | — |

## Product GAP backlog (competitor comparison; not defects)
| ID | Pri | Gap |
|---|---|---|
| GAP-HASH-1 | P1 | HMAC + file hashing Pro-only; free at competitors |
| GAP-PW-1 | P1 | Passphrase mode Pro-only; free at Bitwarden/1Password |
| GAP-TRUST-1 | P1 | No legal/privacy on any mdothree tool (= LEGAL-SUBSITES-MISSING) |
| GAP-RONNA-1 | P1 | No pricing table / '50 credits' unbacked |
| GAP-RONNA-2 | P1 | Ronna non-functional vs working competitor free tiers (= RONNA-ENV-SYNTAX/API-404) |
| GAP-RIGOR-1 | P1 | Free quota undemonstrable (API 525); no refund/guarantee/legal |
| GAP-RIGOR-2 | P2 | Narrow feature set vs resume builders |
| GAP-RIGOR-3 | P2 | Only .txt resume upload |
| GAP-RIGOR-4 | P2 | Login modal before first analysis |
| GAP-COLOR-1 | P2 | No image-to-palette picker |
| GAP-TS-1 | P2 | No µs/ns, relative dates, batch |
| GAP-JSON-1 | P2 | 50 KB free cap |
| GAP-JSON-2 | P2 | No tree view/minify/sort/URL load |
| GAP-TEXT-1 | P2 | Diff capped at 5000 chars |
| GAP-PDF-1 | P2 | 6 PDF tools vs 30+; 3-file merge cap |
| GAP-IMG-1 | P2 | Free batch = 1 image |
| GAP-QR-1 | P2 | No SVG/logo QR; no trust line |
| GAP-LL-1 | P2 | History from Jan 2025; no role field |
| GAP-RIGOR-5 | P3 | Every tool 'Beta' while charging $9.99 |
| GAP-COLOR-2 | P3 | Free palettes capped at 3 |
| GAP-HASH-2 | P3 | No SHA-3/XXH/Whirlpool |
| GAP-PW-2 | P3 | No crack-time estimate |
| GAP-TS-2 | P3 | No snippets/2038 explainer |
| GAP-JSON-3 | P3 | No open-source credibility |
| GAP-TEXT-2 | P3 | No grammar/spell |
| GAP-PDF-2 | P3 | Verify 'Compress PDF' works |
| GAP-IMG-2 | P3 | No AVIF; remove-BG is edge detection |
| GAP-LL-2 | P3 | No charts/maps |
| GAP-PROMPT-1 | P3 | 96 prompts vs 275k marketplace |


---
# History (cycle-5 seed; kept verbatim, append-only)

## Legacy rows (2026-09-01) → mapped to cycle 5

| Old ID | Maps to | Note |
|---|---|---|
| MDO-001 | post-pay delivery class (STRIPE-CHECKOUT-*, TAROT-PAID-SPREAD-DEMO; names delivery unproven) | Premium delivery unproven fleet-wide; needs Stripe TEST keys (Principal batch) |
| MDO-002 | leads.mdo3d.com 530 (Principal batch) | Was 502; now 530 |
| MDO-003 | token rotation (Principal batch) | Unchanged |
| MDO-004 | runwae RTDB rules | Rules committed + pushed (738ba95, 8aa6c3e). **Rules deploy NOT done:** lane guardrail "do NOT write runwae Firebase", plus HQ order is code first → needs operator go-ahead |
| MDO-005 | fengshui/pastlives nested remotes | Not in HQ's 50; still open |

**Held for Principal (dev will not guess):** RONNA-COPY-HONESTY, RONNA-SIGNIN-LATARENCE, RONNA-LANDING-DEAD-CTAS (targets), TAROT-PAID-SPREAD-DEMO, GUIDANCE-PROJECT-SPLIT, LEGAL-SUBSITES-MISSING, LEGAL-DATE-2025, MDO3D-FOOTER-GITHUB-404 (org).

## Intake-found (no HQ ID)

Candidates from HQ intake (source: `~/latarence/coordination/dispatch/2026-10-08_MDO3D_hq_cycle5_fix_queue.md` "Screenshot evidence + intake-found candidates"; screenshots per ID in `hq_intake/ASSURANCE.md` + `hq_intake/LBL_MDO_EVIDENCE.md`). Not HQ IDs — do not remint.

| Candidate | Sev | Surface | Note |
|---|---|---|---|
| RONNA-LEADS-ICON-404 | P3 | leads.ronnascanner.com | |
| MDOTHREE-TRIAL-PATH-UNVERIFIED | P2 | json/text/pdf/image/qr 7-day trial | likely dead with empty env |
| DIV-CHECKOUT-UNVERIFIED | P2 | 9 divination `*-api.vercel.app/api/payment/create-checkout` | mode/health unknown |
| POSTPAY-DELIVERY-NEVER-CLOSED | P1-class | fleet, all paid MDO products (incl. MDO-001 names) | names $2.99 escalated to Bridge — do NOT touch names' payment path |
| LEGAL-REAL-PAGES-NO-GOVERNING-LAW | P3 | mdo3d, mdothree, layoffleads, prompts, runwae | held on jurisdiction |
| FIREBASE-DUAL-SDK | P3 | not named | needs source read |
| CONTACT-MISSING | P3 | rigor, ronna, guidance, most divination, dailyaitoll | + dailyaitoll no MX |
| JSON-CONSOLE-FIREBASE-SDK-NOT-LOADED | P3 | json.mdothree | |
| Mobile WARN bundle | P3 | tap targets <40px on mdo3d/mdothree/runwae; tool-nav sideways scroller color/timestamp/password; rigor header wrap; <12px text on layoffleads | |

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
- RONNA-ENV-SYNTAX · pushed, needs-deploy · companies 774120d, contacts c2d534f, emails 8aa0fbe, leads 7465d67, prospects fa74c93 · ronna-other (live md5 still 2f8cc1e5; subs don't auto-deploy; deploy from clean HEAD checkout, working trees hold a broken uncommitted firebase.js)
- SOFT-200-EMPTY (ronna 5 subs) · pushed, needs-deploy · 7e9b1d7/0615b30/a7d3167/f03a159/e08429f · ronna-other (catch-all now 404.html with status 404; rigor half belongs to the rigor cluster)
- RONNA-LEADS-ICON-404 (intake) · pushed, needs-deploy · 0a18cbe/3b467d3/e320280/fdc06cd/116ee94 · ronna-other (manifest icons/icon-{192,512}.png on all 5; leads favicon link)
- RONNA-MOBILE-NAV-HIDDEN · LIVE (auto-deployed) · ronnascanner-landing 8c19188 · ronna-other (menu toggle ≤768px; Sign In/Get Started targets unchanged, HELD)
- RONNA-MOBILE-CARD-OVERFLOW · LIVE (auto-deployed) · ronnascanner-landing 8c19188 · ronna-other (cards 16–359 @375, scrollWidth 375)
- LAYOFFLEADS-MOBILE-TABLE (+ <12px text) · LIVE (auto-deployed) · layoffleads 82223f9 · ronna-other (swipe hint, 620px scroll table, rows 165→95px, 0 nodes <12px; check.mjs passes)
- DAILYAITOLL-FAVICON-404 (+ sitemap) · LIVE (auto-deployed) · dailyaitoll ee58f67 · ronna-other (/favicon-32.png 200; generator writes sitemap.xml)
- MDO3D-HERO-CARDS · LIVE (auto-deployed) · mdo3d-landing 45e8081 · ronna-other (4 hero cards are links to oracle/resume.rigor.design/runwae/guidance)
- HELD · RONNA-COPY-HONESTY, RONNA-SIGNIN-LATARENCE, RONNA-LANDING-DEAD-CTAS (targets), MDO3D-FOOTER-GITHUB-404, LEGAL-* · ronna-other
- RUNWAE-ERROR-LOG-PUBLIC · pushed, needs-deploy · fdad811/24b9ed6 (HEAD 80b8677) · runwae (deploy from clean git archive HEAD, --archive=tgz)
- RUNWAE-PUBLIC-CONFIG-FILES · pushed, needs-deploy · 24b9ed6, d054efb · runwae (js/config.js kept: Mapbox pk. only; live copy is a SyntaxError, fixed in d054efb)
- MDO-004 runwae RTDB rules+code · code pushed needs-deploy; rules blocked-on-operator · 8aa6c3e rules, feff003 code · runwae (77/77 emulator; seed admins/<owner uid> then firebase deploy --only database)
- RUNWAE-PINCH-ZOOM-BLOCKED · pushed, needs-deploy · 9caeba2 (+feff003 admin.html) · runwae
- RUNWAE-SEO-NOT-LIVE · pushed, needs-deploy · ef49ef8 · runwae
- RUNWAE-UI · pushed, needs-deploy · 4c30873 · runwae (Prodcuts→Products w/ 301, Marrch→March; desktop nav visible @1024)
- RUNWAE-ASSETS · pushed, needs-deploy · 4c30873, 80b8677 · runwae (webfontloader path; blog post asset 404s)
- RUNWAE-STATS-NOT-VISIBLE · pushed, needs-deploy · 4c30873 · runwae (honest stats strip ported to /welcome)
- RUNWAE-DEAD-HEADER-LINKS · pushed, needs-deploy · 4c30873 · runwae (0 href="#" on public pages + blog)
- Mobile WARN runwae tap 32px / 10px sideways scroll · pushed, needs-deploy · 4c30873, 80b8677 · runwae (44x44; scrollWidth 375)
### mdothree-divination (cluster MDOTHREE + DIVINATION)
- JSON-FIREBASE-IMPORT (+ JSON-CONSOLE-FIREBASE-SDK-NOT-LOADED) · pushed, needs-deploy · 5f2651e (json), b7b5c32 (text) · dead ./firebase.js shim removed; live still serves old compat-SDK build
- MDOTHREE-STRAY-FAVICON · pushed, needs-deploy · 5f2651e (json), 2502a7d (pdf)
- MDOTHREE-SIGNED-IN-BADGE · pushed, needs-deploy · 49ab0dc hash, c5ce7ff color, a0b9cc3 password, 321738c timestamp · badge only for non-anonymous users
- JSON-BEAUTIFY-EMPTY-SILENT · pushed, needs-deploy · 5f2651e
- IMAGE-CROP-NOSELECT-NAN · LIVE (auto-deploy) · 06f6ec4 · root cause: img measured while hidden (offsetWidth 0)
- HASH-MOBILE-NAV-OVERFLOW · pushed, needs-deploy · 49ab0dc · nav wraps at <=640px, scrollWidth 375
- MDOTHREE-TRIAL-PATH-UNVERIFIED · pushed, needs-deploy (image LIVE) · json/text/pdf/image/qr · trial was dead (empty priceIds + relative /createSubscription); now gated by PRO_CHECKOUT_ENABLED (default off), "Pro coming soon"
- Mobile WARN tool-nav scroller (color/timestamp/password) + json/text hamburger row · pushed, needs-deploy
- NUMEROLOGY-NO-RECALC · pushed, needs-deploy · 5f2651e
- FENGSHUI-A11Y-LABELS · LIVE (auto-deploy) · 827602b
- PASTLIFE-INTEREST-IGNORED · pushed, needs-deploy (pastlives-api) · 5f2651e
- ICHING-COPY-GLITCH · LIVE (auto-deploy) · 0b4336f · also fixed "Without a君王" x14
- GUIDANCE-MOBILE-OVERFLOW, GUIDANCE-MOBILE-CTA-OVERLAP · HELD · rides on GUIDANCE-PROJECT-SPLIT
- DIV-CHECKOUT-UNVERIFIED · read-only probe: 9/9 health 200, OPTIONS 204, invalid POST 400 "Email is required"; Stripe key mode NOT VISIBLE without a session → blocked-on-operator (TEST key)
- RIGOR-PAY-BEFORE-API · pushed, needs-deploy · resume 0dae395, cover 71275c4, interview 2e05672, linkedin 37fd8f1, networking 659c511, portfolio 92e08ca, salary 37c1ee6 · rigor (PRO_CHECKOUT_ENABLED=false in env.js; CTAs "Pro — coming soon" + inline notice; no Stripe/create-embedded-session; enabled path probes API first; live still serves 8k804 until deployed; operator: pause the Stripe link)
- RIGOR-API-525 · blocked-on-operator · api 863d3f2 (unchanged) · rigor (CF CNAME proxied + SSL Full; Vercel has no cert for api.rigor.design → attach the domain to project rigor, DNS-only until cert, env vars; checklist in c5/rigor.md)
- RIGOR-SUCCESS-CANCEL-404 · config verified, needs-deploy · 7 tool SHAs above · rigor (cleanUrls + outputDirectory public; success/cancel.html present)
- RIGOR-HEADER-SIGNIN-DEAD · pushed, needs-deploy · 7 tool SHAs above · rigor (#signin/#signup anchors + hash handler; JS click already worked live)
- RIGOR-EMPTY-INPUT-VALIDATION · pushed, needs-deploy · 7 tool SHAs above · rigor (persistent inline field errors + min lengths; toast kept)
- SOFT-200-EMPTY (rigor 7) · config verified, needs-deploy · 7 tool SHAs above · rigor (404.html + clean config → real 404; live 200/0 B is the legacy deploy)
- HEADERS-CSP (rigor) · landing LIVE 4edcb0a; tools pushed, needs-deploy · rigor (0 CSP violations on xps headless Chrome; allows Firebase/Stripe/fonts/api.rigor.design/CF Insights; inline SW script and inline onclick removed)
