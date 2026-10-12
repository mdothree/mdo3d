/**
 * MDO3D Leads - Client Library (FL first; per-state)
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

// v1 search / export / account contract (see web/frontend/README.md "API contract")
export {
  createLeadsClient,
  ApiError,
  errorKindForStatus,
  isStripeCheckoutUrl,
  normalizeFiling,
  queryString,
  PATHS,
  type LeadsClient,
  type LeadsClientOptions,
  type ApiErrorKind,
  type Filing,
  type FilingQuery,
  type FilingPage,
  type Address,
  type Contact,
  type FilingRow,
  type EntityKind,
  type StateCoverage,
  type Vertical,
  type FilingType,
  type FilingTypeList,
  type CsvExport,
  type Account,
  type SavedSearch,
} from './search';
