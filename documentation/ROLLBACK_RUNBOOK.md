# MDO rollback runbook

One runbook for every MDO product on Vercel (team `mdothrees-projects`, Hobby plan). It covers how each
product deploys, how to roll it back, where the pre-deploy URLs are recorded, and how to verify afterwards.
Launch rows: L-DAT-09, L-LL-07, L-RES-03, L-RON-03, L-RWE-04, L-PFB-04, L-DIV-04, L-M3-03.

Secrets are read by variable and never echoed: `source ~/latarence/secrets/sega_credentials.env` gives
`$VERCEL_TOKEN_MDO3`. Every command below passes `--token "$VERCEL_TOKEN_MDO3" --scope mdothrees-projects`
(left out of the examples for brevity).

## 1. Two deploy paths

| Path | What triggers production | Products |
|---|---|---|
| **git** | A push to the Vercel project's production branch IS the production deploy. For these, `GO_FINAL_merge.sh` (FF of the go ref onto the production branch) is the deploy. | astrology, iching, runes, feng-shui-analyzer, past-life-insights, baby-name-oracle (names), mdo3d-landing, mdothree-landing, mdothree-image, rigor-landing, ronnascanner-landing, promptsforbusiness, layoffleads, mdo3d-compare, dailyaitoll |
| **CLI** | `vercel deploy --prod` from a clean `git archive` of the pushed tip (`deploy()` in `MDO_DEPLOY_CYCLE5_2026-10-08.sh`, `deploy_ref()` in `staged/rigor_fix/RIGOR_GO.sh`). A git push alone deploys nothing. | tarot, numerology, dreams, oracle (frontends from this monorepo), the 9 divination APIs, mdothree json/text/pdf/qr/hash/color/password/timestamp, rigor tools ×7, the rigor API (`rigor`), ronnascanner companies/contacts/emails/leads/prospects, runwae |

Caveats found while writing this (2026-10-12):

- **mdothree-image** and **mdothree-landing** are git-connected AND appear in CLI deploy groups. Either path
  replaces production, so roll back by deployment (section 2), not by branch alone.
- **dream-interpreter** and **oracle-cards** Vercel projects are git-connected to standalone repos
  (`mdothree/dream-interpreter`, `mdothree/oracle-cards`), but production is shipped by CLI from this monorepo. A
  push to those standalone repos would replace production.
- **runwae**: the Vercel project's production branch is `main`, while the GO ref lands on `master` and production
  ships by CLI. A push to `master` does not deploy.
- **ronnascanner** (a second project) is also git-connected to `mdothree/ronnascanner-landing`. It has no custom
  domain; `ronnascanner.com` belongs to `ronnascanner-landing`.
- **dailyaitoll** is not in `mdothrees-projects`. It is git-connected to `Latarence/dailyaitoll` main and needs
  that account's token or dashboard.

## 2. How to roll back

Pick the first option that applies.

**A. Re-promote the recorded previous production deployment (any project, either path). This is the default.**

```bash
vercel promote https://<previous-production-deployment>.vercel.app --yes
```

- Promoting a deployment that was already production re-points the domains without a rebuild. This is what
  `MDO_ROLLBACK_CYCLE5.sh` and the `RIGOR_GO.sh rollback` steps do.
- Promoting a *preview* deployment is not a rollback: Vercel rebuilds it as a new production deployment.

**B. Instant Rollback to the immediately previous production deployment.**

```bash
vercel rollback https://<previous-production-deployment>.vercel.app --yes
vercel rollback status <project>
```

- Use this when no pre-deploy URL was recorded.
- On Hobby, Instant Rollback only reaches the previous production deployment. For anything older, use A.
- After a rollback, Vercel stops auto-assigning production domains to new git deploys of that project until a
  deployment is promoted again. The next fix then ships with `vercel promote`, or the dashboard "Undo rollback".

**C. git projects: revert the branch as well,** so the next push does not re-ship the bad commit. `GO_FINAL_merge.sh`
prints one line per repo before it pushes (also in `~/mdo3d/GO_FINAL_merge.log`):

```bash
git push --force-with-lease=<branch>:<go-sha> https://github.com/<owner>/<repo>.git <previous-sha>:refs/heads/<branch>
```

