// Release states (Principal 2026-10-26, every shop): order / preorder / reserve / waitlist, reserve_limit with a
// server-side count, and the Butts Studios Collection 2027 pages that turn it on.
import './_cleanup.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { productView, releaseErrors, RELEASE_COPY } from '../core/catalog.mjs';
import { purchasable } from '../core/drop.mjs';
import notify, { listFor, fileStore, d1Store, D1_SCHEMA } from '../api/notify.mjs';
import { selectSignups } from '../tools/signups.mjs';
import { buildBrand, loadBrand, ROOT } from '../core/build.mjs';

const fakeRes = () => ({ statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } });
const item = (release, extra = {}) => ({ id: 'lamp', name: 'Lamp', status: 'next_drop', price_cents: 14000, sizes: [], colors: [], print: [], release, ...extra });
const tmp = () => mkdtempSync(join(tmpdir(), 'sf-release-'));

test('release spec validation', () => {
  assert.deepEqual(releaseErrors(item({ state: 'reserve', window: '2027' })), []);
  assert.match(releaseErrors(item({ state: 'follow', window: '2027' })).join(), /release.state/);
  assert.match(releaseErrors(item({ state: 'reserve' })).join(), /release.window/);
  assert.match(releaseErrors(item({ state: 'reserve', window: '2027', reserve_limit: 2.5 })).join(), /reserve_limit/);
  assert.deepEqual(releaseErrors({ id: 'plain' }), [], 'items without release are untouched');
});

