/**
 * Authentication Service
 * Handles user authentication (optional for tarot platform)
 */

class AuthService {
    constructor() {
        this.currentUser = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        // HID-011: storage can be blocked (private browsing, blocked site data). Sign-in is optional, so the
        // reading keeps working; the save/journal actions tell the visitor when nothing can be kept.
        try {
            const savedUser = localStorage.getItem('tarot_user');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
            }
            this.storageAvailable = true;
        } catch (error) {
            this.storageAvailable = false;
        }
        this.initialized = true;
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
        try { localStorage.setItem('tarot_user', JSON.stringify(user)); } catch (e) { this.storageAvailable = false; }
        return user;
    }

    async signOut() {
        this.currentUser = null;
        try { localStorage.removeItem('tarot_user'); } catch (e) { /* storage blocked: nothing stored */ }
    }
}

export const authService = new AuthService();
