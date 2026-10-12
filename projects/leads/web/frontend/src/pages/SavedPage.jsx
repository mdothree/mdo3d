import { useEffect, useState } from 'react';
import Notice from '../components/Notice.jsx';
import { Link } from '../lib/router.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useAccount } from '../hooks/useAccount.jsx';
import { deleteSavedSearch, listSavedSearches } from '../lib/api.js';
import { STATE_NAME } from '../lib/states.js';

function describe(q) {
  const parts = [STATE_NAME[q.state] || q.state];
  if (q.county) parts.push(q.county);
  if (q.filing_type) parts.push(q.filing_type);
  if (q.vertical) parts.push(q.vertical);
  if (q.keyword) parts.push(`“${q.keyword}”`);
  if (q.filed_from || q.filed_to) parts.push(`${q.filed_from || '…'} to ${q.filed_to || '…'}`);
  return parts.join(' · ');
}

function SavedList() {
  const [state, setState] = useState({ status: 'loading', items: [], error: null });
  const load = () => {
    setState((s) => ({ ...s, status: 'loading' }));
    listSavedSearches()
      .then((r) => setState({ status: 'ok', items: r.saved_searches || [], error: null }))
      .catch((error) => setState({ status: 'error', items: [], error }));
  };
  useEffect(load, []);

  if (state.status === 'loading') return <Notice title="Loading saved searches…" />;
  if (state.status === 'error') {
    return <Notice tone="error" title="Service unavailable — saved searches could not be loaded." />;
  }
  if (!state.items.length) {
    return (
      <Notice title="No saved searches yet."
        action={<Link to="/" className="btn btn-primary">Start a search</Link>}>
        Run a search, then choose “Save search (weekly email)”.
      </Notice>
    );
  }
  return (
    <ul className="saved-list">
      {state.items.map((s) => (
        <li key={s.id} className="card">
          <h2 className="card-title">{s.name}</h2>
          <p className="muted small">{describe(s.query)}</p>
          <p className="small">Weekly email{s.last_sent_at ? ` · last sent ${s.last_sent_at.slice(0, 10)}` : ' · not sent yet'}</p>
          <button type="button" className="btn btn-ghost"
            onClick={() => deleteSavedSearch(s.id).then(load).catch(() => setState((st) => ({ ...st, status: 'error' })))}>
            Delete <span className="sr-only">{s.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function SavedPage() {
  const { isAuthenticated } = useAuth();
  const { status, savedSearchesAvailable, planActive } = useAccount();

  let body;
  if (!savedSearchesAvailable) {
    body = (
      <Notice title="Saved searches are coming soon.">
        You will be able to save a search and get new matching filings by email each week.
        This is not live yet, so nothing is scheduled or sent today.
      </Notice>
    );
  } else if (!isAuthenticated) {
    body = <Notice tone="warn" title="Sign in to see your saved searches." action={<Link to="/signin" className="btn btn-primary">Sign in</Link>} />;
  } else if (!planActive) {
    body = <Notice tone="warn" title="Saved searches need an active plan." action={<Link to="/account" className="btn btn-primary">See plan options</Link>} />;
  } else {
    body = <SavedList />;
  }

  return (
    <div className="wrap page narrow">
      <h1>Saved searches</h1>
      <p className="lede">Weekly email of new filings that match a search.</p>
      {status === 'loading' ? <Notice title="Loading…" /> : body}
    </div>
  );
}
