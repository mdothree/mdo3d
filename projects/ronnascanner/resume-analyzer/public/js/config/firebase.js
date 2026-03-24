/**
 * Firebase Configuration
 * Initialize Firebase services (Auth, Firestore, Storage)
 */

// Firebase will be loaded via CDN in HTML
// This file provides configuration and initialization

export class FirebaseConfig {
  constructor() {
    this.config = {
      apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "your_firebase_api_key",
      authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "resume-analyzer.firebaseapp.com",
      projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "resume-analyzer",
      storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "resume-analyzer.appspot.com",
      messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
      appId: import.meta.env?.VITE_FIREBASE_APP_ID || "your_app_id"
    };

    this.app = null;
    this.auth = null;
    this.db = null;
    this.storage = null;
  }

  async initialize() {
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK not loaded. Include Firebase CDN scripts in HTML.');
      return false;
    }

    try {
      // Initialize Firebase
      this.app = firebase.initializeApp(this.config);
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      this.storage = firebase.storage();

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

  getStorage() {
    return this.storage;
  }
}

// Export singleton instance
export const firebaseConfig = new FirebaseConfig();
