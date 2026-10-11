# MDO Cycle-8 P1 code fixes — 2026-10-11

Lane: MDO developer. Scope: commit and push only. **Nothing is deployed.** Every item below goes live only when the Principal gives GO and `MDO_DEPLOY_CYCLE5_2026-10-08.sh` runs. That script now has verify lines for each item (`bash -n` clean, dry-run PASS against the pushed SHAs, FAIL against the pre-fix SHAs).
Evidence inputs: `~/latarence/coordination/hq_intake/LBL_DROP1011_A.md`, `LBL_MDO_CYCLE8.md`.
Browser tests ran on **xps** (`~/mdo-qa`, Playwright Chromium), not on the Mac.

| HQ ID | State | Repo · branch · sha | Verify |
|---|---|---|---|
| RONNA-APIFETCH-DOUBLE-JSON (P1) | **FIXED** (pushed; deploy pending GO) | mdothree/ronnascanner-companies · main · `3d63ca7`<br>-contacts `dfcbd91` · -emails `ff30112` · -leads `9dac350` · -prospects `066d7ec` | xps `~/mdo-qa/c8ronna.mjs` → `~/mdo-qa/c8ronna/results.jsonl`: 24/24 fix scenarios pass. Deploy-script `g_ronna`: no `res.json()` in app.js, leads imports showSkeleton, companies/contacts/prospects read `#filter-company` |
| RUNWAE-OUTPUTDIR-ROOT (P1) | **FIXED** (prune replaced by a `dist/` allowlist build; deploy pending GO) | mdothree/runwae · **master** · `e6902e9` | xps `~/mdo-qa/runwae_dist_test.mjs`: 43/43 URLs 200, no new 4xx, sensitive paths 404. `g_runwae` gets 8 more 404 checks plus `/welcome` 200 |
| HID-001 + PROD-013 (P1) | **FIXED** (pushed; deploy pending GO) | mdothree/mdothree-color `e158ab8` · -hash `d6cb67b` · -password `51e26d3` · -timestamp `9779375` (all main) | xps `~/mdo-qa/c8_hid.mjs` → `~/mdo-qa/c8hid/results.json`: with gstatic blocked, 26/26 pages work and 0 uncaught errors (before: 26/26 dead). With gstatic open, Firebase still loads. `g_mdothree`: `loadFirebase` exported, no top-level gstatic import |
| RIGOR-HEADER-SIGNIN-DEAD-REST | **FIXED-AT-HEAD, no code change needed** (deploy pending GO) | rigor cover `71275c4` · interview `2e05672` · linkedin `37fd8f1` · networking `659c511` · portfolio `92e08ca` · salary `37c1ee6` (fix commits 98560c4 / 9d54a82 / cd17187 / 950a41a / 0e826e1 / 75d2b4c) | xps `~/mdo-qa/c8_signin.mjs` against `git archive HEAD public`: in all 6 (and resume), `#nav-login` and `#nav-signup` open `#auth-modal` with 0 page errors, and `/#signin` opens it too. `g_rigor` gets an anchor check for all 7 |

---

## 1. RONNA-APIFETCH-DOUBLE-JSON — FIXED in all 5 subs

**Root cause.** `env.js apiFetch()` already returns `res.json()`. Callers then ran `const data = await res.json()` on the parsed object, which throws a TypeError, falls into `catch`, and shows "unavailable". So a **successful API response was reported as "scanner service is unavailable"**. On the base build, emails shows exactly this: a 200 response displayed the unavailable state.

**Fix (same pattern as rigor b13b471).** Callers now do `const data = await apiFetch(...)` and read `data?.<key>`. `env.js` has a comment: "Callers must NOT call .json() again".

**Related defects found on the same path and fixed.** Without these fixes, the honest unavailable state from RONNA-MOCK-FALLBACK could never appear at HEAD:
- **leads:** `showSkeleton` was called but never imported (ReferenceError), and the code targeted `#results-panel`/`#leads-tbody`, which don't exist (null.classList). The scan threw before reaching the API, so the button stayed disabled and nothing was shown. It now targets `#results-section`/`#results-tbody`.
- **companies / contacts / emails / prospects:** app.js read element IDs that index.html doesn't have (`#company-input`, `#prospect-input`, `#first-name`, `.etab`, and others). Clicking gave null.value, so the scan never ran. Inputs and render targets are now wired to the real markup:
  - companies, contacts, prospects read `#filter-company` and their filters.
  - emails uses `.tool-tab[data-tool]` with `#tool-*`, and its `#btn-verify` and `#btn-bulk` buttons are wired.
- **All 5:** `showUnavailable()` now renders inside the results container instead of wiping the whole panel. Before, a retry after an outage lost the table or toolbar.
- **All 5:** `loadHistory()` now returns early when the page has no history UI. Before, it called an undefined helper on sign-in.

**Error handling (xps, `c8ronna.mjs`).** The gate is bypassed for the test only, via a route rewrite of paywallUI.js; `/api/*` is mocked.

| Build | 200 with data | 500 | network abort | retry (500 then 200) |
|---|---|---|---|---|
| base (pre-fix HEAD) | none of the 5 render (leads/companies/contacts/prospects throw on click; emails shows "unavailable") | no unavailable state in 4/5 | same | — |
| fix | all 5 (+ emails verify tab) render | "unavailable" state | "unavailable" state | unavailable first, then results render |

The fix run also had the button re-enabled and 0 page errors in all 24 scenarios. No mock data was added and there are no Apollo/Clearbit/Hunter strings, so the existing RONNA-MOCK-FALLBACK checks still pass.

