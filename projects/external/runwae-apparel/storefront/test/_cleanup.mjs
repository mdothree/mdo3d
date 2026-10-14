// Test temp hygiene: every test file builds sites into os.tmpdir(). Point TMPDIR at one folder per run and remove
// it at exit, so repeated runs can't fill the disk (2026-10-14: ~900 MB of leftover builds filled the laptop).
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const run = mkdtempSync(join(tmpdir(), 'sf-run-'));
process.env.TMPDIR = run;
process.on('exit', () => rmSync(run, { recursive: true, force: true }));
