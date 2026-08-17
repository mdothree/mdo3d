import { useState } from 'react';
import Badge from '../components/Badge.jsx';
import Btn from '../components/Btn.jsx';
import Field from '../components/Field.jsx';
import Modal from '../components/Modal.jsx';
import { PLANS } from '../constants/plans.js';

export default function BillingPage({ userPrefs, setPage }) {
  const plan = PLANS.find(p => p.id === (userPrefs?.plan || 'pro')) || PLANS[1];
  const [showCancel,    setShowCancel]    = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState('');
  const [cancelled,     setCancelled]     = useState(false);

  const userEmail = userPrefs?.acct?.email || 'your@email.com';

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="hero-eyebrow fu">Subscription</div>
          <h1 className="hero-title fu2">Billing</h1>
          <div className="hero-rule fu2" />
          <p className="hero-desc fu3">Manage your subscription, payment method, and usage.</p>
        </div>
      </div>

      <div className="content-wrap fu">
        <div className="g2" style={{ gap: 32, alignItems: 'start' }}>

          {/* Left col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Current plan */}
            <div className="card">
              <div className="card-hd">
                <div className="card-title">Current Plan</div>
                <Badge variant={cancelled ? 'danger' : 'success'}>{cancelled ? 'Cancelled' : 'Active'}</Badge>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, color: 'var(--ink)', letterSpacing: -1 }}>{plan.name}</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'var(--light)' }}>${plan.price}/mo</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 16 }}>
                  {cancelled ? 'Subscription cancelled — active until Feb 28, 2025' : 'Next billing date: Feb 14, 2025'}
                </div>
                <div className="plan-feature-list">
                  {[plan.leads, plan.runs, plan.reports, ...plan.extras].map(f => (
                    <div key={f} className="pfl-item"><span className="pfl-check">✓</span>{f}</div>
                  ))}
                </div>
              </div>
              {!cancelled && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Btn variant="ghost" size="sm">Upgrade Plan</Btn>
                  <Btn variant="danger" size="sm" onClick={() => setShowCancel(true)}>Cancel Subscription</Btn>
                </div>
              )}
            </div>

            {/* Payment method */}
            <div className="card">
              <div className="card-hd">
                <div className="card-title">Payment Method</div>
                <Btn variant="ghost" size="sm">Update</Btn>
              </div>
              {[
                ['Card',         '•••• •••• •••• 4242'],
                ['Expires',      '12 / 2027'],
                ['Type',         'Visa'],
                ['Billing name', userPrefs?.acct ? `${userPrefs.acct.firstName} ${userPrefs.acct.lastName}` : 'Alex Butts'],
              ].map(([k, v]) => (
                <div className="enrich-row" key={k}>
                  <span className="enrich-key">{k}</span>
                  <span className="enrich-val">{v}</span>
                </div>
              ))}
            </div>

            {/* Invoice history */}
            <div className="card">
              <div className="card-hd">
                <div className="card-title">Invoice History</div>
                <span className="card-tag">Past charges</span>
              </div>
              {[
                { date: 'Jan 14, 2025', amount: `$${plan.price}.00`, status: 'Paid' },
                { date: 'Dec 14, 2024', amount: `$${plan.price}.00`, status: 'Paid' },
                { date: 'Nov 14, 2024', amount: `$${plan.price}.00`, status: 'Paid' },
              ].map(inv => (
                <div key={inv.date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--ink)', marginBottom: 2 }}>{inv.date}</div>
                    <div style={{ fontFamily: "'DM Mono'", fontSize: 8.5, color: 'var(--light)' }}>{plan.name} plan</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: "'DM Mono'", fontSize: 10, color: 'var(--ink)' }}>{inv.amount}</span>
                    <Badge variant="success">{inv.status}</Badge>
                    <Btn variant="ghost" size="sm">PDF</Btn>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Usage */}
            <div className="card">
              <div className="card-hd">
                <div className="card-title">Usage This Month</div>
                <span className="card-tag">Jan 2025</span>
              </div>
              {[
                { label: 'Leads enriched', used: 89,  max: plan.id === 'starter' ? 100  : plan.id === 'pro' ? 2000 : 9999 },
                { label: 'Pipeline runs',  used: 18,  max: plan.id === 'starter' ? 30   : 9999 },
                { label: 'API calls',      used: 312, max: 500 },
                { label: 'Exports',        used: 4,   max: plan.id === 'starter' ? 5    : 9999 },
              ].map(({ label, used, max }) => {
                const isUnlim = max === 9999;
                const pct     = isUnlim ? 10 : Math.round(used / max * 100);
                return (
                  <div key={label} style={{ marginBottom: 16 }}>
                    <div className="usage-bar-labels">
                      <span style={{ fontFamily: "'DM Mono'", fontSize: 8.5, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--light)' }}>{label}</span>
                      <span style={{ fontFamily: "'DM Mono'", fontSize: 9, color: 'var(--ink)' }}>
                        {used}{isUnlim ? ' used' : ` / ${max.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="usage-bar-track">
                      <div className="usage-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 85 ? 'var(--amber)' : 'var(--ink)' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Plan comparison */}
            <div className="card">
              <div className="card-hd">
                <div className="card-title">Available Plans</div>
                <span className="card-tag">Compare</span>
              </div>
              {PLANS.map(p => (
                <div key={p.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontFamily: "'DM Mono'", fontSize: 10, color: 'var(--ink)', letterSpacing: 0.5 }}>{p.name}</span>
                      {p.id === plan.id && <Badge variant="navy">Current</Badge>}
                    </div>
                    <div style={{ fontFamily: "'DM Mono'", fontSize: 8.5, color: 'var(--light)' }}>${p.price}/mo · {p.leads}</div>
                  </div>
                  {p.id !== plan.id && <Btn variant="ghost" size="sm">Switch</Btn>}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* Cancel subscription modal */}
      <Modal open={showCancel} onClose={() => { setShowCancel(false); setCancelConfirm(''); }} title="Cancel Subscription">
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12.5, color: 'var(--mid)', lineHeight: 1.65, marginBottom: 16 }}>
            Your subscription will remain active until the end of the current billing period (Feb 14, 2025). After that, your account will be downgraded and pipeline runs will stop.
          </p>
          <div style={{ padding: '12px 16px', background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', marginBottom: 16 }}>
            <div style={{ fontFamily: "'DM Mono'", fontSize: 9, color: 'var(--amber)', letterSpacing: 1 }}>
              You will lose access to: daily reports, keyword filters, all entity types, and priority support.
            </div>
          </div>
          <Field
            label={`Type "${userEmail}" to confirm`}
            value={cancelConfirm}
            onChange={e => setCancelConfirm(e.target.value)}
            placeholder="Enter your email"
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="md" onClick={() => { setShowCancel(false); setCancelConfirm(''); }}>
            Keep Subscription
          </Btn>
          <Btn
            variant="danger"
            size="md"
            disabled={cancelConfirm !== userEmail}
            onClick={() => { setCancelled(true); setShowCancel(false); setCancelConfirm(''); }}
          >
            Cancel Subscription
          </Btn>
        </div>
      </Modal>
    </>
  );
}
