/* theme-init.js — MDOThree shared template (mdothree-text go-final-r4), Guidance variant.
 * Load in <head> as a plain, non-deferred external script BEFORE the styles:
 *   <script src="/js/theme-init.js"></script>
 * Sets <html data-theme="light|dark"> before first paint (no flash of the wrong theme).
 * Guidance is dark-branded: the visitor's saved choice (localStorage "mdo-theme") wins, otherwise dark.
 * The toggle itself lives in /js/theme.js.
 */
(function () {
  var root = document.documentElement;
  var saved = null;
  try { saved = window.localStorage.getItem('mdo-theme'); } catch (e) { saved = null; }
  root.setAttribute('data-theme', saved === 'light' || saved === 'dark' ? saved : 'dark');
})();
