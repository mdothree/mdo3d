"""Test harness. No network, no live Stripe, no email.

- src/ and web/ go on sys.path (adapters, runner, backend package).
- LEADS_TEST_MODE=1 and a dummy Stripe TEST key are set before the API is imported; api.py refuses
  to import if a live key is present under LEADS_TEST_MODE.
- Mail provider keys are cleared, and requests/smtplib network calls raise.
- Each test gets its own SQLite file via LEADS_DB_PATH / db.DB_PATH.
"""
import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "web"))

os.environ["LEADS_TEST_MODE"] = "1"
os.environ["STRIPE_SECRET_KEY"] = "sk_test_dummy_for_pytest_not_a_real_key"
os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_test_dummy_for_pytest"
for k in ("MAILGUN_API_KEY", "MAILGUN_DOMAIN", "SENDGRID_API_KEY", "APOLLO_API_KEY"):
    os.environ[k] = ""

FIXTURES = ROOT / "tests" / "fixtures"


class NetworkBlocked(RuntimeError):
    pass


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    """Any real HTTP / SMTP call fails the test."""
    import requests
    import smtplib

    def blocked(*a, **k):
        raise NetworkBlocked(f"network call attempted: {a[:2]}")

    monkeypatch.setattr(requests.Session, "request", blocked)
    monkeypatch.setattr(requests, "post", blocked)
    monkeypatch.setattr(requests, "get", blocked)
    monkeypatch.setattr(smtplib, "SMTP", blocked)
    yield


@pytest.fixture
def tmp_db(tmp_path, monkeypatch):
    db_path = tmp_path / "leads.db"
    monkeypatch.setenv("LEADS_DB_PATH", str(db_path))
    sys.path.insert(0, str(ROOT / "web" / "backend"))
    import db as flat_db  # the module runner.py imports
    from backend import db as pkg_db  # the module the API imports
    for m in (flat_db, pkg_db):
        monkeypatch.setattr(m, "DB_PATH", db_path)
        m.init_db()
    return db_path


@pytest.fixture
def runner_dirs(tmp_path, monkeypatch):
    import runner
    monkeypatch.setattr(runner, "DATA_DIR", tmp_path / "data")
    monkeypatch.setattr(runner, "OUTPUT_DIR", tmp_path / "output")
    monkeypatch.setattr(runner, "LOG_DIR", tmp_path / "logs")
    (tmp_path / "output").mkdir()
    return tmp_path
