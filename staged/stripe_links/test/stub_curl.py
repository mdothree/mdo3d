#!/usr/bin/env python3
"""Stub curl for LINKS_GO.sh tests. NEVER touches the network. State in $STUB_STATE, call log in $STUB_CALLS."""
import json, os, sys, urllib.parse
args = sys.argv[1:]
calls = os.environ["STUB_CALLS"]; statef = os.environ["STUB_STATE"]
key_seen = os.environ.get("STUB_KEY", "")
if key_seen and any(key_seen in a for a in args):
    print("KEY IN ARGV", file=sys.stderr); open(calls, "a").write("LEAK key-in-argv\n"); sys.exit(99)
url = [a for a in args if a.startswith("http")][-1]
method = args[args.index("-X") + 1] if "-X" in args else "GET"
if not url.startswith("https://api.stripe.com/"):
    open(calls, "a").write(f"TOSCHECK {url}\n"); sys.stdout.write("200"); sys.exit(0)
cfg = sys.stdin.read() if "-K" in args else ""
if f'user = "{key_seen}:"' not in cfg:
    open(calls, "a").write("NOKEY\n"); sys.exit(98)
data = [a.split("=", 1) for i, a in enumerate(args) if i and args[i-1] == "--data-urlencode"]
st = json.load(open(statef))
p = urllib.parse.urlparse(url); path = p.path[len("/v1"):]; q = dict(urllib.parse.parse_qsl(p.query))
open(calls, "a").write(f"{method} {path} {' '.join(k for k, _ in data)}\n")
def out(code, obj): sys.stdout.write(json.dumps(obj) + f"\n{code}"); sys.exit(0)
if path == "/account": out(200, st["account"])
if path == "/payment_links":
    ids = sorted(st["links"]); start = ids.index(q["starting_after"]) + 1 if "starting_after" in q else 0
    page = ids[start:start + 8]   # page size 8 (< limit) to exercise pagination
    out(200, {"object": "list", "data": [st["links"][i] for i in page], "has_more": start + 8 < len(ids)})
pid = path.split("/")[2]
pl = st["links"].get(pid)
if not pl: out(404, {"error": {"message": "No such payment_link"}})
if method == "GET": out(200, pl)
st["posts"] = st.get("posts", 0) + 1
if os.environ.get("STUB_FAIL_POST_N") and st["posts"] == int(os.environ["STUB_FAIL_POST_N"]):
    json.dump(st, open(statef, "w"))
    out(400, {"error": {"message": "You cannot collect consent to your terms of service unless a URL is set in the Stripe Dashboard."}})
for k, v in data:
    if k.startswith("active"): sys.exit(97)
    parts = k.replace("]", "").split("[")
    if os.environ.get("STUB_DROP_CUSTOM_TEXT") and parts[0] == "custom_text": continue
    node = pl
    for part in parts[:-1]:
        if node.get(part) is None: node[part] = {}
        node = node[part]
    node[parts[-1]] = v
if pl.get("after_completion", {}).get("type") == "redirect": pl["after_completion"].pop("hosted_confirmation", None)
json.dump(st, open(statef, "w")); out(200, pl)
