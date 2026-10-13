/* theme-init.js — MDOThree shared template, DIVINATION variant (lane decision 2026-10-13: the divination brands
 * default to DARK, like astrology/iching/runes; light is opt-in via the toggle).
 * Load it in <head> as a plain, non-deferred external script BEFORE the stylesheets:
 *   <script src="/js/theme-init.js"></script>
 * It sets <html data-theme="light|dark"> before first paint, so there is no flash of the wrong theme.
 * The CSP forbids inline scripts, which is why this is a file and not an inline snippet.
 * Order: the visitor's saved choice (localStorage "mdo-theme") > dark. The OS preference is not followed, so no
 * data-theme-source="os" is set and theme-toggle.js does not track OS changes.
 */
(function () {
  var root = document.documentElement;
  var saved = null;
  try { saved = window.localStorage.getItem('mdo-theme'); } catch (e) { saved = null; }
  var theme = saved === 'light' || saved === 'dark' ? saved : 'dark';
  root.setAttribute('data-theme', theme);
})();