**Production behaviour.** `ronnascanner-api` only implements `/api/leads/scan`. companies, contacts, emails and prospects will therefore show the honest "unavailable" state in production until their endpoints exist. That is correct; it is not a regression.

**Residual issues (not fixed, out of scope, existing P2 family such as RONNA-LOADLIST-AWAIT-BUG):**
- Save and CSV export use undefined helpers: `saveToFirestore`/`getFromFirestore` (4 subs), and `downloadFile`/`toCSV` (contacts, emails).
- leads Save List / saved lists use Firestore modular functions that aren't imported (`addDoc`, `getDocs`, …).
- Result renderers interpolate API strings into HTML without escaping.

**WIP note.** All 5 primary checkouts were reset `--mixed` to the new SHAs, and `git diff --cached` was empty first. The uncommitted firebase.js, app.js, helpers.js and index.html WIP is intact. That **app.js WIP still contains the old mock fallback and the double `.json()`**, so whoever lands it must rebase it onto these commits and not overwrite them.

## 2. RUNWAE-OUTPUTDIR-ROOT — FIXED (replaced the prune mitigation)

- **Config.** `vercel.json` now uses buildCommand `node deployment/inject-config.js && node deployment/build-dist.js` and `outputDirectory: "dist"`. `cleanUrls`, the `/` → `/welcome.html` redirect, the Skincare typo redirect and `functions` are unchanged.
- **Build script.** `deployment/build-dist.js` copies an allowlist:
  - root `*.html`
  - 9 root static files
  - 15 asset dirs

  It skips `.md/.sh/.py/.php/.log/.map`, dotfiles and `config.template.js`. The build **fails** if a sensitive path lands in `dist/` or if `welcome.html` or `js/config.js` is missing.
- **api/ functions.** `api/` is not copied, because Vercel builds the functions from the project root.
- **Cleanup.** `prune-public.js` is deleted, and `dist` is added to `.gitignore` and `.vercelignore`.
- **Verify (xps).** Old = `80b8677` with inject+prune; new = `e6902e9` `dist/`.
  - All 43 URLs (18 pages, `/`, `/welcome`, 22 blog posts, typo redirect) return 200 on both, and there is no new 4xx.
  - Seven paths that returned **200 under prune** now return 404: `/package.json`, `/email.php` (it was served as raw PHP source), `/docs/javascript-obfuscation.md`, `/.vscode/settings.json`, `/.vercel/project.json`, `/og/build.sh`, `/js/config.template.js`.
  - The 12 paths the script already checks are still 404.
- **Branch.** runwae's real branch is `master`. Its remote `main` is an unrelated starter with no shared history; do not push there.
- **Security finding (operator).** The runwae `origin` remote URL has a plaintext GitHub token embedded, as do the ronnascanner remotes. Pushes in this lane used token-free URLs. The token should be rotated and removed from the remote config.

## 3. HID-001 + PROD-013 — FIXED (color, hash, password, timestamp)

- **Firebase loading.** `public/js/config/config.js` loads Firebase lazily (`loadFirebase()`), with no top-level gstatic import. If gstatic can't be reached, it logs a warning and the tool keeps working:
  - Sign-in reports no user, so Pro degrades to the free tier and history stays local.
  - `getFirebaseAuth()` returns a safe placeholder until Firebase loads.
  - The Firestore helpers fail inside the callers' existing try/catch.
- **subscriptionService.js** no longer imports gstatic directly.
- **sw.js** `CACHE_NAME` bumped: color v6→v7, hash v6→v7, password v5→v6, timestamp v6→v7.
- **Verify (xps).** With gstatic blocked, the core action works on every index page:
  - color: #ff0000 is shown as #FF0000
  - hash: "abc" produces a hex hash
  - password: generating produces a password
  - timestamp: the clock runs and 0 converts to 1970

  That gave 26/26 pages and 0 uncaught errors, against 26/26 dead before the fix. With gstatic open, the app, firestore and auth modules still load.
- **Concurrency.** Another lane pushed C7-009 footer commits to these repos during this work. This change was rebased onto them; the files don't overlap.
- **Not run.** Each repo's `npm test`/`check` was not run because the permission was denied on the Mac. Only JS syntax was checked.

## 4. RIGOR-HEADER-SIGNIN-DEAD-REST — already fixed at HEAD

HQ's claim that only resume was fixed describes **production**, not HEAD. All 6 tools have `<a href="#signin" id="nav-login">` and `<a href="#signup" id="nav-signup">`, wired to `#auth-modal` by the same "real sign-in anchors" commit as resume. The xps browser test passes for all 6. **Deploys are pending GO**, and production keeps dead `#` links until `g_rigor` runs.

## Deploy-script additions (`MDO_DEPLOY_CYCLE5_2026-10-08.sh`)

- `g_rigor`: for each of the 7 tools, the header has ≥ 2 `#signin`/`#signup` anchors.
- `g_runwae`: 8 more paths → 404 (dist allowlist), and `/welcome` → 200.
- `g_ronna`: no `res.json()` in each app.js; leads imports showSkeleton; companies, contacts and prospects read `#filter-company`.
- `g_mdothree`: color, hash, password and timestamp `config.js` export `loadFirebase` and have no top-level gstatic import.

Dry-run with a stub `curl` serving `git show <sha>:public/...`: the new checks pass at the pushed SHAs and fail at the parent SHAs (ronna, mdothree). The runwae checks need the live site.
