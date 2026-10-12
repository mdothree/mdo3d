/**
 * Reference data only (names, tile-map positions, FL code lists). Which states
 * are searchable comes from the public API (GET /coverage: states with ingested
 * filings). If coverage cannot be read, only the states with an adapter in this
 * repo are enabled (src/adapters: FL, CO). Nothing here is lead data.
 */

export const STATES_WITH_ADAPTER = ['FL', 'CO'];

// [code, name, column, row] for an 11 x 8 tile-grid map.
export const US_STATES = [
  ['AK', 'Alaska', 0, 0], ['ME', 'Maine', 10, 0],
  ['VT', 'Vermont', 9, 1], ['NH', 'New Hampshire', 10, 1],
  ['WA', 'Washington', 0, 2], ['ID', 'Idaho', 1, 2], ['MT', 'Montana', 2, 2], ['ND', 'North Dakota', 3, 2],
  ['MN', 'Minnesota', 4, 2], ['IL', 'Illinois', 5, 2], ['WI', 'Wisconsin', 6, 2], ['MI', 'Michigan', 7, 2],
  ['NY', 'New York', 8, 2], ['RI', 'Rhode Island', 9, 2], ['MA', 'Massachusetts', 10, 2],
  ['OR', 'Oregon', 0, 3], ['NV', 'Nevada', 1, 3], ['WY', 'Wyoming', 2, 3], ['SD', 'South Dakota', 3, 3],
  ['IA', 'Iowa', 4, 3], ['IN', 'Indiana', 5, 3], ['OH', 'Ohio', 6, 3], ['PA', 'Pennsylvania', 7, 3],
  ['NJ', 'New Jersey', 8, 3], ['CT', 'Connecticut', 9, 3],
  ['CA', 'California', 0, 4], ['UT', 'Utah', 1, 4], ['CO', 'Colorado', 2, 4], ['NE', 'Nebraska', 3, 4],
  ['MO', 'Missouri', 4, 4], ['KY', 'Kentucky', 5, 4], ['WV', 'West Virginia', 6, 4], ['VA', 'Virginia', 7, 4],
  ['MD', 'Maryland', 8, 4], ['DE', 'Delaware', 9, 4],
  ['AZ', 'Arizona', 1, 5], ['NM', 'New Mexico', 2, 5], ['KS', 'Kansas', 3, 5], ['AR', 'Arkansas', 4, 5],
  ['TN', 'Tennessee', 5, 5], ['NC', 'North Carolina', 6, 5], ['SC', 'South Carolina', 7, 5], ['DC', 'District of Columbia', 8, 5],
  ['OK', 'Oklahoma', 3, 6], ['LA', 'Louisiana', 4, 6], ['MS', 'Mississippi', 5, 6], ['AL', 'Alabama', 6, 6], ['GA', 'Georgia', 7, 6],
  ['HI', 'Hawaii', 0, 7], ['TX', 'Texas', 3, 7], ['FL', 'Florida', 8, 7],
];

export const STATE_NAME = Object.fromEntries(US_STATES.map(([c, n]) => [c, n]));

/**
 * Merge GET /coverage rows ({state, filings, latest_filed_date, latest_source_date,
 * last_ingest_at}) over the full list; a state is live only if it has filings.
 * Pass null when coverage is unreachable.
 */
export function mergeStates(coverage) {
  const live = new Map();
  if (coverage) {
    for (const s of coverage) if (s.state && s.filings > 0) live.set(s.state.toUpperCase(), s);
  } else {
    for (const c of STATES_WITH_ADAPTER) live.set(c, { state: c });
  }
  return US_STATES.map(([code, name, col, row]) => ({
    code,
    name,
    col,
    row,
    status: live.has(code) ? 'live' : 'coming',
    latest_source_date: live.get(code)?.latest_source_date ?? null,
    latest_filed_date: live.get(code)?.latest_filed_date ?? null,
    filings: live.get(code)?.filings ?? null,
  }));
}

const FL_FILING_TYPES = {
  FLAL: 'Florida LLC',
  DOMP: 'Domestic profit corporation',
  FORP: 'Foreign profit corporation',
  FORL: 'Foreign LLC',
  DOMLP: 'Domestic limited partnership',
  FORLP: 'Foreign limited partnership',
  LLP: 'Limited liability partnership',
  FORLLP: 'Foreign limited liability partnership',
  GENPAR: 'General partnership',
  DOMNP: 'Domestic non-profit corporation',
  FORNP: 'Foreign non-profit corporation',
  NPREG: 'Non-profit registration',
  FIC: 'Fictitious name (trade name)',
};

/** Filing-type codes per state (no backend endpoint lists them yet). */
export function filingTypesFor(state) {
  if (state !== 'FL') return [];
  return Object.entries(FL_FILING_TYPES).map(([value, label]) => ({ value, label: `${label} (${value})` }));
}

export const ENTITY_KINDS = [
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'trade_name', label: 'Trade name (DBA)' },
];
