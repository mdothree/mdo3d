import { useState, useEffect } from 'react';
import Badge from '../components/Badge.jsx';
import Btn from '../components/Btn.jsx';
import { getProfileLeads } from '../lib/api.js';

export default function LeadsPage({ setPage, setSelectedLead, profileId }) {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const [search,   setSearch]   = useState('');
  const [filingType, setFilingType] = useState('All');
  const [state,    setState]    = useState('All');
  const [selected, setSelected] = useState([]);
  const [sortKey,  setSortKey]  = useState('created_at');
  const [sortDir,  setSortDir]  = useState('desc');

  // Fetch leads from API
  useEffect(() => {
    if (profileId) {
      setLoading(true);
      getProfileLeads(profileId, limit, offset)
        .then(data => {
          setLeads(data.leads || []);
          setTotal(data.total || 0);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch leads:', err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [profileId, offset]);

  // Client-side filtering of fetched leads
  const filtered = leads
    .filter(l => filingType === 'All' || l.filing_type === filingType)
    .filter(l => state === 'All' || l.state === state)
    .filter(l => !search || [l.corp_name, l.email_1, l.registered_agent].some(v => v?.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      const av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const allSel = filtered.length > 0 && filtered.every(l => selected.includes(l.id));
  const sort   = key => { setSortKey(key); setSortDir(d => sortKey === key ? (d === 'asc' ? 'desc' : 'asc') : 'asc'); };
  const arrow  = key => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  // Get unique filing types for filter
  const filingTypes = ['All', ...new Set(leads.map(l => l.filing_type).filter(Boolean))];
  const states = ['All', ...new Set(leads.map(l => l.state).filter(Boolean))];

  // Pagination helpers
  const hasMore = offset + limit < total;
  const hasPrev = offset > 0;

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="hero-eyebrow fu">Database</div>
          <h1 className="hero-title fu2">Lead Management</h1>
          <div className="hero-rule fu2" />
          <p className="hero-desc fu3">
            Browse, filter, and manage your full lead database. Click any row to view enrichment detail.
          </p>
        </div>
      </div>

      <div className="content-wrap fu">
        <div className="pg-hd">
          <div>
            <div className="pg-title">All Leads</div>
            <div className="pg-sub">{loading ? 'Loading...' : `${filtered.length} of ${total} records`}</div>
          </div>
          <Btn variant="ink" size="sm" onClick={() => window.location.reload()}>Refresh</Btn>
        </div>

        <div className="table-wrap">
          {/* Filters */}
          <div className="filter-bar">
            <input
              className="filter-search"
              placeholder="Search company, email, agent..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="filter-sel" value={filingType} onChange={e => setFilingType(e.target.value)}>
              {filingTypes.map(o => <option key={o} value={o}>{o === 'All' ? 'All Types' : o}</option>)}
            </select>
            <select className="filter-sel" value={state} onChange={e => setState(e.target.value)}>
              {states.map(o => <option key={o} value={o}>{o === 'All' ? 'All States' : o}</option>)}
            </select>
            {(search || filingType !== 'All' || state !== 'All') && (
              <Btn variant="ghost" size="sm" onClick={() => { setSearch(''); setFilingType('All'); setState('All'); }}>
                Clear
              </Btn>
            )}
          </div>

          {/* Bulk action bar */}
          {selected.length > 0 && (
            <div className="bulk-bar">
              <span className="bulk-label">{selected.length} selected</span>
              <div className="bulk-actions">
                <Btn variant="gold"   size="sm">Export</Btn>
                <Btn variant="danger" size="sm">Delete</Btn>
                <Btn variant="ghost"  size="sm" onClick={() => setSelected([])}>Clear</Btn>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="table-scroll">
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--light)' }}>
                Loading leads...
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th className="col-check">
                      <input
                        type="checkbox"
                        className="chk"
                        checked={allSel}
                        onChange={() => setSelected(allSel ? [] : filtered.map(l => l.id))}
                      />
                    </th>
                    <th onClick={() => sort('corp_name')}>Company{arrow('corp_name')}</th>
                    <th onClick={() => sort('filing_type')}>Type{arrow('filing_type')}</th>
                    <th onClick={() => sort('city')}>Location{arrow('city')}</th>
                    <th onClick={() => sort('email_1')}>Email{arrow('email_1')}</th>
                    <th onClick={() => sort('email_1_score')}>Score{arrow('email_1_score')}</th>
                    <th onClick={() => sort('file_date')}>Filed{arrow('file_date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="table-empty">
                          {leads.length === 0 ? 'No leads yet. Run the pipeline to generate leads.' : 'No leads match your filters'}
                        </div>
                      </td>
                    </tr>
                  ) : filtered.map(lead => (
                    <tr
                      key={lead.id}
                      className={selected.includes(lead.id) ? 'row-selected' : ''}
                      onClick={() => { setSelectedLead(lead); setPage('lead-detail'); }}
                    >
                      <td onClick={e => { e.stopPropagation(); setSelected(s => s.includes(lead.id) ? s.filter(x => x !== lead.id) : [...s, lead.id]); }}>
                        <input type="checkbox" className="chk" checked={selected.includes(lead.id)} readOnly />
                      </td>
                      <td>
                        <div className="td-name">{lead.corp_name || '—'}</div>
                        <div className="td-sub">{lead.doc_number}</div>
                      </td>
                      <td><Badge variant="default">{lead.filing_type || '—'}</Badge></td>
                      <td>
                        <span className="td-mono">{lead.city}{lead.city && lead.state ? ', ' : ''}{lead.state}</span>
                      </td>
                      <td>
                        {lead.email_1 ? (
                          <a href={`mailto:${lead.email_1}`} onClick={e => e.stopPropagation()} className="td-link">
                            {lead.email_1}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--light)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <Badge variant={lead.email_1_score === 'HIGH' ? 'success' : lead.email_1_score === 'MEDIUM' ? 'warning' : 'default'}>
                          {lead.email_1_score || '—'}
                        </Badge>
                      </td>
                      <td><span className="td-mono">{lead.file_date || lead.source_date || '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: 'var(--light)' }}>
                Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="ghost" size="sm" onClick={() => setOffset(o => Math.max(0, o - limit))} disabled={!hasPrev}>
                  ← Prev
                </Btn>
                <Btn variant="ghost" size="sm" onClick={() => setOffset(o => o + limit)} disabled={!hasMore}>
                  Next →
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
