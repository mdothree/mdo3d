#!/usr/bin/env bash
# LINKS_GO.sh: Checkout settings on the LIVE MDO3 Payment Links for LayoffLeads and Prompts for Business.
# Queue: R-mdo3d-4 (STRIPE-CHECKOUT-BUSINESS-NAME L414, L-LL-04). STAGED. A live Stripe write needs the Principal's GO.
#
# Usage:
#   bash LINKS_GO.sh dry                          read-only: GETs, saves the read-back JSON, prints the diff
#   LINKS_GO_CONFIRM=GO bash LINKS_GO.sh apply    the dry steps, then the writes, then a verify read-back
#
# Per link, the target state is:
#   consent_collection.terms_of_service = required   (Stripe needs the account ToS URL set first:
#                                                     Dashboard > Settings > Public details. That is a dashboard step.)
#   after_completion = redirect to the site's live /thanks page
#                                                     (LayoffLeads: /thanks; PFB: /thanks?pack=<slug>, per site.config.json)
#   custom_text.submit.message = the site's business name + billing email
#   custom_text.terms_of_service_acceptance.message = links to that site's own /terms and /privacy
#
# Business name: a Payment Link has no business-name field. The name at the top of Checkout is the account's
# public business name (business_profile.name), one value for every MDO3 product. The script reads and reports
# it and never changes it. The per-site name goes into the submit text above.
#
# Inputs (no value is ever printed):
#   ~/latarence/secrets/sega_credentials.env (override: LINKS_ENV_FILE). Key variable: $LINKS_STRIPE_KEY_VAR, or the
#   first one set of: STRIPE_SECRET_KEY_MDO3 STRIPE_SECRET_KEY_MDO MDO3_STRIPE_SECRET_KEY STRIPE_SECRET_KEY_LIVE
#   STRIPE_SECRET_KEY. It must be a live key (sk_live_/rk_live_ with Payment Links read+write) on account acct_1KQiak*
#   (override: LINKS_EXPECT_ACCT_PREFIX). Any other account means a refusal.
#   LINKS_TOS_URL: the Terms of Service URL the Principal entered in Stripe Public details. apply refuses if it's
#   unset or not HTTP 200. Stripe's API has no field that exposes that setting, so Stripe itself is the final check:
#   the first write fails with an error if the URL isn't set, and the script STOPs there.
#
# Safety:
#   - It never sends `active`, never pauses or deactivates a link, and never touches prices, products or the account.
#   - It skips a link that's already at the target, so a re-run is safe.
#   - There's NO automatic rollback (Principal rule). On a failed write or verify it STOPs (exit 2) and reports.
#     out/readback_<ts>.json keeps the before-state as information only, for a human-decided restore.
#   - Test harness: test/run_tests.sh. It sets LINKS_CURL to a stub, so it never reaches Stripe.
set -u
MODE=${1:-}
HERE=$(cd "$(dirname "$0")" && pwd)
case "$MODE" in dry|apply) ;; *) sed -n 2,35p "$0"; exit 1;; esac
if [ "$MODE" = apply ] && [ "${LINKS_GO_CONFIRM:-}" != GO ]; then
  echo "STOP: apply needs LINKS_GO_CONFIRM=GO (the Principal's GO)."; exit 1
fi
command -v python3 >/dev/null || { echo "STOP: python3 missing"; exit 1; }
command -v "${LINKS_CURL:-curl}" >/dev/null || { echo "STOP: curl missing"; exit 1; }

ENV_FILE=${LINKS_ENV_FILE:-$HOME/latarence/secrets/sega_credentials.env}
[ -f "$ENV_FILE" ] || { echo "STOP: env file not found: $ENV_FILE"; exit 1; }
# shellcheck disable=SC1090
set -a; source "$ENV_FILE" >/dev/null 2>&1; set +a
KEYVAR=""
for v in ${LINKS_STRIPE_KEY_VAR:-} STRIPE_SECRET_KEY_MDO3 STRIPE_SECRET_KEY_MDO MDO3_STRIPE_SECRET_KEY STRIPE_SECRET_KEY_LIVE STRIPE_SECRET_KEY; do
  eval "val=\${$v:-}"
  if [ -n "$val" ]; then KEYVAR=$v; break; fi
