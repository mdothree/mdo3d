// Firestore rules tests for mdo3d-utilities (shared/utilities/firestore.rules,
// mirrored in projects/mdothree/mdothree-api/firestore.rules).
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';

const RULES = new URL('../utilities/firestore.rules', import.meta.url);
const MIRROR = new URL('../../projects/mdothree/mdothree-api/firestore.rules', import.meta.url);
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-utilities', firestore: { rules: fs.readFileSync(RULES, 'utf8') } });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const user = (uid, provider = 'password') => env.authenticatedContext(uid, { firebase: { sign_in_provider: provider } }).firestore();
const seed = (p, d) => env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), p), d));

test('mdothree-api copy is identical to shared/utilities', () => {
  assert.equal(fs.readFileSync(MIRROR, 'utf8'), fs.readFileSync(RULES, 'utf8'));
});

test('subscriptions: owner (incl. anonymous guest) reads own; no client can write/self-grant Pro', async () => {
  await seed('subscriptions/u1', { isPro: true, status: 'active' });
  await assertSucceeds(getDoc(doc(user('u1'), 'subscriptions/u1')));
  await assertSucceeds(getDoc(doc(user('g1', 'anonymous'), 'subscriptions/g1')));
  await assertFails(getDoc(doc(user('u2'), 'subscriptions/u1')));
  await assertFails(setDoc(doc(user('g1', 'anonymous'), 'subscriptions/g1'), { isPro: true, status: 'active' }));
  await assertFails(setDoc(doc(user('u1'), 'subscriptions/u1'), { status: 'active', expiresAt: new Date(2100, 0) }, { merge: true }));
  await assertFails(updateDoc(doc(user('u1'), 'subscriptions/u1'), { isPro: true }));
});

test('users: read own, no writes', async () => {
  await assertSucceeds(getDoc(doc(user('u1'), 'users/u1')));
  await assertFails(setDoc(doc(user('u1'), 'users/u1'), { isPremium: true }));
});

test('legacy input collections: no new writes; owner can read and delete old data', async () => {
  const db = user('u1', 'anonymous');
  for (const c of ['history', 'hash_history', 'hash_favourites', 'password_history', 'color_palettes', 'timestamp_conversions', 'timestamp_presets']) {
    await assertFails(addDoc(collection(db, c), { uid: 'u1', createdAt: serverTimestamp(), input: 'x', password: 'x', length: 1, algo: 'a', hash: 'h', name: 'n', colors: [], type: 'unix', fromTz: 'a', toTz: 'b' }));
    await seed(`${c}/old1`, { uid: 'u1', input: 'secret' });
    await assertFails(getDoc(doc(user('u2'), `${c}/old1`)));
    await assertFails(updateDoc(doc(db, `${c}/old1`), { input: 'y' }));
    await assertSucceeds(getDoc(doc(db, `${c}/old1`)));
    await assertSucceeds(deleteDoc(doc(db, `${c}/old1`)));
  }
  await assertFails(setDoc(doc(db, 'color_recents/u1'), { colors: [] }));
});

test('server-only and unknown collections are denied', async () => {
  const db = user('u1');
  for (const p of ['analytics_events/x', 'analytics_daily/x', 'portal_sessions/x', 'mdothree-pdf_documents/x', 'anything/x']) {
    await assertFails(setDoc(doc(db, p), { uid: 'u1' }));
    await assertFails(getDoc(doc(db, p)));
  }
});
