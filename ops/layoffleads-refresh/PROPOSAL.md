# layoffleads weekly refresh: cron proposal (STAGED, 2026-10-12)

**Source:** plan `~/latarence/docs/plans/input_prompts_0/` Part C §C5 step 5 (dispatch C9). **Status:** written, **not installed**.
**Why:** layoffleads.com is the Q2 launch-validation candidate. Its data (Big Local News WARN consolidated CSV) only
refreshes when someone runs `npm run refresh` by hand.

## What runs
`refresh.sh`, weekly on **bigmini2**, in a dedicated clean clone (`$HOME/mdo3d-ops/layoffleads`):
1. `git pull --ff-only`, then `npm ci`.
2. `npm run refresh` = ingest-warn → normalize → build → check. `check.mjs` exits 1 on failure, which stops the run.
3. **Guards:**
   - refuse if the event count drops >20% (a truncated source);
   - no commit if `data/` is unchanged;
   - a lock against overlapping runs;
   - refuse if the clone is dirty.
4. `--push`: commit `data/` and push `main`. Vercel (git-connected) rebuilds. Without `--push` it's a dry run that
   shows the diff and discards it.

No Vercel deploy hook is needed: the repo is git-connected, so the push triggers the build.

## Why not Vercel Cron
Hobby cron runs at most once a day (±59 min), functions top out at 300 s, and there's no persistent disk to commit data
back from. A fleet cron plus a git push is simpler, and the data history stays in git.

## Before install (operator / Principal)
- **GO**: with `--push`, this is a recurring MDO production deploy.
- A push credential for `mdothree/layoffleads` on bigmini2. Use the existing gh `mdothree` login or a scoped PAT; check
  `git ls-remote` from the clone.
- One-time setup: `git clone https://github.com/mdothree/layoffleads.git ~/mdo3d-ops/layoffleads`, plus a checkout of
  this ops folder (`~/mdo3d/ops/layoffleads-refresh`).
- Dry run first: `bash ~/mdo3d/ops/layoffleads-refresh/refresh.sh` (no `--push`) and read the diff.

## Install / rollback
- Install: append `crontab.txt`'s line via `crontab -e` on bigmini2.
- Rollback a bad data push: `git revert <sha> && git push` in the clone (Vercel rebuilds the previous data).
- Uninstall: delete the line tagged `# mdo3d-layoffleads-refresh`.

## Verify
- `~/mdo3d-ops/logs/layoffleads-refresh.log` shows `events before/after` weekly.
- layoffleads.com shows the new `warn_meta.json` fetch date.

**Out of scope:** backfilling the 13 missing states from their own WARN pages (plan's optional step). QW6 links stay
with the MDO pane (%24).
