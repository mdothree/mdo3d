"""Account-level API (v1): plan status, promo redemption, checkout, saved searches, filing types, CORS.

Offline: no network, no email, dummy sk_test key, every Stripe call mocked. Nothing here reaches Stripe.
"""
import hashlib
import hmac
import json
import sqlite3
import time
from datetime import date, datetime, timedelta
from types import SimpleNamespace

import pytest

from adapters import Address, Filing

ORIGIN = "https://leads.mdo3d.com"


@pytest.fixture
def mod():
    from backend import api as api_mod
    api_mod._redeem_failures.clear()
    return api_mod


@pytest.fixture
def api(tmp_db, monkeypatch, mod):
    from fastapi.testclient import TestClient

    monkeypatch.setattr(mod, "update_cron_entry", lambda *a, **k: None)
    for k in ("LEADS_CHECKOUT_ENABLED", "LEADS_STRIPE_PRICE_ID", "LEADS_ENABLE_DELIVERY", "LEADS_PROMO_STATES",
              "LEADS_PLAN_STATES", "LEADS_PROMO_ACCESS_DAYS", "LEADS_PROMO_ENABLED", "LEADS_PLAN_NAME"):
        monkeypatch.delenv(k, raising=False)
    state = {"uid": "uid-acct", "email": "acct@example.invalid"}

    async def fake_token():
        return dict(state)

    mod.app.dependency_overrides[mod.verify_firebase_token] = fake_token
    client = TestClient(mod.app)
    client.user = state
    yield client
    mod.app.dependency_overrides.clear()


@pytest.fixture
def no_stripe(monkeypatch):
    """Any Stripe API call fails the test."""
    import stripe

    def boom(*a, **k):
        raise AssertionError("Stripe API called")

    monkeypatch.setattr(stripe.Customer, "create", boom)
    monkeypatch.setattr(stripe.checkout.Session, "create", boom)


@pytest.fixture
def seeded(tmp_db):
    from backend import db
    rows = [
        Filing(state="FL", source_id="L1", entity="ACME CLOUD SOFTWARE LLC", filing_type="FLAL", entity_kind="llc",
               filed_date=date(2026, 1, 5), status="A", active=True, source_date="20260105",
               principal_address=Address(city="TAMPA", zip_code="33601")),
        Filing(state="CO", source_id="C1", entity="Front Range Data Labs LLC", filing_type="DLLC", entity_kind="llc",
               filed_date=date(2026, 1, 7), status="Good Standing", active=True, source_date="20260107"),
        Filing(state="CO", source_id="C2", entity="Boulder Bakery LLC", filing_type="DLLC", entity_kind="llc",
               filed_date=date(2026, 1, 7), status="Good Standing", active=True, source_date="20260107"),
        Filing(state="CT", source_id="T1", entity="Nutmeg Software LLC", filing_type="LLC", entity_kind="llc",
               filed_date=date(2026, 1, 8), status="Active", active=True, source_date="20260108"),
        Filing(state="CT", source_id="T2", entity="Nutmeg Holdings Inc", filing_type="Stock",
               entity_kind="corporation", filed_date=date(2026, 1, 8), status="Active", active=True,
               source_date="20260108"),
        Filing(state="NY", source_id="N1", entity="Empire Widgets LLC", filing_type="DOMESTIC LLC", entity_kind="llc",
               filed_date=date(2026, 1, 8), status="Active", active=True, source_date="20260108"),
    ]
    db.upsert_filings([f.to_row() for f in rows])
    return rows


def _redeem(client, code="EARLY-ACCT", max_uses=5, **kw):
    from backend import db
    if not db.get_code(code):
        db.create_code(code, max_uses=max_uses, **kw)
    return client.post("/v1/access/redeem", json={"code": code.lower()})


def _sign(mod, payload: str) -> dict:
    ts = int(time.time())
    sig = hmac.new(mod.STRIPE_WEBHOOK_SECRET.encode(), f"{ts}.{payload}".encode(), hashlib.sha256).hexdigest()
    return {"stripe-signature": f"t={ts},v1={sig}"}


# ---------------------------------------------------------------- /v1/account

