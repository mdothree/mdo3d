// Order emails for every shop: one template, branded by brand.json tokens. Brand-agnostic.
//
// Principal 2026-10-14, verbatim: "then make sure we also get an email to the respective website and we also send
// them a checkout email".
//   (a) shop notification: "New order" to brand.orders_inbox (default orders@<domain>), with an admin link.
//   (b) customer confirmation: from orders_from as from_name, with the ship-by rule, order lookup and contact links.
// Sending: Resend (RESEND_API_KEY). Without the key, or in test mode, the rendered emails go to outbox/ as .html +
// .txt and the log says why. Sending never fails an order.
//   Customer emails reach real customers ONLY when EMAIL_LIVE=true (the Principal's GO for live checkout). Until
//   then they are redirected to EMAIL_TEST_TO when set, else written to outbox/. Stripe live-mode events never
//   email a customer without EMAIL_LIVE.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fmtDay } from './cart.mjs';
import { esc } from './kit.mjs';

const money = (c) => (Number.isInteger(c) ? `$${(c / 100).toFixed(2)}` : '');
export const rootDomain = (d) => String(d ?? '').replace(/^(store|shop|www)\./, '');
export const ordersFrom = (brand) => brand.orders_from ?? `orders@${rootDomain(brand.domain)}`;
export const ordersInbox = (brand) => brand.orders_inbox ?? ordersFrom(brand);
export const orderNumber = (brand, sessionId) => `${brand.order_prefix ?? String(brand.id ?? 'SHOP').slice(0, 3).toUpperCase()}-${String(sessionId).replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase()}`;

/** Stripe checkout.session + its line items -> our order record. Line metadata comes from core/checkout.mjs. */
export function orderFromSession(session, lineItems, brand, now = new Date()) {
  const lines = (lineItems ?? []).map((li) => {
    const md = li.price?.product?.metadata ?? li.metadata ?? {};
    const qty = Number(li.quantity ?? md.qty ?? 1);
    const unit = li.price?.unit_amount ?? (Number.isInteger(li.amount_total) ? Math.round(li.amount_total / qty) : null);
    return {
      product: md.product ?? '', name: li.description ?? li.price?.product?.name ?? md.product ?? 'Item', color: md.color ?? '', size: md.size ?? '', qty,
      unit_cents: unit, line_cents: li.amount_total ?? (unit == null ? null : unit * qty), drop: md.drop || null, ship_by: md.ship_by || null, preorder: !!md.ship_by || md.channel === 'preorder',
      sku: `${md.brand ?? brand.id}/${md.product}/${md.color || '-'}/${md.size || '-'}`,
    };
  });
  const ship = session.shipping_details ?? session.collected_information?.shipping_details ?? null;
  const cd = session.customer_details ?? {};
  return {
    number: orderNumber(brand, session.id), session: session.id, brand: brand.id, created: new Date((session.created ?? now.getTime() / 1000) * 1000).toISOString(),
    email: cd.email ?? session.customer_email ?? '', name: ship?.name ?? cd.name ?? '', address: ship?.address ?? cd.address ?? null,
    lines, subtotal_cents: session.amount_subtotal ?? null, shipping_cents: session.total_details?.amount_shipping ?? null, tax_cents: session.total_details?.amount_tax ?? null,
    total_cents: session.amount_total ?? null, currency: session.currency ?? 'usd', livemode: !!session.livemode, reservation: session.metadata?.reservation ?? '',
    ...shipRule(lines),
  };
}

/** The order ships when its latest item is ready (same rule as the bag and checkout). */
export function shipRule(lines) {
  const pre = lines.filter((l) => l.preorder);
  if (!pre.length) return { ship_by: null, mixed: false, ship_text: 'Ships within a few business days. Tracking follows by email.' };
  const latest = pre.map((l) => l.ship_by).filter(Boolean).sort().pop() ?? null;
  const drops = new Set(pre.map((l) => l.drop ?? ''));
  const mixed = pre.length < lines.length || drops.size > 1;
  const text = !latest ? 'Pre-order: the ship-by date is set when the pre-order window opens. The whole order ships together when its latest item is ready.'
    : mixed ? `Your order mixes ${pre.length < lines.length ? 'in-stock and pre-order pieces' : 'pieces from more than one drop'}. Everything ships together by ${fmtDay(latest)}, when the latest item is ready.`
      : `Pre-order. Ships by ${fmtDay(latest)}.`;
  return { ship_by: latest, mixed, ship_text: text };
}

