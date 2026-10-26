import './_cleanup.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBrand, buildHolding, brandIds, loadBrand, ROOT } from '../src/build.mjs';
import { templateRoot } from './_fixtures.mjs';

const BRANDS = ['buttsstudios', 'glb', 'ridgefield', 'runwae'];
const NOW = new Date('2026-10-14T12:00:00Z');
const built = {};
const sites = {};
async function build(id) {
  if (!built[id]) {
    const out = mkdtempSync(join(tmpdir(), `sf-${id}-`)); await buildBrand(id, out, { now: NOW, env: {} });
    const base = loadBrand(id).brand.base_path; // shops served under their main site build into out/<base>/
    built[id] = base ? join(out, base) : out; sites[id] = out;
  }
  return built[id];
}
const pagesOf = (out) => [...(existsSync(join(out, 'release-01.html')) ? ['release-01.html'] : []), 'index.html', 'shop.html', 'story.html', 'cart.html', 'orders.html', 'policies.html', 'privacy.html', 'terms.html', 'returns.html', 'shipping.html', 'thanks.html', ...readdirSync(join(out, 'products')).map((f) => `products/${f}`)];

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

  test(`${id}: pre-launch (Principal 2026-10-18): nothing can be added to the bag; every current item says Not available`, async () => {
    const out = await build(id);
    const data = JSON.parse(readFileSync(join(out, 'catalog.js'), 'utf8').replace(/^window\.SEED = /, '').replace(/;\s*$/, ''));
    assert.equal(Object.values(data.products).filter((p) => p.canAdd).length, 0, `${id}: nothing addable before launch`);
    for (const [pid, p] of Object.entries(data.products)) {
      assert.ok(['unavailable', 'archive'].includes(p.status), `${pid}: ${p.status}`);
      if (p.status === 'archive') continue;
      const page = readFileSync(join(out, 'products', `${pid}.html`), 'utf8');
      const html = page.slice(page.indexOf('<main'), page.indexOf('</main>'));
      assert.doesNotMatch(html, /data-add |data-notify|Price TBA/, pid);
      assert.match(html, /Not available/, pid);
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
  assert.match(bag, /Not available/);
  assert.doesNotMatch(bag, /data-add|data-notify/);
  assert.doesNotMatch(readFileSync(join(out, 'styles.css'), 'utf8'), /--f-display:(?:(?!sans-serif)[^;}])*\bserif\b/, 'no serif display face');
  const { catalog } = loadBrand('buttsstudios');
  assert.match(catalog.find((p) => p.id === 'plaid-flannel').summary, /No logo on the front/);
});

