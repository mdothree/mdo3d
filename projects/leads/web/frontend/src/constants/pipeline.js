export const LOG_STEPS = [
  [280,  'info', '> pipeline started — fetching pending leads...'],
  [560,  'ok',   '> [1/5] 12 pending leads identified for processing'],
  [840,  'info', '> [2/5] querying Apollo API...'],
  [1120, 'ok',   '> [2/5] Apollo: 10/12 records returned successfully'],
  [1400, 'info', '> [3/5] validating email addresses via Hunter.io...'],
  [1680, 'ok',   '> [3/5] email validation complete — 1 bounce flagged'],
  [1960, 'info', '> [4/5] computing lead scores...'],
  [2240, 'ok',   '> [4/5] scores updated for 10 leads'],
  [2520, 'info', '> [5/5] writing to database...'],
  [2800, 'ok',   '> [5/5] 10 records committed'],
  [3000, 'ok',   '> pipeline complete — 10 enriched · 1 failed · 1 skipped'],
];
