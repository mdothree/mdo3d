// Runwae Apparel layout. Developer handoff 2026-10-14 (RUNWAE_Developer_Handoff, docs 02/03/05/06):
// "a point of view you move through, not a product grid you land on". The home page is one chaptered scroll
// (00 opening → 07 closing) with the collection revealed only at chapter 06. Owner drawings lead every chapter.
// Never: literal museum/gallery styling, product tiles above the fold, outdoor-brand cues, third-party
// reference images (assets/04_*), Poison or Pave. Copy is the handoff's draft starter copy (doc 06).
// LOGO: provisional. The owner has not chosen a master mark; this uses the clean, non-handwritten
// equal-weight RUNWAE / APPAREL wordmark set in type (handoff variants A + B).
// Owner photography (assets/03_*) is used in chapter 03: commercial rights/releases to confirm before publishing.

const wordmark = (kit, cls = '') => `<a class="rw-mark${cls}" href="${kit.href.home()}" aria-label="Runwae Apparel, home"><span>Runwae</span><span>Apparel</span></a>`;

export function header({ kit, page }) {
  const cur = (k) => (page === k ? ' aria-current="page"' : '');
  return `<header class="rw-head${page === 'home' ? ' rw-head--over' : ''}"><div class="rw-wrap rw-head-row">
${wordmark(kit)}
${kit.menuButton('Menu')}
<nav id="site-nav" class="rw-nav" aria-label="Main"><a href="${kit.href.home()}#ch-1"${cur('home')}>Story</a><a href="${kit.href.story()}"${cur('story')}>Archive</a><a href="${kit.href.shop()}"${cur('collection')}>Shop</a>${kit.bagLink('Bag')}</nav>
</div></header>`;
}

export function footer({ brand, kit }) {
  return `<footer class="rw-foot"><div class="rw-wrap">
<p class="rw-foot-line">Ideas. People. Places. Progress.</p>
<div class="rw-foot-grid">${wordmark(kit, ' rw-mark--foot')}
<nav aria-label="Footer"><a href="${kit.href.shop()}">Shop</a><a href="${kit.href.story()}">Archive</a><a href="${kit.href.orders()}">Order lookup</a><a href="${kit.href.policies()}">Shipping and exchanges</a></nav>
<p class="rw-fine">${kit.esc(brand.endorsement)}<br>${kit.esc(brand.policies.contact)}</p></div>
<p class="rw-fine">© ${new Date().getUTCFullYear()} Runwae Apparel. Drawings are the owner's originals; images marked Concept render are design concepts. Logo provisional.</p>
</div></footer>`;
}

const chap = (n, name) => `<p class="rw-chap"><span>${n}</span>${name}</p>`;

function quietCard(kit, p, { big = false } = {}) {
  const v = kit.view(p);
  const im = p.images[0];
  return `<a class="rw-card${big ? ' rw-card--big' : ''}" href="${kit.href.product(p)}">
<span class="rw-card-media">${kit.img(im, { sizes: big ? '(max-width: 820px) 100vw, 50vw' : '(max-width: 820px) 50vw, 25vw', alt: im.alt })}${im.concept ? '<span class="rw-tag">Concept</span>' : ''}</span>
<span class="rw-card-line">${kit.esc(p.line)}</span><span class="rw-card-name">${kit.esc(p.name)}</span>
<span class="rw-card-meta">${v.priceText ? `<span>${kit.esc(v.priceText)}</span>` : ''}<span class="seed-status seed-status--${v.status}">${kit.esc(v.label)}</span></span></a>`;
}

