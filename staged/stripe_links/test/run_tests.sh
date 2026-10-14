#!/usr/bin/env bash
# Dry harness for LINKS_GO.sh. A stub curl stands in for every request; nothing reaches Stripe or the real secrets file.
set -u
T=$(cd "$(dirname "$0")" && pwd); SRC=$T/..
W=$(mktemp -d "${TMPDIR:-/tmp}/links-test.XXXXXX"); trap 'rm -rf "$W"' EXIT
cp "$SRC/LINKS_GO.sh" "$W/"; S=$W/LINKS_GO.sh
export STUB_KEY="sk_live_STUBNOTAREALKEY000"
printf 'STRIPE_SECRET_KEY_MDO3=%s\n' "$STUB_KEY" > "$W/fake.env"
export LINKS_ENV_FILE=$W/fake.env LINKS_CURL=$W/curl STUB_STATE=$W/state.json STUB_CALLS=$W/calls.log
cp "$T/stub_curl.py" "$W/curl"; chmod +x "$W/curl"
unset LINKS_TOS_URL LINKS_GO_CONFIRM STUB_FAIL_POST_N STUB_DROP_CUSTOM_TEXT
pass=0; fail=0
ok(){ if eval "$2"; then echo "PASS $1"; pass=$((pass+1)); else echo "FAIL $1   [$2]"; fail=$((fail+1)); fi; }
seed(){ python3 - "$@" <<'PY'
import json, os, sys
codes = ["aFa00icJqail9Osbg78k80M","cNi3cu6l2bmp8Kobg78k80N","bJe14mgZG7692m0gAr8k80L","bJecN4gZG6258Ko97Z8k80D",
 "eVq5kC4cU2PTf8M6ZR8k80A","00w5kC24M4Y1e4I5VN8k80I","9B69AS38Q0HL8Ko97Z8k80F","6oUfZg10IfCF7GkgAr8k80K",
 "bJecN4bFmeyBbWAesj8k80G","5kQ00i7p64Y1d0E1Fx8k80C","3cIcN4cJqfCF8Ko6ZR8k80z","aFabJ0aBi0HL0dSckb8k80B",
 "9B65kCgZGeyB5yc4RJ8k80J","eVqbJ04cUcqt4u85VN8k80H","cNibJ038Qail4u8ckb8k80E", "OTHERlinkNOTOURS"]
acct = sys.argv[1] if len(sys.argv) > 1 else "acct_1KQiakSTUB"
drop = sys.argv[2] if len(sys.argv) > 2 else ""
links = {}
for i, c in enumerate(codes):
    if c == drop: continue
    links[f"plink_{i:02d}"] = {"id": f"plink_{i:02d}", "object": "payment_link", "url": "https://buy.stripe.com/" + c,
      "active": i != 5, "consent_collection": None,
      "after_completion": {"type": "hosted_confirmation", "hosted_confirmation": {"custom_message": None}},
      "custom_text": {"shipping_address": {"message": "keep-me"} if i == 3 else None, "submit": None, "after_submit": None,
                      "terms_of_service_acceptance": None}}
json.dump({"account": {"id": acct, "business_profile": {"name": "MDO3D"}, "settings": {"dashboard": {"display_name": "MDO3D"}}},
           "links": links}, open(os.environ["STUB_STATE"], "w"))
PY
: > "$STUB_CALLS"; rm -rf "$W/out" "$W/LINKS_GO.log"; }
posts(){ grep -c '^POST' "$STUB_CALLS"; }

echo "--- 1 dry, no ToS URL"; seed
bash "$S" dry > "$W/o1" 2>&1; rc=$?
ok "dry exits 0" "[ $rc = 0 ]"
ok "dry makes 0 POSTs" "[ \$(posts) = 0 ]"
ok "dry: 15/15 need changes" "grep -q '15/15 links need changes' $W/o1"
ok "dry: ToS gate BLOCKED reported" "grep -q 'ToS gate BLOCKED' $W/o1"
ok "dry: read-back JSON saved, 15 links" "python3 -c \"import json,glob;d=json.load(open(glob.glob('$W/out/readback_*.json')[0]));assert len(d['links'])==15 and d['account']['business_profile.name']=='MDO3D'\""
ok "dry: pagination walked (2 list pages)" "[ \$(grep -c '^GET /payment_links ' $STUB_CALLS) = 2 ]"
ok "dry: PFB bundle -> thanks?pack=all-access" "grep -q 'thanks?pack=all-access' $W/o1"
ok "dry: inactive link flagged, never touched" "grep -q 'INACTIVE' $W/o1"
ok "key never printed" "! grep -rq STUBNOTAREAL $W/o1 $W/out $W/LINKS_GO.log"

echo "--- 2 apply without LINKS_GO_CONFIRM"; seed
bash "$S" apply > "$W/o2" 2>&1; rc=$?
ok "apply w/o confirm exits 1" "[ $rc = 1 ]"
ok "apply w/o confirm: zero calls" "[ ! -s $STUB_CALLS ]"

