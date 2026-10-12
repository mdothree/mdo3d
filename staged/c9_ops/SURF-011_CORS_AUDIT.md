# SURF-011 (P3) — API / CORS posture audit (read-only), C9 2026-10-12

Probe: `curl -X OPTIONS -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: POST'` and
`curl -H 'Origin: https://evil.example'` (GET), measured ~03:20Z. Script: scratchpad `cors.sh` (re-runnable lines below).

## Result: no `*`+credentials and no reflected-origin bug on any live MDO API. No code changes committed.

| API (live host) | Source | OPTIONS evil.example | GET evil.example | ACAC | Methods | Verdict |
|---|---|---|---|---|---|---|
| astrology-api-alpha.vercel.app | mdo3d monorepo `projects/divination/astrology/api/src/server.js` | 204, ACAO=https://astrology.mdo3d.com | 200, same | true | GET,HEAD,PUT,PATCH,POST,DELETE | OK (fixed origin) |
| dream-interpreter-api-delta.vercel.app | `divination/dreams/api` | 204, ACAO=https://dreams.mdo3d.com | 200, same | true | (cors default) | OK |
| fengshui-api-eosin.vercel.app | `divination/fengshui/api` | 204, ACAO=https://fengshui.mdo3d.com | 200, same | true | default | OK |
| iching-api.vercel.app | `divination/iching/api` | 204, ACAO=https://iching.mdo3d.com | 200, same | true | default | OK |
| numerology-api.vercel.app | `divination/numerology/api` | 204, ACAO=https://numerology.mdo3d.com | 200, same | true | default | OK |
| oracle-cards-api.vercel.app | `divination/oracle/api` | 204, ACAO=https://oracle.mdo3d.com | 200, same | true | default | OK |
| pastlives-api.vercel.app | `divination/pastlives/api` | 204, ACAO=https://pastlife.mdo3d.com | 200, same | true | default | OK |
| runes-api.vercel.app | `divination/runes/api` | 204, ACAO=https://runes.mdo3d.com | 200, same | true | default | OK |
| tarot-cards-api.vercel.app | `divination/tarot/api` | 204, ACAO=https://tarot.mdo3d.com | 200, same | true | default | OK |
| api.rigor.design | mdothree/rigor-api `api/_middleware/cors.js` (main 863d3f2) | **525** (Cloudflare: origin SSL handshake failed) | 525 | — | code: POST, OPTIONS | Code OK (explicit 9-origin allowlist, `Vary: Origin`, no ACAC). **Host down — see below** |
| runwae.com/api/llm/generate-proposal | mdothree/runwae `api/llm/generate-proposal.js` | 200, ACAO=`*` | 405, ACAO=`*` | none | POST, OPTIONS | Low: `*` without credentials; auth is a Bearer Firebase ID token (not ambient), so not exploitable cross-site. Unneeded (only caller is same-origin `runwaejs/llm.js` → `/api/llm/generate-proposal`). |
| runwae.com/api/payment/* | `api/payment/*.js` | 405, no ACAO | 405, no ACAO | — | — | OK (same-origin only) |

All 9 divination APIs use the `cors` package with a single fixed `origin: process.env.FRONTEND_URL` (falls back to
localhost — fails closed) and `credentials: true`. Fixed origin + credentials is valid and not reflective.
The divination frontends never send `credentials: 'include'` (grep: 0 hits), so `credentials: true` is unused.

### Out-of-scope observations (flag to lane)
- **api.rigor.design returns HTTP 525 on every path** (Cloudflare proxied A records 172.67.180.27 / 104.21.75.182 →
  SSL handshake to origin fails). All 7 rigor.design tools POST to `https://api.rigor.design` (15 refs) → tool calls
  are likely broken in prod. Probable fix: Cloudflare SSL mode / DNS-only (grey cloud) CNAME to `cname.vercel-dns.com`,
  or confirm `api.rigor.design` is attached as a domain on the rigor-api Vercel project. DNS/backend → Principal go.
- `rigor-api.vercel.app` serves an unrelated "Express on Vercel" app (500 when an Origin header is present); not the
  rigor-api code in this repo.

## Recommended (optional hardening, NOT required by SURF-011; not committed — backend)

### Divination APIs (9 × `projects/divination/<name>/api/src/server.js`, mdo3d monorepo)
```diff
 app.use(cors({
   origin: process.env.FRONTEND_URL || 'http://localhost:8080',
-  credentials: true
+  methods: ['GET', 'POST', 'OPTIONS'],
+  credentials: false
 }));
```
(Apply identically; the localhost default port differs per API — keep each one's existing default.)

### runwae `api/llm/generate-proposal.js`
```diff
-  res.setHeader('Access-Control-Allow-Origin', '*');
-  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
-  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
+  const ALLOWED = new Set(['https://runwae.com', 'https://www.runwae.com']);
+  const origin = req.headers.origin;
+  if (origin && ALLOWED.has(origin)) {
+    res.setHeader('Access-Control-Allow-Origin', origin);
+    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
+    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
+  }
+  res.setHeader('Vary', 'Origin');
```

### rigor-api — no change.

## Check lines
```
check "SURF-011 astrology-api no reflect" "curl -s -o /dev/null -D - -H 'Origin: https://evil.example' https://astrology-api-alpha.vercel.app/api/health" "access-control-allow-origin: https://astrology.mdo3d.com"
check "SURF-011 tarot-api no reflect"     "curl -s -o /dev/null -D - -H 'Origin: https://evil.example' https://tarot-cards-api.vercel.app/api/health" "access-control-allow-origin: https://tarot.mdo3d.com"
check "SURF-011 runwae llm (after optional fix)" "curl -s -o /dev/null -D - -X OPTIONS -H 'Origin: https://evil.example' https://runwae.com/api/llm/generate-proposal" "!access-control-allow-origin"
check "SURF-011 rigor api reachable"       "curl -s -o /dev/null -w '%{http_code}' -X OPTIONS -H 'Origin: https://resume.rigor.design' https://api.rigor.design/api/analyze" "204"
```
