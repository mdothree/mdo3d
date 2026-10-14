// Template layout: the plain starting point for a new brand. Copy, then art-direct.
// Everything brand-specific comes from ctx.brand (brand.json); components come from ctx.kit (core/kit.mjs).
export function header({ brand, kit, page }) {
  const nav = (brand.nav ?? [['Shop', 'shop'], ['Story', 'story']]).map(([label, key]) =>
    `<a href="${kit.href[key]()}"${page === key || (key === 'shop' && page === 'collection') ? ' aria-current="page"' : ''}>${kit.esc(label)}</a>`).join('');
  return `<header class="t-header"><a class="t-brand" href="${kit.href.home()}">${kit.esc(brand.name)}</a>
${kit.menuButton()}<nav id="site-nav" class="t-nav" aria-label="Main">${nav}${kit.bagLink()}</nav></header>`;
}

export function footer({ brand, kit }) {
  return `<footer class="t-footer"><span>© ${new Date().getUTCFullYear()} ${kit.esc(brand.name)}</span>
<a href="${kit.href.policies()}">Shipping and exchanges</a><a href="${kit.href.orders()}">Order lookup</a></footer>`;
}

const grid = (kit, items) => `<div class="t-grid">${items.map((p) => kit.card(p)).join('')}</div>`;

export const pages = {
  home: ({ brand, kit, shown }) => ({
    title: brand.name,
    body: `<section class="t-hero"><h1>${kit.esc(brand.name)}</h1>${brand.tagline ? `<p>${kit.esc(brand.tagline)}</p>` : ''}</section>
${shown.length ? `<section class="t-section"><h2>Shop</h2>${grid(kit, shown)}</section>` : ''}`,
  }),
  collection: ({ brand, kit, shown, archive }) => ({
    title: `Shop | ${brand.name}`,
    body: `<section class="t-section"><h1>Shop</h1>${grid(kit, shown)}</section>${archive.length ? `<section class="t-section"><h2>Archive</h2>${grid(kit, archive)}</section>` : ''}`,
  }),
  product: ({ kit }, p) => `<section class="t-product">${kit.gallery(p)}<div class="t-buy"><h1>${kit.esc(p.name)}</h1>
${p.summary ? `<p>${kit.esc(p.summary)}</p>` : ''}${kit.buyBox(p)}${kit.details(p)}</div></section>`,
  story: ({ brand, kit }) => ({
    title: `Story | ${brand.name}`,
    body: `<article class="seed-prose t-section"><h1>Story</h1>${(brand.copy?.story ?? []).map((t) => `<p>${kit.esc(t)}</p>`).join('')}</article>`,
  }),
};
