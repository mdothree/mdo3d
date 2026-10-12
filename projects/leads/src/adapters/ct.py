"""
Connecticut adapter #3: "Connecticut Business Registry - Business Master" (Connecticut Secretary of
the State via data.ct.gov, Socrata dataset n7gp-d28j).

- URL: https://data.ct.gov/Business/Connecticut-Business-Registry-Business-Master/n7gp-d28j
- Licence: Public Domain (dataset metadata, attribution "Secretary of the State"); refreshed daily.
- Access: free, no registration. Anonymous SODA requests are throttled; set SOCRATA_APP_TOKEN
  (a free Socrata app token) to raise the limit. The token is optional.
- New filings for a date: SoQL `$where=date_registration='YYYY-MM-DDT00:00:00'`. For domestic
  businesses that is the formation date; for foreign ones, the date they registered in CT.

Field choices (business-level data only):
- source_id = `accountnumber` (the state's Business ID).
- Address = the business address (`billing*` columns). The dataset has no county, so county stays None.
- No registered agent in this dataset (agents/principals are separate CT datasets, not fetched): None.
- `naics_code` is published by the state as "Description (NNNNNN)"; the numeric code becomes
  naics_guess with naics_basis "state-published NAICS". No code in the value -> None.
- `business_email_address` is published by the state on the filing; it becomes one Contact with the
  dataset record URL as its source. Nothing else is turned into a contact; nothing is guessed.
- Owner-survey columns (woman/veteran/minority/disability/LGBTQI-owned and the survey email) describe
  the owners, not the business; they are dropped from `raw` and never stored.
"""
from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from typing import Optional
from urllib.parse import quote

from .base import Address, Contact, Filing, RawBatch, clean, parse_date

DATASET_ID = "n7gp-d28j"
DATASET_URL = f"https://data.ct.gov/resource/{DATASET_ID}.json"
PAGE_SIZE = 1000
MAX_PAGES = 200      # 200k rows for one registration date is far beyond any real day; stops runaway loops
MAX_TRIES = 4        # per page: 1 try + 3 retries on 429/5xx/connection errors
BACKOFF_S = 2.0      # 2s, 4s, 8s

NAICS_BASIS = "state-published NAICS"

CT_TYPE_KIND = {
    "LLC": "llc",
    "Stock": "corporation", "B Corp": "corporation", "Bank Stock": "corporation",
    "Insurance Stock": "corporation",
    # CT's nonprofit form is the nonstock corporation (CGS ch. 602).
    "Non-Stock": "nonprofit", "Religious": "nonprofit", "Non-Stock Specially Chartered": "nonprofit",
    "LLP": "partnership", "Limited Partnership": "partnership", "General Partnerships": "partnership",
    "Cooperative Association": "cooperative",
}
ACTIVE_STATUSES = {"Active", "Active - Pending Domestication"}
INACTIVE_STATUSES = {
    "Dissolved", "Rejected", "Withdrawn", "Forfeited", "Renunciated", "Merged", "Cancelled", "Revoked",
    "Converted Out",
}
# Owner-level survey answers and system columns: not business data, never kept.
DROP_FIELDS = {
    "woman_owned_organization", "veteran_owned_organization", "minority_owned_organization",
    "org_owned_by_person_s_with", "organization_is_lgbtqi_owned", "category_survey_email_address",
    "geo_location",
}
_NAICS_RE = re.compile(r"\((\d{2,6})\)\s*$")
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")
RETRY_STATUS = {429, 500, 502, 503, 504}


def _iso_date(source_date: str) -> str:
    """YYYYMMDD -> YYYY-MM-DD (raises on a malformed date rather than guessing)."""
    d = parse_date(source_date, ("%Y%m%d",))
    if d is None:
        raise ValueError(f"bad source_date {source_date!r}; expected YYYYMMDD")
    return d.isoformat()


def naics_from(value) -> Optional[str]:
    """'Retail Bakeries (311811)' -> '311811'; anything without a code in parentheses -> None."""
    s = clean(value)
    if not s:
        return None
    m = _NAICS_RE.search(s)
    return m.group(1) if m else None


