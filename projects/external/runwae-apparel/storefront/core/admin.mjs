// Local inventory admin: one read-only page over every shop's SKUs, stock and ledger. Brand-agnostic.
// Built by `node src/build.mjs` (all brands) to dist/_admin/. NEVER deployed: the per-brand deploy build
// (`--brand X --out public`) never writes it, buildBrand refuses "_" ids, and .vercelignore drops dist/.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readBrandDir } from './catalog.mjs';
import { readInventory, checkAll, toCsv } from './inventory.mjs';
import { readLedger, replay, availability, availText, reconcile, skuSettings, LEDGER_COLUMNS } from './stock.mjs';
import { esc } from './kit.mjs';
import { sampleOrder, customerEmail, shopEmail } from './email.mjs';

/** Sample "New order" + confirmation emails for every brand -> outDir/emails/. Returns links for the admin page. */
export function buildEmailPreviews(root, outDir) {
  const dir = join(outDir, 'emails');
  mkdirSync(dir, { recursive: true });
  const links = [];
  for (const id of brandsAt(root)) {
    const { brand, catalog } = readBrandDir(join(root, 'brands', id));
    const o = sampleOrder(brand, catalog);
    const banner = '<p style="margin:0;padding:8px 12px;background:#fff3c4;color:#111;font:13px/1.4 system-ui,sans-serif;text-align:center;">Sample order for review. Amounts are placeholders; shop prices are still Price TBA.</p>';
    for (const m of [shopEmail(o, brand, { adminUrl: '../index.html', lowAlerts: [{ sku: `${id}/sample/x/M`, before: 4, after: 2, low: 3 }] }), customerEmail(o, brand)]) {
      writeFileSync(join(dir, `${id}-${m.kind}.html`), m.html.replace(/<body([^>]*)>/, `<body$1>${banner}`));
      writeFileSync(join(dir, `${id}-${m.kind}.txt`), `To: ${m.to}\nFrom: ${m.from}\nSubject: ${m.subject}\n\n[SAMPLE]\n${m.text}`);
      links.push({ brand: id, kind: m.kind, label: `${brand.name}: ${m.kind === 'shop' ? 'New order (to the shop)' : 'Order confirmation (to the customer)'}`, href: `emails/${id}-${m.kind}.html` }, { brand: id, kind: `${m.kind}-txt`, label: `${brand.name}: ${m.kind} (plain text)`, href: `emails/${id}-${m.kind}.txt` });
    }
  }
  return links;
}

