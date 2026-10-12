# GO_FINAL: one deterministic, conflict-free GO for MDO (2026-10-12)

Before this, each MDO repo could have up to three sources of unreleased commits, and they could collide at GO time:

- (a) production (main/master on GitHub);
- (b) `c9-staged` commits not yet in production;
- (c) local-only commits in the laptop primary checkouts, which `g_b26` pushed at GO time with `git pull --rebase && git push`.

Each repo now has one branch on GitHub, **`go-final`**, built like this:

1. Start from the production tip.
2. Cherry-pick the (c) commits, oldest first.
3. Cherry-pick the (b) commits, oldest first.
4. Skip any commit whose change was already present (a patch-id duplicate or an empty pick).

Original messages and authors are kept. No existing branch was rewritten and nothing was force-pushed. **No production branch was touched.**

## GO sequence (Principal's go)

```
bash ~/mdo3d/staged/c9_ops/GO_FINAL_merge.sh status    # read-only: every row FF=yes
bash ~/mdo3d/staged/c9_ops/GO_FINAL_merge.sh all       # FF-only push go ref -> production; prints ROLLBACK lines first
bash ~/mdo3d/MDO_DEPLOY_CYCLE5_2026-10-08.sh rigor runwae ronna mdothree div c8qw   # CLI deploys of the pushed tips
bash ~/mdo-qa/verify_all_c9.sh                           # kit (xps)
```

- **Do not run `b26` after GO_FINAL.** Everything it pushes is already in go-final. Its 4 CLI deploys (numerology, dreams, oracle, tarot) are covered by `div` + `c8qw`.
- **Push block = no-op.** Simulated on throwaway clones of every primary in its list, with origin set to go-final. In each case `git pull --rebase` was clean and nothing was left to push. The past-life-insights hazard does not materialise: 9a985bc rebases to empty and is dropped, because its change is already in production via a9ea2b2.
- **The c9-staged fold step is not a no-op:**
  - **promptsforbusiness:** it would re-apply 9aca468 (C7-021) and duplicate the `/success` + `/cancel` block in `scripts/build.mjs`. The change is already in go-final as ff11610; the patch-id differs because #94 changed the surrounding context.
  - **mdo3d-landing:** 29ddf53 and a9d26fa would just conflict and be aborted.

  So `b26` is not needed for any repo, and running it after GO would only add that one duplicate.
- **Wave groups:** `wave63` / `wave94r` (pricing; separate Principal decisions) use `pushrepo` (pull --rebase + push, no c9 fold). That is safe after GO_FINAL for the nested repos. Note: `wave63` merges `wave/63-price-ladder` into the mdo3d monorepo primary but never pushes the monorepo. `deploy()` ships the pushed tip, so the monorepo-side API changes would not ship unless main is pushed first.
- **If a production branch moves before GO**, `GO_FINAL_merge.sh` refuses that repo (not FF). Run `GO_FINAL_merge.sh recut <repo>`. It pushes a NEW `go-final-rN` = current production + the go ref's commits; validate it and point REPOS at it. runwae already needed this once (go-final-r2).

## The mdo3d monorepo is excluded

The monorepo has no go-final:

- origin main is already complete. The reconcile commit b05423b landed the primary's 8 ops/fix commits.
- The primary's remaining local-only commits (social drafts + runwae-apparel) are private content.
- `mdothree/mdo3d` is **PUBLIC**, so those commits must never be pushed.

No step here folds monorepo local commits.

## Per repo

Notation:

- **c** = primary local-only commits folded in.
- **b** = c9-staged commits folded in.
- **dup** = skipped as already present.
- All go refs are FF from production as of this writing.

