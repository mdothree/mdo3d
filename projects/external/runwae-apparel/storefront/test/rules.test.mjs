import './_cleanup.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { radiusErrors, templateRadiusErrors } from '../core/style-rules.mjs';
import { buildBrand, styleErrors, loadBrand, brandIds, ROOT } from '../core/build.mjs';
import { buildAdmin, buildEmailPreviews } from '../core/admin.mjs';
import { templateRoot } from './_fixtures.mjs';

test('small corners: radius <= 4px; 50% only on equal width/height circles; no pills', () => {
  assert.deepEqual(radiusErrors('.a{border-radius:4px}.b{border-radius:2px 0}.c{border-radius:0}'), []);
  assert.deepEqual(radiusErrors('.dot{width:16px;height:16px;border-radius:50%}'), []);
  assert.deepEqual(radiusErrors('.dot{width:16px;aspect-ratio:1;border-radius:50%}'), []);
  assert.match(radiusErrors('.pill{padding:8px 16px;border-radius:999px}').join(), /pill/);
  assert.match(radiusErrors('.card{border-radius:20px}').join(), /max 4px/);
  assert.match(radiusErrors('.oval{width:40px;height:20px;border-radius:50%}').join(), /50% only on equal/);
  assert.match(radiusErrors('@media (max-width:600px){.x{border-top-left-radius:.5rem}}').join(), /border-top-left-radius/);
  assert.match(templateRadiusErrors('<rect rx="12" width="20" height="20"/>').join(), /rounded corner/);
  assert.deepEqual(templateRadiusErrors('<rect x="10" y="10" width="80" height="80"/><ellipse rx="7.5" ry="17"/>'), []);
});

test('every brand stylesheet and template passes the small-corners check (the build enforces it)', () => {
  for (const id of brandIds()) assert.deepEqual(styleErrors(join(ROOT, 'brands', id)), [], id);
  assert.deepEqual(styleErrors(join(ROOT, 'brands', '_template')), []);
});

test('the build fails on a large radius', async () => {
  const { root } = templateRoot(ROOT, mkdtempSync(join(tmpdir(), 'sf-rad-')));
  const css = join(root, 'brands', 'demo', 'layout', 'styles.css');
  writeFileSync(css, `${readFileSync(css, 'utf8')}\n.chip{border-radius:999px}\n`);
  await assert.rejects(buildBrand('demo', join(root, 'out'), { root }), /style rules:[\s\S]*\.chip/);
});

test('footer-only interlinks: main site link in the footer for Butts Studios and Ridgefield; never in a header or nav', async () => {
  const want = { buttsstudios: ['Butts Studios', 'https://buttsstudios.com'], ridgefield: ['ridgefieldtech.com', 'https://ridgefieldtech.com'] };
  for (const id of brandIds()) {
    const { brand } = loadBrand(id);
    if (want[id]) assert.deepEqual([brand.main_site.label, brand.main_site.url], want[id]);
    else assert.equal(brand.main_site, undefined, `${id} is its own main site`);
    const out = mkdtempSync(join(tmpdir(), `sf-ml-${id}-`));
    await buildBrand(id, out, { now: new Date('2026-10-14') });
    for (const f of ['index.html', 'shop.html', 'story.html', 'cart.html', ...readdirSync(join(out, 'products')).map((x) => `products/${x}`)]) {
      const html = readFileSync(join(out, f), 'utf8');
      const head = html.slice(html.indexOf('<body'), html.indexOf('<main'));
      const main = html.slice(html.indexOf('<main'), html.lastIndexOf('<footer'));
      const foot = html.slice(html.lastIndexOf('<footer'));
      for (const dom of ['buttsstudios.com', 'ridgefieldtech.com', 'runwaeapparel.com', 'girlslovebutts.com']) {
        assert.doesNotMatch(head, new RegExp(`href="https?://(www\\.)?${dom.replace('.', '\\.')}`), `${id}/${f}: header links to ${dom}`);
        assert.doesNotMatch(main, new RegExp(`href="https?://(www\\.)?${dom.replace('.', '\\.')}`), `${id}/${f}: page body links to ${dom}`);
      }
      if (want[id]) assert.match(foot, new RegExp(`<p class="seed-mainsite"><a href="${want[id][1]}">${want[id][0]}</a></p>`), `${id}/${f}`);
      else assert.doesNotMatch(foot, /seed-mainsite/);
    }
  }
});

test('admin page: every SKU of all four shops, filters, counts, exports; never in a brand deploy build', async () => {
  const out = mkdtempSync(join(tmpdir(), 'sf-admin-'));
  const emails = buildEmailPreviews(ROOT, out);
  const r = buildAdmin(ROOT, out, { emails });
  assert.equal(r.errors, 0);
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(html, /noindex, nofollow/);
  for (const id of brandIds()) { assert.match(html, new RegExp(`data-brand="${id}"`)); assert.match(html, new RegExp(`emails/${id}-shop\\.html`)); }
  assert.match(html, /<select name="brand">/); assert.match(html, /<select name="status">/);
  assert.match(html, /Per shop/); assert.match(html, /Recent ledger movements/);
  assert.match(html, /href="stock\.csv" download/); assert.match(html, /href="ledger\.csv" download/);
  assert.ok(existsSync(join(out, 'stock.csv')) && existsSync(join(out, 'ledger.csv')) && existsSync(join(out, 'admin.js')));
  assert.doesNotMatch(html, / style="/);
  for (const m of readFileSync(join(out, 'admin.css'), 'utf8').matchAll(/border-radius:(\d+)px/g)) assert.ok(Number(m[1]) <= 4);
  // the deploy build: one brand into public/ never carries _admin
  const pub = mkdtempSync(join(tmpdir(), 'sf-pub-'));
  await buildBrand('glb', pub, { now: new Date('2026-10-14') });
  assert.ok(!existsSync(join(pub, '_admin')));
  await assert.rejects(buildBrand('_admin', pub), /not a shop/);
  assert.match(readFileSync(join(ROOT, '.vercelignore'), 'utf8'), /^dist\/$/m);
  assert.match(JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')).buildCommand, /--brand \$BRAND --out public/);
});
