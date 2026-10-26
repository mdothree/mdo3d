// Butts Studios layout. Direction: the early lookbook + the "Made of Story." first pass (developer handoff §6,
// images 01–03), NOT 06_latest_site_concept (the Claude design version the Principal likes less: no serif
// headline, no letter-spaced serif tagline, no tote/cap/backpack). Studio philosophy: thoughtful, advanced,
// technical, measured (~/buttsstudios/design/DESIGN_DIRECTIONS.md): precise grid, mono metadata, numbered
// pieces, stage bars, honest captions, full even borders, one accent (rust).

// C5 mark: inline SVG from ~/buttsstudios/site/index.html (square + X, stroke 12 of 100, X into the corners).
const C5 = '<svg class="bs-x" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="12"><rect x="10" y="10" width="80" height="80"/><path d="M10 10 L90 90 M90 10 L10 90"/></g></svg>';

// Collection 2027 (Principal 2026-10-26): home objects in the same shop (one bag, one checkout) as their own
// collection. Everything for it keys off `collection: "2027"` so it could move to its own site later.
const C27 = '2027';
const isC27 = (p) => p.collection === C27;
const c27Href = (kit) => `${kit.root}collection-2027.html`;

// Collection 2027 images are concept renders and say so.
const fig = (kit, im, opts = {}) => kit.figure(im, { concept: true, ...opts });

const STAGES = [['in_development', 'Concept'], ['next_drop', 'Next drop'], ['preorder', 'Pre-order'], ['available', 'Available']];
function stageBar(kit, p) {
  const s = kit.view(p).status;
  const at = STAGES.findIndex(([k]) => k === s);
  if (at < 0) return '';
  return `<div class="bs-stage" aria-label="Stage: ${kit.esc(STAGES[at][1])}"><span class="bs-stage-bar" aria-hidden="true">${STAGES.map((_, i) => `<i class="${i < at ? 'on' : i === at ? 'now' : ''}"></i>`).join('')}</span><span class="bs-mono">${kit.esc(STAGES[at][1])}</span></div>`;
}

export function header({ kit, page }) {
  const cur = (k) => (page === k ? ' aria-current="page"' : '');
  return `<header class="bs-head"><div class="bs-wrap bs-head-row">
<a class="bs-mark" href="${kit.href.home()}" aria-label="Butts Studios, shop home">${C5}<span class="bs-word">Butts<br>Studios</span></a>
${kit.menuButton('Menu')}
<nav id="site-nav" class="bs-nav" aria-label="Main">
<a href="${kit.href.shop()}"${cur('collection')}>Apparel</a><a href="${kit.href.shop()}#accessories">Accessories</a><a href="${c27Href(kit)}"${cur('collection-2027')}>Collection 2027</a><a href="${kit.href.story()}"${cur('story')}>Story</a>${kit.bagLink('Bag')}
</nav></div></header>`;
}

export function footer({ brand, kit }) {
  // brand.json `footer` mirrors buttsstudios.com's footer (Principal 2026-10-26); the older shop footer stays as the fallback.
  if (brand.footer) return kit.configFooter({ cls: 'bs-foot', wrap: 'bs-wrap', mark: `<a class="bs-mark bs-mark--sm" href="https://buttsstudios.com/" aria-label="Butts Studios home">${C5}<span class="bs-word">Butts<br>Studios</span></a>` });
  return `<footer class="bs-foot"><div class="bs-wrap bs-foot-grid">
<div><a class="bs-mark bs-mark--sm" href="${kit.href.home()}" aria-label="Butts Studios">${C5}<span class="bs-word">Butts<br>Studios</span></a><p class="bs-foot-tag">Made of Story.</p></div>
<div><p class="bs-mono">Shop</p><a href="${kit.href.shop()}">Apparel</a><a href="${kit.href.shop()}#accessories">Accessories</a><a href="${c27Href(kit)}">Collection 2027</a><a href="${kit.href.cart()}">Bag</a></div>
<div><p class="bs-mono">Help</p><a href="${kit.href.orders()}">Order lookup</a><a href="${kit.href.policies()}">Shipping and exchanges</a><a href="mailto:${kit.esc(brand.policies.contact)}">${kit.esc(brand.policies.contact)}</a></div>
<div><p class="bs-mono">Studio</p><a href="${kit.href.story()}">Story</a></div>
</div><div class="bs-wrap"><p class="bs-fine">© ${new Date().getUTCFullYear()} Butts Studios. Images on this preview are concept renders.</p></div></footer>`;
}