test('view: reserve is free and never addable; waitlist shows its reason; labels come from brand copy', () => {
  const r = productView(item({ state: 'reserve', window: '2027' }), [], new Date(), {});
  assert.equal(r.canAdd, false); assert.equal(r.notify, true);
  assert.equal(r.release.state, 'reserve'); assert.equal(r.release.button, 'Reserve');
  assert.match(r.release.helper, /isn't an order and you won't be charged/);
  assert.equal(r.label, 'Reserve · planned for 2027');
  assert.equal(r.release.full, null, 'no limit: no waitlist switch');
  const w = productView(item({ state: 'waitlist', window: '2027' }), [], new Date(), { release: { waitlist: { button: 'Get on the list' } } });
  assert.equal(w.release.state, 'waitlist'); assert.equal(w.release.button, 'Get on the list');
  assert.equal(w.note, RELEASE_COPY.waitlist.reason, 'default reason shown');
  const why = productView(item({ state: 'waitlist', window: '2027', reason: 'Made in small batches; next batch spring 2027.' }), [], new Date(), {});
  assert.equal(why.note, 'Made in small batches; next batch spring 2027.');
  const lim = productView(item({ state: 'reserve', window: '2027', reserve_limit: 50 }), [], new Date(), {});
  assert.match(lim.release.full.helper, /^All 50 reservations are taken\. We'll email you/);
  assert.equal(lim.release.full.button, 'Join the waitlist');
});

test('view: pre-order and order only while checkout is open; otherwise waitlist (wired but off)', () => {
  const drops = [{ id: 'd', products: ['lamp'], window: { open: null, close: null } }];
  const pre = item({ state: 'preorder', window: '2027' }, { status: 'preorder' });
  assert.equal(productView(pre, drops, new Date(), { checkout: false }).release.state, 'waitlist');
  assert.equal(productView(pre, drops, new Date(), { checkout: false }).canAdd, false);
  const on = productView(pre, drops, new Date(), { checkout: true });
  assert.equal(on.release.state, 'preorder'); assert.equal(on.canAdd, true); assert.equal(on.label, 'Pre-order · ships 2027');
  const ord = item({ state: 'order', window: 'now' }, { status: 'available' });
  assert.equal(productView(ord, [], new Date(), { checkout: false }).release.state, 'waitlist');
  assert.equal(productView(ord, [], new Date(), { checkout: true }).release.state, 'order');
  // Server side: a reserve/waitlist item can't be bought whatever the inventory says.
  assert.equal(purchasable({ ...item({ state: 'reserve', window: '2027' }), status: 'available' }, []).ok, false);
});

test('listFor: under limit -> reserve; at limit -> waitlist (full); unset limit -> unlimited; waitlist state', () => {
  const r = { state: 'reserve', window: '2027', reserve_limit: 2 };
  assert.deepEqual(listFor(r, 0), { list: 'reserve', reason: '' });
  assert.deepEqual(listFor(r, 1), { list: 'reserve', reason: '' });
  assert.deepEqual(listFor(r, 2), { list: 'waitlist', reason: 'full' });
  assert.deepEqual(listFor({ state: 'reserve', window: '2027' }, 1e6), { list: 'reserve', reason: '' });
  assert.deepEqual(listFor({ state: 'waitlist', window: '2027' }, 0), { list: 'waitlist', reason: 'not_accepting' });
  assert.deepEqual(listFor({ state: 'preorder', window: '2027' }, 0).list, 'waitlist');
  assert.deepEqual(listFor(null), { list: 'notify', reason: '' });
});

test('file store: the last slot goes to one person when two sign up at once; order and dedupe kept', async () => {
  const s = fileStore(join(tmp(), 'n.jsonl'));
  const rel = { state: 'reserve', window: '2027', reserve_limit: 1 };
  const rec = (email, at) => ({ at, brand: 'demo', product: 'lamp', email });
  const [a, b] = await Promise.all([s.add(rec('a@x.co', '2026-10-26T00:00:00Z'), rel), s.add(rec('b@x.co', '2026-10-26T00:00:01Z'), rel)]);
  assert.deepEqual([a.list, b.list].sort(), ['reserve', 'waitlist']);
  assert.equal(await s.reserved('demo', 'lamp'), 1);
  const again = await s.add(rec('a@x.co', '2026-10-26T00:00:05Z'), rel);
  assert.equal(again.created, false, 'same email twice keeps its first place');
  const rows = await s.all();
  assert.deepEqual(rows.map((r) => r.seq), [1, 2]);
  assert.deepEqual(selectSignups(rows, { list: 'waitlist' }).map((r) => r.email), [b.list === 'waitlist' ? 'b@x.co' : 'a@x.co']);
});

// D1 store against a real SQLite (node:sqlite) behind a fake REST endpoint: proves the one-statement insert.
async function sqliteFetch() {
  let sqlite;
  try { sqlite = await import('node:sqlite'); } catch { return null; }
  const db = new sqlite.DatabaseSync(':memory:');
  let busy = Promise.resolve(); // D1 runs one query at a time per database
  return async (_url, { body }) => {
    const { sql, params } = JSON.parse(body);
    const run = busy.then(() => {
      const st = db.prepare(sql);
      const results = /^\s*select/i.test(sql) ? st.all(...params) : (st.run(...params), []);
      return { ok: true, status: 200, json: async () => ({ success: true, result: [{ results }] }) };
    });
    busy = run.catch(() => {});
    return run;
  };
}

test('d1 store: one SQL statement per sign-up; the race on the last slot leaves exactly one reservation', async (t) => {
  const fetchImpl = await sqliteFetch();
  if (!fetchImpl) return t.skip('node:sqlite not available on this Node');
  const s = d1Store({ account: 'acc', database: 'db', token: 'tok', fetchImpl });
  const rel = { state: 'reserve', window: '2027', reserve_limit: 2 };
  const rec = (i) => ({ at: `2026-10-26T00:00:0${i}Z`, brand: 'demo', product: 'lamp', email: `p${i}@x.co` });
  const out = await Promise.all([1, 2, 3, 4].map((i) => s.add(rec(i), rel)));
  assert.equal(out.filter((o) => o.list === 'reserve').length, 2);
  assert.equal(out.filter((o) => o.list === 'waitlist' && o.reason === 'full').length, 2);
  assert.equal(await s.reserved('demo', 'lamp'), 2);
  const unl = await s.add({ ...rec(5), product: 'stool' }, { state: 'reserve', window: '2027' });
  assert.equal(unl.list, 'reserve', 'unset limit: unlimited');
  const all = await s.all();
  assert.deepEqual(all.map((r) => r.seq), [1, 2, 3, 4, 5], 'arrival order kept');
  assert.match(D1_SCHEMA, /UNIQUE \(brand, product, email\)/);
});

test('api: GET says which list a sign-up would join; POST files it server-side', async () => {
  const root = tmp();
  mkdirSync(join(root, 'brands', 'demo'), { recursive: true });
  writeFileSync(join(root, 'brands', 'demo', 'catalog.json'), JSON.stringify({ products: [{ id: 'lamp', release: { state: 'reserve', window: '2027', reserve_limit: 1 } }] }));
  const saved = process.env.STOREFRONT_ROOT;
  process.env.STOREFRONT_ROOT = root;
  try {
    const store = fileStore(join(root, 'n.jsonl'));
    let res = fakeRes();
    await notify({ method: 'GET', url: '/api/notify?brand=demo&product=lamp' }, res, { store });
    assert.equal(JSON.parse(res.body).list, 'reserve');
    res = fakeRes();
    await notify({ method: 'POST', body: JSON.stringify({ brand: 'demo', product: 'lamp', list: 'waitlist', email: 'a@x.co' }) }, res, { store });
    assert.equal(JSON.parse(res.body).list, 'reserve', 'the client cannot pick its list');
    res = fakeRes();
    await notify({ method: 'GET', url: '/api/notify?brand=demo&product=lamp' }, res, { store });
    assert.deepEqual(JSON.parse(res.body), { list: 'waitlist', reason: 'full' });
    assert.doesNotMatch(res.body, /a@x\.co|reserved/, 'no emails or counts in the public answer');
    res = fakeRes();
    await notify({ method: 'GET', url: '/api/notify' }, res, { store });
    assert.equal(res.statusCode, 400);
  } finally {
    if (saved === undefined) delete process.env.STOREFRONT_ROOT; else process.env.STOREFRONT_ROOT = saved;
  }
});

test('buttsstudios: Collection 2027 landing + product pages, waitlist forms, no add to bag, copy from brand.json', async () => {
  const out = join(tmp(), 'bs');
  await buildBrand('buttsstudios', out, { env: {} });
  const shop = join(out, 'shop');
  const brand = JSON.parse(readFileSync(join(ROOT, 'brands', 'buttsstudios', 'brand.json'), 'utf8'));
  const cat = JSON.parse(readFileSync(join(ROOT, 'brands', 'buttsstudios', 'catalog.json'), 'utf8')).products.filter((p) => p.collection === '2027');
  assert.ok(cat.length >= 8);
  const land = readFileSync(join(shop, 'collection-2027.html'), 'utf8');
  const priced = new Set(loadBrand('buttsstudios').catalog.filter((p) => p.collection === '2027' && Number.isInteger(p.price_cents)).map((p) => p.id));
  assert.ok(priced.size >= 9);
  for (const p of cat) {
    assert.match(land, new RegExp(`products/${p.id}\\.html`));
    const html = readFileSync(join(shop, 'products', `${p.id}.html`), 'utf8');
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    assert.doesNotMatch(main, /data-add /, `${p.id}: nothing addable`);
    assert.match(main, /data-notify/, `${p.id}: sign-up form`);
    assert.match(main, new RegExp(brand.release_states.waitlist.button), `${p.id}: waitlist button from brand.json`);
    assert.match(main, /Concept render/, `${p.id}: renders captioned`);
    assert.doesNotMatch(main, /sketch|Design study/i, `${p.id}: no process sketches on the site`);
    assert.ok(priced.has(p.id), `${p.id}: priced`);
    assert.match(main, /\$\d+\.00 · planned price/, `${p.id}: planned price`);
    assert.doesNotMatch(`${p.name} ${p.id} ${main}`, /nexus|\bsoft (lamp|power|backup)\b/i, `${p.id}: no NEXUS/Soft names`);
    assert.doesNotMatch(main, /Notify me|Follow this piece|limited|few left|\.99/i, `${p.id}: copy rules`);
    assert.match(main, /Details coming/, `${p.id}: no invented specs`);
  }
  const head = readFileSync(join(shop, 'index.html'), 'utf8');
  assert.match(head.slice(0, head.indexOf('<main')), />Apparel<\/a>.*>Collection 2027<\/a>/s, 'nav splits Apparel / Collection 2027');
  const data = JSON.parse(readFileSync(join(shop, 'catalog.js'), 'utf8').replace(/^window\.SEED = /, '').replace(/;\s*$/, ''));
  assert.equal(Object.values(data.products).filter((p) => p.canAdd).length, 0);
  assert.match(data.products['table-lamp'].image, /c27-table-lamp-product-640\.webp$/);
});
