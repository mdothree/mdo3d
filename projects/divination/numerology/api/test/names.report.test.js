// Unit tests for the Baby Name Oracle report (pure, offline).
// Run: node --test test/names.*.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReport, parseReportInput, reportToText, numerology, reduceNumber, letterValue,
  syllables, popularityOf, nameIdeas, siblingSuggestions, cleanName, DATA_YEAR, MAX_IDEAS,
} from '../src/names/report.js';

test('data year is the latest SSA year (2025)', () => {
  assert.equal(DATA_YEAR, 2025);
});

test('Pythagorean letter values and reduction keep master numbers', () => {
  assert.equal(letterValue('A'), 1);
  assert.equal(letterValue('I'), 9);
  assert.equal(letterValue('J'), 1);
  assert.equal(letterValue('Z'), 8);
  assert.equal(reduceNumber(29), 11);
  assert.equal(reduceNumber(38), 11);
  assert.equal(reduceNumber(49), 4);
  assert.equal(reduceNumber(22), 22);
  assert.equal(reduceNumber(33), 33);
  assert.equal(reduceNumber(44), 8);
});

test('numerology of OLIVIA and LIAM (hand-computed)', () => {
  // O6 L3 I9 V4 I9 A1 = 32 -> 5; vowels O I I A = 25 -> 7; consonants L V = 7
  const o = numerology('Olivia');
  assert.deepEqual([o.expression.number, o.expression.letterSum], [5, 32]);
  assert.deepEqual([o.soulUrge.number, o.soulUrge.letterSum], [7, 25]);
  assert.deepEqual([o.personality.number, o.personality.letterSum], [7, 7]);
  // L3 I9 A1 M4 = 17 -> 8; vowels I A = 10 -> 1; consonants L M = 7
  const l = numerology('Liam');
  assert.equal(l.expression.number, 8);
  assert.equal(l.soulUrge.number, 1);
  assert.equal(l.personality.number, 7);
  // punctuation and spaces are ignored
  assert.equal(numerology("Ana-Mae O'Neil").letters, 'ANAMAEONEIL');
});

test('approximate syllables', () => {
  assert.equal(syllables('Olivia'), 4);
  assert.equal(syllables('Liam'), 2);
  assert.equal(syllables('Emma'), 2);
  assert.equal(syllables('Charlotte'), 2);
  assert.equal(syllables('Henry'), 2);
  assert.equal(syllables('Theodore'), 3);
});

test('SSA popularity: rank, births, trend; unranked names say so', () => {
  const [olivia] = popularityOf('olivia');
  assert.equal(olivia.sex, 'F');
  assert.equal(olivia.rank, 1);
  assert.equal(olivia.births, 13544);
  assert.equal(olivia.trend, 'steady');
  const [charlotte] = popularityOf('Charlotte');
  assert.equal(charlotte.rank, 2);
  assert.equal(charlotte.prevRank, 4);
  assert.equal(charlotte.trend, 'rising');
  assert.equal(charlotte.change, 2);
  assert.deepEqual(popularityOf('Zzyzxq'), []);
  const r = buildReport({ name: 'Zzyzxq' });
  assert.match(r.popularity.note, /Not in the SSA top 1000/);
});

test('curated meaning only for curated names; never invented', () => {
  const a = buildReport({ name: 'Olivia' });
  assert.deepEqual(a.meaning, { curated: true, origin: 'Latin', meaning: 'Olive tree' });
  const b = buildReport({ name: 'Nova' });
  assert.equal(b.meaning.curated, false);
  assert.match(b.meaning.note, /not in our curated set/i);
  assert.equal(b.meaning.meaning, undefined);
});

test('full report with surname and siblings is deterministic', () => {
  const input = { name: 'Olivia', surname: 'Butts', siblings: ['Owen', 'Mia'] };
  const r1 = buildReport(input);
  const r2 = buildReport(input);
  assert.deepEqual(r1, r2);
  assert.equal(r1.fullName, 'Olivia Butts');
  assert.equal(r1.initials, 'O.B.');
  assert.ok(r1.numerology.fullName);
  assert.match(r1.numerology.disclaimer, /entertainment/);
  const owen = r1.siblings.checks.find(c => c.name === 'Owen');
  assert.equal(owen.sameInitial, true);
  const mia = r1.siblings.checks.find(c => c.name === 'Mia');
  assert.equal(mia.sameEnding, true); // -ia
  const text = reportToText(r1);
  for (const s of ['MEANING & ORIGIN', 'US POPULARITY', 'NUMEROLOGY', 'SIBLINGS', 'NAME IDEAS', 'Olive tree', 'Social Security']) {
    assert.ok(text.includes(s), `text has ${s}`);
  }
});

test('sibling suggestions: 3 girls + 3 boys, avoiding initials, endings and taken names', () => {
  const s = siblingSuggestions('Olivia', ['Mia']);
  assert.equal(s.filter(x => x.sex === 'F').length, 3);
  assert.equal(s.filter(x => x.sex === 'M').length, 3);
  for (const x of s) {
    assert.notEqual(x.name[0], 'O');
    assert.notEqual(x.name[0], 'M');
    assert.ok(!x.name.toLowerCase().endsWith('ia'));
    assert.ok(!['olivia', 'mia'].includes(x.name.toLowerCase()));
  }
  // Same curated origin (Latin) is listed first when available: Oliver is
  // excluded (same initial), so Ava (Latin, F) leads the girls.
  assert.equal(s.find(x => x.sex === 'F').name, 'Ava');
});

test('name ideas honour filters, cap at 10, origin only within curated set', () => {
  const a = nameIdeas({ sex: 'girl', startsWith: 'A' });
  assert.ok(a.ideas.length > 0 && a.ideas.length <= MAX_IDEAS);
  assert.ok(a.ideas.every(i => i.sex === 'F' && i.name.startsWith('A')));
  const ranks = a.ideas.map(i => i.rank);
  assert.deepEqual(ranks, [...ranks].sort((x, y) => x - y));
  const g = nameIdeas({ origin: 'greek' });
  assert.deepEqual(g.ideas.map(i => i.name).sort(), ['Alexander', 'Lucas', 'Sophia', 'Theodore']);
  assert.ok(g.notes.some(n => /curated/.test(n)));
  const x = nameIdeas({ origin: 'Klingon' });
  assert.ok(x.notes.some(n => /not an origin in our curated set/.test(n)));
  assert.equal(x.filters.origin, null);
  // default ideas (no filters) share the first letter and sex, and skip the name itself
  const r = buildReport({ name: 'Liam' });
  assert.ok(r.ideas.ideas.every(i => i.name.startsWith('L') && i.sex === 'M' && i.name !== 'Liam'));
});

test('input validation', () => {
  assert.equal(cleanName('  oLIVIA  '), 'Olivia');
  assert.equal(cleanName("mary-kate o'neil"), "Mary-Kate O'Neil");
  assert.equal(cleanName('<script>'), null);
  assert.equal(cleanName('x'.repeat(41)), null);
  assert.ok(parseReportInput({}).error);
  assert.ok(parseReportInput({ name: 'Ava', siblings: 'Mia' }).error);
  assert.ok(parseReportInput({ name: 'Ava', siblings: Array(7).fill('Mia') }).error);
  assert.ok(parseReportInput({ name: 'Ava', surname: '123' }).error);
  const ok = parseReportInput({ name: 'ava', siblings: ['', 'noah'], sex: 'girl', filters: { origin: 'Latin' } });
  assert.deepEqual(ok.value, { name: 'Ava', surname: null, siblings: ['Noah'], sex: 'F', filters: { origin: 'Latin' } });
});