def test_account_requires_sign_in(tmp_db, mod):
    from fastapi.testclient import TestClient
    c = TestClient(mod.app)
    for path in ("/v1/account", "/v1/saved-searches"):
        assert c.get(path).status_code == 401
    assert c.post("/v1/access/redeem", json={"code": "X"}).status_code == 401
    assert c.post("/v1/checkout", json={"success_url": ORIGIN, "cancel_url": ORIGIN}).status_code == 401


def test_account_without_plan(api):
    body = api.get("/v1/account").json()
    assert body == {
        "email": "acct@example.invalid",
        "plan": {"active": False, "name": None, "source": None, "states": [], "renews_at": None, "expires_at": None},
        "features": {"checkout": False, "saved_searches": True, "saved_search_email": False, "promo_codes": True},
    }


def test_legacy_paid_profile_shows_as_promo_plan(api):
    from backend import db
    r = api.post("/profiles", json={"name": "p", "settings": {
        "name": "p", "delivery": {"recipient_email": "b@example.invalid", "recipient_name": "B"}}})
    db.create_code("OLD-CODE", max_uses=1)
    assert api.post("/redeem-code", json={"profile_id": r.json()["id"], "code": "old-code"}).status_code == 200
    plan = api.get("/v1/account").json()["plan"]
    assert plan["active"] is True and plan["source"] == "promo" and plan["states"] == ["FL"]


# ---------------------------------------------------------------- /v1/access/redeem

def test_redeem_grants_account_access_without_profile_or_delivery(api, seeded):
    from backend import db
    assert api.get("/filings").status_code == 402
    bad = api.post("/v1/access/redeem", json={"code": "NOPE"})
    assert bad.status_code == 400 and bad.json()["detail"] == "Invalid code"

    r = _redeem(api)
    assert r.status_code == 200 and r.json()["ok"] is True
    plan = api.get("/v1/account").json()["plan"]
    assert plan == {"active": True, "name": None, "source": "promo", "states": ["CO", "CT", "FL"],
                    "renews_at": None, "expires_at": None}
    # no delivery profile, nothing for the scheduler to send or run
    assert api.get("/profiles").json()["profiles"] == []
    assert db.get_all_active_profiles() == {}
    with sqlite3.connect(db.DB_PATH) as conn:
        assert conn.execute("SELECT COUNT(*) FROM run_requests").fetchone()[0] == 0
    # search is open for the promo bundle, still scoped to it
    assert api.get("/filings", params={"state": "CO"}).json()["total"] == 2
    assert api.get("/filings", params={"state": "NY"}).status_code == 403
    assert api.get("/filings", params={"state": "CT", "filing_type": "stock"}).json()["total"] == 1

    # a second redemption does not consume another use
    again = _redeem(api)
    assert again.status_code == 200 and "already active" in again.json()["message"]
    assert db.get_code("EARLY-ACCT").uses == 1


def test_redeem_respects_max_uses_and_expiry(api, mod, monkeypatch):
    from backend import db
    db.create_code("ONCE", max_uses=1)
    assert db.redeem_code_for_account("once", 999, ["FL"])[0] is True
    r = api.post("/v1/access/redeem", json={"code": "ONCE"})
    assert r.status_code == 400 and "maximum uses" in r.json()["detail"]
    db.create_code("OLD", max_uses=5, expires_at="2020-01-01T00:00:00")
    r = api.post("/v1/access/redeem", json={"code": "old"})
    assert r.status_code == 400 and "expired" in r.json()["detail"]
    assert api.get("/v1/account").json()["plan"]["active"] is False


def test_promo_states_and_access_days_from_config(api, monkeypatch):
    from backend import db
    monkeypatch.setenv("LEADS_PROMO_STATES", "co")
    monkeypatch.setenv("LEADS_PROMO_ACCESS_DAYS", "30")
    assert _redeem(api).status_code == 200
    plan = api.get("/v1/account").json()["plan"]
    assert plan["states"] == ["CO"] and plan["expires_at"] is not None
    # once the grant has expired, access is gone (fails closed)
    with sqlite3.connect(db.DB_PATH) as conn:
        conn.execute("UPDATE account_access SET expires_at = '2000-01-01 00:00:00'")
    assert api.get("/v1/account").json()["plan"]["active"] is False
    assert api.get("/filings").status_code == 402


