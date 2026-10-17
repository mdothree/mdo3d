#!/usr/bin/env python3
"""Validate a sector's ledger. Exit 1 on any rejected row.

  python3 scripts/validate.py --sector quantum            schema + evidence + dedupe
  python3 scripts/validate.py --sector quantum --fetch    also fetch each source and confirm the excerpt is on the page
  python3 scripts/validate.py --sector quantum --stats    print counts as JSON (used by build + GO check)
  python3 scripts/validate.py --file candidates.jsonl --kind events   validate a candidate file against the ledger

Rule: no evidence, no entry. A row without source_url or excerpt (or claim quote) is rejected.
"""
from __future__ import annotations

import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ledger_lib as L  # noqa: E402


def stats(events: list[dict], claims: list[dict]) -> dict:
    by_type = {t: 0 for t in L.EVENT_TYPES}
    for e in events:
        by_type[e.get("type")] = by_type.get(e.get("type"), 0) + 1
    by_status = {s: 0 for s in L.CLAIM_STATUSES}
    for c in claims:
        by_status[c.get("status")] = by_status.get(c.get("status"), 0) + 1
    return {
        "events": len(events),
        "claims": len(claims),
        "companies": len({e["company"] for e in events} | {c["company"] for c in claims}),
        "events_by_type": by_type,
        "claims_by_status": by_status,
        "rows_without_source": sum(1 for r in events + claims if not L._is_url(r.get("source_url"))),
        "first_date": min((e["date"] for e in events), default=None),
        "last_date": max((e["date"] for e in events), default=None),
    }


def check(events: list[dict], claims: list[dict], fetch: bool) -> int:
    bad = 0
    ids = {}
    for kind, rows, fn, dup in (("event", events, L.validate_event, L.event_duplicate_reason),
                                ("claim", claims, L.validate_claim, L.claim_duplicate_reason)):
        for i, r in enumerate(rows):
            errs = fn(r)
            rid = r.get("id", f"{kind}#{i + 1}")
            if rid in ids:
                errs.append(f"duplicate id (also {ids[rid]})")
            ids[rid] = f"{kind}#{i + 1}"
            d = dup(r, rows[:i])
            if d:
                errs.append(f"duplicate: {d}")
            if errs:
                bad += 1
                print(f"REJECT {kind} {rid}: " + "; ".join(errs))
    if fetch:
        jobs = [(e.get("id"), e.get("source_url"), e.get("excerpt")) for e in events] + \
               [(c.get("id"), c.get("source_url"), c.get("claim")) for c in claims] + \
               [(c.get("id") + "#evidence", c.get("status_evidence_url"), q)
                for c in claims if c.get("status_evidence_url") for q in L.note_quotes(c.get("status_note"))]
        with ThreadPoolExecutor(8) as pool:
            res = list(pool.map(lambda j: (j[0], j[1], L.excerpt_at_source(j[1], j[2])), jobs))
        n = {"found": 0, "partial": 0, "missing": 0, "unreachable": 0}
        for rid, url, st in res:
            key = st.split(":")[0]
            n[key] = n.get(key, 0) + 1
            if key != "found":
                print(f"FETCH {st:<28} {rid} {url}")
        print("FETCH summary " + json.dumps(n))
        # Missing text at a reachable source is a hard failure; bot walls are reported, not failed.
        bad += n["missing"]
    return bad


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sector", default="quantum")
    ap.add_argument("--file")
    ap.add_argument("--kind", choices=("events", "claims"))
    ap.add_argument("--fetch", action="store_true")
    ap.add_argument("--stats", action="store_true")
    a = ap.parse_args()

    events, claims = L.load_sector(a.sector)
    if a.file:
        rows = L.read_jsonl(Path(a.file))
        if a.kind == "claims":
            claims = claims + rows
        else:
            events = events + rows

    if a.stats:
        print(json.dumps(stats(events, claims), indent=2))
        return 0

    bad = check(events, claims, a.fetch)
    s = stats(events, claims)
    print(f"{a.sector}: {s['events']} events, {s['claims']} claims, "
          f"{s['rows_without_source']} rows without source, {bad} rejected")
    return 1 if bad or s["rows_without_source"] else 0


if __name__ == "__main__":
    sys.exit(main())
