// Browser UI for every brand. Bundled after core/cart.mjs into one IIFE (see clientBundle in core/build.mjs),
// so the cart functions (addLine, summarise, ...) are in scope. Progressive enhancement: pages render fully
// without this script; it adds the menu toggle, the bag, and the forms. No inline styles (CSP).
var SEED = window.SEED || { brand: { id: 'shop' }, products: {}, copy: {} };
var ROOT = document.documentElement.getAttribute('data-root') || '';
var KEY = 'seed-cart:' + SEED.brand.id;
var COPY = SEED.copy || {};
var API = SEED.api || '/api'; // '/shop/api' when the shop is served under its main site

function loadCart() {
  try { return normaliseCart(JSON.parse(window.localStorage.getItem(KEY) || '[]')); } catch (e) { return []; }
}
function saveCart(c) {
  try { window.localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* private mode: the bag lasts for this page only */ }
  paintCount(c);
}
function money(c) { return typeof c === 'number' ? '$' + (c / 100).toFixed(2) : 'Price TBA'; }
function el(tag, attrs, kids) {
  var n = document.createElement(tag);
  for (var k in attrs || {}) {
    if (k === 'text') n.textContent = attrs[k];
    else if (k === 'cls') n.className = attrs[k];
    else n.setAttribute(k, attrs[k]);
  }
  (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
  return n;
}
function say(node, text) { if (node) node.textContent = text; }

function paintCount(cart) {
  var n = cartCount(cart || loadCart());
  document.querySelectorAll('[data-bag-count]').forEach(function (b) {
    b.textContent = String(n);
    b.classList.toggle('is-empty', n === 0);
  });
}

// ---------- phone menu ----------
function initMenu() {
  var btn = document.querySelector('[data-menu-toggle]');
  if (!btn) return;
  var nav = document.getElementById(btn.getAttribute('aria-controls'));
  function set(open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.documentElement.classList.toggle('menu-open', open);
  }
  btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); } });
  if (nav) nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  window.matchMedia('(min-width: 821px)').addEventListener('change', function (m) { if (m.matches) set(false); });
}

// ---------- colour galleries (kit.colorGalleries) ----------
function showColor(id) {
  var groups = document.querySelectorAll('[data-color-group]');
  if (!groups.length) return;
  groups.forEach(function (g) { g.hidden = g.getAttribute('data-color-group') !== id; });
}
function initColors() {
  var first = document.querySelector('input[name="color"]:checked, input[name="view-color"]:checked');
  if (first) showColor(first.value);
  document.querySelectorAll('input[name="color"], input[name="view-color"]').forEach(function (r) {
    r.addEventListener('change', function () {
      showColor(r.value);
      var t = r.closest('fieldset') && r.closest('fieldset').querySelector('[data-color-name]');
      if (t) t.textContent = r.getAttribute('data-name');
    });
  });
}

