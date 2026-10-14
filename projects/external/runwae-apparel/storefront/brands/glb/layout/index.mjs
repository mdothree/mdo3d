// Girls Love Butts layout. Direction from the 7 GLB concept boards (~/mdo3d/projects/external/runwae-apparel/design/glb/concepts_2026-10-14): bright pink / yellow /
// blue on cream, hand-drawn marker type, stickers, body-positive. Playful and confident, never crude.
// TAGLINES ARE PROVISIONAL (pending the Principal's identity call): "They own it." / "Every body is worth
// drawing." Board copy reused: "Clothes for every body", "Real bodies, brighter days".
// Not reused from the boards: prices, star ratings/review counts, "ethically made"/"premium comfort" claims,
// Afterpay. Hats and the tote are GLB products (the cap/tote bans were Butts Studios only).

const heart = '<svg class="g-heart" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.5C5.5 16 3.2 12.6 3.6 9.4 4 6.4 7.4 4.6 10 6.4c.8.5 1.5 1.3 2 2.1.5-.8 1.2-1.6 2-2.1 2.6-1.8 6-.1 6.4 3 .4 3.2-1.9 6.6-8.4 11.1Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
const logo = (kit, cls = '') => `<a class="g-logo${cls}" href="${kit.href.home()}" aria-label="Girls Love Butts, home"><span class="g-logo-glb">GLB${heart}</span><span class="g-logo-sub">Girls Love Butts</span></a>`;

export function header({ kit, page }) {
  const cur = (k) => (page === k ? ' aria-current="page"' : '');
  return `<header class="g-head"><div class="g-wrap g-head-row">${logo(kit)}
${kit.menuButton('Menu')}
<nav id="site-nav" class="g-nav" aria-label="Main"><a href="${kit.href.shop()}"${cur('collection')}>Shop</a><a href="${kit.href.story()}"${cur('story')}>Our story</a><a href="${kit.href.orders()}"${cur('orders')}>Orders</a>${kit.bagLink('Bag')}</nav>
</div></header>`;
}

export function footer({ brand, kit }) {
  return `<footer class="g-foot"><div class="g-wrap g-foot-grid">
<div>${logo(kit, ' g-logo--foot')}<p class="g-foot-line">Clothes for every body.</p></div>
<nav aria-label="Footer"><a href="${kit.href.shop()}">Shop</a><a href="${kit.href.story()}">Our story</a><a href="${kit.href.orders()}">Order lookup</a><a href="${kit.href.policies()}">Shipping and exchanges</a></nav>
<p class="g-fine">${kit.esc(brand.endorsement)}<br>${kit.esc(brand.policies.contact)}<br>© ${new Date().getUTCFullYear()} Girls Love Butts. Product images are concept renders.</p>
</div></footer>`;
}

const tints = ['pink', 'yellow', 'blue', 'cream', 'pink'];
function card(kit, p, i) {
  const v = kit.view(p);
  const im = p.images[0];
  const dots = (p.colors ?? []).map((c) => `<span class="g-dot sw-${kit.esc(c.id)}" title="${kit.esc(c.name)}"></span>`).join('');
  return `<a class="g-card g-card--${tints[i % tints.length]}" href="${kit.href.product(p)}">
<span class="g-card-media">${kit.img(im, { sizes: '(max-width: 820px) 50vw, 20vw', alt: im.alt })}<span class="g-card-tag">Concept</span></span>
<span class="g-card-name">${kit.esc(p.name)}</span>
<span class="g-card-meta">${v.priceText ? `<span>${kit.esc(v.priceText)}</span>` : ''}<span class="seed-status seed-status--${v.status}">${kit.esc(v.label)}</span></span>
${dots ? `<span class="g-dots" aria-label="Colours: ${kit.esc((p.colors ?? []).map((c) => c.name).join(', '))}">${dots}</span>` : ''}</a>`;
}

