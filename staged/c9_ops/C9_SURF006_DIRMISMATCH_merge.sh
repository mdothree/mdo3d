#!/usr/bin/env bash
# C9 staged merges: SURF-006 (security.txt) + MDO3D-DIRECTORY-MISMATCH. NOT EXECUTED.
# Low-risk static surfaces (standing deploy authorization covers web copy/config), but MDO production deploys
# need the Principal's go per mdo3d/CLAUDE.md. Each c9-staged branch is main/master + 1-2 commits (fast-forward).
# Usage: bash C9_SURF006_DIRMISMATCH_merge.sh <repo>|all     Rollback: push the printed previous SHA back.
set -euo pipefail
ff() { # owner/repo prodbranch
  local r=$1 b=$2 tmp; tmp=$(mktemp -d); git clone -q --no-checkout https://github.com/$r.git "$tmp"
  local prev; prev=$(git -C "$tmp" rev-parse origin/$b); echo "ROLLBACK $r: git push --force-with-lease https://github.com/$r.git $prev:$b"
  git -C "$tmp" merge-base --is-ancestor origin/$b origin/c9-staged || { echo "NOT FF $r"; return 1; }
  gh auth switch -u mdothree >/dev/null; git -C "$tmp" -c credential.helper= -c credential.helper='!gh auth git-credential' push https://github.com/$r.git origin/c9-staged:refs/heads/$b; gh auth switch -u buttstech >/dev/null; rm -rf "$tmp"; }
REPOS="mdo3d-landing:main rigor-landing:main ronnascanner-landing:main runwae:master rigor-resume:main rigor-cover:main rigor-linkedin:main rigor-interview:main rigor-salary:main rigor-portfolio:main rigor-networking:main mdothree-color:main mdothree-hash:main mdothree-image:main mdothree-password:main mdothree-pdf:main mdothree-qr:main mdothree-text:main mdothree-timestamp:main ronnascanner-leads:main ronnascanner-contacts:main ronnascanner-emails:main ronnascanner-companies:main ronnascanner-prospects:main astrology:master iching:master runes:master feng-shui-analyzer:main past-life-insights:main baby-name-oracle:main mdo3d-compare:main mdo3d:main"
t=${1:?repo|all}; for rb in $REPOS; do r=${rb%%:*}; b=${rb##*:}; if [ "$t" = all ] || [ "$t" = "$r" ]; then ff mdothree/$r $b; fi; done
# Repos without git auto-deploy: after the ff push, re-run the cycle script group for them
# (bash ~/mdo3d/MDO_DEPLOY_CYCLE5_2026-10-08.sh rigor runwae ronna mdothree div): deploy() ships the PUSHED tip (410c3bd).
# NEVER `vercel --prod` inside a primary checkout: several hold unrelated WIP that would ship.
# mdo3d monorepo: c9-staged (f104e81/61ab5a7) was cut before main moved -> NOT FF. Cherry-pick both onto main instead of a force-push (the lane's force-push was classifier-denied).
# dailyaitoll (Latarence/dailyaitoll, auto-deploys): gh auth switch -u Latarence; push origin/c9-staged:main (sha 09afc89).
# layoffleads + promptsforbusiness DO have remotes (private; need gh account mdothree). Staged tips (ff from main):
#   mdothree/layoffleads c9-staged e6abf40 = C7-005 + C7B-LL-DATE-FILTER-SILENT (621006f) + SURF-006 (xps build+check PASS)  -> auto-deploys on push to main
#   mdothree/promptsforbusiness c9-staged 61625ea = SURF-006
#   push: gh auth switch -u mdothree; git -c credential.helper= -c credential.helper='!gh auth git-credential' push https://github.com/mdothree/<repo>.git <sha>:refs/heads/main; gh auth switch -u buttstech
#   rollback: layoffleads b81e505, promptsforbusiness b692515
