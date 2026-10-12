"""API: paid-only entitlement, filings search/filter, CSV export, Stripe test-mode only."""
import hashlib
import hmac
import json
import time
from types import SimpleNamespace

import pytest

from adapters import Address, Filing


@pytest.fixture
def api(tmp_db, monkeypatch):
    from fastapi.testclient import TestClient
    from backend import api as api_mod

    # never touch the host crontab from tests
    monkeypatch.setattr(api_mod, "update_cron_entry", lambda *a, **k: None)

    state = {"uid": "uid-1", "email": "buyer@example.invalid"}

    async def fake_token():
        return dict(state)

    api_mod.app.dependency_overrides[api_mod.verify_firebase_token] = fake_token
    client = TestClient(api_mod.app)
    client.user = state
    yield client
    api_mod.app.dependency_overrides.clear()


@pytest.fixture
def seeded(tmp_db):
    from backend import db
    from datetime import date
    rows = [
        Filing(state="FL", source_id="L1", entity="ACME CLOUD SOFTWARE LLC", filing_type="FLAL", entity_kind="llc",
               filed_date=date(2026, 1, 5), status="A", active=True, source_date="20260105",
               principal_address=Address(city="TAMPA", zip_code="33601")),
        Filing(state="FL", source_id="G2", entity="PINELLAS ROOFING", filing_type="FIC", entity_kind="trade_name",
               filed_date=date(2026, 1, 6), status="A", active=True, county="PINELLAS", source_date="20260106"),
        Filing(state="FL", source_id="L3", entity="OLD CLOUD LLC", filing_type="FLAL", entity_kind="llc",
               filed_date=date(2026, 1, 6), status="I", active=False, source_date="20260106"),
        Filing(state="CO", source_id="20260000001", entity="Front Range Data Labs LLC", filing_type="DLLC",
               entity_kind="llc", filed_date=date(2026, 1, 7), status="Good Standing", active=True,
               source_date="20260107"),
        Filing(state="CO", source_id="20260000002", entity="Mountain Youth Academy", filing_type="DNC",
               entity_kind="nonprofit", filed_date=date(2026, 1, 7), status="Good Standing", active=True,
               source_date="20260107"),
    ]
    db.upsert_filings([f.to_row() for f in rows])
    return rows


def make_paid_profile(client, states=None, via="code"):
    """Create a profile through the API and pay for it with a promo code (no Stripe)."""
    from backend import db
    settings = {"name": "My leads", "delivery": {"recipient_email": "buyer@example.invalid", "recipient_name": "B"}}
    if states:
        settings["states"] = states
    r = client.post("/profiles", json={"name": "My leads", "settings": settings})
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    assert r.json()["paid"] is False
    db.create_code("EARLY-TEST", max_uses=5)
    r = client.post("/redeem-code", json={"profile_id": pid, "code": "early-test"})
    assert r.status_code == 200, r.text
    return pid


def test_health_and_public_endpoints(api, seeded):
    h = api.get("/health").json()
    assert h["db_ok"] is True and h["stripe_mode"] == "test"
    cov = {c["state"]: c for c in api.get("/coverage").json()["states"]}
    assert cov["FL"]["filings"] == 3 and cov["CO"]["latest_filed_date"] == "2026-01-07"
    ids = {v["id"] for v in api.get("/verticals").json()["verticals"]}
    assert {"tech", "nonprofit"} <= ids


def test_unauthenticated_is_rejected(tmp_db):
    from fastapi.testclient import TestClient
    from backend import api as api_mod
    c = TestClient(api_mod.app)
    assert c.get("/filings").status_code == 401
    assert c.get("/filings/export.csv").status_code == 401


def test_signed_in_but_unpaid_fails_closed(api, seeded):
    r = api.get("/filings")
    assert r.status_code == 402
    # an unpaid profile does not entitle either
    api.post("/profiles", json={"name": "x", "settings": {
        "name": "x", "delivery": {"recipient_email": "b@example.invalid", "recipient_name": "B"}}})
    assert api.get("/filings").status_code == 402
    assert api.get("/filings/export.csv").status_code == 402


def test_promo_code_entitles_default_fl_bundle(api, seeded):
    make_paid_profile(api)
    r = api.get("/filings")
    assert r.status_code == 200
    body = r.json()
    assert body["states"] == ["FL"]
    assert {f["source_id"] for f in body["filings"]} == {"L1", "G2"}, "inactive excluded by default"
    assert "raw" not in body["filings"][0]
    assert api.get("/filings", params={"state": "CO"}).status_code == 403
    assert api.get("/filings", params={"include_inactive": "true"}).json()["total"] == 3


