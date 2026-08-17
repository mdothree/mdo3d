# Firebase — Assessment, Best Practices & Remediation Plan

**Date:** 2026-08-16
**Scope:** All mdo3d projects using Firebase Auth / Firestore / Realtime DB.
**Method:** Code-level review of every `firestore.rules` / `database.rules.json`,
Firebase config, API auth middleware, and the Stripe→Firestore subscription flow,
plus a live exploit check of the divination premium endpoints.

> **TL;DR:** The house has one genuinely excellent Firebase setup (`mdothree-api`)
> and several that range from mediocre to wide-open. The single most important
> finding is that **the divination premium content has no server-side enforcement**
> — a paid AI reading is retrievable for free with one unauthenticated request.
> Adopt the `mdothree-api` pattern everywhere.

---

## 1. ✅ FIXED (2026-08-16): premium content is now enforced server-side

**Status:** the bypass below is **closed on all 9 divination services.** Each
premium generate endpoint now requires a **verified, paid Stripe session** before
returning a reading; the frontends pass the stored `sessionId` and the API calls
`stripeService.verifyPayment(sessionId)` (payment_status === 'paid') server-side.
Verified live: `premium:true` with no session or a fake session → **HTTP 402**; free
tier → 200; only a real paid session unlocks premium.

- Implementation: gate in each `api/src/server.js` premium branch; `sessionId` added
  to `shared/ui-components/entitlement.js` (`activeSessionId()`) and threaded through
  all 9 frontend premium fetches. Deployed frontends-first, then APIs (no broken
  window).
- **Replay / cost-abuse: capped ✅** (per-session use counter in Stripe metadata,
  limit 3, fail-open — see §5 P1.5). Stops a single payment from being scripted into
  unlimited generations. A strict atomic ledger (Firestore + API SA) is the ideal
  upgrade if abuse is ever observed.
- **Note:** this is Stripe-session enforcement, not Firebase-Auth enforcement — the
  right call for these anonymous (no-login) apps. A Firebase-Auth + Firestore
  entitlement model remains the ideal for logged-in products (rigor/ronnascanner).

<details><summary>Original finding (now fixed) — kept for history</summary>

**Confirmed exploit (2026-08-16):** an unauthenticated request returned the full
paid reading:

```bash
curl -s -X POST https://iching-api.vercel.app/api/reading/generate \
  -H 'Content-Type: application/json' \
  -d '{"hexagram":{"number":1,"name":"The Creative"},"question":"x","premium":true}'
# → { "reading": { "type": "premium", "interpretation": "…full AI reading…" } }
```

**Why:** the divination generate endpoints gate on a client-supplied flag only:

```js
// projects/divination/iching/api/src/server.js  (all 9 services follow this shape)
const { hexagram, question, changingLines, premium } = req.body;
if (!premium) { /* basic */ }
// else → generateHexagramReading(...)   ← no auth, no payment check
```

- **No auth middleware** on any divination API (`find projects/divination -name auth.js` → none),
  even though `firebase-admin` is already a dependency in each `package.json`.
- The **client-side entitlement layer** added for the payment loop
  (`shared/ui-components/entitlement.js`, localStorage key `mdo3d_premium`) is also
  forgeable — a user sets one localStorage key and unlocks premium in the UI. It is a
  UX convenience, **not** a security boundary.

**Impact:** Stripe charges real money, but the product is unprotected. Payment is
effectively voluntary for any technical user. This nullifies the revenue intent of
the entire payment build-out.

**The fix already exists in this repo — `mdothree-api`:**
1. Stripe webhook (admin SDK) writes `subscriptions/{uid}` in Firestore.
2. Rule: `allow write: if false` → clients can't fake it; only the webhook can.
3. Premium endpoints require a Firebase ID token and read that doc server-side.

See §3 (gold standard) and §5 (remediation) for the concrete port.

</details>

---

## 2. Per-project Firebase status

Rule-quality scored on: deny-all catch-all · helper functions · field validation
(`hasAll`) · immutable records (`update:if false`) · server-only writes
(`write:if false`) · server-side auth middleware.

