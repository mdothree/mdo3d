"""
Florida (Sunbiz) adapter #1 (DRAFT). Wraps the existing runner.py SFTP pull and fixed-width parsers
so behaviour matches today's pipeline; runner.py is not changed or re-wired yet.

Source: Florida Division of Corporations public SFTP (free bulk data; credentials from env:
SUNBIZ_SFTP_HOST / SUNBIZ_SFTP_USER / SUNBIZ_SFTP_PASS, as runner.py already reads them).
Files per date: doc/cor/<YYYYMMDD>c.txt (corporate) and doc/fic/<YYYYMMDD>f.txt (fictitious names).
"""
from __future__ import annotations

from pathlib import Path

from .base import Address, Filing, RawBatch, parse_date


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

    def normalize(self, record: dict) -> Filing:
        kind = record.get("_kind")
        if kind == "fictitious":
            return Filing(
                state=self.state,
                source_id=record.get("doc_number", ""),
                entity=record.get("fic_name", ""),
                filing_type="FIC",
                filed_date=parse_date(record.get("filing_date")),
                status=record.get("status") or None,
                county=record.get("county") or None,
                principal_address=Address(
                    line1=record.get("address_1") or None,
                    city=record.get("city") or None,
                    state=record.get("state") or None,
                    zip_code=record.get("zip_code") or None,
                ),
                raw=record,
            )
        return Filing(
            state=self.state,
            source_id=record.get("doc_number", ""),
            entity=record.get("corp_name", ""),
            filing_type=record.get("filing_type") or None,
            filed_date=parse_date(record.get("file_date")),
            status=record.get("status") or None,
            county=None,  # the corporate file has no county field; never inferred from ZIP here
            registered_agent=record.get("registered_agent") or None,
            principal_address=Address(
                line1=record.get("address_1") or None,
                line2=record.get("address_2") or None,
                city=record.get("city") or None,
                state=record.get("state") or None,
                zip_code=record.get("zip_code") or None,
            ),
            raw=record,
        )
