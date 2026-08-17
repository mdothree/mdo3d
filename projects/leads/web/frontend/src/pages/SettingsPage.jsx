import { useState } from 'react';
import Badge from '../components/Badge.jsx';
import Btn from '../components/Btn.jsx';
import Field from '../components/Field.jsx';
import Modal from '../components/Modal.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import TagInput from '../components/TagInput.jsx';
import Toggle from '../components/Toggle.jsx';
import { ENTITY_TYPES, CADENCE_OPTS } from '../constants/plans.js';

const API_KEYS = [
  { name: 'Apollo API Key',    key: 'apk_•••••••••••••••••q9x2', scope: 'Lead enrichment' },
  { name: 'Hunter.io API Key', key: 'hunt_••••••••••••m4k7',     scope: 'Email validation' },
  { name: 'Anthropic API Key', key: 'sk-ant-•••••••••••••kq1z',  scope: 'AI enrichment'   },
];

const NOTIF_OPTS = [
  { key: 'pipelineDone', label: 'Pipeline complete',  sub: 'Notify when a run finishes'                 },
  { key: 'newLead',      label: 'New lead added',     sub: 'Alert on manually added leads'              },
  { key: 'exportReady',  label: 'Export ready',       sub: 'Notify when a CSV export is available'      },
  { key: 'failureAlert', label: 'Failure alerts',     sub: 'Alert on enrichment failures or API errors' },
  { key: 'weeklyDigest', label: 'Weekly digest',      sub: 'Summary email every Monday morning'         },
];

const EMAIL_VALIDATION_OPTS = [
  { key: 'verify_mx',    label: 'MX Record Validation',    sub: 'Verify domains have valid mail servers (fast)' },
  { key: 'verify_smtp',  label: 'SMTP Mailbox Validation', sub: 'Verify mailboxes exist on mail servers (thorough, slower)' },
];

