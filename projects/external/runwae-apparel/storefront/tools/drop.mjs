#!/usr/bin/env node
// Drop toolkit. Local maths and file output only; nothing here charges, orders or emails.
//
//   node tools/drop.mjs shipby  <close-date> [--production 28 --freight 7 --receiving 7 --safety 7]
//   node tools/drop.mjs window  <brand> <drop-id>          check window length + print ship-by
//   node tools/drop.mjs tally   <orders.json|csv>           paid orders -> product × size
//   node tools/drop.mjs po      <orders.json|csv> [--moq 24 | --moq-file moq.json] [--buffer 0.10] [--out po.csv]
//   node tools/drop.mjs landed  --unit 9.5 --qty 120 [--freight 260 --packaging 0.6 --postage 5.2 --samples 80 --margin 0.5 --duty 0.165 --surcharge 0.10]
//   node tools/drop.mjs notice  <brand> <drop-id> --new-date YYYY-MM-DD [--reason "…"]   delay-notice email text (FTC)
//
// orders.json: a Stripe list of checkout.session objects ({data:[…]} or […]) or rows {product,size,qty,status}.
// orders.csv : header row with product,size,qty[,status].
import { readFileSync, writeFileSync } from 'node:fs';
import { shipBy, normaliseOrders, tally, purchaseOrder, landedCost, checkWindow } from '../src/drop.mjs';
import { loadBrand } from '../src/build.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const flag = (k, d) => { const i = rest.indexOf(`--${k}`); return i > -1 ? rest[i + 1] : d; };
const num = (k, d) => (flag(k) === undefined ? d : Number(flag(k)));
const pos = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--')));

function readOrders(file) {
  const raw = readFileSync(file, 'utf8');
  if (file.endsWith('.csv')) {
    const [head, ...lines] = raw.trim().split(/\r?\n/);
    const cols = head.split(',').map((s) => s.trim());
    return lines.filter(Boolean).map((l) => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v.trim()])));
  }
  const j = JSON.parse(raw);
  return Array.isArray(j) ? j : j.data;
}

function findDrop(brand, id) {
  const d = loadBrand(brand).drops.find((x) => x.id === id);
  if (!d) throw new Error(`no drop ${id} in ${brand}`);
  return d;
}

const schedule = () => Object.fromEntries(Object.entries({ productionDays: num('production'), freightDays: num('freight'), receivingDays: num('receiving'), safetyDays: num('safety') }).filter(([, v]) => v !== undefined));

switch (cmd) {
  case 'shipby': {
    console.log(shipBy(pos[0], schedule()));
    break;
  }
  case 'window': {
    const d = findDrop(pos[0], pos[1]);
    const c = checkWindow(d);
    console.log({ drop: d.id, ...c, ...(c.ok ? shipBy(d.window.close, d.schedule) : {}) });
    break;
  }
  case 'tally': {
    console.table(tally(normaliseOrders(readOrders(pos[0]))));
    break;
  }
  case 'po': {
    const t = tally(normaliseOrders(readOrders(pos[0])));
    const moq = flag('moq-file') ? JSON.parse(readFileSync(flag('moq-file'), 'utf8')) : num('moq', 0);
    const rows = purchaseOrder(t, { buffer: num('buffer', 0.10), moq });
    const sizes = [...new Set(rows.flatMap((r) => Object.keys(r.sizes)))];
    const csv = [['product', ...sizes, 'ordered', 'sold', 'moq', 'action'].join(',')]
      .concat(rows.map((r) => [r.product, ...sizes.map((s) => r.sizes[s] ?? 0), r.ordered, r.sold, r.moq, `"${r.action}"`].join(',')))
      .join('\n') + '\n';
    if (flag('out')) { writeFileSync(flag('out'), csv); console.log(`wrote ${flag('out')}`); } else process.stdout.write(csv);
    const short = rows.filter((r) => !r.meetsMoq);
    if (short.length) console.error(`\n${short.length} design(s) under MOQ: refund or offer a swap: ${short.map((r) => r.product).join(', ')}`);
    break;
  }
  case 'landed': {
    console.log(landedCost({
      unitCost: num('unit'), qty: num('qty'), freightTotal: num('freight', 0), packagingPerUnit: num('packaging', 0),
      postagePerUnit: num('postage', 0), sampleCostTotal: num('samples', 0), targetMargin: num('margin', 0.5),
      dutyRate: num('duty', 0.165), surchargeRate: num('surcharge', 0.10),
    }));
    break;
  }
  case 'notice': {
    const { brand } = loadBrand(pos[0]);
    const d = findDrop(pos[0], pos[1]);
    const old = shipBy(d.window.close, d.schedule).shipBy;
    const nd = flag('new-date');
    if (!nd) throw new Error('--new-date required');
    const late = (new Date(nd) - new Date(old)) / 86_400_000;
    const keep = late <= 30
      ? `  • Keep your order. No action needed; it ships by ${nd}.\n  • Cancel for a full refund. Reply to this email and we'll refund you in full.\n\nIf you don't reply, your order stays in and ships by ${nd}.`
      : `  • Keep your order. Reply YES and it ships by ${nd}.\n  • Cancel for a full refund. Reply CANCEL, or don't reply.\n\nBecause this delay is more than 30 days, we need your OK to keep the order. If we don't hear from you by ${old}, we'll cancel it and refund you in full.`;
    console.log(`Subject: Your ${brand.name} pre-order: new ship date

Hi,

Your pre-order from ${brand.name}'s ${d.name} drop was due to ship by ${old}. ${flag('reason', 'Production is running behind')}, so it will now ship by ${nd}.

You can:
${keep}

Sorry for the wait, and thank you for backing the drop.
${brand.name}
${brand.policies.contact}

[Send BEFORE ${old} (FTC Mail Order Rule). Delay ${late} days: ${late <= 30 ? 'silence = consent' : 'needs express consent; no reply = cancel + refund'}. Check the current rule before sending.]`);
    break;
  }
  default:
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 14).join('\n'));
}
