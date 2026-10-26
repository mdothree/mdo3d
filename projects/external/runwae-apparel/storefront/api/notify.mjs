// /api/notify: email sign-ups for every shop. Brand-agnostic.
//   POST {brand, product, email}  ->  {ok, list, reason, created}
//   GET  ?brand=&product=         ->  {list, reason}   (which list a new sign-up would join; no counts, no emails)
//
// Lists: "notify" (plain Notify me: next_drop / sold_out pieces) and, for release-managed items (catalog `release`,
// see core/catalog.mjs), "reserve" or "waitlist". The server decides the list from brands/<brand>/catalog.json; the
// client's choice is ignored. Waitlist reasons: not_accepting (state waitlist, or order/preorder while checkout is
// closed) and full (reserve_limit reached). Sign-ups are kept in arrival order (seq) so the
// waitlist can be emailed first when reservations open. Nothing is emailed from here; export with
// `node tools/signups.mjs export` and send only with the Principal's OK.
//
// Store (the first one configured wins):
//   Cloudflare D1   CLOUDFLARE_ACCOUNT_ID + NOTIFY_D1_DATABASE_ID + NOTIFY_D1_TOKEN (D1 edit). One SQL statement
//                   per sign-up decides reserve-or-waitlist and inserts, so two people can't both take the last slot.
//   JSONL file      NOTIFY_LOG (default data/notify.jsonl). Count + append run synchronously in one process
//                   (local and tests). Serverless filesystems are read-only: there the file store fails and the API
//                   answers 503 ("nothing was saved"), never a false success.
import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const BRAND = /^[a-z0-9-]{1,40}$/;
const ID = /^[a-z0-9-]{1,80}$/;

/** Validate a sign-up. Pure: unit-tested. */
export function notifyRecord(body, now = new Date()) {
  const brand = String(body?.brand ?? '');
  const product = String(body?.product ?? '');
  const email = String(body?.email ?? '').trim().toLowerCase();
  if (!BRAND.test(brand) || !ID.test(product)) return { status: 400, error: 'brand and product are required' };
  if (!EMAIL.test(email) || email.length > 254) return { status: 400, error: 'Please enter a valid email address.' };
  return { record: { at: now.toISOString(), brand, product, email } };
}

/** The product's `release` spec from brands/<brand>/catalog.json (null: a plain notify item or unknown product). */
export function releaseOf(brand, product, root = process.env.STOREFRONT_ROOT || ROOT) {
  if (!BRAND.test(brand)) return null;
  const f = join(root, 'brands', brand, 'catalog.json');
  if (!existsSync(f)) return null;
  try { return JSON.parse(readFileSync(f, 'utf8')).products?.find((p) => p.id === product)?.release ?? null; } catch { return null; }
}

/** Which list a new sign-up joins, given how many reservations already exist. Pure.
 *  Only `reserve` items take reservations (up to reserve_limit); every other release state is a waitlist. */
export function listFor(release, reserved = 0) {
  if (!release) return { list: 'notify', reason: '' };
  if (release.state !== 'reserve') return { list: 'waitlist', reason: 'not_accepting' };
  const lim = release.reserve_limit;
  if (Number.isInteger(lim) && reserved >= lim) return { list: 'waitlist', reason: 'full' };
  return { list: 'reserve', reason: '' };
}

/** JSONL store. add() reads, counts and appends with no await in between: atomic within one Node process. */
export function fileStore(file) {
  const rows = () => (existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []);
  const reservedOf = (all, brand, product) => all.filter((r) => r.brand === brand && r.product === product && r.list === 'reserve').length;
  return {
    kind: 'file',
    async add(rec, release) {
      const all = rows();
      const same = all.find((r) => r.brand === rec.brand && r.product === rec.product && r.email === rec.email);
      if (same) return { list: same.list ?? 'notify', reason: same.reason ?? '', created: false };
      const pick = listFor(release, reservedOf(all, rec.brand, rec.product));
      mkdirSync(dirname(file), { recursive: true });
      appendFileSync(file, JSON.stringify({ seq: all.length + 1, ...rec, ...pick }) + '\n');
      return { ...pick, created: true };
    },
    async reserved(brand, product) { return reservedOf(rows(), brand, product); },
    async all() { return rows(); },
  };
}

