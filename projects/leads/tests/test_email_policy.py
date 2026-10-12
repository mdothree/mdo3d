"""Standing rule: never guess email addresses; no email is sent in tests."""
import ast
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent


def all_email_method_blocks():
    cfg = json.loads((ROOT / "config" / "profiles.json").read_text())
    for name, p in cfg["profiles"].items():
        yield name, p.get("email_methods", {})
    yield "defaults", cfg.get("defaults", {}).get("email_methods", {})


@pytest.mark.parametrize("name,methods", list(all_email_method_blocks()))
def test_guess_email_variants_false_everywhere(name, methods):
    assert methods.get("guess_email_variants", False) is False, name


def test_no_variant_generator_in_runner():
    tree = ast.parse((ROOT / "src" / "runner.py").read_text())
    funcs = {n.name for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}
    assert "generate_local_part_variants" not in funcs
    names = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)}
    assert "guess_variants" not in names and "variant_email" not in names


def test_api_model_forces_guessing_off():
    from backend.api import EmailMethodsConfig
    assert EmailMethodsConfig(guess_email_variants=True).guess_email_variants is False
    assert EmailMethodsConfig().guess_email_variants is False


def test_enrichment_never_returns_unpublished_address(tmp_path, monkeypatch):
    """Run the enrichment with guessing requested + MX failing: the failing address is dropped,
    and no other address at that domain is produced."""
    import csv
    import runner
    import validate_email

    monkeypatch.setattr(runner.time, "sleep", lambda s: None)
    # The same page serves as the search result (one result link) and the business site (one email).
    page = '<a class="result__a" href="https://acme-biz.invalid/">x</a> contact: john.smith@acme-biz.invalid'
    seen_urls = []

    class R:
        status_code = 200
        text = page

    import requests

    def fake_get(url, *a, **k):
        seen_urls.append(url)
        return R()
    monkeypatch.setattr(requests, "get", fake_get)
    monkeypatch.setattr(validate_email, "verify_mx_record", lambda d: (False, "no mx"))
    src = tmp_path / "in.csv"
    with open(src, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["doc_number", "corp_name", "city", "state"])
        w.writeheader()
        w.writerow({"doc_number": "L1", "corp_name": "EXAMPLE BIZ LLC", "city": "TAMPA", "state": "FL"})
    out = tmp_path / "out.csv"
    profile = {"email_methods": {"guess_email_variants": True, "verify_mx": True, "max_variant_attempts": 10}}
    found = runner.find_emails_for_leads(src, out, max_leads=1, profile=profile)
    rows = list(csv.DictReader(open(out)))
    assert any("acme-biz.invalid" in u for u in seen_urls), "the published email was found and checked"
    assert found == 0
    assert rows[0]["email_1"] == rows[0]["email_2"] == rows[0]["email_3"] == ""

    # Control: when the published address validates, exactly that address is kept (nothing else).
    monkeypatch.setattr(validate_email, "verify_mx_record", lambda d: (True, "ok"))
    found = runner.find_emails_for_leads(src, out, max_leads=1, profile=profile)
    rows = list(csv.DictReader(open(out)))
    assert found == 1
    assert rows[0]["email_1"] == "john.smith@acme-biz.invalid" and rows[0]["email_2"] == ""


def test_send_paths_blocked_in_tests():
    """The autouse no_network fixture makes any Mailgun/SendGrid POST fail loudly; keys are empty."""
    import runner
    ok, msg = runner.send_email("x@example.invalid", "X", "s", "b", "leads@mdo3d.com")
    assert ok is False and "not set" in msg
