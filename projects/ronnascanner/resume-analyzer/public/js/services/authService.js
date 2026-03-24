/**
 * Authentication Service
 * Handles user sign-in, sign-up, and session management
 */

import { firebaseConfig } from '../config/firebase.js';

export class AuthService {
  constructor() {
    this.auth = null;
    this.currentUser = null;
  }

  async initialize() {
    this.auth = firebaseConfig.getAuth();
    
    // Listen for auth state changes
    this.auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      this.onAuthStateChanged(user);
    });
  }

  onAuthStateChanged(user) {
    if (user) {
      console.log('User signed in:', user.email);
      this.updateUI(user);
    } else {
      console.log('User signed out');
      this.updateUI(null);
    }
  }

  updateUI(user) {
    const signInBtn = document.getElementById('sign-in-btn');
    if (signInBtn) {
      if (user) {
        signInBtn.textContent = user.email;
        signInBtn.onclick = () => this.showAccountMenu();
      } else {
        signInBtn.textContent = 'Sign In';
        signInBtn.onclick = () => this.showSignInModal();
      }
    }
  }

  async signInWithEmail(email, password) {
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  async signUpWithEmail(email, password) {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      
      // Send verification email
      await userCredential.user.sendEmailVerification();
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  }

  async signInWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await this.auth.signInWithPopup(provider);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      await this.auth.signOut();
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  async resetPassword(email) {
    try {
      await this.auth.sendPasswordResetEmail(email);
      return { success: true, message: 'Password reset email sent' };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: error.message };
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isSignedIn() {
    return this.currentUser !== null;
  }

  async getIdToken() {
    if (!this.currentUser) {
      return null;
    }
    return await this.currentUser.getIdToken();
  }

  showSignInModal() {
    // TODO: Implement sign-in modal UI
    const email = prompt('Email:');
    const password = prompt('Password:');
    
    if (email && password) {
      this.signInWithEmail(email, password);
    }
  }

  showAccountMenu() {
    if (confirm('Sign out?')) {
      this.signOut();
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
