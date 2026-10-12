"""
Colorado adapter #2: "Business Entities in Colorado" (Colorado Secretary of State via the
Colorado Information Marketplace, Socrata dataset 4ykn-tg5h).

- URL: https://data.colorado.gov/Business/Business-Entities-in-Colorado/4ykn-tg5h
- Licence: Public Domain (dataset metadata, attribution "CDOS"); updated daily.
- Access: free, no registration. Anonymous SODA requests are throttled; set SOCRATA_APP_TOKEN
  (a free Socrata app token) to raise the limit. The token is optional.
- New filings for a date: SoQL `$where=entityformdate='YYYY-MM-DDT00:00:00'`.

The dataset has no county field, so county stays None (never inferred from ZIP).
Registered-agent names are part of the public filing; only the agent's name is kept in the
common schema (the full source row stays in `raw`).
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from .base import Address, Filing, RawBatch, clean, parse_date

DATASET_URL = "https://data.colorado.gov/resource/4ykn-tg5h.json"
PAGE_SIZE = 1000
MAX_PAGES = 200  # 200k rows for one formation date is far beyond any real day; stops runaway loops

CO_TYPE_KIND = {
    "DLLC": "llc", "FLLC": "llc",
    "DPC": "corporation", "FPC": "corporation", "DPC-PBC": "corporation",
    "DNC": "nonprofit", "FNC": "nonprofit",
    "DLP": "partnership", "FLP": "partnership", "DLLP": "partnership", "FLLP": "partnership",
    "DLLLP": "partnership", "FLLLP": "partnership", "GP": "partnership", "DLPA": "partnership",
    "FLPA": "partnership",
    "DC55": "cooperative", "DC55-PBC": "cooperative", "DC56": "cooperative", "DC56-PBC": "cooperative",
    "DLCA": "cooperative", "DLCA-PBC": "cooperative", "FLCA": "cooperative", "FCOOP": "cooperative",
}
ACTIVE_STATUSES = {"Good Standing", "Exists"}
INACTIVE_STATUSES = {
    "Delinquent", "Noncompliant", "Voluntarily Dissolved", "Judicially Dissolved",
    "Administratively Dissolved", "Withdrawn", "Merged", "Converted", "Effectiveness Prevented",
}


def _iso_date(source_date: str) -> str:
    """YYYYMMDD -> YYYY-MM-DD (raises on a malformed date rather than guessing)."""
    d = parse_date(source_date, ("%Y%m%d",))
    if d is None:
        raise ValueError(f"bad source_date {source_date!r}; expected YYYYMMDD")
    return d.isoformat()


class ColoradoAdapter:
    state = "CO"
    access = "free-api"

    def __init__(self, session=None, page_size: int = PAGE_SIZE):
        self._session = session
        self.page_size = page_size

    def _get_session(self):
        if self._session is None:
            import requests
            self._session = requests.Session()
        return self._session

    def fetch(self, source_date: str, workdir: Path) -> RawBatch:
        workdir.mkdir(parents=True, exist_ok=True)
        day = _iso_date(source_date)
        headers = {"Accept": "application/json", "User-Agent": "mdo3d-leads/1.0 (+https://leads.mdo3d.com)"}
        token = os.environ.get("SOCRATA_APP_TOKEN", "")
        if token:
            headers["X-App-Token"] = token
        session = self._get_session()
        rows: list[dict] = []
        for page in range(MAX_PAGES):
            params = {
                "$where": f"entityformdate='{day}T00:00:00'",
                "$order": "entityid",
                "$limit": self.page_size,
                "$offset": page * self.page_size,
            }
            resp = session.get(DATASET_URL, params=params, headers=headers, timeout=60)
            resp.raise_for_status()
            chunk = resp.json()
            if not isinstance(chunk, list):
                raise ValueError(f"unexpected SODA response type {type(chunk).__name__}")
            rows.extend(chunk)
            if len(chunk) < self.page_size:
                break
        batch = RawBatch(state=self.state, source_date=source_date)
        local = workdir / f"{source_date}_co_entities.json"
        local.write_text(json.dumps(rows))
        batch.files["entities"] = local
        return batch

    def parse(self, raw: RawBatch) -> list[dict]:
        path = raw.files.get("entities")
        if not path:
            return []
        data = json.loads(Path(path).read_text() or "[]")
        return [r for r in data if isinstance(r, dict)]

    @staticmethod
    def _agent(record: dict):
        org = clean(record.get("agentorganizationname"))
        if org:
            return org
        parts = [clean(record.get(k)) for k in ("agentfirstname", "agentmiddlename", "agentlastname", "agentsuffix")]
        name = " ".join(p for p in parts if p)
        return name or None

    @staticmethod
    def _active(status):
        s = clean(status)
        if s in ACTIVE_STATUSES:
            return True
        if s in INACTIVE_STATUSES:
            return False
        return None

    def normalize(self, record: dict) -> Filing:
        ftype = clean(record.get("entitytype"))
        formed = clean(record.get("entityformdate"))
        return Filing(
            state=self.state,
            source_id=clean(record.get("entityid")) or "",
            entity=clean(record.get("entityname")) or "",
            filing_type=ftype,
            entity_kind=CO_TYPE_KIND.get(ftype or "", "other"),
            filed_date=parse_date(formed[:10] if formed else None, ("%Y-%m-%d",)),
            status=clean(record.get("entitystatus")),
            active=self._active(record.get("entitystatus")),
            county=None,
            registered_agent=self._agent(record),
            principal_address=Address(
                line1=clean(record.get("principaladdress1")),
                line2=clean(record.get("principaladdress2")),
                city=clean(record.get("principalcity")),
                state=clean(record.get("principalstate")),
                zip_code=clean(record.get("principalzipcode")),
            ),
            raw=record,
        )
