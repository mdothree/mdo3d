// Catalog loading, validation and the per-item availability states. Brand-agnostic.
//
// Product status (set per item in brands/<id>/catalog.json):
//   available       add to bag
//   preorder        add to bag + ship-by date (from the item's drop window)
//   next_drop       "Opens <date>" (or "Next drop") + Notify me; no buy control
//   in_development  "Concept · not yet available"; no buy control
//   archive         "Archive · <year>"; only for pieces that really existed (archive_year required)
//   sold_out        "Sold out" (+ optional Notify me for a restock). Allowed ONLY with real backing:
//                   an internal `sales_record` {channel, note} (never rendered) or sold_count >= stock.
//                   The build refuses a sold_out item without one. No fake scarcity.
//   live | draft    pre-seed spellings, still accepted (live = available, or preorder on channel "preorder")
// Price: price_cents null renders "Price TBA". Checkout stays off unless the brand is live AND a Stripe test
// (or explicitly allowed live) key is configured server-side.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { shipBy, windowState, isoDay, purchasable } from './drop.mjs';
import { fmtDay } from './cart.mjs';

// Print placement (design rules, Principal 2026-10-14; see SEED.md):
//  1. Shirt-sized art goes on the BACK ("if the art is large like the size of the shirt it should be on the back").
//  2. Chest icons are MEDIUM ("chest icons should be medium sized, not overly large").
// item.print: one {placement, size} or an array of them ([] = unbranded). Archive pieces are historical and exempt.
export const PRINT_PLACEMENTS = Object.freeze({ back: 'Back', front_chest: 'Chest', sleeve: 'Sleeve', neck: 'Neck', cuff: 'Cuff', pocket: 'Pocket', front_panel: 'Front panel', hood: 'Hood' });
export const PRINT_SIZES = Object.freeze({ full_back: 'full size', back_medium: 'medium', chest_medium: 'medium', patch_medium: 'medium patch', panel_medium: 'medium', half_front: 'half front', label: 'label' });
export const printList = (p) => (p.print == null ? [] : Array.isArray(p.print) ? p.print : [p.print]);
export function printLabel(x) {
  const where = x.placement === 'back' ? 'Back print' : x.placement === 'front_chest' ? 'Chest mark' : x.placement === 'front_panel' ? 'Front panel print' : `${PRINT_PLACEMENTS[x.placement] ?? x.placement} ${x.size === 'label' ? '' : 'mark'}`.trim();
  return x.size === 'label' ? `${PRINT_PLACEMENTS[x.placement] ?? x.placement} label` : `${where} · ${PRINT_SIZES[x.size] ?? x.size}`;
}
/** Errors for one item's print spec (empty = ok). */
export function printErrors(p) {
  const errs = [];
  if (p.status === 'archive') return errs;
  if (p.listed !== false && p.print === undefined) errs.push(`${p.id}: print spec missing (print: {placement, size}, or [] if unbranded)`);
  for (const x of printList(p)) {
    if (!PRINT_PLACEMENTS[x?.placement]) errs.push(`${p.id}: unknown print placement "${x?.placement}"`);
    if (/^full/.test(x?.size ?? '') && x.placement !== 'back') errs.push(`${p.id}: shirt-sized art must be on the back (placement "back")`);
    else if (!PRINT_SIZES[x?.size]) errs.push(`${p.id}: print size "${x?.size}" not allowed (chest marks must be chest_medium)`);
    if (x?.size === 'half_front' && x.placement !== 'front_panel') errs.push(`${p.id}: half_front art belongs on a front_panel`);
    if (x?.placement === 'front_chest' && x.size !== 'chest_medium') errs.push(`${p.id}: chest marks must be chest_medium, not "${x.size}"`);
  }
  return errs;
}

export const STATUSES = Object.freeze(['available', 'preorder', 'next_drop', 'in_development', 'archive', 'sold_out', 'live', 'draft']);

export function readBrandDir(dir) {
  const read = (f, d) => (existsSync(join(dir, f)) ? JSON.parse(readFileSync(join(dir, f), 'utf8')) : d);
  const brand = read('brand.json');
  const catalog = read('catalog.json', { products: [] }).products ?? [];
  const drops = read('drops.json', { drops: [] }).drops ?? [];
  const manifest = read('assets/manifest.json', {});
  return { dir, brand, catalog, drops, manifest };
}

/** True only when the data really backs a "Sold out" label. */
export function soldOutBacked(p) {
  const rec = p.sales_record;
  if (rec && typeof rec === 'object' && typeof rec.channel === 'string' && rec.channel.trim()) return true;
  return Number.isInteger(p.stock) && p.stock >= 0 && Number.isInteger(p.sold_count) && p.sold_count >= p.stock;
}

/** Throws on catalog data the shop must never render. palette (brand.json `palette`, optional): the only colour
 *  ids current items may use; archive pieces keep their original colours. */
