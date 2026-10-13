#!/usr/bin/env node
// Reduces the SSA national baby-name files (names.zip, unzipped) to
// src/names/ssa_top1000_<year>.json. Usage:
//   node scripts/build-ssa-names.mjs <dir-with-yobYYYY.txt> [year]
// Rank = position in SSA's own file order (count desc, then name A-Z), which is
// how SSA ranks its popular-names lists. prevRank = position in the previous
// year's full file (null when the name is absent there).
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('usage: build-ssa-names.mjs <dir> [year]'); process.exit(1); }
const years = fs.readdirSync(dir).map(f => /^yob(\d{4})\.txt$/.exec(f)?.[1]).filter(Boolean).map(Number).sort();
const year = Number(process.argv[3] || years[years.length - 1]);
const prevYear = year - 1;

function read(y) {
  const out = { F: [], M: [] };
  for (const line of fs.readFileSync(path.join(dir, `yob${y}.txt`), 'utf8').split(/\r?\n/)) {
    if (!line) continue;
    const [name, sex, count] = line.split(',');
    out[sex].push([name, Number(count)]);
  }
  for (const s of ['F', 'M']) out[s].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return out;
}

const cur = read(year);
const prev = read(prevYear);
const result = {
  source: 'US Social Security Administration, national baby-name data (names.zip), https://www.ssa.gov/oact/babynames/limits.html. Public domain (US government work).',
  year,
  prevYear,
  format: '[name, births, prevRank|null]; rank = index + 1',
};
for (const s of ['F', 'M']) {
  const prevRank = new Map(prev[s].map(([n], i) => [n, i + 1]));
  result[s] = cur[s].slice(0, 1000).map(([n, c]) => [n, c, prevRank.get(n) ?? null]);
}
const outFile = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'src', 'names', `ssa_top1000_${year}.json`);
fs.writeFileSync(outFile, JSON.stringify(result) + '\n');
console.log(`wrote ${outFile}: ${result.F.length} F, ${result.M.length} M, year ${year}`);
