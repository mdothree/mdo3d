// Static check: no pinned payment_method_types in divination checkout code (keeps Stripe Link available).
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['shared/services/stripeService.js', ...fs.readdirSync(root).map(d => `${d}/api/src/services/stripeService.js`)].filter(f => fs.existsSync(path.join(root, f)));
test('no hardcoded payment_method_types', () => {
  assert.ok(files.length >= 10);
  for (const f of files) assert.ok(!/payment_method_types/.test(fs.readFileSync(path.join(root, f), 'utf8')), f);
});
