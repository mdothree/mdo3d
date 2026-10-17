# Frontier Ledger (Blacklab B) · v0, quantum

A verified events ledger plus a Promise Ledger (roadmap claims vs what shipped), on the Daily AI Toll pipeline
pattern. Direction decided by the Principal 2026-10-17: Frontier Ledger + Promise Ledger, quantum first;
watchlists/alerts are the first paid feature; the full dataset is paid. Blacklab B only (MDO3D); the site does
not depend on blacklabb.com (domain undecided) and deploys to a `*.vercel.app` URL.

This replaces the three empty localStorage trackers (quantum/space/neuro) as the Blacklab B product. They are
not linked from any Frontier Ledger page; their history is left as it was.

## Rule: no evidence, no entry
Every event has `source_url`, `source_title` and a verbatim `excerpt`; every claim has a verbatim `claim` quote and
`source_url`. A claim status other than `pending` needs `status_evidence_url` + `status_note`. The validator rejects
anything else, plus duplicates. `--fetch` re-opens each source and checks the excerpt is on the page.

## Layout
```
config/quantum.json          sector config: companies, keywords, public window (180 days)
data/quantum/events.jsonl    id, date, company, type, title, summary, source_url, source_title, excerpt, confidence, verified_at
data/quantum/claims.jsonl    id, company, claim, claim_date, target_date, source_url, source_title, status, status_evidence_url, status_note, verified_at
scripts/ledger_lib.py        schema, validation, dedupe, ids, excerpt-at-source check
scripts/validate.py          validator (exit 1 on any rejected row); --fetch, --stats
scripts/collect.py           Claude + web search collector -> data/<sector>/candidates/<date>.jsonl; --promote after review
scripts/build_web.py         renders web/*.html + web/data/ledger.json from data/ (rows prerendered, counts computed)
web/                         the deployable site (Vercel project root): 5 pages, css, js, api/checkout.js, api/export.js
ops/                         STAGED scheduler (GitHub Action file outside .github, bigmini2 cron line, run_nightly.sh)
tests/test_validator.py      python3 -m unittest discover -s tests
```

Types: milestone, funding, contract, regulatory, launch, hiring, shutdown. Statuses: on_track, delivered,
slipped, dropped, pending. Dedupe: same source URL, or same company + type with title Jaccard >= 0.6 within 10 days.

## Run
```
python3 scripts/validate.py --sector quantum --fetch     # 0 rejected required
python3 scripts/build_web.py --sector quantum            # regenerate web/
python3 scripts/collect.py --sector quantum --dry-run    # prompt only
ANTHROPIC_API_KEY=... python3 scripts/collect.py --sector quantum --verify-fetch   # key by name, never committed
python3 scripts/collect.py --sector quantum --promote data/quantum/candidates/<date>.jsonl   # after PR review
```
Builds/tests run off the laptop (bigmini2).

## Public vs membership
Public: headline counts, latest entries, the last 180 days of the ledger, the full Promise Ledger, the method page,
the watchlist picker (saved in the viewer's browser). Membership (early access, coming soon): watchlist email
alerts, full history, CSV export. `web/data/ledger.json` only contains the public window; the full events file is not
deployed. `/api/export` returns 402 until membership is real.

## Checkout (Stripe TEST mode only)
`web/api/checkout.js` reads `STRIPE_TEST_SECRET_KEY` by name. No key: 503, disabled ("opens soon"). A key not
starting `sk_test_`: 403, refused. A live-mode session is refused too. `STRIPE_SECRET_KEY` is never read. Prices:
$6/month or $60/year (pricing delegated, doctrine: no .99, paid-only, promo codes allowed). Going live needs the
Principal's payments GO and a separate change.

## Deploy
Staged GO: `~/mdo3d/staged/frontier_ledger_2026-10-17/FRONTIER_LEDGER_GO.sh` (check / go / verify / rollback).