// ---------- live availability (core/stock.mjs via /api/availability; the build-time snapshot is the fallback) ----------
function skuKey(color, size) { return (color || '-') + '/' + (size || '-'); }
function skuAvail(pid, color, size) {
  var p = SEED.products[pid];
  if (!p || !p.avail) return null;
  if (!color && (p.colors || []).length) color = p.colors[0].id;
  return p.avail[skuKey(color, size)] || null;
}
function canSell(a) { return !a || ['sold_out', 'not_in_stock', 'preorder_full'].indexOf(a.state) < 0; }
function paintAvail(f) {
  var pid = f.getAttribute('data-product');
  var c = f.querySelector('input[name="color"]:checked');
  var color = c ? c.value : ((SEED.products[pid] || {}).colors || [])[0] ? SEED.products[pid].colors[0].id : '';
  var sizeIn = f.querySelector('input[name="size"]:checked') || f.querySelector('input[type="hidden"][name="size"]');
  f.querySelectorAll('input[name="size"][type="radio"]').forEach(function (r) {
    var a = skuAvail(pid, color, r.value);
    r.disabled = !canSell(a);
    if (r.disabled && r.checked) r.checked = false;
  });
  var line = f.parentNode.querySelector('[data-avail]');
  var a = sizeIn && !sizeIn.disabled ? skuAvail(pid, color, sizeIn.value) : null;
  if (line && a) line.textContent = a.text;
}
function refreshAvailability(done) {
  if (!window.fetch || location.protocol === 'file:') { if (done) done(); return; }
  fetch(API + '/availability?brand=' + encodeURIComponent(SEED.brand.id), { headers: { accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (j && j.products) for (var id in j.products) if (SEED.products[id]) SEED.products[id].avail = j.products[id];
    })
    .catch(function () { /* keep the build-time snapshot */ })
    .then(function () { if (done) done(); });
}

// ---------- add to bag ----------
function initAdd() {
  document.querySelectorAll('form[data-add]').forEach(function (f) {
    var msg = f.querySelector('.seed-msg');
    paintAvail(f);
    f.addEventListener('change', function () { paintAvail(f); });
    f.querySelectorAll('input[name="color"]').forEach(function (r) {
      r.addEventListener('change', function () { var t = f.querySelector('[data-color-name]'); if (t) t.textContent = r.getAttribute('data-name'); });
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var pid = f.getAttribute('data-product');
      var p = SEED.products[pid];
      if (!p || !p.canAdd) { say(msg, 'This piece is not available to add yet.'); return; }
      var sizeIn = f.querySelector('input[name="size"]:checked') || f.querySelector('input[type="hidden"][name="size"]');
      if ((p.sizes || []).length && !sizeIn) {
        say(msg, 'Choose a size first.');
        var first = f.querySelector('input[name="size"]'); if (first) first.focus();
        return;
      }
      var colorIn = f.querySelector('input[name="color"]:checked');
      var av = skuAvail(pid, colorIn ? colorIn.value : ((p.colors || [])[0] || {}).id, sizeIn ? sizeIn.value : '');
      if (!canSell(av)) { say(msg, av.text + '. Choose another size or colour.'); return; }
      var r = addLine(loadCart(), { product: pid, size: sizeIn ? sizeIn.value : '', color: colorIn ? colorIn.value : '', qty: 1 });
      if (!r.ok) { say(msg, r.error); return; }
      saveCart(r.cart);
      msg.textContent = '';
      msg.appendChild(document.createTextNode('Added to your bag. '));
      msg.appendChild(el('a', { href: ROOT + 'cart.html', text: 'View bag' }));
    });
  });
}

// ---------- notify me (next_drop / sold_out) + release sign-ups (reserve / waitlist) ----------
// A reserve form whose box has data-limit checks the server count once; at the limit it shows the waitlist copy.
function fullCopy(f, k) { var box = f.closest('[data-release]'); return box ? box.getAttribute('data-full-' + k) : ''; }
function showFull(box) {
  if (!box || box.getAttribute('data-full') === '1') return;
  box.setAttribute('data-full', '1');
  var f = box.querySelector('form[data-notify]');
  var A = function (k) { return box.getAttribute('data-full-' + k) || ''; };
  var tt = box.querySelector('[data-tag-text]');
  if (tt) { tt.textContent = A('tag'); var tg = tt.closest('[data-state]'); if (tg) tg.setAttribute('data-state', 'waitlist'); }
  else { var st = box.querySelector('.seed-status'); if (st) st.textContent = A('status'); }
  var b = f.querySelector('button'); if (b) b.textContent = A('button');
  var hp = box.querySelector('[data-helper]');
  if (hp) { // state block layout: reason line + plain helper
    hp.textContent = A('plain-helper');
    var rs = box.querySelector('[data-reason]');
    if (!rs) { rs = document.createElement('p'); rs.className = 'buy-reason'; rs.setAttribute('data-reason', ''); f.parentNode.insertBefore(rs, f); }
    rs.textContent = A('reason');
    var tm = box.querySelector('[data-terms]'); if (tm) tm.hidden = true;
    var cs = box.querySelector('[data-consent]'); if (cs && cs.firstChild) cs.firstChild.nodeValue = A('consent') + ' ';
  } else { var l = f.querySelector('label'); if (l) l.textContent = A('helper'); }
  var t = f.querySelector('.seed-notify-terms'); if (t) t.hidden = true;
  var c = f.querySelector('.seed-notify-consent'); if (c && c.firstChild) c.firstChild.nodeValue = box.getAttribute('data-full-consent') + ' ';
  f.setAttribute('data-list', 'waitlist'); f.setAttribute('data-done', box.getAttribute('data-full-done'));
}
function initReserveLimits() {
  document.querySelectorAll('[data-release][data-limit]').forEach(function (box) {
    fetch(API + '/notify?brand=' + encodeURIComponent(SEED.brand.id) + '&product=' + encodeURIComponent(box.getAttribute('data-release')))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.list === 'waitlist') showFull(box); })
      .catch(function () {});
  });
}
function initNotify() {
  initReserveLimits();
  document.querySelectorAll('form[data-notify]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = f.querySelector('.seed-msg');
      var email = f.querySelector('input[name="email"]');
      if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value)) { say(msg, 'Please enter a valid email address.'); email.focus(); return; }
      var btn = f.querySelector('button'); btn.disabled = true;
      fetch(API + '/notify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ brand: SEED.brand.id, product: f.getAttribute('data-product'), list: f.getAttribute('data-list') || 'notify', email: email.value }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) { say(msg, x.ok ? ((x.j.list === 'waitlist' && f.getAttribute('data-list') === 'reserve' && fullCopy(f, 'done')) || f.getAttribute('data-done') || "You're on the list. One email when it opens.") : (x.j.error || COPY.notifyOff));
          if (x.ok && x.j.list === 'waitlist' && f.getAttribute('data-list') === 'reserve') showFull(f.closest('[data-release]'));
          if (x.ok && f.hasAttribute('data-replace')) { var done = el('p', { text: msg.textContent }); done.className = 'buy-reason'; done.setAttribute('role', 'status'); f.parentNode.replaceChild(done, f); } if (x.ok) email.value = ''; })
        .catch(function () { say(msg, COPY.notifyOff); })
        .then(function () { btn.disabled = false; });
    });
  });
}

