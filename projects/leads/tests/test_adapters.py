import json
import shutil
from datetime import date
from pathlib import Path

import pytest

from adapters import ADAPTERS, ENTITY_KINDS, Filing, RawBatch, StateAdapter, dedupe, get_adapter, run_adapter
from adapters.co import ColoradoAdapter
from adapters.ct import ConnecticutAdapter
from adapters.fl import FloridaAdapter

from conftest import FIXTURES


# --- protocol ---------------------------------------------------------------------------------

@pytest.mark.parametrize("code", sorted(ADAPTERS))
def test_every_adapter_satisfies_protocol(code):
    a = get_adapter(code)
    assert isinstance(a, StateAdapter)
    assert a.state == code
    assert a.access in {"free-bulk", "free-api"}, "only free sources are implemented (paid = spend decision)"


def test_unknown_state_raises():
    with pytest.raises(KeyError):
        get_adapter("ZZ")


# --- Florida (synthetic fixed-width fixture) ----------------------------------------------------

class FakeSFTP:
    """Serves the committed fixture files; anything else is FileNotFoundError like paramiko."""

    def __init__(self, files):
        self.files = files
        self.closed = False

    def get(self, remote, local):
        if remote not in self.files:
            raise FileNotFoundError(remote)
        shutil.copy(self.files[remote], local)

    def close(self):
        self.closed = True


@pytest.fixture
def fl_sftp(monkeypatch):
    import runner
    sftp = FakeSFTP({
        "doc/cor/20260105c.txt": FIXTURES / "fl" / "20260105c.txt",
        "doc/fic/20260105f.txt": FIXTURES / "fl" / "20260105f.txt",
    })
    monkeypatch.setattr(runner, "connect_sftp", lambda: sftp)
    return sftp


def test_fl_fetch_parse_normalize(fl_sftp, tmp_path):
    a = FloridaAdapter()
    raw = a.fetch("20260105", tmp_path)
    assert set(raw.files) == {"corporate", "fictitious"} and raw.missing == []
    assert fl_sftp.closed
    recs = a.parse(raw)
    assert len(recs) == 6  # 5 corporate (one duplicate) + 1 FIC
    filings = run_adapter(a, "20260105", tmp_path)
    by_id = {f.source_id: f for f in filings}
    assert len(filings) == 5, "duplicate doc number deduped"

    llc = by_id["L26000000001"]
    assert llc.entity == "EXAMPLE CLOUD SOFTWARE LLC"
    assert llc.filing_type == "FLAL" and llc.entity_kind == "llc"
    assert llc.filed_date == date(2026, 1, 5)
    assert llc.active is True and llc.status == "A"
    assert llc.county is None, "corporate file has no county; never inferred"
    assert llc.registered_agent == "SAMPLE AGENT LLC"
    assert llc.principal_address.line1 == "100 TEST AVE"
    assert llc.principal_address.line2 == "SUITE 2", "last record for a key wins"
    assert llc.principal_address.state is None  # blank in source stays None
    assert llc.source_date == "20260105"
    assert llc.contacts == [] and llc.naics_guess is None

    assert by_id["N26000000003"].entity_kind == "nonprofit"
    assert by_id["L26000000004"].active is False

    fic = by_id["G26000000005"]
    assert fic.filing_type == "FIC" and fic.entity_kind == "trade_name"
    assert fic.county == "PINELLAS"
    assert fic.principal_address.city == "LARGO"


def test_fl_missing_files_recorded(monkeypatch, tmp_path):
    import runner
    monkeypatch.setattr(runner, "connect_sftp", lambda: FakeSFTP({}))
    raw = FloridaAdapter().fetch("20260103", tmp_path)  # a Saturday: no files
    assert raw.files == {} and sorted(raw.missing) == ["corporate", "fictitious"]
    assert FloridaAdapter().parse(raw) == []


def test_fl_parse_matches_legacy_parser(fl_sftp, tmp_path):
    """The adapter reuses runner.parse_corporate, so legacy and adapter paths read identical fields."""
    import runner
    legacy = runner.parse_corporate(FIXTURES / "fl" / "20260105c.txt")
    raw = FloridaAdapter().fetch("20260105", tmp_path)
    adapted = [r for r in FloridaAdapter().parse(raw) if r["_kind"] == "corporate"]
    assert [{k: v for k, v in r.items() if k != "_kind"} for r in adapted] == legacy


# --- Colorado (Socrata fixture, no network) ----------------------------------------------------

class FakeResp:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self.payload


class FakeSession:
    def __init__(self, rows):
        self.rows = rows
        self.calls = []

    def get(self, url, params=None, headers=None, timeout=None):
        self.calls.append(dict(params))
        off, lim = params["$offset"], params["$limit"]
        return FakeResp(self.rows[off:off + lim])


