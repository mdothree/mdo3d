#!/usr/bin/env bash
# GO_FINAL: fast-forward each MDO repo's production branch to its go-final ref. NOT EXECUTED by the agent. See GO_FINAL.md.
# go-final = production tip + the laptop primary's local-only commits + unmerged c9-staged commits, de-duplicated by patch-id.
# Usage:
#   bash GO_FINAL_merge.sh status           read-only: prod tip, go ref, FF yes/no, c9-staged commits not in the go ref
#   bash GO_FINAL_merge.sh all | <repo>...  FF-only push of the go ref to production (prints ROLLBACK first; refuses if not FF)
#   bash GO_FINAL_merge.sh recut <repo>     production moved after the go ref was cut: pushes a NEW branch go-final-rN =
#                                           current production + the go ref's commits not on it (patch-id); edit REPOS to use it
# The mdo3d monorepo is NOT in this list: origin main is already complete (reconcile b05423b), and its remaining
# local-only commits are private content that must never be pushed (the repo is public).
# Never force-pushes; never rewrites a branch. Token-free (gh credential helper), account per owner
# (mdothree/* -> mdothree, Latarence/* -> Latarence); switches back to buttstech on exit.
# For git-connected Vercel projects the push IS the production deploy (astrology, iching, runes, feng-shui-analyzer,
# past-life-insights, baby-name-oracle, mdo3d-landing, ronnascanner-landing, promptsforbusiness, layoffleads,
# mdo3d-compare, dailyaitoll). The rest ship with MDO_DEPLOY_CYCLE5_2026-10-08.sh (deploy() archives the PUSHED tip).
set -uo pipefail
# owner/repo:prod-branch:go-ref
REPOS="mdothree/rigor-resume:main:go-final-r4 mdothree/rigor-cover:main:go-final-r4 mdothree/rigor-interview:main:go-final-r4
mdothree/rigor-linkedin:main:go-final-r4 mdothree/rigor-networking:main:go-final-r4 mdothree/rigor-portfolio:main:go-final-r4
mdothree/rigor-salary:main:go-final-r4 mdothree/rigor-landing:main:go-final-r2 mdothree/runwae:master:go-final-r9
mdothree/ronnascanner-companies:main:main mdothree/ronnascanner-contacts:main:main mdothree/ronnascanner-emails:main:main
mdothree/ronnascanner-leads:main:main mdothree/ronnascanner-prospects:main:main mdothree/ronnascanner-landing:main:go-final-r2
mdothree/mdothree-text:main:go-final-r4 mdothree/mdothree-pdf:main:go-final-r4 mdothree/mdothree-qr:main:go-final-r4
mdothree/mdothree-hash:main:go-final-r5 mdothree/mdothree-color:main:go-final-r5 mdothree/mdothree-password:main:go-final-r5
mdothree/mdothree-timestamp:main:go-final-r5 mdothree/mdothree-image:main:go-final-r3 mdothree/astrology:master:go-final
mdothree/iching:master:go-final mdothree/runes:master:go-final mdothree/feng-shui-analyzer:main:go-final
mdothree/past-life-insights:main:go-final mdothree/baby-name-oracle:main:go-final mdothree/mdo3d-landing:main:go-final-r2
mdothree/promptsforbusiness:main:go-final-r2 mdothree/layoffleads:main:go-final mdothree/mdo3d-compare:master:go-final
Latarence/dailyaitoll:main:main"
LOG=~/mdo3d/GO_FINAL_merge.log
CRED=(-c credential.helper= -c 'credential.helper=!gh auth git-credential')
trap 'gh auth switch -u buttstech >/dev/null 2>&1' EXIT
acct() { case $1 in Latarence/*) echo Latarence;; *) echo mdothree;; esac; }
fetch() {  # fetch <owner/repo> <branch> <go-ref> <dir>: prod -> refs/p, go ref -> refs/g, c9-staged -> refs/s (if any)
  local r=$1 b=$2 g=$3 d=$4
  gh auth switch -u "$(acct "$r")" >/dev/null 2>&1 || { echo "  gh account $(acct "$r") not logged in"; return 1; }
  git init -q "$d" && git -C "$d" "${CRED[@]}" fetch -q "https://github.com/$r.git" "+refs/heads/$b:refs/p" "+refs/heads/$g:refs/g" 2>/dev/null \
    || { echo "  $r: fetch of $b / $g failed"; return 1; }
  git -C "$d" "${CRED[@]}" fetch -q "https://github.com/$r.git" "+refs/heads/c9-staged:refs/s" 2>/dev/null || true
}
status() {
  local e r b g d p t ff news
  printf '%-34s %-15s %-22s %-4s %s\n' REPO PROD GO_REF FF "c9-staged-not-in-go-ref"
  for e in $REPOS; do IFS=: read -r r b g <<<"$e"; d=$(mktemp -d)
    if fetch "$r" "$b" "$g" "$d"; then p=$(git -C "$d" rev-parse --short refs/p); t=$(git -C "$d" rev-parse --short refs/g)
      git -C "$d" merge-base --is-ancestor refs/p refs/g && ff=yes || ff=NO
      news=0; git -C "$d" rev-parse -q --verify refs/s >/dev/null && news=$(git -C "$d" cherry refs/g refs/s | grep -c '^+')
      printf '%-34s %-15s %-22s %-4s %s\n' "$r" "$b@$p" "$g@$t" "$ff" "$news"; fi
    rm -rf "$d"; done
  echo "Expected non-zero c9-staged column (content already in go ref, see GO_FINAL.md): runwae 1, mdo3d-landing 3, promptsforbusiness 2, mdothree-{hash,color,password,timestamp} 1 (beacon, landed on main as its own commit)."
}
merge1() {  # merge1 <owner/repo> <branch> <go-ref>
  local r=$1 b=$2 g=$3 d prev gf; d=$(mktemp -d)
  fetch "$r" "$b" "$g" "$d" || { rm -rf "$d"; return 1; }
  prev=$(git -C "$d" rev-parse refs/p); gf=$(git -C "$d" rev-parse refs/g)
  echo "ROLLBACK $r: git push --force-with-lease=$b:$gf https://github.com/$r.git $prev:refs/heads/$b   # previous $b tip" | tee -a "$LOG"
  if [ "$prev" = "$gf" ]; then echo "  $r: $b already at $g" | tee -a "$LOG"; rm -rf "$d"; return 0; fi
  if ! git -C "$d" merge-base --is-ancestor "$prev" "$gf"; then
    echo "  REFUSED $r: $b@${prev:0:7} is not an ancestor of $g@${gf:0:7} (production moved). Run: bash $0 recut ${r#*/}" | tee -a "$LOG"; rm -rf "$d"; return 1; fi
  if git -C "$d" "${CRED[@]}" push -q "https://github.com/$r.git" "$gf:refs/heads/$b"; then
    echo "  $(date -u +%FT%TZ) pushed $r $b: ${prev:0:7} -> ${gf:0:7} ($(git -C "$d" rev-list --count "$prev..$gf") commits)" | tee -a "$LOG"
  else echo "  PUSH FAIL $r" | tee -a "$LOG"; rm -rf "$d"; return 1; fi
  rm -rf "$d"
}
recut() {  # recut <repo name>
  local e r b g d n c
  e=$(echo $REPOS | tr ' ' '\n' | grep "/$1:") || { echo "unknown repo $1"; return 1; }; IFS=: read -r r b g <<<"$e"
  d=$(mktemp -d); fetch "$r" "$b" "$g" "$d" || return 1
  n=2; while git -C "$d" "${CRED[@]}" ls-remote --exit-code "https://github.com/$r.git" "refs/heads/go-final-r$n" >/dev/null 2>&1; do n=$((n+1)); done
  git -C "$d" worktree add -q "$d/w" refs/p
  for c in $(git -C "$d" cherry refs/p refs/g | awk '/^\+/{print $2}'); do
    git -C "$d/w" cherry-pick --allow-empty --keep-redundant-commits "$c" >/dev/null 2>&1 \
      || { echo "  recut $r: $c conflicts with what landed on $b — resolve by hand in $d/w; nothing pushed"; return 1; }
    git -C "$d/w" diff --quiet HEAD~1 HEAD && git -C "$d/w" reset -q --hard HEAD~1; done
  git -C "$d/w" "${CRED[@]}" push -q "https://github.com/$r.git" "HEAD:refs/heads/go-final-r$n" && \
    echo "  pushed $r go-final-r$n = $b@$(git -C "$d" rev-parse --short refs/p) + $(git -C "$d/w" rev-list --count refs/p..HEAD) commits. Validate, then set ${r#*/}'s go ref to go-final-r$n in REPOS."
}
[ $# -eq 0 ] && { sed -n 2,16p "$0"; exit 1; }
case $1 in
  status) status;;
  recut) shift; recut "$1";;
  *) fails=0; for t in "$@"; do for e in $REPOS; do IFS=: read -r r b g <<<"$e"
       if [ "$t" = all ] || [ "$t" = "${r#*/}" ]; then merge1 "$r" "$b" "$g" || fails=$((fails+1)); fi; done; done
     echo "GO_FINAL merge: $fails failure(s)"; [ $fails = 0 ];;
esac
