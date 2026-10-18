#!/usr/bin/env node
// Go-live readiness for every shop (or one): what still blocks a live build, and the state of the items.
//
//   node tools/launch_check.mjs              all shops
//   node tools/launch_check.mjs runwae       one shop
//
// A shop is READY when its policy pages have no unconfirmed facts and a live build (`--live`) succeeds.
// Checkout is reported, never turned on here: it needs brand.mode "live" + CHECKOUT_ENABLED=true + a Stripe key.
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildBrand, brandIds, loadBrand } from '../core/build.mjs';
import { policyGaps } from '../core/policies.mjs';

const ids = process.argv[2] ? [process.argv[2]] : brandIds();
let ready = 0;
for (const id of ids) {
  const { brand, catalog } = loadBrand(id);
  const gaps = policyGaps(brand);
  const counts = {};
  for (const p of catalog.filter((x) => x.listed !== false)) counts[p.status] = (counts[p.status] ?? 0) + 1;
  let build = 'not tried';
  if (!gaps.length) {
    const out = mkdtempSync(join(tmpdir(), `live-${id}-`));
    try { await buildBrand(id, out, { mode: 'live', env: {} }); build = 'ok'; } catch (e) { build = `FAILED: ${e.message.split('\n')[0]}`; }
    rmSync(out, { recursive: true, force: true });
  }
  const ok = !gaps.length && build === 'ok';
  if (ok) ready++;
  console.log(`\n${ok ? 'READY  ' : 'BLOCKED'} ${id} (${brand.domain}) · mode in brand.json: ${brand.mode}`);
  console.log(`  items: ${Object.entries(counts).map(([s, n]) => `${s} ${n}`).join(', ')}`);
  console.log(`  checkout: off (turns on only with mode live + CHECKOUT_ENABLED=true + a Stripe key)`);
  if (gaps.length) for (const g of gaps) console.log(`  needs: ${g.replace(/^\[CONFIRM: |\]$/g, '')}`);
  else console.log(`  live build: ${build}`);
}
console.log(`\n${ready}/${ids.length} shops ready for a live build.`);
process.exitCode = ready === ids.length ? 0 : 1;
