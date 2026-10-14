// Runwae Apparel layout, v2 (Principal 2026-10-14: "i think the runwae apparel site can be more like its images
// that were shared and i dont like the picture of the drawing there on the site").
// Direction: the shared editorial concepts (handoff assets/05_generated_explorations + RUNWAE_Ad_Concept_Crops):
// full-bleed photography of people wearing the drawn pieces, warm natural light, forest / ivory / black / rust,
// large immersive panels, product shown through the photos. The bare sketches are NOT featured as pictures
// (this overrides the handoff's "drawings prominent" guidance); the drawings appear on the garments.
// Still: story before the collection, no museum styling, no third-party reference images, no Poison or Pave.
// All concept photography is captioned "Concept". LOGO: provisional type-only RUNWAE / APPAREL wordmark.
// Owner archive photography (assets/03_*) appears on the Story page only: rights/releases to confirm.

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
  home({ brand, kit, shown }) {
    const focus = shown.find((p) => ['preorder', 'available'].includes(kit.view(p).status)) ?? shown[0];
    const rest = shown.filter((p) => p !== focus);
    const P = (id) => kit.href.product(id);
    return {
      title: 'Runwae Apparel · Ideas. People. Places. Progress.',
      description: brand.description,
      image: kit.imgData('drawn-figure-hoodie').src,
      body: `
<section class="rw-hero" aria-label="Runwae Apparel">
<div class="rw-hero-strip">
${panel(kit, 'drawn-figure-hoodie', { alt: 'A man in a forest hoodie with a figure drawn across the back', href: P('drawn-figure-hoodie'), label: 'Figure Hoodie', sizes: '(max-width: 820px) 100vw, 40vw', eager: true, cls: ' rw-hero-a' })}
${panel(kit, 'drawn-sketch-hoodie', { alt: 'A man seen from behind in a black hoodie with a portrait drawn in cream line', href: P('drawn-portrait-hoodie'), label: 'Portrait Hoodie', sizes: '(max-width: 820px) 50vw, 30vw', cls: ' rw-hero-b' })}
${panel(kit, 'drawn-cream-hoodie', { alt: 'An ivory hoodie worn, the drawing across the back', href: P('drawn-head-hoodie'), label: 'Head Study Hoodie', sizes: '(max-width: 820px) 50vw, 30vw', cls: ' rw-hero-c' })}
</div>
<div class="rw-hero-copy"><div class="rw-wrap"><h1 class="rw-h1"><span class="rw-h1-small">Runwae Apparel</span>Ideas. People.<br>Places. Progress.</h1>
<a class="rw-explore" href="#everyone">Explore the story <span aria-hidden="true">↓</span></a></div></div>
</section>

<section class="rw-statement" id="everyone" aria-labelledby="st-t"><div class="rw-wrap rw-statement-grid">
<h2 id="st-t" class="rw-h2">Everyone influences.</h2>
<p class="rw-lede">What we see changes what we create. What we create changes what others see.</p>
</div></section>

<section class="rw-mosaic" aria-label="The Drawn Series"><div class="rw-mosaic-grid">
${panel(kit, 'ed-green-back', { alt: 'The forest figure hoodie against a concrete wall', href: P('drawn-figure-hoodie'), label: 'Figure Hoodie, forest', sizes: '(max-width: 820px) 100vw, 40vw', cls: ' rw-m-a' })}
${panel(kit, 'ed-cream-detail', { alt: 'Ivory hoodie with a small figure drawing on the chest', href: P('drawn-figure-hoodie'), label: 'Chest drawing, ivory', sizes: '(max-width: 820px) 50vw, 27vw', cls: ' rw-m-b' })}
${panel(kit, 'ed-rust-shirt', { alt: 'Rust shirt with a woven label at the collar and a drawing at the hem', label: 'Rust shirt', sizes: '(max-width: 820px) 50vw, 23vw', cls: ' rw-m-c' })}
${panel(kit, 'ed-black-tee', { alt: 'Black tee with three line-drawn faces', href: P('tlt-neighbor-hoodie'), label: 'Three faces', sizes: '(max-width: 820px) 50vw, 27vw', cls: ' rw-m-d' })}
${panel(kit, 'ed-green-shirt', { alt: 'Green overshirt with plant line work', href: P('drawn-overshirt'), label: 'Figure Overshirt', sizes: '(max-width: 820px) 50vw, 23vw', cls: ' rw-m-e' })}
</div>
<div class="rw-wrap rw-mosaic-note"><p class="rw-kicker">The Drawn Series</p><p class="rw-lede rw-lede--sm">The owner's own line drawings, worn large on the back or kept small at the chest.</p></div>
</section>

<section class="rw-feature" aria-labelledby="pp-t">
${panel(kit, 'drawn-buttondown', { alt: 'A woman in an ivory button-down with a small plant drawing on the chest', href: P('drawn-buttondown'), label: 'Botanical Button-Down', sizes: '(max-width: 820px) 100vw, 50vw', cls: ' rw-feature-img' })}
<div class="rw-feature-copy"><p class="rw-kicker">People · places · perspective</p><h2 id="pp-t" class="rw-h2 rw-h2--light">Perspective is never singular.</h2>
<p class="rw-lede rw-lede--light">There is more than one way to move through the world.</p>
<a class="rw-link-light" href="${P('drawn-buttondown')}">The Botanical Button-Down <span aria-hidden="true">→</span></a></div>
</section>

<section class="rw-making" aria-labelledby="mk-t"><div class="rw-wrap">
<div class="rw-making-head"><p class="rw-kicker">The making</p><h2 id="mk-t" class="rw-h2">An idea deserves the material to match.</h2>
<p class="rw-note">Fabric, weight and trims are published here once confirmed with the maker.</p></div>
<div class="rw-making-grid">
${panel(kit, 'cj-cream-hood', { alt: 'Ivory hoodie hood, drawcords and a woven neck label', label: 'Labels and cords', sizes: '(max-width: 820px) 50vw, 25vw' })}
${panel(kit, 'cj-rust-button', { alt: 'A metal button with a globe mark on rust cloth', label: 'Hardware', sizes: '(max-width: 820px) 50vw, 25vw' })}
${panel(kit, 'ed-black-hood', { alt: 'Black hoodie with RUNWAE COMPANY embroidered on the hood', label: 'Embroidery', sizes: '(max-width: 820px) 50vw, 25vw' })}
${panel(kit, 'drawn-illustrated-hoodie', { alt: 'A woman in an ivory hoodie with plant line work on the sleeve', href: P('drawn-head-hoodie'), label: 'Sleeve drawing', sizes: '(max-width: 820px) 50vw, 25vw' })}
</div></div></section>

<section class="rw-reveal-sec" id="collection" aria-labelledby="col-t"><div class="rw-wrap">
<p class="rw-kicker">The collection</p><h2 id="col-t" class="rw-h2">The artwork, made wearable.</h2>
<div class="rw-reveal">${quietCard(kit, focus, { big: true })}<div class="rw-reveal-rest">${rest.slice(0, 4).map((p) => quietCard(kit, p)).join('')}</div></div>
<p class="rw-reveal-more"><a class="rw-btn" href="${kit.href.shop()}">Discover the collection</a></p>
</div></section>

<section class="rw-closing" aria-labelledby="cl-t">
${panel(kit, 'drawn-overshirt', { alt: 'A man in an olive overshirt with figure and plant line work across the back', href: P('drawn-overshirt'), label: 'Figure Overshirt', sizes: '100vw', cls: ' rw-closing-img' })}
<div class="rw-closing-copy"><div class="rw-wrap"><h2 id="cl-t" class="rw-h2 rw-h2--light">A continuing journey.</h2><p class="rw-lede rw-lede--light">Ideas. People. Places. Progress.</p></div></div>
</section>`,
    };
  },

  collection({ kit, shown, archive }) {
    const lines = [...new Set(shown.map((p) => p.line))];
    const notes = { 'The Little Things': "In life, it's all about the little things.", 'The Drawn Series': "The owner's line drawings on garments. Concepts, not yet available." };
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
    const [main, ...more] = p.images;
    return `<section class="rw-pdp">
<div class="rw-pdp-media">
<div class="rw-pdp-main${main.concept ? ' is-photo' : ''}">${kit.figure(main, { sizes: '(max-width: 820px) 100vw, 58vw', eager: true })}</div>
${more.length ? `<div class="rw-pdp-more">${more.map((im) => `<div class="${im.concept ? 'is-photo' : ''}">${kit.figure(im, { sizes: '(max-width: 820px) 50vw, 29vw' })}</div>`).join('')}</div>` : ''}
</div>
<div class="rw-pdp-panel"><div class="rw-sticky">
<p class="rw-crumb"><a href="${kit.href.shop()}">Shop</a> · ${kit.esc(p.line)}</p>
<h1 class="rw-h2">${kit.esc(p.name)}</h1>
<p class="rw-pdp-sum">${kit.esc(p.summary)}</p>
${kit.buyBox(p)}
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
<section class="rw-wrap rw-story-sec"><p class="rw-kicker">Marks</p><h2 class="rw-h2">The marks, so far.</h2>
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
