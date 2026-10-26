#!/usr/bin/env node
// Waitlist / reservation sign-ups (api/notify.mjs), in arrival order. Read-only: nothing is emailed from here.
// When reservations or orders open for a piece, export its waitlist and send the email only with the Principal's OK.
//
//   node tools/signups.mjs export [--brand buttsstudios] [--product soft-lamp] [--list waitlist|reserve|notify] [--out file.csv]
//   node tools/signups.mjs counts [--brand buttsstudios]
// Store: the same env as the API (CLOUDFLARE_ACCOUNT_ID + NOTIFY_D1_DATABASE_ID + NOTIFY_D1_TOKEN, else NOTIFY_LOG).
import { writeFileSync } from 'node:fs';
import { storeFrom } from '../api/notify.mjs';
import { toCsv } from '../core/inventory.mjs';

export const SIGNUP_COLUMNS = Object.freeze(['seq', 'at', 'brand', 'product', 'list', 'reason', 'email']);
const flag = (args, k) => { const i = args.indexOf(`--${k}`); return i > -1 ? args[i + 1] : undefined; };

/** Filter + order rows (seq, then time). Pure. */
export function selectSignups(rows, { brand, product, list } = {}) {
  return rows.filter((r) => (!brand || r.brand === brand) && (!product || r.product === product) && (!list || (r.list ?? 'notify') === list))
    .sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0) || String(a.at).localeCompare(String(b.at)));
}

export async function main(args = process.argv.slice(2), store = storeFrom()) {
  const cmd = args[0];
  const rows = selectSignups(await store.all(), { brand: flag(args, 'brand'), product: flag(args, 'product'), list: flag(args, 'list') });
  if (cmd === 'export') {
    const csv = toCsv(rows.map((r) => ({ ...r, list: r.list ?? 'notify', reason: r.reason ?? '' })), SIGNUP_COLUMNS);
    const out = flag(args, 'out');
    if (out) { writeFileSync(out, csv); console.log(`${rows.length} sign-ups -> ${out}`); } else process.stdout.write(csv);
    return rows.length;
  }
  if (cmd === 'counts') {
    const n = {};
    for (const r of rows) { const k = `${r.brand}/${r.product}`; n[k] ??= { reserve: 0, waitlist: 0, notify: 0 }; n[k][r.list ?? 'notify'] += 1; }
    for (const [k, v] of Object.entries(n)) console.log(`${k}  reserve ${v.reserve}  waitlist ${v.waitlist}  notify ${v.notify}`);
    return rows.length;
  }
  console.error('usage: node tools/signups.mjs export|counts [--brand b] [--product p] [--list l] [--out file.csv]');
  process.exitCode = 1;
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exitCode = 1; });