const addr = (a) => (a ? [a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(' '), a.country].filter(Boolean) : []);
const variant = (l) => [l.color && l.color !== '-' ? l.color.replace(/-/g, ' ') : '', l.size && l.size !== '-' ? `Size ${l.size}` : ''].filter(Boolean).join(' · ');

function frame(brand, { title, preheader, body, footer }) {
  const c = brand.tokens?.colors ?? {};
  const bg = c.bg ?? '#ffffff', fg = c.fg ?? '#111111', line = c.line ?? '#dddddd', muted = c.muted ?? '#666666', panel = c.panel ?? '#f5f5f5';
  const font = (brand.tokens?.fonts?.body ?? 'Helvetica, Arial, sans-serif').replace(/"/g, "'");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${bg};color:${fg};font-family:${font};">
<span style="display:none;max-height:0;overflow:hidden;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${panel};border:1px solid ${line};border-radius:2px;">
<tr><td style="padding:22px 24px;border-bottom:1px solid ${line};font-size:18px;font-weight:600;letter-spacing:.04em;">${esc(brand.name)}</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.55;color:${fg};">${body}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid ${line};font-size:12px;line-height:1.5;color:${muted};">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

function itemsTable(brand, o) {
  const c = brand.tokens?.colors ?? {};
  const line = c.line ?? '#dddddd', muted = c.muted ?? '#666666';
  const rows = o.lines.map((l) => `<tr><td style="padding:10px 0;border-bottom:1px solid ${line};">${esc(l.name)}<br><span style="color:${muted};font-size:13px;">${esc(variant(l))}${l.preorder ? ` · Pre-order${l.ship_by ? `, ships by ${esc(fmtDay(l.ship_by))}` : ''}` : ''}</span></td><td style="padding:10px 0;border-bottom:1px solid ${line};text-align:center;white-space:nowrap;">× ${l.qty}</td><td style="padding:10px 0;border-bottom:1px solid ${line};text-align:right;white-space:nowrap;">${esc(money(l.line_cents))}</td></tr>`).join('');
  const tot = [['Subtotal', o.subtotal_cents], ['Shipping', o.shipping_cents], ['Tax', o.tax_cents]].filter(([, v]) => Number.isInteger(v)).map(([k, v]) => `<tr><td colspan="2" style="padding:4px 0;color:${muted};">${k}</td><td style="padding:4px 0;text-align:right;">${esc(money(v))}</td></tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;"><thead><tr><th scope="col" style="text-align:left;font-size:12px;color:${muted};font-weight:600;padding-bottom:6px;">Item</th><th scope="col" style="font-size:12px;color:${muted};font-weight:600;">Qty</th><th scope="col" style="text-align:right;font-size:12px;color:${muted};font-weight:600;">Amount</th></tr></thead><tbody>${rows}${tot}
<tr><td colspan="2" style="padding:8px 0;font-weight:700;">Total</td><td style="padding:8px 0;text-align:right;font-weight:700;">${esc(money(o.total_cents))}</td></tr></tbody></table>`;
}
const itemsText = (o) => [...o.lines.map((l) => `- ${l.name}${variant(l) ? ` (${variant(l)})` : ''} x ${l.qty}  ${money(l.line_cents)}${l.preorder ? `  [pre-order${l.ship_by ? `, ships by ${fmtDay(l.ship_by)}` : ''}]` : ''}`),
  ...[['Subtotal', o.subtotal_cents], ['Shipping', o.shipping_cents], ['Tax', o.tax_cents], ['Total', o.total_cents]].filter(([, v]) => Number.isInteger(v)).map(([k, v]) => `${k}: ${money(v)}`)].join('\n');

/** (b) The customer's order confirmation. siteUrl: https://<shop domain> (no trailing slash). */
export function customerEmail(o, brand, { siteUrl = `https://${brand.domain}` } = {}) {
  const c = brand.tokens?.colors ?? {};
  const accent = c.accent ?? '#111111', onAccent = c['on-accent'] ?? '#ffffff';
  const lookup = `${siteUrl}/orders.html`, policies = `${siteUrl}/policies.html`, contact = brand.policies?.contact ?? ordersFrom(brand);
  const subject = `Your ${brand.name} order ${o.number}`;
  const body = `<h1 style="font-size:22px;margin:0 0 6px;">Thank you${o.name ? `, ${esc(o.name.split(' ')[0])}` : ''}.</h1>
<p style="margin:0 0 18px;">Your order <strong>${esc(o.number)}</strong> is confirmed.</p>
<p style="margin:0 0 18px;padding:12px 14px;border:1px solid ${c.line ?? '#ddd'};border-radius:2px;background:${c.bg ?? '#fff'};">${esc(o.ship_text)}</p>
${itemsTable(brand, o)}
<p style="margin:22px 0 8px;"><a href="${esc(lookup)}" style="display:inline-block;background:${accent};color:${onAccent};text-decoration:none;padding:11px 18px;border-radius:2px;font-weight:600;">Look up your order</a></p>
<p style="margin:0;font-size:13px;">Use order number ${esc(o.number)} and this email address. If a date moves, we email you before it passes, with the option to cancel for a full refund.</p>`;
  const footer = `Questions: <a href="mailto:${esc(contact)}" style="color:inherit;">${esc(contact)}</a> · <a href="${esc(policies)}" style="color:inherit;">Shipping, exchanges and refunds</a> · <a href="${esc(siteUrl)}/privacy.html" style="color:inherit;">Privacy</a><br>${esc(brand.name)}${brand.endorsement ? `, ${esc(brand.endorsement)}` : ''}`;
  const text = `${brand.name}\n\nThank you${o.name ? `, ${o.name.split(' ')[0]}` : ''}. Your order ${o.number} is confirmed.\n\n${o.ship_text}\n\n${itemsText(o)}\n\nLook up your order: ${lookup}\n(order number ${o.number} and this email address)\nIf a date moves, we email you before it passes, with the option to cancel for a full refund.\n\nQuestions: ${contact}\nShipping, exchanges and refunds: ${policies}\nPrivacy: ${siteUrl}/privacy.html\n`;
  return { kind: 'customer', to: o.email, from: `${brand.from_name ?? brand.name} <${ordersFrom(brand)}>`, reply_to: contact, subject, html: frame(brand, { title: subject, preheader: o.ship_text, body, footer }), text };
}

/** (a) The shop's "New order" notification. lowAlerts from core/stock.mjs commitSale. */
export function shopEmail(o, brand, { adminUrl = 'dist/_admin/index.html (local)', lowAlerts = [] } = {}) {
  const c = brand.tokens?.colors ?? {};
  const subject = `New order ${o.number}: ${o.lines.reduce((n, l) => n + l.qty, 0)} item(s)${o.total_cents != null ? `, ${money(o.total_cents)}` : ''}${lowAlerts.length ? ' · LOW STOCK' : ''}${o.livemode ? '' : ' [test]'}`;
  const drops = [...new Set(o.lines.filter((l) => l.preorder).map((l) => `${l.drop ?? 'no drop'}${l.ship_by ? ` (ships by ${fmtDay(l.ship_by)})` : ''}`))];
  const alerts = lowAlerts.map((a) => `${a.sku}: ${a.before} → ${a.after} on hand${a.low != null ? ` (alert at ${a.low})` : ''}${a.oversold ? ' OVERSOLD' : ''}`);
  const body = `<h1 style="font-size:20px;margin:0 0 6px;">New order ${esc(o.number)}</h1>
<p style="margin:0 0 14px;font-size:13px;">${esc(o.created.slice(0, 16).replace('T', ' '))} UTC · Stripe ${esc(o.session)}${o.livemode ? '' : ' · test mode'}</p>
${alerts.length ? `<p style="margin:0 0 14px;padding:10px 12px;border:1px solid ${c.accent ?? '#c00'};border-radius:2px;"><strong>Low stock:</strong><br>${alerts.map(esc).join('<br>')}</p>` : ''}
${itemsTable(brand, o)}
<h2 style="font-size:15px;margin:20px 0 6px;">Ship to</h2><p style="margin:0;">${[o.name, ...addr(o.address)].filter(Boolean).map(esc).join('<br>')}<br>${esc(o.email)}</p>
${drops.length ? `<h2 style="font-size:15px;margin:20px 0 6px;">Pre-order</h2><p style="margin:0;">${drops.map(esc).join('<br>')}<br>${esc(o.ship_text)}</p>` : `<p style="margin:16px 0 0;">${esc(o.ship_text)}</p>`}
<p style="margin:20px 0 0;">Inventory admin: <a href="${esc(adminUrl)}" style="color:inherit;">${esc(adminUrl)}</a></p>`;
  const text = `New order ${o.number}${o.livemode ? '' : ' [test]'}\n${o.created} · Stripe ${o.session}\n${alerts.length ? `\nLOW STOCK:\n${alerts.join('\n')}\n` : ''}\n${itemsText(o)}\n\nShip to:\n${[o.name, ...addr(o.address), o.email].filter(Boolean).join('\n')}\n${drops.length ? `\nPre-order: ${drops.join('; ')}\n` : ''}${o.ship_text}\n\nInventory admin: ${adminUrl}\n`;
  return { kind: 'shop', to: ordersInbox(brand), from: `${brand.from_name ?? brand.name} orders <${ordersFrom(brand)}>`, reply_to: o.email || undefined, subject, html: frame(brand, { title: subject, preheader: `${o.number}: ${o.lines.length} line(s)`, body, footer: 'Internal: sent to the shop inbox only.' }), text };
}

/** Send through Resend, or write to outbox/. Never throws. Returns {sent, to, file?, reason?}. */
export async function deliver(msg, { env = process.env, outbox = join(env.ORDERS_ROOT ?? process.cwd(), 'outbox'), livemode = false, fetchImpl = globalThis.fetch, tag = '' } = {}) {
  let to = msg.to;
  let reason = '';
  if (msg.kind === 'customer' && env.EMAIL_LIVE !== 'true') {
    if (env.EMAIL_TEST_TO) { to = env.EMAIL_TEST_TO; reason = `test mode: redirected from ${msg.to}`; } else { to = null; reason = 'test mode: customer emails stay in outbox/ until EMAIL_LIVE=true'; }
  }
  if (livemode && msg.kind === 'customer' && env.EMAIL_LIVE !== 'true') to = null;
  const writeOutbox = (why) => {
    try {
      mkdirSync(outbox, { recursive: true });
      const base = join(outbox, `${new Date().toISOString().replace(/[:.]/g, '-')}_${tag || 'order'}_${msg.kind}`);
      writeFileSync(`${base}.html`, msg.html);
      writeFileSync(`${base}.txt`, `To: ${msg.to}\nFrom: ${msg.from}\nSubject: ${msg.subject}\nNot sent: ${why}\n\n${msg.text}`);
      console.log(`[email] ${msg.kind} ${msg.subject}: not sent (${why}); written to ${base}.html`);
      return { sent: false, to: msg.to, file: `${base}.html`, reason: why };
    } catch (e) { console.log(`[email] ${msg.kind}: not sent and outbox write failed (${e.message})`); return { sent: false, to: msg.to, reason: why }; }
  };
  if (!env.RESEND_API_KEY) return writeOutbox('no RESEND_API_KEY');
  if (!to) return writeOutbox(reason || 'test mode');
  try {
    const r = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: msg.from, to: [to], subject: msg.subject, html: msg.html, text: msg.text, ...(msg.reply_to ? { reply_to: msg.reply_to } : {}) }),
    });
    if (!r.ok) return writeOutbox(`Resend answered ${r.status}`);
    return { sent: true, to, reason };
  } catch (e) { return writeOutbox(`Resend unreachable (${e.message})`); }
}

