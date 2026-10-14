// js/pages/success.js — mdothree.com/success (Stripe Checkout return page).
// Reads the entitlement; never writes it (see ../success-core.js).
import { COPY, resolveSuccessState } from '../success-core.js';

const $ = (id) => document.getElementById(id);

function render(state) {
  const c = COPY[state] || COPY.unconfirmed;
  const done = state !== 'activating';
  const ok = state === 'active' || state === 'received_elsewhere';
  $('loading').style.display = done ? 'none' : 'block';
  $('success-icon').style.display = done && ok ? 'block' : 'none';
  $('error-icon').style.display = done && !ok ? 'block' : 'none';
  $('title').textContent = c.title;
  $('title').classList.toggle('error', done && !ok);
  $('message').textContent = c.message;
  $('success-actions').style.display = done && ok ? 'block' : 'none';
  $('error-actions').style.display = done && !ok ? 'block' : 'none';
}

// Firebase is imported on demand so a blocked SDK (offline, content blocker) still
// leaves an honest answer on screen instead of a spinner that never stops.
let cfg = null;

function waitForUser(timeoutMs = 6000) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (u) => { if (!settled) { settled = true; resolve(u || null); } };
    setTimeout(() => finish(null), timeoutMs);
    import('../config/config.js').then((m) => {
      cfg = m;
      const unsub = m.onAuthChange((u) => { finish(u); try { unsub(); } catch { /* ignore */ } });
    }).catch(() => finish(null));
  });
}

async function readSubscription(uid) {
  const snap = await cfg.getDoc(cfg.doc(cfg.getDB(), 'subscriptions', uid));
  return snap.exists() ? snap.data() : null;
}

const sessionId = new URLSearchParams(window.location.search).get('session_id');
resolveSuccessState({ sessionId, waitForUser, readSubscription, onUpdate: render })
  .then(render)
  .catch(() => render('unconfirmed'));
