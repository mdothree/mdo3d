#!/usr/bin/env python3
"""Render the static site in web/ from data/<sector>/ (no framework, no build step on Vercel).

Rows are rendered into the HTML (readable without JS, checkable with curl); JS only filters and highlights.
Every rendered row carries a class="src" link. Counts are computed from the data, never typed in.

Public window: the Ledger page shows the last `public_window_days` of events. The full history and the
CSV export are membership features (early access), so the full events file is never copied into web/.

  python3 scripts/build_web.py --sector quantum
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ledger_lib as L  # noqa: E402
from validate import check, stats  # noqa: E402

WEB = L.ROOT / "web"
# Single source of the brand: mdo3d shared/brand/blacklabb.css (first match walking up from this project).
BRAND_CSS = next((p / "shared" / "brand" / "blacklabb.css" for p in L.ROOT.parents
                  if (p / "shared" / "brand" / "blacklabb.css").exists()), None)

STATUS_LABEL = {"on_track": "On track", "delivered": "Delivered", "slipped": "Slipped",
                "dropped": "Dropped", "pending": "Pending"}
TYPE_LABEL = {t: t.capitalize() for t in L.EVENT_TYPES}
PRICE_MONTH, PRICE_YEAR = 6, 60  # USD; mirrors web/api/checkout.js PLANS

NAV = [("/", "Overview"), ("/ledger", "Ledger"), ("/promises", "Promise Ledger"),
       ("/watchlist", "Watchlist"), ("/method", "Method")]


def h(s) -> str:
    return escape(str(s if s is not None else ""), quote=True)


def fmt_date(d: str) -> str:
    try:
        return datetime.strptime(d, "%Y-%m-%d").strftime("%d %b %Y")
    except (TypeError, ValueError):
        return h(d)


def page(path: str, title: str, desc: str, body: str, scripts: str = "") -> str:
    cur = ' aria-current="page"'
    nav = "".join(f'<a href="{u}"{cur if u == path else ""}>{n}</a>' for u, n in NAV)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{h(title)}</title>
<meta name="description" content="{h(desc)}">
<meta name="theme-color" content="#0A0B0D">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/blacklabb.css">
<link rel="stylesheet" href="/css/ledger.css">
</head>
<body class="blb t-quantum">
<header class="top"><div class="wrap">
<a class="blb-mark" href="/"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true"><circle cx="9" cy="9" r="5"/><path d="M9 0v4M9 14v4M0 9h4M14 9h4"/></svg>BLACKLAB<span class="b">B</span></a>
<span class="label sector">Frontier Ledger &middot; Quantum</span>
<nav aria-label="Main">{nav}</nav>
</div></header>
<main class="wrap">
{body}
</main>
<footer><div class="wrap"><span>Blacklab B &middot; Frontier Ledger &middot; an MDO3D division</span><span>Every entry links to its source &middot; <a href="/method">Method</a></span></div></footer>
<script src="/js/ledger.js"></script>
{scripts}
</body>
</html>
"""


def event_row(e: dict) -> str:
    text = " ".join([e["company"], e["title"], e["summary"], e["excerpt"]]).lower()
    return f"""<li class="row ev" data-id="{h(e['id'])}" data-type="{h(e['type'])}" data-company="{h(e['company'])}" data-date="{h(e['date'])}" data-text="{h(text)}">
<div class="meta mono"><time datetime="{h(e['date'])}">{fmt_date(e['date'])}</time><span class="blb-tag t-{h(e['type'])}">{TYPE_LABEL[e['type']]}</span><span class="co">{h(e['company'])}</span></div>
<h3>{h(e['title'])}</h3>
<p class="sum">{h(e['summary'])}</p>
<blockquote class="ex">&ldquo;{h(e['excerpt'])}&rdquo;</blockquote>
<div class="foot mono"><a class="src" href="{h(e['source_url'])}" target="_blank" rel="noopener nofollow">Source: {h(e['source_title'])}</a><span class="conf" title="Source confidence">conf {e['confidence']:.2f}</span></div>
</li>"""


