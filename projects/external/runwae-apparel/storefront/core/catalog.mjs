// Catalog loading, validation and the per-item availability states. Brand-agnostic.
//
// Product status (set per item in brands/<id>/catalog.json):
//   available       add to bag
//   preorder        add to bag + ship-by date (from the item's drop window)
//   next_drop       "Opens <date>" (or "Next drop") + Notify me; no buy control
//   in_development  "Concept · not yet available"; no buy control
//   unavailable     "Not available"; no buy control, no Notify me, no price line (the pre-launch default)
//   archive         "Archive · <year>"; only for pieces that really existed (archive_year required)
//   sold_out        "Sold out" (+ optional Notify me for a restock). Allowed ONLY with real backing:
//                   an internal `sales_record` {channel, note} (never rendered) or sold_count >= stock.
//                   The build refuses a sold_out item without one. No fake scarcity.
//   live | draft    pre-seed spellings, still accepted (live = available, or preorder on channel "preorder")
// Release-managed items (catalog `release`: {state, window, reserve_limit?, reason?}; Principal 2026-10-26, every shop).
// Four states, set per product in data:
//   order     in stock: the normal buy box. Needs the inventory status `available` and checkout open.
//   preorder  accepting pre-orders: paid, ship window shown. Needs inventory `preorder` and checkout open.
//   reserve   pre-orders will be limited and orders aren't open yet: free, email only, holds a PLACE (not an
//             order). Optional reserve_limit: at that many reservations new sign-ups join the waitlist (the server
//             counts; the page switches in the browser).
//   waitlist  not taking reservations (or reservations full): a notify list, with the reason on the page
//             (release.reason, else the brand's default line).
// order/preorder with checkout closed render as waitlist, so they stay wired but off until CHECKOUT_ENABLED.
// Every label, button and helper line comes from brand.json `release_states` over RELEASE_COPY below.
// Price: price_cents null renders "Price TBA". Checkout stays off unless the brand is live AND a Stripe test
// (or explicitly allowed live) key is configured server-side.
import { readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { readInventory, mergeInventory } from './inventory.mjs';
import { readLedger, replay, availability, availText } from './stock.mjs';
import { shipBy, windowState, isoDay, purchasable } from './drop.mjs';
import { fmtDay } from './cart.mjs';

// Print placement (design rules, Principal 2026-10-14; see SEED.md):
//  1. Shirt-sized art goes on the BACK ("if the art is large like the size of the shirt it should be on the back")
//     for brands whose brand.json sets print_rules.large_art = "back_only". Other brands may also carry large
//     art on the front panel (size full_front, placement front_panel). Principal 2026-10-14: back-only applies to one brand only.
//  2. Chest icons are MEDIUM for every brand ("chest icons should be medium sized, not overly large").
// item.print: one {placement, size} or an array of them ([] = unbranded). Archive pieces are historical and exempt.
export const PRINT_PLACEMENTS = Object.freeze({ back: 'Back', front_chest: 'Chest', sleeve: 'Sleeve', neck: 'Neck', cuff: 'Cuff', pocket: 'Pocket', front_panel: 'Front panel', hood: 'Hood', leg: 'Leg' });
export const PRINT_SIZES = Object.freeze({ full_back: 'full size', full_front: 'full size', back_medium: 'medium', chest_medium: 'medium', patch_medium: 'medium patch', panel_medium: 'medium', half_front: 'half front', label: 'label' });
export const printList = (p) => (p.print == null ? [] : Array.isArray(p.print) ? p.print : [p.print]);
export function printLabel(x) {
  const where = x.placement === 'back' ? 'Back print' : x.placement === 'front_chest' ? 'Chest mark' : x.placement === 'front_panel' ? 'Front panel print' : `${PRINT_PLACEMENTS[x.placement] ?? x.placement} ${x.size === 'label' ? '' : 'mark'}`.trim();
  return x.size === 'label' ? `${PRINT_PLACEMENTS[x.placement] ?? x.placement} label` : `${where} · ${PRINT_SIZES[x.size] ?? x.size}`;
}
/** Errors for one item's print spec (empty = ok). */
export function printErrors(p, rules = {}) {
  const errs = [];
  const backOnly = rules.large_art === 'back_only';
  if (p.status === 'archive') return errs;
  if (p.listed !== false && p.print === undefined) errs.push(`${p.id}: print spec missing (print: {placement, size}, or [] if unbranded)`);
  for (const x of printList(p)) {
    if (!PRINT_PLACEMENTS[x?.placement]) errs.push(`${p.id}: unknown print placement "${x?.placement}"`);
    const full = /^full/.test(x?.size ?? '');
    if (full && backOnly && x.placement !== 'back') errs.push(`${p.id}: shirt-sized art must be on the back (placement "back")`);
    else if (x?.size === 'full_back' && x.placement !== 'back') errs.push(`${p.id}: full_back belongs on the back`);
    else if (x?.size === 'full_front' && x.placement !== 'front_panel') errs.push(`${p.id}: large front art (full_front) belongs on the front_panel`);
    else if (!PRINT_SIZES[x?.size]) errs.push(`${p.id}: print size "${x?.size}" not allowed (chest marks must be chest_medium)`);
    if (x?.size === 'half_front' && x.placement !== 'front_panel') errs.push(`${p.id}: half_front art belongs on a front_panel`);
    if (x?.placement === 'front_chest' && x.size !== 'chest_medium') errs.push(`${p.id}: chest marks must be chest_medium, not "${x.size}"`);
  }
  return errs;
}

export const RELEASE_STATES = Object.freeze(['order', 'preorder', 'reserve', 'waitlist']);
/** Errors for one item's release spec (empty = ok). */
export function releaseErrors(p) {
  const r = p.release;
  if (r == null) return [];
  const errs = [];
  if (!RELEASE_STATES.includes(r.state)) errs.push(`${p.id}: release.state must be one of ${RELEASE_STATES.join(', ')}`);
  if (typeof r.window !== 'string' || !r.window.trim()) errs.push(`${p.id}: release.window is required (an honest window, e.g. "2027")`);
  if (r.reserve_limit != null && !(Number.isInteger(r.reserve_limit) && r.reserve_limit >= 0)) errs.push(`${p.id}: release.reserve_limit must be a whole number >= 0 (leave it out for no limit)`);
  if (r.reason != null && typeof r.reason !== 'string') errs.push(`${p.id}: release.reason must be text`);
  return errs;
}

export const STATUSES = Object.freeze(['available', 'preorder', 'next_drop', 'in_development', 'archive', 'sold_out', 'unavailable', 'live', 'draft']);

/** brands/<id>/ + the shared inventory (inventory/inventory.csv at the storefront root) -> merged brand data.
 *  merge:false returns the raw catalog/drops (no inventory fields). now: for live availability from the ledger. */
export function readBrandDir(dir, { merge = true, now = new Date() } = {}) {
  const read = (f, d) => (existsSync(join(dir, f)) ? JSON.parse(readFileSync(join(dir, f), 'utf8')) : d);
  const brand = read('brand.json');
  const catalog = read('catalog.json', { products: [] }).products ?? [];
  const drops = read('drops.json', { drops: [] }).drops ?? [];
  const manifest = read('assets/manifest.json', {});
  if (!merge) return { dir, brand, catalog, drops, manifest };
  const root = join(dir, '..', '..');
  const id = basename(dir);
  const m = mergeInventory(id, readInventory(root), catalog, drops);
  const state = replay(readLedger(root), now);
  for (const p of m.products) {
    p.avail = Object.fromEntries(Object.entries(p.skus).map(([v, sku]) => [v, availability(sku, state.get(`${id}/${p.id}/${v}`))]));
  }
  return { dir, brand, catalog: m.products, drops: m.drops, manifest, rawCatalog: catalog, rawDrops: drops };
}

/** Product-level availability from its SKUs (p.avail, set by readBrandDir). null when nothing is tracked.
 *  {any: something can be bought, text: what the product page says before a size is chosen, state}. */
export function stockSummary(p) {
  const list = Object.values(p.avail ?? {});
  if (!list.length) return null;
  const open = list.filter((a) => a.available > 0);
  if (!open.length) {
    const st = list.every((a) => a.state === 'sold_out') ? 'sold_out' : list.some((a) => a.state === 'preorder_full') ? 'preorder_full' : list.some((a) => a.state === 'sold_out') ? 'sold_out' : 'not_in_stock';
    return { any: false, state: st, text: availText({ state: st }) };
  }
  const text = list.length === 1 ? availText(open[0])
    : open.every((a) => a.state === 'preorder') ? 'Pre-order'
      : open.every((a) => a.state === 'pod') ? 'Made to order' : 'In stock';
  return { any: true, state: list.length === 1 ? open[0].state : 'mixed', text: text + (open.length < list.length ? ' · some sizes unavailable' : '') };
}

/** True only when the data really backs a "Sold out" label. */
export function soldOutBacked(p) {
  const rec = p.sales_record;
  if (rec && typeof rec === 'object' && typeof rec.channel === 'string' && rec.channel.trim()) return true;
  return Number.isInteger(p.stock) && p.stock >= 0 && Number.isInteger(p.sold_count) && p.sold_count >= p.stock;
}

/** Throws on catalog data the shop must never render. palette (brand.json `palette`, optional): the only colour
 *  ids current items may use; archive pieces keep their original colours. */
export function validateCatalog(products, drops = [], palette = null, printRules = {}) {
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
    errors.push(...printErrors(p, printRules));
    errors.push(...releaseErrors(p));
    if (p.price_cents != null && (!Number.isInteger(p.price_cents) || p.price_cents <= 0)) errors.push(`${p.id}: price_cents must be a positive integer or null`);
  }
  if (errors.length) throw new Error(`catalog invalid:\n  ${errors.join('\n  ')}`);
  return true;
}

