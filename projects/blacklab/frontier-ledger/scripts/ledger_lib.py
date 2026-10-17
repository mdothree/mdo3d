"""Frontier Ledger shared schema, validation and dedupe.

Pattern taken from Daily AI Toll (run_toll.py): "no evidence, no entry". Every row carries a
source URL and a verbatim excerpt; anything without them is rejected, never patched up.

Two record kinds per sector (data/<sector>/):
  events.jsonl  id, date, company, type, title, summary, source_url, source_title, excerpt, confidence, verified_at
  claims.jsonl  id, company, claim, claim_date, target_date, source_url, source_title, status,
                status_evidence_url, status_note, verified_at
"""
from __future__ import annotations

import html
import json
import re
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"

EVENT_TYPES = ("milestone", "funding", "contract", "regulatory", "launch", "hiring", "shutdown")
CLAIM_STATUSES = ("on_track", "delivered", "slipped", "dropped", "pending")
# Statuses that assert something happened need their own evidence link.
STATUS_NEEDS_EVIDENCE = ("on_track", "delivered", "slipped", "dropped")

EVENT_FIELDS = ("id", "date", "company", "type", "title", "summary", "source_url", "source_title",
                "excerpt", "confidence", "verified_at")
CLAIM_FIELDS = ("id", "company", "claim", "claim_date", "target_date", "source_url", "source_title",
                "status", "status_evidence_url", "status_note", "verified_at")

MIN_CONFIDENCE = 0.5
MIN_EXCERPT_CHARS = 20
DEDUPE_WINDOW_DAYS = 10
DEDUPE_TITLE_JACCARD = 0.6

_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


# --------------------------------------------------------------------------- io

def sector_dir(sector: str) -> Path:
    return DATA_DIR / sector


def read_jsonl(path: Path) -> list[dict]:
    rows = []
    if not path.exists():
        return rows
    with open(path, encoding="utf-8") as f:
        for n, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as e:
                rows.append({"__parse_error__": f"line {n}: {e}"})
    return rows


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def load_sector(sector: str) -> tuple[list[dict], list[dict]]:
    d = sector_dir(sector)
    return read_jsonl(d / "events.jsonl"), read_jsonl(d / "claims.jsonl")


# --------------------------------------------------------------------- helpers

