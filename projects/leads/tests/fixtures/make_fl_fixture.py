#!/usr/bin/env python3
"""Regenerate the synthetic FL Sunbiz fixtures from runner.py's documented fixed-width layouts.

All entities, people and addresses are invented; no real filing data. Output:
  tests/fixtures/fl/20260105c.txt  (corporate, 1440-char records)
  tests/fixtures/fl/20260105f.txt  (fictitious names, 2098-char records)
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "src"))
from runner import CORPORATE_LAYOUT, FIC_LAYOUT  # noqa: E402

CORP_LEN, FIC_LEN = 1440, 2098

CORP = [
    dict(doc_number="L26000000001", corp_name="EXAMPLE CLOUD SOFTWARE LLC", status="A", filing_type="FLAL",
         address_1="100 TEST AVE", address_2="SUITE 1", city="TAMPA", state="", zip_code="33601",
         file_date="01052026", fei_number="", registered_agent="SAMPLE AGENT LLC", ra_city="TAMPA", ra_state="FL"),
    dict(doc_number="P26000000002", corp_name="FICTIONAL ROOFING INC", status="A", filing_type="DOMP",
         address_1="200 PLACEHOLDER ST", address_2="", city="ORLANDO", state="FL", zip_code="32801",
         file_date="01052026", fei_number="", registered_agent="DOE JANE", ra_city="ORLANDO", ra_state="FL"),
    dict(doc_number="N26000000003", corp_name="DEMO WORKFORCE ACADEMY INC", status="A", filing_type="DOMNP",
         address_1="300 MOCK RD", address_2="", city="MIAMI", state="FL", zip_code="33101",
         file_date="01052026", fei_number="", registered_agent="ROE RICHARD", ra_city="MIAMI", ra_state="FL"),
    dict(doc_number="L26000000004", corp_name="INACTIVE TECH HOLDINGS LLC", status="I", filing_type="FLAL",
         address_1="400 NOWHERE BLVD", address_2="", city="JACKSONVILLE", state="FL", zip_code="32099",
         file_date="01052026", fei_number="", registered_agent="AGENT CO", ra_city="JACKSONVILLE", ra_state="FL"),
    # duplicate doc number (a state re-issue in the same file): dedupe keeps one row
    dict(doc_number="L26000000001", corp_name="EXAMPLE CLOUD SOFTWARE LLC", status="A", filing_type="FLAL",
         address_1="100 TEST AVE", address_2="SUITE 2", city="TAMPA", state="", zip_code="33601",
         file_date="01052026", fei_number="", registered_agent="SAMPLE AGENT LLC", ra_city="TAMPA", ra_state="FL"),
]
FIC = [
    dict(doc_number="G26000000005", fic_name="SAMPLE DATA ANALYTICS", county="PINELLAS", address_1="500 FAKE LN",
         city="LARGO", state="FL", zip_code="33771", filing_date="01052026", status="A", expiration_date="12312031"),
]


def record(values: dict, layout, length: int) -> str:
    buf = [" "] * length
    for start, size, name in layout:
        v = values.get(name, "")[:size].ljust(size)
        buf[start:start + size] = list(v)
    return "".join(buf)


def main():
    out = HERE / "fl"
    out.mkdir(exist_ok=True)
    (out / "20260105c.txt").write_text("".join(record(r, CORPORATE_LAYOUT, CORP_LEN) + "\n" for r in CORP))
    (out / "20260105f.txt").write_text("".join(record(r, FIC_LAYOUT, FIC_LEN) + "\n" for r in FIC))
    print("wrote", out)


if __name__ == "__main__":
    main()
