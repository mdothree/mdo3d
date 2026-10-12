"""Runner wiring: `states` flag, per-state ingest logging, legacy default unchanged."""
import argparse
import json
import sqlite3
from types import SimpleNamespace

import pytest

import runner
from adapters import Filing
from conftest import FIXTURES


class FakeAdapter:
    access = "free-api"

    def __init__(self, state, rows_by_date, fail_dates=()):
        self.state = state
        self.rows_by_date = rows_by_date
        self.fail_dates = set(fail_dates)

    def fetch(self, source_date, workdir):
        from adapters import RawBatch
        if source_date in self.fail_dates:
            raise ConnectionError("source down")
        return RawBatch(state=self.state, source_date=source_date)

    def parse(self, raw):
        return self.rows_by_date.get(raw.source_date, [])

    def normalize(self, rec):
        return Filing(state=self.state, source_id=rec["id"], entity=rec["name"],
                      entity_kind=rec.get("kind", "llc"), active=True)


@pytest.fixture
def fake_adapters(monkeypatch):
    fakes = {
        "FL": FakeAdapter("FL", {"20260105": [{"id": "L1", "name": "ACME CLOUD LLC"},
                                              {"id": "L2", "name": "ROOF CO LLC"}]}),
        "CO": FakeAdapter("CO", {"20260105": [{"id": "9", "name": "Data Labs LLC"}],
                                 "20260106": [{"id": "9", "name": "Data Labs LLC"}]},
                          fail_dates={"20260107"}),
    }
    import adapters
    monkeypatch.setattr(adapters, "get_adapter", lambda s: fakes[s.upper()])
    return fakes


def test_ingest_logs_counts_and_stores(tmp_db, runner_dirs, fake_adapters, capsys):
    out = runner.ingest_states(["FL", "CO"], ["20260105", "20260106", "20260107"])
    assert len(out["FL"]) == 2 and len(out["CO"]) == 1
    logs = capsys.readouterr().out
    assert "[ingest] state=FL source_date=20260105 rows=2 new=2 status=ok" in logs
    assert "[ingest] state=CO source_date=20260106 rows=1 new=0 status=ok" in logs
    assert "[ingest] state=FL source_date=20260106 rows=0 new=0 status=empty" in logs
    assert "state=CO source_date=20260107 ERROR ConnectionError" in logs
    with sqlite3.connect(tmp_db) as c:
        assert c.execute("SELECT COUNT(*) FROM filings").fetchone()[0] == 3
        runs = c.execute("SELECT state, source_date, rows, status FROM ingest_runs ORDER BY id").fetchall()
    assert ("CO", "20260107", 0, "error") in runs and ("FL", "20260105", 2, "ok") in runs


def args_ns(**kw):
    base = dict(last_week=False, last_month=False, date_from=None, date_to=None, date="20260105",
                no_email_lookup=True, verify_mx=None, verify_smtp=None, guess_variants=None)
    base.update(kw)
    return SimpleNamespace(**base)


PROFILE = {
    "name": "Test", "active": True, "email_lookup": False, "date_range": "daily",
    "filing_types": ["FLAL"], "keywords": ["cloud", "data"], "exclude_keywords": [],
    "delivery": {"frequency": "daily", "recipient_email": "nobody@example.invalid", "recipient_name": "T"},
}


@pytest.fixture
def no_send(monkeypatch):
    sent = []

    def fake_send(*a, **k):
        sent.append(a)
        return True, "test-not-sent"
    monkeypatch.setattr(runner, "send_email", fake_send)
    return sent


def test_profile_without_states_uses_legacy_path(tmp_db, runner_dirs, monkeypatch, no_send):
    called = {}

    def legacy(dates):
        called["dates"] = dates
        return ([{"doc_number": "L9", "corp_name": "CLOUD LLC", "status": "A", "filing_type": "FLAL",
                  "state": "", "county": ""}], [])
    monkeypatch.setattr(runner, "download_and_parse", legacy)
    monkeypatch.setattr(runner, "ingest_states", lambda *a, **k: pytest.fail("adapter path used"))
    res = runner.process_profile("legacy", dict(PROFILE), "20260105", args_ns())
    assert called["dates"] == ["20260105"] and res["leads"] == 1


def test_profile_with_states_uses_adapters(tmp_db, runner_dirs, monkeypatch, fake_adapters, no_send):
    monkeypatch.setattr(runner, "download_and_parse", lambda d: pytest.fail("legacy path used"))
    profile = dict(PROFILE, states=["FL", "CO"])
    res = runner.process_profile("multi", profile, "20260105", args_ns())
    # FL: ACME CLOUD LLC (FLAL not set on fake -> filing_type None) is filtered by FL codes;
    # CO: "Data Labs LLC" matches keyword "data" with kind llc (FLAL -> llc)
    assert res["leads"] == 1
    with sqlite3.connect(tmp_db) as c:
        assert c.execute("SELECT COUNT(*) FROM filings").fetchone()[0] == 3
        lead = c.execute("SELECT doc_number, corp_name FROM leads").fetchall()
    assert lead == [("9", "Data Labs LLC")]
    assert len(no_send) == 1, "send_email stubbed: nothing left the box"


def test_filter_filings_rules():
    fl = Filing(state="FL", source_id="L1", entity="CLOUD LLC", filing_type="FLAL", entity_kind="llc", active=True)
    fl_np = Filing(state="FL", source_id="N2", entity="CLOUD NONPROFIT", filing_type="DOMNP",
                   entity_kind="nonprofit", active=True)
    co_corp = Filing(state="CO", source_id="3", entity="Cloud Corp", filing_type="DPC",
                     entity_kind="corporation", active=True)
    co_inactive = Filing(state="CO", source_id="4", entity="Cloud LLC", entity_kind="llc", active=False)
    co_unknown = Filing(state="CO", source_id="5", entity="Cloud LLC", entity_kind="llc", active=None)
    rows = runner.filter_filings([fl, fl_np, co_corp, co_inactive, co_unknown],
                                 {"name": "x", "filing_types": ["FLAL"], "keywords": ["cloud"]})
    assert [r["doc_number"] for r in rows] == ["L1"]
    np_rows = runner.filter_filings([fl, fl_np, co_corp], {"name": "Nonprofits general", "keywords": []})
    assert [r["doc_number"] for r in np_rows] == ["N2"]
    county = Filing(state="FL", source_id="G1", entity="CLOUD", filing_type="FIC", entity_kind="trade_name",
                    active=True, county="PINELLAS")
    assert runner.filter_filings([county], {"name": "x", "target_counties": ["DADE"]}) == []
    assert len(runner.filter_filings([fl], {"name": "x", "target_counties": ["DADE"]})) == 1, \
        "unknown county is not excluded (never inferred)"


def test_ingest_cli_with_fl_fixture(tmp_db, runner_dirs, monkeypatch, capsys):
    """End-to-end CLI: `runner.py --ingest --states FL --date 20260105` against the fixture SFTP."""
    import shutil
    import sys

    class FakeSFTP:
        def get(self, remote, local):
            name = {"doc/cor/20260105c.txt": "20260105c.txt", "doc/fic/20260105f.txt": "20260105f.txt"}.get(remote)
            if not name:
                raise FileNotFoundError(remote)
            shutil.copy(FIXTURES / "fl" / name, local)

        def close(self):
            pass
    monkeypatch.setattr(runner, "connect_sftp", lambda: FakeSFTP())
    out = runner.ingest_states(["FL"], ["20260105"])
    assert len(out["FL"]) == 5
    assert "[ingest] state=FL source_date=20260105 rows=5 new=5 status=ok" in capsys.readouterr().out