export const brandsAt = (root) => readdirSync(join(root, 'brands'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_') && existsSync(join(root, 'brands', d.name, 'brand.json'))).map((d) => d.name).sort();

/** Raw catalogs/drops for every brand (for checkAll). */
export function rawBrands(root) {
  return Object.fromEntries(brandsAt(root).map((id) => { const b = readBrandDir(join(root, 'brands', id), { merge: false }); return [id, { catalog: b.catalog, drops: b.drops, brand: b.brand }]; }));
}

export const STOCK_COLUMNS = Object.freeze(['sku', 'brand', 'product_id', 'name', 'variant', 'status', 'price_cents', 'fulfilment', 'on_hand', 'reserved', 'available', 'preorder_sold', 'preorder_cap', 'owed', 'low_stock', 'state', 'alert']);

/** One row per SKU across every shop, plus product rows without SKUs. */
export function stockReport(root, now = new Date()) {
  const inv = readInventory(root);
  const ledger = readLedger(root);
  const state = replay(ledger, now);
  const brands = rawBrands(root);
  const name = (b, id) => brands[b]?.catalog.find((p) => p.id === id)?.name ?? id;
  const prow = new Map(inv.filter((r) => r.variant === '-').map((r) => [`${r.brand}/${r.product_id}`, r]));
  const out = [];
  for (const r of inv) {
    const pr = prow.get(`${r.brand}/${r.product_id}`);
    if (r.variant === '-') {
      if (inv.some((x) => x.brand === r.brand && x.product_id === r.product_id && x.variant !== '-')) continue;
      out.push({ sku: `${r.brand}/${r.product_id}`, brand: r.brand, product_id: r.product_id, name: name(r.brand, r.product_id), variant: '-', status: r.status, price_cents: r.price_cents, fulfilment: '', on_hand: '', reserved: '', available: '', preorder_sold: '', preorder_cap: '', owed: '', low_stock: '', state: '', alert: '' });
      continue;
    }
    const sku = `${r.brand}/${r.product_id}/${r.variant}`;
    const s = state.get(sku) ?? { on_hand: 0, reserved: 0, preorder_sold: 0, owed: 0, sold: 0 };
    const set = skuSettings(inv, sku);
    const a = availability(set, s);
    const alert = r.fulfilment === 'stock' && ['available', 'preorder', 'sold_out'].includes(pr?.status) ? (a.available <= 0 ? 'out' : a.state === 'low' ? 'low' : '') : a.state === 'preorder_full' ? 'cap' : '';
    out.push({ sku, brand: r.brand, product_id: r.product_id, name: name(r.brand, r.product_id), variant: r.variant, status: r.status || pr?.status || '', price_cents: pr?.price_cents ?? '', fulfilment: r.fulfilment,
      on_hand: r.fulfilment === 'stock' ? s.on_hand : '', reserved: s.reserved, available: Number.isFinite(a.available) ? a.available : '∞', preorder_sold: r.fulfilment === 'preorder' ? s.preorder_sold : '', preorder_cap: r.preorder_cap, owed: s.owed || '', low_stock: r.low_stock, state: set?.buyable || set?.sold_out ? availText(a) : `Not on sale (${(pr?.status ?? '').replace('_', ' ')})`, alert });
  }
  return { rows: out, ledger, inv, errors: [...checkAll(inv, brands), ...reconcile(inv, ledger, now)], brands };
}

const STATUS_ORDER = ['available', 'preorder', 'next_drop', 'in_development', 'sold_out', 'archive'];

/** Writes dist/_admin/{index.html, admin.css, admin.js, stock.csv, ledger.csv}. emails: [{brand, label, href}]. */
export function buildAdmin(root, outDir, { now = new Date(), emails = [] } = {}) {
  const { rows, ledger, errors, brands } = stockReport(root, now);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'stock.csv'), toCsv(rows, STOCK_COLUMNS));
  writeFileSync(join(outDir, 'ledger.csv'), toCsv(ledger, LEDGER_COLUMNS));
  const ids = Object.keys(brands);
  const bname = (id) => brands[id]?.brand?.name ?? id;
  const products = rows.reduce((m, r) => m.set(`${r.brand}/${r.product_id}`, r), new Map());
  const count = (b, st) => [...products.values()].filter((r) => r.brand === b && r.status === st).length;
  const skuRows = rows.filter((r) => r.variant !== '-');
  const totals = ids.map((b) => {
    const s = skuRows.filter((r) => r.brand === b);
    const n = (k) => s.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    return { b, products: [...products.values()].filter((r) => r.brand === b).length, skus: s.length, on_hand: n('on_hand'), reserved: n('reserved'), owed: n('owed'), low: s.filter((r) => r.alert === 'low').length, out: s.filter((r) => r.alert === 'out').length };
  });
  const recent = ledger.slice(-25).reverse();
  const cell = (v) => `<td>${esc(v)}</td>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Inventory · all shops (local)</title><link rel="stylesheet" href="admin.css"><script src="admin.js" defer></script></head>
<body><header class="a-head"><h1>Inventory · all shops</h1><p class="a-note">Local and read-only. Never deployed. Built ${esc(now.toISOString().slice(0, 16).replace('T', ' '))} UTC from <code>inventory/inventory.csv</code> + <code>inventory/ledger.csv</code>. Change things with <code>node tools/inventory.mjs</code>.</p>
<p class="a-links"><a href="stock.csv" download>Export stock (CSV)</a> · <a href="ledger.csv" download>Export ledger (CSV)</a></p></header>
<main>
${errors.length ? `<section class="a-err" aria-label="Problems"><h2>Problems (${errors.length})</h2><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></section>` : '<p class="a-ok">Inventory and ledger reconcile. No rule violations.</p>'}
<section aria-labelledby="t-tot"><h2 id="t-tot">Per shop</h2><table class="a-tbl"><thead><tr><th>Shop</th><th>Products</th><th>SKUs</th>${STATUS_ORDER.map((s) => `<th>${esc(s.replace('_', ' '))}</th>`).join('')}<th>On hand</th><th>Reserved</th><th>Pre-orders owed</th><th>Low</th><th>Out</th></tr></thead><tbody>
${totals.map((t) => `<tr><th scope="row">${esc(bname(t.b))}</th>${cell(t.products)}${cell(t.skus)}${STATUS_ORDER.map((s) => cell(count(t.b, s))).join('')}${cell(t.on_hand)}${cell(t.reserved)}${cell(t.owed)}<td class="${t.low ? 'is-low' : ''}">${t.low}</td><td class="${t.out ? 'is-out' : ''}">${t.out}</td></tr>`).join('')}
</tbody></table></section>
<section aria-labelledby="t-sku"><h2 id="t-sku">Every SKU</h2>
<form class="a-filters" data-filters><label>Shop <select name="brand"><option value="">All shops</option>${ids.map((b) => `<option value="${esc(b)}">${esc(bname(b))}</option>`).join('')}</select></label>
<label>Status <select name="status"><option value="">Any status</option>${STATUS_ORDER.map((s) => `<option value="${s}">${s.replace('_', ' ')}</option>`).join('')}</select></label>
<label>Alerts <select name="alert"><option value="">All</option><option value="any">Low or out</option></select></label>
<label>Search <input name="q" type="search" placeholder="product or SKU"></label><output data-count>${rows.length} rows</output></form>
<div class="a-scroll"><table class="a-tbl a-skus"><thead><tr><th>Shop</th><th>Product</th><th>Variant</th><th>Status</th><th>Price</th><th>Fulfilment</th><th>On hand</th><th>Reserved</th><th>Available</th><th>Pre-orders / cap</th><th>Low at</th><th>Shows</th></tr></thead><tbody>
${rows.map((r) => `<tr data-brand="${esc(r.brand)}" data-status="${esc(r.status)}" data-alert="${esc(r.alert)}" data-q="${esc(`${r.sku} ${r.name}`.toLowerCase())}" class="${r.alert ? `is-${r.alert}` : ''}">${cell(bname(r.brand))}<td>${esc(r.name)}<br><code>${esc(r.product_id)}</code></td>${cell(r.variant)}${cell(r.status)}${cell(r.price_cents ? `$${(Number(r.price_cents) / 100).toFixed(2)}` : r.variant === '-' || r.status ? 'TBA' : '')}${cell(r.fulfilment)}${cell(r.on_hand)}${cell(r.reserved)}${cell(r.available)}${cell(r.preorder_sold !== '' ? `${r.preorder_sold}${r.preorder_cap ? ` / ${r.preorder_cap}` : ' / no cap'}` : '')}${cell(r.low_stock)}${cell(r.state)}</tr>`).join('')}
</tbody></table></div></section>
<section aria-labelledby="t-led"><h2 id="t-led">Recent ledger movements</h2>${recent.length ? `<table class="a-tbl"><thead><tr><th>When (UTC)</th><th>SKU</th><th>Kind</th><th>Qty</th><th>Ref</th><th>Order</th><th>Reason</th></tr></thead><tbody>${recent.map((m) => `<tr>${cell(m.ts.slice(0, 16).replace('T', ' '))}${cell(m.sku)}${cell(m.kind)}${cell(m.qty)}${cell(m.ref)}${cell(m.order)}${cell(m.reason)}</tr>`).join('')}</tbody></table>` : '<p>No movements yet. Stock arrives with <code>node tools/inventory.mjs receive &lt;sku&gt; qty=… po=…</code>.</p>'}</section>
${emails.length ? `<section aria-labelledby="t-em"><h2 id="t-em">Order email previews (sample order)</h2><ul class="a-emails">${emails.map((e) => `<li><a href="${esc(e.href)}">${esc(e.label)}</a></li>`).join('')}</ul></section>` : ''}
</main></body></html>
`;
  writeFileSync(join(outDir, 'index.html'), html);
  writeFileSync(join(outDir, 'admin.css'), `:root{--bg:#f6f5f1;--fg:#1b1b19;--mut:#6c6a63;--line:#d9d6cc;--low:#f3e3b5;--out:#f1cfc4;--ok:#dfe9d6}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
.a-head,main{max-width:1400px;margin:0 auto;padding:20px 16px}h1{font-size:24px;margin:0 0 6px}h2{font-size:17px;margin:28px 0 10px}
.a-note{color:var(--mut);margin:0}.a-links{margin:8px 0 0}a{color:inherit}code{font:12px/1.3 ui-monospace,Menlo,monospace}
.a-tbl{border-collapse:collapse;width:100%;background:#fff;border:1px solid var(--line);border-radius:2px}.a-tbl th,.a-tbl td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top;font-variant-numeric:tabular-nums}
.a-tbl thead th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--mut);background:#fbfaf7;position:sticky;top:0}
.a-scroll{overflow-x:auto;max-height:70vh;border:1px solid var(--line);border-radius:2px}.a-scroll .a-tbl{border:0}
tr.is-low td,td.is-low{background:var(--low)}tr.is-out td,td.is-out{background:var(--out)}tr.is-cap td{background:var(--low)}
.a-filters{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin:0 0 10px}.a-filters label{display:flex;flex-direction:column;font-size:12px;color:var(--mut);gap:3px}
.a-filters select,.a-filters input{font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:2px;background:#fff;min-width:150px}
.a-err{background:var(--out);border:1px solid #d9a99a;border-radius:2px;padding:4px 16px}.a-ok{background:var(--ok);border:1px solid #b9cdaa;border-radius:2px;padding:10px 14px}
.a-emails{columns:2}@media (max-width:640px){.a-emails{columns:1}.a-filters select,.a-filters input{min-width:0;width:100%}.a-filters label{flex:1 1 100%}}
`);
  writeFileSync(join(outDir, 'admin.js'), `(function(){var f=document.querySelector('[data-filters]');if(!f)return;var rows=[].slice.call(document.querySelectorAll('.a-skus tbody tr'));var out=f.querySelector('[data-count]');
function run(){var b=f.brand.value,s=f.status.value,a=f.alert.value,q=f.q.value.trim().toLowerCase(),n=0;rows.forEach(function(r){var ok=(!b||r.dataset.brand===b)&&(!s||r.dataset.status===s)&&(!a||r.dataset.alert)&&(!q||r.dataset.q.indexOf(q)>-1);r.hidden=!ok;if(ok)n++;});out.textContent=n+' rows';}
f.addEventListener('input',run);f.addEventListener('change',run);f.addEventListener('submit',function(e){e.preventDefault();});})();
`);
  return { out: outDir, rows: rows.length, errors: errors.length };
}