const dropFor = (p, drops) => drops.find((d) => d.products.includes(p.id)) ?? null;

/** Default release copy (every shop). A brand overrides any line in brand.json `release_states`.
 *  Placeholders: {window} = the item's release.window, {limit} = its reserve_limit, {priority_window} = reserve.priority_window. */
export const RELEASE_COPY = Object.freeze({
  order: { tag: 'In stock', status: 'In stock', button: 'Add to bag', helper: 'In stock. The ship date shows at checkout.' },
  preorder: { tag: 'Pre-order', status: 'Pre-order · ships {window}', button: 'Pre-order', helper: 'Paid now, made after the pre-order window closes. Ships {window}.' },
  reserve: { tag: 'Reserve', status: 'Reserve · planned for {window}', button: 'Reserve', helper: "Reserving holds your place. It isn't an order and you won't be charged.",
    terms: 'Places are kept in the order they arrive. When orders open, everyone who reserved gets a {priority_window} head start by email before the public.',
    priority_window: '48-hour', done: "Your place is held. We'll email you before orders open to everyone.", consent: 'We use your email only for this reservation. Unsubscribe any time.', price_suffix: '· planned price' },
  waitlist: { tag: 'Waitlist', status: 'Waitlist · planned for {window}', button: 'Join the waitlist', reason: "Not taking reservations yet.", helper: "We'll email you when it's available to reserve or order.",
    done: "You're on the waitlist. We'll email you when it's available to reserve or order.", consent: 'We use your email only for this waitlist. Unsubscribe any time.', price_suffix: '· planned price' },
  waitlist_full: { reason: 'All {limit} reservations are taken.' },
});
/** brand.json release_states merged over the defaults, one state at a time. */
export const releaseCopy = (brandStates = {}) => Object.fromEntries(Object.entries(RELEASE_COPY).map(([k, d]) => [k, { ...d, ...(brandStates?.[k] ?? {}) }]));
export const fillRelease = (t, r, copy) => String(t ?? '').replaceAll('{window}', r?.window ?? '').replaceAll('{limit}', String(r?.reserve_limit ?? ''))
  .replaceAll('{priority_window}', copy?.reserve?.priority_window ?? '').trim();

