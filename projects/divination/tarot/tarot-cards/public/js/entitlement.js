/**
 * PremiumEntitlement — client-side record of verified Stripe purchases.
 *
 * Written by success.html after /api/payment/verify confirms a session;
 * read by app.js to deliver premium content without re-charging.
 * localStorage is per-origin, so entitlements are naturally scoped per service.
 *
 * Plain script (no ES module) so it can load before module scripts and
 * from inline pages without import-path issues.
 */
(function () {
  var KEY = 'mdo3d_premium';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }
  function isActive(e) {
    if (e.consumed) return false;
    // Monthly/subscription entitlements expire; single readings are one-shot credits.
    if (e.readingType && e.readingType.indexOf('monthly') !== -1) {
      return Date.now() - e.verifiedAt < 30 * 24 * 60 * 60 * 1000;
    }
    return true;
  }

  window.PremiumEntitlement = {
    grant: function (entry) {
      var list = load();
      // Idempotent per Stripe session — verify can run more than once.
      if (entry.sessionId && list.some(function (e) { return e.sessionId === entry.sessionId; })) return;
      list.push({
        readingType: entry.readingType || 'premium',
        sessionId: entry.sessionId || null,
        verifiedAt: Date.now(),
        consumed: false
      });
      save(list);
    },
    has: function () {
      return load().some(isActive);
    },
    /** Stripe sessionId of the active entitlement — sent to the API so the
     *  server can verify the payment before returning premium content. */
    activeSessionId: function () {
      var e = load().filter(isActive)[0];
      return e ? e.sessionId : null;
    },
    /** Use up one single-reading credit (subscriptions are not consumed). */
    consume: function () {
      var list = load();
      for (var i = 0; i < list.length; i++) {
        if (isActive(list[i])) {
          if (!(list[i].readingType || '').match(/monthly/)) list[i].consumed = true;
          save(list);
          return list[i];
        }
      }
      return null;
    },
    all: load
  };
})();
