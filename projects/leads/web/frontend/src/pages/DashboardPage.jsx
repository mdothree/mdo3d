import { useState, useEffect } from 'react';
import Badge from '../components/Badge.jsx';
import Btn from '../components/Btn.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import { ACTIVITY } from '../constants/leads.js';
import { CADENCE_OPTS } from '../constants/plans.js';
import { getProfileStats } from '../lib/api.js';

export default function DashboardPage({ setPage, userPrefs, profileId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileId) {
      setLoading(true);
      getProfileStats(profileId)
        .then(data => {
          setStats(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch stats:', err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [profileId]);

  // Use real stats or fallback to zeros
  const total = stats?.total || 0;
  const enriched = stats?.enriched || 0;
  const pending = stats?.pending || 0;
  const recent = stats?.recent || 0;
  const byType = stats?.by_filing_type || {};

  // Map filing types to display labels
  const typeLabels = {
    'FLAL': 'FL LLC',
    'DOMP': 'Domestic Profit',
    'FORP': 'Foreign Profit',
    'FORL': 'Foreign LLC',
    'DOMNP': 'Domestic Non-Profit',
  };

  const statusBreakdown = [
    { s: 'Enriched', count: enriched, color: 'var(--green)' },
    { s: 'Pending', count: pending, color: 'var(--amber)' },
  ];

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="hero-eyebrow fu">Lead Intelligence</div>
          <h1 className="hero-title fu2">Pipeline Dashboard</h1>
          <div className="hero-rule fu2" />
          <p className="hero-desc fu3">
            Track, enrich, and manage leads across commercial, residential, and government segments.
          </p>
          <div className="hero-ctas fu4">
            <Btn variant="gold" size="md" onClick={() => setPage('pipeline')}>Run Pipeline</Btn>
            <Btn variant="ghost" size="md" onClick={() => setPage('leads')}>View All Leads</Btn>
          </div>
        </div>
      </div>

      {/* Active preferences bar */}
      {userPrefs && (userPrefs.keywords?.length > 0 || userPrefs.entities?.length > 0) && (
        <div className="prefs-bar">
          <div className="prefs-bar-inner">
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--light)' }}>
              Active Filters:
            </span>
            {userPrefs.cadence && (
              <Badge variant="default">
                {CADENCE_OPTS.find(c => c.val === userPrefs.cadence)?.label || userPrefs.cadence}
              </Badge>
            )}
            {userPrefs.keywords?.slice(0, 4).map(k => <Badge key={k} variant="blue">{k}</Badge>)}
            {userPrefs.entities?.slice(0, 2).map(e => <Badge key={e} variant="navy">{e}</Badge>)}
            {((userPrefs.keywords?.length || 0) + (userPrefs.entities?.length || 0)) > 6 && (
              <span style={{ fontFamily: "'DM Mono'", fontSize: 8, color: 'var(--light)' }}>
                +{((userPrefs.keywords?.length || 0) + (userPrefs.entities?.length || 0)) - 6} more
              </span>
            )}
            <button className="prefs-bar-edit" onClick={() => setPage('settings')}>
              Edit Preferences →
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="content-wrap" style={{ paddingTop: 36, paddingBottom: 36 }}>
          <div className="sec-label">Overview</div>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--light)' }}>
              Loading stats...
            </div>
          ) : (
            <div className="stat-grid">
              <div className="stat-card fu">
                <div className="stat-label">Total Leads</div>
                <div className="stat-value">{total}</div>
                <div className="stat-sub">All filings</div>
                {recent > 0 && <div className="stat-delta delta-up">+{recent} this week</div>}
              </div>
              <div className="stat-card fu2">
                <div className="stat-label">Enriched</div>
                <div className="stat-value">{enriched}</div>
                <div className="stat-sub">{total > 0 ? Math.round(enriched / total * 100) : 0}% with emails</div>
              </div>
              <div className="stat-card fu3">
                <div className="stat-label">Pending</div>
                <div className="stat-value">{pending}</div>
                <div className="stat-sub">Awaiting enrichment</div>
              </div>
              <div className="stat-card fu4">
                <div className="stat-label">Recent</div>
                <div className="stat-value">{recent}</div>
                <div className="stat-sub">Last 7 days</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="content-wrap">
        <div className="g2" style={{ gap: 32 }}>

          {/* Activity Feed */}
          <div className="fu">
            <SectionHeader label="Recent Activity" title="Activity Feed" />
            <div style={{ border: '1px solid var(--border)', background: 'var(--white)' }}>
              {ACTIVITY.map(a => (
                <div key={a.id} className="activity-item">
                  <div className="activity-dot" style={{ background: a.color }} />
                  <div>
                    <div className="activity-event">{a.event}</div>
                    <div className="activity-time">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Quick Actions */}
            <div className="fu2">
              <SectionHeader label="Quick Actions" title="Actions" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Run Enrichment Pipeline', v: 'ink',   fn: () => setPage('pipeline') },
                  { label: 'Export to CSV',            v: 'ghost', fn: null },
                  { label: 'View All Leads',           v: 'ghost', fn: () => setPage('leads') },
                  { label: 'Manage API Keys',          v: 'ghost', fn: () => setPage('settings') },
                ].map(({ label, v, fn }) => (
                  <Btn key={label} variant={v} size="md" onClick={fn}>→ &nbsp;{label}</Btn>
                ))}
              </div>
            </div>

            {/* Filing Type Breakdown */}
            <div className="fu3">
              <SectionHeader label="Breakdown" title="By Filing Type" />
              <div style={{ border: '1px solid var(--border)' }}>
                {Object.entries(byType).length > 0 ? (
                  Object.entries(byType).map(([type, count], i) => {
                    const colors = ['var(--blue)', 'var(--navy)', 'var(--green)', 'var(--amber)', 'var(--light)'];
                    return (
                      <div key={type} style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 3, height: 26, background: colors[i % colors.length] }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>{typeLabels[type] || type}</div>
                            <div style={{ fontFamily: "'DM Mono'", fontSize: 8, color: 'var(--light)', letterSpacing: 1 }}>
                              {total > 0 ? Math.round(count / total * 100) : 0}% of leads
                            </div>
                          </div>
                        </div>
                        <div style={{ fontFamily: "'DM Serif Display'", fontSize: 28, color: 'var(--ink)', letterSpacing: -1 }}>
                          {count}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--light)', fontSize: 12 }}>
                    No leads yet
                  </div>
                )}
              </div>
            </div>

            {/* Enrichment Status */}
            <div className="fu4">
              <SectionHeader label="Status" title="Enrichment Status" />
              <div style={{ border: '1px solid var(--border)' }}>
                {statusBreakdown.map(({ s, count, color }) => (
                  <div key={s} style={{ padding: '11px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                      <span style={{ fontFamily: "'DM Mono'", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--mid)' }}>{s}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 64, height: 3, background: 'var(--off)', overflow: 'hidden' }}>
                        <div style={{ width: `${total > 0 ? (count / total * 100) : 0}%`, height: '100%', background: color }} />
                      </div>
                      <span style={{ fontFamily: "'DM Mono'", fontSize: 10, color: 'var(--ink)', minWidth: 14, textAlign: 'right' }}>{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
