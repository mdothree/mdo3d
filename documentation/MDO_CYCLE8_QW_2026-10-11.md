# MDO cycle-8 quick wins: QW1, QW3, QW4 (2026-10-11)

These are no-decision quick wins from `MDO_CYCLE8_TRIAGE_2026-10-11.md` §2.

**Status:** all three are committed and pushed. Nothing is deployed; deploys wait on the Principal's GO.

**Verify on GO:**
- QW1: `bash ~/mdo3d/MDO_DEPLOY_CYCLE5_2026-10-08.sh mdothree`. The group now includes `image` and adds C7-009 checks.
- QW3 and QW4: the new group `c8qw`. It is deliberately left out of `all`. `bash -n` is clean.

| QW | HQ ID | State | SHA (repo) | Verify |
|---|---|---|---|---|
| QW1 | C7-009 TOOLSITES-NO-LEGAL-OR-CONTACT-LINK (P2) | pushed, needs-deploy (GO) | json `cd57ed0` (mdo3d) · text `cb7574f` · pdf `6bc6d71` · image `0663366` · qr `c0c0f21` · color `c534c99` · hash `956e71f` · password `7eaf404` · timestamp `143dca8` | See [QW1 verification](#qw1-verification) |
| QW3 | C7-010 DIVINATION-NO-ENTERTAINMENT-DISCLAIMER (P2) | pushed, needs-deploy (GO); guidance held on S9 | tarot + numerology + submodule pointers `c20a696` (mdo3d) · astrology `504c69b` · iching `1bd94d3` · runes `79ae59c` · feng-shui-analyzer `678f6c3` · past-life-insights `afa29fd` · baby-name-oracle `0923e37` | See [QW3 verification](#qw3-verification) |
| QW4 | C7-002 (P2), C7-003, C7-016, C7-017 (P3) | pushed, needs-deploy (GO) | `4f5fd91` (mdo3d) | See [QW4 verification](#qw4-verification) |

### QW1 verification

- **Test:** xps Playwright at 375 px, dark and light, on text, json, pdf, color and password.
- **Result:** all 3 links are present and visible, with no horizontal scroll.
- **Contrast:**
  - dark sites: 6.31:1 (text/json) and 7.87:1 (pdf), both on slate-950
  - light mode of the dark sites: 7.24:1
  - firebase-4 sites: 9.4:1 on white
- **Post-deploy check:** `g_mdothree` checks that each of the 9 hosts has all 3 hrefs.

### QW3 verification

- **Test:** xps Playwright on tarot, numerology and runes.
- **Result:** the disclaimer is visible on all three. Contrast is 17.7:1, 7.4:1 and 7.9:1.
- **TSX check:** the 3 edited TSX files parse cleanly with esbuild. Their node_modules are not installed locally, so `next build` was not run.
- **Post-deploy check:** `g_c8qw` greps all 8 hosts.

### QW4 verification

- **Test:** a local node http test with 9 cases on each of the 9 APIs. 81 of 81 passed.
- **No live Stripe calls:** the tests ran from a scratch copy with `.env` not loaded.
- **Post-deploy check:** `g_c8qw` runs curl checks against the 4 known API hosts.

## QW1: footer legal and contact links (C7-009)

**Markup.** The same markup is used on all 9 tools:

```html
<nav class="footer-links footer-legal" aria-label="Legal and contact">
  <a href="https://mdothree.com/terms">Terms</a> · <a href="https://mdothree.com/privacy">Privacy</a> · <a href="mailto:hello@mdothree.com">Contact</a>
</nav>
```

**json, text, pdf, image, qr**
- The nav goes inside the existing `.footer-inner`, before `.footer-copy`, on every page that has a footer. That includes the 404, account and pricing pages.
- It uses the existing `.footer-links` styling, so no CSS changed.
- `sw.js` CACHE_NAME was bumped from `mdothree-v6` to `mdothree-v7`, because `/index.html` and `/404.html` are precached.

**color, hash, password, timestamp**
- These pages had **no footer at all**.
- A `<footer class="tool-main footer-legal">` was added after `</main>` on every tool page. That is 26 pages.
- Only HTML changed, per the concurrent-agent rule: no CSS, no JS, no `sw.js`.
- The CSP sets `style-src 'self'`, so inline styles are not allowed. The links therefore use the browser's default link colour, which is 9.4:1 on white.
- `sw.js` was not bumped. HTML is served network-first there, and the agent doing the concurrent Firebase work owns those repos' `sw.js`/JS.
- The 404 pages have no footer and were left unchanged.
- **Follow-up (cosmetic):** add a `.footer-legal` rule (centred, muted) to those 4 `styles.css` files once the Firebase work lands.

## QW3: entertainment disclaimer (C7-010)

**Wording.** The text is copied verbatim from the live oracle-cards footer: "For entertainment and reflection purposes."
- No copy reading "For entertainment purposes only…" exists in dreams or oracle. Dreams uses "For reflection and entertainment."
- No new wording was written. If the Principal wants the stronger "only" wording, it is a one-string change.

**Placement**

| Sites | Where the disclaimer went |
|---|---|
| tarot, astrology, iching, runes | Appended to the `© … All rights reserved.` line in `public/index.html` |
| numerology | Appended to `© 2026 BlackLabb Technologies.` |
| fengshui, pastlife (Next.js) | A new `<p>` in the `app/page.tsx` footer. The legacy `public/index.html` copyright line was updated too. |
| names (baby-name-oracle, Next.js) | `app/page.tsx` had no footer, so one was added (`#666` on white, 5.7:1). The legacy `public/index.html` was updated too. |

**Repos**
- Astrology, iching, runes, fengshui and pastlife are submodules. The main-repo pointer bump is in `c20a696`.
- `baby-name-oracle` is a gitignored standalone repo, so there is no pointer to bump.
- Guidance is skipped because it waits on S9.

## QW4: divination API JSON errors (C7-002/003/016/017)

**New file.** `src/httpErrors.js` is an identical copy in every API, because each API is its own Vercel project. It provides:
- **`notFoundOrMethodNotAllowed(app)`:** an unmatched path returns **405** with an `Allow` header when the path exists under another method. Otherwise it returns **404**. Both return `{success:false,error}`.
- **`jsonErrorHandler`:**
  - `entity.parse.failed` returns **400** "Malformed JSON in request body".
  - `entity.too.large` returns **413** "Request body too large". This applies to the default 100 kb `express.json` limit and to the webhook's `express.raw` limit.
  - Other 4xx statuses are kept, using http-errors' exposed message.
  - 5xx returns a generic "Internal server error". This replaces the old handler, which echoed `error.message` with a 500.

**Scope**
- It is applied to all **9** `projects/divination/*/api` servers: HQ's 7 plus fengshui and pastlives, which had identical code and the same defect.
- In each server it replaces the old `// Error handling` block, after every route.

**Stripe webhook**
- The raw-body path for `/api/webhook/stripe` is unchanged. The `jsonParser` skip and the route-level `express.raw` stay as they were.
- Iching uses the same ordering pattern as the other APIs.
- Verified: malformed JSON sent to the webhook still reaches the Stripe handler as a Buffer and gets the signature error, not the parse 400.

**Health ping (C7-016).** In `tarot/tarot-cards` and `dreams/dream-interpreter` `public/js/config/api.js`, `checkHealth()` now requests `/api/health` instead of `/health`.

**Local test cases** (each API, scratch copy, no `.env`, no Stripe session created):

| Request | Result |
|---|---|
| GET /api/health | 200 |
| POST /api/health | 405, `Allow: GET, HEAD, OPTIONS` |
| GET /api/payment/verify | 405, `Allow: POST, OPTIONS` |
| GET /api/nope | 404 JSON |
| POST verify with bad JSON | 400 JSON |
| POST verify with a 200 KB body | 413 JSON |
| POST verify with `{}` | 400 "Session ID is required" (the route is reached) |
| POST webhook with bad JSON | still reaches the Stripe handler (raw) |
| POST webhook with a 200 KB body | 413 JSON |

**Note on 404s outside `/api`.** Vercel `routes` only send `/api/(.*)` to the server. Non-`/api` paths on the API hosts keep Vercel's own 404.

**Not changed (C7-017 shape).** Webhook routes keep their `{error}`/`{received}` bodies, because Stripe and stripe-hub consume them.
