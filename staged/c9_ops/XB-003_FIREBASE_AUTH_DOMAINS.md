# XB-003 (P2) — Firebase Authorized domains for dreams / tarot / color / hash

Operator step (admin-UI only; Principal token). No code change needed. Prepared 2026-10-12 (C9).

## Evidence (measured 2026-10-12 ~03:30Z)
Live web config (served JS/HTML) vs Firebase public `getProjectConfig` (identitytoolkit v3, web apiKey from the repo):

| Host (live 200) | Repo / file | Firebase projectId | Currently authorized |
|---|---|---|---|
| dreams.mdo3d.com | mdothree/dream-interpreter `public/js/config/firebase.js` | `oracle-mdo3d` | localhost, oracle-mdo3d.firebaseapp.com, oracle-mdo3d.web.app |
| tarot.mdo3d.com | mdothree/tarot-cards `public/js/config/firebase.js` | `oracle-mdo3d` | (same) |
| color.mdothree.com | mdothree/mdothree-color `public/*.html` meta `firebase-config` | `mdo3d-utilities` | localhost, mdo3d-utilities.firebaseapp.com, mdo3d-utilities.web.app |
| hash.mdothree.com | mdothree/mdothree-hash `public/*.html` meta `firebase-config` | `mdo3d-utilities` | (same) |

=> No custom domain is authorized on either project, so Google/email-link sign-in popups fail with
`auth/unauthorized-domain` on every production host. The same two projects back the other divination
and mdothree tool hosts, so add them in the same pass.

## Checklist (sign in as mdothree@gmail.com)

### 1. Project `oracle-mdo3d`
URL: https://console.firebase.google.com/project/oracle-mdo3d/authentication/settings  → "Authorized domains" → Add domain, one at a time:
- [ ] dreams.mdo3d.com
- [ ] tarot.mdo3d.com
- [ ] dream-interpreter.vercel.app   (Vercel alias, live 200)
- [ ] tarot-cards.vercel.app          (Vercel alias, live 200)
- [ ] mdo3d.com
- Same project, other live divination hosts (recommended, same pass):
  - [ ] astrology.mdo3d.com  [ ] fengshui.mdo3d.com  [ ] iching.mdo3d.com  [ ] numerology.mdo3d.com
  - [ ] oracle.mdo3d.com     [ ] pastlife.mdo3d.com  [ ] runes.mdo3d.com

### 2. Project `mdo3d-utilities`
URL: https://console.firebase.google.com/project/mdo3d-utilities/authentication/settings  → "Authorized domains" → Add domain:
- [ ] color.mdothree.com
- [ ] hash.mdothree.com
- [ ] mdothree-color.vercel.app   (Vercel alias, live 200)
- [ ] mdothree-hash.vercel.app    (Vercel alias, live 200)
- [ ] mdothree.com
- [ ] www.mdothree.com
- Same project, other tool hosts (recommended, same pass):
  - [ ] image.mdothree.com [ ] json.mdothree.com [ ] password.mdothree.com [ ] pdf.mdothree.com
  - [ ] qr.mdothree.com [ ] text.mdothree.com [ ] timestamp.mdothree.com

Notes: Authorized domains match exact host (no wildcards); subdomains must each be listed. Do not add
`*.vercel.app` preview hosts generally (any Vercel user could host there); only the project's own aliases above.

## Verify (read-only, run after the console change; key read from repo, never printed)
```bash
cd ~/mdo3d/projects
K1=$(grep -oE 'apiKey: *"[^"]+"' divination/dreams/dream-interpreter/public/js/config/firebase.js | cut -d'"' -f2)
K2=$(grep -oE '"apiKey":"[^"]+"' mdothree/mdothree-hash/public/index.html | head -1 | cut -d'"' -f4)
check "XB-003 oracle-mdo3d"    "curl -s 'https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=$K1'" "dreams.mdo3d.com"   # also expect tarot.mdo3d.com
check "XB-003 mdo3d-utilities" "curl -s 'https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=$K2'" "color.mdothree.com" # also expect hash.mdothree.com
```
Rollback: remove the added domains in the same console page.