/** A clearly-marked sample order for the admin previews (placeholder amounts; shop prices are still TBA). */
export function sampleOrder(brand, products) {
  const pick = products.filter((p) => p.listed !== false && p.status !== 'archive').slice(0, 2);
  const lines = pick.map((p, i) => ({ product: p.id, name: p.name, color: p.colors?.[0]?.id ?? '', size: p.sizes?.[Math.min(1, (p.sizes?.length ?? 1) - 1)] ?? '', qty: i + 1, unit_cents: 4800, line_cents: 4800 * (i + 1),
    drop: i === 0 ? 'sample-drop' : null, ship_by: i === 0 ? '2027-01-03' : null, preorder: i === 0, sku: `${brand.id}/${p.id}/x` }));
  const sub = lines.reduce((n, l) => n + l.line_cents, 0);
  return { number: orderNumber(brand, 'cs_test_SAMPLE0001'), session: 'cs_test_SAMPLE0001', brand: brand.id, created: '2026-10-14T18:00:00.000Z', email: 'customer@example.com', name: 'Sample Customer',
    address: { line1: '1 Sample Street', city: 'Los Angeles', state: 'CA', postal_code: '90001', country: 'US' }, lines, subtotal_cents: sub, shipping_cents: 600, tax_cents: 0, total_cents: sub + 600, currency: 'usd', livemode: false, ...shipRule(lines) };
}
