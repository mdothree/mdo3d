// node --test shared/mdothree/tests/   (no npm install, no network: Firebase Auth and the DOM are stubbed)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  emailSignUp, emailSignIn, sendReset, googleSignIn, validateCredentials, authErrorMessage,
  googleSignInEnabled, openAuthDialog, AuthUiError, AUTH_MESSAGES, MIN_PASSWORD,
} from '../auth-ui.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// ── Firebase Auth stub ──────────────────────────────────────────────────────
function fbError(code) { const e = new Error('Firebase: raw sdk text (' + code + ')'); e.code = code; return e; }
function makeSdk(behaviour = {}) {
  const calls = [];
  const sdk = {
    calls,
    EmailAuthProvider: { credential: (email, password) => ({ kind: 'email', email, password }) },
    GoogleAuthProvider: class { static credentialFromError(e) { return e.credential || null; } },
    browserPopupRedirectResolver: { resolver: true },
    async linkWithCredential(user, cred) {
      calls.push(['linkWithCredential', user.uid, cred.email]);
      if (behaviour.link) throw fbError(behaviour.link);
      return { user: { ...user, isAnonymous: false, email: cred.email } };
    },
    async createUserWithEmailAndPassword(auth, email) {
      calls.push(['createUser', email]);
      if (behaviour.create) throw fbError(behaviour.create);
      return { user: { uid: 'new-uid', isAnonymous: false, email } };
    },
    async signInWithEmailAndPassword(auth, email) {
      calls.push(['signIn', email]);
      if (behaviour.signIn) throw fbError(behaviour.signIn);
      return { user: { uid: 'existing-uid', isAnonymous: false, email } };
    },
    async sendPasswordResetEmail(auth, email, settings) {
      calls.push(['reset', email, settings ? settings.url : null]);
      const err = typeof behaviour.reset === 'function' ? behaviour.reset(settings) : behaviour.reset;
      if (err) throw fbError(err);
    },
    async linkWithPopup(user, provider, resolver) {
      calls.push(['linkWithPopup', user.uid, !!resolver]);
      if (behaviour.linkPopup) { const e = fbError(behaviour.linkPopup); e.credential = { kind: 'google' }; throw e; }
      return { user: { ...user, isAnonymous: false } };
    },
    async signInWithCredential(auth, cred) { calls.push(['signInWithCredential', cred.kind]); return { user: { uid: 'g-uid', isAnonymous: false } }; },
    async signInWithPopup(auth, provider, resolver) {
      calls.push(['signInWithPopup', !!resolver]);
      if (behaviour.popup) throw fbError(behaviour.popup);
      return { user: { uid: 'g-uid', isAnonymous: false } };
    },
  };
  return sdk;
}
const guestAuth = () => ({ currentUser: { uid: 'anon-uid', isAnonymous: true } });
const emptyAuth = () => ({ currentUser: null });

// ── Actions ─────────────────────────────────────────────────────────────────
test('sign-up links the anonymous guest (same uid, history carries over)', async () => {
  const sdk = makeSdk();
  const out = await emailSignUp(sdk, guestAuth(), ' a@b.co ', 'longenough');
  assert.equal(out.linked, true);
  assert.equal(out.user.uid, 'anon-uid');
  assert.equal(out.user.isAnonymous, false);
  assert.deepEqual(sdk.calls, [['linkWithCredential', 'anon-uid', 'a@b.co']]);
});

test('sign-up without a guest creates a new account', async () => {
  const sdk = makeSdk();
  const out = await emailSignUp(sdk, emptyAuth(), 'a@b.co', 'longenough');
  assert.equal(out.linked, false);
  assert.deepEqual(sdk.calls, [['createUser', 'a@b.co']]);
});

test('sign-up: email already used -> honest message, never the raw SDK text', async () => {
  for (const code of ['auth/email-already-in-use', 'auth/credential-already-in-use']) {
    const sdk = makeSdk({ link: code });
    await assert.rejects(emailSignUp(sdk, guestAuth(), 'a@b.co', 'longenough'), e => {
      assert.ok(e instanceof AuthUiError);
      assert.equal(e.message, 'An account with this email already exists. Sign in instead.');
      assert.ok(!/Firebase|raw sdk/.test(e.message));
      return true;
    });
  }
});

