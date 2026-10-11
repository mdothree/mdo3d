/**
 * httpErrors.js — shared JSON error handling for the divination Express APIs.
 *
 * Identical copy in every projects/divination/<name>/api/src/ (each API is its
 * own Vercel project, so it cannot import from a sibling directory).
 * Cycle-8 QW4: C7-002 (malformed JSON -> 400), C7-003 (oversized body -> 413),
 * C7-017 (one {success:false,error} shape, JSON 404/405 instead of HTML).
 *
 * Register AFTER every route, in this order:
 *   app.use(notFoundOrMethodNotAllowed(app));
 *   app.use(jsonErrorHandler);
 *
 * The Stripe webhook keeps its route-level express.raw() parser; this module
 * only sees requests no route answered, or errors passed to next().
 */

/**
 * Fallthrough for requests no route handled. If the path exists under another
 * method -> 405 with an Allow header; otherwise -> 404. Always JSON.
 */
export function notFoundOrMethodNotAllowed(app) {
  return (req, res) => {
    const allowed = new Set();
    const stack = (app._router && app._router.stack) || [];
    for (const layer of stack) {
      if (!layer.route || !layer.match(req.path)) continue;
      for (const [method, enabled] of Object.entries(layer.route.methods)) {
        if (enabled && method !== '_all') allowed.add(method.toUpperCase());
      }
    }

    if (allowed.size > 0) {
      if (allowed.has('GET')) allowed.add('HEAD');
      allowed.add('OPTIONS');
      res.set('Allow', [...allowed].join(', '));
      return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
    }

    return res.status(404).json({ success: false, error: 'Not found' });
  };
}

/**
 * Final error handler. Maps body-parser failures to client errors and never
 * echoes internal error messages for 5xx.
 */
// eslint-disable-next-line no-unused-vars
export function jsonErrorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Malformed JSON in request body' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Request body too large' });
  }

  const status = Number(err && (err.status || err.statusCode));
  if (status >= 400 && status < 500) {
    const message = err.expose && err.message ? err.message : 'Bad request';
    return res.status(status).json({ success: false, error: message });
  }

  console.error('Server error:', err);
  return res.status(500).json({ success: false, error: 'Internal server error' });
}
