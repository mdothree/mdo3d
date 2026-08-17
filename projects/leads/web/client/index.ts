/**
 * FL Sunbiz Leads - Client Library
 *
 * Usage:
 *   import { initFirebase, signInWithEmail, listProfiles } from '@/client';
 */

// Firebase auth
export {
  initFirebase,
  getFirebaseAuth,
  getIdToken,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOut,
  onAuthChange,
  getCurrentUser,
  isAuthenticated,
  type User,
} from './firebase';

// API client
export {
  listProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  createCheckout,
  startCheckout,
  syncProfile,
  healthCheck,
} from './api';

// Types
export type {
  Profile,
  ProfileSettings,
  ProfileCreateRequest,
  ProfileUpdateRequest,
  DeliverySettings,
  CheckoutRequest,
  CheckoutResponse,
  ApiResponse,
} from './types';

// Constants
export {
  FL_COUNTIES,
  FILING_TYPES,
  DEFAULT_PROFILE_SETTINGS,
} from './types';