| Repo | Production | Go ref | Folded |
|---|---|---|---|
| rigor-resume / cover / interview / linkedin / networking / portfolio / salary | main | go-final 7b2c818 / 69a4ab0 / 2770dac / 3a194d9 / 03703a9 / 6fa5f30 / a1ec5b0 | b 1 each (SURF-006); c 0 (primaries already on main) |
| rigor-landing | main@4edcb0a | go-final d28f10f | c 9, b 1 |
| runwae | master@dae195a | **go-final-r2 2786ace** | b 1, **conflict resolved**: 0a1022c (SURF-006) vs 213606e (config renamed to js/runtime-config.js) in deployment/build-dist.js; kept both guards. go-final f1a80b5 went stale when master got dae195a, hence r2 |
| ronnascanner-companies / contacts / emails / leads / prospects | main | go-final = main (nothing to fold) | none |
| ronnascanner-landing | main@88ce8eb | go-final a0623c7 | b 8 (incl. the primary's 6 rebased); c 6 dup |
| mdothree-text / pdf / qr / hash / color / password / timestamp | main | go-final 872ab7e / 49b8da6 / 019e97a / 3af5f13 / 0c05705 / 9a87114 / 0374a93 | b 1 each (SURF-006) |
| mdothree-image | main@3a1050c | go-final 88f50d6 | b 3 |
| astrology | master@504c69b | go-final 3ae5d6a | c 10, b 2 (+9 dup) |
| iching | master@1bd94d3 | go-final f3ca248 | c 7, b 2 (+6 dup) |
| runes | master@79ae59c | go-final 7fc4c0f | c 8, b 2 (+7 dup) |
| feng-shui-analyzer | main@678f6c3 | go-final 5272051 | c 5, b 2 (+4 dup) |
| past-life-insights | main@a9ea2b2 | go-final 90400d1 | c 5 (+9a985bc empty: duplicate of a9ea2b2), b 2 (+4 dup) |
| baby-name-oracle | main@0923e37 | go-final 66af3df | c 4, b 2 (+3 dup) |
| mdo3d-landing | main@45e8081 | go-final 6f1759a | c 21, b 6 (+3 dup), **conflict resolved**: 29ddf53 dropped (see below) |
| promptsforbusiness (private) | main@b692515 | go-final ff11610 | c 4, b 3 (+3 identical SHAs) |
| layoffleads (private) | main@b81e505 | go-final 02b24f5 | b 3 |
| mdo3d-compare (private) | master@f7df59e | go-final 44d58e3 | c 3, b 1 |
| dailyaitoll (Latarence, PUBLIC) | main@e5ecd32 | go-final 1121036 | b 2; **c 0 of 3 folded** (see below) |

**mdo3d-landing: MDO3D-DIRECTORY-MISMATCH.** The primary's version (c0755c8 + a86a2ef + f657162) was kept and c9-staged's 29ddf53 was dropped. The primary's version computes the hero count and every category count from the `platforms` array (live / planned). 29ddf53 computed only the hero count, with static category counts. The primary's version is also newer.

**dailyaitoll** is a public repo, so its three local-only commits were handled as follows:

- **c358c6f** (`social/content-plan.md`, poll drafts) and **c3e9bb1** (public-sentiment doc, content plan): unapproved social/marketing drafts. **Left local; listed for the lane.**
- **f1fd49f** (collector fix): touches `.github/workflows/daily-toll.yml`. GitHub rejects it because the Latarence gh token lacks the `workflow` scope.
  - **Operator action (identity token):** `gh auth refresh -h github.com -u Latarence -s workflow`.
  - After GO, ship f1fd49f alone: cherry-pick it onto main in a temp clone and push.
  - Never run `git pull --rebase && git push` in that primary: it would publish the two drafts.

## Validation (xps, go-final trees)

- **Static checks:** no conflict markers. Every vercel.json transforms with @vercel/routing-utils. Changed JS/JSON parse.
  - The 4 mdothree tool repos and 4 monorepo divination frontends have `routes` + `cleanUrls`/`redirects` ("MIXED"). Their production configs have the same keys, so this is not introduced here.
- **Builds:**
  - Pass: runwae `inject-config` + `build-dist` (security.txt guard included), mdothree-text/pdf/qr/image `npm test`, hash/color/password build+test(+check), promptsforbusiness `npm run check`, layoffleads build+check, feng-shui/past-life/baby-names `next build`, dailyaitoll pytest 32 passed.
  - mdothree-timestamp: tests 31 pass / 7 fail, identical on the production tip, so not a regression.
- **HQ kit:** `verify_all_c9.sh` with the preflight emulators (kp1/kp2/kp3 servers; kp3srv.cjs copy) was run twice.
  - **Baseline:** the preflights' trees.
  - **go-final:** all 47 emulated hosts pointed at the go-final trees, including local divination APIs and the `next start` builds.
  - **Result:** baseline PASS 68 / FAIL 9 / SKIP 94; go-final identical (re-run with runwae go-final-r2), with **0 row differences**.
  - The 9 FAILs are open items outside these trees: RIGOR-API-525, RONNA-API-404, RONNA-SIGNIN-LATARENCE, LEGAL-SUBSITES-MISSING, CONTENT-LEGAL-DRAFT-LABEL, CONTENT-LEGAL-JURISDICTION-PLACEHOLDER, SURF-002, C7-005, BLACKLAB-DOOR.
  - kp1's own prediction (rigor+ronna 20/3/7, same 3 FAILs) holds.

## Operator notes

- **Untracked files:** the primaries' untracked copies of files that origin tracks (e.g. `~/mdo3d/staged/c9_ops/*`) block a later `git pull`/`rebase` in the monorepo primary. Remove the identical ones first.
- **Dirty primaries:** `git pull --rebase` in a primary with tracked edits needs `--autostash`. The dirty primaries are runwae, ronna subs, mdo3d-landing, dailyaitoll and the monorepo. After GO_FINAL nothing needs to be pulled for deploys: `deploy()` ships origin tips.
