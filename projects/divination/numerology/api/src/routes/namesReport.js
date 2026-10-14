/**
 * Baby Name Oracle (names.mdo3d.com) premium report delivery (MDO-001).
 *
 *   POST /api/names/report           {session_id, name, surname?, siblings?[], sex?, filters?}
 *   POST /api/names/report-by-email  {email, card_last4, name, surname?, siblings?[], sex?, filters?}
 *
 * The $3 report is sold through a Stripe Payment Link; this route verifies
 * the purchase server-side (read-only Stripe calls) and returns the
 * deterministic report from src/names/report.js. Unknown or unpaid -> 402.
 *
 * Mounted in server.js BEFORE the app-wide cors()/json middleware, so this
 * router owns its own CORS (names.mdo3d.com only) and JSON parsing.
 */
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { rateLimit } from '../security.js';
import { buildReport, parseReportInput, reportToText } from '../names/report.js';
import { verifyNamesSession, findPaidSessionByEmail } from '../names/verify.js';

export const NAMES_ORIGINS = ['https://names.mdo3d.com'];

// Distinct names one purchase can generate a report for. Re-opening the same
// name does not count. In-memory per warm instance (best-effort, like the rate
// limiter); it never writes to Stripe.
export const MAX_REPORTS_PER_SESSION = 5;

export function createNamesRouter({ stripe, plinkId, links, maxReports = MAX_REPORTS_PER_SESSION, limits = {} } = {}) {
  let client = stripe || null;
  const getStripe = () => (client ||= new Stripe(process.env.STRIPE_SECRET_KEY));
  const opts = () => (links !== undefined ? { links } : plinkId !== undefined ? { plinkId } : {});
  const used = new Map(); // session id -> Set(name keys)

  const router = express.Router();
  router.use(cors({ origin: NAMES_ORIGINS, methods: ['POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] }));
  router.use(express.json({ limit: '8kb' }));

  const reportLimiter = rateLimit({ max: limits.report ?? 30 });
  const emailLimiter = rateLimit({ max: limits.email ?? 5 });

  function deliver(res, sessionId, input) {
    const key = `${input.name}|${input.surname || ''}`.toLowerCase();
    let names = used.get(sessionId);
    if (!names) {
      if (used.size > 20000) used.clear();
      names = new Set();
      used.set(sessionId, names);
    }
    if (!names.has(key) && names.size >= maxReports) {
      return res.status(402).json({
        success: false,
        error: `This purchase has already been used for ${maxReports} different names.`,
      });
    }
    names.add(key);
    const report = buildReport(input);
    return res.json({ success: true, report, text: reportToText(report), reportsUsed: names.size, reportsAllowed: maxReports });
  }

  router.post('/report', reportLimiter, async (req, res, next) => {
    try {
      const body = req.body || {};
      const parsed = parseReportInput(body);
      if (parsed.error) return res.status(400).json({ success: false, error: parsed.error });
      const v = await verifyNamesSession(getStripe(), body.session_id, opts());
      if (!v.ok) return res.status(v.status).json({ success: false, error: v.error });
      return deliver(res, v.session.id, parsed.value);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/report-by-email', emailLimiter, async (req, res, next) => {
    try {
      const body = req.body || {};
      const parsed = parseReportInput(body);
      if (parsed.error) return res.status(400).json({ success: false, error: parsed.error });
      const v = await findPaidSessionByEmail(getStripe(), body.email, body.card_last4, opts());
      if (!v.ok) return res.status(v.status).json({ success: false, error: v.error });
      return deliver(res, v.session.id, parsed.value);
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

export default createNamesRouter;
