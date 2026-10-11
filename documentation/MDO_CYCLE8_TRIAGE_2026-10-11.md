# MDO cycle 8 intake triage (2026-10-11)

**Lane:** MDO developer (Builder·MDO3D). Doc/triage only: no deploys, no keys.
**Source:** MDO HQ cycle-8 drop `~/Downloads/MDO_CYCLE8_EVIDENCE_2026-10-09/`:
- `FLEET_FIX_QUEUE_DRAFT.md`: 240 lines, 171 open.
- `MDO dev handoff.md`: §1A.4 unblock sheet, §11A quick wins.

**Intake reads:**
- `~/latarence/coordination/hq_intake/LBL_MDO_CYCLE8.md`
- `LBL_DROP1011_A.md`
- `LBL_DROP1011_B.md` §2c
- `ASSURANCE.md` "MDO — cycle 8 … NEW vs this tracker"

**Lane log:** `~/latarence/coordination/dispatch/2026-10-08_MDO3D_hq_cycle5_fix_queue.md`.

## 1. Queue re-seed

`grok/FLEET_FIX_QUEUE.md` has been re-seeded from HQ's cycle-8 draft:
- 171 rows. HQ IDs and HQ order are kept verbatim.
- Counts: P0 5 · P1 23 · P2 65 · P3 78.
- New columns: HQ ID · P · surface · owner (op/dev/decision) · state (`HQ status → lane state` + S/QW tag) · sha/evidence.
- Severity changes applied: RUNWAE-PINCH-ZOOM-BLOCKED → P1; MDOTHREE-STRAY-FAVICON → P2; PASTLIFE-INTEREST-IGNORED → P2. The draft already carries all three.
- Every cycle-5 lane state and SHA is mapped onto its carried-over ID. The cycle-5 legacy rows, intake-found rows, dev log and status lines are kept verbatim under "History".
- A "Tracked outside HQ's 171" section holds items that aren't HQ IDs:
  - HID-001…017 / PROD-013 (drop A)
  - MDO3D-DIRECTORY-MISMATCH
  - the intake candidates
  - legacy MDO-00x

**Lane state across the 171:**

| Lane state | IDs |
|---|---|
| Pushed, needs-deploy (GO) | RIGOR-PAY-BEFORE-API, RUNWAE-ERROR-LOG-PUBLIC, RUNWAE-PUBLIC-CONFIG-FILES, RONNA-ENV-SYNTAX, RONNA-MOCK-FALLBACK, CONTENT-RONNA-VENDOR, RIGOR-SUCCESS-CANCEL-404 (config), RUNWAE-PINCH-ZOOM-BLOCKED, RUNWAE-SEO-NOT-LIVE, RUNWAE-UI, RUNWAE-ASSETS, RUNWAE-DEAD-HEADER-LINKS, RUNWAE-STATS-NOT-VISIBLE, MOBILE-RUNWAE-HSCROLL, SOFT-200-EMPTY, NUMEROLOGY-NO-RECALC, PASTLIFE-INTEREST-IGNORED, MDOTHREE-STRAY-FAVICON, HASH-MOBILE-NAV-OVERFLOW, RIGOR-HEADER-SIGNIN-DEAD-REST, JSON-FIREBASE-IMPORT, XB-004 (json), MDOTHREE-SIGNED-IN-BADGE, JSON-BEAUTIFY-EMPTY-SILENT, RIGOR-EMPTY-INPUT-VALIDATION |
| Partial (pushed, rest open) | C7-001, C7B-RUNWAE-BLOG-ASSETS-404, IMG-RONNASUB-NO-ICONS, A11Y-013 (runwae), HEADERS-CSP (rigor landing LIVE, rigor tools needs-deploy, mdothree ×4 restore staged), SURF-010 |
| LIVE via lane auto-deploy; HQ still lists them NEEDS RE-CHECK / OPEN | RONNA-MOBILE-NAV-HIDDEN, RONNA-MOBILE-CARD-OVERFLOW, LAYOFFLEADS-MOBILE-TABLE, ICHING-COPY-GLITCH, MDO3D-HERO-CARDS, FENGSHUI-A11Y-LABELS (HQ says OPEN) |
| In progress (lane P1 agent, 10-11) | RONNA-APIFETCH-DOUBLE-JSON, RUNWAE-OUTPUTDIR-ROOT, PERF-002 (via HID-001 lazy Firebase), RIGOR-HEADER-SIGNIN-DEAD-REST browser re-test |
| Held on a decision | S4 legal/jurisdiction, S8 ronna, S9 guidance, S10 pricing, S13 content, MDO3D-FOOTER-GITHUB-404, RONNA-SIGNIN-LATARENCE |
| Blocked on the operator | S1, S3, S5, S6, S7, S12 |
| Everything else | open (dev), in HQ order |