const bagPlaceholder = (kit, p) => `<a class="bs-card bs-card--concept" href="${kit.href.product(p)}">
<span class="bs-card-media bs-ph"><span class="bs-ph-x">${C5}</span><span class="bs-mono">In rework · no image yet</span></span>
<span class="bs-card-row"><span class="bs-mono">No. ${kit.esc(p.no)}</span><span class="bs-mono">${kit.esc(p.type)}</span></span>
<span class="bs-card-name">${kit.esc(p.name)}</span><span class="seed-status seed-status--${kit.view(p).status}">${kit.esc(kit.view(p).label)}</span></a>`;

function card(kit, p, sizes = '(max-width: 820px) 100vw, 33vw') {
  if (!p.images?.length) return bagPlaceholder(kit, p);
  const v = kit.view(p);
  const color = p.colors?.[0]?.name ?? '';
  return `<a class="bs-card" href="${kit.href.product(p)}">
<span class="bs-card-media">${kit.img(p.images[0], { sizes, alt: p.images[0].alt })}<span class="bs-tag">Concept</span></span>
<span class="bs-card-row"><span class="bs-mono">No. ${kit.esc(p.no)}</span><span class="bs-mono">${kit.esc([p.type, color].filter(Boolean).join(' · '))}</span></span>
<span class="bs-card-name">${kit.esc(p.name)}</span>
<span class="bs-card-meta">${v.priceText ? `<span>${kit.esc(v.priceText)}</span>` : ''}<span class="seed-status seed-status--${v.status}">${kit.esc(v.label)}</span></span></a>`;
}

function indexRow(kit, p) {
  const v = kit.view(p);
  return `<li><a class="bs-row" href="${kit.href.product(p)}">
<span class="bs-row-no bs-mono">${kit.esc(p.no)}</span>
<span class="bs-row-thumb">${p.images?.length ? kit.img(p.images[0], { sizes: '96px', alt: '' }) : `<span class="bs-ph bs-ph--sm">${C5}</span>`}</span>
<span class="bs-row-name">${kit.esc(p.name)}<span class="bs-row-sub">${kit.esc([p.type, p.colors?.[0]?.name].filter(Boolean).join(' · '))}</span></span>
<span class="bs-row-status seed-status seed-status--${v.status}">${kit.esc(v.label)}</span>
<span class="bs-row-go" aria-hidden="true">→</span></a></li>`;
}

