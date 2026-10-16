import { useEffect, useState } from 'react';
import Notice from '../components/Notice.jsx';
import { Link } from '../lib/router.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useAccount } from '../hooks/useAccount.jsx';
import { createCheckout, redeemPromo } from '../lib/api.js';

function PromoForm({ onRedeemed }) {
  const [code, setCode] = useState('');
  const [state, setState] = useState({ status: 'idle', message: '' });
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setState({ status: 'error', message: 'Enter a promo code.' });
      return;
    }
    setState({ status: 'loading', message: '' });
    try {
      const r = await redeemPromo(code.trim());
      setState({ status: 'ok', message: r?.message || 'Code accepted. Your access is active.' });
      onRedeemed();
    } catch (err) {
      const message = err.kind === 'invalid' ? (err.message || 'That code is not valid.')
        : err.kind === 'not_found' ? 'Promo codes cannot be redeemed yet. Nothing was applied.'
        : err.kind === 'unauthenticated' ? 'Sign in first, then redeem your code.'
        : 'Service unavailable — the code was not applied. Try again shortly.';
      setState({ status: 'error', message });
    }
  };
  return (
    <form className="promo" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="promo">Early-access promo code</label>
        <div className="inline">
          <input id="promo" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off"
            autoCapitalize="characters" spellCheck="false"
            aria-invalid={state.status === 'error' ? 'true' : undefined}
            aria-describedby={state.message ? 'promo-msg' : undefined} />
          <button type="submit" className="btn btn-primary" disabled={state.status === 'loading'}>Redeem</button>
        </div>
      </div>
      {state.message && (
        <p id="promo-msg" className={state.status === 'error' ? 'field-error' : 'text-ok'} role={state.status === 'error' ? 'alert' : 'status'}>
          {state.message}
        </p>
      )}
    </form>
  );
}

function Checkout() {
  const [state, setState] = useState({ status: 'idle', message: '' });
  const go = async () => {
    setState({ status: 'loading', message: '' });
    try {
      window.location.assign(await createCheckout());
    } catch {
      setState({ status: 'error', message: 'Checkout is not available right now. You were not charged.' });
    }
  };
  return (
    <>
      <button type="button" className="btn btn-primary" onClick={go} disabled={state.status === 'loading'}>Continue to checkout</button>
      {state.message && <p className="field-error" role="alert">{state.message}</p>}
    </>
  );
}

export default function AccountPage() {
  const { isAuthenticated, user } = useAuth();
  const { status, account, planActive, checkoutAvailable, refresh } = useAccount();
  const [returnNote, setReturnNote] = useState('');

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const c = p.get('checkout');
    if (c === 'success') setReturnNote('Thanks — your payment is being confirmed. Your plan shows as active once confirmed.');
    if (c === 'cancelled') setReturnNote('Checkout was cancelled. You were not charged.');
    if (c) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  return (
    <div className="wrap page narrow">
      <div className="page-head">
        <p className="eyebrow">Account</p>
        <h1>Plan &amp; access</h1>
        <p className="lede">
          MDO3D Leads is a paid product. Searching, CSV export and saved searches require an active plan.
          Early access is available with a promo code.
        </p>
      </div>
      {returnNote && <Notice title={returnNote} />}

      {!isAuthenticated ? (
        <section className="panel" aria-labelledby="acc-signin">
          <h2 id="acc-signin" className="panel-title">Sign in to manage access</h2>
          <p>Plans are opening soon. If you have an early-access promo code, sign in to redeem it.</p>
          <Link to="/signin" className="btn btn-primary">Sign in</Link>
        </section>
      ) : status === 'loading' || status === 'idle' ? (
        <Notice title="Loading your plan…" />
      ) : status === 'error' ? (
        <Notice tone="error" title="Service unavailable — your plan status could not be loaded."
          action={<button type="button" className="btn btn-ghost" onClick={refresh}>Try again</button>} />
      ) : (
        <>
          <section className="panel" aria-labelledby="acc-plan">
            <h2 id="acc-plan" className="panel-title">Your plan</h2>
            <p className="muted small">Signed in as {account?.email || user?.email}</p>
            {planActive ? (
              <p className="text-ok">
                Active{account.plan.name ? `: ${account.plan.name}` : ''}
                {account.plan.source === 'promo' ? ' (early access)' : ''}
                {account.plan.renews_at ? ` · renews ${account.plan.renews_at.slice(0, 10)}` : ''}
              </p>
            ) : (
              <p>No active plan.</p>
            )}
          </section>

          {!planActive && (
            <section className="panel" aria-labelledby="acc-buy">
              <h2 id="acc-buy" className="panel-title">Get access</h2>
              {checkoutAvailable ? (
                <Checkout />
              ) : (
                <p><strong>Plans opening soon.</strong> Checkout is not open yet, so there is nothing to pay today.</p>
              )}
              <PromoForm onRedeemed={refresh} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
