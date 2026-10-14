import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBrand, buildHolding, brandIds, loadBrand, ROOT } from '../src/build.mjs';

const BRANDS = ['buttsstudios', 'glb', 'ridgefield', 'runwae'];
const NOW = new Date('2026-10-14T12:00:00Z');
const built = {};
async function build(id) {
  if (!built[id]) { const out = mkdtempSync(join(tmpdir(), `sf-${id}-`)); await buildBrand(id, out, { now: NOW, env: {} }); built[id] = out; }
  return built[id];
}
const pagesOf = (out) => ['index.html', 'shop.html', 'story.html', 'cart.html', 'orders.html', 'policies.html', 'thanks.html', ...readdirSync(join(out, 'products')).map((f) => `products/${f}`)];

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
    assert.doesNotMatch(all, /\btote\b|dad hat|ball cap|baseball cap|\bcap\b/i);
    assert.doesNotMatch(all, /third_party|04_third_party|internal_only/i);
    assert.doesNotMatch(all, /\$\d/, 'no prices are set, so no dollar amounts render');
    assert.doesNotMatch(all, /\d(\.\d)? ?\(\d[\d.,]*k? reviews\)|★/i, 'no fake reviews');
    const assets = readdirSync(join(out, 'assets'));
    assert.ok(assets.every((a) => !/poison|pave|tote|cap-|backpack-flap/i.test(a)), assets.join(','));
  });
}

test('concept renders are captioned as concepts', async () => {
  for (const id of BRANDS) {
    const out = await build(id);
    const { catalog } = loadBrand(id);
    for (const p of catalog.filter((x) => x.listed !== false && (x.images ?? []).some((i) => i.concept))) {
      assert.match(readFileSync(join(out, 'products', `${p.id}.html`), 'utf8'), /Concept render/, `${id}/${p.id}`);
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

test('Runwae Apparel: story first, collection revealed at chapter 06; owner art leads; archive = real Fall 21 pieces', async () => {
  const out = await build('runwae');
  const idx = readFileSync(join(out, 'index.html'), 'utf8');
  const ch = [...idx.matchAll(/<p class="rw-chap"><span>(\d\d)<\/span>/g)].map((m) => m[1]);
  assert.deepEqual(ch, ['00', '01', '02', '03', '04', '05', '06', '07']);
  assert.ok(idx.indexOf('<a class="rw-card') > idx.indexOf('<span>06</span>'), 'no product cards before chapter 06');
  const main = idx.slice(idx.indexOf('<main'));
  assert.ok(main.indexOf('sketch-01') < main.indexOf('drawn-figure-hoodie'), 'the drawing comes before the garment');
  assert.match(idx, /Ideas\. People\. Places\. Progress\./);
  const { catalog } = loadBrand('runwae');
  for (const p of catalog.filter((x) => x.status === 'archive')) { assert.equal(p.archive_year, 2021); assert.equal(p.line, "Fall '21"); }
  assert.doesNotMatch(idx + readFileSync(join(out, 'shop.html'), 'utf8'), /museum|gallery wall|exhibit/i);
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

test('the template builds (a copied brand works with no code changes)', async () => {
  const root = mkdtempSync(join(tmpdir(), 'sf-tpl-'));
  mkdirSync(join(root, 'brands'));
  cpSync(join(ROOT, 'brands', '_template'), join(root, 'brands', 'newbrand'), { recursive: true });
  const out = join(root, 'out');
  const r = await buildBrand('newbrand', out, { root, now: NOW });
  assert.ok(r.pages >= 8);
  assert.match(readFileSync(join(out, 'index.html'), 'utf8'), /Example Brand/);
});

test('core never names a brand', () => {
  const files = ['core/build.mjs', 'core/kit.mjs', 'core/catalog.mjs', 'core/cart.mjs', 'core/checkout.mjs', 'core/drop.mjs', 'core/base.css', 'core/client/seed.js'];
  for (const f of files) assert.doesNotMatch(readFileSync(join(ROOT, f), 'utf8'), /runwae|girls love|\bglb\b|butts ?studios|ridgefield/i, f);
});
