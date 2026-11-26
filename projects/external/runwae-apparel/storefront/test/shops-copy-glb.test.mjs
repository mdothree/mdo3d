import './_cleanup.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBrand, loadBrand } from '../src/build.mjs';

// DECISIONS 2026-11-21 / 2026-11-26: shops carry a waitlist; no placeholder labels, no "coming soon", no "preview" banner,
// an explicit consent + unsubscribe line on every sign-up form. Build the shop and read every page.
const ID = 'glb';
const FORBIDDEN = /not open for orders|coming soon|class="seed-preview"|Images on this preview|planned for a future release|\bfree\b/i;
test(`${ID}: no placeholder labels; every sign-up form states consent and unsubscribe`, async () => {
  const out = mkdtempSync(join(tmpdir(), `sf-copy-${ID}-`));
  await buildBrand(ID, out, { now: new Date('2026-10-14T12:00:00Z'), env: {} });
  const base = loadBrand(ID).brand.base_path;
  const root = base ? join(out, base) : out;
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.html') ? [join(d, e.name)] : []));
  const files = walk(root);
  assert.ok(files.length > 5);
  let forms = 0;
  for (const f of files) {
    const html = readFileSync(f, 'utf8');
    assert.doesNotMatch(html, FORBIDDEN, `${f}: placeholder label`);
    for (const m of html.matchAll(/<form[^>]*data-notify[\s\S]*?<\/form>/g)) {
      forms += 1;
      assert.match(html, /agree to get email/, `${f}: consent line`);
      assert.match(html, /unsubscribe any time/i, `${f}: unsubscribe note`);
    }
  }
  assert.ok(forms > 0, 'at least one sign-up form');
});
