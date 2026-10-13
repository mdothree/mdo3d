# GUIDANCE deploy — one Vercel CLI deploy in the MDO window (Bridge MDO-S9 (a))

**Runs only after the Principal's GO, by the lane. Not run by the fix agent.**
Canonical copy: copy A, `projects/mdo3d/guidance` in the public monorepo `mdothree/mdo3d`, `main` at **ec11078** or later.
Target: existing Vercel project **`guidance-mdo3d`**, scope **`mdothrees-projects`**, domain `guidance.mdo3d.com`.
Static site, no build (`vercel.json`: `framework: null`, `cleanUrls: true`, CSP + security headers, short-path redirects).
Later, not now: `mdo3d.com/guidance` 301 → `https://guidance.mdo3d.com/`.

## 0. Fresh checkout (never the laptop clone)
```bash
W=$(mktemp -d) && cd "$W"
GH_TOKEN=$(gh auth token -u mdothree) git clone --filter=blob:none --sparse https://github.com/mdothree/mdo3d.git
cd mdo3d && git sparse-checkout set projects/mdo3d/guidance
git merge-base --is-ancestor ec11078 HEAD && echo "has ec11078"
cd projects/mdo3d/guidance
```

## 1. Record the current production deployment (rollback target)
```bash
vercel ls guidance-mdo3d --prod --scope mdothrees-projects | head -5   # note the current Ready prod URL as PREV
```

## 2. Link and deploy (the one deploy)
```bash
vercel link --yes --project guidance-mdo3d --scope mdothrees-projects
vercel deploy --prod --yes --scope mdothrees-projects
```
If the project has a Root Directory set in its settings, the CLI deploy from this dir fails or serves the wrong tree:
clear it (Project Settings → Build & Deployment → Root Directory empty) or report back before retrying. `.vercel/` is gitignored.

## 3. Verify live (all must pass)
```bash
H=https://guidance.mdo3d.com
curl -sI $H/ | grep -iE '^(HTTP|content-security-policy|x-frame-options|x-content-type-options|referrer-policy)'   # 200 + 4 headers; CSP connect-src has fonts.googleapis.com
curl -s $H/ | grep -c 'data-mdo-theme'                       # >=1 (theme toggle shipped)
curl -s $H/ | grep -c 'theme-init.js'                        # 1
curl -s $H/ | grep -ciE 'butts technologies|\bfree\b|2025|arriving soon|Sofia R|Aisha K|Jordan M'   # 0
curl -s $H/ | grep -c 'For reflection and entertainment'     # 1
curl -s $H/ | grep -oE 'https://mdo3d.com/#(professional|utilities|commerce|contact)' | sort -u | wc -l   # 4
for p in favicon.ico apple-touch-icon.png icon-192.png icon-512.png site.webmanifest og-image.jpg robots.txt sitemap.xml .well-known/security.txt js/theme-init.js js/theme.js js/consent.js; do printf '%s ' $p; curl -s -o /dev/null -w '%{http_code}\n' $H/$p; done   # all 200
for p in oracle dreams tarot numerology astrology fengshui pastlife runes iching; do curl -s -o /dev/null -w "$p %{http_code} %{redirect_url}\n" $H/$p; done   # 308 -> https://<p>.mdo3d.com/
curl -s -o /dev/null -w '%{http_code}\n' $H/terms             # 307 -> mdo3d.com/terms
curl -s -o /dev/null -w '%{http_code}\n' $H/nope-404-check    # 404 (custom page)
```
Browser pass (xps harness, `~/latarence/coordination/evidence/2026-10-13/guidance/gqa.mjs` pattern against the live URL):
1280 + 390, dark + light: axe 0, console 0, CSP 0, `scrollWidth == 390` at 390, 0 dead in-page anchors, toggle persists.
Card links go to absolute `https://<x>.mdo3d.com` hosts (R-mdo3d-conv-1).

## 4. Rollback (only on a failed verify, then report to Bridge)
```bash
vercel rollback <PREV-deployment-url> --scope mdothrees-projects
```
Pre-deploy local QA (copy at ec11078): `~/latarence/coordination/evidence/2026-10-13/guidance/qa.json`.
