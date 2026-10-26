// Where a shop lives on the web. brand.json: `domain` (host) + optional `base_path` (e.g. "/shop" when the shop is
// served under its main site, Principal 2026-10-26 STUDIOS-SHOP-PATH: buttsstudios.com/shop, ridgefieldtech.com/shop).
// Brand-agnostic. A shop that IS its brand domain (runwaeapparel.com, girlslovebutts.com) has no base_path.
export const basePath = (brand) => {
  const b = String(brand?.base_path ?? '').trim().replace(/\/+$/, '');
  if (b && !/^\/[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(b)) throw new Error(`base_path "${brand.base_path}" must look like /shop`);
  return b;
};
/** https://<domain><base_path>, no trailing slash. */
export const shopUrl = (brand) => `https://${brand.domain}${basePath(brand)}`;
/** Human label for the shop address: "buttsstudios.com/shop" or "runwaeapparel.com". */
export const shopLabel = (brand) => `${brand.domain}${basePath(brand)}`;