// The D1 table; seq keeps arrival order (the waitlist is emailed in that order when reservations open).
export const D1_SCHEMA = "CREATE TABLE IF NOT EXISTS signups (seq INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, brand TEXT NOT NULL, product TEXT NOT NULL, email TEXT NOT NULL, list TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '', UNIQUE (brand, product, email))";
// One statement counts the reservations and inserts in the same write, so the last slot goes to exactly one person.
// ?4 = list before counting (reserve | waitlist | notify), ?5 = its reason, ?6 = reserve_limit (NULL = no limit).
const FULL = "?4 = 'reserve' AND ?6 IS NOT NULL AND (SELECT COUNT(*) FROM signups WHERE brand = ?1 AND product = ?2 AND list = 'reserve') >= ?6";
export const D1_INSERT = `INSERT INTO signups (brand, product, email, list, reason, at)
SELECT ?1, ?2, ?3, CASE WHEN ${FULL} THEN 'waitlist' ELSE ?4 END, CASE WHEN ${FULL} THEN 'full' ELSE ?5 END, ?7
WHERE true ON CONFLICT (brand, product, email) DO NOTHING`;

/** Cloudflare D1 store over the REST API (fetch only; no SDK). */
export function d1Store({ account, database, token, fetchImpl = globalThis.fetch }) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`;
  const q = async (sql, params = []) => {
    const r = await fetchImpl(url, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ sql, params }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.success === false) throw new Error(`d1 ${r.status}`);
    return j.result?.[0]?.results ?? [];
  };
  let ready = null;
  const init = () => (ready ??= q(D1_SCHEMA).catch((e) => { ready = null; throw e; }));
  return {
    kind: 'd1',
    async add(rec, release) {
      await init();
      const pre = listFor(release, 0); // waitlist / notify never depend on the count
      const lim = pre.list === 'reserve' && Number.isInteger(release?.reserve_limit) ? release.reserve_limit : null;
      await q(D1_INSERT, [rec.brand, rec.product, rec.email, pre.list, pre.reason, lim, rec.at]);
      const row = (await q('SELECT list, reason FROM signups WHERE brand = ?1 AND product = ?2 AND email = ?3', [rec.brand, rec.product, rec.email]))[0] ?? {};
      return { list: row.list ?? pre.list, reason: row.reason ?? '', created: true };
    },
    async reserved(brand, product) {
      await init();
      return Number((await q("SELECT COUNT(*) AS n FROM signups WHERE brand = ?1 AND product = ?2 AND list = 'reserve'", [brand, product]))[0]?.n ?? 0);
    },
    async all() { await init(); return q('SELECT seq, at, brand, product, email, list, reason FROM signups ORDER BY seq'); },
  };
}

/** The configured store (D1 when its three env vars are set, else the JSONL file). */
export function storeFrom(env = process.env) {
  if (env.CLOUDFLARE_ACCOUNT_ID && env.NOTIFY_D1_DATABASE_ID && env.NOTIFY_D1_TOKEN) {
    return d1Store({ account: env.CLOUDFLARE_ACCOUNT_ID, database: env.NOTIFY_D1_DATABASE_ID, token: env.NOTIFY_D1_TOKEN });
  }
  return fileStore(env.NOTIFY_LOG || 'data/notify.jsonl');
}

export default async function handler(req, res, { store = null } = {}) {
  const send = (status, obj) => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(obj)); };
  const s = store ?? storeFrom();
  if (req.method === 'GET') {
    const u = new URL(req.url ?? '/', 'http://x');
    const brand = u.searchParams.get('brand') ?? '';
    const product = u.searchParams.get('product') ?? '';
    if (!BRAND.test(brand) || !ID.test(product)) return send(400, { error: 'brand and product are required' });
    const release = releaseOf(brand, product);
    let reserved = 0;
    if (release && Number.isInteger(release.reserve_limit)) {
      try { reserved = await s.reserved(brand, product); } catch { return send(503, { error: 'Sign-ups are not open yet.' }); }
    }
    return send(200, listFor(release, reserved));
  }
  if (req.method !== 'POST') return send(405, { error: 'POST or GET only' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return send(400, { error: 'bad JSON' }); } }
  const r = notifyRecord(body);
  if (r.error) return send(r.status, { error: r.error });
  try {
    const out = await s.add(r.record, releaseOf(r.record.brand, r.record.product));
    return send(200, { ok: true, ...out });
  } catch {
    return send(503, { error: 'Sign-ups are not open yet. Nothing was saved.' });
  }
}