export const pages = {
  home({ brand, kit, shown: all }) {
    const shown = all.filter((p) => !isC27(p));
    const c27 = all.filter(isC27);
    const focus = shown.find((p) => ['preorder', 'available'].includes(kit.view(p).status)) ?? shown[0];
    const fv = kit.view(focus);
    return {
      title: 'Butts Studios Apparel · Made of Story.',
      description: brand.description,
      image: kit.imgData('hero-wearer').src,
      body: `
<section class="bs-hero"><div class="bs-wrap bs-hero-grid">
<div class="bs-hero-copy">
<p class="bs-mono bs-eyebrow">${kit.esc(brand.copy.eyebrow)}</p>
<h1 class="bs-display">Made of Story.</h1>
<p class="bs-lede">${kit.esc(brand.copy.intro)}</p>
<a class="bs-link" href="${kit.href.shop()}">View the collection <span aria-hidden="true">→</span></a>
</div>
<div class="bs-hero-media">${kit.figure('hero-wearer', { concept: true, caption: 'Contour Hoodie, black', sizes: '(max-width: 820px) 100vw, 58vw', eager: true, alt: 'A person in the black contour hoodie and a black beanie, seen from behind' })}</div>
</div></section>

<section class="bs-focus" aria-labelledby="focus-title"><div class="bs-wrap bs-focus-grid">
<div class="bs-focus-media">
${kit.figure(focus.images[0], { concept: true, sizes: '(max-width: 820px) 100vw, 40vw' })}
${focus.images[1] ? kit.figure(focus.images[1], { concept: true, sizes: '(max-width: 820px) 100vw, 26vw' }) : ''}
</div>
<div class="bs-focus-copy">
<p class="bs-mono">No. ${kit.esc(focus.no)} · ${kit.esc(focus.line)}</p>
<h2 id="focus-title" class="bs-h2">${kit.esc(focus.name)}<span class="bs-h2-sub">${kit.esc(focus.colors?.[0]?.name ?? '')}</span></h2>
<p>${kit.esc(focus.summary)}</p>
${stageBar(kit, focus)}
<p class="bs-focus-price">${kit.esc(fv.priceText)}</p>
<a class="bs-btn" href="${kit.href.product(focus)}">${fv.preorder ? 'Pre-order' : 'View'} the ${kit.esc(focus.name.toLowerCase())}</a>
</div></div></section>

<section class="bs-index" aria-labelledby="index-title"><div class="bs-wrap">
<div class="bs-sec-head"><h2 id="index-title" class="bs-h3">The collection</h2><p class="bs-mono">${String(shown.length).padStart(2, '0')} pieces</p></div>
<ol class="bs-rows">${shown.map((p) => indexRow(kit, p)).join('')}</ol>
</div></section>

${c27.length ? c27Band(kit, brand, c27) : ''}

<section class="bs-detail" aria-labelledby="detail-title"><div class="bs-wrap">
<div class="bs-sec-head"><h2 id="detail-title" class="bs-h3">Detail</h2><p class="bs-mono">Concept renders · materials to be confirmed</p></div>
<div class="bs-detail-grid">
${kit.figure('look-knit', { concept: true, caption: 'Knit and patch', sizes: '(max-width: 820px) 50vw, 25vw', alt: 'Rib knit with a woven square-and-X patch' })}
${kit.figure('detail-label', { concept: true, caption: 'Woven label', sizes: '(max-width: 820px) 50vw, 25vw', alt: 'Woven Butts Studios label' })}
${kit.figure('detail-flannel', { concept: true, caption: 'Plaid weave', sizes: '(max-width: 820px) 50vw, 25vw', alt: 'Dark plaid weave' })}
${kit.figure('look-zip', { concept: true, caption: 'Zip pull', sizes: '(max-width: 820px) 50vw, 25vw', alt: 'Rust zip pull with the studio mark' })}
</div></div></section>

<section class="bs-story-teaser"><div class="bs-wrap bs-teaser-grid">
${kit.figure('look-reader', { concept: true, caption: 'Plaid Flannel, in the studio', sizes: '(max-width: 820px) 100vw, 50vw', alt: 'Someone reading in a chair, wearing the plaid flannel' })}
<div><p class="bs-mono">Story</p><h2 class="bs-h2">A studio that writes and draws its own work.</h2>
<p>Butts Studios has made books, comics, channels, cartoons and art since 2018. The apparel carries the same marks and the same contour drawings.</p>
<a class="bs-link" href="${kit.href.story()}">Read the story <span aria-hidden="true">→</span></a></div>
</div></section>`,
    };
  },

  collection({ kit, brand, shown: all }) {
    const shown = all.filter((p) => !isC27(p));
    const c27 = all.filter(isC27);
    const apparel = shown.filter((p) => p.category === 'apparel');
    const acc = shown.filter((p) => p.category === 'accessories');
    return {
      title: 'Collection | Butts Studios',
      body: `<section class="bs-wrap bs-coll">
<div class="bs-coll-head"><h1 class="bs-h1">Collection</h1><p class="bs-mono">${String(shown.length).padStart(2, '0')} pieces · images are concept renders</p>
<nav class="bs-filter" aria-label="Jump to"><a href="#apparel">Apparel <span class="bs-mono">${apparel.length}</span></a><a href="#accessories">Accessories <span class="bs-mono">${acc.length}</span></a></nav></div>
<h2 id="apparel" class="bs-h3 bs-coll-sec">Apparel</h2>
<div class="bs-grid">${apparel.map((p) => card(kit, p, '(max-width: 820px) 100vw, 50vw')).join('')}</div>
<h2 id="accessories" class="bs-h3 bs-coll-sec">Accessories</h2>
<div class="bs-grid">${acc.map((p) => card(kit, p, '(max-width: 820px) 100vw, 50vw')).join('')}</div>
</section>${c27.length ? c27Band(kit, brand, c27) : ''}`,
    };
  },

  product(ctx, p) {
    const { kit } = ctx;
    if (isC27(p) && p.release) return c27Product(ctx, p);
    const imgs = p.images ?? [];
    const media = imgs.length
      ? `<div class="bs-pdp-main">${fig(kit, imgs[0], { sizes: '(max-width: 820px) 100vw, 58vw', eager: true })}</div>
<div class="bs-pdp-more">${imgs.slice(1).map((im) => fig(kit, im, { sizes: '(max-width: 820px) 50vw, 29vw' })).join('')}</div>`
      : `<div class="bs-pdp-main"><div class="bs-ph bs-ph--lg"><span class="bs-ph-x">${C5}</span><span class="bs-mono">In rework · no image yet</span></div></div>`;
    const crumb = isC27(p) ? `<a href="${c27Href(kit)}">Collection 2027</a>` : `<a href="${kit.href.shop()}">Apparel</a>`;
    return `<div class="bs-wrap"><p class="bs-crumb bs-mono">${crumb} / No. ${kit.esc(p.no)}</p></div>
<section class="bs-wrap bs-pdp"><div class="bs-pdp-media">${media}</div>
<div class="bs-pdp-panel"><div class="bs-sticky">
<p class="bs-mono">No. ${kit.esc(p.no)} · ${kit.esc(p.type)}</p>
<h1 class="bs-h1">${kit.esc(p.name)}</h1>
${p.colors?.length === 1 ? `<p class="bs-pdp-color">${kit.esc(p.colors[0].name)}</p>` : ''}
<p>${kit.esc(p.summary)}</p>
${p.release ? '' : stageBar(kit, p)}
${kit.buyBox(p)}
<div class="bs-pdp-details">${kit.details(p, { open: 1 })}</div>
</div></div></section>`;
  },

  story({ kit }) {
    const P = [['Thoughtful', 'Every element earns its place. Fewer, better pieces.'], ['Advanced', 'Modern tools used with real craft. Technology finishes the work; the hand starts it.'], ['Technical', 'Precise grids, exact spacing, real numbers. We show the working.'], ['Measured', 'Restraint. One accent colour, calm type, quiet labels.']];
    return {
      title: 'Story | Butts Studios',
      body: `<section class="bs-wrap bs-story-hero"><p class="bs-mono bs-eyebrow">Story</p><h1 class="bs-display bs-display--md">Made of Story.</h1>
<p class="bs-lede">Butts Studios is a production studio founded in 2018. Books, comics, channels, cartoons and art: some of these ideas are older than the tools now finishing them. We write and draw them here, and see each one through to release.</p></section>
<section class="bs-wrap bs-story-grid">
${kit.figure('contour', { concept: true, caption: 'Contour artwork', sizes: '(max-width: 820px) 100vw, 50vw', alt: 'Contour-line artwork on black with Made of Story.' })}
<div><h2 class="bs-h2">The contour drawings</h2><p>The line work on the hoodies comes from the studio's own drawing practice: contour lines that read like terrain and like handwriting at once. They are drawings, not maps of a real place.</p></div>
</section>
<section class="bs-wrap"><div class="bs-sec-head"><h2 class="bs-h3">How the studio works</h2></div>
<ol class="bs-phil">${P.map(([h, t], i) => `<li><span class="bs-mono">0${i + 1}</span><h3>${h}</h3><p>${t}</p></li>`).join('')}</ol></section>
<section class="bs-wrap bs-craft"><div class="bs-sec-head"><h2 class="bs-h3">Craft</h2><p class="bs-mono">Materials are confirmed with the maker before launch</p></div>
<div class="bs-detail-grid">
${kit.figure('look-knit', { concept: true, caption: 'Knit', sizes: '(max-width: 820px) 50vw, 25vw', alt: 'Rib knit' })}
${kit.figure('look-flannel', { concept: true, caption: 'Flannel', sizes: '(max-width: 820px) 50vw, 25vw', alt: 'Plaid flannel collar' })}
${kit.figure('detail-zip', { concept: true, caption: 'Hardware', sizes: '(max-width: 820px) 50vw, 25vw', alt: 'Zip with studio pull' })}
${kit.figure('detail-neck', { concept: true, caption: 'Labels', sizes: '(max-width: 820px) 50vw, 25vw', alt: 'Small rust label at the neck' })}
</div></section>
<section class="bs-wrap bs-story-end"><a class="bs-btn" href="${kit.href.shop()}">View the collection</a></section>`,
    };
  },

  extra: {
    'collection-2027'({ brand, kit, shown }) {
      const items = shown.filter(isC27);
      const groups = (brand.copy?.c27Groups ?? [['all', 'All']]).filter(([k]) => k === 'all' || items.some((p) => p.group === k));
      const n = (x) => `${x} ${x === 1 ? 'piece' : 'pieces'}`;
      return {
        title: 'Collection 2027 | Butts Studios',
        description: brand.copy?.c27Intro ?? 'Collection 2027 from Butts Studios.',
        image: kit.imgData('c27-ed-hero').src,
        body: `<div class="c27x"><div class="wrap">
<section class="c-hero">
<div class="c-hero-copy"><p class="t-label">Collection 2027 · ${n(items.length)}</p>
<h1 class="t-display">${kit.esc(brand.copy?.c27Headline ?? 'Collection 2027')}</h1>
<p class="t-lede">${kit.esc(brand.copy?.c27Intro ?? '')}</p></div>
<figure class="c-hero-media">${kit.img('c27-ed-hero', { sizes: '(max-width: 860px) 100vw, 58vw', eager: true, alt: 'The Collection 2027 pieces lined up on a stone ledge over a checker rug, in late sun' })}<figcaption><span class="tag">Concept render</span></figcaption></figure>
</section>
<div class="c-bar"><div class="c-filters" role="group" aria-label="Filter by type" data-filter>${groups.map(([k, l], i) => `<button type="button" data-k="${kit.esc(k)}" aria-pressed="${i === 0}">${kit.esc(l)}</button>`).join('')}</div>
<p class="t-label" data-filter-count data-one="piece" data-many="pieces">${n(items.length)}</p></div>
<div class="c-grid" data-filter-grid>${items.map((p) => c27Card(kit, p)).join('')}</div>
<section class="c-note"><h2 class="t-h2">About these images</h2><p class="t-body">${kit.esc(brand.copy?.c27Note ?? '')}</p></section>
</div></div>`,
      };
    },
  },
};