def co_rows():
    return json.loads((FIXTURES / "co_20260105.json").read_text())


def test_co_fetch_paginates_and_filters_by_date(tmp_path):
    s = FakeSession(co_rows())
    a = ColoradoAdapter(session=s, page_size=2)
    raw = a.fetch("20260105", tmp_path)
    assert len(s.calls) == 3  # 2 + 2 + 1
    assert s.calls[0]["$where"] == "entityformdate='2026-01-05T00:00:00'"
    assert [c["$offset"] for c in s.calls] == [0, 2, 4]
    assert len(a.parse(raw)) == 5


def test_co_normalize(tmp_path):
    a = ColoradoAdapter(session=FakeSession(co_rows()))
    filings = {f.source_id: f for f in run_adapter(a, "20260105", tmp_path)}
    assert len(filings) == 5
    llc = filings["20260000001"]
    assert llc.state == "CO" and llc.entity == "Example Cloud Robotics LLC"
    assert llc.entity_kind == "llc" and llc.active is True
    assert llc.filed_date == date(2026, 1, 5)
    assert llc.registered_agent == "JANE Q SAMPLE"
    assert llc.county is None
    corp = filings["20260000002"]
    assert corp.entity_kind == "corporation"
    assert corp.registered_agent == "Placeholder Registered Agents Inc"
    assert corp.principal_address.line2 == "Unit 3"
    assert filings["20260000003"].entity_kind == "nonprofit"
    assert filings["20260000004"].active is False
    assert filings["20260000005"].entity_kind == "other"  # unknown type code: not guessed


def test_co_bad_date_rejected(tmp_path):
    with pytest.raises(ValueError):
        ColoradoAdapter(session=FakeSession([])).fetch("2026-01-05", tmp_path)


def test_entity_kinds_are_known():
    from adapters.co import CO_TYPE_KIND
    from adapters.ct import CT_TYPE_KIND
    from adapters.fl import FL_TYPE_KIND
    assert set(CO_TYPE_KIND.values()) | set(CT_TYPE_KIND.values()) | set(FL_TYPE_KIND.values()) <= set(ENTITY_KINDS)


# --- Connecticut (Socrata fixture, no network) -------------------------------------------------

def ct_rows():
    return json.loads((FIXTURES / "ct_20260105.json").read_text())


def test_ct_registered():
    assert isinstance(get_adapter("ct"), ConnecticutAdapter)


def test_ct_fetch_paginates_and_filters_by_date(tmp_path):
    s = FakeSession(ct_rows())
    a = ConnecticutAdapter(session=s, page_size=2)
    raw = a.fetch("20260105", tmp_path)
    assert len(s.calls) == 3  # 2 + 2 + 1
    assert s.calls[0]["$where"] == "date_registration='2026-01-05T00:00:00'"
    assert s.calls[0]["$order"] == "accountnumber"
    assert [c["$offset"] for c in s.calls] == [0, 2, 4]
    recs = a.parse(raw)
    assert len(recs) == 5
    stored = raw.files["business_master"].read_text()
    assert "owner.survey@" not in stored and "woman_owned" not in stored and ":@computed" not in stored, \
        "owner-survey and system columns are never written to disk"


def test_ct_normalize(tmp_path):
    a = ConnecticutAdapter(session=FakeSession(ct_rows()))
    filings = {f.source_id: f for f in run_adapter(a, "20260105", tmp_path)}
    assert len(filings) == 5
    llc = filings["9000001"]
    assert llc.state == "CT" and llc.entity == "Example Nutmeg Robotics LLC"
    assert llc.filing_type == "LLC" and llc.entity_kind == "llc" and llc.active is True
    assert llc.filed_date == date(2026, 1, 5) and llc.source_date == "20260105"
    assert llc.principal_address.line1 == "1 Test St" and llc.principal_address.line2 == "Suite 4"
    assert llc.principal_address.zip_code == "06103", "leading zero kept"
    assert llc.county is None and llc.registered_agent is None, "not in this dataset: never inferred"
    assert llc.naics_guess == "513210" and llc.naics_basis == "state-published NAICS"
    assert len(llc.contacts) == 1
    c = llc.contacts[0]
    assert (c.kind, c.value, c.verified) == ("email", "hello@example-nutmeg.invalid", True)
    assert c.source == "https://data.ct.gov/resource/n7gp-d28j.json?accountnumber=9000001"
    assert "category_survey_email_address" not in llc.raw and "woman_owned_organization" not in llc.raw
    row = llc.to_row()
    assert "owner.survey@" not in row["raw"] and json.loads(row["contacts"])[0]["value"] == c.value

    corp = filings["9000002"]
    assert corp.entity_kind == "corporation"
    assert corp.contacts == [], "malformed state value dropped, not repaired"
    assert corp.naics_guess is None and corp.naics_basis is None, "no code in the value: no NAICS"

    np = filings["9000003"]
    assert np.entity_kind == "nonprofit" and np.contacts == [] and np.naics_guess is None
    assert np.principal_address.line1 is None

    rej = filings["9000004"]
    assert rej.active is False and rej.naics_guess == "518210"
    odd = filings["9000005"]
    assert odd.entity_kind == "other" and odd.active is None  # unknown type / ambiguous status: not guessed


