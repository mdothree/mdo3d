#!/usr/bin/env node
// Static site build CLI (the logic lives in core/build.mjs).
//   node src/build.mjs                          -> dist/<brand>/ for every brand in brands/ (skips _template)
//   node src/build.mjs --brand glb --out public -> one brand (Vercel: set BRAND env)
//   --now 2026-11-01T00:00:00Z                  -> render as of a date (preview a drop window)
//   --holding --brand runwae --out holding-dist -> the pre-launch holding page
//   --live                                      -> build as the live shop (no preview banner, indexable); fails while
//                                                  any policy fact is unconfirmed. Checkout still needs CHECKOUT_ENABLED.
// The all-brands run also writes dist/_admin/ (inventory admin + order email previews). LOCAL ONLY: the per-brand
// deploy build (--brand X / BRAND env) never writes it, and .vercelignore drops dist/.
// Item state is decided at build time for display and re-checked server-side by api/checkout.mjs,
// so rebuild when a window opens or closes.
import { resolve, join } from 'node:path';
import { buildBrand, buildHolding, brandIds, loadBrand, ROOT } from '../core/build.mjs';
import { buildAdmin, buildEmailPreviews } from '../core/admin.mjs';

export { buildBrand, buildHolding, loadBrand, brandIds, ROOT };

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : undefined; };
  const now = arg('--now') ? new Date(arg('--now')) : new Date();
  if (process.argv.includes('--holding')) {
    console.log(buildHolding(arg('--brand') ?? 'runwae', resolve(arg('--out') ?? 'holding-dist')));
  } else {
    const only = arg('--brand') ?? process.env.BRAND;
    for (const id of only ? [only] : brandIds()) {
      const out = arg('--out') && only ? resolve(arg('--out')) : join(ROOT, 'dist', id);
      console.log(await buildBrand(id, out, { now, mode: process.argv.includes('--live') ? 'live' : null }));
    }
    if (!only) {
      const adminOut = join(ROOT, 'dist', '_admin');
      const emails = buildEmailPreviews(ROOT, adminOut);
      console.log(buildAdmin(ROOT, adminOut, { now, emails }));
    }
  }
}