def claim_row(c: dict) -> str:
    text = " ".join([c["company"], c["claim"], c.get("status_note", "")]).lower()
    ev = (f'<a class="evid" href="{h(c["status_evidence_url"])}" target="_blank" rel="noopener nofollow">Status evidence</a>'
          if c.get("status_evidence_url") else '<span class="evid none">No status evidence yet</span>')
    note = f'<p class="note">{h(c["status_note"])}</p>' if c.get("status_note") else ""
    return f"""<li class="row cl" data-id="{h(c['id'])}" data-status="{h(c['status'])}" data-company="{h(c['company'])}" data-text="{h(text)}">
<div class="meta mono"><span class="co">{h(c['company'])}</span><span class="blb-tag s-{h(c['status'])}">{STATUS_LABEL[c['status']]}</span></div>
<blockquote class="claim">&ldquo;{h(c['claim'])}&rdquo;</blockquote>
<dl class="dates mono"><div><dt>Said</dt><dd>{fmt_date(c['claim_date'])}</dd></div><div><dt>Target</dt><dd>{fmt_date(c['target_date'])}</dd></div></dl>
{note}
<div class="foot mono"><a class="src" href="{h(c['source_url'])}" target="_blank" rel="noopener nofollow">Claim source: {h(c['source_title'])}</a>{ev}</div>
</li>"""


def counts_block(s: dict) -> str:
    cs = s["claims_by_status"]
    cells = [("events_total", s["events"], "Verified events"), ("claims_total", s["claims"], "Roadmap claims tracked"),
             ("companies_total", s["companies"], "Companies"), ("claims_delivered", cs["delivered"], "Claims delivered"),
             ("claims_slipped", cs["slipped"], "Claims slipped"), ("claims_pending", cs["pending"] + cs["on_track"], "Claims open")]
    return '<div class="counts">' + "".join(
        f'<div class="blb-frame cell"><span class="n mono" data-count="{k}">{v}</span><span class="label">{lbl}</span></div>'
        for k, v, lbl in cells) + "</div>"


def membership_block() -> str:
    return f"""<section class="member blb-frame" id="membership">
<div><div class="label">Membership &middot; early access</div>
<h2>Watchlist alerts and the full ledger</h2>
<p>Members get alerts when a verified entry matches their watchlist, the full event history, and the CSV export.
Membership opens in early access first; until checkout is live, nothing can be bought here.</p>
<ul class="plain mono"><li>Watchlist alerts by email</li><li>Full ledger history and search</li><li>CSV export of events and claims</li></ul>
</div>
<div class="buy">
<div class="price mono"><span>${PRICE_MONTH}</span>/month &middot; or ${PRICE_YEAR}/year</div>
<div class="blb-seg" role="group" aria-label="Billing"><button type="button" data-plan="monthly" aria-pressed="true">Monthly</button><button type="button" data-plan="yearly" aria-pressed="false">Yearly</button></div>
<button class="blb-btn" type="button" id="join">Join early access</button>
<p class="status mono" id="join-status" role="status">Checkout status: checking&hellip;</p>
</div>
</section>"""


