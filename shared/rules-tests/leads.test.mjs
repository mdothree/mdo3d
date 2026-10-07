// Firestore rules tests for mdo3d-leads (shared/leads/firestore.rules,
// mirrored in projects/ronnascanner/resume-analyzer/firestore.rules).
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, addDoc, updateDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

const RULES = new URL('../leads/firestore.rules', import.meta.url);
const MIRROR = new URL('../../projects/ronnascanner/resume-analyzer/firestore.rules', import.meta.url);
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-leads', firestore: { rules: fs.readFileSync(RULES, 'utf8') } });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const user = uid => env.authenticatedContext(uid).firestore();
const nobody = () => env.unauthenticatedContext().firestore();
const seed = (p, d) => env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), p), d));
const base = uid => ({ userId: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

test('resume-analyzer copy is identical to shared/leads', () => {
  assert.equal(fs.readFileSync(MIRROR, 'utf8'), fs.readFileSync(RULES, 'utf8'));
});

test('resume-analyzer anonymous capture: exact shapes only', async () => {
  await assertSucceeds(addDoc(collection(nobody(), 'leads'), { email: 'a@b.co', score: 72, timestamp: new Date(), source: 'free_tier' }));
  await assertFails(addDoc(collection(nobody(), 'leads'), { email: 'a@b.co', extra: 1 }));
  await assertSucceeds(addDoc(collection(nobody(), 'analytics'), { event: 'share', score: 72, timestamp: new Date(), platform: 'resume_analyzer' }));
  await assertFails(addDoc(collection(nobody(), 'analytics'), { event: 'share', score: 72, timestamp: new Date(), platform: 'resume_analyzer', junk: 'x'.repeat(1000) }));
  await assertFails(addDoc(collection(nobody(), 'analytics'), { anything: true }));
  await assertFails(getDocs(collection(nobody(), 'analytics')));
});

test('ronnascanner saved results: owner create/read, others denied', async () => {
  const a = user('alice');
  await assertSucceeds(addDoc(collection(a, 'lead-lists'), { ...base('alice'), name: 'x', count: 1, leads: [{}], query: { industry: 'a' } }));
  await assertSucceeds(addDoc(collection(a, 'email-results'), { ...base('alice'), results: [], count: 0 }));
  await assertSucceeds(addDoc(collection(a, 'saved-contacts'), { ...base('alice'), contacts: [], company: 'c' }));
  await assertSucceeds(addDoc(collection(a, 'company-profiles'), { ...base('alice'), profile: {}, name: 'n' }));
  await assertSucceeds(addDoc(collection(a, 'prospect-profiles'), { ...base('alice'), profile: {}, company: 'c' }));
  await assertFails(addDoc(collection(a, 'lead-lists'), { ...base('bob'), name: 'x' }));
  await assertFails(addDoc(collection(a, 'lead-lists'), { ...base('alice'), name: 'x', isPro: true }));
  await assertFails(addDoc(collection(a, 'lead-lists'), { ...base('alice'), leads: new Array(101).fill(1) }));
  await seed('lead-lists/l1', { userId: 'alice', name: 'x', createdAt: new Date() });
  await assertSucceeds(getDocs(query(collection(a, 'lead-lists'), where('userId', '==', 'alice'))));
  await assertFails(getDoc(doc(user('bob'), 'lead-lists/l1')));
  await assertFails(updateDoc(doc(a, 'lead-lists/l1'), { name: 'y' }));
});

test('entitlement / usage / billing docs are server-only', async () => {
  const a = user('alice');
  await assertSucceeds(getDoc(doc(a, 'subscriptions/alice')));
  await assertFails(setDoc(doc(a, 'subscriptions/alice'), { plan: 'pro' }));
  await assertSucceeds(getDoc(doc(a, 'usage/alice_2026-10')));
  await assertFails(setDoc(doc(a, 'usage/alice_2026-10'), { scans: 0 }));
  await assertFails(getDoc(doc(a, 'usage/bob_2026-10')));
  await assertFails(addDoc(collection(a, 'payment_events'), { userId: 'alice' }));
  await assertFails(addDoc(collection(a, 'payments'), { userId: 'alice' }));
  await assertFails(setDoc(doc(a, 'users/alice'), { plan: 'pro' }));
  await assertFails(addDoc(collection(a, 'analyses'), { userId: 'bob' }));
  await assertSucceeds(addDoc(collection(a, 'analyses'), { userId: 'alice' }));
});
