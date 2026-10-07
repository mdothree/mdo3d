/**
 * Firebase (optional) for Tarot Cards
 * Shared MDO3D Spiritual Firebase project: oracle-mdo3d
 *
 * Firebase is NOT required for this app. Readings, payments and premium content
 * do not depend on it: premium access is granted only after the API verifies the
 * Stripe session server-side (see entitlement.js / success.html / api verify).
 * Nothing here is a source of truth for paid status.
 *
 * Pattern (same in all 9 divination apps):
 *  - Off by default (FIREBASE_ENABLED = false). While off, nothing is downloaded,
 *    no anonymous user is created, no Firestore reads happen, and every method
 *    resolves to a harmless empty value with no console noise.
 *  - When on, the modular v10 SDK is lazy-loaded from gstatic on first use, with a
 *    single initializeApp (reuses an existing app if present).
 *  - App Check (reCAPTCHA v3) starts only when APP_CHECK_SITE_KEY is set.
 *  - Data lives in `${APP_NAME}_readings`, owner-scoped by uid
 *    (rules: shared/spiritual/firestore.rules).
 *
 * The web apiKey below is a public identifier, not a secret. Restrict it in
 * Google Cloud Console > Credentials (HTTP referrers) to this app's domains.
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBgZZYMrPdS8pkPgb4jAXupCzMzoKYO7ZE",
  authDomain: "oracle-mdo3d.firebaseapp.com",
  projectId: "oracle-mdo3d",
  storageBucket: "oracle-mdo3d.firebasestorage.app",
  messagingSenderId: "877359174325",
  appId: "1:877359174325:web:fac5eaa9bc7d5a164ce4fc"
};

const APP_NAME = 'tarot';

// Feature flags. Flip FIREBASE_ENABLED only when a feature (e.g. saved reading
// history) actually calls saveReading/getReadingHistory.
const FIREBASE_ENABLED = false;
// reCAPTCHA v3 site key registered in Firebase Console > App Check. Empty = off.
const APP_CHECK_SITE_KEY = '';

const SDK_VERSION = '10.7.1';
const SDK_BASE = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

class FirebaseService {
  constructor() {
    this.config = FIREBASE_CONFIG;
    this.enabled = FIREBASE_ENABLED;
    this.app = null;
    this.auth = null;
    this.db = null;
    this.initialized = false;
    this._sdk = null;
    this._initPromise = null;
  }

  /** Lazy, idempotent. Resolves true when Firebase is ready, false when disabled or unavailable. */
  initialize() {
    if (!this.enabled) return Promise.resolve(false);
    if (!this._initPromise) {
      this._initPromise = this._load().catch((error) => {
        console.warn('[Firebase] unavailable:', error?.message || error);
        this._initPromise = null; // allow a later retry
        return false;
      });
    }
    return this._initPromise;
  }

  async _load() {
    const [appMod, authMod, fsMod] = await Promise.all([
      import(`${SDK_BASE}/firebase-app.js`),
      import(`${SDK_BASE}/firebase-auth.js`),
      import(`${SDK_BASE}/firebase-firestore.js`)
    ]);
    this._sdk = { ...appMod, ...authMod, ...fsMod };
    const { getApps, getApp, initializeApp, getAuth, getFirestore } = this._sdk;
    this.app = getApps().length ? getApp() : initializeApp(this.config);

    if (APP_CHECK_SITE_KEY) {
      try {
        const { initializeAppCheck, ReCaptchaV3Provider } = await import(`${SDK_BASE}/firebase-app-check.js`);
        initializeAppCheck(this.app, {
          provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
          isTokenAutoRefreshEnabled: true
        });
      } catch (error) {
        console.warn('[Firebase] App Check not started:', error?.message || error);
      }
    }

    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
    this.initialized = true;
    return true;
  }

  /** Anonymous sign-in on demand only (never on page load). */
  async signInAnonymously() {
    if (!(await this.initialize())) return null;
    try {
      if (this.auth.currentUser) return this.auth.currentUser;
      const result = await this._sdk.signInAnonymously(this.auth);
      return result.user;
    } catch (error) {
      console.warn('[Firebase] Anonymous sign-in failed:', error?.message || error);
      return null;
    }
  }

  getAuth() { return this.auth; }
  getFirestore() { return this.db; }
  getCurrentUser() { return this.auth?.currentUser || null; }

  async saveReading(readingData) {
    const user = await this.signInAnonymously();
    if (!user) return null;
    try {
      const { collection, addDoc, serverTimestamp } = this._sdk;
      const ref = await addDoc(collection(this.db, `${APP_NAME}_readings`), {
        ...readingData,
        uid: user.uid,
        timestamp: serverTimestamp()
      });
      return ref.id;
    } catch (error) {
      console.warn('[Firebase] saveReading failed:', error?.message || error);
      return null;
    }
  }

  async getReadingHistory(maxItems = 20) {
    const user = await this.signInAnonymously();
    if (!user) return [];
    try {
      const { collection, query, where, orderBy, limit, getDocs } = this._sdk;
      const q = query(
        collection(this.db, `${APP_NAME}_readings`),
        where('uid', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(maxItems)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.warn('[Firebase] getReadingHistory failed:', error?.message || error);
      return [];
    }
  }

  // getPremiumStatus() was removed on purpose: it read a client-writable
  // `users/{uid}` doc on every page view. Paid status comes only from the API's
  // Stripe verification (window.PremiumEntitlement + server-side verifyPayment).
}

export { FirebaseService, FirebaseService as FirebaseConfig };
export const firebaseConfig = new FirebaseService();
