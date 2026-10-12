import { useState } from 'react';
import Notice from '../components/Notice.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useRouter } from '../lib/router.jsx';

const friendly = (err) => {
  const code = err?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'Email or password is incorrect.';
  if (code.includes('email-already-in-use')) return 'An account with that email already exists. Sign in instead.';
  if (code.includes('weak-password')) return 'Use a password of at least 8 characters.';
  if (code.includes('popup-closed')) return 'The Google window was closed before sign-in finished.';
  return err?.message || 'Sign-in failed.';
};

export default function SignInPage() {
  const { configured, isAuthenticated, user, login, signup, loginWithGoogle } = useAuth();
  const { navigate } = useRouter();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!configured) {
    return (
      <div className="wrap page narrow">
        <h1>Sign in</h1>
        <Notice tone="warn" title="Sign-in is not available on this build.">
          Accounts are not connected yet. No account was created.
        </Notice>
      </div>
    );
  }
  if (isAuthenticated) {
    return (
      <div className="wrap page narrow">
        <h1>Signed in</h1>
        <p>You are signed in as {user.email}.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>Go to search</button>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Enter your email and password.'); return; }
    setBusy(true);
    try {
      await (mode === 'signin' ? login(email, password) : signup(email, password));
      navigate('/');
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError('');
    setBusy(true);
    try { await loginWithGoogle(); navigate('/'); } catch (err) { setError(friendly(err)); } finally { setBusy(false); }
  };

  return (
    <div className="wrap page narrow">
      <h1>{mode === 'signin' ? 'Sign in' : 'Create an account'}</h1>
      <p className="lede">An account is needed to redeem a promo code or start a plan.</p>
      <form className="panel" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="si-email">Email</label>
          <input id="si-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="si-pass">Password</label>
          <input id="si-pass" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>{mode === 'signin' ? 'Sign in' : 'Create account'}</button>
          <button type="button" className="btn btn-ghost" onClick={google} disabled={busy}>Continue with Google</button>
        </div>
        <p className="small">
          {mode === 'signin' ? 'New here?' : 'Already have an account?'}{' '}
          <button type="button" className="link-button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </form>
    </div>
  );
}
