# mdothree.com landing

Static hub site for mdothree.com (`public/`), deployed on Vercel with the CLI. `vercel.json` sets
`buildCommand: npm run build` and `outputDirectory: public`.

## Build

`npm run build` runs two in-place steps over `public/`:

1. `scripts/inject-config.js` writes the Firebase and Stripe meta config from env (see the header of that file).
2. `scripts/stamp-versions.mjs` busts the asset cache (below).

`npm run check` runs `scripts/check-imports.mjs public/js` (ES module syntax and named imports) and
`stamp-versions.mjs --check`.

## Asset cache-busting (`?v=`)

`/js/*` and `/css/*` go out with `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`, and
Cloudflare caches them at the edge. A deploy that changes a file under the same URL keeps serving the old copy
(cf-cache-status HIT) for up to a day. Every same-origin script or stylesheet URL therefore carries `?v=<build id>`:

- **Build id:** the first 10 hex characters of a sha256 over every `public/js/**/*.js` and `public/css/**/*.css`
  (path and content, with existing `?v=` stripped). It's the same format as the sibling MDO sites
  (layoffleads, promptsforbusiness). It changes only when an asset changes, and re-running the script with no
  changes is a no-op.
- **One id for the whole site:** the JS files are ES modules that import each other. A module loaded under two
  different URLs runs twice, which would give two Firebase/auth singletons. A shared id keeps
  `/js/auth-nav.js?v=X` in the HTML and `import('../auth-nav.js?v=X')` in `pro.js` as one module.
- **What gets rewritten:** `<script src>` and `<link rel="stylesheet" href>` in every `public/**/*.html`;
  relative import specifiers (`from`, bare `import`, dynamic `import()`) in `public/js/**/*.js`; and in
  `public/sw.js`, `CACHE_NAME` (`landing-v-<id>`, so `activate` drops old caches) and the precache URLs.
- **CSP:** only URLs change. Inline `<script>` bodies are never touched, so the `sha256-` hashes in `vercel.json`
  stay valid. If you edit an inline script, recompute its hash yourself.

The stamped output is committed, and Vercel re-stamps on every build. After editing any JS or CSS, run
`npm run stamp` (or `npm run build`) and commit the result, so the repo and `npm run check` stay consistent.
Use relative or root-absolute paths for new local scripts, styles and imports; the stamper picks them up
automatically.