const c27Price = (v) => (v.price_cents !== null ? `$${(v.price_cents / 100).toFixed(2)}` : '');
const viewLabel = (im) => (/-lifestyle$/.test(im.file) ? 'In the room' : /-closeup$/.test(im.file) ? 'Close-up' : 'Product');

/** Collection 2027 card: product image, the lifestyle image on hover/focus, state tag, No. / name / price / type. */
function c27Card(kit, p) {
  const v = kit.view(p);
  const r = v.release ?? {};
  const a = p.images.find((im) => /-product$/.test(im.file)) ?? p.images[0];
  const b = p.images.find((im) => im !== a && /-lifestyle$/.test(im.file)) ?? p.images.find((im) => im !== a);
  const sizes = '(max-width: 860px) 50vw, (max-width: 1100px) 50vw, 33vw';
  const price = c27Price(v);
  return `<a class="card" href="${kit.href.product(p)}" data-group="${kit.esc(p.group ?? '')}">
<span class="card-media"><span class="tag" data-state="${kit.esc(r.state ?? v.status)}"><i></i>${kit.esc([r.tag, r.window].filter(Boolean).join(' · ') || v.label)}</span>${kit.img(a, { sizes, alt: a.alt })}${b ? kit.img(b, { sizes, alt: '' }) : ''}</span>
<span class="card-body"><span class="t-label card-no">No. ${kit.esc(p.no)}</span><span class="card-name">${kit.esc(p.name)}</span><span class="card-price">${price ? `${price} <small>planned</small>` : 'Price to be set'}</span><span class="card-type">${kit.esc([p.type, p.colors?.[0]?.name].filter(Boolean).join(' · '))}</span></span></a>`;
}

