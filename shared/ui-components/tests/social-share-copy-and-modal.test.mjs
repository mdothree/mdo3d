// FS-ORG-09 / FS-ORG-10: Copy Link confirms only after the copy succeeded; every modal close path removes the
// document keydown listener. Runs on node with minimal DOM stubs:  node --test shared/ui-components/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = process.env.SOCIAL_SHARE_SRC || join(here, '..', 'SocialShare.js');
const tmp = mkdtempSync(join(tmpdir(), 'ss-'));
const target = join(tmp, 'SocialShare.mjs');
writeFileSync(target, readFileSync(SRC, 'utf8'));

const listeners = new Map();
const mk = () => {
  const handlers = {};
  const el = {
    handlers, textContent: '', dataset: {}, style: {},
    addEventListener: (t, f) => { (handlers[t] ||= []).push(f); },
    removed: false, remove() { this.removed = true; },
    querySelector: () => mk(), querySelectorAll: () => [],
    appendChild() {}, removeChild() {}, select() {}, set innerHTML(v) {}, get innerHTML() { return ''; },
  };
  return el;
};
let execResult = true;
globalThis.window = { location: { href: 'https://x.test/' } };
globalThis.document = {
  title: 't', head: mk(), body: mk(),
  createElement: () => mk(),
  addEventListener: (t, f) => { if (!listeners.has(t)) listeners.set(t, new Set()); listeners.get(t).add(f); },
  removeEventListener: (t, f) => listeners.get(t)?.delete(f),
  execCommand: () => execResult,
};
const { SocialShare } = await import(target);

test('copyToClipboard returns false when the fallback copy fails (FS-ORG-09)', async () => {
  Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: async () => { throw new Error('denied'); } } }, configurable: true });
  const s = new SocialShare();
  execResult = false;
  assert.equal(await s.copyToClipboard('u'), false);
  execResult = true;
  assert.equal(await s.copyToClipboard('u'), true);
});

test('Copy Link button text is set only after the copy resolved (FS-ORG-09)', async () => {
  Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: async () => { throw new Error('denied'); } } }, configurable: true });
  execResult = false;
  const s = new SocialShare();
  const btn = mk();
  const modal = mk();
  modal.querySelector = (q) => (q === '#share-copy-btn' ? btn : mk());
  modal.querySelectorAll = () => [];
  s.attachShareHandlers(modal, { url: 'u' });
  await Promise.all((btn.handlers.click || []).map((f) => f()));
  assert.ok(!/Copied/.test(btn.textContent), `button claimed success on failed copy: ${btn.textContent}`);
});

test('mouse-closing the modal removes the document keydown listener (FS-ORG-10)', () => {
  listeners.clear();
  const s = new SocialShare();
  const overlay = mk(), closeBtn = mk();
  const modal = mk();
  modal.querySelector = (q) => (q === '.share-modal-overlay' ? overlay : q === '.share-modal-close' ? closeBtn : mk());
  s.createShareModal = () => modal;
  s.showShareModal({ url: 'u' });
  assert.equal(listeners.get('keydown').size, 1);
  overlay.handlers.click[0]();
  assert.equal(listeners.get('keydown').size, 0, 'keydown listener leaked after overlay click');
  s.showShareModal({ url: 'u' });
  closeBtn.handlers.click[closeBtn.handlers.click.length - 1]();
  assert.equal(listeners.get('keydown').size, 0, 'keydown listener leaked after close-button click');
});