| Project | Rules quality | Auth middleware | Notable |
|---------|--------------|-----------------|---------|
| **mdothree-api** | ✅ **Gold standard** (catch-all, 2 helpers, 6 field-validations, 3 immutable, 5 server-only) | ✅ `lib/auth.js` (`verifyAuth`, `verifyAuthAndUID`) | Reference implementation. Subscriptions server-authoritative. |
| rigor/api | (rules n/a — Firestore via admin) | ✅ `_middleware/auth.js` (`requireAuth`) | Good server-side token verify. |
| ronnascanner-api | (admin) | ✅ `_middleware/auth.js` | Good. |
| runwae | 🔴 **wide open** — `.read/.write: if auth != null` | ✅ `api/llm/_lib/auth.js` (LLM only) | Any authed user reads/writes **any** RTDB path. |
| resume-analyzer | ⚠️ owner-scoped but `leads` `create: if true` | (frontend only) | Anyone can write `leads/*` (spam/abuse). |
| shared/spiritual (divination) | ⚠️ owner-scoped per reading, **no catch-all, no validation** | ❌ **none** | Used by divination; premium not enforced (see §1). |
| shared/career, shared/leads, shared/utilities | ⚠️ basic owner-scope, 0 on all best-practice checks | ❌ | Minimal. |

**SDK version sprawl** (frontends): `firebasejs/8.2.1` (125 refs, 2021-era namespaced
API), `10.7.1` (120), `10.12.0` (62). Three live versions; 8.2.1 misses years of
fixes and the modular tree-shakeable API.

**Config duplication:** 20+ copies of `firebase-config.js` / `firebase.js` across
tools. The web `apiKey` is committed — which is **fine** (Firebase web API keys are
designed to be public) — but duplication makes it hard to apply API-key restrictions
+ authorized-domain locks consistently.

---

## 3. The gold standard — `mdothree-api` (copy this everywhere)

**Server-authoritative subscriptions** (`functions/stripe/webhook.js`):

```js
const db = admin.firestore();
await db.collection('subscriptions').doc(uid).set({
  isPro: sub.status === 'active' || sub.status === 'trialing',
  status: sub.status,
  stripeCustomerId: sub.customer,
  currentPeriodEnd: admin.firestore.Timestamp.fromMillis(sub.current_period_end * 1000),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
}, { merge: true });
```

**Rules that make it un-fakeable** (`firestore.rules`):

```
function isSignedIn() { return request.auth != null; }
function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }
function ownsWrite() { return isSignedIn() && request.resource.data.uid == request.auth.uid; }

match /subscriptions/{uid} {
  allow read:  if isSignedIn() && request.auth.uid == uid;  // read own status
  allow write: if false;                                    // webhook admin SDK only
}

match /hash_history/{docId} {
  allow read:   if isOwner(resource.data.uid);
  allow create: if ownsWrite()
                && request.resource.data.keys().hasAll(['uid','input','algo','hash','createdAt'])
                && request.resource.data.input is string;
  allow update: if false;                                   // immutable history
  allow delete: if isOwner(resource.data.uid);
}

match /{document=**} { allow read, write: if false; }       // default deny
```

**Server-side token verification** (`lib/auth.js`):

```js
async function verifyAuth(req, res) {
  const idToken = (req.headers.authorization || '').replace(/^Bearer /, '');
  try { req.user = await admin.auth().verifyIdToken(idToken); return true; }
  catch (e) { res.status(401).json({ error: 'Unauthorized' }); return false; }
}
```

Five practices to standardize from it: **(1)** helper functions, **(2)** field +
type validation on writes, **(3)** immutable records where appropriate, **(4)**
explicit default-deny catch-all, **(5)** server-authoritative status written only by
the admin SDK.

---

## 4. Security issues (ranked)

1. **Divination premium not enforced** (§1) — free paid readings. *Severity: critical.*
2. **runwae RTDB wide open** — `database.rules.json` is `{".read":"auth != null",
   ".write":"auth != null"}`. Any authenticated user can read/write every path,
   including other users' gigs, payments, and profiles. *Severity: high.* Fix to
   path-scoped rules (`/users/$uid`, `/gigs/$gigId` with owner checks).
3. **resume-analyzer `leads` open create** — `allow create: if true` lets anyone
   write lead docs unauthenticated (spam/abuse, cost). *Severity: medium.* Gate with
   an App Check token or move lead capture behind the API.
4. **No default-deny in 6 of 7 rule files** — any collection not explicitly matched
   may be reachable depending on structure. *Severity: medium.* Add
   `match /{document=**} { allow read, write: if false; }`.