done
[ -n "$KEYVAR" ] || { echo "STOP: no Stripe key variable set in $ENV_FILE (set LINKS_STRIPE_KEY_VAR)"; exit 1; }
eval "LINKS_KEY_VALUE=\${$KEYVAR}"; unset val
export LINKS_KEY_VALUE LINKS_KEY_NAME=$KEYVAR LINKS_MODE=$MODE LINKS_HERE=$HERE
exec python3 - <<'PY'
import json, os, subprocess, sys, time, urllib.parse

MODE = os.environ["LINKS_MODE"]; HERE = os.environ["LINKS_HERE"]
KEY = os.environ.pop("LINKS_KEY_VALUE"); KEYNAME = os.environ["LINKS_KEY_NAME"]
CURL = os.environ.get("LINKS_CURL", "curl")
EXPECT_ACCT = os.environ.get("LINKS_EXPECT_ACCT_PREFIX", "acct_1KQiak")
TOS_URL = os.environ.get("LINKS_TOS_URL", "").strip()
API = "https://api.stripe.com/v1"
TS = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
OUT = os.path.join(HERE, "out"); os.makedirs(OUT, exist_ok=True)
LOG = os.path.join(HERE, "LINKS_GO.log")

def log(msg):
    line = f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} {msg}"
    print(line, flush=True)
    with open(LOG, "a") as f: f.write(line + "\n")

def stop(msg, code=1):
    log("STOP: " + msg); sys.exit(code)

# ---- targets (source: mdothree/layoffleads + mdothree/promptsforbusiness site.config.json, remote main 2026-10-13)
LL_THANKS = "https://layoffleads.com/thanks"
PFB_THANKS = "https://promptsforbusiness.com/thanks?pack={}"
SITES = {
    "layoffleads": dict(
        name="LayoffLeads",
        submit="LayoffLeads Pro. Receipts and billing help: hello@layoffleads.com",
        tos="I agree to the LayoffLeads [Terms of Service](https://layoffleads.com/terms) and [Privacy Policy](https://layoffleads.com/privacy).",
        links=[("pro-monthly", "https://buy.stripe.com/aFa00icJqail9Osbg78k80M", LL_THANKS),
               ("pro-annual",  "https://buy.stripe.com/cNi3cu6l2bmp8Kobg78k80N", LL_THANKS)]),
    "promptsforbusiness": dict(
        name="Prompts for Business",
        submit="Prompts for Business. Your prompts arrive by email within one business day. Help: hello@promptsforbusiness.com",
        tos="I agree to the Prompts for Business [Terms of Service](https://promptsforbusiness.com/terms) and [Privacy Policy](https://promptsforbusiness.com/privacy).",
        links=[(slug, "https://buy.stripe.com/" + code, PFB_THANKS.format(qs)) for slug, code, qs in [
            ("bundle",                "bJe14mgZG7692m0gAr8k80L", "all-access"),
            ("linkedin-week",         "bJecN4gZG6258Ko97Z8k80D", "linkedin-week"),
            ("cold-email-sequence",   "eVq5kC4cU2PTf8M6ZR8k80A", "cold-email-sequence"),
            ("repurpose-blog-post",   "00w5kC24M4Y1e4I5VN8k80I", "repurpose-blog-post"),
            ("meta-ad-copy",          "9B69AS38Q0HL8Ko97Z8k80F", "meta-ad-copy"),
            ("seo-blog-brief",        "6oUfZg10IfCF7GkgAr8k80K", "seo-blog-brief"),
            ("newsletter-20-minutes", "bJecN4bFmeyBbWAesj8k80G", "newsletter-20-minutes"),
            ("landing-page-copy",     "5kQ00i7p64Y1d0E1Fx8k80C", "landing-page-copy"),
            ("brand-voice-guide",     "3cIcN4cJqfCF8Ko6ZR8k80z", "brand-voice-guide"),
            ("customer-persona",      "aFabJ0aBi0HL0dSckb8k80B", "customer-persona"),
            ("sales-call-prep",       "9B65kCgZGeyB5yc4RJ8k80J", "sales-call-prep"),
            ("proposal-writer",       "eVqbJ04cUcqt4u85VN8k80H", "proposal-writer"),
            ("meeting-notes-actions", "cNibJ038Qail4u8ckb8k80E", "meeting-notes-actions")]]),
}

