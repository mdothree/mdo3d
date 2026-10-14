#!/usr/bin/env node
// scripts/stamp-versions.mjs: cache-busting for mdothree.com.
//
// Cloudflare and browsers cache /js/* and /css/* for a day (+7 days stale-while-revalidate, vercel.json), so a
// deploy that changes a file under the same URL keeps serving the old copy from the edge. This script gives every
// same-origin asset URL a `?v=<build id>` so each deploy that changes an asset is a new URL.
//
// Format follows the sibling MDO sites (layoffleads / promptsforbusiness build.mjs): ?v= first 10 hex of sha256.
// One site-wide build id (not one per file) on purpose: the JS files are ES modules that import each other, and a
// module loaded under two different URLs runs twice (two Firebase/auth singletons). With one id, pro.html's
// /js/auth-nav.js?v=X and pro.js's import('../auth-nav.js?v=X') are the same module.
//
// Build id = sha256 over every public/js/**/*.js and public/css/**/*.css (path + content, existing ?v= stripped),
// so it changes exactly when an asset changes and re-running is idempotent.
//
// Rewrites (only URLs, never inline <script> bodies, so the CSP sha256 hashes in vercel.json stay valid):
//   public/**/*.html   <script src> and <link rel="stylesheet" href> pointing at same-origin .js/.css
//   public/js/**/*.js  relative/absolute import specifiers: `from '...'`, `import '...'`, `import('...')`
//   public/sw.js       CACHE_NAME (landing-v-<id>) and the /js, /css PRECACHE_URLS entries
//
// Runs in `npm run build` (vercel.json buildCommand) after inject-config.js, so every deploy is stamped.
// Usage: node scripts/stamp-versions.mjs          stamp in place
//        node scripts/stamp-versions.mjs --check  exit 1 if anything is unstamped or stale (no writes)
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const CHECK = process.argv.includes('--check');
const PUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const VQ = /\?v=[0-9a-f]+/g;

function walk(d, ext, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, ext, out);
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}
const rel = (p) => path.relative(PUB, p).split(path.sep).join('/');

const jsFiles = walk(path.join(PUB, 'js'), '.js');
const cssFiles = walk(path.join(PUB, 'css'), '.css');
const assets = [...jsFiles, ...cssFiles].sort((a, b) => rel(a).localeCompare(rel(b)));

const h = createHash('sha256');
for (const f of assets) h.update(rel(f) + '\0' + fs.readFileSync(f, 'utf8').replace(VQ, '') + '\0');
const V = h.digest('hex').slice(0, 10);

// Same-origin .js/.css URL (relative or root-absolute; not http:, https:, //, data:) -> stamped with ?v=V.
const isLocal = (u) => !/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(u);
const stamp = (u) => {
  const [base, hash = ''] = u.split('#');
  const clean = base.replace(VQ, '').replace(/\?$/, '');
  if (!isLocal(clean) || !/\.(m?js|css)$/.test(clean.split('?')[0])) return u;
  return clean + (clean.includes('?') ? '&' : '?') + 'v=' + V + (hash ? '#' + hash : '');
};

let changed = 0;
const stale = [];
function write(file, before, after) {
  if (before === after) return;
  if (CHECK) { stale.push(rel(file)); return; }
  fs.writeFileSync(file, after, 'utf8');
  changed++;
  console.log(`[stamp-versions] ✓ ${rel(file)}`);
}

// HTML: only the src/href attribute of the opening tag changes.
for (const f of walk(PUB, '.html')) {
  const src = fs.readFileSync(f, 'utf8');
  let out = src.replace(/<script\b[^>]*>/gi, (tag) =>
    tag.replace(/(\bsrc\s*=\s*)(["'])([^"']*)\2/i, (m, a, q, u) => a + q + stamp(u) + q));
  out = out.replace(/<link\b[^>]*>/gi, (tag) =>
    /\brel\s*=\s*["']?stylesheet\b/i.test(tag)
      ? tag.replace(/(\bhref\s*=\s*)(["'])([^"']*)\2/i, (m, a, q, u) => a + q + stamp(u) + q)
      : tag);
  write(f, src, out);
}

// JS modules: import specifiers.
for (const f of jsFiles) {
  const src = fs.readFileSync(f, 'utf8');
  const spec = (m, pre, q, u) => pre + q + (/^(\.{1,2}\/|\/)/.test(u) ? stamp(u) : u) + q;
  const out = src
    .replace(/(\bfrom\s*)(['"])([^'"]+)\2/g, spec)
    .replace(/(\bimport\s*)(['"])([^'"]+)\2/g, spec)
    .replace(/(\bimport\s*\(\s*)(['"])([^'"]+)\2/g, spec);
  write(f, src, out);
}

// Service worker: new cache per build id (activate() drops every other '-v' cache) and versioned precache URLs.
const swFile = path.join(PUB, 'sw.js');
if (fs.existsSync(swFile)) {
  const src = fs.readFileSync(swFile, 'utf8');
  const out = src
    .replace(/(const CACHE_NAME\s*=\s*)(['"])[^'"]*\2/, `$1$2landing-v-${V}$2`)
    .replace(/(['"])(\/(?:js|css)\/[^'"]+)\1/g, (m, q, u) => q + stamp(u) + q);
  write(swFile, src, out);
}

if (CHECK) {
  if (stale.length) { console.log(`[stamp-versions] STALE (build id ${V}): ${stale.join(', ')}`); process.exit(1); }
  console.log(`[stamp-versions] OK: all asset URLs carry ?v=${V}`);
} else {
  console.log(`[stamp-versions] Done: build id ${V}, ${changed} file(s) updated.`);
}
