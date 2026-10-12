import { useEffect, useRef, useState } from 'react';
import StatePicker from '../components/StatePicker.jsx';
import Results from '../components/Results.jsx';
import Notice from '../components/Notice.jsx';
import { Link } from '../lib/router.jsx';
import { useAccount } from '../hooks/useAccount.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { exportCsv, getCoverage, listVerticals, searchFilings, createSavedSearch } from '../lib/api.js';
import { ENTITY_KINDS, filingTypesFor, mergeStates, STATE_NAME } from '../lib/states.js';

const PAGE_SIZE = 50;
const DEFAULT_DAYS = 30;
const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// A state's daily feed also carries amendments to older entities, so "new filings"
// defaults to a filed-date window (the last 30 days).
function defaultForm() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - DEFAULT_DAYS);
  return { filing_type: '', entity_kind: '', vertical: '', q: '', date_from: isoLocal(from), date_to: isoLocal(to) };
}

function ErrorState({ error }) {
  const { isAuthenticated } = useAuth();
  if (error.kind === 'plan_required' && error.status === 403) {
    return (
      <Notice tone="warn" title="That state is not in your plan."
        action={<Link to="/account" className="btn btn-primary">See plan options</Link>}>
        {error.message}
      </Notice>
    );
  }
  if (error.kind === 'unauthenticated' || (!isAuthenticated && error.kind === 'plan_required')) {
    return (
      <Notice tone="warn" title="Sign in to search filings."
        action={<Link to="/signin" className="btn btn-primary">Sign in</Link>}>
        Search and export are available on an active plan.
      </Notice>
    );
  }
  if (error.kind === 'plan_required') {
    return (
      <Notice tone="warn" title="An active plan is required to search filings."
        action={<Link to="/account" className="btn btn-primary">See plan options</Link>}>
        Have an early-access promo code? Redeem it on the plan page.
      </Notice>
    );
  }
  if (error.kind === 'invalid') {
    return <Notice tone="error" title="Those filters could not be used.">{error.message}</Notice>;
  }
  return (
    <Notice tone="error" title="Service unavailable — no results were generated.">
      The filings service did not respond. Nothing is shown rather than stale or sample data. Try again in a few minutes.
    </Notice>
  );
}

