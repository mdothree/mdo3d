#!/usr/bin/env node
// Static site build: one codebase, one output per brand.
//   node src/build.mjs                    -> dist/<brand>/ for every brand (local preview)
//   node src/build.mjs --brand runwae --out public   -> single brand (Vercel: set BRAND env)
//   --now 2026-11-01T00:00:00Z            -> render as of a date (preview a window)
// Purchasable state is decided at build time for display and re-checked server-side by
// api/checkout.mjs, so rebuild when a window opens or closes.
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shipBy, windowState, purchasable, isoDay } from './drop.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUY_JS = readFileSync(join(ROOT, 'src', 'buy.js'), 'utf8');

export function loadBrand(id) {
  const dir = join(ROOT, 'brands', id);
  const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
  return { dir, brand: read('brand.json'), catalog: read('catalog.json').products, drops: read('drops.json').drops };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = (c) => `$${(c / 100).toFixed(2)}`;
const fmtDate = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function css(t) {
  const frame = t.frame === 'gilded'
    ? `border:12px solid;border-image:linear-gradient(135deg,${t.goldDeep},${t.goldLight} 25%,${t.gold} 50%,${t.goldDeep} 75%,${t.goldLight}) 1;box-shadow:0 0 0 2px ${t.goldDeep},0 14px 30px rgba(0,0,0,.55),inset 0 0 0 3px rgba(0,0,0,.35);`
    : `border:2px solid ${t.text};`;
  return `:root{--bg:${t.bg};--panel:${t.panel};--text:${t.text};--muted:${t.muted};--accent:${t.accent};--gold:${t.gold}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 ${t.fontBody}}
a{color:inherit}img{max-width:100%;height:auto;display:block}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.preview{background:var(--accent);color:#111;text-align:center;font-size:13px;letter-spacing:.06em;padding:6px 12px;text-transform:uppercase}
header.site{display:flex;align-items:center;gap:14px;padding:22px 0;border-bottom:1px solid rgba(127,127,127,.25)}
header.site img{width:52px;height:52px}
.brandname{font:600 28px/1 ${t.fontDisplay};letter-spacing:.08em;text-transform:uppercase;text-decoration:none}
.endorse{font-size:12px;color:var(--muted);letter-spacing:.06em}
nav{margin-left:auto;display:flex;gap:18px;font-size:14px}nav a{text-decoration:none;color:var(--muted)}nav a:hover{color:var(--text)}
.hero{padding:64px 0 40px;text-align:center}
.hero h1{font:500 clamp(40px,7vw,76px)/1 ${t.fontDisplay};margin:0;letter-spacing:.04em}
.hero p{color:var(--muted);margin:14px 0 0}
.bar{display:inline-block;width:64px;height:4px;background:var(--accent);margin:18px 0}
h2.line{font:500 34px/1.1 ${t.fontDisplay};margin:56px 0 6px}
.line-note{color:var(--muted);margin:0 0 24px;font-size:15px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:34px}
.card{text-decoration:none;display:block}
.frame{${frame}background:#f2f0ec}
.card h3{font:500 21px/1.2 ${t.fontDisplay};margin:14px 0 2px}
.status{font-size:13px;color:var(--accent);letter-spacing:.04em}
.product{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:48px;padding:48px 0}.product>*{min-width:0}
.gallery{display:grid;gap:24px}
.product h1{font:500 44px/1.05 ${t.fontDisplay};margin:0 0 6px}
.meta{color:var(--muted);font-size:14px}
.price{font-size:22px;margin:18px 0}
.notice{border-left:3px solid var(--accent);padding:10px 14px;background:var(--panel);margin:18px 0;font-size:15px}
label{display:block;font-size:13px;color:var(--muted);margin:16px 0 6px}
select,button{font:inherit;min-height:44px}
select{width:100%;padding:8px;background:var(--panel);color:var(--text);border:1px solid rgba(127,127,127,.4)}
button{width:100%;margin-top:16px;background:var(--accent);color:#111;border:0;cursor:pointer;letter-spacing:.06em;text-transform:uppercase}
button[disabled]{opacity:.45;cursor:not-allowed}
.small{font-size:13px;color:var(--muted)}
.prose{max-width:720px;padding:40px 0}.prose h1{font:500 44px/1.1 ${t.fontDisplay}}.prose h2{font:500 26px/1.2 ${t.fontDisplay};margin-top:36px}
footer{margin-top:80px;padding:28px 0;border-top:1px solid rgba(127,127,127,.25);font-size:13px;color:var(--muted)}
@media (max-width:760px){.product{grid-template-columns:minmax(0,1fr);gap:24px}header.site{flex-wrap:wrap}nav{width:100%;margin-left:0;gap:16px}.brandname{font-size:22px}.frame{border-width:8px}}
.empty{text-align:center}`;
}

function layout({ brand, root, title, body, description }) {
  const logo = brand.logo ? `<img src="${root}${esc(brand.logo)}" alt="" width="52" height="52">` : '';
  const preview = brand.mode === 'preview' ? '<div class="preview">Preview: not open for orders</div>' : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description ?? brand.tagline)}">
