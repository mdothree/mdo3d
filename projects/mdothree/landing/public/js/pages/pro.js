// js/pages/pro.js — Pro upgrade page logic
import { ensureAnonymousUser, onAuthChange, getFirebaseAuth } from '../config/config.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { initSubscription, isPro, onSubscriptionChange, refreshSubscription } from '../services/subscriptionService.js';
import { STRIPE_CONFIG } from '../config/config.js';

// ---- Auth + subscription init ----
    initSubscription();
    ensureAnonymousUser();

    // ---- Handle return from Stripe ----
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_success') === '1') {
      const url = new URL(window.location);
      url.searchParams.delete('stripe_success');
      history.replaceState({}, '', url);
      // Poll for Pro status (webhook delay)
      const notice = document.createElement('div');
      notice.style.cssText = 'position:fixed;top:72px;left:50%;transform:translateX(-50%);background:#0F172A;color:#fff;padding:12px 20px;border-radius:10px;font-size:0.875rem;font-weight:600;z-index:9999;display:flex;align-items:center;gap:10px';
      notice.innerHTML = '<span style="color:#10B981">✓</span> Payment received! Activating Pro…';
      document.body.appendChild(notice);
      let attempts = 0;
      const poll = setInterval(async () => {
        const status = await refreshSubscription();
        if (status?.isPro || attempts++ > 8) {
          clearInterval(poll);
          notice.innerHTML = status?.isPro
            ? '<span style="color:#10B981;font-size:1.2rem">✓</span> Welcome to Pro! All features unlocked.'
            : 'Activation is taking a moment — please refresh in a few seconds.';
          setTimeout(() => notice.remove(), 5000);
        }
      }, 2500);
    }

    // ---- Header auth state ----
    const headerAuth = document.getElementById('header-auth');
    onSubscriptionChange(status => {
      if (status.isPro) {
        // Header badge
        headerAuth.innerHTML = '<span style="background:linear-gradient(135deg,#10B981,#059669);color:#fff;border-radius:99px;padding:4px 12px;font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">★ Pro Active</span>';

        // Update subscribe button
        const subscribeBtn = document.getElementById('subscribe-btn');
        subscribeBtn.textContent = 'Manage billing →';
        subscribeBtn.style.background = '#059669';
        subscribeBtn.onclick = () => window.open(STRIPE_CONFIG.portalUrl, '_blank');

        // Hide checkout section if open
        document.getElementById('checkout-section')?.classList.remove('visible');

        // Update the Pro pricing card to show active state
        const proCard = document.querySelector('.pricing-card.featured');
        if (proCard) {
          // Replace the featured-label
          const label = proCard.querySelector('.featured-label');
          if (label) label.textContent = '✓ Your current plan';

          // Update the CTA to billing portal
          const cta = proCard.querySelector('.plan-cta');
          if (cta) {
            cta.textContent = 'Manage billing →';
            cta.onclick = () => window.open(STRIPE_CONFIG.portalUrl, '_blank');
          }

          // Show period end if available
          if (status.periodEnd) {
            const billed = proCard.querySelector('.plan-billed');
            if (billed) {
              const renewDate = status.cancelAtPeriodEnd
                ? 'Cancels ' + status.periodEnd.toLocaleDateString()
                : 'Renews ' + status.periodEnd.toLocaleDateString();
              billed.textContent = renewDate;
            }
          }
        }

        // Show cancellation notice if pending
        if (status.cancelAtPeriodEnd) {
          const notice = document.createElement('div');
          notice.style.cssText = 'text-align:center;margin-top:12px;font-size:0.82rem;color:#F59E0B;font-family:DM Mono,monospace';
          notice.textContent = '⚠ Subscription will cancel at end of billing period';
          document.querySelector('.pricing-grid')?.after(notice);
        }
      }
    });

    // ---- Billing toggle ----
    let selectedBilling = 'monthly';
    document.querySelectorAll('.billing-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.billing-btn').forEach(b => b.classList.toggle('active', b === btn));
        selectedBilling = btn.dataset.billing;
        if (selectedBilling === 'yearly') {
          document.getElementById('pro-price').innerHTML = '<sup>$</sup>3<sub>/mo</sub>';
          document.getElementById('pro-billed').textContent = 'Billed $36/year · cancel anytime';
          document.getElementById('checkout-sub').textContent = 'mdothree Pro — $36/year · Cancel anytime';
        } else {
          document.getElementById('pro-price').innerHTML = '<sup>$</sup>4<sub>/mo</sub>';
          document.getElementById('pro-billed').textContent = 'Billed monthly · cancel anytime';
          document.getElementById('checkout-sub').textContent = 'mdothree Pro — $4/month · Cancel anytime';
        }
        if (document.getElementById('checkout-section').classList.contains('visible')) {
          mountPayment();
        }
      });
    });

    // ---- Subscribe button ----
    let _stripe = null, _elements = null;

    document.getElementById('subscribe-btn').addEventListener('click', async () => {
      if (isPro()) { window.open(STRIPE_CONFIG.portalUrl, '_blank'); return; }
      document.getElementById('checkout-section').classList.add('visible');
      document.getElementById('checkout-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      await mountPayment();
    });

    async function mountPayment() {
      const submitBtn   = document.getElementById('checkout-submit');
      const submitLabel = document.getElementById('checkout-submit-label');
      const errorEl     = document.getElementById('payment-error');
      const mountEl     = document.getElementById('payment-element');

      submitBtn.disabled = true;
      submitLabel.textContent = 'Loading…';
      mountEl.className = 'loading';
      mountEl.innerHTML = '';

      // Load Stripe.js
      if (!window.Stripe) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://js.stripe.com/v3/';
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      _stripe = window.Stripe(STRIPE_CONFIG.publishableKey);

      const user = getFirebaseAuth().currentUser;
      let idToken = '';
      try { if (user) idToken = await user.getIdToken(); } catch { /* anon */ }

      let clientSecret;
      try {
        const resp = await fetch('/api/stripe/create-setup-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({ uid: user?.uid, plan: selectedBilling }),
        });
        const data = await resp.json();
        if (!data.clientSecret) throw new Error(data.error || 'No client secret returned');
        clientSecret = data.clientSecret;
      } catch (e) {
        mountEl.className = '';
        mountEl.innerHTML = '<p style="color:#EF4444;font-size:0.85rem;padding:8px 0">Could not load payment form. Please refresh and try again.</p>';
        return;
      }

      const appearance = {
        theme: 'stripe',
        variables: {
          colorPrimary: '#10B981', colorBackground: '#ffffff',
          colorText: '#0F172A', colorDanger: '#EF4444',
          fontFamily: '"DM Sans", system-ui, sans-serif', borderRadius: '8px',
        },
        rules: {
          '.Input': { border: '1.5px solid #CBD5E1', boxShadow: 'none' },
          '.Input:focus': { border: '1.5px solid #10B981', boxShadow: '0 0 0 3px rgba(16,185,129,0.12)' },
          '.Label': { fontWeight: '600', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' },
        },
      };

      _elements = _stripe.elements({ clientSecret, appearance });
      const paymentEl = _elements.create('payment', { layout: 'tabs' });
      mountEl.className = '';
      paymentEl.mount(mountEl);

      submitBtn.disabled = false;
      submitLabel.textContent = selectedBilling === 'yearly' ? 'Subscribe — $36/year' : 'Subscribe — $4/month';

      submitBtn.onclick = async () => {
        submitBtn.disabled = true;
        submitLabel.textContent = 'Processing…';
        errorEl.textContent = '';
        const { error } = await _stripe.confirmPayment({
          elements: _elements,
          confirmParams: { return_url: window.location.href + '?stripe_success=1' },
        });
        if (error) {
          errorEl.textContent = error.message;
          submitBtn.disabled = false;
          submitLabel.textContent = selectedBilling === 'yearly' ? 'Subscribe — $36/year' : 'Subscribe — $4/month';
        }
      };
    }

    // Billing portal link
    document.getElementById('billing-portal-link')?.addEventListener('click', e => {
      e.preventDefault();
      window.open(STRIPE_CONFIG.portalUrl, '_blank');
    });

    // ---- FAQ accordion ----
    document.querySelectorAll('.faq-q').forEach(btn => {
      btn.addEventListener('click', () => {
        const isOpen = btn.classList.contains('open');
        document.querySelectorAll('.faq-q').forEach(b => { b.classList.remove('open'); b.nextElementSibling.classList.remove('open'); });
        if (!isOpen) { btn.classList.add('open'); btn.nextElementSibling.classList.add('open'); }
      });
    });

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