def test_ct_naics_parse():
    from adapters.ct import naics_from
    assert naics_from("Retail Bakeries (311811)") == "311811"
    assert naics_from("Retail Bakeries") is None
    assert naics_from("  ") is None and naics_from(None) is None


class FlakySession(FakeSession):
    """First two calls fail transiently (HTTP 429, then a connection error), then serve rows."""

    def __init__(self, rows):
        super().__init__(rows)
        self.fails = 0

    def get(self, url, params=None, headers=None, timeout=None):
        import requests
        if self.fails == 0:
            self.fails += 1
            r = FakeResp([])
            r.status_code = 429
            return r
        if self.fails == 1:
            self.fails += 1
            raise requests.ConnectionError("reset")
        return super().get(url, params=params, headers=headers, timeout=timeout)


def test_ct_retries_with_backoff(tmp_path):
    sleeps = []
    a = ConnecticutAdapter(session=FlakySession(ct_rows()), sleep=sleeps.append)
    assert len(a.parse(a.fetch("20260105", tmp_path))) == 5
    assert sleeps == [2.0, 4.0]


def test_ct_gives_up_after_max_tries(tmp_path):
    import requests

    class Down(FakeSession):
        def get(self, *a, **k):
            raise requests.ConnectionError("down")
    sleeps = []
    with pytest.raises(requests.ConnectionError):
        ConnecticutAdapter(session=Down([]), sleep=sleeps.append).fetch("20260105", tmp_path)
    assert sleeps == [2.0, 4.0, 8.0]


def test_ct_app_token_optional(tmp_path, monkeypatch):
    class Capture(FakeSession):
        def get(self, url, params=None, headers=None, timeout=None):
            self.headers = headers
            return super().get(url, params=params, headers=headers, timeout=timeout)
    monkeypatch.delenv("SOCRATA_APP_TOKEN", raising=False)
    s = Capture([])
    ConnecticutAdapter(session=s).fetch("20260105", tmp_path)
    assert "X-App-Token" not in s.headers
    monkeypatch.setenv("SOCRATA_APP_TOKEN", "dummy-token")
    ConnecticutAdapter(session=s).fetch("20260105", tmp_path)
    assert s.headers["X-App-Token"] == "dummy-token"


def test_ct_bad_date_rejected(tmp_path):
    with pytest.raises(ValueError):
        ConnecticutAdapter(session=FakeSession([])).fetch("2026-01-05", tmp_path)


# --- dedupe -------------------------------------------------------------------------------------

def test_dedupe_latest_source_date_wins():
    a = Filing(state="FL", source_id="X1", entity="OLD", source_date="20260101")
    b = Filing(state="FL", source_id="X1", entity="NEW", source_date="20260102")
    c = Filing(state="CO", source_id="X1", entity="OTHER STATE", source_date="20260101")
    d = Filing(state="FL", source_id="", entity="NO ID")
    out = dedupe([b, a, c, d])
    assert {(f.state, f.entity) for f in out} == {("FL", "NEW"), ("CO", "OTHER STATE")}


def test_store_dedupes_on_state_source_id(tmp_db):
    from backend import db
    f1 = Filing(state="FL", source_id="L1", entity="A LLC", active=True, source_date="20260105")
    f2 = Filing(state="CO", source_id="L1", entity="A LLC", active=True, source_date="20260105")
    assert db.upsert_filings([f1.to_row(), f2.to_row()]) == 2
    f1.status = "I"
    f1.active = False
    assert db.upsert_filings([f1.to_row()]) == 0, "same (state, source_id) updates, no new row"
    import sqlite3
    with sqlite3.connect(tmp_db) as c:
        assert c.execute("SELECT COUNT(*) FROM filings").fetchone()[0] == 2
        assert c.execute("SELECT active FROM filings WHERE state='FL'").fetchone()[0] == 0
        # legacy tables still exist alongside
        names = {r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"users", "profiles", "payments", "leads", "codes", "filings", "ingest_runs"} <= names