${brand.mode === 'preview' ? '<meta name="robots" content="noindex, nofollow">' : ''}
<link rel="stylesheet" href="${root}styles.css">${brand.logo ? `<link rel="icon" href="${root}${esc(brand.logo)}">` : ''}
</head><body>${preview}<div class="wrap">
<header class="site">${logo}<div><a class="brandname" href="${root}index.html">${esc(brand.name)}</a><div class="endorse">${esc(brand.endorsement)}</div></div>
<nav><a href="${root}index.html">Shop</a><a href="${root}policies.html">Shipping &amp; Exchanges</a></nav></header>
<main>${body}</main>
<footer>© ${new Date().getUTCFullYear()} ${esc(brand.name)}, ${esc(brand.endorsement)}. · <a href="${root}policies.html">Policies</a> · ${esc(brand.policies.contact)}</footer>
</div></body></html>`;
}

function productStatus(p, drops, now) {
  const buy = purchasable(p, drops, now);
  if (buy.ok && buy.drop) return { label: `Pre-order · ships by ${fmtDate(shipBy(buy.drop.window.close, buy.drop.schedule).shipBy)}`, buy };
  if (buy.ok) return { label: 'Available', buy };
  const drop = drops.find((d) => d.products.includes(p.id));
  if (drop && windowState(drop, now) === 'upcoming') return { label: `Pre-order opens ${fmtDate(isoDay(drop.window.open))}`, buy };
  return { label: 'Coming soon', buy };
}

function card(p, st, root) {
  return `<a class="card" href="${root}products/${esc(p.id)}.html"><div class="frame"><img src="${root}assets/${esc(p.id)}-1.jpg" alt="${esc(p.name)}" loading="lazy" width="1000" height="1000"></div>
<h3>${esc(p.name)}</h3><div class="status">${esc(st.label)}</div></a>`;
}

function productPage(b, p, st) {
  const root = '../';
  const imgs = p.images.map((_, i) => `<div class="frame"><img src="${root}assets/${esc(p.id)}-${i + 1}.jpg" alt="${esc(p.name)}, view ${i + 1}" width="1000" height="1000"${i ? ' loading="lazy"' : ''}></div>`).join('');
  const { buy } = st;
  let action;
  if (buy.ok) {
    const sb = buy.drop ? shipBy(buy.drop.window.close, buy.drop.schedule).shipBy : null;
    action = `<div class="price">${money(buy.price_cents)}</div>
${sb ? `<div class="notice"><strong>Pre-order.</strong> Made to order after the window closes on ${fmtDate(isoDay(buy.drop.window.close))}. <strong>Ships by ${fmtDate(sb)}.</strong> Charged at checkout. If we can't make that date we'll tell you before it passes and offer a full refund.</div>` : ''}
<form id="buy" data-product="${esc(p.id)}"><label for="size">Size</label><select id="size" name="size" required>${p.sizes.map((s) => `<option>${esc(s)}</option>`).join('')}</select>
<button type="submit">${sb ? 'Pre-order' : 'Buy'}</button><p class="small">Size exchanges only, no returns. <a href="${root}policies.html">Details</a>.</p><p class="small" id="msg" role="status"></p></form>
<script src="${root}buy.js" defer></script>`;
  } else {
    action = `<div class="notice">${esc(st.label)}.</div><button type="button" disabled>Not available yet</button>`;
  }
  const body = `<section class="product"><div class="gallery">${imgs}</div><div>
