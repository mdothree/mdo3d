/**
 * Baby Name Oracle premium report: a deterministic pure function (no AI, no
 * network). Everything it states comes from one of three places:
 *   - SSA national baby-name data (ssa_top1000_<year>.json): US popularity rank/trend
 *   - the 20 curated names (curated.js): meaning and origin, only for those names
 *   - arithmetic on the letters: Pythagorean numerology (labelled entertainment)
 */
import { createRequire } from 'node:module';
import { CURATED, CURATED_ORIGINS } from './curated.js';

const require = createRequire(import.meta.url);
// A static require of the JSON so Vercel's file tracer bundles it.
const SSA = require('./ssa_top1000_2025.json');

export const MAX_IDEAS = 10;
export const MAX_SIBLINGS = 6;
export const MAX_NAME_LEN = 40;

const NAME_RE = /^[A-Za-z][A-Za-z' -]*$/;
const SEX_LABEL = { F: 'girl', M: 'boy' };

// ── data indexes ────────────────────────────────────────────────────────────

function buildIndex(data) {
  const bySex = {};
  const byKey = new Map(); // lowercase name -> [{sex, rank, births, prevRank}]
  for (const sex of ['F', 'M']) {
    bySex[sex] = data[sex].map(([name, births, prevRank], i) => ({ name, sex, rank: i + 1, births, prevRank }));
    for (const row of bySex[sex]) {
      const key = row.name.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(row);
    }
  }
  return { year: data.year, prevYear: data.prevYear, source: data.source, bySex, byKey };
}

const INDEX = buildIndex(SSA);
const CURATED_BY_KEY = new Map(CURATED.map(c => [c.name.toLowerCase(), c]));

// ── input normalisation ─────────────────────────────────────────────────────

/** Trims and title-cases a name; returns null when it is not a plausible name. */
export function cleanName(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().replace(/\s+/g, ' ');
  if (!s || s.length > MAX_NAME_LEN || !NAME_RE.test(s)) return null;
  return s
    .toLowerCase()
    .replace(/(^|[ '-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

export function normSex(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();
  if (['f', 'girl', 'girls', 'female'].includes(s)) return 'F';
  if (['m', 'boy', 'boys', 'male'].includes(s)) return 'M';
  return null;
}

// ── numerology (Pythagorean) ────────────────────────────────────────────────

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

export function letterValue(ch) {
  const c = ch.toUpperCase().charCodeAt(0) - 65;
  return c >= 0 && c < 26 ? (c % 9) + 1 : 0;
}

/** Digit-sum reduction to 1-9, keeping master numbers 11, 22 and 33. */
export function reduceNumber(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split('').reduce((a, d) => a + Number(d), 0);
  }
  return n;
}

export function numerology(text) {
  const letters = text.toUpperCase().replace(/[^A-Z]/g, '').split('');
  const sum = pick => letters.filter(pick).reduce((a, ch) => a + letterValue(ch), 0);
  const total = sum(() => true);
  const vowels = sum(ch => VOWELS.has(ch));
  const consonants = sum(ch => !VOWELS.has(ch));
  return {
    letters: letters.join(''),
    expression: { number: reduceNumber(total), letterSum: total },
    soulUrge: { number: reduceNumber(vowels), letterSum: vowels },
    personality: { number: reduceNumber(consonants), letterSum: consonants },
  };
}

// Short, conventional keyword per number (numerology tradition, not a claim).
const NUMBER_KEYWORDS = {
  1: 'independence, initiative', 2: 'cooperation, sensitivity', 3: 'expression, creativity',
  4: 'stability, diligence', 5: 'freedom, curiosity', 6: 'care, responsibility',
  7: 'reflection, insight', 8: 'ambition, capability', 9: 'compassion, generosity',
  11: 'intuition, inspiration (master number)', 22: 'vision, building (master number)',
  33: 'nurturing, teaching (master number)', 0: 'no letters counted',
};

function withKeywords(n) {
  const add = o => ({ ...o, keywords: NUMBER_KEYWORDS[o.number] || '' });
  return { letters: n.letters, expression: add(n.expression), soulUrge: add(n.soulUrge), personality: add(n.personality) };
}

// ── sound helpers (heuristics, labelled approximate) ────────────────────────

/** Approximate English syllable count: vowel groups, minus a silent final "e". */
export function syllables(name) {
  const w = name.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g) || [];
  let n = groups.length;
  // Vowel pairs usually said as two syllables (Li-am, Mi-a, The-o-dore).
  n += (w.match(/i(?=[aou])|eo/g) || []).length;
  if (n > 1 && /[^aeiouy]e$/.test(w) && !/[^aeiouy]le$/.test(w)) n -= 1;
  return Math.max(1, n);
}

const ending = name => name.toLowerCase().replace(/[^a-z]/g, '').slice(-2);
const initial = name => name.charAt(0).toUpperCase();

// ── popularity ──────────────────────────────────────────────────────────────

function trendOf(row) {
  if (row.prevRank == null) return { trend: 'new', note: `not given to any baby in ${INDEX.prevYear} SSA data` };
  const change = row.prevRank - row.rank; // positive = climbed
  if (change > 0) return { trend: 'rising', change, note: `up ${change} from #${row.prevRank} in ${INDEX.prevYear}` };
  if (change < 0) return { trend: 'falling', change, note: `down ${-change} from #${row.prevRank} in ${INDEX.prevYear}` };
  return { trend: 'steady', change: 0, note: `same rank as ${INDEX.prevYear}` };
}

export function popularityOf(name) {
  const rows = INDEX.byKey.get(name.toLowerCase()) || [];
  return rows.map(r => ({
    sex: r.sex, label: SEX_LABEL[r.sex], rank: r.rank, births: r.births,
    prevRank: r.prevRank, ...trendOf(r),
  }));
}

function primaryRow(name, sex) {
  const rows = INDEX.byKey.get(name.toLowerCase()) || [];
  if (sex) return rows.find(r => r.sex === sex) || null;
  return rows.slice().sort((a, b) => a.rank - b.rank)[0] || null;
}

// ── suggestions ─────────────────────────────────────────────────────────────

/**
 * Sibling-name suggestions: three girls' and three boys' names in a rank band
 * near the requested name, avoiding its initial, its ending and the initials of
 * existing siblings. Curated names with the same origin are listed first.
 */
export function siblingSuggestions(name, siblings, { perSex = 3 } = {}) {
  const row = primaryRow(name);
  const target = row ? row.rank : 300; // unranked names: compare against mid-list names
  const band = Math.max(50, Math.round(target * 0.5));
  const curated = CURATED_BY_KEY.get(name.toLowerCase());
  const taken = new Set([name, ...siblings].map(n => n.toLowerCase()));
  const avoidInitials = new Set([name, ...siblings].map(initial));
  const avoidEnd = ending(name);

  const out = [];
  for (const sex of ['F', 'M']) {
    const pool = INDEX.bySex[sex].filter(r =>
      Math.abs(r.rank - target) <= band &&
      !taken.has(r.name.toLowerCase()) &&
      !avoidInitials.has(initial(r.name)) &&
      ending(r.name) !== avoidEnd);
    const sameOrigin = r => (curated && CURATED_BY_KEY.get(r.name.toLowerCase())?.origin === curated.origin ? 0 : 1);
    pool.sort((a, b) => sameOrigin(a) - sameOrigin(b) || Math.abs(a.rank - target) - Math.abs(b.rank - target) || a.rank - b.rank);
    for (const r of pool.slice(0, perSex)) {
      const c = CURATED_BY_KEY.get(r.name.toLowerCase());
      const reasons = [`#${r.rank} for ${SEX_LABEL[sex]}s in ${INDEX.year}${row ? ` (${name}: #${row.rank})` : ''}`,
        'different first letter', 'different ending'];
      if (c && curated && c.origin === curated.origin) reasons.unshift(`same origin (${c.origin})`);
      out.push({ name: r.name, sex, label: SEX_LABEL[sex], rank: r.rank, syllables: syllables(r.name), reasons });
    }
  }
  return out;
}

/** Checks how the requested name sits next to each existing sibling name. */
export function siblingChecks(name, siblings) {
  return siblings.map(s => {
    const notes = [];
    const sameInitial = initial(s) === initial(name);
    const sameEnding = ending(s) === ending(name);
    const sylA = syllables(name);
    const sylB = syllables(s);
    if (sameInitial) notes.push(`shares the first letter ${initial(name)}`);
    if (sameEnding) notes.push(`ends with the same sound "-${ending(name)}"`);
    notes.push(sylA === sylB ? `same rhythm (${sylA} syllable${sylA === 1 ? '' : 's'}, approximate)` : `different rhythm (${sylA} vs ${sylB} syllables, approximate)`);
    const pop = primaryRow(s);
    return {
      name: s, sameInitial, sameEnding, syllables: sylB,
      popularity: pop ? { sex: pop.sex, label: SEX_LABEL[pop.sex], rank: pop.rank } : null,
      notes,
    };
  });
}

/**
 * Up to MAX_IDEAS names matching the buyer's filters, ranked by popularity.
 * filters: { sex?: 'F'|'M'|'girl'|'boy', startsWith?: string, origin?: string }
 * Origin can only be matched within the curated set (the only names with an
 * origin we state); the report says so.
 */
export function nameIdeas(filters = {}, { exclude = [] } = {}) {
  const sex = normSex(filters.sex);
  const startsWith = typeof filters.startsWith === 'string' ? filters.startsWith.trim().toLowerCase().replace(/[^a-z]/g, '').slice(0, 10) : '';
  const originRaw = typeof filters.origin === 'string' ? filters.origin.trim().toLowerCase() : '';
  const origin = CURATED_ORIGINS.find(o => o.toLowerCase() === originRaw) || null;
  const skip = new Set(exclude.map(n => n.toLowerCase()));
  const used = { sex, startsWith: startsWith || null, origin };
  const notes = [];

  let rows;
  if (origin) {
    rows = CURATED.filter(c => c.origin === origin && (!sex || c.sex === sex))
      .map(c => primaryRow(c.name, c.sex) || { name: c.name, sex: c.sex, rank: null });
    notes.push(`Origin filtering uses our ${CURATED.length} curated names only.`);
  } else {
    if (originRaw) notes.push(`"${filters.origin}" is not an origin in our curated set (${CURATED_ORIGINS.join(', ')}); origin filter ignored.`);
    rows = (sex ? INDEX.bySex[sex] : [...INDEX.bySex.F, ...INDEX.bySex.M]).slice();
  }
  rows = rows.filter(r => !skip.has(r.name.toLowerCase()) && (!startsWith || r.name.toLowerCase().startsWith(startsWith)));
  rows.sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.sex.localeCompare(b.sex) || a.name.localeCompare(b.name));

  const ideas = rows.slice(0, MAX_IDEAS).map(r => {
    const c = CURATED_BY_KEY.get(r.name.toLowerCase());
    return {
      name: r.name, sex: r.sex, label: SEX_LABEL[r.sex], rank: r.rank,
      ...(c ? { origin: c.origin, meaning: c.meaning } : {}),
    };
  });
  if (ideas.length === 0) notes.push('No names in the data matched these filters.');
  return { filters: used, ideas, notes };
}

// ── the report ──────────────────────────────────────────────────────────────

/**
 * Validates input. Returns { error } or { value: {name, surname, siblings, sex, filters} }.
 */
export function parseReportInput(body = {}) {
  const name = cleanName(body.name);
  if (!name) return { error: `Please enter a first name (letters, spaces, hyphens or apostrophes; up to ${MAX_NAME_LEN} characters).` };
  let surname = null;
  if (body.surname !== undefined && body.surname !== null && String(body.surname).trim() !== '') {
    surname = cleanName(body.surname);
    if (!surname) return { error: 'The surname contains characters we cannot use.' };
  }
  let siblings = [];
  if (body.siblings !== undefined && body.siblings !== null) {
    if (!Array.isArray(body.siblings)) return { error: 'siblings must be a list of names.' };
    if (body.siblings.length > MAX_SIBLINGS) return { error: `Up to ${MAX_SIBLINGS} sibling names.` };
    for (const s of body.siblings) {
      if (typeof s === 'string' && s.trim() === '') continue;
      const c = cleanName(s);
      if (!c) return { error: 'A sibling name contains characters we cannot use.' };
      siblings.push(c);
    }
  }
  const filters = body.filters && typeof body.filters === 'object' && !Array.isArray(body.filters) ? body.filters : {};
  return { value: { name, surname, siblings, sex: normSex(body.sex), filters } };
}

export function buildReport({ name, surname = null, siblings = [], sex = null, filters = {} }) {
  const curated = CURATED_BY_KEY.get(name.toLowerCase());
  const fullName = surname ? `${name} ${surname}` : name;
  const popularity = popularityOf(name);
  const main = primaryRow(name, sex) || primaryRow(name);

  const ideaFilters = { ...filters };
  if (!ideaFilters.sex && !ideaFilters.startsWith && !ideaFilters.origin) {
    // No search filters given: suggest names that share the first letter.
    ideaFilters.startsWith = name.charAt(0);
    if (sex || main) ideaFilters.sex = sex || main.sex;
  }

  return {
    product: 'Baby Name Oracle: Premium Name Report',
    name,
    surname,
    fullName,
    initials: surname ? `${initial(name)}.${initial(surname)}.` : `${initial(name)}.`,
    meaning: curated
      ? { curated: true, origin: curated.origin, meaning: curated.meaning }
      : { curated: false, note: 'Not in our curated set of names, so we do not state a meaning or origin for it.' },
    popularity: {
      source: `US Social Security Administration national data, ${INDEX.year} births (latest year published)`,
      year: INDEX.year,
      ranks: popularity,
      note: popularity.length
        ? null
        : `Not in the SSA top 1000 for boys or girls in ${INDEX.year}. That is a less common name in the US, not an error.`,
    },
    sound: { syllables: syllables(name), syllablesNote: 'approximate', length: name.replace(/[^A-Za-z]/g, '').length },
    numerology: {
      system: 'Pythagorean (A=1 ... I=9, J=1 ...; vowels A E I O U; Y counted as a consonant)',
      disclaimer: 'Numerology is presented for entertainment. The numbers are arithmetic on the letters.',
      firstName: withKeywords(numerology(name)),
      fullName: surname ? withKeywords(numerology(fullName)) : null,
    },
    siblings: {
      checks: siblingChecks(name, siblings),
      suggestions: siblingSuggestions(name, siblings),
      method: `Suggestions are SSA ${INDEX.year} names near ${name}'s popularity, with a different first letter and ending; three for girls and three for boys.`,
    },
    ideas: nameIdeas(ideaFilters, { exclude: [name, ...siblings] }),
    sources: [INDEX.source, `Meanings and origins: our curated list of ${CURATED.length} names.`],
  };
}

/** Plain-text rendering (used for the "Download as text" file and tests). */
export function reportToText(r) {
  const L = [];
  L.push(`${r.product}`, `Name: ${r.fullName}  (initials ${r.initials})`, '');
  L.push('MEANING & ORIGIN');
  L.push(r.meaning.curated ? `  ${r.meaning.meaning} (${r.meaning.origin})` : `  ${r.meaning.note}`, '');
  L.push(`US POPULARITY (${r.popularity.source})`);
  if (r.popularity.ranks.length) for (const p of r.popularity.ranks) L.push(`  #${p.rank} for ${p.label}s, ${p.births.toLocaleString('en-US')} births; ${p.note}`);
  else L.push(`  ${r.popularity.note}`);
  L.push('');
  L.push(`NUMEROLOGY: ${r.numerology.system}`, `  ${r.numerology.disclaimer}`);
  const num = (label, n) => {
    L.push(`  ${label} (${n.letters})`);
    for (const [k, t] of [['expression', 'Expression'], ['soulUrge', 'Soul urge'], ['personality', 'Personality']]) {
      L.push(`    ${t}: ${n[k].number} (letter sum ${n[k].letterSum}) ${n[k].keywords}`);
    }
  };
  num('First name', r.numerology.firstName);
  if (r.numerology.fullName) num('Full name', r.numerology.fullName);
  L.push('');
  L.push('SIBLINGS');
  for (const c of r.siblings.checks) L.push(`  With ${c.name}: ${c.notes.join('; ')}`);
  L.push(`  Suggestions (${r.siblings.method})`);
  for (const s of r.siblings.suggestions) L.push(`    ${s.name} (${s.label}): ${s.reasons.join(', ')}`);
  L.push('');
  const f = r.ideas.filters;
  L.push(`NAME IDEAS (${[f.sex && SEX_LABEL[f.sex] + 's', f.startsWith && `starting with "${f.startsWith}"`, f.origin && `${f.origin} origin`].filter(Boolean).join(', ') || 'all'})`);
  for (const i of r.ideas.ideas) L.push(`  ${i.name} (${i.label})${i.rank ? ` #${i.rank}` : ''}${i.meaning ? `: ${i.meaning}, ${i.origin}` : ''}`);
  for (const n of r.ideas.notes) L.push(`  Note: ${n}`);
  L.push('', 'SOURCES', ...r.sources.map(s => `  ${s}`));
  return L.join('\n') + '\n';
}

export const DATA_YEAR = INDEX.year;
export { CURATED_ORIGINS };