test('Runwae v4 home follows cbce9be5: photo hero, 01 Built on, 02 dark band, details, 03 capsule row; no bare sketch outside the Release 01 art panels', async () => {
  const out = await build('runwae');
  const pages = pagesOf(out).filter((f) => f !== 'release-01.html').map((f) => readFileSync(join(out, f), 'utf8')).join('\n');
  assert.doesNotMatch(pages, /assets\/(sketch-|art-)/, 'bare drawings are not pictures on the shop pages (Principal 2026-10-14)');
  assert.ok(!readdirSync(join(out, 'assets')).some((f) => f.startsWith('sketch-')));
  const idx = readFileSync(join(out, 'index.html'), 'utf8');
  const main = idx.slice(idx.indexOf('<main'), idx.lastIndexOf('<footer'));
  assert.match(main.slice(0, 1500), /class="rw4-hero[ "]/);
  assert.match(main.slice(0, 1500), /v4-hero/);
  assert.match(main, /<h1 id="hero-t" class="rw4-title"><span>Runwae<\/span><span>Apparel<\/span><\/h1>/);
  for (const t of ['A continuing journey.', 'Clothing for a more curious world.', 'Explore the story', 'Shop Release 01', 'Everyone influences.', 'Built on Ideas, People, Places, Progress.', 'Clothes for a more thoughtful tomorrow.', 'Wear a brighter tomorrow.', 'Enter the shop']) assert.ok(main.includes(t), t);
  // v5 doorway (Principal 2026-10-14 "entry way to the store"): story sections end on the piece they are worn as,
  // the capsule row shows prices (Price TBA) and statuses, a final Enter the shop, and Shop is visible in the header.
  const order = ['id="story"', 'What we believe', 'The art behind the clothes', 'class="rw4-row"', 'id="enter-t"'].map((k) => main.indexOf(k));
  assert.ok(order.every((i) => i > 0), order.join()); assert.deepEqual([...order].sort((x, y) => x - y), order, 'who -> belief -> art -> pieces -> enter the shop');
  for (const [id, n] of [['tlt-neighbor-hoodie', 'Luv Thy Neighbor Hoodie'], ['globe-hoodie', 'Globe Hoodie'], ['flannel', 'Flannel']]) assert.match(main, new RegExp(`class="rw5-worn[^"]*" href="products/${id}\\.html"><span>Worn as:</span> ${n}`), n);
  assert.equal((main.slice(main.indexOf('class="rw4-row"')).match(/class="rw4-status">Not available</g) ?? []).length, 6, 'capsule statuses shown');
  assert.match(idx.slice(0, idx.indexOf('<main')), /class="rw-shoplink" href="shop\.html">Shop</, 'Shop always visible in the header (outside the phone menu)');
  for (const w of ['Ideas', 'People', 'Places', 'Progress']) assert.match(main, new RegExp(`<li>${w}</li>`));
  for (const f of ['v4-label', 'v4-button', 'v4-embroidery', 'v4-globe-patch', 'v4-band']) assert.match(main, new RegExp(f));
  const row = main.slice(main.indexOf('class="rw4-row"'));
  const names = [...row.matchAll(/rw4-card-name">([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(names.slice(0, 6), ['Field Overshirt', 'Globe Hoodie', 'Luv Thy Neighbor Hoodie', 'Knit Polo', 'Beanie', 'Flannel']);
  assert.doesNotMatch(main, /class="rw4-focus"/, 'no Now/pre-order strip while nothing is available');
  const foot = idx.slice(idx.lastIndexOf('<footer'));
  for (const w of ['Art', 'People', 'Places', 'Progress']) assert.match(foot, new RegExp(`<li>${w}</li>`));
  assert.doesNotMatch(foot, /Join the journey/, 'sign-up hidden until a real list exists (api/notify is a stub)');
  assert.ok((idx.match(/class="rw-ptag">Concept</g) ?? []).length >= 7, 'concept photography is captioned');
  const { catalog } = loadBrand('runwae');
  for (const p of catalog.filter((x) => x.status === 'archive')) { assert.equal(p.archive_year, 2021); assert.equal(p.line, "Fall '21"); }
  assert.doesNotMatch(idx + readFileSync(join(out, 'shop.html'), 'utf8'), /museum|gallery wall|exhibit/i);
});

test('Runwae Release 01 page (38b3982c layout): photo hero, six pieces, Artwork in every thread, the artwork panels', async () => {
  const out = await build('runwae');
  const ds = readFileSync(join(out, 'release-01.html'), 'utf8');
  const main = ds.slice(ds.indexOf('<main'), ds.lastIndexOf('<footer'));
  assert.match(main.slice(0, 1500), /v4-coll-hero/);
  assert.match(main, /<span>Release<\/span><span>01<\/span>/);
  assert.match(main, /Six pieces\. A brighter tomorrow\./);
  assert.match(main, /Artwork in every thread\./);
  assert.equal((main.match(/<a class="rw4-card/g) ?? []).length, 6);
  for (const a of ['art-head', 'art-portrait', 'art-figure', 'art-pair']) assert.match(main, new RegExp(`assets/${a}-`), `${a}: art panel on this page`);
  assert.match(ds, /<a href="release-01\.html" aria-current="page">Release 01<\/a>/);
  assert.match(ds, /<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(ds, / style="/);
  for (const m of ds.matchAll(/(?:src|href)="((?:assets|products)\/[^"#?]+)"/g)) assert.ok(existsSync(join(out, m[1])), m[1]);
});

test('Runwae Release 01 "03 The artwork": every tile in the row shares one treatment (Principal 2026-10-14)', async () => {
  const out = await build('runwae');
  const ds = readFileSync(join(out, 'release-01.html'), 'utf8');
  const row = ds.slice(ds.indexOf('<section class="rw4-art"'), ds.indexOf('</section>', ds.indexOf('<section class="rw4-art"')));
  const tiles = [...row.matchAll(/<figure class="([^"]+)">/g)].map((m) => m[1]);
  assert.equal(tiles.length, 4, 'four artwork tiles');
  assert.deepEqual([...new Set(tiles)], ['rw4-art-panel'], `one treatment class for every tile: ${tiles.join(', ')}`);
  assert.doesNotMatch(row, /--forest|<figcaption/, 'no odd-one-out modifier; the words sit outside the tiles');
  const css = readFileSync(join(ROOT, 'brands', 'runwae', 'layout', 'styles.css'), 'utf8');
  assert.doesNotMatch(css, /\.rw4-art-panel--/, 'no per-tile variants in the CSS');
});

test('Runwae story page stays on the palette; 2021 photos framed and captioned as originals (Principal 2026-10-14)', async () => {
  const out = await build('runwae');
  const st = readFileSync(join(out, 'story.html'), 'utf8');
  const main = st.slice(st.indexOf('<main'), st.lastIndexOf('<footer'));
  for (const f of ['people-black-hoodie', 'people-tee', 'people-tlt', 'archive-card', 'making-label']) assert.match(main, new RegExp(`<figure class="seed-fig rw5-orig"><img[^>]+assets/${f}-[\\s\\S]*?<figcaption>Original 2021 · `), f);
  assert.doesNotMatch(main, / style="/);
  const brand = JSON.parse(readFileSync(join(ROOT, 'brands', 'runwae', 'brand.json'), 'utf8'));
  assert.ok(!('lime' in brand.tokens.colors), 'lime token removed');
  const css = readFileSync(join(ROOT, 'brands', 'runwae', 'layout', 'styles.css'), 'utf8');
  const v5 = css.slice(css.indexOf('===== v5'));
  const allowed = new Set(['#d9a28c']);
  for (const m of v5.matchAll(/#[0-9a-f]{3,6}\b/gi)) assert.ok(allowed.has(m[0].toLowerCase()), `v5 colours come from the tokens: ${m[0]}`);
  assert.doesNotMatch(css, /\.rw-marks img\{[^}]*#fff/, 'mark tiles on paper, not white');
});

test('Runwae Release 01 (Principal 2026-10-18 renders, numbered 01 to 06): honest mapping, palette, print, prices ignored', () => {
  const { catalog } = loadBrand('runwae');
  const cap = catalog.filter((p) => Number.isInteger(p.capsule)).sort((a, b) => a.capsule - b.capsule);
  assert.deepEqual(cap.map((p) => p.name), ['Field Overshirt', 'Globe Hoodie', 'Luv Thy Neighbor Hoodie', 'Knit Polo', 'Beanie', 'Flannel']);
  assert.deepEqual(cap.map((p) => p.capsule), [1, 2, 3, 4, 5, 6]);
  const by = Object.fromEntries(cap.map((p) => [p.name, p]));
  assert.equal(by['Field Overshirt'].colors[0].id, 'rust');
  assert.equal(by['Globe Hoodie'].colors[0].id, 'forest');
  assert.deepEqual(by['Globe Hoodie'].print, [{ placement: 'back', size: 'full_back' }, { placement: 'front_chest', size: 'chest_medium' }]);
  assert.equal(by['Luv Thy Neighbor Hoodie'].colors[0].id, 'ivory');
  assert.equal(by['Knit Polo'].colors[0].id, 'charcoal');
  assert.deepEqual(by.Beanie.colors.map((c) => c.id), ['forest', 'ivory', 'washed-black', 'rust']);
  assert.equal(by.Flannel.colors[0].id, 'forest-rust-plaid');
  for (const p of cap) { assert.equal(p.line, 'Release 01'); assert.equal(p.price_cents, null, 'concept prices ignored'); assert.ok(p.images[0].concept); assert.match(p.images[0].file, /^rel-/); }
  for (const p of catalog) assert.ok(!(p.images ?? []).some((i) => /^art-/.test(i.file)), `${p.id}: drawings are art panels on the Release 01 page only`);
  const focus = catalog.filter((p) => ['preorder', 'available'].includes(p.status));
  assert.deepEqual(focus.map((p) => p.id), [], 'pre-launch: nothing on sale');
});

test('Runwae shop = Release 01 + the real archive (Principal 2026-10-18); retired concepts gone, off-limits sources unused', async () => {
  const out = await build('runwae');
  const files = pagesOf(out).map((f) => readFileSync(join(out, f), 'utf8')).join('\n') + readFileSync(join(out, 'catalog.js'), 'utf8');
  for (const n of ['True Grit Tee', 'Crafting Tee', 'The Little Things Tee', 'Luv Thy Neighbor Tee', 'RWA Sweatpants', 'RWA Tee', 'Head Study Hoodie', 'Foundation Hoodie', 'Figure Overshirt', 'Atelier Shirt', 'Sketch Tee', 'Botanical Tee', 'Chest-Drawing Hoodie', 'Garden Shirt', 'Rust Corduroy Shirt', 'The Runwae Company Tee', 'TRC Hoodie', 'Faces Tee', 'Portrait Hoodie', 'The Drawn Series']) assert.ok(!files.includes(n), n);
  for (const id of ['drawn-figure-hoodie', 'drawn-overshirt', 'atelier-shirt', 'foundation-hoodie']) assert.ok(!existsSync(join(out, 'products', `${id}.html`)), id);
  for (const n of ['Field Overshirt', 'Globe Hoodie', 'Luv Thy Neighbor Hoodie', 'Knit Polo', 'Beanie', 'Flannel', 'Runwae Apparel Tee']) assert.ok(files.includes(n), n);
  const shop = readFileSync(join(out, 'shop.html'), 'utf8');
  const order = ['Release 01', "Archive · Fall '21"].map((l) => shop.indexOf(`>${l}`));
  assert.ok(order.every((i) => i > 0), order.join());
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'the shop leads with the release; the archive sits behind it');
  assert.doesNotMatch(JSON.parse(readFileSync(join(ROOT, 'brands', 'runwae', 'catalog.json'), 'utf8')).products.map((p) => JSON.stringify(p.images)).join(), /FB2/, 'third-party back art (#82-d)');
});

test('GLB: the approved Batch 1 lineup (Principal 2026-10-18), grouped by category; big art on the back', async () => {
  const out = await build('glb');
  const shop = readFileSync(join(out, 'shop.html'), 'utf8');
  for (const n of ['Icon Tee', 'Curves Tee', 'Curves Hoodie', 'Icon Hoodie', 'Curves Crewneck', 'Mini Logo Crew', 'Chill Shorts', 'Good Energy Tote']) assert.ok(shop.includes(n), n);
  for (const n of ['Crew Love Tee', 'Good Views Tee', 'Nicer World Tee', 'Little Booty Tee', 'More Good Days', 'All Shapes Hoodie', 'Low Key Hat', 'GLB Dad Hat', 'Brighter Days Hoodie', 'Line Art Tee', 'Nice Butts Tee']) assert.ok(!shop.includes(n), `retired: ${n}`);
  const cats = [...shop.matchAll(/id="cat-([a-z-]+)" aria/g)].map((m) => m[1]);
  assert.deepEqual(cats, ['tees', 'hoodies', 'shorts', 'sweatshirts', 'accessories']);
  const { catalog } = loadBrand('glb');
  assert.equal(catalog.length, 8, 'small curated shop');
  for (const id of ['icon-tee', 'curves-tee', 'curves-hoodie', 'icon-hoodie', 'curves-crewneck']) {
    const p = catalog.find((x) => x.id === id);
    assert.deepEqual(p.print[0], { placement: 'back', size: 'full_back' }, id);
    assert.match(p.images[0].file, /-back$/, `${id}: the back (big art) leads`);
  }
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
    'core/inventory.mjs', 'core/stock.mjs', 'core/admin.mjs', 'core/email.mjs', 'core/style-rules.mjs', 'core/policies.mjs', 'api/stripe-webhook.mjs', 'api/availability.mjs'];
  for (const f of files) assert.doesNotMatch(readFileSync(join(ROOT, f), 'utf8'), /runwae|girls love|\bglb\b|butts ?studios|ridgefield/i, f);
});

test('Runwae cohesive palette: current items use forest / ivory / washed black / rust, plus the charcoal polo and the forest/rust plaid (2026-10-18 renders)', async () => {
  const { brand, catalog } = loadBrand('runwae');
  assert.deepEqual(brand.palette, ['forest', 'ivory', 'washed-black', 'rust', 'charcoal', 'forest-rust-plaid']);
  for (const p of catalog.filter((x) => x.status !== 'archive' && x.listed !== false)) for (const c of p.colors) assert.ok(brand.palette.includes(c.id), `${p.id}: ${c.id}`);
  const out = await build('runwae');
  const shop = readFileSync(join(out, 'shop.html'), 'utf8');
  for (const n of ['Runwae Apparel Tee']) assert.match(shop.slice(shop.indexOf('id="archive"')), new RegExp(n), `${n}: archive keeps its original colours`);
  assert.match(readFileSync(join(out, 'story.html'), 'utf8'), /Original 2021/, 'originals captioned');
});

// Legal pages (2026-10-14 legal audit): every shop renders Privacy, Terms, Returns and pre-orders, Shipping and
// the policies hub from core/policies.mjs, links all of them in every footer, and says true things about the code.
const LEGAL = ['privacy.html', 'terms.html', 'returns.html', 'shipping.html', 'policies.html'];
for (const id of BRANDS) {
  test(`${id}: every policy page renders and every page's footer links all of them`, async () => {
    const out = await build(id);
    const { brand } = loadBrand(id);
    for (const f of LEGAL) {
      assert.ok(existsSync(join(out, f)), `${id}: ${f} missing`);
      const html = readFileSync(join(out, f), 'utf8');
      assert.match(html, /Last updated:/, `${f}: dated`);
      assert.match(html, /Draft for review/, `${f}: preview shops keep the draft line`);
      assert.ok(html.includes(brand.policies.contact), `${f}: contact address`);
    }
    for (const f of pagesOf(out)) {
      const html = readFileSync(join(out, f), 'utf8');
      const foot = html.slice(html.lastIndexOf('<footer'));
      const nav = foot.match(/<nav class="seed-legal" aria-label="Policies">([\s\S]*?)<\/nav>/);
      assert.ok(nav, `${f}: footer legal nav`);
      for (const pg of ['privacy', 'terms', 'returns', 'shipping']) assert.match(nav[1], new RegExp(`href="(\\.\\./|/shop/)?${pg}\\.html"`), `${f}: footer links ${pg}`);
      assert.match(nav[1], /href="mailto:/, `${f}: footer contact`);
    }
    const priv = readFileSync(join(out, 'privacy.html'), 'utf8');
    for (const must of [/Stripe/, /Link/, /localStorage/, /Resend/, /Vercel/, /Printful/, /Notify me/, /Do Not Track/, /under 13/, /California/, /do not sell/i]) assert.match(priv, must, `privacy mentions ${must}`);
    assert.equal(/Google Fonts/.test(priv), !!brand.tokens?.fontsHref, 'Google Fonts disclosed exactly when loaded');
    const ret = readFileSync(join(out, 'returns.html'), 'utf8');
    assert.match(ret, /before it passes/); assert.match(ret, /more than 30 days/); assert.match(ret, /minimum production run/);
    const terms = readFileSync(join(out, 'terms.html'), 'utf8');
    for (const must of [/Governing law/, /liability/i, /18 or older/]) assert.match(terms, must);
    const legal = LEGAL.map((f) => readFileSync(join(out, f), 'utf8')).join('\n').replace(/<[^>]+>/g, ' ');
    assert.doesNotMatch(legal, /\bfree\b|digital only|\bincluding\b|—|\bAHL\b|Anne Huntington/i, 'legal copy rules');
  });
}

test('a live build refuses unconfirmed policy facts; a confirmed one builds without [CONFIRM] or draft lines', async () => {
  const { policyGaps } = await import('../core/policies.mjs');
  assert.ok(policyGaps(loadBrand('buttsstudios').brand).length > 0, 'the current brand has open confirmations');
  const { root } = templateRoot(ROOT, mkdtempSync(join(tmpdir(), 'sf-gate-')), 'gate');
  const bp = join(root, 'brands', 'gate', 'brand.json');
  const tb = JSON.parse(readFileSync(bp, 'utf8'));
  writeFileSync(bp, JSON.stringify({ ...tb, mode: 'live' }));
  await assert.rejects(buildBrand('gate', join(root, 'out'), { root, now: NOW, env: {} }), /policies: confirm before going live/);
  const policies = { entity: 'Example Brand', contact: 'help@example.com', mailing_address: '1 Main St, Town', governing_law: 'the State of Delaware',
    effective_date: '2026-11-01', returns_window_days: 14, exchange_shipping: 'we cover it', order_retention: '7 years', preorder_cancel: 'yes, email us before it closes' };
  writeFileSync(bp, JSON.stringify({ ...tb, mode: 'live', policies }));
  const out = join(root, 'out');
  await buildBrand('gate', out, { root, now: NOW, env: {} });
  for (const f of LEGAL) assert.doesNotMatch(readFileSync(join(out, f), 'utf8'), /CONFIRM|Draft for review/, f);
  assert.equal(policyGaps({ ...tb, policies: { ...policies, contact_status: 'placeholder: no MX' } }).length, 1, 'a placeholder status blocks launch');
});

// Principal 2026-10-26 STUDIOS-SHOP-PATH DECIDED: buttsstudios.com/shop + ridgefieldtech.com/shop; store.* 301 to the path.
test('shop path: Butts Studios and Ridgefield build under /shop with root-absolute links; Runwae + GLB stay at their root', async () => {
  for (const [id, host] of [['buttsstudios', 'buttsstudios.com'], ['ridgefield', 'ridgefieldtech.com']]) {
    const out = await build(id);
    assert.ok(out.endsWith('/shop'), id);
    assert.ok(existsSync(join(sites[id], '404.html')) && existsSync(join(sites[id], 'robots.txt')), `${id}: origin 404 + robots`);
    const data = readFileSync(join(out, 'catalog.js'), 'utf8');
    assert.match(data, /"api":"\/shop\/api"/, id);
    for (const f of pagesOf(out)) {
      const html = readFileSync(join(out, f), 'utf8');
      assert.match(html, new RegExp(`<link rel="canonical" href="https://${host.replace(/\./g, '\\.')}/shop/`), `${id} ${f}`);
      assert.match(html, /data-root="\/shop\/"/, `${id} ${f}`);
      assert.doesNotMatch(html, /store\.(buttsstudios|ridgefieldtech)\.com\/?["' <]/, `${id} ${f}: old store host`);
      for (const m of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
        const u = m[1];
        if (/^(https?:|mailto:|data:)/.test(u)) continue;
        assert.ok(u.startsWith('/shop/'), `${id} ${f}: relative link ${u} would break at /shop without a slash`);
      }
    }
  }
  for (const id of ['runwae', 'glb']) {
    const out = await build(id);
    assert.ok(!out.endsWith('/shop'), id);
    assert.match(readFileSync(join(out, 'catalog.js'), 'utf8'), /"api":"\/api"/, id);
    assert.match(readFileSync(join(out, 'index.html'), 'utf8'), /data-root=""/, id);
  }
});

test('shop path: vercel.json 301s store.* deep links to the path, keeps /api on the old host, proxies /shop/api', () => {
  const v = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
  assert.deepEqual(v.rewrites, [{ source: '/shop/api/:path*', destination: '/api/:path*' }]);
  for (const [host, main] of [['store.buttsstudios.com', 'buttsstudios.com'], ['store.ridgefieldtech.com', 'ridgefieldtech.com']]) {
    const rs = v.redirects.filter((r) => r.has?.[0]?.value === host);
    assert.ok(rs.length >= 2 && rs.every((r) => r.statusCode === 301 && r.destination.startsWith(`https://${main}/shop/`)), host);
    const catchAll = rs.find((r) => r.source.startsWith('/:path('));
    const re = new RegExp(`^/${catchAll.source.slice('/:path'.length)}$`);
    for (const p of ['/', '/cart.html', '/products/a.html', '/a/b']) assert.ok(re.test(p), `${host}${p} redirects`);
    for (const p of ['/api/checkout', '/api/stripe-webhook', '/shop/x']) assert.ok(!re.test(p), `${host}${p} not caught by the catch-all`);
  }
});
