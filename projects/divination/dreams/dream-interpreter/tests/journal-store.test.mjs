import test from 'node:test';
import assert from 'node:assert/strict';
import { readJournal, addEntry, removeEntry } from '../public/js/journal-store.js';

const makeStorage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) }; };

test('a stale tab adding an entry keeps entries added by another tab', () => {
  const ls = makeStorage();
  const tabA = addEntry(ls, { id: 1, dream: 'a' }).list;        // tab A loaded [1]
  addEntry(ls, { id: 2, dream: 'b' });                           // tab B adds 2 meanwhile
  const res = addEntry(ls, { id: 3, dream: 'c' }, tabA);         // tab A (stale) adds 3
  assert.deepEqual(res.list.map(e => e.id).sort(), [1, 2, 3]);
  assert.deepEqual(readJournal(ls).map(e => e.id).sort(), [1, 2, 3]);
});

test('a stale tab deleting does not resurrect an entry deleted elsewhere', () => {
  const ls = makeStorage();
  addEntry(ls, { id: 1 }); addEntry(ls, { id: 2 });
  const stale = readJournal(ls);                                 // tab A sees [2,1]
  removeEntry(ls, 1);                                            // tab B deletes 1
  const res = removeEntry(ls, 2, stale);                         // tab A deletes 2 from stale copy
  assert.deepEqual(res.list, []);
  assert.deepEqual(readJournal(ls), []);
});

test('blocked storage reports saved=false but keeps the in-memory result', () => {
  const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const res = addEntry(bad, { id: 9 }, [{ id: 8 }]);
  assert.equal(res.saved, false);
  assert.deepEqual(res.list.map(e => e.id), [9, 8]);
});