5. **No field/type validation** outside mdothree — malformed or oversized docs can be
   written by any owner. *Severity: low-medium.*
6. **SDK 8.2.1 in 125 places** — 2021-era, missing security patches. *Severity: low.*

---

## 5. Remediation plan (prioritized)

### P0 — Enforce divination premium server-side ✅ DONE (2026-08-16)
Implemented via **Stripe-session verification** (no login required, right fit for
these anonymous apps): each generate endpoint requires a paid `sessionId`, verified
server-side with `stripeService.verifyPayment()`, before returning premium. Frontends
pass the stored `sessionId`. Bypass confirmed closed (402) on all 9; free tier intact.

**Replay / cost-abuse cap ✅ DONE (2026-08-16):** each generate gate now reads a
per-session use counter from Stripe metadata (`metadata.uses`), rejects with 402
once it hits **3**, and increments it (best-effort, fail-open). This caps a paid
session at 3 premium generations — enough for legitimate retries, but it stops a
single $2.99 payment from being scripted into unlimited Claude-token cost. No new
infra (uses the Stripe key already present); metadata merge verified to preserve
`readingType`/other keys. Deployed to all 9; bypass (402) and free tier (200)
re-verified. *Note: the counter is not perfectly atomic under concurrent requests
(loose bound ~3), and fail-open means a Stripe error skips the increment — both
acceptable for this vector. A strict atomic ledger would need Firestore + a service
account for the API runtime.*

### P1 — Lock down open rules
- **resume-analyzer** ✅ **hardened in source (2026-08-16)**: `leads` create now
  constrained to the exact `{email,score,timestamp,source}` shape with type + size
  caps (was `create: if true`); added default-deny catch-all. Preserves anonymous
  capture, blocks arbitrary/oversized writes. *Needs deploy to `mdo3d-leads`.*
- **runwae** — RTDB rules are `{".read":"auth!=null",".write":"auth!=null"}` (any
  authed user reads/writes any path). Discovered top-level paths: `users, items,
  transactions, subscriptions, conversations, disputes, groups, guides, analytics,
  activity, posts`. **Ready-to-adapt template** (⚠️ *test against the app before
  deploy — owner-field names must be verified*):
  ```json
  {
    "rules": {
      "users":         { "$uid":  { ".read": "auth.uid === $uid", ".write": "auth.uid === $uid" } },
      "items":         { ".read": "auth != null", "$id": { ".write": "auth != null && (!data.exists() || data.child('ownerId').val() === auth.uid)" } },
      "transactions":  { "$id":  { ".read": "auth != null && data.child('uid').val() === auth.uid", ".write": false } },
      "subscriptions": { "$uid": { ".read": "auth.uid === $uid", ".write": false } },
      "conversations": { "$id":  { ".read": "auth != null", ".write": "auth != null" } },
      "$other": { ".read": "auth != null", ".write": false }
    }
  }
  ```
  Left as a recommendation (not applied) because runwae is a live app that can't be
  test-verified here; a wrong owner-field would break it.

### P2 — Rules DEPLOYED to all 5 projects ✅ (2026-08-16, via `mdo3group@gmail.com`)

Deployed and released to `oracle-mdo3d`, `mdo3d-career`, `mdo3d-leads`,
`mdo3d-utilities`. **Critical discovery during deploy — several Firebase projects are
SHARED by multiple apps**, and a naive per-app ruleset would have denied the other
app's collections (Firestore denies any collection not explicitly matched). Corrected
to complete, merged rulesets:
- **mdo3d-leads** = ronnascanner CRM (`leads`/`contacts`/`companies`, owner-scoped) ∪
  resume-analyzer (anonymous `leads` capture + `analytics`, `analyses`, `payments`).
- **mdo3d-utilities** = full mdothree collection set (`hash_history`, `password_history`,
  `color_palettes`, `timestamp_*`, `subscriptions`, `analytics_*`, …) + `users`/`history`.
  (Source of truth for the mdothree collections: `mdothree-api/firestore.rules`.)
- **mdo3d-career** = rigor's actual **hyphenated** collections (`cover-letters`,
  `interview-sessions`, `linkedin-optimizations`, `networking-emails`,
  `portfolio-reviews`, `salary-strategies`, `payment_events`) — owner-scoped by
  `userId`. (The old repo file used mismatched `*_documents` names that no app writes.)
