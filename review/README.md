# MDO3D Management Dashboard

One surface to manage the MDO3D project portfolio and, later, to review its social
content. Modeled on the Ridgefield review dashboard, rebranded and re-pointed at this
repo. Sign-offs append to `data/verdicts.csv`; source files are never written back to.

## Run

```bash
python3 review/app.py            # -> http://127.0.0.1:8822
PORT=9000 python3 review/app.py  # any stdlib python3 works, no pip installs
```

Pure Python stdlib (`http.server`, a small zipfile/XML reader for `.xlsx`/`.docx`), so
it runs with no dependencies.

## Lanes

| Lane | Source | Shows |
|------|--------|-------|
| **Projects** | `projects/*` | Each project with its sub-tool list, status file, deploy hints, git last-commit age, next-actions (TODO.md), and a live deploy health check. Sorted attention-first (no status file, then stalest). |
| **Docs** | `documentation/*.md` and `.docx` | The portfolio status/architecture docs, text-extracted inline. |
| **Social** | `social/data/*.xlsx` | Social post copy, once it exists. Scanned by the voice QC gate. Empty until content lands. |

## Actions

The three actions post the same backend verdict; the labels read per lane:

- **Projects** — On track / Needs attention / Blocked (project management sign-off).
- **Docs and Social** — Approve / Revise / Reject (content review).

Each action saves with optional notes to `data/verdicts.csv` (append-only, latest wins).

## Voice QC (social lane)

`review/voice_qc.py` scans social drafts against `comms/voice/` before you see them:
em/en dashes, contrastive "not X, it is Y" reframing, our-product performance claims,
adoption metrics, and product/brand or compound hashtags. Brand-specific claims rules
get added once the MDO3D voice guide is filled in.

## Project signals (built in)

- **Git activity** — last commit date and age per project dir, cached briefly. Stalest
  projects sort to the top. Uncommitted or brand-new dirs show no age.
- **Deploy health** — the deployed URL is discovered from the project's own files, or from
  a portfolio-doc URL whose subdomain matches the project name (`leads` → `leads.mdo3d.com`).
  Opening a project runs a live HEAD/GET check (on demand, never in the list load) and shows
  the HTTP status. Requests are restricted to the known MDO3D domains.
- **Next actions** — a project's `TODO.md` head is surfaced in its detail panel.

## Extending

- **Sub-tool granularity**: projects nest sub-tools (divination → tarot, oracle, ...); a
  second pass can index those as their own items, each with its own subdomain health check.
- **URL map**: for projects whose subdomain differs from the dir name, add an explicit
  `name → url` map so their health checks resolve too.
