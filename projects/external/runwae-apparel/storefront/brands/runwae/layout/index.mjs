// Runwae Apparel layout, v2 (Principal 2026-10-14: "i think the runwae apparel site can be more like its images
// that were shared and i dont like the picture of the drawing there on the site").
// Direction: the shared editorial concepts (handoff assets/05_generated_explorations + RUNWAE_Ad_Concept_Crops):
// full-bleed photography of people wearing the drawn pieces, warm natural light, forest / ivory / black / rust,
// large immersive panels, product shown through the photos. The bare sketches are NOT featured as pictures
// (this overrides the handoff's "drawings prominent" guidance); the drawings appear on the garments.
// Still: story before the collection, no museum styling, no third-party reference images, no Poison or Pave.
// All concept photography is captioned "Concept". LOGO: provisional type-only RUNWAE / APPAREL wordmark.
// Owner archive photography (assets/03_*) appears on the Story page only: rights/releases to confirm.
// v3 home follows runwae_apparel_a_curious_journey.png (masthead hero, vertical belief column, Built on…,
// A more curious world, Art in every detail, The Archive, collection, A continuing journey).

const wordmark = (kit, cls = '') => `<a class="rw-mark${cls}" href="${kit.href.home()}" aria-label="Runwae Apparel, home"><span>Runwae</span><span>Apparel</span></a>`;

export function header({ kit, page }) {
  const cur = (k) => (page === k ? ' aria-current="page"' : '');
  return `<header class="rw-head${page === 'home' ? ' rw-head--over' : ''}"><div class="rw-wrap rw-head-row">
${wordmark(kit)}
${kit.menuButton('Menu')}
<nav id="site-nav" class="rw-nav" aria-label="Main"><a href="${kit.href.shop()}"${cur('collection')}>Shop</a><a href="${kit.href.story()}"${cur('story')}>Story</a>${kit.bagLink('Bag')}</nav>
</div></header>`;
}

export function footer({ brand, kit }) {
  return `<footer class="rw-foot"><div class="rw-wrap">
<p class="rw-foot-line">Ideas. People. Places. Progress.</p>
<div class="rw-foot-grid">${wordmark(kit, ' rw-mark--foot')}
<nav aria-label="Footer"><a href="${kit.href.shop()}">Shop</a><a href="${kit.href.story()}">Story</a><a href="${kit.href.orders()}">Order lookup</a><a href="${kit.href.policies()}">Shipping and exchanges</a></nav>
<p class="rw-fine">${kit.esc(brand.endorsement)}<br>${kit.esc(brand.policies.contact)}</p></div>
<p class="rw-fine">© ${new Date().getUTCFullYear()} Runwae Apparel. Photography marked Concept is design concept imagery. Logo provisional.</p>
</div></footer>`;
}

/** A photo panel that links to the piece it shows. */
function panel(kit, file, { alt, href, label, sizes = '50vw', cls = '', eager = false }) {
  const inner = `${kit.img(file, { sizes, alt, eager })}<span class="rw-pcap"><span class="rw-ptag">Concept</span>${label ? `<span class="rw-plabel">${kit.esc(label)}</span>` : ''}</span>`;
  return href ? `<a class="rw-panel${cls}" href="${href}">${inner}</a>` : `<figure class="rw-panel${cls}">${inner}</figure>`;
}

function quietCard(kit, p, { big = false } = {}) {
  const v = kit.view(p);
  const im = p.images[0];
  return `<a class="rw-card${big ? ' rw-card--big' : ''}" href="${kit.href.product(p)}">
<span class="rw-card-media${im.concept ? ' rw-card-media--photo' : ''}">${kit.img(im, { sizes: big ? '(max-width: 820px) 100vw, 50vw' : '(max-width: 820px) 50vw, 25vw', alt: im.alt })}${im.concept ? '<span class="rw-tag">Concept</span>' : ''}</span>
<span class="rw-card-line">${kit.esc(p.line)}</span><span class="rw-card-name">${kit.esc(p.name)}</span>
<span class="rw-card-meta">${v.priceText ? `<span>${kit.esc(v.priceText)}</span>` : ''}<span class="seed-status seed-status--${v.status}">${kit.esc(v.label)}</span></span></a>`;
}

