"""
State adapter interface.

Plan: ~/latarence/docs/plans/input_prompts_0/PART_C_product_research_content.md §C5.
Each state's new-business-filing feed becomes one adapter with three steps:

    fetch(date)      -> RawBatch      download that date's raw files/pages (no parsing)
    parse(raw)       -> list[dict]    state-specific records, field names as the source has them
    normalize(rec)   -> Filing        map one record onto the common schema below

Wired into runner.py behind the profile field `states: [...]` and the `--ingest` CLI mode
(see docs/STATE_ADAPTERS.md). Filings are stored in SQLite with (state, source_id) unique.

Rules baked into the schema:
- Never fabricate. Unknown fields stay None (no guessed NAICS, county or contact data).
- Never guess email addresses. Contact fields are only filled from public sources and carry
  `verified=True`; otherwise they are left empty.
- `raw` keeps the source record so a later enrichment pass can re-derive without re-fetching.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import date
from pathlib import Path
from typing import Iterable, Optional, Protocol, runtime_checkable

# Common, cross-state entity kinds. Each adapter maps its own type codes onto these; a code the
# adapter does not recognise maps to "other" (never guessed from the entity name).
ENTITY_KINDS = ("llc", "corporation", "nonprofit", "partnership", "cooperative", "trade_name", "other")


@dataclass
class Address:
    line1: Optional[str] = None
    line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

    def is_empty(self) -> bool:
        return not any((self.line1, self.line2, self.city, self.state, self.zip_code))


@dataclass
class Contact:
    """A public contact point. Only ever set from a published source, never inferred."""
    kind: str                     # "website" | "phone" | "email"
    value: str
    source: str                   # URL or feed the value was read from
    verified: bool = True         # a Contact exists only when verified; unverified data is not stored


@dataclass
class Filing:
    """Common schema across states (one new-business filing = one lead)."""
    state: str                                    # two-letter code of the filing state, e.g. "FL"
    source_id: str                                # the state's document/registration number
    entity: str                                   # registered entity name
    filing_type: Optional[str] = None             # as the state labels it (e.g. "FLAL", "DOMP", "FIC", "DLLC")
    entity_kind: str = "other"                    # one of ENTITY_KINDS, mapped from filing_type
    filed_date: Optional[date] = None
    status: Optional[str] = None                  # as the state labels it ("A", "Good Standing", ...)
    active: Optional[bool] = None                 # True/False only when the source status says so
    county: Optional[str] = None
    registered_agent: Optional[str] = None
    principal_address: Address = field(default_factory=Address)
    naics_guess: Optional[str] = None             # None until an evidence-based classifier exists
    naics_basis: Optional[str] = None             # why that code (keyword hit, source field); required if naics_guess set
    contacts: list[Contact] = field(default_factory=list)
    source_date: Optional[str] = None             # the feed date the record came from (YYYYMMDD)
    raw: dict = field(default_factory=dict)

    def key(self) -> tuple[str, str]:
        return (self.state, self.source_id)

    def to_row(self) -> dict:
        """Flat dict for the SQLite `filings` table (web/backend/db.py upsert_filings)."""
        a = self.principal_address
        return {
            "state": self.state,
            "source_id": self.source_id,
            "entity": self.entity,
            "filing_type": self.filing_type,
            "entity_kind": self.entity_kind,
            "filed_date": self.filed_date.isoformat() if self.filed_date else None,
            "status": self.status,
            "active": None if self.active is None else int(self.active),
            "county": self.county,
            "registered_agent": self.registered_agent,
            "address_1": a.line1,
            "address_2": a.line2,
            "city": a.city,
            "address_state": a.state,
            "zip_code": a.zip_code,
            "naics_guess": self.naics_guess,
            "naics_basis": self.naics_basis,
            "contacts": json.dumps([asdict(c) for c in self.contacts if c.verified]),
            "source_date": self.source_date,
            "raw": json.dumps(self.raw, default=str, sort_keys=True),
        }

    def to_legacy_row(self) -> dict:
        """The dict shape runner.filter_leads / save_csv / the leads table already use."""
        a = self.principal_address
        return {
            "doc_number": self.source_id,
            "corp_name": self.entity,
            "status": self.status or "",
            "filing_type": self.filing_type or "",
            "address_1": a.line1 or "",
            "address_2": a.line2 or "",
            "city": a.city or "",
            "state": a.state or "",
            "zip_code": a.zip_code or "",
            "county": self.county or "",
            "file_date": self.filed_date.strftime("%m%d%Y") if self.filed_date else "",
            "registered_agent": self.registered_agent or "",
            "filing_state": self.state,
            "entity_kind": self.entity_kind,
        }


@dataclass
class RawBatch:
    """What fetch() returns: the files (or payloads) for one state and one date."""
    state: str
    source_date: str                              # YYYYMMDD
    files: dict[str, Path] = field(default_factory=dict)   # logical name -> local path
    missing: list[str] = field(default_factory=list)       # logical names the source had no file for


@runtime_checkable
class StateAdapter(Protocol):
    state: str                 # "FL"
    access: str                # "free-bulk" | "free-api" | "registration" | "paid"  (paid = spend decision)

    def fetch(self, source_date: str, workdir: Path) -> RawBatch: ...
    def parse(self, raw: RawBatch) -> list[dict]: ...
    def normalize(self, record: dict) -> Filing: ...


def dedupe(filings: Iterable[Filing]) -> list[Filing]:
    """Dedupe on (state, source_id). The record from the latest source_date wins; ties: last seen wins."""
    out: dict[tuple[str, str], Filing] = {}
    for f in filings:
        if not f.source_id:
            continue  # a filing without the state's id cannot be keyed; never invent one
        prev = out.get(f.key())
        if prev is None or (f.source_date or "") >= (prev.source_date or ""):
            out[f.key()] = f
    return list(out.values())


def run_adapter(adapter: StateAdapter, source_date: str, workdir: Path) -> list[Filing]:
    """fetch → parse → normalize, deduped on (state, source_id)."""
    raw = adapter.fetch(source_date, workdir)
    filings = []
    for rec in adapter.parse(raw):
        f = adapter.normalize(rec)
        f.source_date = f.source_date or raw.source_date
        filings.append(f)
    return dedupe(filings)


def parse_date(value: Optional[str], formats: Iterable[str] = ("%m%d%Y", "%Y%m%d")) -> Optional[date]:
    """Parse a source date; return None rather than guessing when no format fits."""
    from datetime import datetime
    if not value or not value.strip():
        return None
    for fmt in formats:
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None


def clean(value) -> Optional[str]:
    """Strip; empty -> None."""
    if value is None:
        return None
    s = str(value).strip()
    return s or None
