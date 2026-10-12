"""
Florida (Sunbiz) adapter #1. Wraps the runner.py SFTP pull and fixed-width parsers so its output
matches the legacy pipeline.

Source: Florida Division of Corporations public SFTP (free bulk data; credentials from env:
SUNBIZ_SFTP_HOST / SUNBIZ_SFTP_USER / SUNBIZ_SFTP_PASS — the state publishes the public login).
Files per date: doc/cor/<YYYYMMDD>c.txt (corporate) and doc/fic/<YYYYMMDD>f.txt (fictitious names).
"""
from __future__ import annotations

from pathlib import Path

from .base import Address, Filing, RawBatch, clean, parse_date

# Sunbiz filing-type codes -> common entity kind. Unlisted codes map to "other".
FL_TYPE_KIND = {
    "FLAL": "llc", "FORL": "llc",
    "DOMP": "corporation", "FORP": "corporation",
    "DOMNP": "nonprofit", "FORNP": "nonprofit", "NPREG": "nonprofit",
    "DOMLP": "partnership", "FORLP": "partnership", "LLP": "partnership", "FORLLP": "partnership",
    "GENPAR": "partnership",
    "FIC": "trade_name",
}


class FloridaAdapter:
    state = "FL"
    access = "free-bulk"

    REMOTE = {"corporate": "doc/cor/{d}c.txt", "fictitious": "doc/fic/{d}f.txt"}

    def fetch(self, source_date: str, workdir: Path) -> RawBatch:
        import runner  # lazy: reuse the existing SFTP connection settings
        workdir.mkdir(parents=True, exist_ok=True)
        batch = RawBatch(state=self.state, source_date=source_date)
        sftp = runner.connect_sftp()
        try:
            for name, pattern in self.REMOTE.items():
                local = workdir / f"{source_date}_{name}.txt"
                try:
                    sftp.get(pattern.format(d=source_date), str(local))
                    batch.files[name] = local
                except FileNotFoundError:
                    batch.missing.append(name)
        finally:
            sftp.close()
        return batch

    def parse(self, raw: RawBatch) -> list[dict]:
        import runner
        records: list[dict] = []
        if "corporate" in raw.files:
            for r in runner.parse_corporate(raw.files["corporate"]):
                records.append({**r, "_kind": "corporate"})
        if "fictitious" in raw.files:
            for r in runner.parse_fic(raw.files["fictitious"]):
                records.append({**r, "_kind": "fictitious"})
        return records

    @staticmethod
    def _active(status) -> bool | None:
        s = clean(status)
        if s is None:
            return None
        return s == "A"

    def normalize(self, record: dict) -> Filing:
        kind = record.get("_kind")
        if kind == "fictitious":
            return Filing(
                state=self.state,
                source_id=clean(record.get("doc_number")) or "",
                entity=clean(record.get("fic_name")) or "",
                filing_type="FIC",
                entity_kind="trade_name",
                filed_date=parse_date(record.get("filing_date")),
                status=clean(record.get("status")),
                active=self._active(record.get("status")),
                county=clean(record.get("county")),
                principal_address=Address(
                    line1=clean(record.get("address_1")),
                    city=clean(record.get("city")),
                    state=clean(record.get("state")),
                    zip_code=clean(record.get("zip_code")),
                ),
                raw=record,
            )
        ftype = clean(record.get("filing_type"))
        return Filing(
            state=self.state,
            source_id=clean(record.get("doc_number")) or "",
            entity=clean(record.get("corp_name")) or "",
            filing_type=ftype,
            entity_kind=FL_TYPE_KIND.get(ftype or "", "other"),
            filed_date=parse_date(record.get("file_date")),
            status=clean(record.get("status")),
            active=self._active(record.get("status")),
            county=None,  # the corporate file has no county field; never inferred from ZIP here
            registered_agent=clean(record.get("registered_agent")),
            principal_address=Address(
                line1=clean(record.get("address_1")),
                line2=clean(record.get("address_2")),
                city=clean(record.get("city")),
                state=clean(record.get("state")),
                zip_code=clean(record.get("zip_code")),
            ),
            raw=record,
        )
