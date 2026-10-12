/**
 * Firebase auth. Initialised only when the build has a Firebase config; without
 * one, sign-in is reported as unavailable (no fake session, no crash).
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const authConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let auth = null;
if (authConfigured) {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);

  // App Check (OFF by default): set VITE_FIREBASE_APPCHECK_ENABLED=true and
  // VITE_FIREBASE_APPCHECK_SITE_KEY=<reCAPTCHA Enterprise site key> at build time after
  // registering the key in Firebase console > App Check (mdo3d-leads). Keep enforcement
  // off until the console shows verified traffic.
  if (import.meta.env.VITE_FIREBASE_APPCHECK_ENABLED === 'true' && import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY) {
    import('firebase/app-check')
      .then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      }))
      .catch((e) => console.warn('[AppCheck] init failed:', e?.message));
  }
}

function requireAuth() {
  if (!auth) throw new Error('Sign-in is not available on this build.');
  return auth;
}

export async function getIdToken() {
  const user = auth?.currentUser;
  return user ? user.getIdToken() : null;
}

export async function signInWithEmail(email, password) {
  return (await signInWithEmailAndPassword(requireAuth(), email, password)).user;
}

export async function signUpWithEmail(email, password) {
  return (await createUserWithEmailAndPassword(requireAuth(), email, password)).user;
}

export async function signInWithGoogle() {
  return (await signInWithPopup(requireAuth(), new GoogleAuthProvider())).user;
}

export async function signOut() {
  if (auth) await firebaseSignOut(auth);
}

export function onAuthChange(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
