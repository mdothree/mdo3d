export const statusVariant = s =>
  ({ Enriched: 'success', Pending: 'warning', Failed: 'danger', Raw: 'default' })[s] || 'default';

export const segmentVariant = s =>
  ({ Government: 'navy', Commercial: 'blue', Residential: 'default' })[s] || 'default';

export const scoreColor = n =>
  n >= 80 ? 'var(--green)' : n >= 60 ? 'var(--amber)' : n > 0 ? 'var(--red)' : 'var(--light)';