def curl(args, stdin=None):
    p = subprocess.run([CURL] + args, input=stdin, capture_output=True, text=True)
    return p.returncode, p.stdout, p.stderr

def stripe(method, path, params=None):
    """Key goes to curl via a -K config on stdin: never in argv, never logged."""
    if method == "POST":
        assert params is not None
        for k, _ in params:
            if k == "active" or k.startswith("active"):
                stop("internal guard: refusing to send `active`")
    url = API + path
    args = ["-sS", "-K", "-", "-w", "\n%{http_code}", "-X", method]
    if method == "GET" and params:
        url += "?" + urllib.parse.urlencode(params)
    elif params:
        for k, v in params: args += ["--data-urlencode", f"{k}={v}"]
    args.append(url)
    rc, out, err = curl(args, stdin=f'user = "{KEY}:"\n')
    if rc != 0:
        return 0, {"error": {"message": f"curl rc={rc}"}}
    body, _, code = out.rpartition("\n")
    try: data = json.loads(body) if body.strip() else {}
    except ValueError: data = {"error": {"message": "non-JSON response"}}
    return int(code or 0), data

def errmsg(d): return (d.get("error") or {}).get("message", "?")

# ---- 1. key + account
if not (KEY.startswith("sk_live_") or KEY.startswith("rk_live_")):
    stop(f"{KEYNAME} is not a live key (the links are live). Refusing.")
log(f"mode={MODE} key_var={KEYNAME} (value not shown)")
code, acct = stripe("GET", "/account")
if code != 200: stop(f"GET /account HTTP {code}: {errmsg(acct)}")
if not str(acct.get("id", "")).startswith(EXPECT_ACCT):
    stop(f"key belongs to {acct.get('id')} not {EXPECT_ACCT}* (MDO3). Refusing.")
bp = acct.get("business_profile") or {}
dash = (acct.get("settings") or {}).get("dashboard") or {}
account_view = {"id": acct.get("id"), "business_profile.name": bp.get("name"),
                "settings.dashboard.display_name": dash.get("display_name"),
                "business_profile.url": bp.get("url"), "business_profile.support_email": bp.get("support_email")}
log(f"account {acct.get('id')}: public business name={bp.get('name')!r} display_name={dash.get('display_name')!r}")

# ---- 2. resolve buy.stripe.com URLs to plink ids (read-only list, paginated)
by_url, after = {}, None
for _ in range(50):
    q = [("limit", "100")] + ([("starting_after", after)] if after else [])
    code, page = stripe("GET", "/payment_links", q)
    if code != 200: stop(f"GET /payment_links HTTP {code}: {errmsg(page)}")
    for pl in page.get("data", []): by_url[pl.get("url")] = pl
    if not page.get("has_more") or not page.get("data"): break
    after = page["data"][-1]["id"]

targets = []
for site, cfg in SITES.items():
    for slug, url, redirect in cfg["links"]:
        pl = by_url.get(url)
        if not pl: stop(f"{site}/{slug}: {url} not found on {acct.get('id')}")
        targets.append(dict(site=site, slug=slug, url=url, id=pl["id"], redirect=redirect, cfg=cfg))

# ---- 3. read-back (full GET per link) -> restore reference (information only)
readback = {"taken": TS, "account": account_view, "links": []}
for t in targets:
    code, pl = stripe("GET", f"/payment_links/{t['id']}")
    if code != 200: stop(f"GET {t['id']} HTTP {code}: {errmsg(pl)}")
    t["cur"] = pl
    readback["links"].append({"site": t["site"], "slug": t["slug"], "id": t["id"], "url": t["url"],
        "active": pl.get("active"), "consent_collection": pl.get("consent_collection"),
        "after_completion": pl.get("after_completion"), "custom_text": pl.get("custom_text")})
rb_path = os.path.join(OUT, f"readback_{TS}.json")
with open(rb_path, "w") as f: json.dump(readback, f, indent=2)
log(f"read-back saved: {rb_path} ({len(targets)} links)")