**Discrepancies to send back to HQ:**
- **Six of HQ's "open / needs re-check" rows are already LIVE** through git auto-deploy on 2026-10-09 at 00:33–00:42Z (SHAs are in the queue).
- **The live rigor `8k804`, the ronna env.js and the runwae files are expected.** Those groups have had no production deploy yet; they wait on the Principal's GO. They are not regressions.
- **HQ's S2 WAF list includes `/js/config.js`.** The lane keeps that file public (Mapbox `pk.` token only) and recommends restricting the token to runwae.com instead.

## 2. QW1–QW6 (HQ §11A no-decision quick wins)

No lane commit references any C7 ID yet (`git log --since 10-09` across the main repo, mdothree, runwae, ronna and rigor). The only partial overlap is runwae `80b8677`, under QW2.

| QW | What | Repo / files | Already fixed-local in this lane? | One-line fix plan |
|---|---|---|---|---|
| **QW1** (C7-009, P2) | Footer legal + contact links on the 9 mdothree tool subs (no jurisdiction blocker; the mdothree.com /terms and /privacy pages exist) | `~/mdo3d/projects/mdothree/mdothree-{color,hash,password,timestamp,json,text,pdf,image,qr}/public/**/*.html` (shared footer) | **No.** 0 files link mdothree.com/terms or /privacy | Add one footer line (`Terms` · `Privacy` → https://mdothree.com/terms, /privacy; `hello@` mailto) to every page's footer in the 9 repos. Commit per repo. Ships with the mdothree deploy group. |
| **QW2** (C7-001 P1, C7B-RUNWAE-BLOG-ASSETS-404 P2, C7B-RUNWAE-TEAM-LINK, C7-015 P3) | runwae blog: root-relative nav and asset hrefs on 17 posts; author link; FAQ anchor and duplicate ids | `~/mdo3d/projects/external/runwae/runwae/blog/*.html`, `faqs.html` | **Partial.** `80b8677` (pushed, needs-deploy) changed the 15 older posts' assets/nav to `../`. Still open: 4 interview posts (ASitDownWithMalcShow, NotesWithNiya, PabloTheDon, TalksWithBornReal) have 7 bare-relative refs each; 11 posts keep 1 (`href="welcome"`); C7-015 FAQ is untouched | Rewrite every blog href/src to root-relative (`/welcome`, `/login?login`, `/css/…`, `/Bootstrap/…`); fix the author link to `/` and the `howdoimessage#` link; dedupe the FAQ ids and fix the anchor. Rides the runwae deploy GO. |
| **QW3** (C7-010, P2) | Entertainment disclaimer on 9 of 11 divination sites | `~/mdo3d/projects/divination/{astrology,fengshui,iching,numerology,pastlives,runes,tarot}/*/public/index.html` + names (repo to confirm; `projects/jarvisbee/` holds babynames/businessnames) + guidance (`projects/mdo3d/guidance`) | **No.** Only oracle-cards and dream-interpreter carry the wording | Copy the existing dreams/oracle footer disclaimer verbatim into the other 9. HQ flags wording as Principal-optional, so reuse the approved text rather than writing new copy. Guidance rides S9. |
| **QW4** (C7-002 P2, C7-003/016/017 P3) | Divination APIs: malformed JSON → 400, too-large body → 413 JSON, field caps, JSON 404/405, one `{success:false,error}` shape; tarot + dreams health ping → `/api/health` | `~/mdo3d/projects/divination/*/api/src/server.js` (×7: iching, astrology, numerology, runes, tarot, dreams, oracle); `tarot/tarot-cards/public/js/config/api.js:55`, `dreams/dream-interpreter/public/js/config/api.js:55` | **No.** No `entity.parse.failed` / `entity.too.large` handler; both api.js still call `/health` | Add one shared Express error middleware + 404/405 fallthrough (copy-paste ×7, mind iching's route-level `express.raw()` ordering). Change `'/health'` → `'/api/health'` in the 2 configs. Smoke-test with curl against `vercel dev`. |
| **QW5** (C7B-PW-NOSETS-EMPTY P2, C7B-TEXTDIFF-SURROGATE P2, C7B-COLOR-STALE-RESULT, C7B-PRO-BTN-INVISIBLE, C7-012, C7-018, C7-019, C7-020, C7B-NUMEROLOGY-FUTURE-DATE, C7B-ASTRO-NO-VALIDATION, C7B-LL-DATE-FILTER-SILENT, C7B-QR-COPY, C7B-TS-WEEK, C7B-DREAMS-MAXLEN; P3 unless noted) | Small validation, copy and link fixes | mdothree-{password,text,color,timestamp,qr,image,json,pdf}; divination numerology/astrology/dreams/oracle/tarot + 8 `/index.html` hosts; layoffleads; robots.txt in mdothree-{image,json,pdf,qr,text}/public | **No.** e.g. `Disallow: /js/config/` is still in all 5 robots.txt | One commit per repo: require ≥1 charset (disable Generate); diff with `Array.from`/`Intl.Segmenter`; clear stale color results; Pro button contrast; drop the robots Disallow; link clean URLs; `/index.html` → `/` redirect in vercel.json; strip console.log / hide the Save stub; date range validation; copy nits. |
| **QW6** (C7-021 P3, C7-005 P2, C7-006 P2) | Verify, don't build: read the Stripe success/cancel return URLs; replace dead WARN-source and dailyaitoll citation links | Stripe dashboard (operator, S6, no key access in the lane); `~/mdo3d/projects/mdo3d/layoffleads` (state source map); dailyaitoll generator / content | **No** | Operator reads the return URLs in Stripe (read-only), and the lane adds the missing /success and /cancel pages to mdothree, layoffleads and prompts to match. Swap the SC/OH/FL WARN links for current official URLs. Run a link check on dailyaitoll and replace or archive the 15/106 dead citations. |

**Suggested order:**
1. QW1 and QW3: one footer line each, highest trust value.
2. QW4: API repos, independent of the GO groups.
3. QW2: finish it on top of `80b8677`; it ships with the runwae GO.
4. QW5.
5. QW6: needs the operator's Stripe read.

## 3. Five-line status reply for HQ intake

```
1. Lane state: P0s code-complete + pushed, awaiting Principal deploy GO — RONNA-ENV-SYNTAX + RONNA-MOCK-FALLBACK (ship together, 5 subs), RIGOR-PAY-BEFORE-API (7 tools, Pro CTA gated off), RUNWAE-ERROR-LOG-PUBLIC (+PUBLIC-CONFIG-FILES); RIGOR-API-525 blocked on operator S5 (api 863d3f2 ready). Live 8k804/env.js/runwae files are pre-GO, not regressions.
2. Deploy access (S11) confirmed: gh mdothree push works, VERCEL_TOKEN_MDO3 valid; one GO script `MDO_DEPLOY_CYCLE5_2026-10-08.sh <rigor|runwae|ronna|mdothree|div>` with per-ID verify + rollback lines (5daa0ff). Prod deploys stay Principal-gated; Hobby cap respected.
3. SLA acknowledged: P0 ack 4h / mitigate 24h / fix 72h. Queue re-seeded from cycle-8 draft (171, HQ IDs verbatim, severities applied); 6 rows HQ lists open/re-check are already LIVE via auto-deploy (SHAs in grok/FLEET_FIX_QUEUE.md). js/config.js stays public (Mapbox pk only → restrict token), so drop it from the S2 WAF list.
4. In progress now: P1 code — RONNA-APIFETCH-DOUBLE-JSON, RUNWAE-OUTPUTDIR-ROOT, HID-001/PERF-002 lazy Firebase, browser re-test of the 6 rigor Sign-In buttons (RIGOR-HEADER-SIGNIN-DEAD-REST).
5. Next: QW1–QW6 (none shipped yet; QW2 partial via runwae 80b8677) in order QW1+QW3 → QW4 → QW2 → QW5 → QW6, then the mdothree CSP restore (staged) on GO; S1–S10/S12/S13 remain Principal/operator.
```
