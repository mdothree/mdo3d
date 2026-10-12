import { createContext, useContext, useEffect, useState } from 'react';
import {
  authConfigured,
  onAuthChange,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOut,
} from '../lib/firebase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthChange((u) => { setUser(u); setLoading(false); }), []);

  const value = {
    user,
    loading,
    configured: authConfigured,
    isAuthenticated: !!user,
    login: signInWithEmail,
    signup: signUpWithEmail,
    loginWithGoogle: signInWithGoogle,
    logout: signOut,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
