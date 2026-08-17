/**
 * API client for backend
 */

import { getIdToken } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
  const token = await getIdToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Profile API

export async function listProfiles() {
  return apiRequest('/profiles');
}

export async function getProfile(profileId) {
  return apiRequest(`/profiles/${profileId}`);
}

export async function createProfile(data) {
  return apiRequest('/profiles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProfile(profileId, data) {
  return apiRequest(`/profiles/${profileId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProfile(profileId) {
  return apiRequest(`/profiles/${profileId}`, {
    method: 'DELETE',
  });
}

// Checkout API

export async function createCheckout(profileId, priceId) {
  const successUrl = `${window.location.origin}/dashboard?payment=success&profile=${profileId}`;
  const cancelUrl = `${window.location.origin}/dashboard?payment=cancelled`;

  return apiRequest('/checkout', {
    method: 'POST',
    body: JSON.stringify({
      profile_id: profileId,
      price_id: priceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
    }),
  });
}

export async function startCheckout(profileId, priceId) {
  const result = await createCheckout(profileId, priceId);
  if (result.checkout_url) {
    window.location.href = result.checkout_url;
  }
}

// Code Redemption API

export async function redeemCode(profileId, code) {
  return apiRequest('/redeem-code', {
    method: 'POST',
    body: JSON.stringify({
      profile_id: profileId,
      code: code,
    }),
  });
}

// Pipeline API

export async function runPipeline(profileId) {
  return apiRequest(`/profiles/${profileId}/run`, { method: 'POST' });
}

// Leads API

export async function getProfileLeads(profileId, limit = 50, offset = 0) {
  return apiRequest(`/profiles/${profileId}/leads?limit=${limit}&offset=${offset}`);
}

export async function getProfileStats(profileId) {
  return apiRequest(`/profiles/${profileId}/stats`);
}

// Health check

export async function healthCheck() {
  const response = await fetch(`${API_URL}/health`);
  return response.json();
}
