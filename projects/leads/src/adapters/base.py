"""
State adapter interface (DRAFT, not yet wired into runner.py).

Plan: ~/latarence/docs/plans/input_prompts_0/PART_C_product_research_content.md §C5 (C9 first moves).
Each state's new-business-filing feed becomes one adapter with three steps:

    fetch(date)      -> RawBatch      download that date's raw files/pages (no parsing)
    parse(raw)       -> list[dict]    state-specific records, field names as the source has them
    normalize(rec)   -> Filing        map one record onto the common schema below

Rules baked into the schema:
- Never fabricate. Unknown fields stay None (no guessed NAICS, county or contact data).
- Never guess email addresses. Contact fields are only filled from public sources and carry
  `verified=True`; otherwise they are left empty.
- `raw` keeps the source record so a later enrichment pass can re-derive without re-fetching.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Iterable, Optional, Protocol, runtime_checkable


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
    filing_type: Optional[str] = None             # as the state labels it (e.g. "FLAL", "DOMP", "FIC")
    filed_date: Optional[date] = None
    status: Optional[str] = None
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
    access: str                # "free-bulk" | "registration" | "paid"  (paid feeds are a spend decision)

    def fetch(self, source_date: str, workdir: Path) -> RawBatch: ...
    def parse(self, raw: RawBatch) -> list[dict]: ...
    def normalize(self, record: dict) -> Filing: ...


def run_adapter(adapter: StateAdapter, source_date: str, workdir: Path) -> list[Filing]:
    """fetch → parse → normalize, deduped on (state, source_id); last record for a key wins."""
    raw = adapter.fetch(source_date, workdir)
    out: dict[tuple[str, str], Filing] = {}
    for rec in adapter.parse(raw):
        f = adapter.normalize(rec)
        f.source_date = f.source_date or raw.source_date
        out[f.key()] = f
    return list(out.values())


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