def test_filters(api, seeded):
    make_paid_profile(api, states=["FL", "CO"])
    g = lambda **p: api.get("/filings", params=p).json()  # noqa: E731
    assert g()["total"] == 4
    assert {f["source_id"] for f in g(state="CO")["filings"]} == {"20260000001", "20260000002"}
    assert [f["source_id"] for f in g(county="pinellas")["filings"]] == ["G2"]
    assert [f["source_id"] for f in g(filing_type="FIC")["filings"]] == ["G2"]
    assert {f["source_id"] for f in g(entity_kind="llc")["filings"]} == {"L1", "20260000001"}
    assert {f["source_id"] for f in g(vertical="tech")["filings"]} == {"L1", "20260000001"}
    assert [f["source_id"] for f in g(vertical="nonprofit")["filings"]] == ["20260000002"]
    assert [f["source_id"] for f in g(vertical="tech", q="acme")["filings"]] == ["L1"]
    assert {f["source_id"] for f in g(date_from="2026-01-06", date_to="2026-01-07")["filings"]} == \
        {"G2", "20260000001", "20260000002"}
    assert g(date_from="20260107")["total"] == 2
    assert api.get("/filings", params={"date_from": "Jan 5"}).status_code == 422
    assert api.get("/filings", params={"vertical": "nope"}).status_code == 422
    page = g(limit=1, offset=1)
    assert page["total"] == 4 and len(page["filings"]) == 1


def test_csv_export(api, seeded):
    make_paid_profile(api, states=["FL", "CO"])
    r = api.get("/filings/export.csv", params={"state": "CO"})
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert "attachment" in r.headers["content-disposition"]
    lines = r.text.strip().splitlines()
    assert lines[0].startswith("state,source_id,entity,filing_type,entity_kind,filed_date")
    assert len(lines) == 3 and r.headers["x-total-count"] == "2" and r.headers["x-truncated"] == "0"
    assert api.get("/filings/export.csv", params={"state": "TX"}).status_code == 403


def test_checkout_uses_test_mode_only(api, monkeypatch, tmp_db):
    """Checkout session creation with Stripe calls stubbed; the configured key is a TEST key."""
    import stripe
    from backend import api as api_mod
    assert stripe.api_key.startswith("sk_test_")
    calls = []
    monkeypatch.setattr(stripe.Customer, "create", lambda **k: calls.append(("customer", k)) or SimpleNamespace(id="cus_test_1"))
    monkeypatch.setattr(stripe.checkout.Session, "create",
                        lambda **k: calls.append(("session", k)) or SimpleNamespace(id="cs_test_1", url="https://checkout.stripe.test/x"))
    r = api.post("/profiles", json={"name": "p", "settings": {
        "name": "p", "states": ["FL", "CO"], "delivery": {"recipient_email": "b@example.invalid", "recipient_name": "B"}}})
    pid = r.json()["id"]
    bad = api.post("/checkout", json={"profile_id": pid, "price_id": "price_x",
                                      "success_url": "https://evil.example/ok", "cancel_url": "https://leads.mdo3d.com/c"})
    assert bad.status_code == 400
    r = api.post("/checkout", json={"profile_id": pid, "price_id": "price_test_x",
                                    "success_url": "https://leads.mdo3d.com/ok", "cancel_url": "https://leads.mdo3d.com/c"})
    assert r.status_code == 200 and r.json()["session_id"] == "cs_test_1"
    assert [c[0] for c in calls] == ["customer", "session"]
    assert api.get("/filings").status_code == 402, "pending checkout does not entitle"

    # Signed webhook (test secret) completes the payment and entitles FL+CO.
    payload = json.dumps({"id": "evt_test", "object": "event", "type": "checkout.session.completed",
                          "data": {"object": {"id": "cs_test_1", "object": "checkout.session",
                                              "payment_status": "paid", "payment_intent": "pi_test_1",
                                              "metadata": {"profile_id": pid}}}})
    ts = int(time.time())
    sig = hmac.new(api_mod.STRIPE_WEBHOOK_SECRET.encode(), f"{ts}.{payload}".encode(), hashlib.sha256).hexdigest()
    bad = api.post("/stripe-webhook", content=payload, headers={"stripe-signature": f"t={ts},v1={'0' * 64}"})
    assert bad.status_code == 400
    ok = api.post("/stripe-webhook", content=payload, headers={"stripe-signature": f"t={ts},v1={sig}"})
    assert ok.status_code == 200, ok.text
    assert api.get("/filings").json()["states"] == ["CO", "FL"]


def test_live_key_refused_in_test_mode(monkeypatch):
    import importlib
    from backend import api as api_mod
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_live_" + "x" * 10)
    with pytest.raises(RuntimeError, match="LIVE key"):
        importlib.reload(api_mod)
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_dummy_for_pytest_not_a_real_key")
    importlib.reload(api_mod)
