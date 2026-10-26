// Ridgefield layout. Measured and technical, matching ridgefieldtech.com: ink/bone, olive + ember signal,
// JetBrains Mono labels, terrain contours, spec-sheet product pages. Mountain imagery is atmosphere only.
// MARK: the real Ridgefield square mark (solid square, square cut-out) + RIDGEFIELD in JetBrains Mono.
// Product images are the 2026-10-18 studio renders, which carry the real marks (the chevron concepts are retired).
// COPY: Ridgefield voice (~/latarence/emails/docs + the Ridgefield voice docs): composed, minimal, no em dashes,
// no promotional or intensifying language. The home headline is PROVISIONAL (Ridgefield's site line).

const mark = '<svg class="rf-sq" viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="M0 0h18v18H0z M5 5v8h8V5z"/></svg>';
const MARK_NOTE = 'Concept renders. Final pieces are confirmed with the maker before the pre-order opens.';

export function header({ kit, page }) {
  const cur = (k) => (page === k ? ' aria-current="page"' : '');
  return `<header class="rf-head"><div class="rf-wrap rf-head-row">
<a class="rf-logo" href="${kit.href.home()}" aria-label="Ridgefield store, home">${mark}<span>RIDGEFIELD</span><span class="rf-logo-sub">/ store</span></a>
${kit.menuButton('Menu')}
<nav id="site-nav" class="rf-nav" aria-label="Main"><a href="${kit.href.shop()}"${cur('collection')}>Capsule 01</a><a href="${kit.href.story()}"${cur('story')}>About</a><a href="${kit.href.orders()}"${cur('orders')}>Orders</a>${kit.bagLink('Bag')}</nav>
</div></header>`;
}

export function footer({ brand, kit }) {
  // brand.json `footer` mirrors ridgefieldtech.com's footer (Principal 2026-10-26); the older shop footer stays as the fallback.
  if (brand.footer) return kit.configFooter({ cls: 'rf-foot', wrap: 'rf-wrap', mark: `<a class="rf-logo" href="https://ridgefieldtech.com/" aria-label="Ridgefield home">${mark}<span>RIDGEFIELD</span></a>` });
  return `<footer class="rf-foot"><div class="rf-wrap rf-foot-grid">
<div><a class="rf-logo" href="${kit.href.home()}" aria-label="Ridgefield store">${mark}<span>RIDGEFIELD</span></a></div>
<nav aria-label="Footer"><a href="${kit.href.shop()}">Capsule 01</a><a href="${kit.href.story()}">About</a></nav>
<nav aria-label="Help"><a href="${kit.href.orders()}">Order lookup</a><a href="${kit.href.policies()}">Shipping and exchanges</a><a href="mailto:${kit.esc(brand.policies.contact)}">${kit.esc(brand.policies.contact)}</a></nav>
</div><div class="rf-wrap"><p class="rf-fine rf-foot-note">© ${new Date().getUTCFullYear()} Ridgefield. ${MARK_NOTE}</p></div></footer>`;
}

const label = (t) => `<p class="rf-label"><span class="rf-tick" aria-hidden="true"></span>${t}</p>`;

function card(kit, p) {
  const v = kit.view(p);
  const im = p.images[0];
  return `<a class="rf-card" href="${kit.href.product(p)}">
<span class="rf-card-media">${kit.img(im, { sizes: '(max-width: 820px) 50vw, 30vw', alt: im.alt })}<span class="rf-corner rf-corner--tl" aria-hidden="true"></span><span class="rf-corner rf-corner--br" aria-hidden="true"></span></span>
<span class="rf-card-row"><span class="rf-mono">${kit.esc(p.ref)}</span><span class="rf-mono">${kit.esc(p.type)}</span></span>
<span class="rf-card-name">${kit.esc(p.name)}</span>
<span class="rf-card-meta">${v.priceText ? `<span class="rf-mono">${kit.esc(v.priceText)}</span>` : ''}<span class="seed-status seed-status--${v.status}">${kit.esc(v.label)}</span></span></a>`;
}

