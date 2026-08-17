#!/usr/bin/env python3
"""MDO3D management dashboard — one surface to manage the project portfolio.

Indexes the repo into review lanes so one operator can track and sign off fast:

  projects  — each dir under projects/, with its sub-tools, status docs, and deploy hints
  docs      — the portfolio status/architecture docs under documentation/
  social    — social post copy from social/data/*.xlsx (future lane; empty until content lands)

Sign-offs append to review/data/verdicts.csv (never written back to a source file).
For the projects lane the three actions read as on-track / needs-attention / blocked; for
social and docs they read as approve / revise / reject. Same backend either way.

Stdlib only — no pip installs. Run:
    python3 review/app.py            # -> http://127.0.0.1:8822
    PORT=9000 python3 review/app.py
"""
from __future__ import annotations

import csv
import json
import os
import re
import subprocess
import time
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs, quote, unquote

import voice_qc

REPO = Path(__file__).resolve().parent.parent
STATIC = Path(__file__).resolve().parent / "static"
DATA = Path(__file__).resolve().parent / "data"
VERDICTS = DATA / "verdicts.csv"

PROJECTS_DIR = REPO / "projects"
DOCS_DIR = REPO / "documentation"
SOCIAL_DATA = REPO / "social" / "data"

DOC_EXTS = {".docx", ".md", ".pdf", ".pptx", ".html", ".xlsx"}
SOCIAL_PENDING = {"drafted (polished)", "drafted", "needs review", "draft"}
# files inside a project that signal its state
STATUS_FILES = ("STATUS.md", "IMPLEMENTATION_STATUS.md", "IMPLEMENTATION_STATUS.md",
                "collection_status.json", "README.md")
DEPLOY_HINTS = ("deploy.sh", "vercel.json", "Dockerfile", "docker-compose.yml",
                "wrangler.toml", "netlify.toml", ".vercel")


# ============================ xlsx / docx readers (stdlib) ============================

_SS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"


def _col_index(ref: str) -> int:
    s = "".join(c for c in ref if c.isalpha())
    n = 0
    for c in s:
        n = n * 26 + (ord(c.upper()) - 64)
    return n - 1