# ---- 4. diff
def cur_state(pl):
    cc = pl.get("consent_collection") or {}
    ac = pl.get("after_completion") or {}
    ct = pl.get("custom_text") or {}
    return {"consent_collection.terms_of_service": cc.get("terms_of_service"),
            "after_completion": ac.get("type") + ":" + str(((ac.get("redirect") or {}).get("url")))
                                if ac.get("type") == "redirect" else str(ac.get("type")),
            "custom_text.submit.message": (ct.get("submit") or {}).get("message"),
            "custom_text.terms_of_service_acceptance.message": (ct.get("terms_of_service_acceptance") or {}).get("message")}
def want_state(t):
    return {"consent_collection.terms_of_service": "required",
            "after_completion": "redirect:" + t["redirect"],
            "custom_text.submit.message": t["cfg"]["submit"],
            "custom_text.terms_of_service_acceptance.message": t["cfg"]["tos"]}

todo = []
print("\n=== DIFF (current -> target) ===")
print(f"account public business name (reported, NOT changed): {bp.get('name')!r}")
for t in targets:
    c, w = cur_state(t["cur"]), want_state(t)
    changed = [k for k in w if c[k] != w[k]]
    flag = "" if t["cur"].get("active") else "  [link is INACTIVE: left as is, never reactivated or paused here]"
    print(f"\n{t['site']}/{t['slug']} {t['id']} {t['url']}{flag}")
    for k in w:
        print(f"  {'~' if k in changed else '='} {k}: {c[k]!r}" + (f"\n      -> {w[k]!r}" if k in changed else ""))
    if changed: todo.append(t)
print(f"\n{len(todo)}/{len(targets)} links need changes.")

# ---- 5. ToS gate
tos_ok, tos_note = False, ""
if not TOS_URL:
    tos_note = "LINKS_TOS_URL unset: set the ToS URL in Stripe Dashboard > Settings > Public details, then export it"
else:
    rc, out, _ = curl(["-s", "-o", "/dev/null", "-L", "-w", "%{http_code}", "--max-time", "20", TOS_URL])
    tos_ok = rc == 0 and out.strip() == "200"
    tos_note = f"LINKS_TOS_URL {TOS_URL} -> HTTP {out.strip() or rc}"
log(("ToS gate PASS: " if tos_ok else "ToS gate BLOCKED: ") + tos_note)

if MODE == "dry":
    log(f"dry done: {len(todo)} to change; nothing written. Read-back: {rb_path}")
    sys.exit(0)

# ---- 6. apply
if not tos_ok: stop("apply refused: " + tos_note)
if not todo: log("apply: nothing to do (all links at target)"); sys.exit(0)

def params_for(t):
    p = [("consent_collection[terms_of_service]", "required"),
         ("after_completion[type]", "redirect"),
         ("after_completion[redirect][url]", t["redirect"]),
         ("custom_text[submit][message]", t["cfg"]["submit"]),
         ("custom_text[terms_of_service_acceptance][message]", t["cfg"]["tos"])]
    ct = t["cur"].get("custom_text") or {}
    for k in ("shipping_address", "after_submit"):          # keep other custom_text parts as they are
        m = (ct.get(k) or {}).get("message")
        if m: p.append((f"custom_text[{k}][message]", m))
    return p

done = []
def report_and_stop(where, why):
    log(f"STOP at {where}: {why}")
    log(f"  written OK before the stop: {', '.join(done) or 'none'}")
    log(f"  NO rollback performed (Principal rule). Before-state for reference: {rb_path}")
    log("  report to the Bridge with this log: " + LOG)
    sys.exit(2)

for t in todo:
    where = f"{t['site']}/{t['slug']} {t['id']}"
    code, res = stripe("POST", f"/payment_links/{t['id']}", params_for(t))
    if code != 200: report_and_stop(where, f"write HTTP {code}: {errmsg(res)}")
    code, chk = stripe("GET", f"/payment_links/{t['id']}")
    if code != 200: report_and_stop(where, f"verify GET HTTP {code}: {errmsg(chk)}")
    c, w = cur_state(chk), want_state(t)
    bad = [k for k in w if c[k] != w[k]]
    if chk.get("active") != t["cur"].get("active"): bad.append("active changed")
    if bad: report_and_stop(where, "verify mismatch: " + ", ".join(bad))
    done.append(f"{t['site']}/{t['slug']}"); log(f"  OK {where}")

log(f"apply done: {len(done)} links written + verified. Before: {rb_path}")
PY