- This is a lease-guarded reset to the previous tip, so it fails if anything else landed after GO.
- If something did land, prefer `git revert <go-sha-range>` on the branch and push normally.
- For a git project, the push itself redeploys. Do A first if the domain must flip immediately.

**D. CLI projects: redeploy the previous ref.** Use this only when no previous deployment exists, for example after
it was deleted. Run `git archive <previous-sha> | tar -x` into an empty directory, copy `.vercel/project.json`, then
run `vercel deploy --prod`. This is a production deploy and is subject to the deploy gate.

### Where the pre-deploy URLs are recorded

| File (operator checkout, not committed) | Written by | Content |
|---|---|---|
| `~/mdo3d/MDO_ROLLBACK_CYCLE5.sh` | `deploy()` in `MDO_DEPLOY_CYCLE5_2026-10-08.sh` | One `vercel promote https://<prev> --yes …` line per project, recorded just before each CLI deploy; the newest line for a project is the one to run |
| `staged/rigor_fix/RIGOR_ROLLBACK.steps` | `RIGOR_GO.sh go` | Promote and env-unset steps for the rigor API + tools; `bash RIGOR_GO.sh rollback` replays them newest first, asking at each step |
| `~/mdo3d/GO_FINAL_merge.log` | `GO_FINAL_merge.sh all` | `ROLLBACK <repo>: git push --force-with-lease=…` per repo (option C) |

If none of these has the project, list its production deployments:

```bash
curl -s -H "Authorization: Bearer $VERCEL_TOKEN_MDO3" \
  "https://api.vercel.com/v6/deployments?teamId=team_DXUPiQz3KkYmyhAgmT99OQQr&projectId=<project>&target=production&state=READY&limit=5" \
  | jq -r '.deployments[] | [.url, (.created/1000|todate), (.meta.githubCommitSha // "cli")] | @tsv'
```

The second row is the previous production deployment.

## 3. Per product

Vercel project = the project name in `mdothrees-projects`.

**Health/verify** is the minimum check after a rollback, on top of the group checks in `MDO_DEPLOY_CYCLE5_2026-10-08.sh`.

- Always check the body, not just the status. Some current production sites answer unknown paths with **200 and
  0 bytes** (e.g. `resume.rigor.design/health.json` before the L-RES-03 build ships).
- So `curl -s URL | jq -e .` must parse.

### Divination ×9 + names

| Product | Domain | Vercel project | Path | Source (go ref) |
|---|---|---|---|---|
| Tarot | tarot.mdo3d.com | tarot-cards | CLI | monorepo `projects/divination/tarot/tarot-cards` (origin main) |
| Numerology | numerology.mdo3d.com | numerology-app | CLI | monorepo `…/numerology/numerology-app` |
| Dreams | dreams.mdo3d.com | dream-interpreter | CLI (git-linked, see caveat) | monorepo `…/dreams/dream-interpreter` |
| Oracle | oracle.mdo3d.com | oracle-cards | CLI (git-linked, see caveat) | monorepo `…/oracle/oracle-cards` |
| Astrology | astrology.mdo3d.com | astrology | git | mdothree/astrology master ← go-final |
| I Ching | iching.mdo3d.com | iching | git | mdothree/iching master ← go-final |
| Runes | runes.mdo3d.com | runes | git | mdothree/runes master ← go-final |
| Feng shui | fengshui.mdo3d.com | feng-shui-analyzer | git | mdothree/feng-shui-analyzer main ← go-final |
| Past lives | pastlife.mdo3d.com | past-life-insights | git | mdothree/past-life-insights main ← go-final |
| Names | names.mdo3d.com | baby-name-oracle | git | mdothree/baby-name-oracle main ← go-final |
| APIs | `<name>-api.vercel.app` (pastlives-api, tarot-cards-api, oracle-cards-api, dream-interpreter-api-delta, …) | astrology-api, dream-interpreter-api, fengshui-api, iching-api, numerology-api, oracle-cards-api, pastlives-api, runes-api, tarot-cards-api | CLI | monorepo `projects/divination/<name>/api` |

Verify:

- `curl -s https://<host>/ | grep -c 'For entertainment and reflection purposes'` = 1.
- `curl -s -o /dev/null -w '%{http_code}' https://pastlives-api.vercel.app/api/health` = 200.
- For the APIs: an unknown path returns a JSON 404 (`curl -s https://<api>/api/zz-nope`).