export function validateCatalog(products, drops = [], palette = null) {
  const errors = [];
  if (Array.isArray(palette)) for (const p of products) {
    if (p.status === 'archive' || p.listed === false) continue;
    for (const c of p.colors ?? []) if (!palette.includes(c.id)) errors.push(`${p.id}: colour "${c.id}" is off-palette (${palette.join(', ')})`);
  }
  const ids = new Set();
  for (const p of products) {
    if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) errors.push(`bad id: ${p.id}`);
    if (ids.has(p.id)) errors.push(`duplicate id: ${p.id}`);
    ids.add(p.id);
    if (!STATUSES.includes(p.status)) errors.push(`${p.id}: unknown status "${p.status}"`);
    if (p.status === 'sold_out' && !soldOutBacked(p)) errors.push(`${p.id}: sold_out needs a sales_record or sold_count >= stock`);
    if (p.status === 'archive' && !Number.isInteger(p.archive_year)) errors.push(`${p.id}: archive needs archive_year (pieces that really existed only)`);
    if (p.status === 'preorder' && !drops.some((d) => d.products.includes(p.id))) errors.push(`${p.id}: preorder needs a drop in drops.json`);
    errors.push(...printErrors(p));
    if (p.price_cents != null && (!Number.isInteger(p.price_cents) || p.price_cents <= 0)) errors.push(`${p.id}: price_cents must be a positive integer or null`);
  }
  if (errors.length) throw new Error(`catalog invalid:\n  ${errors.join('\n  ')}`);
  return true;
}

const dropFor = (p, drops) => drops.find((d) => d.products.includes(p.id)) ?? null;

/** Everything a page needs to show one item's state. Pure. */
export function productView(p, drops, now = new Date()) {
  const status = p.status === 'live' ? (p.channel === 'preorder' ? 'preorder' : 'available') : p.status === 'draft' ? 'in_development' : p.status;
  const drop = dropFor(p, drops);
  const price_cents = Number.isInteger(p.price_cents) ? p.price_cents : null;
  const buy = purchasable(p, drops, now);
  const v = { status, price_cents, priceText: price_cents === null ? 'Price TBA' : `$${(price_cents / 100).toFixed(2)}`, canAdd: false, notify: false, preorder: false, drop: drop?.id ?? null, ship_by: null, checkoutReady: buy.ok, label: '', note: '' };
  switch (status) {
    case 'available':
      v.canAdd = true; v.label = 'Available';
      break;
    case 'preorder': {
      v.preorder = true;
      const w = drop ? windowState(drop, now) : 'unscheduled';
      const sb = drop?.window?.close ? shipBy(drop.window.close, drop.schedule).shipBy : null;
      v.ship_by = sb;
      if (w === 'closed') { v.label = 'Pre-order closed'; v.note = 'This pre-order window has closed.'; v.notify = true; break; }
      if (w === 'upcoming') { v.label = `Pre-order opens ${fmtDay(isoDay(drop.window.open))}`; v.notify = true; v.note = sb ? `Ships by ${fmtDay(sb)}.` : ''; break; }
      v.canAdd = true;
      v.label = 'Pre-order';
      v.note = sb ? `Made after the window closes. Ships by ${fmtDay(sb)}.` : 'Made after the pre-order window closes. The ship-by date is set when the window opens.';
      break;
    }
    case 'next_drop': {
      const opens = p.opens ?? drop?.window?.open ?? null;
      v.label = opens ? `Opens ${fmtDay(isoDay(opens))}` : 'Next drop';
      v.note = opens ? '' : 'Opening date to be announced.';
      v.notify = true;
      break;
    }
    case 'in_development':
      v.label = 'Concept · not yet available';
      break;
    case 'archive':
      v.label = `Archive · ${p.archive_year}`;
      break;
    case 'sold_out':
      if (!soldOutBacked(p)) throw new Error(`${p.id}: sold_out without a sales_record or sold_count >= stock`);
      v.label = 'Sold out';
      v.notify = p.restock_notify !== false;
      break;
    default:
      v.label = 'Coming soon';
  }
  if (!['available', 'preorder'].includes(status)) v.priceText = price_cents === null ? '' : v.priceText;
  return v;
}

/** Public data for window.SEED (cart page, add-to-bag). No internal fields (sales_record, stock, notes). */
export function publicCatalog(products, drops, now, { imageFor, urlFor }) {
  const out = {};
  for (const p of products) {
    const v = productView(p, drops, now);
    out[p.id] = {
      name: p.name, url: urlFor(p), image: imageFor(p), status: v.status, price_cents: v.price_cents,
      canAdd: v.canAdd, preorder: v.preorder, drop: v.drop, ship_by: v.ship_by,
      sizes: p.sizes ?? [], colors: (p.colors ?? []).map((c) => ({ id: c.id, name: c.name })),
    };
  }
  return out;
}
