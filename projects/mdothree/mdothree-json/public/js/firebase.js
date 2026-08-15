/**
 * Firebase wrapper for stripe-paywall.js compatibility
 * Bridges the config/firebase.js service with the expected interface
 */

import { firebaseConfig } from './config/firebase.js';

// Initialize function
export async function initFirebase() {
  return await firebaseConfig.initialize();
}

// Getters for auth and db (these are resolved after initFirebase is called)
export const auth = {
  get currentUser() { return firebaseConfig.getCurrentUser(); },
  signInAnonymously: () => firebaseConfig.signInAnonymously(),
  onAuthStateChanged: (callback) => {
    const auth = firebaseConfig.getAuth();
    if (auth) return auth.onAuthStateChanged(callback);
    // If not initialized, call callback with null
    callback(null);
    return () => {};
  }
};

export const db = {
  collection: (name) => {
    const firestore = firebaseConfig.getFirestore();
    if (firestore) return firestore.collection(name);
    throw new Error('Firestore not initialized. Call initFirebase() first.');
  }
};

// Re-export firebaseConfig for direct access
export { firebaseConfig };
