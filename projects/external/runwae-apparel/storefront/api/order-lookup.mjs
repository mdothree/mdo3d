// POST /api/order-lookup  {order, email}  ->  {status, ship_by, tracking_url}
// TODO(orders): STUB until the order store exists (Stripe webhook -> order store). It validates input and
// answers 503 so the page can say lookup isn't open yet. When the store lands, look the order up by
// number AND email (both must match) and return only status, ship-by and tracking.
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export function lookupRequest(body) {
  const order = String(body?.order ?? '').trim().toUpperCase();
  const email = String(body?.email ?? '').trim().toLowerCase();
  if (!/^[A-Z0-9-]{4,40}$/.test(order)) return { status: 400, error: 'Enter the order number from your confirmation email.' };
  if (!EMAIL.test(email)) return { status: 400, error: 'Enter the email you ordered with.' };
  return { order, email };
}

export default async function handler(req, res) {
  const send = (status, obj) => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(obj)); };
  if (req.method !== 'POST') return send(405, { error: 'POST only' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return send(400, { error: 'bad JSON' }); } }
  const r = lookupRequest(body);
  if (r.error) return send(r.status, { error: r.error });
  return send(503, { error: 'Order lookup opens when the shop does.' });
}