// ---------- cart page ----------
function renderCart(root) {
  var cart = loadCart();
  var s = summarise(cart, SEED.products);
  var full = root.querySelector('[data-cart-full]');
  var empty = root.querySelector('[data-cart-empty]');
  full.hidden = !s.lines.length;
  empty.hidden = !!s.lines.length;
  var list = root.querySelector('[data-cart-lines]');
  list.textContent = '';
  s.lines.forEach(function (l) {
    var meta = [l.colorName, l.size ? 'Size ' + l.size : ''].filter(Boolean).join(' · ');
    var qty = el('div', { cls: 'seed-qty', role: 'group', 'aria-label': 'Quantity for ' + l.name }, [
      el('button', { type: 'button', 'data-dec': l.key, 'aria-label': 'One fewer', text: '−' }),
      el('span', { cls: 'seed-qty-n', 'aria-live': 'polite', text: String(l.qty) }),
      el('button', { type: 'button', 'data-inc': l.key, 'aria-label': 'One more', text: '+' }),
    ]);
    var li = el('li', { cls: 'seed-cart-line' + (l.unavailable ? ' is-unavailable' : '') }, [
      l.image ? el('img', { src: ROOT + l.image, alt: '', width: '120', height: '120', loading: 'lazy', cls: 'seed-cart-img' }) : null,
      el('div', { cls: 'seed-cart-info' }, [
        el('a', { href: ROOT + (l.url || ''), cls: 'seed-cart-name', text: l.name }),
        meta ? el('p', { cls: 'seed-cart-meta', text: meta }) : null,
        l.preorder ? el('p', { cls: 'seed-cart-pre', text: l.ship_by ? 'Pre-order · ships by ' + fmtDay(l.ship_by) : 'Pre-order · ship-by date set when the window opens' }) : null,
        l.unavailable ? el('p', { cls: 'seed-cart-pre', text: 'No longer available. Please remove it.' }) : null,
        (function () { var a = skuAvail(l.product, l.color, l.size); return a && !l.unavailable ? el('p', { cls: 'seed-cart-avail' + (canSell(a) ? '' : ' is-out'), text: a.text }) : null; })(),
        qty,
        el('button', { type: 'button', cls: 'seed-remove', 'data-remove': l.key, text: 'Remove' }),
      ]),
      el('p', { cls: 'seed-cart-price', text: l.line_cents === null ? 'Price TBA' : money(l.line_cents) }),
    ]);
    list.appendChild(li);
  });
  say(root.querySelector('[data-cart-subtotal]'), s.subtotal_cents === null ? 'Price TBA' : money(s.subtotal_cents));
  var ship = root.querySelector('[data-cart-ship]');
  ship.hidden = !s.notice;
  if (s.notice) ship.textContent = s.notice.text;
  var btn = root.querySelector('[data-checkout]');
  var ready = SEED.checkout === true && s.lines.length && s.subtotal_cents !== null && !s.lines.some(function (l) { return l.unavailable || !canSell(skuAvail(l.product, l.color, l.size)); });
  btn.disabled = !ready;
  say(root.querySelector('[data-checkout-msg]'), ready ? '' : (SEED.checkout ? 'Some items in your bag are not available to buy yet.' : COPY.checkoutOff));
}
function initCart() {
  var root = document.querySelector('[data-cart]');
  if (!root) return;
  root.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    var c = loadCart();
    if (t.hasAttribute('data-remove')) c = removeLine(c, t.getAttribute('data-remove'));
    else if (t.hasAttribute('data-inc')) { var k = t.getAttribute('data-inc'); var l = c.filter(function (x) { return lineKey(x) === k; })[0]; if (l) c = setQty(c, k, l.qty + 1); }
    else if (t.hasAttribute('data-dec')) { var k2 = t.getAttribute('data-dec'); var l2 = c.filter(function (x) { return lineKey(x) === k2; })[0]; if (l2) c = setQty(c, k2, l2.qty - 1); }
    else if (t.hasAttribute('data-checkout')) { checkout(root); return; }
    else return;
    saveCart(c); renderCart(root);
  });
  renderCart(root);
  refreshAvailability(function () { renderCart(root); });
  window.addEventListener('storage', function (e) { if (e.key === KEY) { renderCart(root); paintCount(); } });
}
function checkout(root) {
  var btn = root.querySelector('[data-checkout]');
  var msg = root.querySelector('[data-checkout-msg]');
  if (SEED.checkout !== true) { say(msg, COPY.checkoutOff); return; }
  btn.disabled = true; say(msg, 'Starting checkout…');
  fetch(API + '/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(checkoutBody(SEED.brand.id, loadCart())) })
    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
    .then(function (x) { if (x.ok && x.j.url) { window.location.href = x.j.url; return; } say(msg, x.j.error || 'Checkout is unavailable right now.'); btn.disabled = false; })
    .catch(function () { say(msg, 'Checkout is unavailable right now.'); btn.disabled = false; });
}

// ---------- order lookup ----------
function initLookup() {
  var f = document.querySelector('form[data-lookup]');
  if (!f) return;
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = f.querySelector('.seed-msg');
    if (!f.order.value.trim() || !f.email.value.trim()) { say(msg, 'Enter your order number and email.'); return; }
    fetch(API + '/order-lookup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ order: f.order.value, email: f.email.value }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok) { say(msg, x.j.error || COPY.lookupOff); return; }
        say(msg, 'Status: ' + x.j.status + (x.j.ship_by ? '. Ships by ' + fmtDay(x.j.ship_by) + '.' : '.'));
      })
      .catch(function () { say(msg, COPY.lookupOff); });
  });
}