def test_redeem_rate_limited_and_can_be_disabled(api, mod, monkeypatch):
    monkeypatch.setattr(mod, "REDEEM_MAX_FAILURES", 3)
    for _ in range(3):
        assert api.post("/v1/access/redeem", json={"code": "WRONG"}).status_code == 400
    r = api.post("/v1/access/redeem", json={"code": "WRONG"})
    assert r.status_code == 429 and "Retry-After" in r.headers
    monkeypatch.setenv("LEADS_PROMO_ENABLED", "0")
    assert api.post("/v1/access/redeem", json={"code": "X"}).status_code == 503
    assert api.get("/v1/account").json()["features"]["promo_codes"] is False


# ---------------------------------------------------------------- /v1/checkout

def test_checkout_off_by_default_never_calls_stripe(api, no_stripe):
    r = api.post("/v1/checkout", json={"success_url": f"{ORIGIN}/account", "cancel_url": f"{ORIGIN}/account"})
    assert r.status_code == 503 and r.json()["detail"] == "Plans opening soon"
    # enabled flag without a configured price is still closed
    import os
    os.environ["LEADS_CHECKOUT_ENABLED"] = "1"
    try:
        assert api.post("/v1/checkout", json={"success_url": ORIGIN, "cancel_url": ORIGIN}).status_code == 503
        assert api.get("/v1/account").json()["features"]["checkout"] is False
    finally:
        del os.environ["LEADS_CHECKOUT_ENABLED"]


def test_legacy_checkout_refuses_live_key_unless_enabled(api, mod, no_stripe, monkeypatch):
    monkeypatch.setattr(mod, "STRIPE_SECRET_KEY", "sk_live_" + "x" * 8)  # module value only; Stripe is never called
    r = api.post("/checkout", json={"profile_id": "x", "price_id": "price_x",
                                    "success_url": ORIGIN, "cancel_url": ORIGIN})
    assert r.status_code == 503


def test_checkout_enabled_test_key_and_webhook_grants_account(api, mod, seeded, monkeypatch):
    import stripe
    from backend import db
    assert stripe.api_key.startswith("sk_test_")
    monkeypatch.setenv("LEADS_CHECKOUT_ENABLED", "1")
    monkeypatch.setenv("LEADS_STRIPE_PRICE_ID", "price_test_from_env")
    monkeypatch.setenv("LEADS_PLAN_NAME", "Leads")
    calls = []
    monkeypatch.setattr(stripe.Customer, "create",
                        lambda **k: calls.append(("customer", k)) or SimpleNamespace(id="cus_test_1"))
    monkeypatch.setattr(stripe.checkout.Session, "create",
                        lambda **k: calls.append(("session", k)) or SimpleNamespace(
                            id="cs_test_acct", url="https://checkout.stripe.com/c/pay/cs_test_acct"))
    assert api.get("/v1/account").json()["features"]["checkout"] is True

    bad = api.post("/v1/checkout", json={"success_url": "https://evil.example/ok", "cancel_url": f"{ORIGIN}/c"})
    assert bad.status_code == 400
    r = api.post("/v1/checkout", json={"success_url": f"{ORIGIN}/account?checkout=success",
                                       "cancel_url": f"{ORIGIN}/account", "price_id": "price_client_attempt"})
    assert r.status_code == 200, r.text
    assert r.json()["checkout_url"].startswith("https://checkout.stripe.com/")
    session_kw = calls[-1][1]
    assert session_kw["line_items"] == [{"price": "price_test_from_env", "quantity": 1}], "price comes from env"
    assert session_kw["metadata"]["purpose"] == "account" and "profile_id" not in session_kw["metadata"]
    assert api.get("/filings").status_code == 402, "pending checkout does not entitle"

    # a forged/unknown session id grants nothing
    forged = json.dumps({"id": "evt_x", "type": "checkout.session.completed", "data": {"object": {
        "id": "cs_unknown", "payment_status": "paid", "metadata": {"purpose": "account", "user_id": "1"}}}})
    assert api.post("/stripe-webhook", content=forged, headers=_sign(mod, forged)).status_code == 200
    assert api.get("/v1/account").json()["plan"]["active"] is False

    done = json.dumps({"id": "evt_1", "type": "checkout.session.completed", "data": {"object": {
        "id": "cs_test_acct", "payment_status": "paid", "subscription": "sub_test_1",
        "metadata": {"purpose": "account", "user_id": "1"}}}})
    assert api.post("/stripe-webhook", content=done, headers=_sign(mod, done)).status_code == 200
    plan = api.get("/v1/account").json()["plan"]
    assert plan["active"] is True and plan["source"] == "stripe" and plan["name"] == "Leads"
    assert plan["states"] == ["CO", "CT", "FL"]
    assert api.get("/profiles").json()["profiles"] == [] and db.get_all_active_profiles() == {}
    assert api.post("/v1/checkout", json={"success_url": ORIGIN, "cancel_url": ORIGIN}).status_code == 409

    upd = json.dumps({"id": "evt_2", "type": "customer.subscription.updated", "data": {"object": {
        "id": "sub_test_1", "status": "active", "current_period_end": 1798761600}}})
    assert api.post("/stripe-webhook", content=upd, headers=_sign(mod, upd)).status_code == 200
    assert api.get("/v1/account").json()["plan"]["renews_at"] == "2027-01-01T00:00:00Z"

    gone = json.dumps({"id": "evt_3", "type": "customer.subscription.deleted", "data": {"object": {
        "id": "sub_test_1", "status": "canceled"}}})
    assert api.post("/stripe-webhook", content=gone, headers=_sign(mod, gone)).status_code == 200
    assert api.get("/v1/account").json()["plan"]["active"] is False
    assert api.get("/filings").status_code == 402


