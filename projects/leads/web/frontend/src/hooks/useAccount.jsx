import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './useAuth.jsx';
import { getAccount, listProfiles } from '../lib/api.js';

/**
 * Account / plan state from GET /v1/account (live on the backend). When signed
 * out nothing is fetched. If an older backend answers 404, plan status is
 * derived from GET /profiles (any paid profile = active, as the backend's
 * entitlement check does) and every feature switch stays off.
 */
const AccountContext = createContext(null);

export function AccountProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [state, setState] = useState({ status: 'idle', account: null, error: null });

  const refresh = useCallback(() => {
    if (!isAuthenticated) {
      setState({ status: 'signed_out', account: null, error: null });
      return;
    }
    setState((s) => ({ ...s, status: 'loading' }));
    getAccount()
      .then((account) => setState({ status: 'ok', account, error: null }))
      .catch((err) => {
        if (err.kind !== 'not_found') throw err;
        return listProfiles().then((r) => {
          const paid = (r.profiles || []).some((p) => p.paid);
          setState({
            status: 'ok',
            account: {
              email: null,
              plan: { active: paid, name: null, source: null, renews_at: null },
              features: { checkout: false, saved_searches: false, saved_search_email: false, promo_codes: false },
            },
            error: null,
          });
        });
      })
      .catch((err) => setState({ status: 'error', account: null, error: err }));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) refresh();
  }, [authLoading, refresh]);

  return <AccountContext.Provider value={{ ...state, refresh }}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used within AccountProvider');
  const features = ctx.account?.features || {};
  return {
    ...ctx,
    planActive: !!ctx.account?.plan?.active,
    checkoutAvailable: features.checkout === true,
    savedSearchesAvailable: features.saved_searches === true,
    savedSearchEmailOn: features.saved_search_email === true,
    promoAvailable: features.promo_codes === true,
  };
}