// ---------- gallery (data-gallery): thumbs, swipe track, dots, counter, arrow keys, zoom ----------
function initGallery() {
  var g = document.querySelector('[data-gallery]'); if (!g) return;
  var track = g.querySelector('[data-gal-track]'); if (!track) return;
  var thumbs = g.querySelectorAll('[data-gal-thumb]'), dots = g.querySelectorAll('[data-gal-dot]');
  var view = g.querySelector('[data-gal-view]'), labels = view ? (view.getAttribute('data-labels') || '').split('|') : [];
  var n = track.children.length;
  var at = function () { return Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); };
  var go = function (i) { track.scrollTo({ left: i * track.clientWidth }); };
  Array.prototype.forEach.call(thumbs, function (b) { b.addEventListener('click', function () { go(+b.getAttribute('data-gal-thumb')); }); });
  track.addEventListener('scroll', function () {
    var i = at();
    Array.prototype.forEach.call(thumbs, function (b, j) { b.setAttribute('aria-current', String(i === j)); });
    Array.prototype.forEach.call(dots, function (d, j) { d.setAttribute('aria-current', String(i === j)); });
    if (view) view.textContent = (labels[i] || '') + ' · ' + (i + 1) + ' / ' + n;
  }, { passive: true });
  var zoom = document.querySelector('[data-zoom]');
  var close = function () { if (zoom) zoom.removeAttribute('open'); };
  document.addEventListener('keydown', function (e) {
    if (zoom && zoom.hasAttribute('open')) { if (e.key === 'Escape') close(); return; }
    if (/input|textarea|select/i.test((e.target && e.target.tagName) || '')) return;
    if (e.key === 'ArrowRight') go(Math.min(at() + 1, n - 1));
    if (e.key === 'ArrowLeft') go(Math.max(at() - 1, 0));
  });
  if (zoom) {
    track.addEventListener('click', function (e) {
      var fg = e.target.closest('figure'); if (!fg) return;
      var im = zoom.querySelector('img'); im.src = fg.getAttribute('data-full'); im.alt = (fg.querySelector('img') || {}).alt || '';
      zoom.setAttribute('open', '');
    });
    zoom.addEventListener('click', close);
  }
}
// ---------- filter bar (data-filter): buttons data-k, cards data-group, count ----------
function initFilter() {
  var f = document.querySelector('[data-filter]'), grid = document.querySelector('[data-filter-grid]'); if (!f || !grid) return;
  var count = document.querySelector('[data-filter-count]');
  f.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    Array.prototype.forEach.call(f.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    var k = b.getAttribute('data-k'), n = 0;
    Array.prototype.forEach.call(grid.children, function (c) { var on = k === 'all' || c.getAttribute('data-group') === k; c.hidden = !on; if (on) n++; });
    if (count) count.textContent = n + ' ' + count.getAttribute(n === 1 ? 'data-one' : 'data-many');
  });
}
// ---------- mobile action bar (data-mbar): shows once the state block (#buy) scrolls off the top ----------
function initMbar() {
  var bar = document.querySelector('[data-mbar]'), buy = document.getElementById('buy');
  if (!bar || !buy || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(function (en) { bar.classList.toggle('show', !en[0].isIntersecting && en[0].boundingClientRect.top < 0); }).observe(buy);
}

function init() { initColors(); initMenu(); initAdd(); if (document.querySelector('form[data-add]')) refreshAvailability(function () { document.querySelectorAll('form[data-add]').forEach(paintAvail); }); initNotify(); initGallery(); initFilter(); initMbar(); initCart(); initLookup(); paintCount(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
