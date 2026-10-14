// Runwae Apparel layout (v4 below; history: v2 (Principal 2026-10-14: "i think the runwae apparel site can be more like its images
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
const WORDS = ['Ideas', 'People', 'Places', 'Progress'];
const DRAWN = 'drawn-series.html';
const globe = (cls = 'rw4-globe') => `<svg class="${cls}" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="20" cy="20" r="17"/><ellipse cx="20" cy="20" rx="7.5" ry="17"/><path d="M3 20h34M6 11h28M6 29h28"/></g></svg>`;

// v4 (Principal GO 2026-10-14): the two added concepts are the primary layout references:
//   added_2026-10-14/cbce9be5 (home) and 38b3982c (The Drawn Series collection page).
// Header and nav never link to another site; the core renders any main-site link in the footer only.
export function header({ kit, page }) {
  const cur = (k) => (page === k ? ' aria-current="page"' : '');
  // v5 (Principal 2026-10-14: "entry way to the store"): a quiet but always-visible Shop link. On a phone the
  // nav folds into Menu, so a Shop link also sits outside it, beside the menu button.
  return `<header class="rw-head${page === 'home' || page === 'drawn-series' ? ' rw-head--over' : ''}"><div class="rw-wrap rw-head-row">
${wordmark(kit)}
<a class="rw-shoplink" href="${kit.href.shop()}"${cur('collection')}>Shop</a>
${kit.menuButton('Menu')}
<nav id="site-nav" class="rw-nav" aria-label="Main"><a href="${kit.href.home()}"${cur('home')}>Home</a><a href="${kit.href.story()}"${cur('story')}>Story</a><a href="${kit.root}${DRAWN}"${cur('drawn-series')}>The Drawn Series</a><a href="${kit.href.shop()}#archive">Archive</a><a class="rw-nav-shop" href="${kit.href.shop()}"${cur('collection')}>Shop</a>${kit.bagLink('Bag')}</nav>
</div></header>`;
}

