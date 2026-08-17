import { useState } from 'react';
import Badge from '../components/Badge.jsx';
import Btn from '../components/Btn.jsx';
import Field from '../components/Field.jsx';
import { statusVariant, segmentVariant, scoreColor } from '../utils/helpers.js';

export default function LeadDetailPage({ lead, setPage }) {
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState(lead ? { ...lead } : {});

  if (!lead) { setPage('leads'); return null; }

  const f = key => e => setForm(p => ({ ...p, [key]: e.target.value }));

  const infoRows = [
    ['Name',     lead.name],
    ['Company',  lead.company],
    ['Email',    lead.email],
    ['Phone',    lead.phone],
    ['State',    lead.state],
    ['Website',  lead.website],
    ['LinkedIn', lead.linkedin],
    ['Source',   lead.source],
    ['Added',    lead.createdAt],
  ];

  const enrichRows = [
    ['Lead Score',   lead.score > 0 ? `${lead.score} / 100` : '—'],
    ['Segment',      lead.segment],
    ['Employees',    lead.employees],
    ['Est. Revenue', lead.revenue],
  ];

  const qualRows = [
    ['Company size fit', lead.score >= 70 ? 'Strong fit' : 'Moderate fit'],
    ['Segment match',    lead.segment === 'Government' ? 'Primary target' : lead.segment === 'Commercial' ? 'Secondary target' : 'Low priority'],
    ['Contact quality',  lead.status === 'Enriched' ? 'Verified' : lead.status === 'Pending' ? 'Unverified' : 'Unknown'],
  ];

  return (
    <div className="content-wrap fu">
      <button className="back-btn" onClick={() => setPage('leads')}>← Back to Leads</button>

      <div className="pg-hd">
        <div>
          <div className="pg-title">{lead.name}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
            <Badge variant={statusVariant(lead.status)}>{lead.status}</Badge>
            <Badge variant={segmentVariant(lead.segment)}>{lead.segment}</Badge>
            <span style={{ fontFamily: "'DM Mono'", fontSize: 8.5, color: 'var(--light)', letterSpacing: 1 }}>{lead.id}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Btn variant="ghost" size="sm" onClick={() => setEditing(e => !e)}>
            {editing ? 'Cancel' : 'Edit Lead'}
          </Btn>
          {editing && (
            <Btn variant="ink" size="sm" onClick={() => setEditing(false)}>Save Changes</Btn>
          )}
          <Btn variant="danger" size="sm">Delete</Btn>
        </div>
      </div>

      <div className="g2" style={{ gap: 24, alignItems: 'start' }}>

        {/* Contact Info */}
        <div className="card">
          <div className="card-hd">
            <div className="card-title">Contact Information</div>
            <span className="card-tag">Core</span>
          </div>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Full Name"  value={form.name}    onChange={f('name')}    />
              <Field label="Company"    value={form.company} onChange={f('company')} />
              <Field label="Email"      type="email" value={form.email}   onChange={f('email')}   />
              <Field label="Phone"      value={form.phone}   onChange={f('phone')}   />
              <Field label="State"      value={form.state}   onChange={f('state')}   />
              <Field label="Website"    value={form.website} onChange={f('website')} />
              <Field label="Notes" as="textarea" value={form.notes} onChange={f('notes')} placeholder="Add notes..." />
            </div>
          ) : (
            <>
              {infoRows.map(([k, v]) => (
                <div className="enrich-row" key={k}>
                  <span className="enrich-key">{k}</span>
                  <span className="enrich-val">{v || '—'}</span>
                </div>
              ))}
              {lead.notes && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div className="enrich-key" style={{ marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: 11.5, color: 'var(--mid)', lineHeight: 1.65 }}>{lead.notes}</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Enrichment + Qualification */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-hd">
              <div className="card-title">Enrichment Data</div>
              <Badge variant={statusVariant(lead.status)}>{lead.status}</Badge>
            </div>
            {enrichRows.map(([k, v]) => (
              <div className="enrich-row" key={k}>
                <span className="enrich-key">{k}</span>
                <span className="enrich-val" style={{ color: k === 'Lead Score' ? scoreColor(lead.score) : undefined }}>
                  {v || '—'}
                </span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-hd">
              <div className="card-title">Qualification</div>
              <span className="card-tag">Auto-scored</span>
            </div>
            {lead.score > 0 ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="enrich-key">Score</span>
                    <span style={{ fontFamily: "'DM Mono'", fontSize: 14, color: scoreColor(lead.score), letterSpacing: 1 }}>
                      {lead.score}
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'var(--off)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${lead.score}%`, height: '100%', background: scoreColor(lead.score), transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                {qualRows.map(([k, v]) => (
                  <div className="enrich-row" key={k}>
                    <span className="enrich-key">{k}</span>
                    <span className="enrich-val">{v}</span>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: "'DM Mono'", fontSize: 9, color: 'var(--light)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Not yet scored
              </div>
            )}
          </div>

          <Btn variant="ink" size="md">Re-run Enrichment</Btn>
        </div>
      </div>
    </div>
  );
}
