/**
 * Login/Signup page with Firebase Auth
 */

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import Btn from '../components/Btn.jsx';
import Field from '../components/Field.jsx';

export default function LoginPage() {
  const { login, signup, loginWithGoogle, error } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setLocalError(null);
    try {
      await loginWithGoogle();
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ob-root">
      <div className="ob-top">
        <div className="ob-logo">MDO3D LEADS</div>
      </div>

      <div className="ob-body">
        <div className="ob-card ob-card-sm">
          <div className="ob-sub-label">
            {mode === 'login' ? 'Welcome Back' : 'Get Started'}
          </div>
          <div className="ob-title">
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </div>

          {(localError || error) && (
            <div style={{
              padding: '12px 16px',
              background: 'var(--red-bg)',
              border: '1px solid var(--red-border)',
              marginBottom: 16,
              fontSize: 11,
              color: 'var(--red)',
            }}>
              {localError || error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <div style={{ marginTop: 8 }}>
              <Btn
                variant="ink"
                size="lg"
                className="btn-full"
                type="submit"
                disabled={loading || !email || !password}
              >
                {loading ? '◌  Processing...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
              </Btn>
            </div>
          </form>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '20px 0',
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 10, color: 'var(--light)', textTransform: 'uppercase', letterSpacing: 1 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <Btn
            variant="ghost"
            size="lg"
            className="btn-full"
            onClick={handleGoogle}
            disabled={loading}
          >
            Continue with Google
          </Btn>

          <div style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 11,
            color: 'var(--light)',
          }}>
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <span
                  style={{ color: 'var(--ink)', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => setMode('signup')}
                >
                  Sign up
                </span>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <span
                  style={{ color: 'var(--ink)', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => setMode('login')}
                >
                  Sign in
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