export const pages = {
  home({ brand, kit, shown, archive }) {
    const focus = shown.find((p) => ['preorder', 'available'].includes(kit.view(p).status)) ?? shown[0];
    const rest = shown.filter((p) => p !== focus);
    return {
      title: 'Runwae Apparel · Ideas. People. Places. Progress.',
      description: brand.description,
      image: kit.imgData('drawn-figure-hoodie').src,
      body: `
<section class="rw-ch rw-ch0" aria-label="Opening"><div class="rw-wrap rw-ch0-grid">
<div class="rw-ch0-copy">${chap('00', 'Opening')}
<h1 class="rw-h1"><span class="rw-h1-small">Runwae Apparel</span>Ideas. People. Places. Progress.</h1>
<a class="rw-explore" href="#ch-1">Explore the story <span aria-hidden="true">↓</span></a></div>
<div class="rw-ch0-art">
${kit.figure('sketch-01', { caption: 'Sketch 01 · original drawing', sizes: '(max-width: 820px) 80vw, 34vw', eager: true, alt: 'Original drawing: a standing figure in dark freehand line on lime', cls: 'rw-ch0-sketch' })}
${kit.figure('drawn-figure-hoodie', { concept: true, caption: 'The same figure, drawn onto a forest hoodie', sizes: '(max-width: 820px) 60vw, 22vw', alt: 'A person in a forest hoodie with the standing-figure drawing on the back', cls: 'rw-ch0-photo' })}
</div></div></section>

<section class="rw-ch rw-ch1" id="ch-1" aria-labelledby="ch1-t"><div class="rw-wrap rw-split">
<div>${chap('01', 'A point of view')}
<h2 id="ch1-t" class="rw-h2">Everyone influences.</h2>
<p class="rw-lede">What we see changes what we create. What we create changes what others see.</p>
${kit.figure('archive-card', { caption: 'Archive · the original Runwae card', sizes: '(max-width: 820px) 100vw, 30vw', alt: 'Black business card reading EVERYONE INFLUENCES under the dripping R', cls: 'rw-card-fig' })}</div>
${kit.figure('sketch-02', { caption: 'Sketch 02 · head study', sizes: '(max-width: 820px) 100vw, 46vw', alt: 'Original drawing: an expressive face and head study on lime', cls: 'rw-art' })}
</div></section>

<section class="rw-ch rw-ch2" aria-labelledby="ch2-t"><div class="rw-wrap">
${chap('02', 'The artwork')}
<h2 id="ch2-t" class="rw-h2 rw-h2--light">Before the garment, there was a line.</h2>
<p class="rw-lede rw-lede--light">Every mark begins somewhere.</p>
<div class="rw-art-pair">
${kit.figure('sketch-03', { caption: 'Sketch 03 · illustrated portrait', sizes: '(max-width: 820px) 100vw, 56vw', alt: 'Original drawing: an illustrated portrait in a crowded composition, signed Runwae Apparel' })}
${kit.figure('sketch-03-detail', { caption: 'Sketch 03 · detail', sizes: '(max-width: 820px) 100vw, 30vw', alt: 'Close detail of the portrait linework' })}
</div></div></section>

<section class="rw-ch rw-ch3" aria-labelledby="ch3-t"><div class="rw-wrap">
${chap('03', 'People · places · perspective')}
<h2 id="ch3-t" class="rw-h2">Perspective is never singular.</h2>
<p class="rw-lede">There is more than one way to move through the world.</p>
<div class="rw-people">
${kit.figure('people-black-hoodie', { caption: 'Runwae, archive photography', sizes: '(max-width: 820px) 100vw, 34vw', alt: 'A woman in a black Runwae hoodie, studio portrait' })}
${kit.figure('people-tee', { caption: 'Runwae, archive photography', sizes: '(max-width: 820px) 100vw, 30vw', alt: 'A man in a black RUNWAE APPAREL tee, looking down' })}
${kit.figure('people-tlt', { caption: 'The Little Things, archive photography', sizes: '(max-width: 820px) 100vw, 30vw', alt: 'A woman in a green The Little Things hoodie' })}
</div></div></section>

<section class="rw-ch rw-ch4" aria-labelledby="ch4-t"><div class="rw-wrap rw-split rw-split--rev">
${kit.figure('making-label', { caption: 'Archive · Runwae care label and hang tag', sizes: '(max-width: 820px) 100vw, 44vw', alt: 'A red Runwae hoodie with its woven label and hang tag', cls: 'rw-art' })}
<div>${chap('04', 'The making')}
<h2 id="ch4-t" class="rw-h2">An idea deserves the material to match.</h2>
<p class="rw-lede">Labels, seams, the weight of the cloth: the details carry the drawing.</p>
<p class="rw-note">Fabric, weight and trims are published here once confirmed with the maker.</p>
${kit.figure('drawn-buttondown', { concept: true, caption: 'Botanical Button-Down', sizes: '(max-width: 820px) 100vw, 26vw', alt: 'An ivory button-down with a small plant drawing on the chest', cls: 'rw-small-fig' })}</div>
</div></section>

<section class="rw-ch rw-ch5" aria-labelledby="ch5-t"><div class="rw-wrap">
${chap('05', 'Archive')}
<h2 id="ch5-t" class="rw-h2">The marks, so far.</h2>
<p class="rw-lede">Monograms, lettering and the badge from Runwae's first years. Each may return on a single piece or capsule.</p>
<ul class="rw-marks">${[['mark-rwa', 'RWA monogram'], ['mark-trc', 'TRC monogram'], ['mark-company', 'The Runwae Company lettering'], ['mark-badge', 'Circular badge with the dripping R']].map(([f, a]) => `<li>${kit.figure(f, { caption: a, sizes: '(max-width: 820px) 45vw, 20vw', alt: a })}</li>`).join('')}</ul>
${archive.length ? `<p class="rw-archive-link"><a href="${kit.href.shop()}#archive">Fall '21, from the archive <span aria-hidden="true">→</span></a></p>` : ''}
</div></section>

<section class="rw-ch rw-ch6" id="collection" aria-labelledby="ch6-t"><div class="rw-wrap">
${chap('06', 'The collection')}
<h2 id="ch6-t" class="rw-h2">The artwork, made wearable.</h2>
<div class="rw-reveal">${quietCard(kit, focus, { big: true })}<div class="rw-reveal-rest">${rest.slice(0, 4).map((p) => quietCard(kit, p)).join('')}</div></div>
<p class="rw-reveal-more"><a class="rw-btn" href="${kit.href.shop()}">Discover the collection</a></p>
</div></section>

<section class="rw-ch rw-ch7" aria-labelledby="ch7-t"><div class="rw-wrap rw-ch7-grid">
<div>${chap('07', 'Continuing')}<h2 id="ch7-t" class="rw-h2 rw-h2--light">A continuing journey.</h2><p class="rw-lede rw-lede--light">Ideas. People. Places. Progress.</p></div>
${kit.figure('sketch-04', { caption: 'Sketch 04 · paired figures and plant', sizes: '(max-width: 820px) 100vw, 40vw', alt: 'Original drawing: two figures and a plant on lime' })}
</div></section>`,
    };
  },

  collection({ kit, shown, archive }) {
    const lines = [...new Set(shown.map((p) => p.line))];
    const notes = { 'The Little Things': "In life, it's all about the little things.", 'The Drawn Series': "Concepts drawn from the owner's four sketches. Not yet available." };
    return {
      title: 'Shop | Runwae Apparel',
      body: `<section class="rw-wrap rw-shop"><h1 class="rw-h2">The collection</h1>
<nav class="rw-jump" aria-label="Lines">${lines.map((l, i) => `<a href="#line-${i}">${kit.esc(l)}</a>`).join('')}${archive.length ? '<a href="#archive">Archive</a>' : ''}</nav>
${lines.map((l, i) => `<section class="rw-line" id="line-${i}" aria-labelledby="line-${i}-t"><div class="rw-line-head"><h2 id="line-${i}-t" class="rw-h3">${kit.esc(l)}</h2><p>${kit.esc(notes[l] ?? '')}</p></div>
<div class="rw-grid">${shown.filter((p) => p.line === l).map((p) => quietCard(kit, p)).join('')}</div></section>`).join('')}
${archive.length ? `<section class="rw-line" id="archive" aria-labelledby="archive-t"><div class="rw-line-head"><h2 id="archive-t" class="rw-h3">Archive · Fall '21</h2><p>The original line. Shown for the record.</p></div>
<div class="rw-grid">${archive.map((p) => quietCard(kit, p)).join('')}</div></section>` : ''}
</section>`,
    };
  },

  product({ kit }, p) {
    const art = p.images.filter((im) => /^Source drawing/.test(im.caption ?? ''));
    const views = p.images.filter((im) => !art.includes(im));
    return `<section class="rw-wrap rw-pdp">
<div class="rw-pdp-media">${views.map((im, i) => kit.figure(im, { sizes: '(max-width: 820px) 100vw, 56vw', eager: i === 0 })).join('')}</div>
<div class="rw-pdp-panel"><div class="rw-sticky">
<p class="rw-crumb"><a href="${kit.href.shop()}">Shop</a> · ${kit.esc(p.line)}</p>
<h1 class="rw-h2">${kit.esc(p.name)}</h1>
<p class="rw-pdp-sum">${kit.esc(p.summary)}</p>
${kit.buyBox(p)}
<div class="rw-pdp-details">${kit.details(p, { open: 1 })}</div>
</div></div></section>
${art.length ? `<section class="rw-ch rw-pdp-art"><div class="rw-wrap rw-split"><div>${chap('·', 'The drawing')}<h2 class="rw-h2">Before the garment, there was a line.</h2><p class="rw-lede">This piece starts from one of the owner's original sketches, shown here as drawn.</p></div>${kit.figure(art[0], { sizes: '(max-width: 820px) 100vw, 40vw', cls: 'rw-art' })}</div></section>` : ''}`;
  },

  story({ kit }) {
    const sk = [['sketch-01', 'Sketch 01', 'Full-body standing figure'], ['sketch-02', 'Sketch 02', 'Expressive face and head study'], ['sketch-03', 'Sketch 03', 'Illustrated portrait, crowded composition'], ['sketch-04', 'Sketch 04', 'Paired figures and plant']];
    return {
      title: 'Archive | Runwae Apparel',
      description: "The owner's original drawings and Runwae's marks, the starting point for every piece.",
      body: `<section class="rw-wrap rw-arch-head">${chap('05', 'Archive')}<h1 class="rw-h1 rw-h1--ink">The drawings and the marks.</h1>
<p class="rw-lede">Four freehand sketches are the origin of the Drawn Series. They are shown here as drawn, before any garment.</p></section>
<section class="rw-wrap"><ol class="rw-sketches">${sk.map(([f, t, d]) => `<li>${kit.figure(f, { caption: false, sizes: '(max-width: 820px) 100vw, 45vw', alt: `${t}: ${d}` })}<h2 class="rw-h3">${t}</h2><p>${d}</p></li>`).join('')}</ol></section>
<section class="rw-wrap rw-arch-marks"><h2 class="rw-h3">Marks</h2><ul class="rw-marks">${[['mark-rwa', 'RWA monogram'], ['mark-trc', 'TRC monogram'], ['mark-company', 'The Runwae Company'], ['mark-badge', 'Circular badge']].map(([f, a]) => `<li>${kit.figure(f, { caption: a, sizes: '(max-width: 820px) 45vw, 20vw', alt: a })}</li>`).join('')}</ul>
${kit.figure('archive-card', { caption: 'The original Runwae card: Everyone Influences', sizes: '(max-width: 820px) 100vw, 50vw', alt: 'Black card reading EVERYONE INFLUENCES', cls: 'rw-arch-card' })}</section>`,
    };
  },
};