### mdothree ×10

| Product | Domain | Vercel project | Path | Source |
|---|---|---|---|---|
| JSON | json.mdothree.com | mdothree-json | CLI | monorepo `projects/mdothree/mdothree-json` |
| Text / PDF / QR | text. / pdf. / qr.mdothree.com | mdothree-text / -pdf / -qr | CLI | mdothree/mdothree-{text,pdf,qr} main ← go-final-r4 |
| Hash / Color / Password / Timestamp | hash. / color. / password. / timestamp.mdothree.com | mdothree-hash / -color / -password / -timestamp | CLI | mdothree/mdothree-{…} main ← go-final-r5 |
| Image | image.mdothree.com | mdothree-image | git + CLI | mdothree/mdothree-image main ← go-final-r3 |
| Landing | mdothree.com | mdothree-landing | git + CLI | mdothree/mdothree-landing main; CLI group deploys monorepo `projects/mdothree/landing` |

Verify:

- `curl -sI https://<tool>.mdothree.com/ | grep -ic '^content-security-policy'` = 1.
- `curl -s -o /dev/null -w '%{http_code}' https://<tool>.mdothree.com/` = 200.

### Rigor ×8 (+ API)

| Product | Domain | Vercel project | Path | Source |
|---|---|---|---|---|
| Resume, Cover, Interview, LinkedIn, Networking, Portfolio, Salary | `<tool>.rigor.design` | rigor-`<tool>` | CLI | mdothree/rigor-`<tool>` main ← go-final-r4 (checkout off) or q7/paid-path (RIGOR_GO, checkout on) |
| Landing | rigor.design | rigor-landing | git | mdothree/rigor-landing main ← go-final-r2 |
| API | api.rigor.design | rigor | CLI (`RIGOR_GO.sh`) | mdothree/rigor-api q7/paid-path |

Verify (L-RES-03):

- `curl -s https://<tool>.rigor.design/health.json | jq -e '.service=="rigor-<tool>" and .kind=="static"'`.
  - This is the build stamp: `built_at` and `commit` (filled by `git archive` export-subst) identify exactly which
    build is live after a rollback.
  - It does not check the API.
- `curl -s https://api.rigor.design/health | jq -e '.ok==true'`.
  - This is the truthful service signal: 200 only with every required env var, matching Stripe key modes and
    Firebase Admin init. Otherwise 503 `{ok:false, checks:{…booleans}}`.
  - The tool pages read the same endpoint in `apiReachable()` before checkout can open, so a 503 or any error
    keeps checkout closed.
- Rolling the API back to a build without CORS on `/health` (before rigor-api 53441a3) fails closed: the pages see
  the API as unreachable.

### Ronnascanner ×6

| Product | Domain | Vercel project | Path | Source |
|---|---|---|---|---|
| Landing | ronnascanner.com | ronnascanner-landing | git | mdothree/ronnascanner-landing main ← go-final-r2 |
| Companies / Contacts / Emails / Leads / Prospects | `<tool>.ronnascanner.com` | ronnascanner-`<tool>` | CLI | mdothree/ronnascanner-`<tool>` main |

"leads" in the launch list is `leads.ronnascanner.com` (project `ronnascanner-leads`), and is covered here.

Verify: `curl -s -o /dev/null -w '%{http_code}' https://<tool>.ronnascanner.com/` = 200, and the © year in the
footer is the current one (L-RON-03).

### Single-site products

| Product | Domain | Vercel project | Path | Source | Verify |
|---|---|---|---|---|---|
| Runwae | runwae.com, www | runwae | CLI | mdothree/runwae master ← go-final-r7 | `curl -s -o /dev/null -w '%{http_code}' https://runwae.com/error_log` = 404; home 200 |
| LayoffLeads | layoffleads.com, www | layoffleads | git | mdothree/layoffleads main ← go-final | `curl -s https://layoffleads.com/health.json \| jq -e '.service=="layoffleads"'` (L-LL-07): `built_at`, `commit`, `data.latest_event_date`, `data.warn_fetched_at` |
| PromptsForBusiness | promptsforbusiness.com, www | promptsforbusiness | git | mdothree/promptsforbusiness main ← go-final-r2 | home 200; `/success` and `/cancel` 200 |
| MDO3D landing | mdo3d.com | mdo3d-landing | git | mdothree/mdo3d-landing main ← go-final-r2 | home 200; directory counts render |
| Compare | compare.mdo3d.com | mdo3d-compare | git | mdothree/mdo3d-compare master ← go-final | home 200 |
| Daily AI Toll | dailyaitoll.com | dailyaitoll (Latarence account, not `mdothrees-projects`) | git | Latarence/dailyaitoll main ← go-final | `/api/health` (L-DAT-06) is owned by the dailyaitoll lane; until it ships, home 200 + the latest toll date on the page |

