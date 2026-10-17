#!/usr/bin/env python3
"""Frontier Ledger collector (one sector per run).

Pattern from Daily AI Toll run_toll.py:
  - Claude with the server-side web search tool finds and extracts candidate rows.
  - "No evidence, no entry": each row needs source_url + verbatim excerpt; the validator rejects the rest.
  - Dedupe against the ledger (same source URL, or same company+type+similar title within 10 days).
  - Output goes to data/<sector>/candidates/<date>.jsonl for PR review. The collector never edits
    events.jsonl / claims.jsonl directly; `--promote` merges a reviewed candidate file.

Keys are read by NAME from the environment only: ANTHROPIC_API_KEY (required for a live run).
Optional: FL_MODEL (overrides the model list), FL_MAX_TOKENS.

  python3 scripts/collect.py --sector quantum --dry-run       print the prompt, no API call
  python3 scripts/collect.py --sector quantum                 collect -> candidates/<today>.jsonl
  python3 scripts/collect.py --sector quantum --verify-fetch  also drop rows whose excerpt is not on the source page
  python3 scripts/collect.py --sector quantum --promote data/quantum/candidates/2026-10-17.jsonl
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ledger_lib as L  # noqa: E402

# Tried in order; the first model the API recognises wins (DAT pattern: a retired ID falls through).
MODELS = [m for m in [os.environ.get("FL_MODEL")] if m] + [
    "claude-opus-5-5",
    "claude-opus-4-8",
    "claude-sonnet-4-6",
    "claude-haiku-4-5",
]
SEARCH_TOOL_VARIANTS = [
    [{"type": "web_search_20260209", "name": "web_search"}],
    [{"type": "web_search_20250305", "name": "web_search"}],
]
MAX_TOKENS = int(os.environ.get("FL_MAX_TOKENS", "8000"))
LOOKBACK_DAYS = 3


def today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def load_config(sector: str) -> dict:
    return json.loads((L.ROOT / "config" / f"{sector}.json").read_text())


def build_prompt(cfg: dict, events: list[dict], claims: list[dict]) -> str:
    recent = "\n".join(f"- {e['date']} {e['company']}: {e['title']}" for e in events[-80:]) or "None yet"
    open_claims = "\n".join(f"- [{c['id']}] {c['company']}: \"{c['claim'][:140]}\" (target {c['target_date']}, now {c['status']})"
                            for c in claims if c["status"] in ("pending", "on_track")) or "None"
    return f"""# Frontier Ledger collection: {cfg['label']} ({today()})

Scope: {cfg['scope']}
Companies to cover first: {', '.join(cfg['companies'])}

Search the web for verifiable events from the past {LOOKBACK_DAYS} days. Rule: no evidence, no entry.
Only include an event if you opened the source and can quote it word for word. Prefer the company's own
newsroom, a regulator, or a major outlet. Never estimate, never infer. If nothing qualifies, return empty lists.

Event types: {', '.join(L.EVENT_TYPES)}.

Also look for (a) new dated public roadmap claims ("we will deliver X by Y") and (b) evidence that changes
the status of an open claim below. A status other than "pending" needs its own source URL.

## Already in the ledger (do not repeat)
{recent}

## Open claims
{open_claims}

