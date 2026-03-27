/**
 * Authentication Service
 * Handles user authentication (optional for dream interpreter)
 */

class AuthService {
    constructor() {
        this.currentUser = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Check for existing session in localStorage
            const savedUser = localStorage.getItem('dream_user');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
            }

            this.initialized = true;
        } catch (error) {
            console.error('Auth initialization failed:', error);
            this.initialized = true;
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Simple anonymous user creation for tracking
    async createAnonymousUser() {
        const user = {
            uid: 'anon_' + Date.now(),
            isAnonymous: true,
            createdAt: new Date().toISOString()
        };

        this.currentUser = user;
        localStorage.setItem('dream_user', JSON.stringify(user));
        return user;
    }

    async signOut() {
        this.currentUser = null;
        localStorage.removeItem('dream_user');
    }
}

export const authService = new AuthService();
