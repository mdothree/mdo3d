// Frontier Ledger client: filters, watchlist highlights. Rows are already in the HTML; this only hides/marks them.
(function () {
  'use strict';
  var KEY = 'fl.watchlist.quantum';
  function loadWL() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || '{}'); return { cos: v.cos || [], kws: v.kws || [] }; }
    catch (e) { return { cos: [], kws: [] }; }
  }
  function saveWL(wl) { try { localStorage.setItem(KEY, JSON.stringify(wl)); } catch (e) { /* private mode: keep in memory */ } }
  function matches(wl, company, text) {
    if (wl.cos.indexOf(company) !== -1) return true;
    for (var i = 0; i < wl.kws.length; i++) if (wl.kws[i] && text.indexOf(wl.kws[i]) !== -1) return true;
    return false;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function highlight(text, kws) {
    var out = esc(text);
    kws.forEach(function (k) {
      if (!k) return;
      var re = new RegExp('(' + esc(k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }
  window.FL = { loadWL: loadWL, saveWL: saveWL, matches: matches, esc: esc, highlight: highlight };

  var wl = loadWL();
  // Mark watchlist matches on any page that renders rows.
  document.querySelectorAll('.row[data-company]').forEach(function (r) {
    r.classList.toggle('match', matches(wl, r.dataset.company, r.dataset.text || ''));
  });

  var list = document.getElementById('list');
  if (!list) return;
  var q = document.getElementById('q'), co = document.getElementById('company'), wlOnly = document.getElementById('wl-only');
  var shown = document.getElementById('shown'), empty = document.getElementById('empty');
  var state = { type: '', status: '' };
  function segs(sel, field) {
    document.querySelectorAll(sel + ' button').forEach(function (b) {
      b.addEventListener('click', function () {
        state[field] = b.dataset[field] || '';
        document.querySelectorAll(sel + ' button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        apply();
      });
    });
  }
  segs('.types', 'type'); segs('.statuses', 'status');
  function apply() {
    var term = q ? q.value.trim().toLowerCase() : '', c = co ? co.value : '', n = 0, total = 0;
    list.querySelectorAll('.row').forEach(function (r) {
      total++;
      var ok = (!term || (r.dataset.text || '').indexOf(term) !== -1) &&
               (!c || r.dataset.company === c) &&
               (!state.type || r.dataset.type === state.type) &&
               (!state.status || r.dataset.status === state.status) &&
               (!wlOnly || !wlOnly.checked || r.classList.contains('match'));
      r.hidden = !ok; if (ok) n++;
    });
    if (shown) shown.textContent = n + ' of ' + total + ' shown';
    if (empty) empty.hidden = n !== 0;
  }
  [q, co, wlOnly].forEach(function (el) { if (el) el.addEventListener('input', apply); });
  var exp = document.getElementById('export');
  if (exp) exp.addEventListener('click', function () {
    fetch('/api/export').then(function (r) { return r.json(); }).then(function (j) {
      shown.textContent = j.error || 'CSV export is part of membership.';
    }).catch(function () { shown.textContent = 'CSV export is part of membership (early access).'; });
  });
  apply();
})();
