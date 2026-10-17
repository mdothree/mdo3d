"""Run: python3 -m unittest discover -s tests   (from projects/blacklab/frontier-ledger)"""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import ledger_lib as L  # noqa: E402
import collect  # noqa: E402

GOOD = {"id": "fl-q-20260101-01", "date": "2026-01-01", "company": "ExampleQ", "type": "milestone",
        "title": "ExampleQ shows a 100-qubit chip", "summary": "ExampleQ said it ran a 100-qubit chip.",
        "source_url": "https://example.com/a", "source_title": "Example", "confidence": 0.9,
        "excerpt": "ExampleQ today announced a 100-qubit processor.", "verified_at": "2026-01-02"}


class Validator(unittest.TestCase):
    def test_good_row(self):
        self.assertEqual(L.validate_event(GOOD), [])

    def test_no_source_rejected(self):
        for k in ("source_url", "excerpt"):
            bad = {**GOOD, k: ""}
            self.assertTrue(any("no evidence" in e for e in L.validate_event(bad)), k)
        self.assertTrue(L.validate_event({**GOOD, "source_url": "http://insecure.example"}))

    def test_bad_type_and_confidence(self):
        self.assertTrue(L.validate_event({**GOOD, "type": "rumour"}))
        self.assertTrue(L.validate_event({**GOOD, "confidence": 0.3}))

    def test_dedupe_same_url(self):
        other = {**GOOD, "id": "x", "title": "Different", "date": "2026-03-01"}
        self.assertIsNotNone(L.event_duplicate_reason(other, [GOOD]))

    def test_dedupe_similar_title_window(self):
        other = {**GOOD, "id": "y", "source_url": "https://other.example/b", "date": "2026-01-05",
                 "title": "ExampleQ shows 100-qubit chip"}
        self.assertIsNotNone(L.event_duplicate_reason(other, [GOOD]))
        far = {**other, "date": "2026-03-05"}
        self.assertIsNone(L.event_duplicate_reason(far, [GOOD]))

    def test_claim_status_needs_evidence(self):
        c = {"id": "pl-q-x-01", "company": "ExampleQ", "claim": "We will deliver 1,000 logical qubits by 2029.",
             "claim_date": "2025-01-01", "target_date": "2029-12-31", "source_url": "https://example.com/r",
             "source_title": "Roadmap", "status": "pending", "status_evidence_url": "", "status_note": "",
             "verified_at": "2026-01-01"}
        self.assertEqual(L.validate_claim(c), [])
        self.assertTrue(L.validate_claim({**c, "status": "delivered"}))

    def test_collector_rejects_unsourced(self):
        data = {"events": [{k: v for k, v in GOOD.items() if k != "source_url"}], "claims": [], "claim_updates": []}
        ok, rej = collect.prepare("quantum", data, [], [], verify_fetch=False)
        self.assertEqual(ok, [])
        self.assertEqual(len(rej), 1)

    def test_norm_text_tolerates_markup_spacing(self):
        self.assertIn(L._norm_text("Published in Nature, IBM (NYSE: IBM)"),
                      L._norm_text("Published in Nature , IBM (NYSE: IBM ) today"))

    def test_seed_data_clean(self):
        events, claims = L.load_sector("quantum")
        self.assertTrue(events)
        for r in events:
            self.assertEqual(L.validate_event(r), [], r.get("id"))
        for r in claims:
            self.assertEqual(L.validate_claim(r), [], r.get("id"))


if __name__ == "__main__":
    unittest.main()
