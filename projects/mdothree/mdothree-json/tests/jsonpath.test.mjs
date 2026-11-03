// CQA-JSONPATH-ZERO-STEP: a zero-step slice must terminate (it ran forever on the UI thread).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mod = fileURLToPath(new URL('../public/js/services/jsonPath.js', import.meta.url));

function run(path) {
  const code = `import(${JSON.stringify(mod)}).then(m => console.log(JSON.stringify(m.queryJSONPath([1,2,3,4,5], ${JSON.stringify(path)}))));`;
  return spawnSync(process.execPath, ['-e', code], { encoding: 'utf8', timeout: 3000, killSignal: 'SIGKILL' });
}

test('zero-step slices terminate and match nothing', () => {
  for (const p of ['$[0:5:0]', '$[::0]', '$[4:0:0]', '$[1:3:0]']) {
    const r = run(p);
    assert.equal(r.error, undefined, `${p} did not terminate: ${r.error && r.error.message}`);
    assert.equal(r.stdout.trim(), '[]', p);
  }
});

test('ordinary and negative-step slices are unchanged', () => {
  assert.equal(run('$[1:4]').stdout.trim(), '[2,3,4]');
  assert.equal(run('$[::2]').stdout.trim(), '[1,3,5]');
  assert.equal(run('$[::-2]').stdout.trim(), '[5,3,1]');
});