/** Everything a page needs to show one item's state. Pure.
 *  opts.checkout: checkout is open for this build; opts.release: brand.json `release_states` (release-managed items). */
export function productView(p, drops, now = new Date(), opts = {}) {
  const v = productViewBase(p, drops, now);
  if (!p.release) return v;
  const r = p.release;
  const copy = releaseCopy(opts.release);
  const open = opts.checkout === true && v.canAdd;
  const st = r.state === 'order' && open && v.status === 'available' ? 'order'
    : r.state === 'preorder' && open && v.status === 'preorder' ? 'preorder'
      : r.state === 'reserve' ? 'reserve' : 'waitlist';
  const f = (t) => fillRelease(t, r, copy);
  const c = copy[st];
  const wl = copy.waitlist;
  v.release = { state: st, list: st === 'reserve' ? 'reserve' : 'waitlist', window: r.window, limit: Number.isInteger(r.reserve_limit) ? r.reserve_limit : null,
    tag: f(c.tag), status: f(c.status), button: f(c.button), helper: f(c.helper), terms: f(c.terms), done: f(c.done), consent: f(c.consent),
    reason: st === 'waitlist' ? (r.reason?.trim() || f(wl.reason)) : '',
    // reserve with a limit: the waitlist copy the page switches to when the server says the reservations are full
    full: st === 'reserve' && Number.isInteger(r.reserve_limit) ? { tag: f(wl.tag), status: f(wl.status), reason: f(copy.waitlist_full.reason), plainHelper: f(wl.helper), button: f(wl.button), helper: `${f(copy.waitlist_full.reason)} ${f(wl.helper)}`.trim(), done: f(wl.done), consent: f(wl.consent) } : null };
  v.label = v.release.status || v.label;
  if (st === 'order' || st === 'preorder') {
    v.note = [v.release.helper, v.note].filter(Boolean).join(' ');
    return v;
  }
  // Reserve / waitlist: email only, never addable, whatever the inventory says.
  v.canAdd = false; v.preorder = false; v.notify = true;
  v.note = v.release.reason;
  if (v.price_cents !== null) v.priceText = [v.priceText, f(c.price_suffix)].filter(Boolean).join(' ');
  return v;
}
function productViewBase(p, drops, now) {
  const status = p.status === 'live' ? (p.channel === 'preorder' ? 'preorder' : 'available') : p.status === 'draft' ? 'in_development' : p.status;
  const drop = dropFor(p, drops);
  const price_cents = Number.isInteger(p.price_cents) ? p.price_cents : null;
  const buy = purchasable(p, drops, now);
  const v = { status, price_cents, priceText: price_cents === null ? 'Price TBA' : `$${(price_cents / 100).toFixed(2)}`, canAdd: false, notify: false, preorder: false, drop: drop?.id ?? null, ship_by: null, checkoutReady: buy.ok, label: '', note: '' };
  const stock = stockSummary(p);
  if (stock && ['available', 'preorder'].includes(status) && !stock.any) {
    // Real stock reached 0 (or a pre-order cap filled): no add to bag, honest label, notify for a restock.
    v.label = stock.text; v.notify = p.restock_notify !== false; v.stock = stock;
    v.priceText = price_cents === null ? '' : v.priceText;
    return v;
  }
  v.stock = stock;
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
    case 'unavailable':
      v.label = 'Not available';
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
export function publicCatalog(products, drops, now, { imageFor, urlFor, viewOpts = {} }) {
  const out = {};
  for (const p of products) {
    const v = productView(p, drops, now, viewOpts);
    out[p.id] = {
      name: p.name, url: urlFor(p), image: imageFor(p), status: v.status, price_cents: v.price_cents,
      canAdd: v.canAdd, preorder: v.preorder, drop: v.drop, ship_by: v.ship_by,
      sizes: p.sizes ?? [], colors: (p.colors ?? []).map((c) => ({ id: c.id, name: c.name })),
      // Per-SKU availability for buyable items: state + "left" only when it is true and low. No counts otherwise.
      ...(v.canAdd ? { avail: Object.fromEntries(Object.entries(p.avail ?? {}).map(([k, a]) => [k, { state: a.state, left: a.left, text: availText(a) }])) } : {}),
    };
  }
  return out;
}