export function footer({ brand, kit }) {
  return `<footer class="rw-foot rw4-foot"><div class="rw-wrap">
<div class="rw4-foot-row">${wordmark(kit, ' rw-mark--foot')}
<ul class="rw4-foot-words" aria-label="What Runwae is built on"><li>Art</li><li>People</li><li>Places</li><li>Progress</li></ul>
${globe('rw4-globe rw4-globe--foot')}
<form class="seed-notify rw4-join" data-notify data-product="journey" novalidate><label for="notify-journey" class="sr-only">Join the journey: your email</label>
<div class="seed-notify-row"><input id="notify-journey" type="email" name="email" autocomplete="email" placeholder="Join the journey" required><button type="submit" aria-label="Join the journey">→</button></div>
<p class="seed-msg" role="status" aria-live="polite"></p></form></div>
<div class="rw-foot-grid">
<nav aria-label="Footer"><a href="${kit.href.shop()}">Shop</a><a href="${kit.root}${DRAWN}">The Drawn Series</a><a href="${kit.href.story()}">Story</a></nav>
<nav aria-label="Help"><a href="${kit.href.orders()}">Order lookup</a><a href="${kit.href.policies()}">Shipping and exchanges</a></nav>
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

/** The Drawn Series capsule in its numbered order (catalog `capsule` 1..7). */
const capsuleOf = (shown) => shown.filter((p) => Number.isInteger(p.capsule)).sort((a, b) => a.capsule - b.capsule);
const dots = (kit, p) => ((p.colors ?? []).length ? `<span class="rw4-dots" aria-label="Colours: ${kit.esc(p.colors.map((c) => c.name).join(', '))}">${p.colors.map((c) => `<span class="rw4-dot sw-${kit.esc(c.id)}"></span>`).join('')}</span>` : '');
function capsuleCard(kit, p, { big = false } = {}) {
  const v = kit.view(p);
  const im = p.images[0];
  return `<a class="rw4-card${big ? ' rw4-card--big' : ''}" href="${kit.href.product(p)}"><span class="rw4-card-media">${kit.img(im, { sizes: big ? '(max-width: 820px) 50vw, 22vw' : '(max-width: 820px) 50vw, 13vw', alt: im.alt })}${im.concept ? '<span class="rw-tag">Concept</span>' : ''}</span>
<span class="rw4-card-name">${kit.esc(p.name)}</span><span class="rw4-card-meta"><span class="rw4-price">${kit.esc(priceOf(v))}</span><span class="rw4-status">${kit.esc(v.label)}</span></span>${dots(kit, p)}</a>`;
}
/** The price line on the home capsule row: the real price, or "Price TBA" while none is set. */
const priceOf = (v) => v.priceText || (v.price_cents == null ? 'Price TBA' : `$${(v.price_cents / 100).toFixed(2)}`);

/** Ideas · People · Places · Progress, one calm line each (the brand beliefs; beliefs, not slogans). */
const BELIEFS = [
  ['Ideas', 'Every piece starts as a drawing.'],
  ['People', 'Everyone you meet leaves a mark.'],
  ['Places', 'Where you go shapes what you see.'],
  ['Progress', 'Keep noticing. Keep going.'],
];
/** The bridge at the end of a story section: the piece that section is worn as. */
const wornAs = (kit, id, name, light = false) => `<a class="rw5-worn${light ? ' rw5-worn--light' : ''}" href="${kit.href.product(id)}"><span>Worn as:</span> ${kit.esc(name)} <span aria-hidden="true">→</span></a>`;

export const pages = {
  home({ brand, kit, shown }) {
    // v5 home (Principal 2026-10-14: "the home page of runwae apparel needs to be a bit more suitable for an apparl
    // shoopo page. entry way to the store" + "i like how its more identity and sotry based right now. we'll just have
    // to improve what that is"). Still story-led, v4 layout language, one idea per section, each ending on the piece
    // it is worn as: hero -> 01 who Runwae is -> 02 the belief -> 03 the art behind the clothes -> 04 the pieces ->
    // enter the shop.
    const capsule = capsuleOf(shown);
    const focus = shown.find((p) => ['preorder', 'available'].includes(kit.view(p).status));
    const tile = (file, alt, label) => panel(kit, file, { alt, label, sizes: '(max-width: 820px) 50vw, 20vw' });
    const drawn = `${kit.root}${DRAWN}`;
    return {
      title: 'Runwae Apparel · A continuing journey',
      description: brand.description,
      image: kit.imgData('v4-hero').src,
      body: `
<section class="rw4-hero rw5-hero" aria-labelledby="hero-t">
${panel(kit, 'v4-hero', { alt: 'A man in the forest Foundation Hoodie on concrete steps above the city, line drawings on the wall behind him', sizes: '100vw', eager: true, cls: ' rw4-hero-photo' })}
<div class="rw-wrap rw4-hero-copy">
<p class="rw4-kicker">A continuing journey.</p>
<h1 id="hero-t" class="rw4-title"><span>Runwae</span><span>Apparel</span></h1>
<ul class="rw4-words" aria-label="Brand beliefs">${WORDS.map((w) => `<li>${w}</li>`).join('')}</ul>
<p class="rw4-sub">Clothing for a more curious world.</p>
<div class="rw5-ctas"><a class="rw4-cta" href="#story">Explore the story <span aria-hidden="true">→</span></a><a class="rw5-cta-ghost" href="${drawn}">Shop the Drawn Series <span aria-hidden="true">→</span></a></div>
</div></section>

<section class="rw4-built rw5-who" id="story" aria-labelledby="built-t">
<div class="rw4-built-copy"><p class="rw4-num"><span>01</span> Who we are</p>
<h2 id="built-t" class="rw4-h2">Clothes that start as drawings.</h2><span class="rw4-rule" aria-hidden="true"></span>
<p class="rw5-body">Runwae Apparel’s first pieces came out in 2021, with one belief printed on the card: <em>Everyone Influences</em>. The work still starts the same way: an original drawing first, then something to wear.</p>
${wornAs(kit, 'atelier-shirt', 'Atelier Shirt')}</div>
${panel(kit, 'v4-portrait', { alt: 'A woman in the ivory Atelier Shirt, its tree drawings on the chest and sleeve, seated against concrete', href: kit.href.product('atelier-shirt'), label: 'Atelier Shirt', sizes: '(max-width: 820px) 60vw, 30vw', cls: ' rw4-built-photo' })}
<figure class="rw-panel rw4-built-art">${kit.img('v4-botanical', { alt: 'A botanical drawing embroidered in cream on forest cloth', sizes: '(max-width: 820px) 40vw, 16vw' })}<figcaption class="rw4-hand">Same places,<br>new ideas</figcaption><span class="rw-pcap"><span class="rw-ptag">Concept</span></span></figure>
</section>

<section class="rw4-band rw5-belief" aria-labelledby="band-t">
${panel(kit, 'v4-band', { alt: 'Dusk over the city from a concrete terrace, a line drawing of a seated figure over the trees', sizes: '100vw', cls: ' rw4-band-photo' })}
<div class="rw-wrap rw4-band-copy">
<div><p class="rw4-num rw4-num--light"><span>02</span> What we believe</p><h2 id="band-t" class="rw4-h2">Everyone influences.</h2><span class="rw4-rule rw4-rule--light" aria-hidden="true"></span>
<p class="rw4-tracked rw4-tracked--light">Built on Ideas, People, Places, Progress.</p>
${wornAs(kit, 'globe-hoodie', 'Globe Hoodie', true)}</div>
<dl class="rw5-beliefs">${BELIEFS.map(([w, l]) => `<div><dt>${w}</dt><dd>${l}</dd></div>`).join('')}</dl>
</div></section>

<section class="rw5-art" aria-labelledby="art-t"><div class="rw-wrap rw5-art-grid">
${panel(kit, 'drawn-overshirt', { alt: 'A man in the olive Figure Overshirt seen from behind, the paired figures and plant drawn in cream line across the back', href: kit.href.product('drawn-overshirt'), label: 'Figure Overshirt', sizes: '(max-width: 820px) 100vw, 40vw', cls: ' rw5-art-photo' })}
<div class="rw5-art-copy"><p class="rw4-num"><span>03</span> The art behind the clothes</p>
<h2 id="art-t" class="rw4-h2">Drawn first. Then made.</h2><span class="rw4-rule" aria-hidden="true"></span>
<p class="rw5-body">Figures, faces, plants and the places in between, drawn by hand and kept as they were drawn. Then the quiet parts: a woven label, a drawn button, a line of embroidery.</p>
<p class="rw-note">Concept renders. Fabric and print method are confirmed with the maker before anything opens.</p>
${wornAs(kit, 'drawn-overshirt', 'Figure Overshirt')}
<a class="rw4-link rw5-more" href="${drawn}">See the artwork <span aria-hidden="true">→</span></a></div>
</div></section>

<section class="rw4-details" aria-label="Details">
${tile('v4-label', 'A woven RUNWAE APPAREL label on natural cloth', 'Woven label')}
${tile('v4-button', 'A metal shank button with a drawn figure on forest cloth', 'Button')}
${tile('v4-embroidery', 'A plant drawing embroidered in cream on forest cloth', 'Embroidery')}
${tile('v4-globe-patch', 'The globe patch: RUNWAE APPAREL COMPANY around a line globe, on rust', 'Globe patch')}
<blockquote class="rw4-quote rw4-quote--ink"><p>“Clothes for a more thoughtful tomorrow.”</p><span class="rw4-rule" aria-hidden="true"></span></blockquote>
</section>

<section class="rw4-collection rw5-pieces" id="collection" aria-labelledby="col-t"><div class="rw-wrap rw4-col-grid">
<div class="rw4-col-copy"><p class="rw4-num"><span>04</span> The pieces</p><h2 id="col-t" class="rw4-h2">Wear a brighter tomorrow.</h2>
<p class="rw4-tracked">The Drawn Series. Seven pieces, each carrying an original drawing.</p>
<p class="rw-note">Prices are set when each drop opens. Join the list on any piece for one email when it does.</p>
<a class="rw4-link" href="${drawn}">Shop the Drawn Series <span aria-hidden="true">→</span></a></div>
<div class="rw4-row">${capsule.map((p) => capsuleCard(kit, p)).join('')}</div>
</div></section>
${focus ? `<section class="rw4-focus" aria-labelledby="focus-t"><div class="rw-wrap rw4-focus-row">
<a class="rw4-focus-img" href="${kit.href.product(focus)}">${kit.img(focus.images[0], { alt: focus.images[0].alt, sizes: '(max-width: 820px) 40vw, 180px' })}</a>
<div><p class="rw4-num"><span>Now</span> ${kit.esc(kit.view(focus).label)}</p><h2 id="focus-t" class="rw4-h3">${kit.esc(focus.name)}</h2><p class="rw4-tracked">${kit.esc(focus.line)} · ${kit.esc(priceOf(kit.view(focus)))}</p>
<a class="rw4-link" href="${kit.href.product(focus)}">See the piece <span aria-hidden="true">→</span></a></div></div></section>` : ''}

<section class="rw5-enter" aria-labelledby="enter-t">
<div class="rw5-enter-strip">
${panel(kit, 'bk-man-door', { alt: 'A man in a dark hoodie in a concrete doorway at sunset', sizes: '(max-width: 820px) 50vw, 25vw' })}
${panel(kit, 'bk-cream-concrete', { alt: 'An ivory hoodie folded on concrete', sizes: '(max-width: 820px) 50vw, 25vw', cls: ' rw5-hide-m' })}
${panel(kit, 'bk-terrace-tree', { alt: 'A concrete terrace and a single tree above the sea at dusk', sizes: '(max-width: 820px) 50vw, 25vw' })}
${panel(kit, 'bk-rust-macro', { alt: 'Rust cloth, close', sizes: '(max-width: 820px) 50vw, 25vw', cls: ' rw5-hide-m' })}
</div>
<div class="rw5-enter-copy"><p class="rw4-num rw4-num--light"><span>Shop</span> Runwae Apparel</p><h2 id="enter-t" class="rw4-h2">Enter the shop.</h2>
<p class="rw4-tracked rw4-tracked--light">The Drawn Series · Next drop · Essentials · Archive</p>
<a class="rw4-cta" href="${kit.href.shop()}">Enter the shop <span aria-hidden="true">→</span></a></div>
</section>`,
    };
  },

  collection({ kit, shown, archive }) {
    // The shop leads with the capsule; everything else sits behind it.
    const ORDER = ['The Drawn Series', 'Next drop', 'Essentials', 'The Little Things'];
    const lines = [...new Set(shown.map((p) => p.line))].sort((x, y) => (ORDER.indexOf(x) + 99) % 99 - (ORDER.indexOf(y) + 99) % 99);
    const notes = { 'The Drawn Series': 'Seven pieces. The owner’s drawings, worn. Concept renders; fabric and print are confirmed with the maker.', 'Next drop': 'Pieces in line for a later release.', Essentials: 'Quiet pieces: a medium chest mark or a word on the hood, and the cloth does the rest.', 'The Little Things': "In life, it's all about the little things." };
    const ordered = (l) => (l === 'The Drawn Series' ? capsuleOf(shown) : shown.filter((p) => p.line === l));
    return {
      title: 'Shop | Runwae Apparel',
      body: `<section class="rw-shop-hero">${panel(kit, 'v4-coll-hero', { alt: 'The ivory Globe Hoodie worn on concrete steps, seen from behind', sizes: '100vw', cls: ' rw-shop-hero-img' })}
<div class="rw-shop-hero-copy"><div class="rw-wrap"><h1 class="rw-h2 rw-h2--light">The collection</h1>
<nav class="rw-jump" aria-label="Lines">${lines.map((l, i) => `<a href="#line-${i}">${kit.esc(l)}</a>`).join('')}${archive.length ? '<a href="#archive">Archive</a>' : ''}</nav></div></div></section>
<div class="rw-wrap rw-shop">
${lines.map((l, i) => `<section class="rw-line" id="line-${i}" aria-labelledby="line-${i}-t"><div class="rw-line-head"><h2 id="line-${i}-t" class="rw-h3">${kit.esc(l)}${l === 'The Drawn Series' ? ' <span class="rw4-count">· Seven pieces</span>' : ''}</h2><p>${kit.esc(notes[l] ?? '')}${l === 'The Drawn Series' ? ` <a href="${kit.root}${DRAWN}">The Drawn Series page</a>` : ''}</p></div>
<div class="rw-grid">${ordered(l).map((p) => quietCard(kit, p)).join('')}</div></section>`).join('')}
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
    // v5 (Principal 2026-10-14: "the story page has colors that are off style, we should stayon style"). Every UI
    // colour is the Runwae palette (forest, ivory/paper, washed black, rust). The 2021 originals stay as photos in
    // ivory mats, toned slightly warmer and softer by CSS (.rw5-orig), captioned "Original 2021". Real people:
    // preview only until model releases are in (handoff 03/08).
    const marks = [['mark-rwa', 'RWA monogram'], ['mark-trc', 'TRC monogram'], ['mark-company', 'The Runwae Company'], ['mark-badge', 'Circular badge']];
    const orig = (file, alt, caption, sizes) => kit.figure(file, { cls: 'rw5-orig', caption: `Original 2021 · ${caption}`, sizes, alt });
    return {
      title: 'Story | Runwae Apparel',
      description: 'Runwae Apparel: everyone influences. The belief, the first pieces from 2021, the marks, and what is next.',
      body: `<section class="rw-feature rw-feature--story">
${panel(kit, 'drawn-illustrated-hoodie', { alt: 'A woman in the ivory Figure Hoodie, plant line work on the sleeve', href: kit.href.product('drawn-figure-hoodie'), label: 'Figure Hoodie', sizes: '(max-width: 820px) 100vw, 50vw', cls: ' rw-feature-img' })}
<div class="rw-feature-copy"><p class="rw4-num rw4-num--light"><span>Story</span> Runwae Apparel</p><h1 class="rw4-h2 rw5-story-h1">Everyone influences.</h1><span class="rw4-rule rw4-rule--light" aria-hidden="true"></span>
<p class="rw5-body rw5-body--light">Runwae Apparel makes clothes from original drawings, for people who notice things: art, ideas, the places they move through and the people they meet.</p>
<div class="rw5-ctas"><a class="rw4-cta" href="${kit.root}${DRAWN}">Shop the Drawn Series <span aria-hidden="true">→</span></a></div></div></section>

<section class="rw5-sbelief" aria-labelledby="sb-t"><div class="rw-wrap rw5-sbelief-grid">
<div><p class="rw4-num"><span>01</span> The belief</p><h2 id="sb-t" class="rw4-h2">Ideas. People. Places. Progress.</h2></div>
<dl class="rw5-beliefs rw5-beliefs--ink">${BELIEFS.map(([w, l]) => `<div><dt>${w}</dt><dd>${l}</dd></div>`).join('')}</dl>
</div></section>

<section class="rw5-sorig" aria-labelledby="so-t"><div class="rw-wrap">
<div class="rw5-shead"><div><p class="rw4-num rw4-num--light"><span>02</span> Original 2021</p><h2 id="so-t" class="rw4-h2">Runwae, worn.</h2></div>
<p class="rw5-body rw5-body--light">The first pieces, photographed in 2021. These are originals: the garments are shown in their real colours, with the photos toned slightly warmer to sit on this page.</p></div>
<div class="rw-people">
${orig('people-black-hoodie', 'A woman in a black Runwae hoodie, studio portrait', 'Runwae hoodie, black', '(max-width: 820px) 100vw, 34vw')}
${orig('people-tee', 'A man in a black RUNWAE APPAREL tee, looking down', 'Runwae Apparel tee, black', '(max-width: 820px) 50vw, 30vw')}
${orig('people-tlt', 'A woman in a green The Little Things hoodie', 'The Little Things hoodie, green', '(max-width: 820px) 50vw, 30vw')}
</div></div></section>

<section class="rw5-smarks" id="archive" aria-labelledby="sm-t"><div class="rw-wrap">
<div class="rw5-shead"><div><p class="rw4-num"><span>03</span> The marks</p><h2 id="sm-t" class="rw4-h2">The marks, so far.</h2></div>
<p class="rw5-body">Monograms, lettering and the badge from Runwae's first years. Each may return on a single piece or capsule.</p></div>
<ul class="rw-marks">${marks.map(([f, a]) => `<li>${kit.figure(f, { caption: a, sizes: '(max-width: 820px) 45vw, 20vw', alt: a })}</li>`).join('')}</ul>
<div class="rw-story-pair">
${orig('archive-card', 'Black card reading EVERYONE INFLUENCES', 'the first Runwae card: Everyone Influences', '(max-width: 820px) 100vw, 50vw')}
${orig('making-label', 'A red Runwae hoodie with its woven label and hang tag', 'woven label and hang tag', '(max-width: 820px) 100vw, 40vw')}
</div></div></section>

<section class="rw5-snext" aria-labelledby="sn-t"><div class="rw-wrap rw5-snext-row">
<div><p class="rw4-num rw4-num--light"><span>04</span> Today</p><h2 id="sn-t" class="rw4-h2">The Drawn Series.</h2>
<p class="rw4-tracked rw4-tracked--light">Seven pieces, each carrying an original drawing.</p></div>
<div class="rw5-ctas"><a class="rw4-cta" href="${kit.root}${DRAWN}">Shop the Drawn Series <span aria-hidden="true">→</span></a><a class="rw5-cta-ghost" href="${kit.href.shop()}">Enter the shop <span aria-hidden="true">→</span></a></div>
</div></section>`,
    };
  },

  extra: {
    // The Drawn Series collection page, from 38b3982c: hero, 01 seven pieces, 02 Artwork in every thread,
    // 03 The artwork (the owner's drawings as art panels: this page only).
    'drawn-series'({ kit, shown }) {
      const capsule = capsuleOf(shown);
      const d = (file, alt) => `<figure class="rw-panel">${kit.img(file, { alt, sizes: '(max-width: 820px) 50vw, 16vw' })}<span class="rw-pcap"><span class="rw-ptag">Concept</span></span></figure>`;
      // v5 (Principal 2026-10-14: "I dont know why the last picture is different in this row"): every tile in this row
      // gets ONE treatment, cream ground + dark line, square crop (art-pair re-toned from cream-on-forest to match).
      const art = [['art-head', 'The owner’s drawing: a figure under a woven hat, seen from behind'], ['art-portrait', 'The owner’s drawing: a crowded portrait with RUNWAE APPAREL written beside it'], ['art-figure', 'The owner’s drawing: a standing figure in a hoodie'], ['art-pair', 'The owner’s drawing: two figures and a plant']];
      return {
        title: 'The Drawn Series | Runwae Apparel',
        description: 'The Drawn Series: seven pieces carrying the owner’s original drawings. Concept renders; not yet available.',
        image: kit.imgData('v4-coll-hero').src,
        body: `
<section class="rw4-hero rw4-hero--coll" aria-labelledby="ds-t">
${panel(kit, 'v4-coll-hero', { alt: 'A man in the ivory Globe Hoodie on concrete steps, the globe emblem large on the back, a line drawing on the wall beside him', href: kit.href.product('globe-hoodie'), label: 'Globe Hoodie', sizes: '100vw', eager: true, cls: ' rw4-hero-photo' })}
<div class="rw-wrap rw4-hero-copy">
<p class="rw4-kicker">The collection</p>
<h1 id="ds-t" class="rw4-title rw4-title--stack"><span>The</span><span>Drawn</span><span>Series</span></h1>
<ul class="rw4-words" aria-label="Brand beliefs">${WORDS.map((w) => `<li>${w}</li>`).join('')}</ul>
<p class="rw4-sub">Original artwork.<br>Timeless pieces.<br>A more curious tomorrow.</p>
<a class="rw4-cta" href="#pieces">Explore the collection <span aria-hidden="true">→</span></a>
</div></section>

<section class="rw4-seven" id="pieces" aria-labelledby="seven-t"><div class="rw-wrap rw4-seven-grid">
<div class="rw4-col-copy"><p class="rw4-num"><span>01</span> Collection</p><h2 id="seven-t" class="rw4-h2">Seven pieces. A brighter tomorrow.</h2>
<p class="rw4-tracked">The Drawn Series brings original artwork to life through thoughtful clothes. Ideas, people, places and a more curious tomorrow.</p>
<p class="rw-note">Concept renders. Fabric, print method and fit are confirmed with the maker before anything opens.</p>
<a class="rw4-link" href="${kit.href.shop()}#line-0">Shop the collection <span aria-hidden="true">→</span></a></div>
${capsule.map((p, i) => capsuleCard(kit, p, { big: i < 4 })).join('')}
<figure class="rw-panel rw4-seven-tex">${kit.img('v4-fabric', { alt: 'Leaf drawings printed in black on natural cloth', sizes: '(max-width: 820px) 50vw, 18vw' })}<span class="rw-pcap"><span class="rw-ptag">Concept</span></span></figure>
<div class="rw4-seven-note"><p class="rw4-h2 rw4-h2--caps rw4-h2--sm">Clothes for a more thoughtful tomorrow.</p><span class="rw4-rule" aria-hidden="true"></span><p class="rw4-tracked">Original artwork<br>Considered fabrics<br>Timeless pieces</p></div>
</div></section>

<section class="rw4-thread" aria-labelledby="thread-t">
${panel(kit, 'v4-d-portrait', { alt: 'A woman in the ivory Atelier Shirt, seated against concrete', href: kit.href.product('atelier-shirt'), label: 'Atelier Shirt', sizes: '(max-width: 820px) 100vw, 28vw', cls: ' rw4-thread-photo' })}
<div class="rw4-thread-copy"><p class="rw4-num rw4-num--light"><span>02</span> Details</p><h2 id="thread-t" class="rw4-h2">Artwork in every thread.</h2>
<p class="rw4-tracked rw4-tracked--light">From original sketches to every stitch, the Drawn Series celebrates ideas, people, places and progress.</p></div>
<div class="rw4-thread-grid">
${d('v4-d-label', 'A woven RUNWAE APPAREL label')}${d('v4-d-button', 'A metal globe button on forest cloth')}${d('v4-d-globe', 'The globe patch on rust')}
${d('v4-d-embroidery', 'Plant drawing embroidery on forest cloth')}${d('v4-d-cords', 'Forest drawcords through metal eyelets')}${d('v4-d-fabric', 'Natural cloth, close')}
</div></section>

<section class="rw4-art" aria-labelledby="art-t">
<div class="rw4-art-copy"><p class="rw4-num"><span>03</span> The artwork</p><h2 id="art-t" class="rw4-h2">Ideas. People. Places. Progress.</h2>
<p class="rw4-tracked">A continuing journey through original artwork: the owner’s drawings, as they were drawn.</p>
<a class="rw4-link" href="${kit.href.shop()}#archive">View the archive <span aria-hidden="true">→</span></a></div>
${art.map(([f, alt]) => `<figure class="rw4-art-panel">${kit.img(f, { alt, sizes: '(max-width: 820px) 50vw, 18vw' })}</figure>`).join('')}
</section>`,
      };
    },
  },
};