function specTable(kit, p) {
  const v = kit.view(p);
  const rows = [['Ref', p.ref], ['Type', p.type], ['Colour', (p.colors ?? []).map((c) => c.name).join(', ')], ['Sizes', (p.sizes ?? []).join(' / ')], ['Status', v.label], ['Price', v.priceText]];
  return `<dl class="rf-spec">${rows.filter(([, x]) => x).map(([k, x]) => `<dt>${k}</dt><dd>${kit.esc(x)}</dd>`).join('')}</dl>`;
}

export const pages = {
  home({ brand, kit, shown }) {
    const focus = shown.find((p) => ['preorder', 'available'].includes(kit.view(p).status)) ?? shown[0];
    const pack = shown.find((p) => p.category === 'gear');
    return {
      title: 'Ridgefield Store · Capsule 01',
      description: brand.description,
      image: kit.imgData('hoodie-front').src,
      body: `
<section class="rf-hero"><div class="rf-wrap rf-hero-grid">
<div class="rf-hero-copy">${label('Ridgefield / Capsule 01')}
<h1 class="rf-h1">${kit.esc(brand.tagline)}</h1>
<p class="rf-lede">Six pieces. Pricing and dates to follow.</p>
<a class="rf-btn" href="${kit.href.shop()}">View the capsule</a></div>
<div class="rf-hero-media">${kit.figure('hoodie-front', { concept: true, caption: 'Fig. 01 · RF-01 Hoodie', sizes: '(max-width: 820px) 100vw, 56vw', eager: true, alt: 'Ink hoodie with a small RIDGEFIELD wordmark on the left chest' })}
<span class="rf-corner rf-corner--tl" aria-hidden="true"></span><span class="rf-corner rf-corner--br" aria-hidden="true"></span></div>
</div></section>

<section class="rf-sec" aria-labelledby="capsule-t"><div class="rf-wrap">
<div class="rf-sec-head">${label('Index')}<h2 id="capsule-t" class="rf-h2">Capsule 01</h2><p class="rf-mono">${String(shown.length).padStart(2, '0')} items</p></div>
<div class="rf-grid">${shown.map((p) => card(kit, p)).join('')}</div>
<p class="rf-fine rf-note">${MARK_NOTE}</p>
</div></section>

<section class="rf-sec rf-focus" aria-labelledby="focus-t"><div class="rf-wrap rf-focus-grid">
<div class="rf-focus-media">${kit.figure(focus.images[0], { concept: true, caption: `${focus.ref} · ${focus.name}`, sizes: '(max-width: 820px) 100vw, 46vw' })}</div>
<div>${label('First release')}
<h2 id="focus-t" class="rf-h2">${kit.esc(focus.ref)} ${kit.esc(focus.name)}</h2>
<p class="rf-lede">${kit.esc(focus.summary)}</p>
${specTable(kit, focus)}
<a class="rf-btn" href="${kit.href.product(focus)}">${kit.view(focus).preorder ? 'Pre-order' : 'View'}</a></div>
</div></section>

<section class="rf-sec" aria-labelledby="mat-t"><div class="rf-wrap">
<div class="rf-sec-head">${label('Detail')}<h2 id="mat-t" class="rf-h2">Back views</h2><p class="rf-mono">Specs to be confirmed</p></div>
<div class="rf-figs">
${kit.figure('hoodie-back', { concept: true, caption: 'Fig. 02 · RF-01 back', sizes: '(max-width: 820px) 50vw, 25vw', alt: 'Ink hoodie, back' })}
${kit.figure('tee-back', { concept: true, caption: 'Fig. 03 · RF-02 back', sizes: '(max-width: 820px) 50vw, 25vw', alt: 'Charcoal tee, back' })}
${kit.figure('windbreaker-back', { concept: true, caption: 'Fig. 04 · RF-04 back', sizes: '(max-width: 820px) 50vw, 25vw', alt: 'Ink windbreaker, back' })}
${kit.figure('flannel-back', { concept: true, caption: 'Fig. 05 · RF-05 back', sizes: '(max-width: 820px) 50vw, 25vw', alt: 'Ink and tan plaid overshirt, back' })}
</div></div></section>

${pack ? `<section class="rf-pack" aria-labelledby="pack-t"><div class="rf-pack-media">${kit.img('field-walker', { sizes: '100vw', alt: 'A figure with a backpack walking along a ridge' })}</div>
<div class="rf-wrap rf-pack-copy"><div class="rf-pack-card">${label(`${kit.esc(pack.ref)} / In development`)}
<h2 id="pack-t" class="rf-h2">${kit.esc(pack.name)}</h2><p>${kit.esc(pack.summary)}</p><a class="rf-link" href="${kit.href.product(pack)}">Details</a><p class="rf-fine">Concept render</p></div></div></section>` : ''}`,
    };
  },

  collection({ kit, shown }) {
    const apparel = shown.filter((p) => p.category === 'apparel');
    const gear = shown.filter((p) => p.category === 'gear');
    return {
      title: 'Capsule 01 | Ridgefield Store',
      body: `<section class="rf-wrap rf-coll">${label('Index')}<h1 class="rf-h1 rf-h1--md">Capsule 01</h1>
<nav class="rf-filter" aria-label="Jump to"><a href="#apparel">Apparel <span class="rf-mono">${String(apparel.length).padStart(2, '0')}</span></a><a href="#gear">Gear <span class="rf-mono">${String(gear.length).padStart(2, '0')}</span></a></nav>
<h2 id="apparel" class="rf-h3">Apparel</h2><div class="rf-grid">${apparel.map((p) => card(kit, p)).join('')}</div>
<h2 id="gear" class="rf-h3">Gear</h2><div class="rf-grid">${gear.map((p) => card(kit, p)).join('')}</div>
<p class="rf-fine rf-note">${MARK_NOTE}</p></section>`,
    };
  },

  product({ kit }, p) {
    const [main, ...more] = p.images;
    return `<section class="rf-wrap rf-pdp">
<div class="rf-pdp-media"><div class="rf-pdp-main">${kit.figure(main, { concept: true, caption: `Fig. 01 · ${p.name}`, sizes: '(max-width: 820px) 100vw, 56vw', eager: true })}<span class="rf-corner rf-corner--tl" aria-hidden="true"></span><span class="rf-corner rf-corner--br" aria-hidden="true"></span></div>
${more.length ? `<div class="rf-pdp-more">${more.map((im, i) => kit.figure(im, { concept: true, caption: `Fig. 0${i + 2}`, sizes: '(max-width: 820px) 50vw, 28vw' })).join('')}</div>` : ''}
<p class="rf-fine">${MARK_NOTE}</p></div>
<div class="rf-pdp-panel"><div class="rf-sticky">
<p class="rf-crumb rf-mono"><a href="${kit.href.shop()}">Capsule 01</a> / ${kit.esc(p.ref)}</p>
<h1 class="rf-h1 rf-h1--pdp">${kit.esc(p.name)}</h1>
<p class="rf-lede">${kit.esc(p.summary)}</p>
${specTable(kit, p)}
${kit.buyBox(p, { showStatus: false })}
<div class="rf-pdp-details">${kit.details(p, { open: 1 })}</div>
</div></div></section>`;
  },

  story({ kit }) {
    return {
      title: 'About | Ridgefield Store',
      body: `<section class="rf-wrap rf-about">${label('About')}<h1 class="rf-h1 rf-h1--md">Ridgefield</h1>
<p class="rf-lede">Ridgefield develops advanced technology for systems that have to perform in the field, from RF hardware and sensing to the software that runs them. Capsule 01 carries the same marks: the square, the mono type and the terrain line.</p>
<p class="rf-lede">Specifications are published when confirmed with the maker.</p>
</section>
<section class="rf-wrap rf-about-fig">${kit.figure('field-walker', { concept: true, caption: 'Fig. 06 · Field', sizes: '(max-width: 820px) 100vw, 70vw', alt: 'A figure with a backpack walking along a ridge' })}</section>`,
    };
  },
};
