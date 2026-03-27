/**
 * API Configuration and Client
 * Handles all API communication with the backend
 */

const API_CONFIG = {
    // Use environment variable in production, fallback to localhost for development
    baseURL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3004'
        : 'https://dream-interpreter-api.railway.app',
    timeout: 30000
};

class APIClient {
    constructor(config) {
        this.baseURL = config.baseURL;
        this.timeout = config.timeout;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error;
        }
    }

    // Health check
    async checkHealth() {
        try {
            return await this.request('/health');
        } catch (error) {
            return { status: 'offline', error: error.message };
        }
    }

    // Generate dream interpretation
    async interpretDream(data) {
        return await this.request('/api/dream/interpret', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Create Stripe checkout session
    async createCheckoutSession({ readingType, email, userId = null }) {
        return await this.request('/api/payment/create-checkout', {
            method: 'POST',
            body: JSON.stringify({
                readingType,
                email,
                userId
            })
        });
    }

    // Verify payment
    async verifyPayment(sessionId) {
        return await this.request('/api/payment/verify', {
            method: 'POST',
            body: JSON.stringify({ sessionId })
        });
    }
}

export const apiClient = new APIClient(API_CONFIG);
