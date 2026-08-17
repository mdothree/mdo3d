/**
 * FL Sunbiz Leads - API Client
 * HTTP client for backend API with Firebase auth
 */

import { getIdToken } from './firebase';
import type {
  Profile,
  ProfileCreateRequest,
  ProfileUpdateRequest,
  ProfileSettings,
  CheckoutRequest,
  CheckoutResponse,
  ApiResponse,
} from './types';

// API base URL - loaded from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = await getIdToken();
    if (!token) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.detail || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Request failed' };
  }
}

// Profile API

/**
 * List all profiles for current user
 */
export async function listProfiles(): Promise<ApiResponse<{ profiles: Profile[] }>> {
  return apiRequest('/profiles');
}

/**
 * Get a specific profile by ID
 */
export async function getProfile(profileId: string): Promise<ApiResponse<Profile>> {
  return apiRequest(`/profiles/${profileId}`);
}

/**
 * Create a new profile
 */
export async function createProfile(
  request: ProfileCreateRequest
): Promise<ApiResponse<Profile & { message: string }>> {
  return apiRequest('/profiles', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Update an existing profile
 */
export async function updateProfile(
  profileId: string,
  request: ProfileUpdateRequest
): Promise<ApiResponse<{ ok: boolean; message: string }>> {
  return apiRequest(`/profiles/${profileId}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  });
}

/**
 * Delete a profile
 */
export async function deleteProfile(
  profileId: string
): Promise<ApiResponse<{ ok: boolean; message: string }>> {
  return apiRequest(`/profiles/${profileId}`, {
    method: 'DELETE',
  });
}

// Payment API

/**
 * Create Stripe checkout session
 */
export async function createCheckout(
  request: CheckoutRequest
): Promise<ApiResponse<CheckoutResponse>> {
  return apiRequest('/checkout', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Convenience function: Create checkout and redirect
 */
export async function startCheckout(
  profileId: string,
  priceId: string
): Promise<void> {
  const successUrl = `${window.location.origin}/dashboard?payment=success&profile=${profileId}`;
  const cancelUrl = `${window.location.origin}/dashboard?payment=cancelled`;

  const result = await createCheckout({
    profile_id: profileId,
    price_id: priceId,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  if (result.data?.checkout_url) {
    window.location.href = result.data.checkout_url;
  }
}

// Sync API (internal use)

/**
 * Sync profile to backend (called after payment success)
 */
export async function syncProfile(
  profileId: string,
  settings: ProfileSettings,
  apiKey: string
): Promise<ApiResponse<{ ok: boolean; message: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        profile_id: profileId,
        data: settings,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.detail || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Sync failed' };
  }
}

// Health check

/**
 * Check API health
 */
export async function healthCheck(): Promise<ApiResponse<{
  status: string;
  timestamp: string;
}>> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Health check failed' };
  }
}