# ---------------------------------------------------------------- /v1/saved-searches

def test_saved_searches_crud(api, seeded, monkeypatch):
    q = {"state": "CO", "vertical": "tech", "date_from": "2026-01-01", "date_to": "2026-01-31", "limit": 50}
    assert api.post("/v1/saved-searches", json={"name": "CO tech", "query": q}).status_code == 402
    _redeem(api)

    r = api.post("/v1/saved-searches", json={"name": "CO tech", "query": q, "cadence": "weekly"})
    assert r.status_code == 200, r.text
    saved = r.json()
    assert saved["email"] == "disabled" and saved["cadence"] == "weekly" and saved["last_sent_at"] is None
    assert saved["query"] == {"state": "CO", "vertical": "tech", "date_from": "2026-01-01", "date_to": "2026-01-31"}
    listing = api.get("/v1/saved-searches").json()
    assert listing["email"] == "disabled" and [s["id"] for s in listing["saved_searches"]] == [saved["id"]]
    assert set(listing["saved_searches"][0]) == {"id", "name", "query", "cadence", "created_at", "last_sent_at"}

    monkeypatch.setenv("LEADS_ENABLE_DELIVERY", "1")
    assert api.get("/v1/saved-searches").json()["email"] == "enabled"
    assert api.get("/v1/account").json()["features"]["saved_search_email"] is True

    assert api.post("/v1/saved-searches", json={"name": "x", "query": {"state": "TX"}}).status_code == 403
    assert api.post("/v1/saved-searches", json={"name": "x", "query": {"vertical": "nope"}}).status_code == 422
    assert api.post("/v1/saved-searches", json={"name": "x", "query": {"evil": "1"}}).status_code == 422
    assert api.post("/v1/saved-searches", json={"name": "x", "query": {}, "cadence": "daily"}).status_code == 422
    assert api.post("/v1/saved-searches", json={"name": "", "query": {}}).status_code == 422

    # another user cannot see or delete it
    api.user.update(uid="uid-other", email="other@example.invalid")
    assert api.get("/v1/saved-searches").json()["saved_searches"] == []
    assert api.delete(f"/v1/saved-searches/{saved['id']}").status_code == 404
    api.user.update(uid="uid-acct", email="acct@example.invalid")
    assert api.delete(f"/v1/saved-searches/{saved['id']}").json() == {"ok": True}
    assert api.get("/v1/saved-searches").json()["saved_searches"] == []