def _is_date(s) -> bool:
    if not isinstance(s, str) or not _DATE.match(s):
        return False
    try:
        datetime.strptime(s, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def _is_url(s) -> bool:
    return isinstance(s, str) and s.startswith("https://") and " " not in s and len(s) > 12


def norm_url(u: str) -> str:
    u = (u or "").strip().split("#")[0].rstrip("/")
    return re.sub(r"^https?://(www\.)?", "", u).lower()


def _tokens(s: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", (s or "").lower()) if len(t) > 2}


def jaccard(a: str, b: str) -> float:
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def days_apart(d1: str, d2: str) -> int:
    try:
        return abs((datetime.strptime(d1, "%Y-%m-%d") - datetime.strptime(d2, "%Y-%m-%d")).days)
    except (TypeError, ValueError):
        return 10**6


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:24]


# ------------------------------------------------------------------ validation

def validate_event(e: dict) -> list[str]:
    errs = []
    if "__parse_error__" in e:
        return [e["__parse_error__"]]
    for k in EVENT_FIELDS:
        if k not in e:
            errs.append(f"missing field {k}")
    if not _is_url(e.get("source_url")):
        errs.append("no evidence: source_url missing or not https")
    if not isinstance(e.get("excerpt"), str) or len(e.get("excerpt", "").strip()) < MIN_EXCERPT_CHARS:
        errs.append("no evidence: excerpt missing or too short")
    if not _is_date(e.get("date")):
        errs.append("date not YYYY-MM-DD")
    if not _is_date(e.get("verified_at")):
        errs.append("verified_at not YYYY-MM-DD")
    if e.get("type") not in EVENT_TYPES:
        errs.append(f"type {e.get('type')!r} not in {EVENT_TYPES}")
    for k in ("company", "title", "summary", "source_title", "id"):
        if not isinstance(e.get(k), str) or not e.get(k).strip():
            errs.append(f"{k} empty")
    c = e.get("confidence")
    if not isinstance(c, (int, float)) or not (MIN_CONFIDENCE <= c <= 1):
        errs.append(f"confidence {c!r} outside [{MIN_CONFIDENCE}, 1]")
    return errs


def validate_claim(c: dict) -> list[str]:
    errs = []
    if "__parse_error__" in c:
        return [c["__parse_error__"]]
    for k in CLAIM_FIELDS:
        if k not in c:
            errs.append(f"missing field {k}")
    if not _is_url(c.get("source_url")):
        errs.append("no evidence: source_url missing or not https")
    if not isinstance(c.get("claim"), str) or len(c.get("claim", "").strip()) < MIN_EXCERPT_CHARS:
        errs.append("no evidence: claim quote missing or too short")
    for k in ("claim_date", "target_date", "verified_at"):
        if not _is_date(c.get(k)):
            errs.append(f"{k} not YYYY-MM-DD")
    st = c.get("status")
    if st not in CLAIM_STATUSES:
        errs.append(f"status {st!r} not in {CLAIM_STATUSES}")
    if st in STATUS_NEEDS_EVIDENCE:
        if not _is_url(c.get("status_evidence_url")):
            errs.append(f"status {st} needs status_evidence_url")
        if not (c.get("status_note") or "").strip():
            errs.append(f"status {st} needs status_note")
    for k in ("company", "source_title", "id"):
        if not isinstance(c.get(k), str) or not c.get(k).strip():
            errs.append(f"{k} empty")
    return errs


# ---------------------------------------------------------------------- dedupe

def event_duplicate_reason(e: dict, existing: list[dict]) -> str | None:
    """Same rule family as DAT is_duplicate_event:
      1. same source URL as an existing event (one source page = one event), or
      2. same company + same type within DEDUPE_WINDOW_DAYS and title Jaccard >= DEDUPE_TITLE_JACCARD.
    """
    u = norm_url(e.get("source_url", ""))
    for r in existing:
        if r is e:
            continue
        if u and norm_url(r.get("source_url", "")) == u:
            return f"source URL already tracked by {r.get('id')}"
        if (r.get("company", "").lower() == e.get("company", "").lower()
                and r.get("type") == e.get("type")
                and days_apart(r.get("date"), e.get("date")) <= DEDUPE_WINDOW_DAYS
                and jaccard(r.get("title", ""), e.get("title", "")) >= DEDUPE_TITLE_JACCARD):
            return f"same company+type+similar title within {DEDUPE_WINDOW_DAYS}d of {r.get('id')}"
    return None


def claim_duplicate_reason(c: dict, existing: list[dict]) -> str | None:
    for r in existing:
        if r is c:
            continue
        if (r.get("company", "").lower() == c.get("company", "").lower()
                and jaccard(r.get("claim", ""), c.get("claim", "")) >= 0.7):
            return f"near-identical claim to {r.get('id')}"
    return None


# ------------------------------------------------------------------------- ids

def next_event_id(sector: str, date: str, used: set[str]) -> str:
    prefix = f"fl-{sector[:1]}-{date.replace('-', '')}-"
    n = 1
    while f"{prefix}{n:02d}" in used:
        n += 1
    return f"{prefix}{n:02d}"


def next_claim_id(sector: str, company: str, used: set[str]) -> str:
    prefix = f"pl-{sector[:1]}-{slug(company)}-"
    n = 1
    while f"{prefix}{n:02d}" in used:
        n += 1
    return f"{prefix}{n:02d}"


# ------------------------------------------------------- excerpt-at-source check


def _norm_text(s: str) -> str:
    """Letters and digits only, lowercased. Link/markup spacing ("Nature ," / "IBM )"), curly quotes,
    dashes and trademark marks must not fail a verbatim quote; the words and their order still must match."""
    s = html.unescape(s or "").replace("™", " TM ").replace("®", " ")
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def fetch_text(url: str, timeout: int = 20) -> str:
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/129.0 Safari/537.36 FrontierLedgerVerifier/0.1",
        "Accept": "text/html,application/xhtml+xml"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read(4_000_000).decode("utf-8", "replace")
    raw = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", raw)
    return re.sub(r"(?s)<[^>]+>", " ", raw)


def excerpt_at_source(url: str, excerpt: str) -> str:
    """'found' | 'partial' | 'missing' | 'unreachable:<reason>'.
    found: the whole excerpt (or every part between ellipses) is on the page, ignoring spacing/punctuation.
    partial: only its opening is on the page."""
    try:
        page = _norm_text(fetch_text(url))
    except Exception as ex:  # network, 403 bot walls, timeouts
        return f"unreachable:{type(ex).__name__}"
    ex = _norm_text(excerpt)
    if ex and ex in page:
        return "found"
    pieces = [_norm_text(p) for p in re.split(r"\.\.\.|…|\[[^\]]*\]", excerpt or "")]
    pieces = [p for p in pieces if len(p) >= 20]
    if pieces and all(p in page for p in pieces):
        return "found"
    if ex[:50] in page:
        return "partial"
    return "missing"


_NOTE_QUOTE = re.compile(r"(?:^|(?<=[\s:]))'(.{15,}?)'(?=[\s.,;)]|$)")


def note_quotes(note: str) -> list[str]:
    """Quoted fragments inside a status_note ('...'); each must appear on the status evidence page."""
    return _NOTE_QUOTE.findall(note or "")
