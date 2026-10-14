// GET /api/availability?brand=<id> -> {products: {<id>: {"<colour>/<size>": {state, left, text}}}}
// Live per-SKU availability from the shared inventory + ledger (core/stock.mjs). Only buyable items, and only the
// shopper-facing state: "left" is present only when it is true and at or under the SKU's low-stock threshold.
// Root: INVENTORY_ROOT (default: the working directory). Read-only.
import { join } from 'node:path';
import { readBrandDir, productView } from '../core/catalog.mjs';
import { availText } from '../core/stock.mjs';

export function availabilityFor(brandId, root = process.env.INVENTORY_ROOT ?? process.cwd(), now = new Date()) {
  if (!/^[a-z0-9-]+$/.test(brandId ?? '')) return null;
  const { catalog, drops } = readBrandDir(join(root, 'brands', brandId), { now });
  const products = {};
  for (const p of catalog) {
    if (!['available', 'preorder'].includes(p.status) || !p.avail) continue;
    productView(p, drops, now); // throws on bad data
    products[p.id] = Object.fromEntries(Object.entries(p.avail).map(([k, a]) => [k, { state: a.state, left: a.left, text: availText(a) }]));
  }
  return { brand: brandId, at: now.toISOString(), products };
}

export default async function handler(req, res) {
  const send = (status, obj) => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(obj)); };
  if (req.method !== 'GET') return send(405, { error: 'GET only' });
  const brand = new URL(req.url ?? '/', 'http://x').searchParams.get('brand') ?? process.env.BRAND;
  try {
    const r = availabilityFor(brand);
    return r ? send(200, r) : send(400, { error: 'brand required' });
  } catch { return send(500, { error: 'store misconfigured' }); }
}
