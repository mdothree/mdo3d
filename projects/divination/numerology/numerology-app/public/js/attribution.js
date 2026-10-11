/**
 * MdoAttribution — first-touch UTM capture for the checkout -> Stripe join.
 *
 * On load, reads utm_source/utm_medium/utm_campaign/utm_content/utm_term from
 * the URL. If any are present and no unexpired record exists, stores them once
 * in localStorage `mdo_attr` with landing_path and first_seen (ISO). Never
 * overwrites a live record (first-touch); records expire after 90 days.
 * The checkout request sends MdoAttribution.get() as `attribution`; the API
 * whitelists + sanitizes the values before writing Stripe metadata.
 *
 * Plain script (no ES module) so it can load before module scripts and
 * from inline pages without import-path issues.
 */
(function () {
  var KEY = 'mdo_attr';
  var TTL_MS = 90 * 24 * 60 * 60 * 1000;
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  function load() {
    try {
      var rec = JSON.parse(localStorage.getItem(KEY));
      if (!rec || typeof rec !== 'object') return null;
      var seen = Date.parse(rec.first_seen);
      if (!seen || Date.now() - seen > TTL_MS) return null;
      return rec;
    } catch (e) { return null; }
  }

  function capture() {
    if (load()) return; // first-touch: never overwrite a live record
    var params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
    var rec = {};
    var found = false;
    for (var i = 0; i < UTM_KEYS.length; i++) {
      var v = params.get(UTM_KEYS[i]);
      if (v) { rec[UTM_KEYS[i]] = v.slice(0, 100); found = true; }
    }
    if (!found) return;
    rec.landing_path = window.location.pathname;
    rec.first_seen = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) {}
  }

  capture();

  window.MdoAttribution = {
    /** First-touch record for the checkout body, or undefined if none. */
    get: function () { return load() || undefined; }
  };
})();
