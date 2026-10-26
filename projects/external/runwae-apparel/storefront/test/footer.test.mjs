// Shop footers mirror their main site's footer (brand.json `footer`, Principal 2026-10-26).
import './_cleanup.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBrand, loadBrand } from '../core/build.mjs';
import { createKit } from '../core/kit.mjs';

const footOf = async (id, page = 'index.html') => {
  const out = join(mkdtempSync(join(tmpdir(), 'sf-foot-')), id);
  await buildBrand(id, out, { env: {} });
  const base = loadBrand(id).brand.base_path ? join(out, ...loadBrand(id).brand.base_path.split('/').filter(Boolean)) : out;
  const html = readFileSync(join(base, page), 'utf8');
  return html.slice(html.lastIndexOf('<footer'));
};
const titles = (foot) => [...foot.matchAll(/<p class="seed-foot-h">([^<]+)</g)].map((m) => m[1]);

test('buttsstudios footer: Work / Studio / Shop / Contact like buttsstudios.com, shop links stay in the shop', async () => {
  for (const page of ['index.html', 'collection-2027.html', 'products/table-lamp.html']) {
    const foot = await footOf('buttsstudios', page);
    assert.deepEqual(titles(foot), ['Work', 'Studio', 'Shop', 'Contact'], page);
    for (const u of ['slate', 'books', 'video', 'games', 'how-we-work', 'partnerships', 'portfolio']) assert.match(foot, new RegExp(`href="https://buttsstudios\\.com/${u}\\.html"`), u);
    assert.match(foot, /href="\/shop\/shop\.html">Apparel</);
    assert.match(foot, /href="\/shop\/collection-2027\.html">Collection 2027</);
    assert.match(foot, /href="\/shop\/shipping\.html">Shipping</);
    assert.match(foot, /href="\/shop\/returns\.html">Returns</);
    assert.match(foot, /Made of story\. Since 2018\./);
    assert.match(foot, /target="_blank" rel="noopener">Instagram</);
    assert.match(foot, /<div class="bs-wrap seed-foot-legal"><p class="seed-mainsite">.*<nav class="seed-legal" aria-label="Policies">.*<\/nav><!--seed-legal--><\/div><\/footer>/s, 'main-site + policy links inside the footer wrap');
  }
});

test('ridgefield footer: Solutions / Process / Company / Shop / Connect like ridgefieldtech.com', async () => {
  const foot = await footOf('ridgefield');
  assert.deepEqual(titles(foot), ['Solutions', 'Process', 'Company', 'Shop', 'Connect']);
  assert.match(foot, /href="https:\/\/ridgefieldtech\.com\/solutions-hardware\.html"/);
  assert.match(foot, /href="https:\/\/ridgefieldtech\.com\/services\.html#assessment"/);
  assert.match(foot, /href="\/shop\/shop\.html">Capsule 01</);
  assert.match(foot, /Systems That Perform/);
  assert.doesNotMatch(foot, /—/, 'Ridgefield voice: no em dashes');
});

test('brands without footer config keep their own footer', async () => {
  for (const id of ['runwae', 'glb']) {
    assert.equal(loadBrand(id).brand.footer, undefined, id);
    assert.doesNotMatch(await footOf(id), /seed-foot-grid/, id);
  }
});

test('footer config: an unknown shop page fails the build', () => {
  const kit = createKit({ brand: { name: 'X', footer: { columns: [{ title: 'Shop', links: [{ label: 'Nope', shop: 'nowhere' }] }] } } });
  assert.throws(() => kit.configFooter(), /unknown shop page/);
});
