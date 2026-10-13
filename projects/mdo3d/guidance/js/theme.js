/* theme.js — light/dark toggle, MDOThree shared template (mdothree-text go-final-r4 site-chrome.js, theme part).
 * Load: <script src="/js/theme.js" defer></script> (after theme-init.js ran in <head>).
 * Any [data-mdo-theme] button toggles; the choice is kept in localStorage "mdo-theme" (try/catch: blocked
 * storage just means the choice lasts this page). Fires 'mdo-theme-change' on document.
 */
(function () {
  'use strict';
  var root = document.documentElement;
  var KEY = 'mdo-theme';
  function current() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function label(btn) {
    var next = current() === 'dark' ? 'light' : 'dark';
    var text = 'Switch to ' + next + ' theme';
    btn.setAttribute('aria-label', text);
    btn.setAttribute('title', text);
    btn.setAttribute('aria-pressed', current() === 'dark' ? 'true' : 'false');
  }
  function apply(theme) {
    root.setAttribute('data-theme', theme);
    try { window.localStorage.setItem(KEY, theme); } catch (e) { /* storage blocked: choice lasts this page */ }
    var btns = document.querySelectorAll('[data-mdo-theme]');
    for (var i = 0; i < btns.length; i++) label(btns[i]);
    try { document.dispatchEvent(new CustomEvent('mdo-theme-change', { detail: { theme: theme } })); } catch (e) {}
  }
  var toggles = document.querySelectorAll('[data-mdo-theme]');
  for (var t = 0; t < toggles.length; t++) {
    label(toggles[t]);
    toggles[t].addEventListener('click', function () { apply(current() === 'dark' ? 'light' : 'dark'); });
  }
})();