def read_xlsx(path: Path) -> list[dict]:
    """Read the first worksheet into dict rows keyed by header. Handles shared + inline strings."""
    if not path.exists():
        return []
    z = zipfile.ZipFile(path)
    shared: list[str] = []
    if "xl/sharedStrings.xml" in z.namelist():
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root.findall(f"{{{_SS}}}si"):
            shared.append("".join(t.text or "" for t in si.iter(f"{{{_SS}}}t")))
    sheet = "xl/worksheets/sheet1.xml"
    if sheet not in z.namelist():
        cands = sorted(n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml$", n))
        if not cands:
            return []
        sheet = cands[0]
    root = ET.fromstring(z.read(sheet))
    data = root.find(f"{{{_SS}}}sheetData")
    if data is None:
        return []
    grid: list[dict[int, str]] = []
    for row in data.findall(f"{{{_SS}}}row"):
        cells: dict[int, str] = {}
        for c in row.findall(f"{{{_SS}}}c"):
            t = c.get("t")
            if t == "inlineStr":
                is_el = c.find(f"{{{_SS}}}is")
                val = "".join(x.text or "" for x in is_el.iter(f"{{{_SS}}}t")) if is_el is not None else ""
            else:
                v = c.find(f"{{{_SS}}}v")
                if v is None or v.text is None:
                    val = ""
                elif t == "s":
                    val = shared[int(v.text)]
                else:
                    val = v.text
            cells[_col_index(c.get("r", "A1"))] = val
        grid.append(cells)
    if not grid:
        return []
    width = max((max(r) for r in grid if r), default=0) + 1
    header = [grid[0].get(i, f"col{i}") for i in range(width)]
    out = []
    for n, r in enumerate(grid[1:], start=2):
        rowd = {header[i]: r.get(i, "") for i in range(width)}
        rowd["_row"] = n
        out.append(rowd)
    return out


def docx_text(path: Path, limit: int = 20000) -> str:
    try:
        z = zipfile.ZipFile(path)
        root = ET.fromstring(z.read("word/document.xml"))
    except Exception:
        return ""
    W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    paras = []
    for p in root.iter(f"{{{W}}}p"):
        text = "".join(t.text or "" for t in p.iter(f"{{{W}}}t"))
        if text.strip():
            paras.append(text)
        if sum(len(x) for x in paras) > limit:
            break
    return "\n\n".join(paras)


# ============================ project signals ============================

_git_cache: dict[str, tuple[float, dict]] = {}
# deployed URLs live in these domains; discovered from each project's own files
_URL_RE = re.compile(
    r"https?://[A-Za-z0-9.-]+\.(?:mdo3d\.com|rigor\.design|ronnascanner\.com|mdothree\.com)[^\s\"')]*")


def git_activity(rel_path: str, ttl: float = 120.0) -> dict:
    """Last commit date + relative age for a path. Cached briefly (repo changes live)."""
    now = time.time()
    hit = _git_cache.get(rel_path)
    if hit and now - hit[0] < ttl:
        return hit[1]
    info = {"last_commit": "", "age_days": None}
    try:
        out = subprocess.run(
            ["git", "-C", str(REPO), "log", "-1", "--format=%cs", "--", rel_path],
            capture_output=True, text=True, timeout=5)
        d = out.stdout.strip()
        if d:
            info["last_commit"] = d
            try:
                dt = datetime.strptime(d, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                info["age_days"] = (datetime.now(timezone.utc) - dt).days
            except ValueError:
                pass
    except Exception:
        pass
    _git_cache[rel_path] = (now, info)
    return info


_repo_urls_cache: list[str] | None = None


def _repo_urls() -> list[str]:
    """URLs mentioned in the portfolio-level status/docs (where deploy URLs actually live)."""
    global _repo_urls_cache
    if _repo_urls_cache is not None:
        return _repo_urls_cache
    urls: set[str] = set()
    sources = [REPO / "STATUS.md"]
    if DOCS_DIR.is_dir():
        sources += list(DOCS_DIR.glob("*.md"))
    for f in sources:
        if f.is_file():
            try:
                urls.update(u.rstrip(".,)") for u in _URL_RE.findall(f.read_text(errors="replace")))
            except Exception:
                pass
    _repo_urls_cache = sorted(urls)
    return _repo_urls_cache


def discover_url(proj: Path) -> str:
    """Best-effort deployed URL: the project's own files first, then a portfolio-doc URL
    whose subdomain matches the project name (e.g. leads -> leads.mdo3d.com)."""
    for fn in ("STATUS.md", "README.md", "deploy.sh", "vercel.json", "package.json", "wrangler.toml"):
        f = proj / fn
        if f.is_file():
            try:
                m = _URL_RE.search(f.read_text(errors="replace"))
            except Exception:
                m = None
            if m:
                return m.group(0).rstrip(".,)")
    name = proj.name.lower()
    for u in _repo_urls():
        host = (urlparse(u).hostname or "").lower()
        if host.split(".")[0] == name:
            return u
    return ""


def http_health(url: str, timeout: float = 4.0) -> dict:
    """HEAD (falling back to GET) a discovered URL. On-demand only, never in the list load."""
    if not _URL_RE.match(url):
        return {"url": url, "status": 0, "ok": False, "error": "url not in an allowed MDO3D domain"}
    for method in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(url, method=method, headers={"User-Agent": "mdo3d-review/1.0"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return {"url": url, "status": r.status, "ok": 200 <= r.status < 400}
        except urllib.error.HTTPError as e:
            return {"url": url, "status": e.code, "ok": 200 <= e.code < 400}
        except Exception as e:
            last = str(e)[:100]
    return {"url": url, "status": 0, "ok": False, "error": last}


# ============================ item builders ============================

def _rel(p: Path) -> str:
    return str(p.relative_to(REPO))


def _read_head(path: Path, n: int = 1600) -> str:
    try:
        if path.suffix.lower() == ".docx":
            return docx_text(path)[:n]
        if path.suffix.lower() == ".json":
            return path.read_text(errors="replace")[:n]
        return path.read_text(errors="replace")[:n]
    except Exception:
        return ""


def _tree_signals(proj: Path) -> dict:
    """Cheap health signals for a project without running anything."""
    names = {p.name for p in proj.iterdir()} if proj.is_dir() else set()
    subtools = sorted(p.name for p in proj.iterdir()
                      if p.is_dir() and not p.name.startswith(".")
                      and p.name not in ("node_modules", "__pycache__", "data", "logs",
                                          "config", "dist", "build", "docs", "landing"))
    status_file = next((f for f in STATUS_FILES if f in names), "")
    deploy = sorted(h for h in DEPLOY_HINTS if h in names)
    docs = sorted(n for n in names if n.lower().endswith((".md",)) and n.lower() != "readme.md")
    return {"subtools": subtools, "status_file": status_file, "deploy": deploy, "docs": docs}


def project_items() -> list[dict]:
    out = []
    if not PROJECTS_DIR.is_dir():
        return out
    for proj in sorted(PROJECTS_DIR.iterdir()):
        if not proj.is_dir() or proj.name.startswith("."):
            continue
        sig = _tree_signals(proj)
        status_path = proj / sig["status_file"] if sig["status_file"] else None
        snippet = _read_head(status_path) if status_path and status_path.exists() else ""
        rel = _rel(proj)
        git = git_activity(rel)
        todo_path = proj / "TODO.md"
        todo = _read_head(todo_path, 1200) if todo_path.is_file() else ""
        out.append({
            "item_key": f"project/{proj.name}",
            "item_type": "project",
            "title": proj.name,
            "area": f"{len(sig['subtools'])} sub-tools" if sig["subtools"] else "",
            "category": "project",
            "subtools": sig["subtools"],
            "status_file": sig["status_file"],
            "deploy_hints": sig["deploy"],
            "doc_files": sig["docs"],
            "status_snippet": snippet,
            "todo_snippet": todo,
            "deploy_url": discover_url(proj),
            "last_commit": git["last_commit"],
            "age_days": git["age_days"],
            "path": rel,
            "pending": True,
        })
    # attention-first: no status file, then stalest (largest age), then name
    out.sort(key=lambda i: (bool(i["status_file"]), -(i["age_days"] or 0), i["title"]))
    return out


def _doc_item(path: Path, item_type: str) -> dict:
    return {
        "item_key": f"{item_type}/{_rel(path)}",
        "item_type": item_type,
        "title": path.stem.replace("_", " "),
        "area": path.parent.name,
        "category": path.suffix.lower().lstrip("."),
        "path": _rel(path),
        "ext": path.suffix.lower(),
        "pending": True,
        "previewable": path.suffix.lower() in (".docx", ".md", ".html"),
    }


def doc_items() -> list[dict]:
    out = []
    if DOCS_DIR.is_dir():
        for p in sorted(DOCS_DIR.glob("*")):
            if p.is_file() and p.suffix.lower() in (".md", ".docx"):
                out.append(_doc_item(p, "doc"))
    return out


def social_items() -> list[dict]:
    out = []
    for xlsx in sorted(SOCIAL_DATA.glob("*.xlsx")) if SOCIAL_DATA.is_dir() else []:
        for r in read_xlsx(xlsx):
            body = (r.get("Post", "") or "").strip()
            if not body:
                continue
            status = (r.get("Status", "") or "").strip()
            flags = voice_qc.scan(body, r.get("CTA", ""))
            out.append({
                "item_key": f"social/{xlsx.stem}/{r['_row']}",
                "item_type": "social",
                "title": (r.get("Topic") or r.get("Hook") or "(untitled post)")[:120],
                "date": r.get("Date", ""),
                "area": r.get("Service/Product Line", "") or r.get("Brand", ""),
                "category": r.get("Category", ""),
                "source_status": status,
                "pending": status.lower() in SOCIAL_PENDING,
                "hook": r.get("Hook", ""),
                "core_insight": r.get("Core Insight", ""),
                "body": body,
                "cta": r.get("CTA", ""),
                "link": r.get("LinkedIn URL", ""),
                "qc_flags": flags,
                "qc": voice_qc.worst(flags),
            })
    return out


def all_items() -> dict[str, dict]:
    items: dict[str, dict] = {}
    for it in project_items() + doc_items() + social_items():
        items[it["item_key"]] = it
    return items


# ============================ verdicts ============================

VERDICT_FIELDS = ["reviewed_at", "item_type", "item_key", "verdict", "reviewer", "notes", "revision_text"]


def latest_verdicts() -> dict[str, dict]:
    out: dict[str, dict] = {}
    if not VERDICTS.exists():
        return out
    with open(VERDICTS, newline="") as f:
        for r in csv.DictReader(f):
            out[r["item_key"]] = r
    return out


def append_verdict(row: dict) -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    new = not VERDICTS.exists()
    with open(VERDICTS, "a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=VERDICT_FIELDS)
        if new:
            w.writeheader()
        w.writerow({k: row.get(k, "") for k in VERDICT_FIELDS})


def decorate(items: list[dict]) -> list[dict]:
    latest = latest_verdicts()
    out = []
    for it in items:
        v = latest.get(it["item_key"])
        it = dict(it)
        it["verdict"] = v["verdict"] if v else "pending"
        it["review_notes"] = v.get("notes", "") if v else ""
        out.append(it)
    return out


# ============================ HTTP handler ============================

class Handler(BaseHTTPRequestHandler):
    server_version = "MDO3DReview/1.0"

    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json(self, obj, code=200):
        self._send(code, json.dumps(obj).encode(), "application/json; charset=utf-8")

    def _guard(self, raw):
        p = (REPO / unquote(raw)).resolve() if not os.path.isabs(raw) else Path(raw).resolve()
        try:
            p.relative_to(REPO.resolve())
        except ValueError:
            return None
        return p if p.is_file() else None

    def do_GET(self):
        u = urlparse(self.path)
        path, q = u.path, parse_qs(u.query)
        if path in ("/", ""):
            return self._file(STATIC / "index.html")
        if path == "/v1/review/queue":
            return self._queue(q)
        if path == "/v1/review/summary":
            return self._summary()
        if path.startswith("/v1/review/item/"):
            return self._item(unquote(path[len("/v1/review/item/"):]))
        if path == "/v1/project/health":
            return self._health(q.get("key", [""])[0])
        if path == "/v1/doc/text":
            return self._doc_text(q.get("path", [""])[0])
        if path == "/v1/doc/raw":
            return self._doc_raw(q.get("path", [""])[0])
        if path.startswith("/static/"):
            return self._file(STATIC / path[len("/static/"):])
        cand = STATIC / path.lstrip("/")
        if cand.is_file():
            return self._file(cand)
        return self._json({"error": "not found"}, 404)

    def _queue(self, q):
        items = decorate(list(all_items().values()))
        t = q.get("type", [None])[0]
        if t:
            items = [i for i in items if i["item_type"] == t]
        if q.get("status", ["pending"])[0] == "pending":
            items = [i for i in items if i["verdict"] not in ("approve", "reject") and i.get("pending", True)]
        return self._json({"count": len(items), "items": items})

    def _item(self, key):
        found = all_items().get(key)
        if not found:
            return self._json({"error": f"unknown item: {key}"}, 404)
        return self._json(decorate([found])[0])

    def _health(self, key):
        found = all_items().get(key)
        if not found or found["item_type"] != "project":
            return self._json({"error": "unknown project"}, 404)
        url = found.get("deploy_url", "")
        if not url:
            return self._json({"url": "", "status": 0, "ok": False, "error": "no deployed URL found"})
        return self._json(http_health(url))

    def _summary(self):
        items = decorate(list(all_items().values()))
        by_type: dict[str, dict] = {}
        for i in items:
            d = by_type.setdefault(i["item_type"], {"total": 0, "pending": 0, "approve": 0, "reject": 0, "revise": 0})
            d["total"] += 1
            d[i["verdict"]] = d.get(i["verdict"], 0) + 1
        return self._json({"total": len(items), "by_type": by_type})

    def _doc_text(self, raw):
        p = self._guard(raw)
        if not p:
            return self._json({"error": "not found or outside repo"}, 404)
        ext = p.suffix.lower()
        if ext == ".docx":
            text = docx_text(p)
        elif ext in (".md", ".html", ".txt", ".json"):
            text = p.read_text(errors="replace")
            if ext == ".html":
                text = re.sub(r"<[^>]+>", "", text)
        else:
            text = ""
        return self._json({"path": raw, "ext": ext, "text": text,
                           "raw_url": f"/v1/doc/raw?path={quote(raw)}"})

    def _doc_raw(self, raw):
        p = self._guard(raw)
        if not p:
            return self._json({"error": "not found or outside repo"}, 404)
        ctype = {".pdf": "application/pdf", ".png": "image/png", ".html": "text/html; charset=utf-8",
                 ".md": "text/plain; charset=utf-8"}.get(p.suffix.lower(), "application/octet-stream")
        self._send(200, p.read_bytes(), ctype)

    def _file(self, p):
        if not p.is_file():
            return self._json({"error": "not found"}, 404)
        ctype = {".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
                 ".css": "text/css; charset=utf-8", ".png": "image/png", ".ico": "image/x-icon"}.get(
            p.suffix.lower(), "application/octet-stream")
        self._send(200, p.read_bytes(), ctype)

    def do_POST(self):
        u = urlparse(self.path)
        if not (u.path.startswith("/v1/review/item/") and u.path.endswith("/verdict")):
            return self._json({"error": "not found"}, 404)
        key = unquote(u.path[len("/v1/review/item/"):-len("/verdict")])
        found = all_items().get(key)
        if not found:
            return self._json({"error": f"unknown item: {key}"}, 404)
        length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            return self._json({"error": "bad json"}, 400)
        if body.get("verdict") not in ("approve", "reject", "revise"):
            return self._json({"error": "verdict must be approve|reject|revise"}, 422)
        append_verdict({
            "reviewed_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "item_type": found["item_type"], "item_key": key,
            "verdict": body["verdict"], "reviewer": body.get("reviewer", "operator"),
            "notes": body.get("notes", ""), "revision_text": body.get("revision_text", ""),
        })
        return self._json({"ok": True, "item_key": key, "verdict": body["verdict"]})


def main():
    port = int(os.environ.get("PORT", "8822"))
    host = os.environ.get("HOST", "127.0.0.1")
    DATA.mkdir(parents=True, exist_ok=True)
    srv = ThreadingHTTPServer((host, port), Handler)
    print(f"MDO3D review  ->  http://{host}:{port}")
    print(f"  repo:     {REPO}")
    print(f"  verdicts: {VERDICTS}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")


if __name__ == "__main__":
    main()
