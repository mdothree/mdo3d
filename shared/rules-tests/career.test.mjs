// Firestore rules tests for mdo3d-career (shared/career/firestore.rules).
// Run: see README.md in this folder (firebase emulators:exec + node --test).
import { test, before, after, beforeEach } from 'node:test';
import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

let env;
const RULES = new URL('../career/firestore.rules', import.meta.url);

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-career',
    firestore: { rules: fs.readFileSync(RULES, 'utf8') },
  });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const alice = () => env.authenticatedContext('alice', { firebase: { sign_in_provider: 'password' } }).firestore();
const bob = () => env.authenticatedContext('bob').firestore();
const anon = () => env.unauthenticatedContext().firestore();
const seed = async (path, data) => env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), path), data));
const base = (uid = 'alice') => ({ userId: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

test('tool output: owner can create with expected shape (all 7 collections)', async () => {
  const db = alice();
  await assertSucceeds(addDoc(collection(db, 'resume-analyses'), { ...base(), score: 80, jobSnippet: 'jd', resumeSnippet: 'r' }));
  await assertSucceeds(addDoc(collection(db, 'resume-analyses'), { ...base(), score: null, jobSnippet: '', resumeSnippet: '' }));
  await assertSucceeds(addDoc(collection(db, 'cover-letters'), { ...base(), content: 'Dear…', jobSnippet: 'jd' }));
  await assertSucceeds(addDoc(collection(db, 'interview-sessions'), { ...base(), role: 'dev', type: 'behavioral', questions: ['q1'], scores: [7, null], skipped: 0, avgScore: 7 }));
  await assertSucceeds(addDoc(collection(db, 'linkedin-optimizations'), { ...base(), targetRole: 'pm', optimized: { headline: 'x' } }));
  await assertSucceeds(addDoc(collection(db, 'networking-emails'), { ...base(), type: 'cold', recipientName: 'A', subject: 's', body: 'b' }));
  await assertSucceeds(addDoc(collection(db, 'portfolio-reviews'), { ...base(), portfolioUrl: 'https://x', targetRole: 'r', review: { score: 1 } }));
  await assertSucceeds(addDoc(collection(db, 'salary-strategies'), { ...base(), jobTitle: 't', offeredSalary: '100k', strategy: { a: 1 } }));
});

test('tool output: rejects other owner, extra keys, client timestamps, oversize, unauthenticated', async () => {
  await assertFails(addDoc(collection(alice(), 'cover-letters'), { ...base('bob'), content: 'x' }));
  await assertFails(addDoc(collection(alice(), 'cover-letters'), { ...base(), content: 'x', plan: 'pro' }));
  await assertFails(addDoc(collection(alice(), 'cover-letters'), { userId: 'alice', content: 'x', createdAt: new Date(0), updatedAt: new Date(0) }));
  await assertFails(addDoc(collection(alice(), 'cover-letters'), { ...base(), content: 'x'.repeat(20001) }));
  await assertFails(addDoc(collection(alice(), 'linkedin-optimizations'), { ...base(), optimized: 'not-a-map' }));
  await assertFails(addDoc(collection(anon(), 'cover-letters'), { ...base(), content: 'x' }));
});

test('tool output: owner reads/deletes own, cannot read others, cannot update', async () => {
  await seed('cover-letters/a1', { userId: 'alice', content: 'x' });
  await assertSucceeds(getDoc(doc(alice(), 'cover-letters/a1')));
  await assertFails(getDoc(doc(bob(), 'cover-letters/a1')));
  await assertFails(updateDoc(doc(alice(), 'cover-letters/a1'), { content: 'y' }));
  await assertFails(deleteDoc(doc(bob(), 'cover-letters/a1')));
  await assertSucceeds(deleteDoc(doc(alice(), 'cover-letters/a1')));
});

test('history query (getUserDocs) is allowed only for own userId', async () => {
  await seed('resume-analyses/a1', { userId: 'alice', createdAt: new Date() });
  await seed('resume-analyses/b1', { userId: 'bob', createdAt: new Date() });
  const own = query(collection(alice(), 'resume-analyses'), where('userId', '==', 'alice'), orderBy('createdAt', 'desc'), limit(20));
  await assertSucceeds(getDocs(own));
  await assertFails(getDocs(query(collection(alice(), 'resume-analyses'), where('userId', '==', 'bob'))));
  await assertFails(getDocs(collection(alice(), 'resume-analyses')));
});

test('subscriptions: owner reads (even when missing); nobody writes', async () => {
  await assertSucceeds(getDoc(doc(alice(), 'subscriptions/alice')));
  await seed('subscriptions/alice', { plan: 'pro', status: 'active' });
  await assertSucceeds(getDoc(doc(alice(), 'subscriptions/alice')));
  await assertFails(getDoc(doc(bob(), 'subscriptions/alice')));
  await assertFails(setDoc(doc(alice(), 'subscriptions/alice'), { plan: 'pro', status: 'active' }));
  await assertFails(setDoc(doc(bob(), 'subscriptions/bob'), { plan: 'team' }));
  await assertFails(updateDoc(doc(alice(), 'subscriptions/alice'), { plan: 'team' }));
});

test('usage: owner reads own month doc; no client writes', async () => {
  await assertSucceeds(getDoc(doc(alice(), 'usage/alice_2026-10')));
  await assertFails(getDoc(doc(alice(), 'usage/bob_2026-10')));
  await assertFails(getDoc(doc(alice(), 'usage/alice_evil')));
  await assertFails(setDoc(doc(alice(), 'usage/alice_2026-10'), { analyses: 0 }));
  await seed('usage/alice_2026-10', { analyses: 3 });
  await assertFails(updateDoc(doc(alice(), 'usage/alice_2026-10'), { analyses: 0 }));
  await assertFails(deleteDoc(doc(alice(), 'usage/alice_2026-10')));
});

test('payment_events and users: no client writes', async () => {
  await assertFails(addDoc(collection(alice(), 'payment_events'), { userId: 'alice', type: 'subscription_created' }));
  await seed('payment_events/evt_1', { userId: 'alice', type: 'x' });
  await assertSucceeds(getDoc(doc(alice(), 'payment_events/evt_1')));
  await assertFails(getDoc(doc(bob(), 'payment_events/evt_1')));
  await assertFails(setDoc(doc(alice(), 'users/alice'), { isPremium: true }));
  await assertSucceeds(getDoc(doc(alice(), 'users/alice')));
});

test('default deny for unknown collections (incl. legacy *_documents)', async () => {
  await assertFails(setDoc(doc(alice(), 'resume_documents/x'), { uid: 'alice' }));
  await assertFails(getDoc(doc(alice(), 'anything/x')));
});
