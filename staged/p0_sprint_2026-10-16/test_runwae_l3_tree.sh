#!/bin/bash
# test_runwae_l3_tree.sh — asserts a runwae commit carries ALL THREE live-line fixes at once (P0 rework 2026-10-17):
#   hf2   (77131b1): runwaejs/util.js has the rwExternalUrl helper; serviceworker cache v11-hf2
#   guard (ab50b05, RW-SEC-01/02): pay-influencer.js sends X-Runwae-Payout-Guard + payout_review;
#                    connect-oauth.js sends X-Runwae-Connect-Guard + account_exists
#   legal (XE-6):    terms.html + privacy.html contain "Runwae, LLC" x0
#   + preview-off guard in vercel.json
# Read-only (git show only). Exit 0 = PASS, 1 = FAIL.
# Usage: test_runwae_l3_tree.sh <rev> [repo]
set -uo pipefail
REV=${1:?usage: $0 <rev> [repo]}
REPO=${2:-$HOME/mdo3d/projects/external/runwae/runwae}
fail=0
t(){ if eval "$2"; then echo "  ok   $1"; else echo "  FAIL $1"; fail=1; fi; }
s(){ git -C "$REPO" show "$REV:$1" 2>/dev/null; }
echo "tree test @ $(git -C "$REPO" rev-parse --short "$REV")"
t "hf2: util.js has rwExternalUrl"                 '[ "$(s runwaejs/util.js | grep -c rwExternalUrl)" -ge 1 ]'
t "hf2: serviceworker cache v11-hf2"                '[ "$(s serviceworker.js | grep -c "runwae-cache-v11-hf2")" -ge 1 ]'
t "guard: pay-influencer X-Runwae-Payout-Guard"     '[ "$(s api/payment/pay-influencer.js | grep -c "X-Runwae-Payout-Guard")" -ge 1 ]'
t "guard: pay-influencer payout_review"             '[ "$(s api/payment/pay-influencer.js | grep -c payout_review)" -ge 1 ]'
t "guard: connect-oauth X-Runwae-Connect-Guard"     '[ "$(s api/payment/connect-oauth.js | grep -c "X-Runwae-Connect-Guard")" -ge 1 ]'
t "guard: connect-oauth account_exists"             '[ "$(s api/payment/connect-oauth.js | grep -c account_exists)" -ge 1 ]'
t "legal: terms.html 'Runwae, LLC' x0"              '[ "$(s terms.html | grep -o "Runwae, LLC" | wc -l | tr -d " ")" = 0 ] && [ -n "$(s terms.html)" ]'
t "legal: privacy.html 'Runwae, LLC' x0"            '[ "$(s privacy.html | grep -o "Runwae, LLC" | wc -l | tr -d " ")" = 0 ] && [ -n "$(s privacy.html)" ]'
t "preview-off guard in vercel.json"                's vercel.json | jq -e ".git.deploymentEnabled[\"**\"] == false" >/dev/null'
[ $fail = 0 ] && { echo "PASS"; exit 0; } || { echo "FAIL"; exit 1; }
