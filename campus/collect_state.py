#!/usr/bin/env python3
"""MDO3D Campus state collector — stamps each room with LIVE activity + backlog.

Reads the room list from campus.js (single source of structure), then for each
room's directory computes real signals from git + the studio's status/audit docs,
and writes state.js (assigns window.CAMPUS_STATE) so the 3D viewer opens over
file:// with no server.

Unlike a repo-wide collector, activity here is scoped PER DIRECTORY: MDO3D is a
monorepo where many products (e.g. the 9 divination services) share one .git, so
we resolve each room's enclosing repo and run `git log`/`git status` restricted to
that room's subpath. Nested repos (mdothree/*, rigor/*, ronnascanner/*) resolve to
their own top-level and behave the same way.

Signals (all real, no fabrication):
  activity  0..1   git commit recency for the room's dir (last 30d ramp) -> warmth
  lastCommitDays    days since last commit touching the room's dir
  wip       int     uncommitted working-tree entries under the room's dir -> amber crates
  bugs      int     mentions of the room id in the audit/status docs      -> red crates
  efforts   int     mentions of the room id in STATUS.md                  -> detail panel

Stdlib only. Run from anywhere: python3 campus/collect_state.py
"""
import glob
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)  # ~/mdo3d

# Docs scanned for per-room backlog. Missing files are skipped silently.
# bugs  = mentions in the audit/status corpus (proxy for known open issues)
# efforts = mentions in STATUS.md (active work index)
EFFORT_LEDGER = "STATUS.md"


def parse_rooms(campus_js):
    """Extract {id, path} for each room line in campus.js (one object per line)."""
    rooms = []
    for line in campus_js.splitlines():
        line = line.strip()
        # Room lines carry a `neighborhood:` field; neighborhood header lines don't.
        if not line.startswith("{ id:") or "neighborhood:" not in line:
            continue
        m_id = re.search(r'id:\s*"([^"]+)"', line)
        if not m_id:
            continue
        m_path = re.search(r'path:\s*"([^"]+)"', line)
        rooms.append({"id": m_id.group(1), "path": m_path.group(1) if m_path else None})
    return rooms


def git(cwd, *args):
    try:
        out = subprocess.run(
            ["git", "-C", cwd, *args],
            capture_output=True, text=True, timeout=20,
        )
        if out.returncode != 0:
            return None
        return out.stdout
    except Exception:
        return None


def load_text(rel):
    p = os.path.join(ROOT, rel)
    try:
        with open(p, "r", errors="ignore") as f:
            return f.read()
    except OSError:
        return ""


def word_count(haystack, word):
    return len(re.findall(r"(?<![\w-])" + re.escape(word) + r"(?![\w-])", haystack, re.IGNORECASE))


def dir_signals(abspath, now):
    """Per-directory git activity: resolve the enclosing repo, scope log+status to
    this subpath. Returns (activity, lastCommitDays, wip)."""
    if not os.path.isdir(abspath):
        return 0.0, None, 0
    top = git(abspath, "rev-parse", "--show-toplevel")
    if not top:
        return 0.0, None, 0
    top = top.strip()
    rel_in_repo = os.path.relpath(abspath, top)
    activity, days = 0.0, None
    ts = git(top, "log", "-1", "--format=%ct", "--", rel_in_repo)
    if ts and ts.strip().isdigit():
        days = (now.timestamp() - int(ts.strip())) / 86400.0
        activity = round(max(0.0, min(1.0, 1.0 - days / 30.0)), 3)
        days = round(days, 1)
    wip = 0
    status = git(top, "status", "--porcelain", "--", rel_in_repo)
    if status is not None:
        wip = len([l for l in status.splitlines() if l.strip()])
    return activity, days, wip


def collect():
    campus_js = load_text("campus/campus.js")
    if not campus_js:
        sys.exit("campus/campus.js not found")
    rooms = parse_rooms(campus_js)

    # Audit corpus: STATUS.md + every documentation/*.md — bug mentions live here.
    doc_files = ["STATUS.md"] + sorted(
        os.path.relpath(p, ROOT) for p in glob.glob(os.path.join(ROOT, "documentation", "*.md"))
    )
    bug_text = "\n".join(load_text(f) for f in doc_files)
    effort_text = load_text(EFFORT_LEDGER)

    now = datetime.now(timezone.utc)
    state = {}
    for r in rooms:
        rid, rel = r["id"], r["path"]
        entry = {
            "activity": 0.0, "lastCommitDays": None, "serving": "unknown",
            "backlog": {"bugs": 0, "wip": 0, "efforts": 0},
        }
        if rel:
            abspath = os.path.join(ROOT, rel)
            entry["activity"], entry["lastCommitDays"], entry["backlog"]["wip"] = dir_signals(abspath, now)
        entry["backlog"]["bugs"] = word_count(bug_text, rid)
        entry["backlog"]["efforts"] = word_count(effort_text, rid)
        state[rid] = entry

    payload = {"generated": now.isoformat(timespec="seconds"), "rooms": state}
    out = os.path.join(HERE, "state.js")
    with open(out, "w") as f:
        f.write("// MDO3D Campus — LIVE state. Generated by collect_state.py; do not hand-edit.\n")
        f.write("window.CAMPUS_STATE = ")
        f.write(json.dumps(payload, indent=2))
        f.write(";\n")

    lit = sum(1 for e in state.values() if e["activity"] > 0)
    piled = sum(1 for e in state.values() if sum(e["backlog"].values()) > 0)
    print(f"wrote {out}: {len(state)} rooms, {lit} active, {piled} with backlog @ {payload['generated']}")


if __name__ == "__main__":
    collect()