## 4. After any rollback

1. Run the product's verify lines above. For a whole group, run the matching `check` lines in
   `MDO_DEPLOY_CYCLE5_2026-10-08.sh` / `RIGOR_GO.sh`, or the HQ kit (`verify_all_c9.sh` on xps).
2. Confirm the domain points at the intended deployment:
   `curl -s -H "Authorization: Bearer $VERCEL_TOKEN_MDO3" "https://api.vercel.com/v4/aliases/<domain>?teamId=team_DXUPiQz3KkYmyhAgmT99OQQr" | jq -r .deploymentId`.
3. For a git project:
   - Make sure the branch no longer carries the bad commit (option C).
   - Otherwise, if you used `vercel rollback`, undo it with `vercel promote` once the fix is pushed.
4. Log what was rolled back, from which deployment, to which, and the UTC time in the fix queue.

## 5. Proof: rollback exercised on a preview (2026-10-13 UTC, no production change)

**Setup.**

- Project `rigor-resume` (CLI path).
- Two preview deployments (`vercel deploy` without `--prod`), each from a clean `git archive`:
  - A = `e39410d` (go-final-r4 before L-RES-03) → `rigor-resume-qbltlpchf-…` (dpl_39rF5JCongvEJWbaa68Y43TyhwTa).
  - B = `d86ff60` (go-final-r4 with L-RES-03) → `rigor-resume-9s180legn-…` (dpl_Do8p9Hg8mCNiiYxfNRMVKZTAMfd8).
- B's build log shows the new stamp running on Vercel with the export-subst commit:
  `health.json: rigor-resume 2026-10-13T00:26:11.161Z d86ff607a42230b75ca84ffb64aa4a71b2422111`.

**Test alias `rb-proof-mdo-rigor-resume.vercel.app`, read back through the aliases API after each step:**

```
step1  vercel alias set rigor-resume-9s180legn-… rb-proof-mdo-rigor-resume.vercel.app
       > Success! … now points to https://rigor-resume-9s180legn-mdothrees-projects.vercel.app [789ms]
       00:26:42Z alias -> dpl_Do8p9Hg8mCNiiYxfNRMVKZTAMfd8 (B)
step2  ROLLBACK: vercel alias set rigor-resume-qbltlpchf-… rb-proof-mdo-rigor-resume.vercel.app
       > Success! … now points to https://rigor-resume-qbltlpchf-mdothrees-projects.vercel.app [1s]
       00:26:44Z alias -> dpl_39rF5JCongvEJWbaa68Y43TyhwTa (A)    rollback took 2 s
vercel rollback status rigor-resume  -> No deployment rollback in progress
vercel promote status rigor-resume   -> No deployment promotion in progress
cleanup: alias deleted (SUCCESS); both previews DELETED via /v13/deployments; production list unchanged
         (rigor-resume-e65ewdkpx… still current)
```

**What this proves and what it doesn't.**

- Re-pointing a name from a newer deployment to an older one is an atomic alias swap: about 1 s, no rebuild. That
  is the same mechanism `vercel promote <previous production deployment>` uses for the production domains.
- `vercel promote`/`vercel rollback` were not run against previews:
  - `rollback` only targets production deployments.
  - `promote` of a preview rebuilds it as a new production deployment, i.e. a production deploy, which this proof
    must not make.
- Content was not fetched over HTTPS: `*.vercel.app` URLs on this team sit behind Vercel deployment protection
  (`all_except_custom_domains`), so the alias answers 302 to the login. Adding a protection-bypass secret would
  change a project security setting, so it was not done.
- The evidence is the aliases API (`deploymentId` after each step) plus B's build log. Custom production domains
  are not protected, so the section 4 curls work there.
