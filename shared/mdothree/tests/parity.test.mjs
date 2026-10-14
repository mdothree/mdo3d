// The shared MDOThree client files must be identical on every surface. This repo holds the canonical copy
// (shared/mdothree/) plus two surfaces (mdothree-json, mdothree.com landing); the other 8 tool repos pin the
// same sha256 in their tests/shared-parity.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const shared = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(shared, '..', '..');
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const pinned = JSON.parse(readFileSync(path.join(shared, 'SHARED_HASHES.json'), 'utf8'));
const SURFACES = ['projects/mdothree/mdothree-json', 'projects/mdothree/landing'];

for (const file of ['auth-ui.js', 'pro-api.js']) {
  test(`${file}: canonical matches the pinned hash`, () => {
    assert.equal(sha(path.join(shared, file)), pinned[file]);
  });
  for (const s of SURFACES) {
    test(`${file}: ${s} copy is identical to shared/mdothree/${file}`, () => {
      assert.equal(sha(path.join(repo, s, 'public/js', file)), pinned[file]);
    });
  }
}

test('auth-nav adapters: json copy matches shared/mdothree/auth-nav.firebase.js', () => {
  assert.equal(sha(path.join(repo, 'projects/mdothree/mdothree-json/public/js/auth-nav.js')),
    sha(path.join(shared, 'auth-nav.firebase.js')));
});
