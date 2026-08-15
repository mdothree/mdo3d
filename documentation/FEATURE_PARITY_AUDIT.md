# Feature Parity & Incomplete-Project Audit

**Date:** 2026-08-15
**Method:** Code-level audit of the repo (not docs — prior status docs from March 2026 are stale) plus live HTTP checks of all deployed domains.
**Scope:** Divination platform, mdothree utility platform, landing pages, plugins, and remaining projects.

---

## Executive summary (after all deep-dives, 2026-08-15)

**The #1 structural finding: revenue flows are broken at the last mile, everywhere.**
- Divination (9 services): nobody who pays gets premium unlocked — no frontend calls `/api/payment/verify` (the endpoint exists in every API). Oracle's API URL is a literal placeholder; numerology's premium button has no handler.
- jarvisbee: baby-names takes $2.99 with no fulfillment; business-names premium is an `alert('coming soon')`.
- mdothree: paywall works, but 8/9 tools give subscribers no way to manage/cancel billing (only json has an account page), and the landing page links zero tools ("Coming Soon" on all 9 live products).
- runwae: Stripe Connect OAuth never persists the account mapping; no payment webhooks — payouts can't reliably work.
- ronnascanner: 3 of 5 prospecting tools have no backend at all and silently show fabricated data.
- rigor is the exception — payments, portal, and webhooks all work — but its landing page calls 5 live tools "Coming Soon" and omits one entirely.

**The #2 structural finding: marketing surfaces don't reflect what's built.** Four deployed, working divination tools (iching, runes, names, pastlife) are linked from no landing page; rigor and mdothree landings both say "Coming Soon" about live products; blacklab's hub links to domains that don't resolve; `numerology.mdo3d.com` serves the broken duplicate app while the finished one is dark.

**The #3 structural finding: the ops layer was designed and never switched on.** All 10 monitoring-loop specs in `loops/` are complete; zero run. site-health needs no credentials and would have caught every outage found in this audit: leads.mdo3d.com 502 (2+ months, tunnel/Docker down on littlemini + unbuildable frontend), api.rigor.design and api.ronnascanner.com 525s, dead blacklabb.com subdomains.

**Quickest wins by effort:** fix rigor + mdothree landing pages (~1h, makes 16 live products discoverable) · ship discord + telegram bots (complete, deploy-only) · add 4 icon PNGs to unblock the chrome extension · run `loops/site-health` (ready today).

