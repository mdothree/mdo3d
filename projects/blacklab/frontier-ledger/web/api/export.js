// CSV export of the full ledger: a membership feature (placeholder until membership is live).
// The full events file is not deployed with the site; this endpoint never serves data yet.
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(402).json({ ok: false, error: 'CSV export is part of membership (early access, coming soon).' });
};
