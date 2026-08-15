/**
 * Firebase Configuration for Oracle Cards
 * Uses shared MDO3D Spiritual Firebase project (oracle-mdo3d)
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBgZZYMrPdS8pkPgb4jAXupCzMzoKYO7ZE",
  authDomain: "oracle-mdo3d.firebaseapp.com",
  projectId: "oracle-mdo3d",
  storageBucket: "oracle-mdo3d.firebasestorage.app",
  messagingSenderId: "877359174325",
  appId: "1:877359174325:web:fac5eaa9bc7d5a164ce4fc"
};

const APP_NAME = 'oracle';

class FirebaseService {
  constructor() {
    this.config = FIREBASE_CONFIG;
    this.app = null;
    this.auth = null;
    this.db = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return true;

    // Check for Firebase SDK (loaded via CDN in HTML)
    if (typeof firebase === 'undefined') {
      console.warn('[Firebase] SDK not loaded. Include Firebase CDN scripts in HTML.');
      return false;
    }

    try {
      // Check if already initialized
      if (firebase.apps.length === 0) {
        this.app = firebase.initializeApp(this.config);
      } else {
        this.app = firebase.apps[0];
      }

      this.auth = firebase.auth();
      this.db = firebase.firestore();
      this.initialized = true;

      // Auto sign-in anonymously
      await this.signInAnonymously();

      console.log('[Firebase] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[Firebase] Initialization error:', error);
      return false;
    }
  }

  async signInAnonymously() {
    if (!this.auth) return null;

    try {
      // Check if already signed in
      if (this.auth.currentUser) {
        return this.auth.currentUser;
      }

      const result = await this.auth.signInAnonymously();
      console.log('[Firebase] Signed in anonymously');
      return result.user;
    } catch (error) {
      console.warn('[Firebase] Anonymous sign-in failed:', error.message);
      return null;
    }
  }

  getAuth() {
    return this.auth;
  }

  getFirestore() {
    return this.db;
  }

  getCurrentUser() {
    return this.auth?.currentUser || null;
  }

  // Save reading to Firestore
  async saveReading(readingData) {
    if (!this.db || !this.auth?.currentUser) return null;

    try {
      const ref = await this.db.collection(`${APP_NAME}_readings`).add({
        uid: this.auth.currentUser.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ...readingData
      });
      return ref.id;
    } catch (error) {
      console.warn('[Firebase] saveReading failed:', error.message);
      return null;
    }
  }

  // Get reading history
  async getReadingHistory(maxItems = 20) {
    if (!this.db || !this.auth?.currentUser) return [];

    try {
      const snapshot = await this.db.collection(`${APP_NAME}_readings`)
        .where('uid', '==', this.auth.currentUser.uid)
        .orderBy('timestamp', 'desc')
        .limit(maxItems)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.warn('[Firebase] getReadingHistory failed:', error.message);
      return [];
    }
  }

  // Check premium status
  async getPremiumStatus() {
    if (!this.db || !this.auth?.currentUser) return { isPremium: false };

    try {
      const doc = await this.db.collection('users').doc(this.auth.currentUser.uid).get();
      if (doc.exists) {
        return doc.data();
      }
      return { isPremium: false };
    } catch (error) {
      console.warn('[Firebase] getPremiumStatus failed:', error.message);
      return { isPremium: false };
    }
  }
}

// Export as firebaseConfig to match app.js import
export const firebaseConfig = new FirebaseService();