## Output: return ONLY one JSON object, no other text
{{
  "events": [{{"date": "YYYY-MM-DD", "company": "...", "type": "milestone", "title": "<=90 chars, factual",
              "summary": "1-2 neutral sentences", "source_url": "https://...", "source_title": "...",
              "excerpt": "verbatim sentence(s) from the source, <=300 chars", "confidence": 0.85}}],
  "claims": [{{"company": "...", "claim": "verbatim quote", "claim_date": "YYYY-MM-DD", "target_date": "YYYY-MM-DD",
              "source_url": "https://...", "source_title": "..."}}],
  "claim_updates": [{{"id": "existing claim id", "status": "delivered|slipped|dropped|on_track",
                     "status_evidence_url": "https://...", "status_note": "factual one-liner"}}]
}}
confidence: 0.95 company primary source or filing, 0.85 major outlet, 0.7 trade press. Minimum {L.MIN_CONFIDENCE}.
"""


def call_claude(prompt: str) -> str:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise SystemExit("ANTHROPIC_API_KEY is not set (read by name only). Use --dry-run to inspect the prompt.")
    import anthropic  # pip install -r requirements.txt

    client = anthropic.Anthropic()
    last = None
    for model in MODELS:
        for tools in SEARCH_TOOL_VARIANTS:
            try:
                msg = client.messages.create(model=model, max_tokens=MAX_TOKENS, tools=tools,
                                             messages=[{"role": "user", "content": prompt}])
            except Exception as ex:  # unknown model / tool version: try the next variant
                last = ex
                text = str(ex).lower()
                if "not_found" in text or "does not exist" in text:
                    break  # model unknown: no point trying other tool versions on it
                continue
            searches = sum(1 for b in msg.content if getattr(b, "type", "") == "server_tool_use")
            if searches == 0:
                print(f"  {model}: answered without searching; discarding (DAT silent-search guard)")
                return '{"events": [], "claims": [], "claim_updates": []}'
            print(f"  model={model} searches={searches} in={msg.usage.input_tokens} out={msg.usage.output_tokens}")
            return "".join(getattr(b, "text", "") for b in msg.content if getattr(b, "type", "") == "text")
    raise SystemExit(f"All models failed: {last}")


def parse(text: str) -> dict:
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return {"events": [], "claims": [], "claim_updates": []}
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError:
        return {"events": [], "claims": [], "claim_updates": []}
    for k in ("events", "claims", "claim_updates"):
        data.setdefault(k, [])
    return data


def prepare(sector: str, data: dict, events: list[dict], claims: list[dict], verify_fetch: bool) -> tuple[list, list]:
    """Assign ids, stamp verified_at, validate, dedupe. Returns (accepted rows with kind, rejects)."""
    ok, rejects = [], []
    used = {r["id"] for r in events + claims if "id" in r}
    stamp = today()
    seen_events = list(events)
    for e in data["events"]:
        e = {k: e.get(k) for k in L.EVENT_FIELDS if k not in ("id", "verified_at")}
        e["id"] = L.next_event_id(sector, e.get("date") or stamp, used) if L._is_date(e.get("date")) else "?"
        e["verified_at"] = stamp
        e = {k: e.get(k) for k in L.EVENT_FIELDS}
        errs = L.validate_event(e)
        d = L.event_duplicate_reason(e, seen_events)
        if d:
            errs.append(d)
        if not errs and verify_fetch:
            st = L.excerpt_at_source(e["source_url"], e["excerpt"])
            if st != "found":
                errs.append(f"excerpt check: {st}")
        if errs:
            rejects.append({"kind": "event", "row": e, "errors": errs})
            continue
        used.add(e["id"])
        seen_events.append(e)
        ok.append({"kind": "event", "row": e})
    seen_claims = list(claims)
    for c in data["claims"]:
        c = {**{k: c.get(k) for k in ("company", "claim", "claim_date", "target_date", "source_url", "source_title")},
             "status": "pending", "status_evidence_url": "", "status_note": "", "verified_at": stamp}
        c["id"] = L.next_claim_id(sector, c.get("company") or "x", used)
        c = {k: c.get(k) for k in L.CLAIM_FIELDS}
        errs = L.validate_claim(c)
        d = L.claim_duplicate_reason(c, seen_claims)
        if d:
            errs.append(d)
        if errs:
            rejects.append({"kind": "claim", "row": c, "errors": errs})
            continue
        used.add(c["id"])
        seen_claims.append(c)
        ok.append({"kind": "claim", "row": c})
    by_id = {c["id"]: c for c in claims}
    for u in data["claim_updates"]:
        base = by_id.get(u.get("id"))
        if not base:
            rejects.append({"kind": "claim_update", "row": u, "errors": ["unknown claim id"]})
            continue
        new = {**base, **{k: u.get(k, "") for k in ("status", "status_evidence_url", "status_note")}, "verified_at": stamp}
        errs = L.validate_claim(new)
        if errs:
            rejects.append({"kind": "claim_update", "row": u, "errors": errs})
            continue
        ok.append({"kind": "claim_update", "row": new})
    return ok, rejects


def promote(sector: str, path: Path) -> int:
    """Merge a reviewed candidate file into the ledger (run after PR review)."""
    events, claims = L.load_sector(sector)
    cands = L.read_jsonl(path)
    claims_by_id = {c["id"]: c for c in claims}
    for c in cands:
        if c["kind"] == "event":
            events.append(c["row"])
        elif c["kind"] == "claim":
            claims.append(c["row"])
            claims_by_id[c["row"]["id"]] = c["row"]
        elif c["kind"] == "claim_update":
            claims_by_id[c["row"]["id"]].update(c["row"])
    events.sort(key=lambda e: (e["date"], e["id"]))
    bad = [r for r in events if L.validate_event(r)] + [r for r in claims if L.validate_claim(r)]
    if bad:
        print(f"refusing to promote: {len(bad)} invalid rows")
        return 1
    d = L.sector_dir(sector)
    L.write_jsonl(d / "events.jsonl", events)
    L.write_jsonl(d / "claims.jsonl", claims)
    print(f"promoted {len(cands)} candidate rows from {path.name}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sector", default="quantum")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--verify-fetch", action="store_true")
    ap.add_argument("--promote")
    ap.add_argument("--from-file", help="parse a saved model response instead of calling the API (testing)")
    a = ap.parse_args()

    if a.promote:
        return promote(a.sector, Path(a.promote))

    cfg = load_config(a.sector)
    events, claims = L.load_sector(a.sector)
    prompt = build_prompt(cfg, events, claims)
    if a.dry_run:
        print(prompt)
        return 0

    text = Path(a.from_file).read_text() if a.from_file else call_claude(prompt)
    ok, rejects = prepare(a.sector, parse(text), events, claims, a.verify_fetch)
    out_dir = L.sector_dir(a.sector) / "candidates"
    out = out_dir / f"{today()}.jsonl"
    if ok:
        L.write_jsonl(out, ok)
    if rejects:
        L.write_jsonl(out_dir / f"{today()}.rejected.jsonl", rejects)
    status = {"date": today(), "sector": a.sector, "accepted": len(ok), "rejected": len(rejects),
              "candidate_file": str(out.relative_to(L.ROOT)) if ok else None}
    (L.ROOT / "collection_status.json").write_text(json.dumps(status, indent=2) + "\n")
    print(json.dumps(status))
    return 0


if __name__ == "__main__":
    sys.exit(main())
