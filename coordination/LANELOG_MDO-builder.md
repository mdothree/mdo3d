# MDO builder (%26) → MDO dev (%24): handoff · 2026-10-14

Principal decision 10-14: the MDO builder folds into MDO dev to free laptop RAM. This session is parked (resumable).
**No agents running, no session crons, nothing mid-push.** Deploys from %26 in the current windows: 0.

## 1 · Open items (yours now)
| Item | State | Where | Next |
|---|---|---|---|
| **mdo3d-compare real 404** (PREWINDOW-QA) | committed locally `ceb8266` on master. **Not on origin** (origin master = c7af7ce) | `~/mdo3d/landing/mdo3d-compare`; bundle `xps:~/mdo-qa/window-batch/%26/mdo3d-compare.bundle` | Fold into a window: one push. It removes the catch-all rewrite (unknown paths were 200 + home) and adds 404.html. Verify: `/zz-nope` → 404 text/html; `/` 200. |
| **Baby Names delivery** (MDO-001 / MDOEARLY50 gate 3) | API on origin main as `d8ed476` (from my bc24468); frontend on origin (ac2f078 contains my 410de66 changes) | numerology-api `src/names/*`, `src/routes/namesReport.js`; baby-name-oracle `/success` | Confirm both are **deployed** and smoke-tested: empty POST `/api/names/report` → 400 JSON; garbage session → 402; /success renders. Then the Conversion asks below. |
| Conversion asks for names (live Stripe config: theirs) | open | `~/latarence/coordination/dispatch/2026-10-12_MDO3D_conversion_lowrisk.md` (bottom) | (a) link …8k802 after-completion redirect → `https://names.mdo3d.com/success?session_id={CHECKOUT_SESSION_ID}`; (b) env `NAMES_PAYMENT_LINK_ID=<plink>` on numerology-api; (c) confirm same Stripe account as the numerology-api key; (d) past-purchase count (refund/notice = Principal outbound). |
| **Window guard: $0 cards** | the "$0 Basic" cards are still on main/master of dreams, tarot, oracle (mono) + astrology, iching, runes (nested) | — | The window push for these 6 must be the wave63-ready tip, never main alone (MDO-VQA-01). |
| **No CSP on 10 sites** (hardening, not a fix) | not started | astrology, iching, runes, ronnascanner.com, mdo3d.com, compare, fengshui, pastlife, names, promptsforbusiness | Later window. The legacy-`routes` trap applies: top-level `headers` are ignored with `routes`. Use a leading `continue:true` header route. |
| mdothree CSP restore (#74) | patches staged | `~/mdo3d/staged/mdothree-csp-restore/*.patch` (committed dd98042) | Taken off JARVIS by the Bridge as low-risk; ship in a window (image first, check the console). |
| layoffleads weekly refresh (#75) | **installed on bigmini2 as DRY-RUN**, Mon 06:15 | `bigmini2:~/mdo3d-ops/bin/layoffleads-refresh.sh`, clone `~/mdo3d-ops/layoffleads`, crontab tag `# mdo3d-layoffleads-refresh`; source `~/mdo3d/ops/layoffleads-refresh/` | `--push` needs a mdothree push credential on bigmini2. bigmini2 has no GitHub read credential, so the dry run warns and uses its clone. |
| rigor `wave94r` (paid from first use) | branches on origin `wave/94-paid-first-use` (api 7e94bcc + 7 tools) | `projects/rigor/*` | Ships with the Rigor payment fix once api.rigor.design has its secrets (JARVIS MDO-RIGOR-SECRETS / #93). API + tools together (the 402 body changed). Remove `RIGOR_FREE_*` from the Vercel env. |
| rigor sign-in | Firebase `mdo3d-career` Email/Password likely OFF (`auth/operation-not-allowed`) | JARVIS #96 | Principal console step. |

## 2 · Branches / bundles I created (all on origin unless noted)
- `builder/c8-staged` on 14 repos (= my local mains at 2026-10-12, backup). Superseded by your GO_FINAL merges; delete only with care (deleting doesn't refund builds).
- `wave/63-price-ladder` (mono + astrology/iching/runes/fengshui/pastlives): you rebuilt it as wave63-ready.
- `wave/94-paid-first-use` (rigor api + 7 tools).
- Local only: worktree `~/.wt/mdo3d-names` (fix/names-delivery, already in main as d8ed476; safe to remove), `~/.wt/*-wave63`, `~/.wt/rigor-*-wave94` worktrees.
- xps: `~/mdo-qa/window-batch/%26/` (names + compare bundles, names API patch).

## 3 · Where my state and logs live
- **Full lane log:** `~/latarence/coordination/dispatch/2026-10-12_LANELOG_MDO-builder.md`, plus the %26 entries in `2026-10-08_MDO3D_hq_cycle5_fix_queue.md` (cycle 5–8).
- **Deploy script groups I added** (in `~/mdo3d/MDO_DEPLOY_CYCLE5_2026-10-08.sh`): `b26`, `wave63`, `wave94r` (+ ffmerge/pushrepo helpers). Note your finding: `g_wave63` merged into laptop primaries without pushing the monorepo merge, which is why you redid it from clean clones.
- **QA harnesses on xps:**
  - `~/pwqa/` (pre-window crawl with vercel.json headers enforced: `vserve.mjs` / `crawl.mjs`, results `~/pwqa/results/*.json`)
  - `~/mdo-qa/c8*` (per-batch checks)
  - `~/names-build/` (names Playwright)
  - `~/wave63-run/` (API tests)
- **Queue row edits:** a snapshot of my uncommitted FLEET_FIX_QUEUE.md edits is in `staged/builder/FLEET_FIX_QUEUE_working-tree_2026-10-12.patch` (your 58cd20f reconciliation supersedes it).
- **Uncommitted in the shared checkout:** the parent submodule pointers for astrology/fengshui/iching/pastlives/runes (bump after their window pushes).

## 4 · Lessons worth keeping
- **Vercel Hobby:** pushing ANY branch to a git-connected repo builds a preview that counts against the 100/day cap. Use bundles on xps between windows.
- **zsh traps:** `$w:r` is a modifier and unquoted strings don't word-split. Write runners in bash.
- **gh push as mdothree:** `gh auth switch -u mdothree` → `git -c credential.helper= -c credential.helper='!gh auth git-credential' push …` → switch back to buttstech.
- **Legacy `routes` in vercel.json ignore top-level `headers`.** dreams/tarot/oracle/numerology shipped without their declared headers until de72472.
- **Agents misreport payment flows:** "oracle premium is a timer" was false (the API is Stripe-verified). Read the code before escalating.