export const pages = {
  home({ brand, kit, shown, archive }) {
    // v3 (Principal: "could learn alot more from the images and mockups that were shared in its concepts"):
    // follows runwae_apparel_a_curious_journey.png section by section. Atmosphere and materials tiles are
    // cropped from the three handoff photo banks; every concept-derived image carries a Concept tag.
    const focus = shown.find((p) => ['preorder', 'available'].includes(kit.view(p).status)) ?? shown[0];
    const rest = shown.filter((p) => p !== focus);
    const P = (id) => kit.href.product(id);
    const tile = (file, alt, label, href) => panel(kit, file, { alt, label, href, sizes: '(max-width: 820px) 50vw, 17vw' });
    const words = '<ul class="rw-words" aria-label="Brand beliefs"><li>Ideas</li><li>People</li><li>Places</li><li>Progress</li></ul>';
    return {
      title: 'Runwae Apparel · A continuing journey',
      description: brand.description,
      image: kit.imgData('drawn-figure-hoodie').src,
      body: `
<section class="rw3-hero" aria-label="Runwae Apparel">
<div class="rw3-hero-ground">${kit.img('bk-concrete', { alt: '', sizes: '50vw' })}<span class="rw-pcap rw3-ground-tag"><span class="rw-ptag">Concept</span></span></div>
${panel(kit, 'drawn-figure-hoodie', { alt: 'A man in the forest Figure Hoodie against a concrete wall in warm light', href: P('drawn-figure-hoodie'), label: 'Figure Hoodie', sizes: '(max-width: 820px) 100vw, 52vw', eager: true, cls: ' rw3-hero-photo' })}
<div class="rw3-hero-side">${words}<p class="rw3-side-note">Clothing for a<br>more curious world</p></div>
<div class="rw3-hero-mark"><h1 class="rw3-wordmark"><span>Runwae</span><span>Apparel</span></h1><span class="rw3-rule" aria-hidden="true"></span><p class="rw3-sub">A continuing journey</p>
<svg class="rw3-globe" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="20" cy="20" r="17"/><ellipse cx="20" cy="20" rx="7.5" ry="17"/><path d="M3 20h34M6 11h28M6 29h28"/></g></svg>
<a class="rw3-scroll" href="#built">Scroll to explore <span aria-hidden="true">↓</span></a></div>
</section>

<section class="rw3-built" id="built" aria-labelledby="built-t">
<div class="rw3-built-left"><p class="rw3-num">01</p><p class="rw3-vert">A brand<br>rooted<br>in curiosity.</p>${kit.img('bk-olive-zip', { alt: '', sizes: '20vw', cls: 'rw3-built-tex' })}</div>
<div class="rw3-built-copy"><p class="rw-kicker">Our story</p><h2 id="built-t" class="rw3-h2">Built on<br>Ideas, People,<br>Places, Progress.</h2><span class="rw3-rule rw3-rule--ink" aria-hidden="true"></span>
<p class="rw3-tracked">Every person influences the world through what they observe, make, question, experience and share. Runwae turns that exchange into clothing.</p>
<a class="rw3-link" href="${kit.href.story()}">Explore our story <span aria-hidden="true">→</span></a></div>
${panel(kit, 'drawn-buttondown', { alt: 'A woman in an ivory button-down with a small plant drawing on the chest, seated against concrete', href: P('drawn-buttondown'), label: 'Botanical Button-Down', sizes: '(max-width: 820px) 100vw, 30vw', cls: ' rw3-built-photo' })}
<div class="rw3-built-rust" aria-hidden="true"><span>Ideas</span><span>People</span><span>Places</span><span>Progress</span></div>
</section>

<section class="rw3-world" aria-labelledby="world-t">
<div class="rw3-world-strip">
${panel(kit, 'bk-man-door', { alt: 'A figure in a hoodie in a concrete doorway at sunset', sizes: '(max-width: 820px) 100vw, 34vw' })}
${panel(kit, 'bk-man-sea', { alt: 'A figure by a concrete wall at the sea at dusk', sizes: '(max-width: 820px) 50vw, 33vw', cls: ' rw3-hide-m' })}
${panel(kit, 'bk-doorway', { alt: 'Sunset through a tall concrete doorway onto the hills', sizes: '(max-width: 820px) 50vw, 33vw', cls: ' rw3-hide-m' })}
</div>
<div class="rw3-world-copy"><p class="rw3-num rw3-num--light">02</p><h2 id="world-t" class="rw3-spaced">A more<br>curious world</h2><span class="rw3-rule" aria-hidden="true"></span><p class="rw3-small-caps">Places shape perspective</p></div>
</section>

<section class="rw3-detail" aria-labelledby="detail-t"><div class="rw-wrap">
<div class="rw3-sec-head"><p class="rw3-num">03</p><h2 id="detail-t" class="rw3-h2">Art in every detail.</h2><p class="rw-note">Concept imagery. Fabric, weight and trims are confirmed with the maker before launch.</p></div>
<div class="rw3-detail-grid">
${panel(kit, 'bk-plaid', { alt: 'Rust and forest plaid, close', label: 'Plaid', sizes: '(max-width: 820px) 50vw, 25vw' })}
${panel(kit, 'cj-rust-button', { alt: 'Metal globe button on rust cloth', label: 'Globe button', sizes: '(max-width: 820px) 50vw, 25vw' })}
${panel(kit, 'bk-knit-macro', { alt: 'Dark rib knit and drawcord, close', label: 'Rib knit', sizes: '(max-width: 820px) 50vw, 25vw' })}
${panel(kit, 'bk-rust-macro', { alt: 'Rust hood and drawcord, close', label: 'Fleece', sizes: '(max-width: 820px) 50vw, 25vw' })}
${panel(kit, 'cj-cream-hood', { alt: 'Ivory hood with a woven neck label', label: 'Woven label', sizes: '(max-width: 820px) 50vw, 25vw' })}
${panel(kit, 'ed-black-hood', { alt: 'Black hood with RUNWAE COMPANY embroidery', label: 'Embroidery', sizes: '(max-width: 820px) 50vw, 25vw' })}
${panel(kit, 'fl-embroidery', { alt: 'RUNWAE APPAREL embroidered on forest fleece', label: 'Embroidery', sizes: '(max-width: 820px) 50vw, 25vw' })}
${panel(kit, 'ed-plant-panel', { alt: 'A plant drawing on ivory cloth', label: 'Art panel', sizes: '(max-width: 820px) 50vw, 25vw' })}
</div>
<p class="rw3-r"><img src="${kit.root}assets/emblem.png" alt="" width="40" height="40" loading="lazy"><span>The dripping R, from Runwae's first label.</span></p>
</div></section>

<section class="rw3-archive" aria-labelledby="arch-t"><div class="rw3-archive-row">
<div class="rw3-archive-copy"><p class="rw3-num">04</p><h2 id="arch-t" class="rw3-h3">The Archive</h2><p class="rw3-tracked rw3-tracked--sm">A collection of ideas, places and people that continue to shape Runwae.</p><a class="rw3-link" href="${kit.href.story()}#archive">Explore the archive <span aria-hidden="true">→</span></a></div>
<div class="rw3-archive-tiles">
${tile('cj-rust-button', 'Globe button on rust cloth', 'Button', `${kit.href.story()}#archive`)}
${tile('cu-embroidery', 'RUNWAE APPAREL embroidered on black', 'Embroidery', `${kit.href.story()}#archive`)}
${tile('ed-black-tee', 'Black tee with three faces and THE RUNWAE COMPANY', 'The Runwae Company', P('company-tee'))}
<a class="rw3-artifact" href="${kit.href.story()}#archive">${kit.img('mark-badge', { alt: 'The circular Runwae Apparel Company badge', sizes: '17vw' })}<span>Badge · archive</span></a>
${archive.slice(0, 2).map((p) => `<a class="rw3-artifact" href="${P(p.id)}">${kit.img(p.images[0], { alt: p.images[0].alt, sizes: '17vw' })}<span>${kit.esc(p.name)} · ${p.archive_year}</span></a>`).join('')}
</div></div></section>

<section class="rw3-collection" id="collection" aria-labelledby="col-t"><div class="rw-wrap">
<div class="rw3-sec-head"><p class="rw3-num">05</p><h2 id="col-t" class="rw3-h2">The collection</h2><a class="rw3-link" href="${kit.href.shop()}">View all <span aria-hidden="true">→</span></a></div>
<div class="rw3-catalog">${[focus, ...rest.slice(0, 4)].map((p, i) => quietCard(kit, p, { big: i === 0 })).join('')}</div>
</div></section>

<section class="rw3-close" aria-labelledby="close-t">
<div class="rw3-close-strip">
${panel(kit, 'bk-fog', { alt: 'Fog over the hills at sunrise', sizes: '(max-width: 820px) 100vw, 25vw' })}
${panel(kit, 'bk-man-peak', { alt: 'A figure on a rocky peak at sunset', sizes: '25vw', cls: ' rw3-hide-m' })}
${panel(kit, 'bk-man-sit', { alt: 'A figure in a hoodie seated on concrete facing the hills at dusk', sizes: '25vw', cls: ' rw3-hide-m' })}
${panel(kit, 'bk-sunset', { alt: 'A concrete terrace facing the sunset over the sea', sizes: '25vw', cls: ' rw3-hide-m' })}
</div>
<div class="rw3-close-copy"><h2 id="close-t" class="rw3-spaced">A continuing<br>journey</h2><span class="rw3-rule" aria-hidden="true"></span><p class="rw3-small-caps">Runwae Apparel</p></div>
</section>`,
    };
  },

  collection({ kit, shown, archive }) {
    const lines = [...new Set(shown.map((p) => p.line))];
    const notes = { 'The Little Things': "In life, it's all about the little things.", Essentials: 'Quiet pieces: a medium chest mark or a word on the hood, and the cloth does the rest.', 'The Drawn Series': "The owner's line drawings on garments. Concepts, not yet available." };
    return {
      title: 'Shop | Runwae Apparel',
      body: `<section class="rw-shop-hero">${panel(kit, 'ed-green-back', { alt: 'The forest figure hoodie against a concrete wall', sizes: '100vw', cls: ' rw-shop-hero-img' })}
<div class="rw-shop-hero-copy"><div class="rw-wrap"><h1 class="rw-h2 rw-h2--light">The collection</h1>
<nav class="rw-jump" aria-label="Lines">${lines.map((l, i) => `<a href="#line-${i}">${kit.esc(l)}</a>`).join('')}${archive.length ? '<a href="#archive">Archive</a>' : ''}</nav></div></div></section>
<div class="rw-wrap rw-shop">
${lines.map((l, i) => `<section class="rw-line" id="line-${i}" aria-labelledby="line-${i}-t"><div class="rw-line-head"><h2 id="line-${i}-t" class="rw-h3">${kit.esc(l)}</h2><p>${kit.esc(notes[l] ?? '')}</p></div>
<div class="rw-grid">${shown.filter((p) => p.line === l).map((p) => quietCard(kit, p)).join('')}</div></section>`).join('')}
${archive.length ? `<section class="rw-line" id="archive" aria-labelledby="archive-t"><div class="rw-line-head"><h2 id="archive-t" class="rw-h3">Archive · Fall '21</h2><p>The original line. Shown for the record.</p></div>
<div class="rw-grid">${archive.map((p) => quietCard(kit, p)).join('')}</div></section>` : ''}
</div>`,
    };
  },

  product({ kit }, p) {
    const media = (imgs, ci) => { const [main, ...more] = imgs; return `<div class="rw-pdp-main${main.concept ? ' is-photo' : ''}">${kit.figure(main, { sizes: '(max-width: 820px) 100vw, 58vw', eager: ci === 0 })}</div>
${more.length ? `<div class="rw-pdp-more">${more.map((im) => `<div class="${im.concept ? 'is-photo' : ''}">${kit.figure(im, { sizes: '(max-width: 820px) 50vw, 29vw' })}</div>`).join('')}</div>` : ''}`; };
    return `<section class="rw-pdp">
<div class="rw-pdp-media">${kit.colorGalleries(p, media)}</div>
<div class="rw-pdp-panel"><div class="rw-sticky">
<p class="rw-crumb"><a href="${kit.href.shop()}">Shop</a> · ${kit.esc(p.line)}</p>
<h1 class="rw-h2">${kit.esc(p.name)}</h1>
<p class="rw-pdp-sum">${kit.esc(p.summary)}</p>
${kit.colorSwitch(p)}${kit.buyBox(p)}
<div class="rw-pdp-details">${kit.details(p, { open: 1 })}</div>
</div></div></section>`;
  },

  story({ kit }) {
    const marks = [['mark-rwa', 'RWA monogram'], ['mark-trc', 'TRC monogram'], ['mark-company', 'The Runwae Company'], ['mark-badge', 'Circular badge']];
    return {
      title: 'Story | Runwae Apparel',
      description: 'Runwae Apparel: everyone influences. The people, the marks and the archive.',
      body: `<section class="rw-feature rw-feature--story">
${panel(kit, 'drawn-illustrated-hoodie', { alt: 'A woman in an ivory hoodie with plant line work on the sleeve', sizes: '(max-width: 820px) 100vw, 50vw', cls: ' rw-feature-img' })}
<div class="rw-feature-copy"><p class="rw-kicker">Story</p><h1 class="rw-h2 rw-h2--light">Everyone influences.</h1>
<p class="rw-lede rw-lede--light">Runwae Apparel makes clothes from original drawings for people who notice things: art, ideas, the places they move through and the people they meet.</p></div></section>
<section class="rw-wrap rw-story-sec"><p class="rw-kicker">From the archive</p><h2 class="rw-h2">Runwae, worn.</h2>
<div class="rw-people">
${kit.figure('people-black-hoodie', { caption: 'Runwae, archive photography', sizes: '(max-width: 820px) 100vw, 34vw', alt: 'A woman in a black Runwae hoodie, studio portrait' })}
${kit.figure('people-tee', { caption: 'Runwae, archive photography', sizes: '(max-width: 820px) 100vw, 30vw', alt: 'A man in a black RUNWAE APPAREL tee, looking down' })}
${kit.figure('people-tlt', { caption: 'The Little Things, archive photography', sizes: '(max-width: 820px) 100vw, 30vw', alt: 'A woman in a green The Little Things hoodie' })}
</div></section>
<section class="rw-wrap rw-story-sec" id="archive"><p class="rw-kicker">Marks</p><h2 class="rw-h2">The marks, so far.</h2>
<p class="rw-lede">Monograms, lettering and the badge from Runwae's first years. Each may return on a single piece or capsule.</p>
<ul class="rw-marks">${marks.map(([f, a]) => `<li>${kit.figure(f, { caption: a, sizes: '(max-width: 820px) 45vw, 20vw', alt: a })}</li>`).join('')}</ul>
<div class="rw-story-pair">
${kit.figure('archive-card', { caption: 'The original Runwae card: Everyone Influences', sizes: '(max-width: 820px) 100vw, 50vw', alt: 'Black card reading EVERYONE INFLUENCES' })}
${kit.figure('making-label', { caption: 'Archive · Runwae care label and hang tag', sizes: '(max-width: 820px) 100vw, 40vw', alt: 'A red Runwae hoodie with its woven label and hang tag' })}
</div></section>
<section class="rw-wrap rw-story-end"><a class="rw-btn" href="${kit.href.shop()}">Discover the collection</a></section>`,
    };
  },
};