echo "--- 3 apply with GO but no ToS URL"; seed
LINKS_GO_CONFIRM=GO bash "$S" apply > "$W/o3" 2>&1; rc=$?
ok "refuses (exit 1)" "[ $rc = 1 ] && grep -q 'apply refused' $W/o3"
ok "no POSTs" "[ \$(posts) = 0 ]"

echo "--- 4 apply with GO + ToS URL"; seed
LINKS_TOS_URL=https://mdo3d.com/terms LINKS_GO_CONFIRM=GO bash "$S" apply > "$W/o4" 2>&1; rc=$?
ok "apply exits 0" "[ $rc = 0 ]"
ok "15 POSTs" "[ \$(posts) = 15 ]"
ok "no 'active' param ever sent" "! grep -E '^POST.*active' $STUB_CALLS"
ok "end state at target; inactive stays inactive; shipping text kept; other link untouched" "python3 - <<'PY'
import json; s=json.load(open('$STUB_STATE'))['links']
for i,l in s.items():
    if l['url'].endswith('OTHERlinkNOTOURS'):
        assert l['consent_collection'] is None; continue
    assert l['consent_collection']['terms_of_service']=='required'
    assert l['after_completion']['type']=='redirect'
    assert l['custom_text']['submit']['message'] and l['custom_text']['terms_of_service_acceptance']['message']
assert s['plink_05']['active'] is False and s['plink_00']['active'] is True
assert s['plink_03']['custom_text']['shipping_address']['message']=='keep-me'
assert s['plink_00']['after_completion']['redirect']['url']=='https://layoffleads.com/thanks'
assert s['plink_02']['after_completion']['redirect']['url']=='https://promptsforbusiness.com/thanks?pack=all-access'
assert s['plink_04']['after_completion']['redirect']['url']=='https://promptsforbusiness.com/thanks?pack=cold-email-sequence'
PY"
ok "key never in argv/log/output" "! grep -q LEAK $STUB_CALLS && ! grep -rq STUBNOTAREAL $W/o4 $W/out $W/LINKS_GO.log"

echo "--- 5 re-run apply is a no-op"; : > "$STUB_CALLS"
LINKS_TOS_URL=https://mdo3d.com/terms LINKS_GO_CONFIRM=GO bash "$S" apply > "$W/o5" 2>&1; rc=$?
ok "re-run exits 0, nothing to do, 0 POSTs" "[ $rc = 0 ] && grep -q 'nothing to do' $W/o5 && [ \$(posts) = 0 ]"

echo "--- 6 wrong account"; seed acct_1OTHERACCOUNT
bash "$S" dry > "$W/o6" 2>&1; rc=$?
ok "wrong account refused, no list/POST" "[ $rc = 1 ] && grep -q 'Refusing' $W/o6 && [ \$(grep -c payment_links $STUB_CALLS) = 0 ]"

echo "--- 7 test-mode key refused"; seed
printf 'STRIPE_SECRET_KEY_MDO3=sk_test_STUB\n' > "$W/fake2.env"
LINKS_ENV_FILE=$W/fake2.env bash "$S" dry > "$W/o7" 2>&1; rc=$?
ok "non-live key refused, zero calls" "[ $rc = 1 ] && [ ! -s $STUB_CALLS ]"

echo "--- 8 Stripe rejects the 3rd write (ToS URL not set in dashboard)"; seed
STUB_FAIL_POST_N=3 LINKS_TOS_URL=https://mdo3d.com/terms LINKS_GO_CONFIRM=GO bash "$S" apply > "$W/o8" 2>&1; rc=$?
ok "STOP exit 2" "[ $rc = 2 ]"
ok "stops after the failed write (3 POSTs total)" "[ \$(posts) = 3 ]"
ok "reports NO rollback + read-back path" "grep -q 'NO rollback performed' $W/o8 && grep -q 'readback_' $W/o8"
ok "earlier writes left in place (no self-rollback)" "python3 -c \"import json;s=json.load(open('$STUB_STATE'))['links'];assert s['plink_00']['consent_collection']['terms_of_service']=='required'\""

echo "--- 9 verify mismatch"; seed
STUB_DROP_CUSTOM_TEXT=1 LINKS_TOS_URL=https://mdo3d.com/terms LINKS_GO_CONFIRM=GO bash "$S" apply > "$W/o9" 2>&1; rc=$?
ok "verify mismatch -> STOP exit 2 after 1 POST" "[ $rc = 2 ] && grep -q 'verify mismatch' $W/o9 && [ \$(posts) = 1 ]"

echo "--- 10 a link missing from the account"; seed acct_1KQiakSTUB eVqbJ04cUcqt4u85VN8k80H
bash "$S" dry > "$W/o10" 2>&1; rc=$?
ok "missing link -> STOP exit 1, no POST" "[ $rc = 1 ] && grep -q 'not found' $W/o10 && [ \$(posts) = 0 ]"

echo; echo "RESULT: $pass passed, $fail failed"; [ $fail = 0 ]