- **oracle-mdo3d** = divination readings + `users` + `entitlements` + catch-all.

**Lesson:** when hardening rules for a shared Firebase project, enumerate **every**
collection **every** app on that project writes before deploying — a catch-all (or
Firestore's implicit default-deny) will silently break any collection you omit. Verify
`projectId` in each app's firebase-config, then union all their collections.

Duplicate rule files that target the same project are now kept in sync
(`shared/leads` ⇄ `resume-analyzer`).

<details><summary>Earlier source-only note (superseded by the deploy above)</summary>

Added a default-deny `{document=**}` catch-all to **all** the rule files that lacked
one: `shared/spiritual` (+ server-only `entitlements/{uid}`), `shared/career`,
`shared/leads`, `shared/utilities`, `resume-analyzer`. mdothree-api already had one.

⚠️ **Deploy handoff — access gap confirmed (2026-08-16):** attempted deploy with the
`mdo3d-platform-admin` service account (from `~/latarence/accounts/service-accounts/`)
→ **403 on `oracle-mdo3d`**. Root cause: the token doc maps MDO3D → GCP project
`pivotal-racer-397905`, but the divination apps run on Firebase project `oracle-mdo3d`
and resume-analyzer on `mdo3d-leads` — **separate projects with no SA on disk**. The
rules compile cleanly against oracle-mdo3d; it's purely an IAM gap. To deploy, one of:
(a) interactive `firebase login` as the account that owns these projects (likely
`mdo3group@gmail.com`); (b) grant the pivotal-racer SA `roles/firebaserules.admin` +
`roles/datastore.owner` on each target project; (c) create a SA within each project.
Then run per the table below.

Deploy each with a login/SA that has the target project:
| Rules file | Firebase project | Deploy |
|---|---|---|
| shared/spiritual | oracle-mdo3d | `cd shared/spiritual && firebase deploy --only firestore:rules` |
| shared/career | mdo3d-career | `cd shared/career && firebase deploy --only firestore:rules` |
| shared/leads | mdo3d-leads | `cd shared/leads && firebase deploy --only firestore:rules` |
| shared/utilities | mdo3d-utilities | `cd shared/utilities && firebase deploy --only firestore:rules` |
| resume-analyzer | mdo3d-leads | (same project as leads — kept in sync) |

*(All five deployed 2026-08-16. `runwae` RTDB rules still pending — separate project,
template in P1.)*

### P3 — Consistency & maintenance
- Consolidate the 20+ `firebase-config.js` copies into one shared module.
- Upgrade the 8.2.1 frontends to the 10.12 modular SDK.
- In the Firebase console: apply **API key restrictions** (HTTP referrers) and
  **authorized domains** so the public web keys only work from your domains.

---

## 6. What's already good (keep doing)

- `mdothree-api`: rules, auth middleware, and server-authoritative subscriptions are
  the model — no changes needed; use as the template.
- rigor/api and ronnascanner-api: proper `requireAuth` server-side token verification
  with 401s. (rigor/ronnascanner *content* endpoints already gate on auth — unlike
  divination.)
- Owner-scoped read/write on per-user reading collections in spiritual rules is the
  right instinct; it just needs the catch-all + validation + the premium-enforcement
  layer on top.

---

## 7. References (files)

- Gold standard: `projects/mdothree/mdothree-api/{firestore.rules, lib/auth.js, functions/stripe/webhook.js}`
- Auth middleware to copy: `projects/rigor/api/api/_middleware/auth.js`, `projects/mdothree/mdothree-api/lib/auth.js`
- Wide-open rules to fix: `projects/external/runwae/runwae/database.rules.json`
- Open create to fix: `projects/ronnascanner/resume-analyzer/firestore.rules` (`leads`)
- Divination rules to harden: `shared/spiritual/firestore.rules`
- Divination premium bypass: `projects/divination/*/api/src/server.js` (`/api/reading/generate`)
- Related: [DIVINATION_PAYMENTS_DEPLOYMENT.md](DIVINATION_PAYMENTS_DEPLOYMENT.md) (the payment loop whose gate this hardens), [FEATURE_PARITY_AUDIT.md](FEATURE_PARITY_AUDIT.md).