export default function SettingsPage({ userPrefs, setUserPrefs }) {
  const [notifs, setNotifs] = useState({
    pipelineDone: true, newLead: false, exportReady: true, failureAlert: true, weeklyDigest: true,
  });
  const [showKey,     setShowKey]     = useState({});
  const [showDelete,  setShowDelete]  = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [cadence,     setCadence]     = useState(userPrefs?.cadence || 'weekly');
  const [keywords,    setKeywords]    = useState(userPrefs?.keywords || []);
  const [entities,    setEntities]    = useState(userPrefs?.entities || ['Government Agencies', 'Defense Contractors', 'Commercial Companies']);
  const [emailValidation, setEmailValidation] = useState({
    verify_mx: false, verify_smtp: false,
  });

  const toggle    = key => setNotifs(n => ({ ...n, [key]: !n[key] }));
  const toggleEnt = et  => setEntities(e => e.includes(et) ? e.filter(x => x !== et) : [...e, et]);
  const savePrefs = ()  => { if (setUserPrefs) setUserPrefs(p => ({ ...p, cadence, keywords, entities })); };

  const userEmail = userPrefs?.acct?.email || 'your@email.com';

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="hero-eyebrow fu">Configuration</div>
          <h1 className="hero-title fu2">Settings</h1>
          <div className="hero-rule fu2" />
          <p className="hero-desc fu3">Manage your profile, API integrations, and notification preferences.</p>
        </div>
      </div>

      <div className="content-wrap fu">
        <div className="g2" style={{ gap: 32, alignItems: 'start' }}>

          {/* Left col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Profile */}
            <div className="card">
              <div className="card-hd">
                <div className="card-title">Profile</div>
                <span className="card-tag">Account</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="g2" style={{ gap: 12 }}>
                  <Field label="First Name" value={userPrefs?.acct?.firstName || 'Alex'}  placeholder="First name" onChange={() => {}} />
                  <Field label="Last Name"  value={userPrefs?.acct?.lastName  || 'Butts'} placeholder="Last name"  onChange={() => {}} />
                </div>
                <Field label="Email Address" type="email" value={userPrefs?.acct?.email || 'you@mdo3d.com'} placeholder="Email" onChange={() => {}} />
                <Field label="Organization"  value={userPrefs?.acct?.org || 'Ridgefield LLC'} placeholder="Company" onChange={() => {}} />
                <Field label="Role" as="select" value="Admin" options={['Admin', 'Analyst', 'Viewer']} onChange={() => {}} />
                <div className="form-actions">
                  <Btn variant="ink"   size="md">Save Profile</Btn>
                  <Btn variant="ghost" size="md">Discard</Btn>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="card">
              <div className="card-hd">
                <div className="card-title">Notifications</div>
                <span className="card-tag">Alerts</span>
              </div>
              {NOTIF_OPTS.map(({ key, label, sub }) => (
                <div className="notif-row" key={key}>
                  <div>
                    <div className="notif-label">{label}</div>
                    <div className="notif-sub">{sub}</div>
                  </div>
                  <Toggle on={notifs[key]} onToggle={() => toggle(key)} />
                </div>
              ))}
            </div>

            {/* Report Preferences */}
            <div className="card">
              <div className="card-hd">
                <div className="card-title">Report Preferences</div>
                <span className="card-tag">Filters</span>
              </div>

              {/* Cadence */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--light)', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  Report Cadence
                </div>
                {CADENCE_OPTS.map(opt => (
                  <div key={opt.val} className="radio-row" onClick={() => setCadence(opt.val)}>
                    <div className={`radio-circle ${cadence === opt.val ? 'on' : ''}`}>
                      {cadence === opt.val && <div className="radio-dot" />}
                    </div>
                    <div>
                      <div className="radio-main">{opt.label}</div>
                      <div className="radio-sub">{opt.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Keywords */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--light)', marginBottom: 8, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  Filter Keywords
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--mid)', marginBottom: 10, lineHeight: 1.55 }}>
                  Reports highlight leads matching these keywords. Press Enter or comma to add.
                </div>
                <TagInput tags={keywords} setTags={setKeywords} placeholder="e.g. defense, AI, RF systems..." />
              </div>

              {/* Entity types */}
              <div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--light)', marginBottom: 8, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  Entity Types
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--mid)', marginBottom: 12, lineHeight: 1.55 }}>
                  Organization types to include in your reports.
                </div>
                <div className="cb-grid">
                  {ENTITY_TYPES.map(et => (
                    <div key={et} className={`cb-item ${entities.includes(et) ? 'on' : ''}`} onClick={() => toggleEnt(et)}>
                      <input type="checkbox" className="cb-box" checked={entities.includes(et)} readOnly />
                      <span>{et}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <Btn variant="ink"   size="md" onClick={savePrefs}>Save Preferences</Btn>
                <Btn variant="ghost" size="md" onClick={() => { setCadence(userPrefs?.cadence || 'weekly'); setKeywords(userPrefs?.keywords || []); setEntities(userPrefs?.entities || []); }}>
                  Discard
                </Btn>
              </div>
            </div>

            {/* Email Enrichment */}
            <div className="card">
              <div className="card-hd">
                <div className="card-title">Email Validation</div>
                <span className="card-tag">Enrichment</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--mid)', marginBottom: 16, lineHeight: 1.55 }}>
                Validate discovered emails before adding them to leads. These checks run during enrichment.
              </div>
              {EMAIL_VALIDATION_OPTS.map(({ key, label, sub }) => (
                <div className="notif-row" key={key}>
                  <div>
                    <div className="notif-label">{label}</div>
                    <div className="notif-sub">{sub}</div>
                  </div>
                  <Toggle on={emailValidation[key]} onToggle={() => setEmailValidation(n => ({ ...n, [key]: !n[key] }))} />
                </div>
              ))}
              <div className="form-actions" style={{ marginTop: 16 }}>
                <Btn variant="ink" size="md">Save Validation Settings</Btn>
              </div>
            </div>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* API Keys */}
            <div className="card">
              <div className="card-hd">
                <div className="card-title">API Keys</div>
                <Btn variant="ghost" size="sm">+ Add Key</Btn>
              </div>
              {API_KEYS.map(k => (
                <div className="key-row" key={k.name}>
                  <div>
                    <div className="key-name">{k.name}</div>
                    <div className="key-val">{showKey[k.name] ? 'sk_live_key_revealed_here' : k.key}</div>
                    <div className="key-scope">{k.scope}</div>
                  </div>
                  <div className="key-actions">
                    <Btn variant="ghost" size="sm" onClick={() => setShowKey(s => ({ ...s, [k.name]: !s[k.name] }))}>
                      {showKey[k.name] ? 'Hide' : 'Show'}
                    </Btn>
                    <Btn variant="ghost" size="sm">Rotate</Btn>
                  </div>
                </div>
              ))}
            </div>

            {/* Data & Export */}
            <div className="card">
              <div className="card-hd">
                <div className="card-title">Data &amp; Export</div>
                <span className="card-tag">Storage</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="Default Export Format" as="select" value="CSV"        options={['CSV', 'JSON', 'Excel (.xlsx)']}                        onChange={() => {}} />
                <Field label="Export Fields"         as="select" value="All Fields" options={['All Fields', 'Core Only', 'Enrichment Only', 'Custom']} onChange={() => {}} />
                <div className="form-actions" style={{ flexDirection: 'column', gap: 8 }}>
                  <Btn variant="ghost"  size="md">Export Full Database</Btn>
                  <Btn variant="danger" size="md">Clear All Lead Data</Btn>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="card" style={{ border: '1px solid var(--red-border)' }}>
              <div className="card-hd" style={{ borderBottomColor: 'var(--red-border)' }}>
                <div className="card-title" style={{ color: 'var(--red)' }}>Danger Zone</div>
                <Badge variant="danger">Irreversible</Badge>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--mid)', lineHeight: 1.65, marginBottom: 16 }}>
                Permanently delete your account and all associated lead data. This cannot be undone and will immediately terminate your subscription.
              </p>
              <Btn variant="danger" size="md" onClick={() => setShowDelete(true)}>Delete Account</Btn>
            </div>

          </div>
        </div>
      </div>

      {/* Delete account modal */}
      <Modal open={showDelete} onClose={() => { setShowDelete(false); setDeleteInput(''); }} title="Delete Account">
        <div style={{ marginBottom: 20 }}>
          <div style={{ padding: '12px 16px', background: 'var(--red-bg)', border: '1px solid var(--red-border)', marginBottom: 16 }}>
            <div style={{ fontFamily: "'DM Mono'", fontSize: 9, color: 'var(--red)', letterSpacing: 0.5, lineHeight: 1.7 }}>
              This will permanently delete all leads, enrichment data, pipeline history, and your account. This action cannot be undone.
            </div>
          </div>
          <Field
            label={`Type "${userEmail}" to confirm`}
            value={deleteInput}
            onChange={e => setDeleteInput(e.target.value)}
            placeholder={userEmail}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="md" onClick={() => { setShowDelete(false); setDeleteInput(''); }}>Cancel</Btn>
          <Btn variant="danger" size="md" disabled={deleteInput !== userEmail}>
            Permanently Delete Account
          </Btn>
        </div>
      </Modal>
    </>
  );
}