export const pages = {
  home({ brand, kit, shown }) {
    const focus = shown.find((p) => ['preorder', 'available'].includes(kit.view(p).status)) ?? shown[0];
    return {
      title: 'Girls Love Butts · Clothes for every body',
      description: brand.description,
      image: kit.imgData('hero-tee').src,
      body: `
<section class="g-hero"><div class="g-wrap g-hero-grid">
<div class="g-hero-copy">
<p class="g-eyebrow">Clothes for every body ${heart}</p>
<h1 class="g-h1"><span>Girls</span> <span>Love</span> <span class="g-under">Butts</span></h1>
<p class="g-tag">They own it.</p>
<p class="g-sub">Every body is worth drawing.</p>
<a class="g-pill" href="${kit.href.shop()}">Shop all <span aria-hidden="true">→</span></a>
</div>
<div class="g-hero-tee">${kit.figure('hero-tee', { concept: true, caption: 'Icon Tee', sizes: '(max-width: 820px) 70vw, 26vw', eager: true, alt: 'The Icon Tee: a grid of line-drawn figures on a white tee' })}
<span class="g-sticker g-sticker--yellow" aria-hidden="true">Real bodies, brighter days ${heart}</span></div>
<div class="g-hero-art">${kit.figure('hero-girl', { concept: true, caption: 'Illustration', sizes: '(max-width: 820px) 90vw, 34vw', alt: 'Illustration of a smiling woman with blue hair sitting on a yellow shape' })}</div>
</div></section>

<section class="g-featured" aria-labelledby="feat-t"><div class="g-wrap">
<div class="g-sec-head"><h2 id="feat-t" class="g-h2">The goods</h2><span class="g-rule" aria-hidden="true"></span><a class="g-see" href="${kit.href.shop()}">See all <span aria-hidden="true">→</span></a></div>
<div class="g-row">${shown.slice(0, 10).map((p, i) => card(kit, p, i)).join('')}</div>
</div></section>

<section class="g-band" aria-labelledby="band-t"><div class="g-wrap g-band-grid">
<h2 id="band-t" class="g-band-title"><span>Real bodies,</span> <span class="g-orange">brighter</span> <span>days ${heart}</span></h2>
${kit.figure('band-friends', { concept: true, caption: 'Illustration', sizes: '(max-width: 820px) 100vw, 40vw', alt: 'Illustration of four friends with their arms around each other, seen from behind' })}
<div class="g-band-copy"><h3 class="g-h3">Why GLB</h3><p>GLB celebrates every body: all shapes, all backgrounds, all the ways we move through the world. The line art starts in a sketchbook and ends up on clothes you can wear with a grin.</p><a class="g-pill g-pill--dark" href="${kit.href.story()}">Our story <span aria-hidden="true">→</span></a></div>
</div></section>

<section class="g-sketch" aria-labelledby="sketch-t"><div class="g-wrap g-sketch-grid">
<div class="g-taped">${kit.figure('sketchbook-six', { caption: 'From the sketchbook · the original drawings', sizes: '(max-width: 820px) 100vw, 46vw', alt: 'Sketchbook page with six line-drawn figures in pen' })}</div>
<div><p class="g-eyebrow">From the sketchbook</p><h2 id="sketch-t" class="g-h2">Every body is worth drawing.</h2>
<p class="g-lede">The figures on the ${kit.esc(focus.name)} come straight off these pages. Pen, paper, no two the same.</p>
<div class="g-focus">${kit.img(focus.images[0], { sizes: '120px', alt: '', cls: 'g-focus-img' })}<div><p class="g-focus-name">${kit.esc(focus.name)}</p>${kit.status(focus)} <span class="g-focus-price">${kit.esc(kit.view(focus).priceText)}</span></div></div>
<a class="g-pill" href="${kit.href.product(focus)}">${kit.view(focus).preorder ? 'Pre-order the' : 'Shop the'} ${kit.esc(focus.name)} <span aria-hidden="true">→</span></a></div>
</div></section>`,
    };
  },

  collection({ kit, shown }) {
    const cats = [['tees', 'Tees'], ['hoodies', 'Hoodies'], ['baby-tees', 'Baby Tees'], ['shorts', 'Shorts'], ['sweatshirts', 'Sweatshirts'], ['hats', 'Hats'], ['accessories', 'Accessories']].filter(([c]) => shown.some((p) => p.category === c));
    return {
      title: 'Shop | Girls Love Butts',
      body: `<section class="g-shop-hero"><div class="g-wrap"><h1 class="g-h1 g-h1--shop">Shop GLB ${heart}</h1><p class="g-sub">Clothes for every body. Product images are concept renders while the first drop is made.</p>
<nav class="g-chips" aria-label="Categories">${cats.map(([c, l]) => `<a class="g-chip" href="#cat-${c}">${l}</a>`).join('')}</nav></div></section>
<div class="g-wrap">${cats.map(([c, l]) => `<section class="g-cat" id="cat-${c}" aria-labelledby="cat-${c}-t"><h2 id="cat-${c}-t" class="g-h2">${l}</h2><div class="g-grid">${shown.filter((p) => p.category === c).map((p, i) => card(kit, p, i + (c === 'tees' ? 0 : 1))).join('')}</div></section>`).join('')}</div>`,
    };
  },

  product({ kit }, p) {
    const media = (imgs, ci) => { const [main, ...more] = imgs; return `<div class="g-pdp-main">${kit.figure(main, { sizes: '(max-width: 820px) 100vw, 50vw', eager: ci === 0 })}</div>
${more.length ? `<div class="g-pdp-more">${more.map((im) => kit.figure(im, { sizes: '(max-width: 820px) 50vw, 25vw' })).join('')}</div>` : ''}`; };
    return `<section class="g-wrap g-pdp">
<div class="g-pdp-media">${kit.colorGalleries(p, media)}</div>
<div class="g-pdp-panel">
<p class="g-crumb"><a href="${kit.href.shop()}">Shop</a> / ${kit.esc(p.type)}</p>
<h1 class="g-h1 g-h1--pdp">${kit.esc(p.name)} ${heart}</h1>
<p class="g-lede">${kit.esc(p.summary)}</p>
${kit.colorSwitch(p)}${kit.buyBox(p)}
<ul class="g-values" aria-label="What GLB stands for"><li>${heart}<span>Body positive, always</span></li><li>${heart}<span>Drawn by hand</span></li><li>${heart}<span>A brighter, kinder world</span></li></ul>
<div class="g-pdp-details">${kit.details(p, { open: 1 })}</div>
</div></section>`;
  },

  story({ kit }) {
    return {
      title: 'Our story | Girls Love Butts',
      body: `<section class="g-story-hero"><div class="g-wrap g-story-grid">
<div><p class="g-eyebrow">Our story</p><h1 class="g-h1 g-h1--shop">They own it.</h1>
<p class="g-lede">GLB is a celebration of real bodies and the people in them. It starts with a pen and a sketchbook: quick, honest line drawings of bodies of every shape. Then the best of them go on clothes.</p>
<p class="g-lede">The point is simple. Every body is worth drawing, and everyone deserves clothes that make them grin.</p></div>
<div class="g-taped g-taped--tilt">${kit.figure('sketchbook-one', { caption: 'From the sketchbook', sizes: '(max-width: 820px) 100vw, 42vw', alt: 'Sketchbook page: one figure drawn in a single pen line' })}</div>
</div></section>
<section class="g-band"><div class="g-wrap g-band-grid g-band-grid--story">
<h2 class="g-band-title"><span>Clothes for</span> <span class="g-orange">every</span> <span>body ${heart}</span></h2>
${kit.figure('band-friends', { concept: true, caption: 'Illustration', sizes: '(max-width: 820px) 100vw, 50vw', alt: 'Illustration of four friends with their arms around each other' })}
</div></section>
<section class="g-wrap g-story-end"><a class="g-pill" href="${kit.href.shop()}">Shop GLB <span aria-hidden="true">→</span></a></section>`,
    };
  },
};