<div class="meta">${esc(p.line)}</div><h1>${esc(p.name)}</h1><p>${esc(p.description)}</p>
<div class="meta">${esc(p.method === 'embroidery' ? 'Embroidered' : 'Printed')} · Sizes ${esc(p.sizes.join(', '))}</div>${action}</div></section>`;
  return layout({ brand: b, root, title: `${p.name} | ${b.name}`, body, description: p.description });
}

function policiesPage(b) {
  const body = `<article class="prose"><h1>Shipping &amp; Exchanges</h1>
<h2>Pre-orders</h2><p>Pre-order pieces are made after their window closes, in the quantity ordered. Every pre-order page shows a <strong>ships-by date</strong>, and you're charged at checkout. If something will stop us shipping by that date, we'll email you <strong>before</strong> it passes with the new date and the option to cancel for a full refund.</p>
<p>Each design has a minimum production run. If a design doesn't reach it, everyone who ordered it gets a full refund or a swap to a design that did.</p>
<h2>Shipping</h2><p>${esc(b.shipping.note)} You'll get a tracking number by email when your order ships.</p>
<h2>Exchanges</h2><p>${esc(b.policies.returns)}</p>
<h2>Contact</h2><p>${esc(b.policies.contact)}</p></article>`;
  return layout({ brand: b, root: '', title: `Shipping & Exchanges | ${b.name}`, body });
}

function indexPage(b, catalog, drops, now) {
  const lines = [...new Set(catalog.map((p) => p.line))];
  const notes = { "Fall '21": 'The original line, back in production.', 'The Little Things': "In life, it's all about the little things." };
  const sections = lines.map((l) => `<h2 class="line">${esc(l)}</h2><p class="line-note">${esc(notes[l] ?? '')}</p><div class="grid">${catalog.filter((p) => p.line === l).map((p) => card(p, productStatus(p, drops, now), '')).join('')}</div>`).join('');
  const empty = catalog.length ? '' : '<p class="line-note empty">The first pieces are in the studio.</p>';
  const body = `<section class="hero"><h1>${esc(b.name.split(' ')[0])}</h1><div class="bar"></div><p>${esc(b.tagline)}</p></section>${sections}${empty}`;
  return layout({ brand: b, root: '', title: `${b.name}: ${b.tagline}`, body });
}

export function buildBrand(id, outDir, now = new Date()) {
  const { dir, brand, catalog, drops } = loadBrand(id);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, 'products'), { recursive: true });
  if (existsSync(join(dir, 'assets'))) cpSync(join(dir, 'assets'), join(outDir, 'assets'), { recursive: true });
  writeFileSync(join(outDir, 'styles.css'), css(brand.theme));
  writeFileSync(join(outDir, 'buy.js'), BUY_JS);
  writeFileSync(join(outDir, 'index.html'), indexPage(brand, catalog, drops, now));
  writeFileSync(join(outDir, 'policies.html'), policiesPage(brand));
  writeFileSync(join(outDir, 'thanks.html'), layout({ brand, root: '', title: `Thank you | ${brand.name}`, body: '<article class="prose"><h1>Thank you.</h1><p>Your order is in. A receipt is on its way to your email, and you\'ll get tracking when it ships. Pre-orders ship by the date shown at checkout.</p><p><a href="index.html">Back to the shop</a></p></article>' }));
  for (const p of catalog) writeFileSync(join(outDir, 'products', `${p.id}.html`), productPage(brand, p, productStatus(p, drops, now)));
  writeFileSync(join(outDir, 'robots.txt'), brand.mode === 'preview' ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n');
  return { brand: id, pages: catalog.length + 3, out: outDir };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : undefined; };
  const now = arg('--now') ? new Date(arg('--now')) : new Date();
  const only = arg('--brand') ?? process.env.BRAND;
  const brands = only ? [only] : readdirSync(join(ROOT, 'brands'));
  for (const id of brands) {
    const out = arg('--out') && only ? resolve(arg('--out')) : join(ROOT, 'dist', id);
    console.log(buildBrand(id, out, now));
  }
}
