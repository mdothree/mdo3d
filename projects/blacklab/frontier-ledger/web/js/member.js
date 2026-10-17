// Membership block + watchlist page. Checkout runs only when the server has a Stripe TEST key; otherwise it says so.
(function () {
  'use strict';
  var plan = 'monthly';
  document.querySelectorAll('[data-plan]').forEach(function (b) {
    b.addEventListener('click', function () {
      plan = b.dataset.plan;
      document.querySelectorAll('[data-plan]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    });
  });
  var status = document.getElementById('join-status'), join = document.getElementById('join');
  var q = new URLSearchParams(location.search).get('checkout');
  fetch('/api/checkout', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
    if (!status) return;
    status.textContent = j.enabled ? 'Test-mode checkout: no real charge is made.' : 'Membership opens soon. Checkout is not live yet.';
    if (q === 'success') status.textContent = 'Test checkout completed. No real charge was made.';
  }).catch(function () { if (status) status.textContent = 'Membership opens soon. Checkout is not live yet.'; });
  if (join) join.addEventListener('click', function () {
    status.textContent = 'Opening checkout…';
    fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: plan }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j.ok && j.url) location.href = j.url; else status.textContent = j.error || 'Membership opens soon.'; })
      .catch(function () { status.textContent = 'Membership opens soon. Checkout is not live yet.'; });
  });

  // Watchlist page
  var listEl = document.getElementById('wl-list');
  if (!listEl || !window.FL) return;
  var FL = window.FL, wl = FL.loadWL(), data = null;
  var kw = document.getElementById('kw'), count = document.getElementById('wl-count');
  document.querySelectorAll('input[name=co]').forEach(function (c) {
    c.checked = wl.cos.indexOf(c.value) !== -1;
    c.addEventListener('change', sync);
  });
  if (kw) { kw.value = wl.kws.join(', '); kw.addEventListener('input', sync); }
  document.getElementById('wl-clear').addEventListener('click', function () {
    document.querySelectorAll('input[name=co]').forEach(function (c) { c.checked = false; });
    if (kw) kw.value = ''; sync();
  });
  function sync() {
    wl = {
      cos: Array.prototype.filter.call(document.querySelectorAll('input[name=co]'), function (c) { return c.checked; }).map(function (c) { return c.value; }),
      kws: (kw ? kw.value : '').split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean)
    };
    FL.saveWL(wl); render();
  }
  function render() {
    if (!data) return;
    if (!wl.cos.length && !wl.kws.length) {
      listEl.innerHTML = '<li class="row placeholder mono">Pick a company or add a keyword to see matches.</li>';
      count.textContent = ''; return;
    }
    var rows = [];
    data.events.forEach(function (e) {
      var text = [e.company, e.title, e.summary, e.excerpt].join(' ').toLowerCase();
      if (!FL.matches(wl, e.company, text)) return;
      rows.push('<li class="row ev match"><div class="meta mono"><time>' + FL.esc(e.date) + '</time><span class="blb-tag">' + FL.esc(e.type) +
        '</span><span class="co">' + FL.esc(e.company) + '</span></div><h3>' + FL.highlight(e.title, wl.kws) + '</h3><p class="sum">' +
        FL.highlight(e.summary, wl.kws) + '</p><div class="foot mono"><a class="src" href="' + FL.esc(e.source_url) +
        '" target="_blank" rel="noopener nofollow">Source: ' + FL.esc(e.source_title) + '</a></div></li>');
    });
    data.claims.forEach(function (c) {
      var text = [c.company, c.claim, c.status_note].join(' ').toLowerCase();
      if (!FL.matches(wl, c.company, text)) return;
      rows.push('<li class="row cl match"><div class="meta mono"><span class="co">' + FL.esc(c.company) + '</span><span class="blb-tag s-' + FL.esc(c.status) + '">' +
        FL.esc(c.status.replace('_', ' ')) + '</span><span>Target ' + FL.esc(c.target_date) + '</span></div><blockquote class="claim">&ldquo;' +
        FL.highlight(c.claim, wl.kws) + '&rdquo;</blockquote><div class="foot mono"><a class="src" href="' + FL.esc(c.source_url) +
        '" target="_blank" rel="noopener nofollow">Claim source: ' + FL.esc(c.source_title) + '</a></div></li>');
    });
    count.textContent = rows.length + ' match' + (rows.length === 1 ? '' : 'es') + ' in the last ' + data.window_days + ' days and the Promise Ledger';
    listEl.innerHTML = rows.join('') || '<li class="row placeholder mono">No matches yet. New verified entries will show here.</li>';
  }
  fetch('/data/ledger.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) { data = j; render(); });
})();
