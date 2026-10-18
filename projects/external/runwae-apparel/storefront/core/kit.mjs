// The component kit every brand layout builds from. Brand-agnostic: it reads brand data, never names a brand.
// Markup contract with core/client/seed.js: data-add, data-notify, data-cart, data-lookup, data-bag-count,
// data-menu-toggle. Class names are BEM-ish (`seed-*`) so brand CSS can restyle without touching logic.
// CSP rule (vercel.json: style-src/script-src 'self'): no inline style="" and no inline <script>.
import { fmtDay } from './cart.mjs';
import { printList, printLabel } from './catalog.mjs';
import { hubBody, policyFields } from './policies.mjs';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const money = (c) => (Number.isInteger(c) ? `$${(c / 100).toFixed(2)}` : 'Price TBA');
export { fmtDay };

export function createKit({ brand, manifest = {}, root = '', views = {} }) {
  const k = {};
  k.esc = esc; k.money = money; k.fmtDay = fmtDay; k.root = root; k.brand = brand;
  k.copy = (key, fallback = '') => brand.copy?.[key] ?? fallback;

  // ---------- links ----------
  k.href = {
    home: () => `${root}index.html`, shop: () => `${root}shop.html`, story: () => `${root}story.html`,
    cart: () => `${root}cart.html`, orders: () => `${root}orders.html`, policies: () => `${root}policies.html`,
    privacy: () => `${root}privacy.html`, terms: () => `${root}terms.html`, returns: () => `${root}returns.html`, shipping: () => `${root}shipping.html`,
    product: (p) => `${root}products/${esc(typeof p === 'string' ? p : p.id)}.html`, asset: (f) => `${root}assets/${f}`,
  };

  // ---------- images ----------
  /** ref: "asset-key" | {file, alt, concept, caption}. Uses the manifest from tools/images.mjs for srcset,
   *  or a literal file name with an extension (pre-seed assets). */
  k.imgData = (ref) => {
    const r = typeof ref === 'string' ? { file: ref } : ref;
    const m = manifest[r.file];
    if (m) {
      const max = m.widths[m.widths.length - 1];
      return { src: `${root}assets/${r.file}-${max}.jpg`, srcset: m.widths.map((w) => `${root}assets/${r.file}-${w}.jpg ${w}w`).join(', '), w: m.w, h: m.h, r };
    }
    if (/\.(jpe?g|png|webp|svg)$/i.test(r.file)) return { src: `${root}assets/${r.file}`, srcset: '', w: r.width ?? 1000, h: r.height ?? 1000, r };
    throw new Error(`image "${r.file}" is not in assets/manifest.json`);
  };
  k.img = (ref, { alt, sizes = '100vw', cls = '', eager = false } = {}) => {
    const d = k.imgData(ref);
    const a = alt ?? d.r.alt ?? '';
    return `<img src="${d.src}"${d.srcset ? ` srcset="${d.srcset}" sizes="${esc(sizes)}"` : ''} width="${d.w}" height="${d.h}" alt="${esc(a)}"${cls ? ` class="${esc(cls)}"` : ''} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  };
  /** Image + caption. Concept renders always say so in the caption. */
  k.figure = (ref, opts = {}) => {
    const r = typeof ref === 'string' ? { file: ref } : ref;
    const concept = opts.concept ?? r.concept;
    const own = opts.caption ?? r.caption ?? '';
    const cap = [concept && !/^Mockup/.test(own) ? 'Concept render' : '', own].filter(Boolean).join(' · ');
    return `<figure class="seed-fig${opts.cls ? ` ${esc(opts.cls)}` : ''}">${k.img(r, opts)}${cap && opts.caption !== false ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure>`;
  };
  k.productImage = (p, i = 0) => (p.images ?? [])[i];
  k.conceptNote = (p) => ((p.images ?? []).some((i) => i.concept) ? 'Concept render' : '');

  // ---------- a11y + chrome ----------
  k.skipLink = () => '<a class="seed-skip" href="#main">Skip to content</a>';
  k.previewBanner = () => (brand.mode === 'preview' ? `<div class="seed-preview" role="note">${esc(k.copy('preview', 'Preview: not open for orders'))}</div>` : '');
  k.menuButton = (label = 'Menu') => `<button class="seed-menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-menu-toggle><span class="seed-menu-icon" aria-hidden="true"></span><span class="seed-menu-label">${esc(label)}</span></button>`;
  k.bagLink = (label = 'Bag') => `<a class="seed-bag" href="${k.href.cart()}">${esc(label)} <span class="seed-bag-count" data-bag-count>0</span><span class="sr-only"> items</span></a>`;
  k.sr = (t) => `<span class="sr-only">${esc(t)}</span>`;

  // ---------- product state ----------
  k.view = (p) => views[p.id];
  k.status = (p, cls = '') => { const v = views[p.id]; return `<span class="seed-status seed-status--${v.status}${cls ? ` ${cls}` : ''}">${esc(v.label)}</span>`; };
  k.price = (p) => { const v = views[p.id]; return v.priceText ? `<span class="seed-price${v.price_cents === null ? ' seed-price--tba' : ''}">${esc(v.priceText)}</span>` : ''; };

  k.swatches = (p, { legend = 'Colour', name = 'color' } = {}) => {
    const cs = p.colors ?? [];
    if (!cs.length) return '';
    return `<fieldset class="seed-swatches"><legend>${esc(legend)}: <span data-color-name>${esc(cs[0].name)}</span></legend><div class="seed-options">${cs.map((c, i) => `<label class="seed-swatch"><input type="radio" name="${name}" value="${esc(c.id)}" data-name="${esc(c.name)}"${i === 0 ? ' checked' : ''}><span class="seed-swatch-chip sw-${esc(c.id)}" aria-hidden="true"></span><span class="sr-only">${esc(c.name)}</span></label>`).join('')}</div></fieldset>`;
  };
  k.sizes = (p, { legend = 'Size' } = {}) => {
    const ss = p.sizes ?? [];
    if (!ss.length) return '';
    if (ss.length === 1) return `<input type="hidden" name="size" value="${esc(ss[0])}"><p class="seed-onesize">${esc(legend)}: ${esc(ss[0])}</p>`;
    // A size with nothing to sell in any colour renders disabled; seed.js refines this per colour.
    const av = Object.entries(p.avail ?? {});
    const gone = (s) => av.length > 0 && av.filter(([k]) => k.endsWith(`/${s}`)).every(([, a]) => !(a.available > 0));
    return `<fieldset class="seed-sizes"><legend>${esc(legend)}</legend><div class="seed-options">${ss.map((s) => `<label class="seed-size"><input type="radio" name="size" value="${esc(s)}" required${gone(s) ? ' disabled' : ''}><span>${esc(s)}</span></label>`).join('')}</div></fieldset>`;
  };
  k.notifyForm = (p, { label = 'Notify me', intro } = {}) => `<form class="seed-notify" data-notify data-product="${esc(p.id)}" novalidate>
<label for="notify-${esc(p.id)}">${esc(intro ?? k.copy('notifyIntro', 'Get one email when it opens.'))}</label>
<div class="seed-notify-row"><input id="notify-${esc(p.id)}" type="email" name="email" autocomplete="email" placeholder="you@example.com" required><button type="submit">${esc(label)}</button></div>
<p class="seed-fine seed-notify-consent">We use your email only to tell you when this piece opens. Unsubscribe any time. <a href="${k.href.privacy()}">Privacy</a></p>
<p class="seed-msg" role="status" aria-live="polite"></p></form>`;

  /** Per-colour galleries: images carry `color` (a colour id). Returns one block per colour, each wrapped in
   *  data-color-group; seed.js shows the selected colour's block. With JS off every block shows. Images with no
   *  `color` belong to every colour. render(imgs, i) -> HTML for one colour's images. */
  k.colorGalleries = (p, render) => {
    const cs = p.colors ?? [];
    const tagged = (p.images ?? []).some((im) => im.color);
    if (cs.length < 2 || !tagged) return render(p.images ?? [], 0);
    return cs.map((c, i) => `<div class="seed-color-group" data-color-group="${esc(c.id)}">${render((p.images ?? []).filter((im) => !im.color || im.color === c.id), i)}</div>`).join('');
  };
  /** Colour switcher for items without a buy form (concepts, next drop): switches the galleries only. */
  k.colorSwitch = (p) => ((p.colors ?? []).length > 1 && !views[p.id].canAdd ? `<div class="seed-colorswitch">${k.swatches(p, { legend: 'Colour', name: 'view-color' })}</div>` : '');

  /** "Print: Back print · full size · Chest mark · medium" from item.print. */
  k.printLine = (p) => { const l = printList(p).map(printLabel); return l.length ? `<p class="seed-print"><span>Print</span> ${esc(l.join(' · '))}</p>` : ''; };

  /** The buy box: status, price, ship-by note, variants, add to bag or Notify me. */
  k.buyBox = (p, { addLabel = 'Add to bag', preorderLabel = 'Pre-order', showStatus = true } = {}) => {
    const v = views[p.id];
    const head = `<div class="seed-buy-head">${k.price(p)}${showStatus ? k.status(p) : ''}</div>${v.note ? `<p class="seed-note">${esc(v.note)}</p>` : ''}${k.printLine(p)}`;
    if (v.canAdd) {
      const avail = v.stock ? `<p class="seed-avail" data-avail role="status" aria-live="polite">${esc(v.stock.text)}</p>` : '';
      return `<div class="seed-buy">${head}${avail}<form class="seed-add" data-add data-product="${esc(p.id)}" novalidate>${k.swatches(p)}${k.sizes(p)}
<button class="seed-add-btn" type="submit">${esc(v.preorder ? preorderLabel : addLabel)}</button>
<p class="seed-msg" role="status" aria-live="polite"></p></form>
<p class="seed-fine">${esc(k.copy('exchangeLine', 'Size exchanges within 14 days.'))} <a href="${k.href.policies()}">Shipping and exchanges</a></p></div>`;
    }
    return `<div class="seed-buy">${head}${v.notify ? k.notifyForm(p) : ''}</div>`;
  };

  /** A product card. Layouts style .seed-card or pass their own class; `lead` adds a line above the name. */
  k.card = (p, { sizes = '(max-width: 820px) 50vw, 25vw', cls = '', lead = '', imgIndex = 0, caption = true } = {}) => {
    const im = p.images?.[imgIndex];
    const v = views[p.id];
    return `<a class="seed-card${cls ? ` ${esc(cls)}` : ''}" href="${k.href.product(p)}">
<span class="seed-card-media">${im ? k.img(im, { sizes, alt: im.alt ?? p.name }) : ''}${caption && im?.concept ? '<span class="seed-card-tag">Concept</span>' : ''}</span>
${lead ? `<span class="seed-card-lead">${lead}</span>` : ''}<span class="seed-card-name">${esc(p.name)}</span>
<span class="seed-card-meta">${v.priceText ? `<span class="seed-card-price">${esc(v.priceText)}</span>` : ''}<span class="seed-status seed-status--${v.status}">${esc(v.label)}</span></span></a>`;
  };
  /** Product detail rows: p.details = [["Design", "..."], ["Materials", "..."]]. Rendered as disclosure widgets. */
  // Pre-order shipping notes only make sense once an item can be ordered: hidden while it is not available.
  k.details = (p, { open = 0 } = {}) => (p.details ?? []).filter(([h, t]) => !(k.view(p).status === 'unavailable' && /pre-?order/i.test(`${h} ${t}`))).map(([h, t], i) => `<details class="seed-details"${i < open ? ' open' : ''}><summary>${esc(h)}</summary><p>${esc(t)}</p></details>`).join('');
  /** Gallery: every image of a product as captioned figures. */
  k.gallery = (p, { sizes = '(max-width: 820px) 100vw, 55vw', cls = 'seed-gallery' } = {}) => `<div class="${esc(cls)}">${(p.images ?? []).map((im, i) => k.figure(im, { sizes, eager: i === 0, alt: im.alt ?? `${p.name}, view ${i + 1}` })).join('')}</div>`;

  // ---------- shared page bodies (layouts wrap or replace these) ----------
  k.cartBody = ({ title = 'Your bag', emptyText = 'Your bag is empty.', shopLabel = 'Back to the shop' } = {}) => `<section class="seed-cart" data-cart aria-labelledby="cart-title">
<h1 id="cart-title" class="seed-cart-title">${esc(title)}</h1>
<div class="seed-cart-empty" data-cart-empty><p>${esc(emptyText)}</p><p><a href="${k.href.shop()}">${esc(shopLabel)}</a></p></div>
<div class="seed-cart-grid" data-cart-full hidden>
<ul class="seed-cart-lines" data-cart-lines aria-label="Items in your bag"></ul>
<aside class="seed-cart-summary" aria-label="Order summary">
<dl class="seed-cart-totals"><dt>Subtotal</dt><dd data-cart-subtotal>Price TBA</dd><dt>Shipping and tax</dt><dd>Calculated at checkout</dd></dl>
<p class="seed-cart-ship" data-cart-ship hidden></p>
<button class="seed-checkout" type="button" data-checkout disabled>${esc(k.copy('checkoutLabel', 'Checkout'))}</button>
<p class="seed-msg" data-checkout-msg role="status" aria-live="polite"></p>
<p class="seed-fine">Guest checkout through Stripe. Stripe Link can remember your details for next time. <a href="${k.href.orders()}">Look up an order</a></p>
</aside></div>
<noscript><p>Your bag needs JavaScript. You can still browse the shop.</p></noscript></section>`;

  k.ordersBody = ({ title = 'Order lookup' } = {}) => `<section class="seed-orders"><h1>${esc(title)}</h1>
<p>Enter the order number from your confirmation email and the email you ordered with. You'll see the status and the ship-by date.</p>
<form class="seed-lookup" data-lookup novalidate>
<label for="lk-order">Order number</label><input id="lk-order" name="order" autocomplete="off" required>
<label for="lk-email">Email</label><input id="lk-email" name="email" type="email" autocomplete="email" required>
<button type="submit">Look up</button><p class="seed-msg" role="status" aria-live="polite"></p></form>
<h2>Order emails</h2><ol class="seed-steps"><li><strong>Confirmed.</strong> Your receipt and ship-by date.</li><li><strong>In production.</strong> For pre-orders, when the window closes and making starts.</li><li><strong>Shipped.</strong> With tracking.</li><li><strong>Delay notice.</strong> Only if a date moves, sent before it passes, with the option to cancel for a full refund.</li></ol>
<p class="seed-fine">Questions: ${esc(brand.policies?.contact ?? '')}. Lookups use your order number and email only to find the order. <a href="${k.href.privacy()}">Privacy</a></p></section>`;

  k.policiesBody = () => hubBody(policyFields(brand), (id) => k.href[id]());

  k.thanksBody = () => `<article class="seed-prose"><h1>Thank you.</h1><p>Your order is in. A receipt is on its way to your email, and you'll get tracking when it ships. Pre-orders ship by the date shown at checkout.</p><p><a href="${k.href.orders()}">Look up an order</a> · <a href="${k.href.home()}">Back to the shop</a></p></article>`;

  return k;
}
