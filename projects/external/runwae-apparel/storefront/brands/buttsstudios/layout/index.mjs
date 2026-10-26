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

  product({ kit }, p) {
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
      const rows = items.map((p, i) => c27Row(kit, p, i));
      if (rows.length > 4) rows.splice(4, 0, `<div class="c27-wide">${fig(kit, { file: 'c27-ed-studio', alt: 'Several Collection 2027 pieces together on a desk and floor in warm light', concept: true }, { sizes: '100vw' })}</div>`);
      return {
        title: 'Collection 2027 | Butts Studios',
        description: brand.copy?.c27Intro ?? 'Collection 2027 from Butts Studios.',
        image: kit.imgData('c27-ed-hero').src,
        body: `<section class="c27-hero">
<div class="c27-hero-media">${fig(kit, { file: 'c27-ed-hero', alt: 'The Collection 2027 pieces lined up on a stone ledge over a checker mat, in late sun', concept: true }, { sizes: '100vw', eager: true })}</div>
<div class="bs-wrap c27-hero-copy"><p class="bs-mono bs-eyebrow">Butts Studios · Collection 2027</p>
<h1 class="bs-display bs-display--md">Collection 2027</h1>
<p class="bs-lede">${kit.esc(brand.copy?.c27Intro ?? '')}</p>
<p class="bs-mono">${String(items.length).padStart(2, '0')} pieces · concept renders</p></div>
</section>
<section class="bs-wrap c27-list" aria-label="Collection 2027 pieces">
${rows.join('')}
</section>
<section class="bs-wrap c27-note"><p>${kit.esc(brand.copy?.c27Note ?? '')}</p><a class="bs-link" href="${kit.href.shop()}">Apparel <span aria-hidden="true">→</span></a></section>`,
      };
    },
  },
};

/** One Collection 2027 piece on its landing page: lifestyle photo first, the facts beside it. */
function c27Row(kit, p, i) {
  const v = kit.view(p);
  const life = p.images.find((im) => im.file.endsWith('-lifestyle')) ?? p.images[0];
  const prod = p.images.find((im) => im.file.endsWith('-product'));
  return `<article class="c27-row${i % 2 ? ' c27-row--flip' : ''}">
<a class="c27-row-media" href="${kit.href.product(p)}">${fig(kit, life, { sizes: '(max-width: 820px) 100vw, 58vw' })}</a>
<div class="c27-row-copy">
<p class="bs-mono">No. ${kit.esc(p.no)} · ${kit.esc(p.type)} · ${kit.esc(p.colors?.[0]?.name ?? '')}</p>
<h2 class="bs-h2"><a href="${kit.href.product(p)}">${kit.esc(p.name)}</a></h2>
<p>${kit.esc(p.summary)}</p>
<p class="c27-row-meta">${v.priceText ? `<span>${kit.esc(v.priceText)}</span>` : ''}<span class="seed-status seed-status--${kit.esc(v.release?.state ?? v.status)}">${kit.esc(v.label)}</span></p>
${prod ? `<a class="c27-row-thumb" href="${kit.href.product(p)}">${kit.img(prod, { sizes: '160px', alt: '' })}</a>` : ''}
<a class="bs-btn" href="${kit.href.product(p)}">View the piece</a>
</div></article>`;
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