export default function SearchPage() {
  const { planActive, savedSearchesAvailable } = useAccount();
  const [states, setStates] = useState(() => mergeStates(null));
  const [state, setState] = useState('FL');
  const [coverageStatus, setCoverageStatus] = useState('loading');
  const [verticals, setVerticals] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [formError, setFormError] = useState('');
  const [query, setQuery] = useState(null);
  const [result, setResult] = useState({ status: 'idle', page: null, error: null });
  const [exportState, setExportState] = useState({ status: 'idle', message: '' });
  const [saveState, setSaveState] = useState({ status: 'idle', message: '' });
  const resultsRef = useRef(null);

  useEffect(() => {
    getCoverage()
      .then((r) => {
        const merged = mergeStates(r.states || []);
        setStates(merged);
        const live = merged.filter((x) => x.status === 'live');
        setCoverageStatus(live.length ? 'ok' : 'none');
        setState((cur) => (live.some((x) => x.code === cur) ? cur : live[0]?.code || cur));
      })
      .catch(() => { setStates(mergeStates(null)); setCoverageStatus('unknown'); });
    listVerticals()
      .then((r) => setVerticals((r.verticals || []).map((v) => ({ value: v.id, label: v.label }))))
      .catch(() => setVerticals([]));
  }, []);

  const filingTypes = filingTypesFor(state);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const run = (q) => {
    setQuery(q);
    setResult({ status: 'loading', page: null, error: null });
    setExportState({ status: 'idle', message: '' });
    setSaveState({ status: 'idle', message: '' });
    searchFilings(q)
      .then((page) => setResult({ status: 'ok', page: { filings: page.filings || [], total: page.total ?? 0, offset: page.offset ?? q.offset }, error: null }))
      .catch((error) => setResult({ status: 'error', page: null, error }))
      .finally(() => resultsRef.current?.focus());
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (form.date_from && form.date_to && form.date_from > form.date_to) {
      setFormError('"Filed from" must be on or before "Filed to".');
      return;
    }
    setFormError('');
    run({ state, ...form, limit: PAGE_SIZE, offset: 0 });
  };

  const onReset = () => {
    setForm(defaultForm());
    setFormError('');
    setQuery(null);
    setResult({ status: 'idle', page: null, error: null });
  };

  const onExport = async () => {
    setExportState({ status: 'loading', message: 'Preparing CSV…' });
    try {
      const { blob, truncated } = await exportCsv(query);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filings-${query.state}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportState({ status: 'ok', message: truncated ? 'CSV downloaded (capped at the export row limit; narrow the filters for the rest).' : 'CSV downloaded.' });
    } catch (error) {
      const msg = error.status === 403 ? 'That state is not in your plan.'
        : error.kind === 'plan_required' ? 'CSV export needs an active plan.'
        : error.kind === 'unauthenticated' ? 'Sign in to export.'
        : 'Export failed — the service is unavailable. No file was generated.';
      setExportState({ status: 'error', message: msg });
    }
  };

  const onSave = async () => {
    const name = `${STATE_NAME[query.state] || query.state}${query.vertical ? ` · ${query.vertical}` : ''}${query.q ? ` · ${query.q}` : ''}`;
    setSaveState({ status: 'loading', message: 'Saving…' });
    try {
      const { limit, offset, ...q } = query; // eslint-disable-line no-unused-vars
      await createSavedSearch(name, q);
      setSaveState({ status: 'ok', message: 'Saved. You will get this search by email weekly.' });
    } catch {
      setSaveState({ status: 'error', message: 'Could not save this search. Nothing was scheduled.' });
    }
  };

  const page = result.page;
  const from = page ? page.offset + 1 : 0;
  const to = page ? page.offset + page.filings.length : 0;
  const caption = page ? `Filings ${from}–${to} of ${page.total.toLocaleString()}` : 'Filings';
  const selectedState = states.find((s) => s.code === state);

  return (
    <div className="wrap page">
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">Business filings · by state</p>
        <h1 id="hero-title">New business filings, as leads.</h1>
        <p className="lede">
          Search new state business registrations by filing type, entity kind, name keywords and filing date,
          then export to CSV. Contacts are shown only when verified from public sources — never guessed.
          Access requires an active plan.
        </p>
      </section>

      <div className="search-layout">
        <form className="panel filters" onSubmit={onSubmit} aria-labelledby="filters-title" noValidate>
          <h2 id="filters-title" className="panel-title">Filters</h2>
          <div className="filter-state">
          <StatePicker states={states} value={state} onChange={(c) => { setState(c); setForm((f) => ({ ...f, filing_type: '' })); }} />
          {selectedState?.latest_filed_date && (
            <p className="hint feed-date">
              {selectedState.filings ? `${selectedState.filings.toLocaleString()} filings · ` : ''}latest filed {selectedState.latest_filed_date}
            </p>
          )}
          {coverageStatus === 'none' && (
            <p className="hint feed-date">No state data has been loaded yet.</p>
          )}

          </div>
          <div className="filter-fields">
          <div className="field">
            <label htmlFor="f-type">Filing type</label>
            <select id="f-type" value={form.filing_type} onChange={set('filing_type')} disabled={!filingTypes.length}>
              <option value="">All filing types</option>
              {filingTypes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="field">
            <label htmlFor="f-kind">Entity kind</label>
            <select id="f-kind" value={form.entity_kind} onChange={set('entity_kind')}>
              <option value="">All entity kinds</option>
              {ENTITY_KINDS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {verticals.length > 0 && (
            <div className="field">
              <label htmlFor="f-vertical">Name contains… (keyword group)</label>
              <select id="f-vertical" value={form.vertical} onChange={set('vertical')} aria-describedby="f-vertical-hint">
                <option value="">Any keyword group</option>
                {verticals.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <p id="f-vertical-hint" className="hint">Matches words in the entity name only — not a verified industry.</p>
            </div>
          )}

          <div className="field">
            <label htmlFor="f-keyword">Entity name contains</label>
            <input id="f-keyword" type="search" value={form.q} onChange={set('q')}
              placeholder="e.g. roofing" autoComplete="off" />
          </div>

          <fieldset className="field-row">
            <legend>Filed date (default: last {DEFAULT_DAYS} days)</legend>
            <div className="field">
              <label htmlFor="f-from">From</label>
              <input id="f-from" type="date" value={form.date_from} onChange={set('date_from')}
                aria-invalid={formError ? 'true' : undefined} aria-describedby={formError ? 'f-date-err' : undefined} />
            </div>
            <div className="field">
              <label htmlFor="f-to">To</label>
              <input id="f-to" type="date" value={form.date_to} onChange={set('date_to')}
                aria-invalid={formError ? 'true' : undefined} aria-describedby={formError ? 'f-date-err' : undefined} />
            </div>
          </fieldset>
          {formError && <p id="f-date-err" className="field-error" role="alert">{formError}</p>}

          </div>
          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={result.status === 'loading' || coverageStatus === 'none'}>Search</button>
            <button type="button" className="btn btn-ghost" onClick={onReset}>Reset</button>
          </div>
        </form>

        <section className="results" aria-labelledby="results-title">
          <div className="results-head">
            <h2 id="results-title" className="panel-title" ref={resultsRef} tabIndex={-1}>Results</h2>
            <div className="toolbar">
              <button type="button" className="btn btn-secondary" onClick={onExport}
                disabled={result.status !== 'ok' || !page?.total || exportState.status === 'loading'}>
                Export CSV
              </button>
              {savedSearchesAvailable && planActive ? (
                <button type="button" className="btn btn-secondary" onClick={onSave}
                  disabled={result.status !== 'ok' || saveState.status === 'loading'}>
                  Save search (weekly email)
                </button>
              ) : (
                <span className="muted small">Saved searches with weekly email: <Link to="/saved">coming soon</Link></span>
              )}
            </div>
          </div>

          <div aria-live="polite" className="sr-only">
            {result.status === 'ok' ? `${page.total.toLocaleString()} filings found` : ''}
          </div>
          {exportState.message && (
            <p className={`small ${exportState.status === 'error' ? 'text-error' : 'muted'}`} role={exportState.status === 'error' ? 'alert' : 'status'}>
              {exportState.message}
            </p>
          )}
          {saveState.message && (
            <p className={`small ${saveState.status === 'error' ? 'text-error' : 'muted'}`} role={saveState.status === 'error' ? 'alert' : 'status'}>
              {saveState.message}
            </p>
          )}

          {result.status === 'idle' && (
            <Notice title="Choose filters, then select Search.">
              Results show entity, filing type and date, status, registered agent, principal address and any verified contacts.
            </Notice>
          )}
          {result.status === 'loading' && <Notice title="Searching filings…" />}
          {result.status === 'error' && <ErrorState error={result.error} />}
          {result.status === 'ok' && page.filings.length === 0 && (
            <Notice title="No filings match these filters.">
              Try a wider date range or fewer keywords.
            </Notice>
          )}
          {result.status === 'ok' && page.filings.length > 0 && (
            <>
              <p className="count">
                Showing <strong>{from.toLocaleString()}–{to.toLocaleString()}</strong> of <strong>{page.total.toLocaleString()}</strong> filings
              </p>
              <Results filings={page.filings} caption={caption} />
              {page.total > PAGE_SIZE && (
                <nav className="pager" aria-label="Results pages">
                  <button type="button" className="btn btn-ghost" disabled={page.offset === 0}
                    onClick={() => run({ ...query, offset: Math.max(0, page.offset - PAGE_SIZE) })}>
                    Previous
                  </button>
                  <button type="button" className="btn btn-ghost" disabled={to >= page.total}
                    onClick={() => run({ ...query, offset: page.offset + PAGE_SIZE })}>
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
