// POST /api/notify  {brand, product, email}  ->  {ok}
// "Notify me" for next_drop / sold_out pieces.
// TODO(store): this is a STUB. It appends one JSON line per sign-up to a local file (NOTIFY_LOG, default
// data/notify.jsonl) so the flow can be exercised locally. Serverless filesystems are read-only, so before
// any deploy swap appendFileSync for the real list (and add double opt-in + an unsubscribe link).
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

/** Validate a sign-up. Pure: unit-tested. */
export function notifyRecord(body, now = new Date()) {
  const brand = String(body?.brand ?? '');
  const product = String(body?.product ?? '');
  const email = String(body?.email ?? '').trim().toLowerCase();
  if (!/^[a-z0-9-]{1,40}$/.test(brand) || !/^[a-z0-9-]{1,80}$/.test(product)) return { status: 400, error: 'brand and product are required' };
  if (!EMAIL.test(email) || email.length > 254) return { status: 400, error: 'Please enter a valid email address.' };
  return { record: { at: now.toISOString(), brand, product, email } };
}

export default async function handler(req, res) {
  const send = (status, obj) => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(obj)); };
  if (req.method !== 'POST') return send(405, { error: 'POST only' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return send(400, { error: 'bad JSON' }); } }
  const r = notifyRecord(body);
  if (r.error) return send(r.status, { error: r.error });
  const file = process.env.NOTIFY_LOG || 'data/notify.jsonl';
  try {
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, JSON.stringify(r.record) + '\n');
  } catch {
    return send(503, { error: 'Sign-ups are not open yet.' });
  }
  return send(200, { ok: true });
}