def test_saved_search_weekly_email_gated_by_delivery(api, seeded, runner_dirs, monkeypatch):
    import runner
    from backend import db
    sent = []
    monkeypatch.setattr(runner, "send_email", lambda *a, **k: sent.append((a, k)) or (True, "msg-test"))
    _redeem(api)
    sid = api.post("/v1/saved-searches", json={"name": "CO tech", "query": {"state": "CO", "vertical": "tech"}}).json()["id"]
    with sqlite3.connect(db.DB_PATH) as conn:
        conn.execute("UPDATE saved_searches SET created_at = '2000-01-01 00:00:00'")

    monkeypatch.delenv("LEADS_ENABLE_DELIVERY", raising=False)
    assert runner.process_saved_searches()["delivery"] == "disabled"
    assert sent == [] and db.get_saved_search(sid)["last_run_at"] is None

    monkeypatch.setenv("LEADS_ENABLE_DELIVERY", "1")
    stats = runner.process_saved_searches()
    assert stats["sent"] == 1 and len(sent) == 1
    args, kw = sent[0]
    assert args[0] == "acct@example.invalid"
    rows = (runner_dirs / "output").glob("saved_*.csv")
    text = next(rows).read_text()
    assert "Front Range Data Labs LLC" in text and "Boulder Bakery" not in text and "ACME" not in text
    assert db.get_saved_search(sid)["last_sent_at"] is not None
    # not due again for a week
    assert runner.process_saved_searches()["due"] == 0 and len(sent) == 1

    # plan gone -> due search is skipped, nothing sent
    with sqlite3.connect(db.DB_PATH) as conn:
        conn.execute("UPDATE saved_searches SET last_run_at = '2000-01-01 00:00:00'")
        conn.execute("UPDATE account_access SET status = 'canceled'")
    stats = runner.process_saved_searches()
    assert stats["skipped"] == 1 and len(sent) == 1


# ---------------------------------------------------------------- /filing-types

def test_filing_types(api, seeded):
    fl = api.get("/filing-types", params={"state": "fl"}).json()
    assert fl["state"] == "FL"
    by = {t["code"]: t for t in fl["filing_types"]}
    assert by["FLAL"] == {"code": "FLAL", "label": "Florida LLC", "entity_kind": "llc", "filings": 1}
    assert by["FIC"]["filings"] == 0 and by["FIC"]["entity_kind"] == "trade_name"
    co = {t["code"]: t for t in api.get("/filing-types", params={"state": "CO"}).json()["filing_types"]}
    assert co["DLLC"]["filings"] == 2 and co["DNC"]["label"] == "Domestic nonprofit corporation"
    ct = {t["code"]: t for t in api.get("/filing-types", params={"state": "CT"}).json()["filing_types"]}
    assert ct["Stock"] == {"code": "Stock", "label": "Stock corporation", "entity_kind": "corporation", "filings": 1}
    assert ct["LLC"]["filings"] == 1 and ct["Non-Stock"]["entity_kind"] == "nonprofit"
    # a state without a static table is served from the stored values, labelled by code
    ny = api.get("/filing-types", params={"state": "NY"}).json()["filing_types"]
    assert ny == [{"code": "DOMESTIC LLC", "label": "DOMESTIC LLC", "entity_kind": "llc", "filings": 1}]
    assert api.get("/filing-types", params={"state": "TX"}).json()["filing_types"] == []
    assert api.get("/filing-types", params={"state": "Florida"}).status_code == 422
    assert api.get("/filing-types").status_code == 422


def test_filing_type_tables_match_adapters():
    from adapters import FL_TYPE_KIND
    from adapters.co import CO_TYPE_KIND
    from adapters.ct import CT_TYPE_KIND
    from backend.filing_types import FILING_TYPES
    assert set(FILING_TYPES) == {"FL", "CO", "CT"}
    for st, adapter_map in (("FL", FL_TYPE_KIND), ("CO", CO_TYPE_KIND), ("CT", CT_TYPE_KIND)):
        assert {c: k for c, (_, k) in FILING_TYPES[st].items()} == adapter_map, f"{st} table drifted from adapter"


# ---------------------------------------------------------------- CORS

def test_cors_exposes_export_headers_and_keeps_allowlist(api):
    r = api.get("/coverage", headers={"Origin": ORIGIN})
    assert r.headers["access-control-allow-origin"] == ORIGIN
    exposed = {h.strip().lower() for h in r.headers["access-control-expose-headers"].split(",")}
    assert {"x-total-count", "x-truncated", "content-disposition"} <= exposed
    r = api.get("/coverage", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in r.headers
    pre = api.options("/v1/saved-searches/abc", headers={
        "Origin": ORIGIN, "Access-Control-Request-Method": "DELETE", "Access-Control-Request-Headers": "authorization"})
    assert pre.status_code == 200 and "DELETE" in pre.headers["access-control-allow-methods"]
