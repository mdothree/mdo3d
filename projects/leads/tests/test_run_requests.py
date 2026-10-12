"""Manual runs: POST /profiles/{id}/run queues a row, the scheduler's --run-requests tick executes it.

Offline: no network, no email, no live Stripe. Delivery is off unless LEADS_ENABLE_DELIVERY=1.
"""
import sqlite3
import time
from datetime import date

import pytest

import runner
from adapters import Address, Filing

DAY = "20260107"


@pytest.fixture
def api(tmp_db, monkeypatch):
    from fastapi.testclient import TestClient
    from backend import api as api_mod

    monkeypatch.setattr(api_mod, "update_cron_entry", lambda *a, **k: None)
    state = {"uid": "uid-owner", "email": "owner@example.invalid"}

    async def fake_token():
        return dict(state)

    api_mod.app.dependency_overrides[api_mod.verify_firebase_token] = fake_token
    client = TestClient(api_mod.app)
    client.user = state
    client.mod = api_mod
    yield client
    api_mod.app.dependency_overrides.clear()


@pytest.fixture
def filings(tmp_db):
    from backend import db
    rows = [
        Filing(state="CO", source_id="C1", entity="Front Range Data Labs LLC", filing_type="DLLC", entity_kind="llc",
               filed_date=date(2026, 1, 7), status="Good Standing", active=True, source_date=DAY,
               principal_address=Address(city="DENVER", zip_code="80202")),
        Filing(state="CO", source_id="C2", entity="Boulder Bakery LLC", filing_type="DLLC", entity_kind="llc",
               filed_date=date(2026, 1, 7), status="Good Standing", active=True, source_date=DAY),
        Filing(state="FL", source_id="L1", entity="ACME CLOUD DATA LLC", filing_type="FLAL", entity_kind="llc",
               filed_date=date(2026, 1, 7), status="A", active=True, source_date=DAY),
        Filing(state="FL", source_id="L2", entity="OLD DATA LLC", filing_type="FLAL", entity_kind="llc",
               filed_date=date(2026, 1, 7), status="I", active=False, source_date=DAY),
    ]
    db.upsert_filings([f.to_row() for f in rows])
    return rows


@pytest.fixture
def worker(runner_dirs, monkeypatch):
    """Runner pinned to DAY; any fetch from a state source fails the test (manual runs use stored filings).

    OUTPUT_DIR starts missing, as on a fresh /data volume in the scheduler container.
    """
    monkeypatch.setattr(runner, "OUTPUT_DIR", runner_dirs / "fresh-volume" / "output")
    monkeypatch.delenv("LEADS_ENABLE_DELIVERY", raising=False)
    monkeypatch.setattr(runner, "get_workday_date", lambda days_back=0: DAY)
    monkeypatch.setattr(runner, "ingest_states", lambda *a, **k: pytest.fail("manual run fetched from a source"))
    monkeypatch.setattr(runner, "download_and_parse", lambda *a, **k: pytest.fail("manual run used legacy fetch"))
    sent = []
    monkeypatch.setattr(runner, "send_email", lambda *a, **k: sent.append(a) or (True, "test-not-sent"))
    runner.sent = sent
    return runner


def paid_profile(client, states=("CO",), keywords=("data",)):
    from backend import db
    settings = {"name": "Runs", "keywords": list(keywords), "filing_types": ["FLAL"], "email_lookup": True,
                "delivery": {"recipient_email": "owner@example.invalid", "recipient_name": "O"}}
    if states:
        settings["states"] = list(states)
    r = client.post("/profiles", json={"name": "Runs", "settings": settings})
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    if not db.get_code("EARLY-RUNS"):
        db.create_code("EARLY-RUNS", max_uses=50)
    assert client.post("/redeem-code", json={"profile_id": pid, "code": "early-runs"}).status_code == 200
    return pid


# --- API ------------------------------------------------------------------------------------------

def test_run_queues_and_returns_202(api, filings):
    pid = paid_profile(api)
    r = api.post(f"/profiles/{pid}/run")
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["status"] == "queued" and body["profile_id"] == pid
    assert body["status_url"] == f"/runs/{body['run_id']}"
    s = api.get(body["status_url"])
    assert s.status_code == 200 and s.json()["status"] == "queued"


def test_run_rate_limited_per_profile(api, filings):
    pid = paid_profile(api)
    assert api.post(f"/profiles/{pid}/run").status_code == 202
    r = api.post(f"/profiles/{pid}/run")
    assert r.status_code == 429
    assert 1 <= int(r.headers["Retry-After"]) <= 600
    # another profile of the same user is not blocked
    pid2 = paid_profile(api)
    assert api.post(f"/profiles/{pid2}/run").status_code == 202


def test_rate_limit_window_expires(api, filings, tmp_db):
    pid = paid_profile(api)
    assert api.post(f"/profiles/{pid}/run").status_code == 202
    with sqlite3.connect(tmp_db) as c:
        c.execute("UPDATE run_requests SET requested_at = datetime('now', '-11 minutes')")
    assert api.post(f"/profiles/{pid}/run").status_code == 202


def test_run_requires_owner_paid_active(api, filings):
    from backend import db
    pid = paid_profile(api)
    run_id = api.post(f"/profiles/{pid}/run").json()["run_id"]

    api.user.update(uid="uid-other", email="other@example.invalid")
    assert api.post(f"/profiles/{pid}/run").status_code == 404
    assert api.get(f"/runs/{run_id}").status_code == 404

    api.user.update(uid="uid-owner", email="owner@example.invalid")
    r = api.post("/profiles", json={"name": "Unpaid", "settings": {
        "name": "Unpaid", "delivery": {"recipient_email": "o@example.invalid", "recipient_name": "O"}}})
    unpaid = r.json()["id"]
    assert api.post(f"/profiles/{unpaid}/run").status_code == 402

    pid3 = paid_profile(api)
    db.update_profile(pid3, active=False)
    assert api.post(f"/profiles/{pid3}/run").status_code == 400
    assert api.get("/runs/does-not-exist").status_code == 404


