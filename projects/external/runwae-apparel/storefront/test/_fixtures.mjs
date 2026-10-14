// Test helpers: a temp storefront root with brands + a shared inventory.
import { mkdirSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { COLUMNS, toCsv, variantsOf } from '../core/inventory.mjs';
import { LEDGER_COLUMNS } from '../core/stock.mjs';

/** rows for one brand: statuses {productId: status|{status, drop, price, fulfilment, cap, low, stock, channel}}. */
export function rowsFor(brandId, products, statuses = {}) {
  const rows = [];
  for (const p of products) {
    const s = typeof statuses[p.id] === 'string' ? { status: statuses[p.id] } : (statuses[p.id] ?? { status: 'in_development' });
    rows.push({ ...Object.fromEntries(COLUMNS.map((c) => [c, ''])), brand: brandId, product_id: p.id, variant: '-', status: s.status, price_cents: s.price ?? '', drop_id: s.drop ?? '', sales_record_channel: s.channel ?? '', notes: s.notes ?? '' });
    if (['available', 'preorder'].includes(s.status) || s.fulfilment) {
      const f = s.fulfilment ?? (s.status === 'preorder' ? 'preorder' : 'pod');
      for (const v of variantsOf(p)) rows.push({ ...Object.fromEntries(COLUMNS.map((c) => [c, ''])), brand: brandId, product_id: p.id, variant: v, fulfilment: f, stock: f === 'stock' ? String(s.stock ?? 0) : '', preorder_cap: s.cap ?? '', low_stock: s.low ?? '' });
    }
  }
  return rows;
}
export const writeInv = (root, rows) => { mkdirSync(join(root, 'inventory'), { recursive: true }); writeFileSync(join(root, 'inventory', 'inventory.csv'), toCsv(rows)); };
export const writeLedger = (root, rows = []) => { mkdirSync(join(root, 'inventory'), { recursive: true }); writeFileSync(join(root, 'inventory', 'ledger.csv'), toCsv(rows, LEDGER_COLUMNS)); };

/** Copy brands/_template to <root>/brands/<id> and give it an inventory (example-tee on pre-order). */
export function templateRoot(ROOT, root, id = 'demo', statuses = { 'example-tee': { status: 'preorder', drop: 'first-drop' } }) {
  mkdirSync(join(root, 'brands'), { recursive: true });
  cpSync(join(ROOT, 'brands', '_template'), join(root, 'brands', id), { recursive: true });
  const cat = JSON.parse(readFileSync(join(root, 'brands', id, 'catalog.json'), 'utf8')).products;
  writeInv(root, rowsFor(id, cat, statuses));
  writeLedger(root);
  return { root, catalogPath: join(root, 'brands', id, 'catalog.json') };
}
