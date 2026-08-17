import { useState } from 'react';
import Badge from '../components/Badge.jsx';
import Btn from '../components/Btn.jsx';
import Field from '../components/Field.jsx';
import TagInput from '../components/TagInput.jsx';
import { PLANS, ENTITY_TYPES, CADENCE_OPTS } from '../constants/plans.js';
import { createProfile, startCheckout, updateProfile } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.jsx';

const STEPS = ['Account', 'Plan', 'Payment', 'Preferences'];

export default function OnboardingPage({ onComplete, profileId: existingProfileId }) {
  const { logout } = useAuth();
  const [step,      setStep]      = useState(existingProfileId ? 3 : 0);
  const [acct,      setAcct]      = useState({ firstName: '', lastName: '', email: '', org: '' });
  const [plan,      setPlan]      = useState('pro');
  const [paying,    setPaying]    = useState(false);
  const [payDone,   setPayDone]   = useState(!!existingProfileId);
  const [profileId, setProfileId] = useState(existingProfileId || null);
  const [error,     setError]     = useState(null);
  const [cadence,   setCadence]   = useState('weekly');
  const [keywords,  setKeywords]  = useState([]);
  const [entities,  setEntities]  = useState(['Government Agencies', 'Defense Contractors', 'Commercial Companies']);

  const sel      = PLANS.find(p => p.id === plan);
  const toggleEnt = et => setEntities(e => e.includes(et) ? e.filter(x => x !== et) : [...e, et]);

  const submitPay = async () => {
    setPaying(true);
    setError(null);

    try {
      // Build profile settings from form data
      const settings = {
        name: acct.org || `${acct.firstName}'s Leads`,
        email_lookup: true,
        date_range: 'daily',
        max_leads: sel?.id === 'starter' ? 100 : sel?.id === 'pro' ? 2000 : 10000,
        filing_types: ['FLAL', 'DOMP', 'FORP'],
        keywords: [],
        exclude_keywords: [],
        target_counties: null,
        delivery: {
          frequency: 'weekly',
          day_of_week: 'monday',
          recipient_email: acct.email,
          recipient_name: `${acct.firstName} ${acct.lastName}`.trim(),
          format: 'csv_attachment',
          subject: 'Lead Report - {date}',
        },
        sender: 'leads@mdo3d.com',
      };

      // Create profile in database
      const profile = await createProfile({
        name: settings.name,
        settings,
      });

      setProfileId(profile.id);

      // Redirect to Stripe Checkout
      await startCheckout(profile.id, sel.stripePriceId);
      // Note: startCheckout redirects, so code below won't execute

    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to start checkout');
      setPaying(false);
    }
  };

  return (
    <div className="ob-root">
      <div className="ob-top">
        <div className="ob-logo">MDO3D LEADS</div>
      </div>

      <div className="ob-body">
        {/* Step progress */}
        <div className="ob-progress">
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'flex-start', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className={`ob-dot ${i < step ? 'done' : i === step ? 'active' : 'future'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <div
                  className="ob-step-label"
                  style={{ color: i === step ? 'var(--white)' : i < step ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)' }}
                >
                  {s}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className="ob-line" style={{ background: i < step ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)' }} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 0: Account ── */}
        {step === 0 && (
          <div className="ob-card ob-card-sm">
            <div className="ob-sub-label">Get Started</div>
            <div className="ob-title">Create your account</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="g2" style={{ gap: 12 }}>
                <Field label="First Name" value={acct.firstName} onChange={e => setAcct(a => ({ ...a, firstName: e.target.value }))} placeholder="First name" />
                <Field label="Last Name"  value={acct.lastName}  onChange={e => setAcct(a => ({ ...a, lastName: e.target.value }))}  placeholder="Last name" />
              </div>
              <Field label="Work Email"    type="email" value={acct.email} onChange={e => setAcct(a => ({ ...a, email: e.target.value }))} placeholder="you@company.com" />
              <Field label="Organization"  value={acct.org} onChange={e => setAcct(a => ({ ...a, org: e.target.value }))} placeholder="Company name" />
              <div style={{ marginTop: 8 }}>
                <Btn variant="ink" size="lg" className="btn-full" onClick={() => setStep(1)} disabled={!acct.email || !acct.firstName}>
                  Continue →
                </Btn>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--light)', textAlign: 'center', lineHeight: 1.55 }}>
                By continuing you agree to our Terms of Service and Privacy Policy.
              </div>
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--light)' }}>
                Already have an account?{' '}
                <span
                  style={{ color: 'var(--ink)', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={logout}
                >
                  Sign in
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Plan ── */}
        {step === 1 && (
          <div style={{ width: '100%', maxWidth: 820 }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8.5, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Pricing</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 30, color: 'var(--cream)', letterSpacing: -0.5 }}>Choose your plan</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>All plans include a 14-day free trial. Cancel anytime.</div>
            </div>
            <div className="plan-grid">
              {PLANS.map(p => {
                const isSel = plan === p.id;
                return (
                  <div key={p.id} className={`plan-card ${isSel ? 'sel' : ''}`} onClick={() => setPlan(p.id)}>
                    {p.popular && <div className="plan-pop-tag">Most Popular</div>}
                    <div className="plan-name"  style={{ color: isSel ? 'var(--light)' : 'rgba(255,255,255,0.4)' }}>{p.name}</div>
                    <div className="plan-price" style={{ color: isSel ? 'var(--ink)' : 'var(--white)' }}>${p.price}</div>
                    <div className="plan-period" style={{ color: isSel ? 'var(--light)' : 'rgba(255,255,255,0.35)' }}>per month</div>
                    {[p.leads, p.runs, p.reports, ...p.extras].map(f => (
                      <div key={f} className="plan-feat" style={{ color: isSel ? 'var(--mid)' : 'rgba(255,255,255,0.45)' }}>
                        <span className="plan-check" style={{ color: isSel ? 'var(--green)' : 'rgba(255,255,255,0.35)' }}>✓</span>
                        {f}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
              <Btn variant="ghost-w" size="md" onClick={() => setStep(0)}>← Back</Btn>
              <Btn variant="gold" size="lg" onClick={() => setStep(2)}>
                Continue with {sel?.name} — ${sel?.price}/mo →
              </Btn>
            </div>
          </div>
        )}

        {/* ── Step 2: Payment ── */}
        {step === 2 && (
          <div className="ob-card ob-card-sm">
            {!payDone ? (
              <>
                <div className="stripe-meta">
                  <div>
                    <div className="ob-sub-label" style={{ margin: 0 }}>Secure Checkout</div>
                    <div className="ob-title" style={{ margin: '4px 0 0' }}>Complete Payment</div>
                  </div>
                  <div className="stripe-badge">🔒 Powered by Stripe</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'var(--mid)' }}>
                    {sel?.name} plan · ${sel?.price}/month
                  </div>
                  <Badge variant="success">14-day free trial</Badge>
                </div>
                <div className="pay-summary">
                  <div className="pay-summary-row">
                    <span>{sel?.name} plan (billed monthly)</span>
                    <span style={{ fontWeight: 500, color: 'var(--ink)' }}>${sel?.price}.00 / mo</span>
                  </div>
                  <div className="pay-summary-row" style={{ marginTop: 8 }}>
                    <span>Email delivery to</span>
                    <span style={{ color: 'var(--mid)' }}>{acct.email}</span>
                  </div>
                  <div className="pay-summary-note">First charge after 14-day trial. Cancel anytime.</div>
                </div>
                {error && (
                  <div style={{ padding: '10px 14px', background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', fontSize: 11, marginTop: 16 }}>
                    {error}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <Btn variant="ghost" size="md" onClick={() => setStep(1)}>← Back</Btn>
                  <Btn variant="ink" size="lg" onClick={submitPay} disabled={paying} className="btn-full">
                    {paying ? '◌  Redirecting to Stripe...' : `Continue to Payment →`}
                  </Btn>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--green-bg)', border: '1px solid var(--green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 20 }}>✓</div>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, color: 'var(--ink)', marginBottom: 6 }}>Payment confirmed</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'var(--light)', letterSpacing: 1, marginBottom: 24 }}>
                  {sel?.name} plan · ${sel?.price}/month · Trial starts today
                </div>
                <Btn variant="ink" size="lg" onClick={() => setStep(3)}>Set up preferences →</Btn>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Preferences ── */}
        {step === 3 && (
          <div className="ob-card ob-card-sm">
            <div className="ob-sub-label">Configuration</div>
            <div className="ob-title">Set your preferences</div>

            {/* Cadence */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--light)', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                Report Cadence
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--mid)', marginBottom: 12, lineHeight: 1.55 }}>
                How often should we deliver your enrichment reports?
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
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--light)', marginBottom: 8, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                Filter Keywords
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--mid)', marginBottom: 10, lineHeight: 1.55 }}>
                Reports will highlight leads matching these keywords. Press Enter or comma to add.
              </div>
              <TagInput tags={keywords} setTags={setKeywords} placeholder="e.g. defense, AI, RF systems..." />
            </div>

            {/* Entity Types */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--light)', marginBottom: 8, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                Entity Types
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--mid)', marginBottom: 12, lineHeight: 1.55 }}>
                Which organization types should appear in your reports?
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

            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="ghost" size="md" onClick={() => setStep(2)}>← Back</Btn>
              <Btn variant="ink" size="lg" className="btn-full" onClick={async () => {
                // Map cadence to delivery frequency
                const freqMap = { realtime: 'daily', daily: 'daily', twice: 'biweekly', weekly: 'weekly', monthly: 'monthly' };

                // Update profile with preferences
                if (profileId) {
                  try {
                    await updateProfile(profileId, {
                      settings: {
                        name: acct.org || `${acct.firstName}'s Leads`,
                        email_lookup: true,
                        date_range: freqMap[cadence] === 'daily' ? 'daily' : freqMap[cadence] === 'weekly' ? 'weekly' : 'monthly',
                        max_leads: sel?.id === 'starter' ? 100 : sel?.id === 'pro' ? 2000 : 10000,
                        filing_types: ['FLAL', 'DOMP', 'FORP'],
                        keywords: keywords,
                        exclude_keywords: [],
                        target_counties: null,
                        delivery: {
                          frequency: freqMap[cadence] || 'weekly',
                          day_of_week: 'monday',
                          recipient_email: acct.email,
                          recipient_name: `${acct.firstName} ${acct.lastName}`.trim(),
                          format: 'csv_attachment',
                          subject: 'Lead Report - {date}',
                        },
                        sender: 'leads@mdo3d.com',
                      },
                      active: true,
                    });
                  } catch (err) {
                    console.error('Failed to update profile:', err);
                  }
                }
                onComplete({ acct, plan, cadence, keywords, entities, profileId });
              }}>
                Launch Dashboard →
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
