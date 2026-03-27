/**
 * Firebase Configuration for Oracle Cards
 */

export class FirebaseConfig {
  constructor() {
    this.config = {
      apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "your_firebase_api_key",
      authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "oracle-mdo3d.firebaseapp.com",
      projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "oracle-mdo3d",
      messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
      appId: import.meta.env?.VITE_FIREBASE_APP_ID || "your_app_id"
    };

    this.app = null;
    this.auth = null;
    this.db = null;
  }

  async initialize() {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK not loaded. Include Firebase CDN scripts in HTML.');
      return false;
    }

    try {
      this.app = firebase.initializeApp(this.config);
      this.auth = firebase.auth();
      this.db = firebase.firestore();

      console.log('Firebase initialized successfully');
      return true;
    } catch (error) {
      console.error('Firebase initialization error:', error);
      return false;
    }
  }

  getAuth() {
    return this.auth;
  }

  getFirestore() {
    return this.db;
  }
}

export const firebaseConfig = new FirebaseConfig();