/** Collection 2027 product page (DESIGN_SPEC.md): gallery, one state block for the four states, details, related. */
function c27Product({ brand, kit, shown }, p) {
  const v = kit.view(p);
  const r = v.release;
  const imgs = p.images ?? [];
  const tag = [r.tag, r.state === 'order' ? '' : r.window].filter(Boolean).join(' · ');
  const price = c27Price(v);
  const full = r.full ? ` data-limit="${r.limit}" data-full-tag="${kit.esc([r.full.tag, r.window].filter(Boolean).join(' · '))}" data-full-status="${kit.esc(r.full.status)}" data-full-button="${kit.esc(r.full.button)}" data-full-helper="${kit.esc(r.full.helper)}" data-full-plain-helper="${kit.esc(r.full.plainHelper)}" data-full-reason="${kit.esc(r.full.reason)}" data-full-done="${kit.esc(r.full.done)}" data-full-consent="${kit.esc(r.full.consent)}"` : '';
  const action = v.canAdd
    ? `<form class="seed-add" data-add data-product="${kit.esc(p.id)}" novalidate>${kit.swatches(p)}${kit.sizes(p)}<button class="btn seed-add-btn" type="submit">${kit.esc(r.button)}</button><p class="seed-msg" role="status" aria-live="polite"></p></form>`
    : `<form class="seed-notify" data-notify data-replace data-product="${kit.esc(p.id)}" data-list="${kit.esc(r.list)}" data-done="${kit.esc(r.done)}" novalidate>
<label class="sr-only" for="notify-${kit.esc(p.id)}">Email address</label><input id="notify-${kit.esc(p.id)}" type="email" name="email" autocomplete="email" placeholder="Email address" required><button class="btn" type="submit">${kit.esc(r.button)}</button>
<p class="seed-msg buy-reason" role="status" aria-live="polite"></p></form>`;
  const [design, ...rest] = p.details ?? [];
  const pending = (t) => /^details coming\.?$/i.test(String(t).trim());
  const pol = brand.policies ?? {};
  const shipText = [brand.shipping?.note, 'No change-of-mind returns.', `Faulty or wrong items are replaced or refunded; report them within ${Number.isInteger(pol.defect_window_days) ? pol.defect_window_days : 30} days of delivery.`].filter(Boolean).join(' ');
  const others = shown.filter((x) => isC27(x) && x.id !== p.id && x.release);
  const related = [...others.filter((x) => x.group === p.group), ...others.filter((x) => x.group !== p.group)].slice(0, 4);
  const count = shown.filter(isC27).length;
  return {
    body: `<div class="c27x"><div class="wrap">
<nav class="crumb t-label" aria-label="Breadcrumb"><a href="${c27Href(kit)}">Collection 2027</a> / No. ${kit.esc(p.no)}</nav>
<section class="pdp">
<div class="gal" data-gallery>
<div class="gal-thumbs">${imgs.map((im, i) => `<button type="button" data-gal-thumb="${i}" aria-current="${i === 0}" aria-label="View ${kit.esc(viewLabel(im).toLowerCase())}">${kit.img(im, { sizes: '72px', alt: '' })}</button>`).join('')}</div>
<div><div class="gal-stage">
<div class="gal-track" data-gal-track>${imgs.map((im, i) => `<figure data-i="${i}" data-full="${kit.esc(kit.imgData(im).src)}">${kit.img(im, { sizes: '(max-width: 860px) 100vw, 52vw', eager: i === 0, alt: im.alt })}</figure>`).join('')}</div>
<div class="gal-meta"><span class="tag">Concept render</span><span class="gal-view tag" data-gal-view data-labels="${kit.esc(imgs.map(viewLabel).join('|'))}">${kit.esc(viewLabel(imgs[0]))} · 1 / ${imgs.length}</span></div>
</div>
<div class="gal-dots">${imgs.map((_, i) => `<i data-gal-dot="${i}" aria-current="${i === 0}"></i>`).join('')}</div></div>
</div>
<div class="panel">
<div class="p-head"><p class="t-label">No. ${kit.esc(p.no)} · ${kit.esc(p.type)}</p>
<h1 class="t-h1">${kit.esc(p.name)}</h1>
<p class="t-lede">${kit.esc(p.summary)}</p>
${p.colors?.[0] ? `<p class="swatch"><i class="sw-${kit.esc(p.colors[0].id)}" aria-hidden="true"></i>${kit.esc(p.colors[0].name)}</p>` : ''}</div>
<div class="buy" id="buy" data-release="${kit.esc(p.id)}"${full}>
<div class="buy-top"><div class="buy-price">${price ? `${price}<small>Planned price</small>` : `Price to be set<small>Shown before ${r.state === 'reserve' ? 'orders' : 'reservations'} open</small>`}</div><span class="tag" data-state="${kit.esc(r.state)}"><i></i><span data-tag-text>${kit.esc(tag)}</span></span></div>
${r.reason ? `<p class="buy-reason" data-reason>${kit.esc(r.reason)}</p>` : ''}
${action}
${r.helper ? `<p class="buy-helper" data-helper>${kit.esc(r.helper)}</p>` : ''}
${r.terms ? `<p class="buy-fine" data-terms>${kit.esc(r.terms)}</p>` : ''}
${v.canAdd ? '' : `<p class="buy-fine" data-consent>${kit.esc(r.consent || 'We use your email only for this piece. Unsubscribe any time.')} <a href="${kit.href.privacy()}">Privacy</a></p>`}
</div>
<div class="acc">
${design ? `<details open><summary>${kit.esc(design[0])}</summary><div class="acc-body"><p class="t-body">${kit.esc(design[1])}</p></div></details>` : ''}
${rest.length ? `<details><summary>Details and dimensions</summary><div class="acc-body"><dl>${rest.map(([k, t]) => `<dt>${kit.esc(k)}</dt><dd>${pending(t) ? '<span class="pending">Details coming</span>' : kit.esc(t)}</dd>`).join('')}</dl></div></details>` : ''}
<details><summary>Shipping and returns</summary><div class="acc-body"><p class="t-body">${kit.esc(shipText)} <a href="${kit.href.returns()}">Returns and pre-orders</a> · <a href="${kit.href.shipping()}">Shipping</a></p></div></details>
</div>
<div class="assure">
<div><b>US shipping</b><span>Rate shown at checkout</span></div>
<div><b>Faulty or wrong items</b><span>Replaced or refunded</span></div>
<div><b>Questions</b><span>${kit.esc(pol.contact ?? '')}</span></div>
</div>
</div>
</section>
${related.length ? `<section class="related"><div class="related-head"><h2 class="t-h2">More from Collection 2027</h2><a class="t-label" href="${c27Href(kit)}">All ${count} pieces</a></div>
<div class="c-grid">${related.map((x) => c27Card(kit, x)).join('')}</div></section>` : ''}
</div>
<div class="mbar" data-mbar><div><b>${kit.esc(p.name)}</b><span>${kit.esc(price ? `${price} planned · ${tag}` : tag)}</span></div><a class="btn" href="#buy">${kit.esc(r.button)}</a></div>
<div class="zoom" data-zoom role="dialog" aria-label="Zoomed image"><img alt=""><button type="button" aria-label="Close">×</button></div>
</div>`,
  };
}

/** Collection 2027 band on the shop home and the apparel page: one wide lifestyle photo, links to its landing page. */
function c27Band(kit, brand, items) {
  return `<section class="c27-band" aria-labelledby="c27-band-title"><div class="bs-wrap">
<div class="bs-sec-head"><h2 id="c27-band-title" class="bs-h3">Collection 2027</h2><p class="bs-mono">${String(items.length).padStart(2, '0')} pieces · planned for 2027</p></div>
<a class="c27-band-media" href="${c27Href(kit)}">${fig(kit, { file: 'c27-ed-hero', alt: 'The Collection 2027 pieces lined up on a stone ledge over a checker mat, in late sun', concept: true }, { sizes: '(max-width: 1320px) 100vw, 1320px' })}</a>
<p class="c27-band-lede">${kit.esc(brand.copy?.c27Intro ?? '')}</p>
<a class="bs-link" href="${c27Href(kit)}">View Collection 2027 <span aria-hidden="true">→</span></a>
</div></section>`;
}