test('sign-up validates before any network call', async () => {
  const sdk = makeSdk();
  await assert.rejects(emailSignUp(sdk, emptyAuth(), 'not-an-email', 'longenough'), { code: 'auth/invalid-email' });
  await assert.rejects(emailSignUp(sdk, emptyAuth(), 'a@b.co', 'x'.repeat(MIN_PASSWORD - 1)), { code: 'auth/weak-password' });
  await assert.rejects(emailSignUp(sdk, emptyAuth(), '', 'longenough'), { code: 'auth/missing-email' });
  assert.equal(sdk.calls.length, 0);
});

test('sign-in maps wrong-password / user-not-found / invalid-credential to one message', async () => {
  for (const code of ['auth/wrong-password', 'auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials']) {
    await assert.rejects(emailSignIn(makeSdk({ signIn: code }), emptyAuth(), 'a@b.co', 'pw'),
      e => e.message === 'Email or password is incorrect.');
  }
  const ok = await emailSignIn(makeSdk(), guestAuth(), 'a@b.co', 'pw');
  assert.equal(ok.user.uid, 'existing-uid');
});

test('provider disabled on the project (today) -> honest "not available yet"', async () => {
  await assert.rejects(emailSignIn(makeSdk({ signIn: 'auth/operation-not-allowed' }), emptyAuth(), 'a@b.co', 'pw'),
    e => /isn't available yet/.test(e.message) && /Nothing was changed/.test(e.message));
});

test('reset never reveals whether an account exists', async () => {
  const sdk = makeSdk({ reset: 'auth/user-not-found' });
  assert.equal(await sendReset(sdk, emptyAuth(), 'nobody@b.co'), true);
  assert.equal(await sendReset(makeSdk(), emptyAuth(), 'a@b.co', 'https://hash.mdothree.com/'), true);
});

test('reset falls back to the plain email when the continue URL is not authorized', async () => {
  const sdk = makeSdk({ reset: s => (s ? 'auth/unauthorized-continue-uri' : null) });
  assert.equal(await sendReset(sdk, emptyAuth(), 'a@b.co', 'https://preview.vercel.app/'), true);
  assert.deepEqual(sdk.calls.map(c => c[2]), ['https://preview.vercel.app/', null]);
});

test('reset surfaces real failures (rate limit) honestly', async () => {
  await assert.rejects(sendReset(makeSdk({ reset: 'auth/too-many-requests' }), emptyAuth(), 'a@b.co'),
    e => /Too many attempts/.test(e.message));
});

test('google: links a guest; already-linked Google account signs in; popup uses the resolver', async () => {
  const a = makeSdk();
  assert.equal((await googleSignIn(a, guestAuth())).linked, true);
  assert.deepEqual(a.calls, [['linkWithPopup', 'anon-uid', true]]);
  const b = makeSdk({ linkPopup: 'auth/credential-already-in-use' });
  const out = await googleSignIn(b, guestAuth());
  assert.equal(out.linked, false);
  assert.deepEqual(b.calls.map(c => c[0]), ['linkWithPopup', 'signInWithCredential']);
  const c = makeSdk();
  await googleSignIn(c, emptyAuth());
  assert.deepEqual(c.calls, [['signInWithPopup', true]]);
  await assert.rejects(googleSignIn(makeSdk({ popup: 'auth/popup-blocked' }), emptyAuth()), e => /blocked/.test(e.message));
});

test('google sign-in is off unless configured', () => {
  assert.equal(googleSignInEnabled(undefined), false);
  assert.equal(googleSignInEnabled({ document: { querySelector: () => null } }), false);
  assert.equal(googleSignInEnabled({ __ENV__: { GOOGLE_SIGN_IN: 'true' } }), true);
  assert.equal(googleSignInEnabled({ __CONFIG: { googleSignIn: true } }), true);
  const meta = (name, content) => ({ document: { querySelector: s => (s.includes(name) ? { getAttribute: () => content } : null) } });
  assert.equal(googleSignInEnabled(meta('env-GOOGLE_SIGN_IN', 'true')), true);
  assert.equal(googleSignInEnabled(meta('firebase-config', '{"googleSignIn":true}')), true);
  assert.equal(googleSignInEnabled(meta('firebase-config', '{"apiKey":"x"}')), false);
});

test('validateCredentials and unknown errors', () => {
  assert.equal(validateCredentials('a@b.co', 'longenough', { creating: true, confirm: 'other' }), 'mdo/password-mismatch');
  assert.equal(validateCredentials('a@b.co', 'longenough', { creating: true, confirm: 'longenough' }), '');
  assert.equal(validateCredentials('a@b.co'), '');
  assert.equal(authErrorMessage({ code: 'auth/something-new' }), AUTH_MESSAGES['mdo/unknown']);
  assert.equal(authErrorMessage(null), AUTH_MESSAGES['mdo/unknown']);
});

test('copy: no "free", no *.99 prices, no raw innerHTML', () => {
  const src = readFileSync(path.join(here, '..', 'auth-ui.js'), 'utf8');
  assert.ok(!/\bfree\b/i.test(src), 'no "free" wording');
  assert.ok(!/\.99\b/.test(src), 'no *.99 prices');
  assert.ok(!/innerHTML/.test(src.replace(/^\/\/.*$/gm, '')), 'no innerHTML');
  assert.ok(!/^\s*import\s/m.test(src), 'no static imports: Firebase stays lazy');
});

// ── Dialog (minimal fake DOM) ───────────────────────────────────────────────
class FakeEl {
  constructor(doc, tag) { this.ownerDocument = doc; this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.listeners = {}; this.hidden = false; this.disabled = false; this._text = ''; this.value = ''; this.parent = null; this.offsetParent = {}; const cl = new Set(); this.classList = { add: c => cl.add(c), remove: c => cl.delete(c), toggle: (c, on) => (on ? cl.add(c) : cl.delete(c)), contains: c => cl.has(c) }; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  removeAttribute(k) { delete this.attrs[k]; }
  append(...nodes) { for (const n of nodes) { const c = typeof n === 'string' ? Object.assign(new FakeEl(this.ownerDocument, '#text'), { _text: n }) : n; c.parent = this; this.children.push(c); } }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); this.parent = null; }
  get isConnected() { let n = this; while (n.parent) n = n.parent; return n === this.ownerDocument.root; }
  set textContent(t) { this._text = String(t); this.children = []; }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  dispatch(t, extra = {}) { const ev = { type: t, target: this, preventDefault() {}, ...extra }; (this.listeners[t] || []).forEach(fn => fn(ev)); return ev; }
  click() { this.dispatch('click'); }
  focus() { this.ownerDocument.activeElement = this; }
  all() { return this.children.flatMap(c => [c, ...c.all()]); }
  querySelectorAll(sel) { const tags = sel.split(',').map(s => s.trim().split('[')[0].toUpperCase()); return this.all().filter(n => tags.includes(n.tagName)); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}
function fakeDoc() {
  const doc = { listeners: {}, activeElement: null };
  doc.root = new FakeEl(doc, 'html');
  doc.head = new FakeEl(doc, 'head'); doc.body = new FakeEl(doc, 'body');
  doc.root.append(doc.head, doc.body);
  doc.createElement = t => new FakeEl(doc, t);
  doc.getElementById = id => doc.root.all().find(n => n.id === id) || null;
  doc.addEventListener = (t, fn) => { (doc.listeners[t] ||= []).push(fn); };
  doc.removeEventListener = (t, fn) => { doc.listeners[t] = (doc.listeners[t] || []).filter(f => f !== fn); };
  doc.key = key => (doc.listeners.keydown || []).forEach(fn => fn({ key, preventDefault() {} }));
  return doc;
}
const tick = () => new Promise(r => setTimeout(r, 0));
const byText = (doc, text) => doc.root.all().find(n => n.tagName === 'BUTTON' && n.textContent === text && !n.hidden);

test('dialog: create account as a guest links the guest and resolves the user', async () => {
  const doc = fakeDoc();
  const sdk = makeSdk();
  const auth = guestAuth();
  const p = openAuthDialog({ doc, getAuth: async () => auth, loadSdk: async () => sdk, google: false });
  await tick();
  assert.ok(doc.getElementById('mdo-auth-styles'), 'styles injected');
  assert.equal(doc.getElementById('mdo-auth-title').textContent, 'Sign in');
  assert.ok(/does not move history/.test(doc.root.all().find(n => n.attrs.class === 'mdo-auth-note').textContent));
  byText(doc, 'Create an account').click();
  assert.equal(doc.getElementById('mdo-auth-title').textContent, 'Create your mdothree account');
  assert.equal(doc.root.all().find(n => n.attrs.class === 'mdo-auth-note').textContent, 'History saved in this browser moves to your new account.');
  doc.getElementById('mdo-auth-email').value = 'new@b.co';
  doc.getElementById('mdo-auth-password').value = 'longenough';
  doc.getElementById('mdo-auth-password2').value = 'mismatch!';
  doc.root.all().find(n => n.tagName === 'FORM').dispatch('submit');
  await tick();
  assert.equal(doc.root.all().find(n => n.attrs.class === 'mdo-auth-msg').textContent, "The two passwords don't match.");
  assert.equal(sdk.calls.length, 0);
  doc.getElementById('mdo-auth-password2').value = 'longenough';
  doc.root.all().find(n => n.tagName === 'FORM').dispatch('submit');
  const user = await p;
  assert.equal(user.uid, 'anon-uid');
  assert.equal(user.isAnonymous, false);
  assert.deepEqual(sdk.calls, [['linkWithCredential', 'anon-uid', 'new@b.co']]);
  assert.equal(doc.getElementById('mdo-auth-overlay'), null, 'dialog removed');
});

test('dialog: wrong password shows the honest message and stays open; Escape resolves null', async () => {
  const doc = fakeDoc();
  const p = openAuthDialog({ doc, getAuth: async () => emptyAuth(), loadSdk: async () => makeSdk({ signIn: 'auth/wrong-password' }), google: false });
  await tick();
  doc.getElementById('mdo-auth-email').value = 'a@b.co';
  doc.getElementById('mdo-auth-password').value = 'pw';
  doc.root.all().find(n => n.tagName === 'FORM').dispatch('submit');
  await tick(); await tick();
  assert.equal(doc.root.all().find(n => n.attrs.class === 'mdo-auth-msg').textContent, 'Email or password is incorrect.');
  assert.ok(doc.getElementById('mdo-auth-overlay'));
  doc.key('Escape');
  assert.equal(await p, null);
});

test('dialog: reset view shows the neutral confirmation; Google button only when enabled', async () => {
  const doc = fakeDoc();
  const sdk = makeSdk({ reset: 'auth/user-not-found' });
  const p = openAuthDialog({ doc, getAuth: async () => emptyAuth(), loadSdk: async () => sdk, google: false });
  await tick();
  assert.equal(byText(doc, 'Continue with Google'), undefined);
  byText(doc, 'Forgot password?').click();
  assert.equal(doc.getElementById('mdo-auth-title').textContent, 'Reset your password');
  assert.equal(doc.getElementById('mdo-auth-password').hidden, true);
  doc.getElementById('mdo-auth-email').value = 'nobody@b.co';
  doc.root.all().find(n => n.tagName === 'FORM').dispatch('submit');
  await tick(); await tick();
  assert.ok(/If an account exists for that email/.test(doc.root.all().find(n => (n.attrs.class || '').startsWith('mdo-auth-msg')).textContent));
  doc.key('Escape');
  assert.equal(await p, null);

  const doc2 = fakeDoc();
  const sdk2 = makeSdk();
  const p2 = openAuthDialog({ doc: doc2, getAuth: async () => guestAuth(), loadSdk: async () => sdk2, google: true });
  await tick();
  byText(doc2, 'Continue with Google').click();
  const u = await p2;
  assert.equal(u.uid, 'anon-uid');
  assert.deepEqual(sdk2.calls[0], ['linkWithPopup', 'anon-uid', true]);
});

test('dialog: SDK that cannot load gives an honest message, no crash', async () => {
  const doc = fakeDoc();
  const p = openAuthDialog({ doc, getAuth: async () => null, loadSdk: async () => { throw new Error('blocked'); }, google: false });
  await tick();
  doc.getElementById('mdo-auth-email').value = 'a@b.co';
  doc.getElementById('mdo-auth-password').value = 'pw';
  doc.root.all().find(n => n.tagName === 'FORM').dispatch('submit');
  await tick(); await tick();
  assert.equal(doc.root.all().find(n => n.attrs.class === 'mdo-auth-msg').textContent, AUTH_MESSAGES['mdo/sdk-unavailable']);
  doc.key('Escape');
  assert.equal(await p, null);
});