def _net_errors() -> tuple:
    """Transient network errors worth a retry (requests' own plus the builtins)."""
    import requests
    return (requests.ConnectionError, requests.Timeout, ConnectionError, TimeoutError)


def record_url(account: str) -> str:
    return f"{DATASET_URL}?accountnumber={quote(account)}"


class ConnecticutAdapter:
    state = "CT"
    access = "free-api"

    def __init__(self, session=None, page_size: int = PAGE_SIZE, sleep=time.sleep):
        self._session = session
        self.page_size = page_size
        self._sleep = sleep

    def _get_session(self):
        if self._session is None:
            import requests
            self._session = requests.Session()
        return self._session

    def _get_page(self, session, params: dict, headers: dict) -> list:
        """One SODA page with retry + exponential backoff on throttling, 5xx and connection errors."""
        last_exc: Optional[Exception] = None
        for attempt in range(MAX_TRIES):
            try:
                resp = session.get(DATASET_URL, params=params, headers=headers, timeout=60)
                code = getattr(resp, "status_code", 200)
                if code in RETRY_STATUS:
                    last_exc = RuntimeError(f"HTTP {code} from {DATASET_URL}")
                else:
                    resp.raise_for_status()
                    chunk = resp.json()
                    if not isinstance(chunk, list):
                        raise ValueError(f"unexpected SODA response type {type(chunk).__name__}")
                    return chunk
            except _net_errors() as e:
                last_exc = e
            if attempt < MAX_TRIES - 1:
                self._sleep(BACKOFF_S * (2 ** attempt))
        raise last_exc or RuntimeError("SODA request failed")

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
                "$where": f"date_registration='{day}T00:00:00'",
                "$order": "accountnumber",
                "$limit": self.page_size,
                "$offset": page * self.page_size,
            }
            chunk = self._get_page(session, params, headers)
            rows.extend({k: v for k, v in r.items() if k not in DROP_FIELDS and not k.startswith(":@")}
                        for r in chunk if isinstance(r, dict))
            if len(chunk) < self.page_size:
                break
        batch = RawBatch(state=self.state, source_date=source_date)
        local = workdir / f"{source_date}_ct_business_master.json"
        local.write_text(json.dumps(rows))
        batch.files["business_master"] = local
        return batch

    def parse(self, raw: RawBatch) -> list[dict]:
        path = raw.files.get("business_master")
        if not path:
            return []
        data = json.loads(Path(path).read_text() or "[]")
        return [{k: v for k, v in r.items() if k not in DROP_FIELDS and not k.startswith(":@")}
                for r in data if isinstance(r, dict)]

    @staticmethod
    def _active(status):
        s = clean(status)
        if s in ACTIVE_STATUSES:
            return True
        if s in INACTIVE_STATUSES:
            return False
        return None  # e.g. "Domesticated", "Recorded", "Converted": not a clear active/inactive signal

    @staticmethod
    def _contacts(record: dict, account: str) -> list[Contact]:
        email = clean(record.get("business_email_address"))
        if not email or not account or not _EMAIL_RE.match(email):
            return []  # malformed values are dropped, never "fixed"
        return [Contact(kind="email", value=email, source=record_url(account), verified=True)]

    def normalize(self, record: dict) -> Filing:
        account = clean(record.get("accountnumber")) or ""
        ftype = clean(record.get("business_type"))
        registered = clean(record.get("date_registration"))
        naics = naics_from(record.get("naics_code"))
        return Filing(
            state=self.state,
            source_id=account,
            entity=clean(record.get("name")) or "",
            filing_type=ftype,
            entity_kind=CT_TYPE_KIND.get(ftype or "", "other"),
            filed_date=parse_date(registered[:10] if registered else None, ("%Y-%m-%d",)),
            status=clean(record.get("status")),
            active=self._active(record.get("status")),
            county=None,
            registered_agent=None,
            principal_address=Address(
                line1=clean(record.get("billingstreet")),
                line2=clean(record.get("billing_unit")),
                city=clean(record.get("billingcity")),
                state=clean(record.get("billingstate")),
                zip_code=clean(record.get("billingpostalcode")),
            ),
            naics_guess=naics,
            naics_basis=NAICS_BASIS if naics else None,
            contacts=self._contacts(record, account),
            raw=record,
        )
