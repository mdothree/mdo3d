import './_cleanup.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBrand, buildHolding, brandIds, loadBrand, ROOT } from '../src/build.mjs';
import { templateRoot } from './_fixtures.mjs';

const BRANDS = ['buttsstudios', 'glb', 'ridgefield', 'runwae'];
const NOW = new Date('2026-10-14T12:00:00Z');
const built = {};
async function build(id) {
  if (!built[id]) { const out = mkdtempSync(join(tmpdir(), `sf-${id}-`)); await buildBrand(id, out, { now: NOW, env: {} }); built[id] = out; }
  return built[id];
}
const pagesOf = (out) => [...(existsSync(join(out, 'drawn-series.html')) ? ['drawn-series.html'] : []), 'index.html', 'shop.html', 'story.html', 'cart.html', 'orders.html', 'policies.html', 'thanks.html', ...readdirSync(join(out, 'products')).map((f) => `products/${f}`)];

test('brandIds: the four shops, never _template', () => {
  assert.deepEqual(brandIds(), BRANDS);
});

for (const id of BRANDS) {
  test(`${id}: preview build is noindex, has every page, checkout off, CSP-safe markup`, async () => {
    const out = await build(id);
    const { catalog } = loadBrand(id);
    assert.match(readFileSync(join(out, 'robots.txt'), 'utf8'), /Disallow: \//);
    for (const p of catalog.filter((x) => x.listed !== false)) assert.ok(existsSync(join(out, 'products', `${p.id}.html`)), p.id);
    const data = readFileSync(join(out, 'catalog.js'), 'utf8');
    assert.match(data, /"checkout":false/);
    for (const f of pagesOf(out)) {
      const html = readFileSync(join(out, f), 'utf8');
      assert.match(html, /<meta name="robots" content="noindex, nofollow">/, f);
      assert.equal((html.match(/name="viewport"/g) ?? []).length, 1, f);
      assert.match(html, /<link rel="canonical" href="https:\/\//, f);
      assert.doesNotMatch(html, / style="/, `${f}: inline style breaks CSP`);
      assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/, `${f}: inline script breaks CSP`);
      assert.match(html, /class="seed-skip" href="#main"/, f);
      assert.match(html, /data-menu-toggle/, `${f}: phone menu`);
      assert.match(html, /<main id="main"/, f);
      for (const m of html.matchAll(/<img [^>]*>/g)) assert.match(m[0], / alt="/, `${f}: img without alt`);
      for (const m of html.matchAll(/(?:src|href)="((?:\.\.\/)?(?:assets|products)\/[^"#?]+)"/g)) {
        const target = join(out, f.includes('/') ? 'products' : '', m[1]);
        assert.ok(existsSync(target), `${f} -> ${m[1]} missing`);
      }
    }
    const cart = readFileSync(join(out, 'cart.html'), 'utf8');
    assert.match(cart, /data-checkout disabled/);
    assert.match(readFileSync(join(out, 'orders.html'), 'utf8'), /data-lookup/);
    assert.match(readFileSync(join(out, 'policies.html'), 'utf8'), /ships together when its latest item is ready/);
  });

  test(`${id}: exactly one focus item can be added to the bag; the rest show their state`, async () => {
    const out = await build(id);
    const data = JSON.parse(readFileSync(join(out, 'catalog.js'), 'utf8').replace(/^window\.SEED = /, '').replace(/;\s*$/, ''));
    const addable = Object.entries(data.products).filter(([, p]) => p.canAdd);
    assert.equal(addable.length, 1, `${id}: one focus item`);
    const [fid, fp] = addable[0];
    assert.ok(['preorder', 'available'].includes(fp.status));
    assert.equal(fp.price_cents, null, 'Price TBA until the Principal sets it');
    const pdp = readFileSync(join(out, 'products', `${fid}.html`), 'utf8');
    assert.match(pdp, /data-add data-product="/);
    assert.match(pdp, /Price TBA/);
    for (const [pid, p] of Object.entries(data.products).filter(([, x]) => !x.canAdd)) {
      const html = readFileSync(join(out, 'products', `${pid}.html`), 'utf8');
      assert.doesNotMatch(html, /data-add /, pid);
      if (p.status === 'next_drop') assert.match(html, /data-notify/, pid);
      if (p.status === 'in_development') assert.match(html, /Concept · not yet available/, pid);
    }
  });

  test(`${id}: no banned products, phrases or internal names in the output`, async () => {
    const out = await build(id);
    const all = pagesOf(out).map((f) => readFileSync(join(out, f), 'utf8')).join('\n') + readFileSync(join(out, 'catalog.js'), 'utf8');
    assert.doesNotMatch(all, /poison|pave/i);
    assert.doesNotMatch(all, /digital only|long game|what['’]s next|higher ground|more than apparel/i);
    assert.doesNotMatch(all, /\bAHL\b|Anne Huntington/);
    if (id !== 'glb') assert.doesNotMatch(all, /\btote\b|dad hat|ball cap|baseball cap|\bcap\b/i, 'caps/totes are banned outside GLB');
    assert.doesNotMatch(all, /third_party|04_third_party|internal_only/i);
    assert.doesNotMatch(all, /\$\d/, 'no prices are set, so no dollar amounts render');
    assert.doesNotMatch(all, /\d(\.\d)? ?\(\d[\d.,]*k? reviews\)|★/i, 'no fake reviews');
    const assets = readdirSync(join(out, 'assets'));
    assert.ok(assets.every((a) => !/poison|pave|backpack-flap/i.test(a) && (id === 'glb' || !/tote|cap-/i.test(a))), assets.join(','));
  });
}

test('concept renders are captioned as concepts', async () => {
  for (const id of BRANDS) {
    const out = await build(id);
    const { catalog } = loadBrand(id);
    for (const p of catalog.filter((x) => x.listed !== false && (x.images ?? []).some((i) => i.concept))) {
      assert.match(readFileSync(join(out, 'products', `${p.id}.html`), 'utf8'), /Concept render|Mockup · /, `${id}/${p.id}`);
    }
  }
});

test('Butts Studios: approved scope only, tagline in sans, bag never purchasable, beanie present', async () => {
  const out = await build('buttsstudios');
  const idx = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(idx, /<h1 class="bs-display">Made of Story\.<\/h1>/);
  assert.match(idx, /stroke-width="12"><rect x="10" y="10" width="80" height="80"\/><path d="M10 10 L90 90 M90 10 L10 90"\/>/, 'C5 mark');
  const shop = readFileSync(join(out, 'shop.html'), 'utf8');
  for (const n of ['Contour Hoodie', 'Windbreaker', 'Plaid Flannel', 'Knit Beanie', 'Studio Bag']) assert.match(shop, new RegExp(n));
  assert.match(shop, /Rust/); assert.match(shop, /Black/);
  assert.doesNotMatch(shop, /button-up|backpack/i);
  const bag = readFileSync(join(out, 'products', 'studio-bag.html'), 'utf8');
  assert.match(bag, /Concept · not yet available/);
  assert.doesNotMatch(bag, /data-add|data-notify/);
  assert.doesNotMatch(readFileSync(join(out, 'styles.css'), 'utf8'), /--f-display:(?:(?!sans-serif)[^;}])*\bserif\b/, 'no serif display face');
  const { catalog } = loadBrand('buttsstudios');
  assert.match(catalog.find((p) => p.id === 'plaid-flannel').summary, /No logo on the front/);
});

test('Runwae v4 home follows cbce9be5: photo hero, 01 Built on, 02 dark band, details, 03 capsule row; no bare sketch outside the Drawn Series art panels', async () => {
  const out = await build('runwae');
  const pages = pagesOf(out).filter((f) => f !== 'drawn-series.html').map((f) => readFileSync(join(out, f), 'utf8')).join('\n');
  assert.doesNotMatch(pages, /assets\/(sketch-|art-)/, 'bare drawings are not pictures on the shop pages (Principal 2026-10-14)');
  assert.ok(!readdirSync(join(out, 'assets')).some((f) => f.startsWith('sketch-')));
  const idx = readFileSync(join(out, 'index.html'), 'utf8');
  const main = idx.slice(idx.indexOf('<main'), idx.lastIndexOf('<footer'));
  assert.match(main.slice(0, 1500), /class="rw4-hero"/);
  assert.match(main.slice(0, 1500), /v4-hero/);
  assert.match(main, /<h1 id="hero-t" class="rw4-title"><span>Runwae<\/span><span>Apparel<\/span><\/h1>/);
  for (const t of ['A continuing journey.', 'Clothing for a more curious world.', 'Explore the story', 'Built on Ideas, People, Places, Progress.', 'Clothes for a more thoughtful tomorrow.', 'Wear a brighter tomorrow.']) assert.ok(main.includes(t), t);
  for (const w of ['Ideas', 'People', 'Places', 'Progress']) assert.match(main, new RegExp(`<li>${w}</li>`));
  for (const f of ['v4-label', 'v4-button', 'v4-embroidery', 'v4-globe-patch', 'v4-band']) assert.match(main, new RegExp(f));
  const row = main.slice(main.indexOf('class="rw4-row"'));
  const names = [...row.matchAll(/rw4-card-name">([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(names.slice(0, 7), ['Foundation Hoodie', 'Globe Hoodie', 'Figure Overshirt', 'Atelier Shirt', 'Sketch Tee', 'Field Overshirt', 'Botanical Tee']);
  assert.match(main, /class="rw4-focus"[\s\S]*Luv Thy Neighbor Hoodie/, 'the focus piece stays reachable from home');
  const foot = idx.slice(idx.lastIndexOf('<footer'));
  for (const w of ['Art', 'People', 'Places', 'Progress']) assert.match(foot, new RegExp(`<li>${w}</li>`));
  assert.match(foot, /Join the journey/);
  assert.ok((idx.match(/class="rw-ptag">Concept</g) ?? []).length >= 7, 'concept photography is captioned');
  const { catalog } = loadBrand('runwae');
  for (const p of catalog.filter((x) => x.status === 'archive')) { assert.equal(p.archive_year, 2021); assert.equal(p.line, "Fall '21"); }
  assert.doesNotMatch(idx + readFileSync(join(out, 'shop.html'), 'utf8'), /museum|gallery wall|exhibit/i);
});

test('Runwae v4 Drawn Series page follows 38b3982c: Globe Hoodie hero, seven pieces, Artwork in every thread, the artwork panels', async () => {
  const out = await build('runwae');
  const ds = readFileSync(join(out, 'drawn-series.html'), 'utf8');
  const main = ds.slice(ds.indexOf('<main'), ds.lastIndexOf('<footer'));
  assert.match(main.slice(0, 1500), /v4-coll-hero/);
  assert.match(main, /<span>The<\/span><span>Drawn<\/span><span>Series<\/span>/);
  assert.match(main, /Seven pieces\. A brighter tomorrow\./);
  assert.match(main, /Artwork in every thread\./);
  assert.equal((main.match(/<a class="rw4-card/g) ?? []).length, 7);
  for (const a of ['art-head', 'art-portrait', 'art-figure', 'art-pair']) assert.match(main, new RegExp(`assets/${a}-`), `${a}: art panel on this page`);
  assert.match(ds, /<a href="drawn-series\.html" aria-current="page">The Drawn Series<\/a>/);
  assert.match(ds, /<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(ds, / style="/);
  for (const m of ds.matchAll(/(?:src|href)="((?:assets|products)\/[^"#?]+)"/g)) assert.ok(existsSync(join(out, m[1])), m[1]);
});

test('Runwae capsule "The Drawn Series · Seven pieces": honest mapping, palette, print, prices ignored', () => {
  const { catalog } = loadBrand('runwae');
  const cap = catalog.filter((p) => Number.isInteger(p.capsule)).sort((a, b) => a.capsule - b.capsule);
  assert.deepEqual(cap.map((p) => p.name), ['Foundation Hoodie', 'Globe Hoodie', 'Figure Overshirt', 'Atelier Shirt', 'Sketch Tee', 'Field Overshirt', 'Botanical Tee']);
  const by = Object.fromEntries(cap.map((p) => [p.name, p]));
  assert.equal(by['Foundation Hoodie'].colors[0].id, 'forest');
  assert.deepEqual(by['Foundation Hoodie'].print, [{ placement: 'front_chest', size: 'chest_medium' }]);
  assert.equal(by['Globe Hoodie'].colors[0].id, 'ivory');
  assert.deepEqual(by['Globe Hoodie'].print, [{ placement: 'back', size: 'full_back' }]);
  assert.equal(by['Atelier Shirt'].colors[0].id, 'ivory');
  assert.equal(by['Sketch Tee'].colors[0].id, 'ivory');
  assert.equal(by['Field Overshirt'].colors[0].id, 'rust');
  assert.equal(by['Botanical Tee'].colors[0].id, 'forest');
  for (const p of cap) { assert.equal(p.line, 'The Drawn Series'); assert.equal(p.price_cents, null, 'concept prices ignored'); assert.ok(p.images[0].concept); }
  for (const p of catalog) assert.ok(!(p.images ?? []).some((i) => /^art-/.test(i.file)), `${p.id}: drawings are art panels on the Drawn Series page only`);
  const focus = catalog.filter((p) => ['preorder', 'available'].includes(p.status));
  assert.deepEqual(focus.map((p) => p.id), ['tlt-neighbor-hoodie'], 'focus item kept: Luv Thy Neighbor Hoodie');
});

test('Runwae catalog edits (Principal 2026-10-14): removals gone, merges done, off-limits sources unused', async () => {
  const out = await build('runwae');
  const files = pagesOf(out).map((f) => readFileSync(join(out, f), 'utf8')).join('\n') + readFileSync(join(out, 'catalog.js'), 'utf8');
  for (const n of ['True Grit Tee', 'Crafting Tee', 'The Little Things Tee', 'Luv Thy Neighbor Tee', 'RWA Sweatpants', 'RWA Tee', 'Head Study Hoodie', 'Botanical Button-Down</', 'Field Jacket</']) assert.ok(!files.includes(n), n);
  assert.ok(!readdirSync(join(out, 'assets')).some((f) => /^(true-grit-tee|crafting-tee|tlt-face-tee|tlt-neighbor-tee|tlt-rwa-sweatpants|tlt-rwa-tee)-/.test(f)));
  for (const n of ['Foundation Hoodie', 'Chest-Drawing Hoodie', 'Runwae Company Hoodie', 'Knit Polo', 'Field Overshirt', 'Atelier Shirt', 'Garden Shirt', 'Rust Corduroy Shirt', 'The Runwae Company Tee', 'Luv Thy Neighbor Hoodie']) assert.ok(files.includes(n), n);
  const fig = readFileSync(join(out, 'products', 'drawn-figure-hoodie.html'), 'utf8');
  assert.match(fig, /data-color-group="forest"/); assert.match(fig, /data-color-group="ivory"/); assert.match(fig, /name="view-color"/);
  assert.match(readFileSync(join(out, 'products', 'drawn-portrait-hoodie.html'), 'utf8'), /Mockup · original drawing/);
  assert.match(readFileSync(join(out, 'products', 'drawn-overshirt.html'), 'utf8'), /Mockup · original drawing/);
  const shop = readFileSync(join(out, 'shop.html'), 'utf8');
  const order = ['The Drawn Series', 'Next drop', 'Essentials', 'The Little Things', "Archive · Fall '21"].map((l) => shop.indexOf(`>${l}`));
  assert.ok(order.every((i) => i > 0), order.join());
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'the shop leads with the capsule; everything else sits behind it');
  assert.doesNotMatch(JSON.parse(readFileSync(join(ROOT, 'brands', 'runwae', 'catalog.json'), 'utf8')).products.map((p) => JSON.stringify(p.images)).join(), /FB2/, 'third-party back art (#82-d)');
});

test('GLB: the full concept-board range, grouped like the board; big art on the back', async () => {
  const out = await build('glb');
  const shop = readFileSync(join(out, 'shop.html'), 'utf8');
  for (const n of ['Crew Love Tee', 'Good Views Tee', 'Nicer World Tee', 'Little Booty Tee', 'More Good Days Baby Tee', 'All Shapes Hoodie', 'Chill Shorts', 'Low Key Hat', 'GLB Dad Hat', 'Good Energy Tote']) assert.ok(shop.includes(n), n);
  const cats = [...shop.matchAll(/id="cat-([a-z-]+)" aria/g)].map((m) => m[1]);
  assert.deepEqual(cats, ['tees', 'hoodies', 'baby-tees', 'shorts', 'sweatshirts', 'hats', 'accessories']);
  for (const id of ['nicer-world-tee', 'more-good-days-baby-tee', 'line-art-tee', 'nice-butts-tee']) assert.match(readFileSync(join(out, 'products', `${id}.html`), 'utf8'), /Back placement mockup/, id);
  const bd = readFileSync(join(out, 'products', 'brighter-days-hoodie.html'), 'utf8');
  assert.match(bd, /data-color-group="black"/);
});

test('GLB: provisional taglines present; playful, never crude copy guard', async () => {
  const out = await build('glb');
  const idx = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(idx, /They own it\./);
  assert.match(idx, /Every body is worth drawing\./);
  assert.match(readFileSync(join(ROOT, 'brands', 'glb', 'brand.json'), 'utf8'), /PROVISIONAL/);
  assert.doesNotMatch(idx, /\b(sexy|thicc|booty call|nsfw)\b/i);
});

test('Ridgefield: real square mark, no em dashes, voice guard on every page', async () => {
  const out = await build('ridgefield');
  for (const f of pagesOf(out)) {
    const html = readFileSync(join(out, f), 'utf8');
    const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ');
    assert.doesNotMatch(text, /—/, `${f}: em dash`);
    assert.doesNotMatch(text, /caught my eye|stood out|\bincluding\b|compare notes|built for|what's next|game[- ]chang|cutting[- ]edge|world[- ]class|premium|waterproof|weatherproof|heavyweight|durable/i, `${f}: voice`);
    assert.match(html, /fill-rule="evenodd" d="M0 0h18v18H0z M5 5v8h8V5z"/, `${f}: square mark`);
  }
  assert.match(readFileSync(join(out, 'styles.css'), 'utf8'), /#c75a2e/i, 'ember orange present');
});

test('holding page: Runwae Apparel in full, drop coming, no forms/prices/emails, indexable, no Pave', () => {
  const out = mkdtempSync(join(tmpdir(), 'sf-hold-'));
  const r = buildHolding('runwae', out);
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(html, /<h1>Runwae Apparel<\/h1>/);
  assert.match(html, /first drop is coming/);
  assert.doesNotMatch(html, /<form|\$\d|@[a-z]+\.(com|net)|noindex|pave|poison/i);
  assert.ok(r.shots >= 1 && existsSync(join(out, 'seal.png')) && existsSync(join(out, '404.html')));
  assert.match(readFileSync(join(out, 'robots.txt'), 'utf8'), /Allow: \//);
  assert.match(html, /og:image" content="https:\/\/runwaeapparel\.com\/photos\//);
  assert.match(html, /rel="canonical" href="https:\/\/runwaeapparel\.com\/"/);
  assert.match(JSON.stringify(JSON.parse(readFileSync(join(out, 'vercel.json'), 'utf8'))), /script-src 'none'/);
});

test('the template builds (a copied brand works with no code changes, once it has inventory rows)', async () => {
  const { root } = templateRoot(ROOT, mkdtempSync(join(tmpdir(), 'sf-tpl-')), 'newbrand');
  const out = join(root, 'out');
  const r = await buildBrand('newbrand', out, { root, now: NOW });
  assert.ok(r.pages >= 8);
  assert.match(readFileSync(join(out, 'index.html'), 'utf8'), /Example Brand/);
});

test('core never names a brand', () => {
  const files = ['core/build.mjs', 'core/kit.mjs', 'core/catalog.mjs', 'core/cart.mjs', 'core/checkout.mjs', 'core/drop.mjs', 'core/base.css', 'core/client/seed.js',
    'core/inventory.mjs', 'core/stock.mjs', 'core/admin.mjs', 'core/email.mjs', 'core/style-rules.mjs', 'api/stripe-webhook.mjs', 'api/availability.mjs'];
  for (const f of files) assert.doesNotMatch(readFileSync(join(ROOT, f), 'utf8'), /runwae|girls love|\bglb\b|butts ?studios|ridgefield/i, f);
});

test('Runwae cohesive palette: current items use forest / ivory / washed black / rust only; originals captioned', async () => {
  const { brand, catalog } = loadBrand('runwae');
  assert.deepEqual(brand.palette, ['forest', 'ivory', 'washed-black', 'rust']);
  for (const p of catalog.filter((x) => x.status !== 'archive' && x.listed !== false)) for (const c of p.colors) assert.ok(brand.palette.includes(c.id), `${p.id}: ${c.id}`);
  const out = await build('runwae');
  for (const id of ['foundation-hoodie', 'trc-hoodie', 'runwae-company-hoodie']) assert.match(readFileSync(join(out, 'products', `${id}.html`), 'utf8'), /Original 2021/, id);
  const trc = readFileSync(join(out, 'products', 'trc-hoodie.html'), 'utf8');
  assert.match(trc, /not used \(#82-d\)/, 'the third-party back illustration is not reissued');
});