def test_run_unauthenticated(tmp_db):
    from fastapi.testclient import TestClient
    from backend import api as api_mod
    c = TestClient(api_mod.app)
    assert c.post("/profiles/x/run").status_code == 401
    assert c.get("/runs/x").status_code == 401


def test_api_has_no_subprocess_runner():
    """The API container has no src/: the endpoint must not shell out to runner.py."""
    import inspect
    from backend import api as api_mod
    src = inspect.getsource(api_mod.run_pipeline)
    assert "subprocess" not in src and "runner.py" not in src


# --- worker (scheduler tick) ----------------------------------------------------------------------

def test_worker_runs_from_stored_filings_without_email(api, filings, worker, tmp_db):
    pid = paid_profile(api)
    run_id = api.post(f"/profiles/{pid}/run").json()["run_id"]
    assert worker.process_run_requests() == 1
    body = api.get(f"/runs/{run_id}").json()
    assert body["status"] == "done", body
    assert body["leads"] == 1 and body["delivery"] == "disabled" and body["error"] is None
    assert body["started_at"] and body["finished_at"]
    assert worker.sent == [], "delivery off: nothing sent"
    with sqlite3.connect(tmp_db) as c:
        assert c.execute("SELECT doc_number, corp_name FROM leads WHERE profile_id = ?", (pid,)).fetchall() == \
            [("C1", "Front Range Data Labs LLC")]
    assert worker.process_run_requests() == 0, "queue drained"


def test_worker_delivery_off_never_calls_send_report(api, filings, worker, monkeypatch):
    monkeypatch.setenv("LEADS_ENABLE_DELIVERY", "0")
    monkeypatch.setattr(runner, "send_report", lambda *a, **k: pytest.fail("send_report with delivery off"))
    pid = paid_profile(api)
    api.post(f"/profiles/{pid}/run")
    worker.process_run_requests()


def test_worker_delivers_only_when_enabled(api, filings, worker, monkeypatch):
    monkeypatch.setenv("LEADS_ENABLE_DELIVERY", "1")
    pid = paid_profile(api)
    run_id = api.post(f"/profiles/{pid}/run").json()["run_id"]
    worker.process_run_requests()
    body = api.get(f"/runs/{run_id}").json()
    assert body["status"] == "done" and body["delivery"] == "sent"
    assert len(worker.sent) == 1 and worker.sent[0][0] == "owner@example.invalid"


def test_worker_legacy_profile_uses_stored_fl(api, filings, worker):
    pid = paid_profile(api, states=None, keywords=("cloud",))
    run_id = api.post(f"/profiles/{pid}/run").json()["run_id"]
    worker.process_run_requests()
    body = api.get(f"/runs/{run_id}").json()
    assert body["status"] == "done" and body["leads"] == 1  # ACME CLOUD DATA LLC; inactive L2 dropped


def test_worker_rechecks_entitlement(api, filings, worker):
    from backend import db
    pid = paid_profile(api)
    run_id = api.post(f"/profiles/{pid}/run").json()["run_id"]
    db.update_profile(pid, paid=False)
    worker.process_run_requests()
    body = api.get(f"/runs/{run_id}").json()
    assert body["status"] == "error" and "no longer" in body["error"]
    assert worker.sent == []


def test_worker_timeout(api, filings, worker, monkeypatch):
    def slow(*a, **k):
        time.sleep(5)
        return {"leads": 9, "errors": [], "delivery": "none"}
    monkeypatch.setattr(runner, "process_profile", slow)
    pid = paid_profile(api)
    run_id = api.post(f"/profiles/{pid}/run").json()["run_id"]
    t0 = time.time()
    worker.process_run_requests(timeout_s=1)
    assert time.time() - t0 < 4
    body = api.get(f"/runs/{run_id}").json()
    assert body["status"] == "error" and "exceeded 1s" in body["error"]


def test_worker_error_does_not_wedge_queue(api, filings, worker, monkeypatch):
    calls = []

    def boom(req, timeout_s):
        calls.append(req["id"])
        if len(calls) == 1:
            raise RuntimeError("bad request")
        from backend import db
        db.finish_run_request(req["id"], "done", leads=0, delivery="disabled")
    monkeypatch.setattr(runner, "execute_run_request", boom)
    a = api.post(f"/profiles/{paid_profile(api)}/run").json()["run_id"]
    b = api.post(f"/profiles/{paid_profile(api)}/run").json()["run_id"]
    assert worker.process_run_requests() == 2
    assert api.get(f"/runs/{a}").json()["status"] == "error"
    assert api.get(f"/runs/{b}").json()["status"] == "done"


def test_stale_running_requests_fail(api, filings, worker, tmp_db):
    pid = paid_profile(api)
    run_id = api.post(f"/profiles/{pid}/run").json()["run_id"]
    with sqlite3.connect(tmp_db) as c:
        c.execute("UPDATE run_requests SET status = 'running', started_at = datetime('now', '-2 hours')")
    worker.process_run_requests(timeout_s=60)
    body = api.get(f"/runs/{run_id}").json()
    assert body["status"] == "error" and "stale" in body["error"]


def test_scheduler_crontab_has_run_tick():
    from conftest import ROOT
    tab = (ROOT / "ops" / "scheduler" / "crontab").read_text()
    assert "* * * * * /app/ops/scheduler/run_requests.sh" in tab
    sh = (ROOT / "ops" / "scheduler" / "run_requests.sh").read_text()
    assert "--run-requests" in sh
