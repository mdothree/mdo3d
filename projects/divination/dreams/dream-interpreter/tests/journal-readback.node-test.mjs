// CQA-DREAMS-JOURNAL-READBACK. Run (from dream-interpreter): node --test tests/journal-readback.node-test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../public/js/app.js', import.meta.url), 'utf8');
const esc = src.match(/^const escapeHtml = .*$/m)?.[0];
const fn = src.match(/^const journalEntryFullHtml = [\s\S]*?^};$/m)?.[0];

test('journal exposes a full-entry reader', () => {
  assert.ok(fn, 'journalEntryFullHtml is defined in app.js');
  const ctx = {};
  vm.runInNewContext(`${esc}\n${fn}\nthis.f = journalEntryFullHtml;`, ctx);
  const long = 'x'.repeat(400) + ' <script>';
  const html = ctx.f({ dream: long, interpretation: 'Water means <b>change</b>' });
  assert.ok(html.includes('x'.repeat(400)), 'full dream text is present, not the 150 char preview');
  assert.match(html, /Water means &lt;b&gt;change&lt;\/b&gt;/, 'saved interpretation is present and escaped');
  assert.ok(!html.includes('<script>'), 'dream text is escaped');
  assert.equal(ctx.f({ dream: 'short', interpretation: '' }), '', 'nothing extra for short entries without interpretation');
});