**Biggest build item:** one shared payment-verification/entitlement pattern (mdothree's webhook→Firestore approach already works) rolled out across divination, jarvisbee, and runwae.

*(Housekeeping notes on committed credentials are in the per-project deep-dives; not a functionality item.)*

---

## Live deployment check (2026-08-15)

All 12 mdo3d.com domains and all 10 mdothree.com domains return **200**, with one exception:

- **`leads.mdo3d.com` → 502** — broken since at least 2026-07-12 (2+ months). Backend on littlemini via Cloudflare Tunnel; `STRIPE_WEBHOOK_SECRET` also still unset. **This is the only dead production surface.**

---

## 1. Divination platform (projects/divination/ — 9 services)

APIs are at full parity: all 9 services have complete backends with Claude AI + Stripe. **All gaps are frontend and persistence.**

| Gap | Affected services | Key paths |
|-----|-------------------|-----------|
| No dark/light theme toggle | **All 9** | every frontend `index.html` / CSS |
| Firebase persistence unfinished (premium status not persisted after payment; "save reading" is a TODO/"coming soon" alert) | **All 9** | `shared/services/stripeService.js:50`; `oracle/oracle-cards/public/js/app.js:323,337,341` |
| Analytics only on `cancel.html`, not wired to reading events | All (partial in oracle/tarot/dreams) | main `index.html` files |
| Hardcoded Stripe Payment Links instead of API checkout | Fengshui, Pastlives (Next.js apps) | `fengshui/feng-shui-analyzer/app/page.tsx:170`, `pastlives/past-life-insights/app/page.tsx:163` |
| Missing Open Graph tags | Fengshui | `fengshui/feng-shui-analyzer/public/index.html` |
| Missing favicon | Numerology, Oracle, Runes, Tarot | each `public/index.html` |
| No social links in footer | All 9 | footer sections |

**Duplication:** `projects/blacklab/{dreams,oracle,tarot}` are byte-for-byte identical to the divination copies — two checked-in copies of the same codebase. Pick one canonical location.

**Stack drift:** Fengshui/Pastlives are Next.js with inline styles and hardcoded payment links; the other 7 are vanilla JS with API-driven checkout. The two Next.js apps lag the vanilla pattern. Pastlives also carries leftover old `js/app.js` files alongside the Next.js app.

---

## 2. mdothree utility platform (projects/mdothree/ — 9 tools)

All 9 tools deployed and live. Parity gaps:

| Gap | Detail |
|-----|--------|
| **Dark mode: only 2/9 tools** | color and qr have it; hash, image, json, password, pdf, text, timestamp do not |
| **image tool has no copy button** | every other tool has one |
| **Stripe code duplicated 10×** | Copied into every tool + landing; deep-dive confirms copies are currently byte-identical (no drift yet) but any change still requires 10 edits. Shared version at `shared/mdothree/stripe-paywall.js` unused |
| **Landing links only 7/9 tools** | `projects/mdothree/landing/public/index.html` is missing password and timestamp; footer links to "Lamar" instead of the MDO3D ecosystem; no OG tags, no analytics, no social footer |
| Staleness | only json touched after 2026-03-20 |

---

## 3. Landing pages

The theme toggle + cursor tracker just added to `landing/mdo3d-static/` (uncommitted) exist **nowhere else**:

| Page | Theme toggle | Cursor tracker | OG tags | Analytics | Social footer |
|------|:---:|:---:|:---:|:---:|:---:|
| landing/mdo3d-static | ✅ (new) | ✅ (new) | ✅ | ✅ | ✅ |
| landing/mdo3d-portfolio | ❌ | ❌ | ✅ | ✅ | ✅ |
| projects/mdo3d/landing + guidance | ❌ | ❌ | ✅ | ✅ | ✅ |
| projects/blacklab/landing | ❌ | ❌ | partial (no Twitter card) | ❌ | ❌ |
| projects/mdothree/landing | ❌ | ❌ | ❌ | ❌ | ❌ |
| landing/mdo3d-compare | ❌ | ❌ | ✅ | ❌ | ❌ |

**Duplicate landing pages:** `projects/mdo3d/landing/` and `projects/mdo3d/guidance/` are stale duplicates of `landing/mdo3d-static/` (same content, older, light-mode-only, no new features). Archive or redirect them so there is one source of truth.

**Tool coverage on landings:** all mdo3d landing variants link only 6 of 11 divination tools (oracle, dreams, tarot, numerology, astrology, fengshui) — **iching, runes, names, pastlife are deployed and live but not linked anywhere**.

---

## 4. Plugins (plugins/)

| Plugin | Status | Ship-blocker |
|--------|--------|--------------|
| discord-divination-bot | **Complete (~95%)** | Just deploy + replace `patreon.com/your-bot-name` placeholder |
| telegram-oracle-bot | **Complete (~95%)** | Just register with @BotFather + deploy; Telegram Stars payments implemented |
| chrome-divination-tab | Partial (~80%) | **Icon PNGs missing** (referenced in manifest, don't exist → extension won't load); 3-card spread TODO; no Stripe |
| shopify-oracle-app | Skeleton (~30%) | References `../shared/cardDatabase.js` which **does not exist → crashes on start**; no React client; no Prisma schema |
| wordpress-divination-blocks | Skeleton (~20%) | `block.json` metadata exists but **all block implementation files (edit.js/frontend.js/style.css) missing**; card DB has 5 of 44 cards |
| chrome-tea | Empty | Directory contains nothing |

**Cross-plugin parity:** each bot hardcodes its own copy of the 44-card database (no shared source); feature sets diverge — Celtic Cross only in Telegram, affirmations/moon phase only in Chrome+Discord, 3-card spread missing from Chrome.

---

## 5. Other projects

| Project | Status | Notes |
|---------|--------|-------|
| **leads** | **Broken** — see deep-dive | BOTH frontend and API 502 → tunnel/host down on littlemini; frontend Docker build also broken (no package-lock.json); **live Stripe secret key committed in `web/backend/.env`** |
| **ronnascanner** | Partial (~50%) — see deep-dive | 5 prospecting tools have complete frontends but 3 have NO backend endpoint (mock data shown to users); resume-analyzer's PDF parsing is a stub; duplicate resume product vs rigor |
| **rigor** | ~~Undocumented~~ **Near-complete** (see deep-dive below) | 7/8 tools production-ready and live at *.rigor.design; landing page badly stale |
| **jarvisbee** | Mixed (see deep-dive below) | career-horoscope abandoned; babynames takes payment with no fulfillment; businessnames premium is a "coming soon" alert; numerology.mdo3d.com domain conflict with divination |
| **external/runwae** | Partial (~75%) — see deep-dive | Live influencer-marketing platform at runwae.com; payments unhardened; **live Stripe keys committed in repo doc** |
| **shared/trauma** | Abandoned | Full api+frontend structure, no recent activity |
| **external/dailyaitoll** | Complete | Data pipeline healthy (last update 2026-08-06); no frontend — candidate content-generator source per STATUS.md |
| **shared/** adoption | Split | `stripeService.js` + `SocialShare`/`ShareImageGenerator` genuinely reused by ~8 projects ✅; the entire `shared/mdothree/` module (14 files) is unused ❌ |

---

## Prioritized recommendations

**P0 — broken in production**
1. Fix `leads.mdo3d.com` 502: both frontend and API are down → check cloudflared/Docker on littlemini first; then commit the missing frontend package-lock.json; then set `STRIPE_WEBHOOK_SECRET`.
2. Fix payment fulfillment across divination + jarvisbee: no service unlocks premium after checkout (details in deep-dives).

**P1 — highest-leverage parity fixes**
2. Backport theme toggle + cursor tracker from `landing/mdo3d-static/` to the other 5 landing pages and (optionally) the 9 divination frontends.
3. Add the 4 missing deployed tools (iching, runes, names, pastlife) to all landing/guidance pages; add password + timestamp to the mdothree landing.
4. Migrate mdothree tools to `shared/mdothree/stripe-paywall.js` (or delete the shared copy) — 10-way Stripe duplication is the biggest maintenance risk.
5. Kill the blacklab/divination duplicate codebases — pick one canonical copy of dreams/oracle/tarot.

**P2 — quick revenue-adjacent wins**
6. Ship Discord + Telegram bots (both essentially done — deploy-only).
7. Add the 4 missing icon PNGs to chrome-divination-tab so it loads, then finish 3-card spread.
8. Fix divination payment fulfillment — **no service verifies payment or unlocks premium after checkout** (see API-wiring deep-dive); also fix oracle's placeholder API URL and numerology's dead premium button.

**P3 — decide and document**
9. Rigor, jarvisbee, ronnascanner skeleton dirs, shared/trauma: decide keep/kill and add a README or STATUS to each keeper.
10. Dark mode for the 7 mdothree tools lacking it; copy button for the image tool; favicons + OG tags for the divination stragglers.

---

# Deep-dive audits (loop, started 2026-08-15)

Per-project deep audits, one per loop iteration. Progress:

- [x] **rigor** (2026-08-15, below)
- [x] **jarvisbee** (2026-08-15, below)
- [x] **external/runwae** (2026-08-15, below)
- [x] **ronnascanner** (2026-08-15, below)
- [x] **leads** (2026-08-15, below)
- [x] **mdothree** (2026-08-15, below)
- [x] **divination** (2026-08-15, below)
- [x] **blacklab/research + misc dirs + repo-wide missing sweep** (2026-08-15, below)
- [x] **plugins** (2026-08-15 — ship-blockers verified on disk: chrome icons dir contains only README.md; shopify `shared/` dir doesn't exist so `server/index.js` crashes on require; wordpress blocks contain only `block.json` (no edit.js/frontend.js/style.css); chrome-tea directory no longer exists; discord + telegram bots have complete src and are deploy-ready)

**Loop complete — all 10 areas audited.**

---

## Deep-dive: rigor (2026-08-15)

**Corrects the surface audit above** — rigor is NOT a skeleton. It is a near-complete career-tools suite: 1 serverless API + 8 frontend micro-apps, all deployed to Vercel and **all live** (checked 2026-08-15: rigor.design and all 8 tool subdomains return 200; only `api.rigor.design` returns **525** — Cloudflare↔origin SSL failure — worth verifying which API URL the frontends actually call).

**What's complete (7/8 tools production-ready):** resume, cover, interview, linkedin, salary, portfolio, networking. Every tool has: Firebase auth, Firestore save/usage tracking, Stripe paywall (Free / Pro $9.99 / Team $29.99), Claude-powered API endpoint (12 endpoints total incl. 4 payment endpoints with webhook + customer portal), OG tags, favicon, PWA manifest + service worker, mobile responsive. Fallback/mock data on API failure in interview, salary, portfolio, networking.

**Gaps (ranked):**
1. **Landing page is badly stale** (`projects/rigor/landing/index.html`): marks 5 deployed tools as "Coming Soon", omits the networking tool entirely (shows 6 of 8), and the hero CTA links to old `resume-analyzer.vercel.app` instead of `resume.rigor.design`. ~20-minute fix, high impact — the marketing layer says the product doesn't exist.
2. **api.rigor.design → 525** (SSL error). Verify frontend API base URLs; fix Vercel/Cloudflare SSL if this host is used.
3. **Bug:** linkedin tool references undefined `serverTimestamp` in its Firestore save (`projects/rigor/linkedin/public/` app.js ~line 49) — likely runtime error on save.
4. No analytics tags in any tool; no tests; service files (auth/paywall/payment) copied per-tool rather than shared (15 files × 8 apps).

---

## Deep-dive: jarvisbee (2026-08-15)

Three loosely related tools grouped with no README; the name conflicts with DOMAIN_MAPPING.md (which reserves jarvisbee.com for Tarot). Note: **jarvisbee.com itself is live (200)** — verify what's actually deployed there vs. the documented plan.

| Subproject | Status | Live domain | Key gaps |
|-----------|--------|-------------|----------|
| career/career-horoscope | **Abandoned skeleton** | none | 2 source files, placeholder text only, no data/engine/deploy. Decide: build (~20h) or delete. |
| babynames/baby-name-oracle | Partial (~50%) | names.mdo3d.com (200) | **Only 20 hardcoded names** while copy promises "thousands" (`public/js/app.js`). Stripe Payment Link ($2.99) works but **no fulfillment** — buyer pays, nothing is delivered (success page is a stub). No analytics, no og:image, no dark mode. |
| businessnames/business-name-generator | Partial (~70%) | numerology.mdo3d.com (200) | Premium button is `alert('Payment integration coming soon!')` (`public/js/app.js:175`) despite a commit message claiming "Stripe checkout complete". "AI-powered interpretation" advertised but **no Claude integration exists**. |

**Cross-cutting findings:**
1. **Domain conflict:** business-name-generator's canonical is `numerology.mdo3d.com`, but `projects/divination/numerology/numerology-app/` also targets that domain (per IMPLEMENTATION_STATUS.md). Two codebases claim one domain — determine which Vercel project actually serves it and retire the other.
2. **Numerology engine duplicated 3×**: `shared/utils/numerology.js`, `businessnames/.../src/numerologyDatabase.js`, and inline again in `businessnames/.../public/js/app.js`. Consolidate to the shared lib.
3. **Revenue risk:** baby-names takes payment with no product delivery; business-names advertises premium it can't sell. Both are false-advertising/refund risks as deployed.
4. Nonexistent subdomains (career/horoscope/babynames/businessnames.mdo3d.com) don't resolve — fine, but career-horoscope has no domain plan at all.

---

## Deep-dive: external/runwae (2026-08-15)

**Identity:** Influencer-marketing platform (creators ↔ brands, 5-step gig workflow: proposal → payment → post → verify → payout). Live at **runwae.com (200)**. Stack: static HTML/jQuery frontend + Vercel serverless Node backend + Firebase RTDB + Stripe Connect + Claude (proposal generation). Standalone — no shared/ imports, no mdo3d.com branding. Status: **~75% complete, actively modernized through 2026-07** (theme toggle, toasts, a11y, XSS-safe rendering all done).

**🔴 SECURITY (act immediately):**
1. **Live Stripe secret + publishable keys committed in `runwae/RUNWAE_IMPROVEMENT_PLAN.md:56-61`** (`sk_live_…`, `pk_live_…`, plus test keys). Rotate the live secret key in Stripe and scrub the doc — same class of leak as the GitHub token in MDO3D_GAP_ANALYSIS.md:175.
2. **Firebase rules too permissive** (`database.rules.json`): any authenticated user can write any path — users can modify each other's data.
3. Outdated Firebase SDK 8.2.1 (2021) loaded in all HTML; LLM API has `Access-Control-Allow-Origin: *`.

**Functional gaps (ranked):**
1. **Payments unhardened:** uses deprecated Stripe Charges API (should be Payment Intents); **no webhook handlers** for payment events; **Stripe Connect OAuth callback exchanges the code but never persists the account mapping** (`api/payment/connect-oauth.js`) — influencer payouts can't reliably work.
2. Stripe keys not confirmed in Vercel env vars (documented as "to add").
3. LLM rate limiting is in-memory only (`api/llm/generate-proposal.js:48`) — resets per invocation, trivially bypassed.
4. May-2026 UI modernization shipped but its own testing checklist (`runwae/STATUS.md:141-151`) was never executed.
5. Blog is hand-written static HTML; admin.html (139 KB) has unknown/undocumented scope.

**Parity note:** runwae has the theme toggle, toast system, and accessibility layer the rest of the ecosystem lacks — it's ahead of the mdo3d properties on UX polish while behind on payment robustness.

---

## Deep-dive: ronnascanner (2026-08-15)

B2B prospecting suite + resume analyzer. **ronnascanner.com is live (200)**; `api.ronnascanner.com` returns **525** — the same Cloudflare↔origin SSL failure as `api.rigor.design` (likely one shared misconfiguration; fix once).

**Corrects the surface audit:** the 5 prospecting dirs are NOT empty skeletons — each has a ~90-file **complete frontend** (auth, paywall, Firestore history, CSV export, mock-data fallback). The incompleteness is in the API:

| Tool | Frontend | Backend endpoint | Net effect |
|------|----------|------------------|-----------|
| companies | ✅ complete | ❌ `/api/companies/scan` doesn't exist | renders mock data only |
| contacts | ✅ complete | ❌ `/api/contacts/find` doesn't exist | renders mock data only |
| prospects | ✅ complete | ❌ `/api/prospects/research` doesn't exist | renders mock data only |
| emails | ✅ complete (4 modes) | ⚠️ 1 of 4 modes (Hunter.io single lookup) | domain/verify/bulk modes fake |
| leads | ✅ complete | ⚠️ Apollo.io search only, no enrichment | works, thin |

Payment endpoints (checkout, embedded, portal, webhook) are complete. But: **rate limiting is documented in the README and doesn't exist** (`_middleware/rateLimit.js` missing), and CLEARBIT/ZOOMINFO env vars are declared but never used.

**resume-analyzer (~60%):** ATS scoring engine is real, but **PDF/DOCX parsing is a stub returning mock text** (`resume-analyzer/public/js/parsers/resumeParser.js:47-62` — "TODO: Implement actual PDF parsing"), so every score is computed against fake content. Auth sign-in modal is a TODO; its Express backend (`ronnascanner/api/src/server.js`) is orphaned/unfinished and separate from ronnascanner-api.

**Duplicate product:** both resume tools are deployed and live — rigor's (resume.rigor.design, complete per the rigor deep-dive) and this one (resume-analyzer.vercel.app). Two live ATS resume scorers with separate codebases; consolidate on rigor's (the more finished one) or make deliberate.

**Honest-UX risk:** all 5 tools silently fall back to mock data when the API fails/doesn't exist — paying users would see fabricated companies/contacts with no "demo data" indicator.

**No committed secrets found** in this project (clean .env.example pattern).

---

## Deep-dive: leads (2026-08-15)

FL Sunbiz lead-gen platform: Python pipeline + FastAPI backend (port 8050) + React/Vite frontend (port 3050), Dockerized on littlemini behind a Cloudflare Tunnel.

**502 root cause (evidence-ranked):** Live probe 2026-08-15 shows **both `leads.mdo3d.com` and `leadsapi.mdo3d.com` return 502** — including `leadsapi.mdo3d.com/health`. Since the two domains route to different containers, the shared failure point is upstream:
1. **Most likely: cloudflared tunnel daemon or Docker stack down on littlemini** (both ports unreachable). First check on littlemini: `systemctl status cloudflared` and `docker ps`.
2. **Even once the tunnel is back, the frontend can't build:** `web/frontend/` has **no `package-lock.json`**, and its Dockerfile runs `npm ci`, which hard-fails without one. Run `npm install` locally and commit the lockfile.
3. `STRIPE_WEBHOOK_SECRET` unset breaks webhook verification (`web/backend/api.py:32,572`) — not the 502 cause (fails on first payment, not on boot), but blocks revenue once live.

**🔴 SECURITY:** `web/backend/.env` is **committed with a live Stripe secret key (`sk_live_…`) and webhook secret (`whsec_…`)**. Rotate in Stripe, add `web/**/.env` to .gitignore, purge from history. (Third live-credential leak found in this repo, after MDO3D_GAP_ANALYSIS.md:175 and runwae's improvement plan.)

**Component status:** Python pipeline (src/runner.py, 1229 lines) is production-ready — SFTP download, parsing, filtering, Apollo/DuckDuckGo enrichment, MX/SMTP validation, Mailgun/SendGrid delivery, cron management, zero TODOs. Backend API is code-complete (profiles CRUD, checkout, webhook, redeem-code, health). Frontend is structurally complete (8 pages: login, onboarding, dashboard, leads, pipeline, billing, settings) but has never had a committed lockfile/build. Docs are strong (DEPLOYMENT.md, PORT_ALLOCATION.md); minor doc bug: install.sh says port 5050, actual is 8050.

**Fix order:** rotate Stripe keys → restore tunnel/Docker on littlemini → commit frontend lockfile + verify `npm run build` → set STRIPE_WEBHOOK_SECRET → end-to-end payment test.

---

## Deep-dive: mdothree (2026-08-15)

Corrects several surface-audit findings:

**Premium flow is technically sound.** Two implementation groups, each internally byte-identical (MD5-verified, zero drift): Group A (color, hash, password, timestamp, landing) uses config-based `subscriptionService.js`/`paywallUI.js` with Payment Element + `buy.stripe.com` fallback; Group B (json, pdf, text, qr, image) uses env-based `stripe-paywall.js` with SetupIntent via Firebase Cloud Functions. Premium status is webhook-written to Firestore `subscriptions/{uid}` — **no localStorage bypass possible**. No committed secrets (backend keys live only in Cloud Function env).

**Real gaps (ranked):**
1. **Landing page links nothing.** All 9 tool cards are static "Coming Soon" divs — zero `<a>` tags — while every tool is live at *.mdothree.com (`landing/public/index.html`). Worse than the earlier "7/9 linked" finding.
2. **8/9 tools have no account/billing page.** Only json (updated 2026-04-30) has `pages/account.html` with subscription status, trial end date, and `openBillingPortal()`. Buyers of the other 8 tools **cannot manage or cancel their subscription** from the product. Backport json's account page.
3. **Dark mode split (corrected):** json, pdf, text, qr, image have `prefers-color-scheme: dark`; **color, hash, password, timestamp do not** (Group A = the older pattern).
4. **Free limits under-enforced client-side:** `FREE_LIMITS` (pdf 3 files/10MB, json 50KB, qr batch 5, text diff 5k chars, image batch 1) exist but e.g. json's UI doesn't pre-check size — users hit server errors instead of upsell prompts.
5. Modal advertises "7-Day Free Trial" with no trial countdown anywhere except json's account page; image tool still lacks a copy button.

**Free/premium limits per tool** (from `mdothree-color/public/js/config/stripe.js:45-76` + `FREE_LIMITS`): json 50KB→unlimited+JSONPath; pdf 3×10MB→500MB; image 1/batch→500MB batches; qr 5→1000/batch; text 5k chars→unlimited+export; color 3 palettes→unlimited+colorblind sim+gradient; hash 10/batch→bcrypt+HMAC+file check; password 5→breach checker+passphrase+bulk; timestamp 5 history→cron parser+timezones+business days.

**Backport checklist (json → the other 8):** account page, history loading, billing portal link, client-side FREE_LIMITS guards; plus dark-mode CSS to the 4 Group-A tools.

---

## Deep-dive: divination API wiring & payments (2026-08-15)

Live checks: all 6 Vercel APIs (iching, runes, astrology, fengshui, pastlives, numerology) return healthy.

**🔴 The platform-wide revenue defect: no service unlocks premium after payment.** Every API implements `/api/payment/verify`, but **zero frontends call it**. The 6 hardcoded-link services send users to buy.stripe.com with no return handler; the 3 dynamic-checkout services (tarot, oracle, dreams) redirect to checkout and never verify the session. A paying customer on any of the 9 services gets nothing unlocked automatically. This is the concrete mechanism behind the "premium status not persisted" TODO — fixing it means: success-URL return handler → call `/api/payment/verify` → persist entitlement (Firestore or signed token) → unlock. Consider adopting mdothree's webhook→Firestore pattern, which already works.

**Service × wiring matrix:**

| Service | Prod API URL | Checkout | Verify called |
|---------|-------------|----------|---------------|
| tarot | tarot-cards-api.railway.app (manual deploy) | dynamic `/create-checkout` (`app.js:319`) | ❌ |
| oracle | **`https://your-api-url.com` — literal placeholder, broken** (`oracle-cards/public/js/config/api.js:6-9`) | dynamic (API broken) | ❌ |
| dreams | dream-interpreter-api.railway.app (manual deploy) | dynamic | ❌ |
| iching | iching-api.vercel.app ✅ | hardcoded buy.stripe.com (`index.html:136`) | ❌ |
| runes | runes-api.vercel.app ✅ | hardcoded (3 links) | ❌ |
| astrology | astrology-api-alpha.vercel.app ✅ | hardcoded (3 links) | ❌ |
| fengshui | fengshui-api-eosin.vercel.app ✅ | hardcoded (`page.tsx:254`) | ❌ |
| pastlives | pastlives-api.vercel.app ✅ | hardcoded (`page.tsx:252`) | ❌ |
| numerology | numerology-api.vercel.app ✅ | **none — modal button has no onclick** (`index.html:133`) | ❌ |

**Domain conflict resolved (live check):** `numerology.mdo3d.com` currently serves the **jarvisbee Business Name Generator** (title verified, with its broken "coming soon" premium) — NOT the divination numerology-app, despite the latter having full API integration and its own Vercel project (`prj_4U7AKYkU…`). The finished app is dark; the broken duplicate is in production. Repoint the domain or consolidate.

**Other findings:** tarot/oracle/dreams backends are not on Vercel — tarot/dreams on Railway (manual, unmonitored), oracle's API effectively undeployed. Six services use untrackable hardcoded Payment Links while three use dynamic checkout — standardize on one pattern.

---

## Deep-dive: incomplete & missing inventory — blacklab, loops, social, misc (2026-08-15)

The "designed but never executed" layer of the repo:

**1. loops/ — control plane fully specced, ZERO loops running (highest-leverage gap).** All 10 loop specs are complete, cold-runnable markdown (site-health, ui-smoke, firebase-health, security-scan, revenue-cost, usage-rollup, status-rollup, deploy-drift, social-content, _TEMPLATE). None is scheduled. **site-health needs no credentials and could run today** — it would have caught the leads 502 and the two 525s months ago. Four loops are blocked on one pending decision (read-only service account vs admin SA — open in loops/INBOX.md); social-content is blocked on item 2.

**2. social/ — pipeline blocked on a missing editorial calendar.** Brand system + 12 ready-to-publish post frames exist (`social/*.dc.html`), but `social/data/` contains only `.gitkeep` — the calendar the social-content loop and review dashboard's social lane both wait on was never created. Also `comms/voice/VOICE_AND_GUIDELINES.md` has two explicit TODOs (brand register, per-tool claims) gating on-brand drafting.

**3. blacklab — landing links to dead sites.** The hub page (`projects/blacklab/landing/`) links three tracker sites, but live checks show **blacklabb.com → 404 and quantum/space/neuro.blacklabb.com don't resolve**. The three tracker codebases in `projects/blacklab/research/` are deployable static shells with no data-ingestion pipeline (Firebase "planned"). Either deploy + build feeds, or unlink from the hub.

**4. Scaffolding-bug artifact dirs (brace-expansion failure)** — literal directories named `{css,js` / `{styles,constants,utils,components,pages}` exist in mdothree-timestamp/color/hash/password, rigor/networking, rigor/api, and **projects/leads/web/frontend/src/** (related to the leads build breakage). Delete and verify the intended dirs exist.

**5. Other incomplete/missing items:**
- `projects/mdo3d/create-divination-payment-links.js`: complete script, but no `.env` anywhere consumes `STRIPE_PAYMENT_LINK_*` outputs; the divination frontends' hardcoded links were wired manually. Guidance app is shell HTML with a stray nested `guidance/mdo3d/` deploy artifact.
- `shared/trauma/`: half-built ACE (Adverse Childhood Experiences) assessment — Express+Stripe API scaffold and bare HTML, **no assessment form, no scoring logic**. Decide keep/kill.
- `utilities/crypto-arbitrage/`: genuinely working dry-run bot (Coinbase+Kraken monitoring); Kraken authenticated trading unimplemented; never scheduled.
- `marketing/`: one orphan CSV — effectively abandoned. `agents/`: README-only, both planned agents (arbitrage-agent, openclaw) unbuilt.
- `review/` dashboard: working (projects + docs lanes live); social lane empty pending calendar; monitoring lane planned but `monitoring.json` never written (no loops run).
- Repo-wide "coming soon" strings persist in 8 first-party surfaces (landing pages, oracle app, chrome extension, mdothree landing) — each is a promised-but-missing feature marker.

---

# Implementation log (2026-08-15)

**Shipped (local edits, pending deploy):**
- `landing/mdo3d-static/` index + guidance: all divination links fixed from 404ing `guidance.mdo3d.com/<tool>` paths to live `<tool>.mdo3d.com` subdomains; astrology/fengshui corrected to Live; iching/runes/names/pastlife added (10 tools now listed everywhere).
- `projects/rigor/landing/index.html`: 8 tools Live + linked to *.rigor.design; networking added; hero CTA fixed.
- `projects/mdothree/landing/public/index.html`: 9 live tools linked (was 12 unlinked "Coming Soon" divs).
- `projects/blacklab/landing/public/index.html`: tracker cards changed from links-to-dead-domains to honest "Coming Soon" (unlink when trackers deploy → relink).
- Rigor save bug fixed in 5 tools (linkedin, networking, interview, salary, portfolio): undefined `serverTimestamp` removed — `saveDoc()` already stamps `createdAt`. Cover verified unaffected.
- `projects/leads/web/frontend/package-lock.json` generated (unblocks `npm ci` in Docker build).
- `plugins/chrome-divination-tab/icons/`: icon16/32/48/128.png generated — extension now loadable.
- Deleted 7 brace-expansion artifact dirs (`public/{css,js` etc.) in mdothree ×4, rigor ×2, leads.

**Blocked during implementation — new findings (all deploy/config, not code):**
1. **numerology API has no `STRIPE_SECRET_KEY`** — live POST to create-checkout returns Stripe "no API key" error. Wiring the frontend button is pointless until the env var is set in that Vercel project.
2. **mdothree Group A (color/hash/password/timestamp) backend is dark in prod:** `/api/stripe/create-setup-intent` and `/api/stripe/portal` both 404 on the live domains (no rewrites in vercel.json, functions live in mdothree-api, undeployed to those hosts). Its `STRIPE_CONFIG.portalUrl` is a literal `…/REPLACE` placeholder. So Group A's embedded checkout always falls back to payment links, and account-page backport is blocked until an API base exists.
3. **mdothree Group B env injection missing in prod:** live json.mdothree.com serves no `window.__ENV__`/env meta tags → `FIREBASE_FUNCTION_BASE_URL` is empty at runtime, so the account page's billing portal call and SetupIntent checkout likely fail in production despite correct code. Verify Vercel build runs the config injection step.

---

*Related docs: [MDO3D_GAP_ANALYSIS.md](MDO3D_GAP_ANALYSIS.md) (2026-03, stale), [../projects/divination/IMPLEMENTATION_STATUS.md](../projects/divination/IMPLEMENTATION_STATUS.md) (2026-03), [../STATUS.md](../STATUS.md).*