def build(sector: str) -> dict:
    cfg = json.loads((L.ROOT / "config" / f"{sector}.json").read_text())
    events, claims = L.load_sector(sector)
    if check(events, claims, fetch=False):
        raise SystemExit("validator rejected rows; fix data before building")
    events.sort(key=lambda e: (e["date"], e["id"]), reverse=True)
    claims.sort(key=lambda c: (c["target_date"], c["company"]))
    s = stats(events, claims)
    built = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cutoff = (datetime.now(timezone.utc) - timedelta(days=cfg["public_window_days"])).strftime("%Y-%m-%d")
    window = [e for e in events if e["date"] >= cutoff]
    companies = sorted({e["company"] for e in events} | {c["company"] for c in claims}, key=str.lower)

    (WEB / "data").mkdir(parents=True, exist_ok=True)
    (WEB / "css").mkdir(exist_ok=True)
    if not BRAND_CSS:
        raise SystemExit("shared/brand/blacklabb.css not found above this project")
    shutil.copyfile(BRAND_CSS, WEB / "css" / "blacklabb.css")
    public = {"sector": sector, "built": built, "counts": s, "window_days": cfg["public_window_days"],
              "window_from": cutoff, "companies": companies, "keywords": cfg["keywords"],
              "events": window, "claims": claims}
    (WEB / "data" / "ledger.json").write_text(json.dumps(public, ensure_ascii=False, indent=1) + "\n")

    latest = events[:5]
    # One claim per status (slipped, delivered, on track, pending) so the preview shows what the ledger does.
    promise_preview = [next(c for c in claims if c["status"] == st) for st in ("slipped", "delivered", "on_track", "pending")
                       if any(c["status"] == st for c in claims)][:3]

    index = f"""<section class="hero">
<div><div class="label">Frontier Ledger &middot; Quantum</div>
<h1>What quantum companies did,<br><span class="dim">and what they said they would do.</span></h1></div>
<div><p class="lede">A dated, sourced record of quantum computing events, plus a Promise Ledger that checks public roadmap claims against what shipped.
<strong>Every entry links to its source and quotes it word for word.</strong></p>
<p class="label built">Updated {fmt_date(built)} &middot; data from {fmt_date(s['first_date'])} to {fmt_date(s['last_date'])}</p></div>
</section>
{counts_block(s)}
<section class="split">
<div><div class="head"><h2>Latest entries</h2><a class="more mono" href="/ledger">Open the ledger &rarr;</a></div>
<ol class="rows">{''.join(event_row(e) for e in latest)}</ol></div>
<div><div class="head"><h2>From the Promise Ledger</h2><a class="more mono" href="/promises">All claims &rarr;</a></div>
<ol class="rows">{''.join(claim_row(c) for c in promise_preview)}</ol></div>
</section>
{membership_block()}"""

    types_seg = '<button type="button" data-type="" aria-pressed="true">All</button>' + "".join(
        f'<button type="button" data-type="{t}" aria-pressed="false">{TYPE_LABEL[t]}</button>'
        for t in L.EVENT_TYPES if s["events_by_type"].get(t))
    co_opts = '<option value="">All companies</option>' + "".join(
        f'<option value="{h(c)}">{h(c)}</option>' for c in sorted({e["company"] for e in window}, key=str.lower))
    ledger = f"""<section class="pagehead"><div class="label">Ledger</div><h1>Verified events</h1>
<p class="lede">Showing <span class="mono" data-count="window_events">{len(window)}</span> of <span class="mono" data-count="events_total">{s['events']}</span> entries: the last {cfg['public_window_days']} days.
The full history and CSV export come with <a href="/#membership">membership</a> (early access).</p></section>
<div class="tools blb-frame">
<label class="search"><span class="label">Search</span><input type="search" id="q" placeholder="company, qubits, error correction&hellip;" autocomplete="off"></label>
<label><span class="label">Company</span><select id="company">{co_opts}</select></label>
<label class="chk"><input type="checkbox" id="wl-only"> <span class="label">Watchlist matches only</span></label>
<div class="blb-seg types" role="group" aria-label="Event type">{types_seg}</div>
<button class="blb-btn ghost" type="button" id="export">CSV export</button>
</div>
<p class="mono shown" id="shown" role="status"></p>
<ol class="rows" id="list">{''.join(event_row(e) for e in window)}</ol>
<p class="empty mono" id="empty" hidden>No entries match. Clear the search or pick another type.</p>"""

    st_seg = '<button type="button" data-status="" aria-pressed="true">All</button>' + "".join(
        f'<button type="button" data-status="{k}" aria-pressed="false">{v} <span class="mono">{s["claims_by_status"][k]}</span></button>'
        for k, v in STATUS_LABEL.items() if s["claims_by_status"][k])
    promises = f"""<section class="pagehead"><div class="label">Promise Ledger</div><h1>Roadmap claims, checked</h1>
<p class="lede">Each row quotes a public roadmap claim and its source. A status other than Pending needs its own evidence link.
<span class="mono" data-count="claims_total">{s['claims']}</span> claims tracked.</p></section>
<div class="tools blb-frame"><div class="blb-seg statuses" role="group" aria-label="Status">{st_seg}</div></div>
<ol class="rows grid2" id="list">{''.join(claim_row(c) for c in claims)}</ol>
<p class="empty mono" id="empty" hidden>No claims with this status.</p>"""

    co_checks = "".join(f'<label class="chk"><input type="checkbox" name="co" value="{h(c)}"> {h(c)}</label>' for c in companies)
    kw_hint = ", ".join(cfg["keywords"][:4])
    watchlist = f"""<section class="pagehead"><div class="label">Watchlist</div><h1>Follow the companies and topics you care about</h1>
<p class="lede">Pick companies and keywords. Matching entries are highlighted across the ledger. Your watchlist is saved in this browser.
Email alerts for new matches are a membership feature (early access).</p></section>
<section class="wl">
<div class="blb-frame pick">
<div class="label">Companies</div><div class="cos">{co_checks}</div>
<label class="search"><span class="label">Keywords, comma separated</span><input type="text" id="kw" placeholder="{h(kw_hint)}"></label>
<div class="row-actions"><button class="blb-btn ghost" type="button" id="wl-clear">Clear</button></div>
</div>
<div><div class="head"><h2>Matches</h2><span class="mono" id="wl-count"></span></div>
<ol class="rows" id="wl-list"><li class="row placeholder mono">Pick a company or add a keyword to see matches.</li></ol></div>
</section>
{membership_block()}"""

    method = f"""<section class="pagehead"><div class="label">Method</div><h1>How an entry gets in</h1>
<p class="lede">No evidence, no entry. This is the rule the whole ledger is built on.</p></section>
<section class="prose blb-frame">
<h2>What counts as an event</h2>
<p>A dated, public, verifiable change at a company or program: a technical milestone, funding, a contract, a regulatory action, a product launch, a hiring move or a shutdown.
Opinion pieces, forecasts and rumours are left out.</p>
<h2>Sourcing</h2>
<p>Each event carries a source link, the source title and a short excerpt copied word for word from that page. We prefer the company's own newsroom or filings, then regulators, then major outlets, then trade press.
The confidence figure on each row reflects that order: 0.95 for a primary source, 0.85 for a major outlet, 0.70 for trade press. Rows below 0.50 are rejected.</p>
<h2>How rows are collected and checked</h2>
<p>A collector searches the web with Claude and proposes candidate rows. A validator then rejects any row without a source URL or excerpt, any duplicate (same source page, or the same company and event type with a near-identical title within ten days),
and, when it can reach the page, any row whose excerpt is not on the source. Candidates go to a reviewed pull request; a person reads them before they enter the ledger.
The seed rows were gathered by hand-run research and checked the same way.</p>
<h2>The Promise Ledger</h2>
<p>A claim is a dated public statement that something will ship by a date. We quote it and link it. Status starts at Pending.
Delivered, Slipped, Dropped and On track each need a second source showing it, recorded as status evidence. We quote; we do not editorialise.</p>
<h2>Corrections</h2>
<p>If an entry is wrong, the source link is the fastest way to check it. Corrections replace the row and keep the source trail.</p>
<h2>What is public and what is membership</h2>
<p>Headline counts, the latest entries, the last {cfg['public_window_days']} days of the ledger and the full Promise Ledger are open to read.
Watchlist alerts, the full history and the CSV export are membership features, opening in early access.</p>
<p class="mono built">Data: {s['events']} events, {s['claims']} claims, {s['rows_without_source']} rows without a source. Built {fmt_date(built)}.</p>
</section>"""

    pages = {
        "index.html": page("/", "Frontier Ledger | Quantum", "A sourced record of quantum computing events and a Promise Ledger of roadmap claims.", index, '<script src="/js/member.js"></script>'),
        "ledger.html": page("/ledger", "Ledger | Frontier Ledger", "Verified quantum computing events with sources.", ledger),
        "promises.html": page("/promises", "Promise Ledger | Frontier Ledger", "Quantum roadmap claims checked against what shipped.", promises),
        "watchlist.html": page("/watchlist", "Watchlist | Frontier Ledger", "Follow quantum companies and topics.", watchlist, '<script src="/js/member.js"></script>'),
        "method.html": page("/method", "Method | Frontier Ledger", "How Frontier Ledger entries are sourced and checked.", method),
    }
    for name, html_ in pages.items():
        (WEB / name).write_text(html_)
    s["window_events"] = len(window)
    s["rendered_rows"] = {"index.html": len(latest) + len(promise_preview), "ledger.html": len(window),
                          "promises.html": len(claims)}
    (WEB / "data" / "build_stats.json").write_text(json.dumps(s, indent=1) + "\n")
    print(json.dumps({"built": built, "events": s["events"], "claims": s["claims"], "window": len(window)}))
    return s


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--sector", default="quantum")
    build(ap.parse_args().sector)
