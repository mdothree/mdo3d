// js/pages/pro.js — Pro upgrade page logic
import { ensureAnonymousUser, onAuthChange, getFirebaseAuth } from '../config/config.js?v=395f277a60';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js?v=395f277a60';
import { initSubscription, isPro, onSubscriptionChange, refreshSubscription } from '../services/subscriptionService.js?v=395f277a60';
import { STRIPE_CONFIG, PRO_CHECKOUT_ENABLED } from '../config/config.js?v=395f277a60';
// mdothree-api client (hardened API 883dbfc): Bearer Firebase ID token, guests refused, no uid in bodies.
// createCheckoutSession ties the Stripe session to the signed-in account (the webhook grants Pro by uid);
// the old Stripe Payment Links carried no uid, so /pro no longer links to them.
import { createCheckout, signedInUser, ProApiError, proErrorMessage } from '../pro-api.js?v=395f277a60';

// #66b: the static page says "coming soon" (no price, no checkout). Only when
// PRO_CHECKOUT_ENABLED is on does it become a purchasable plan.
if (PRO_CHECKOUT_ENABLED) {
  document.getElementById('pro-eyebrow').textContent = '⭐ mdothree Pro';
  document.getElementById('pro-sub').textContent = 'One subscription. Full access to every Pro feature across every mdothree.com utility — hash, password, color, and time tools.';
  document.getElementById('billing-toggle').hidden = false;
  document.getElementById('pro-label').textContent = 'Most popular';
  document.getElementById('pro-price').innerHTML = '<sup>$</sup>4<sub>/mo</sub>';
  document.getElementById('pro-billed').textContent = 'Billed monthly · cancel anytime';
  const btn = document.getElementById('subscribe-btn');
  btn.disabled = false; btn.removeAttribute('aria-disabled'); btn.textContent = 'Get Pro →';
  document.getElementById('faq-buy-today')?.remove();
}

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
    const headerAuth = document.querySelector('.mdo-actions');   // shared nav cluster (site-chrome)
    onSubscriptionChange(status => {
      if (status.isPro) {
        // Header badge
        if (headerAuth && !headerAuth.querySelector('.pro-badge')) {
          const badge = document.createElement('span');
          badge.className = 'pro-badge';
          badge.textContent = '★ Pro active';
          headerAuth.insertBefore(badge, headerAuth.querySelector('[data-mdo-account]'));
        }

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
      if (!PRO_CHECKOUT_ENABLED) return;   // #66b: no checkout while Pro is coming soon
      document.getElementById('checkout-section').classList.add('visible');
      document.getElementById('checkout-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      await mountPayment();
    });

    // Hosted Stripe Checkout through createCheckoutSession (sign-in first). The server fixes the price
    // ($4/month or $36/year) and the success/cancel URLs (mdothree.com/success, /pro?checkout=cancel).
    async function mountPayment() {
      if (!PRO_CHECKOUT_ENABLED) return;
      const submitBtn   = document.getElementById('checkout-submit');
      const submitLabel = document.getElementById('checkout-submit-label');
      const mountEl     = document.getElementById('payment-element');
      const errorEl     = document.getElementById('payment-error');
      const auth = getFirebaseAuth();
      const label = () => signedInUser(auth)
        ? (selectedBilling === 'yearly' ? 'Continue to checkout — $36/year' : 'Continue to checkout — $4/month')
        : 'Sign in to continue';

      mountEl.classList.remove('loading');
      mountEl.textContent = signedInUser(auth)
        ? "You'll pay on Stripe's secure checkout page, then come back to mdothree.com."
        : proErrorMessage(401, 'sign_in_required');
      if (errorEl) errorEl.textContent = '';
      submitBtn.disabled = false;
      submitLabel.textContent = label();
      submitBtn.onclick = async () => {
        if (errorEl) errorEl.textContent = '';
        if (!signedInUser(auth)) {
          // Sign in or create an account (js/auth-ui.js, loaded now). The guest session on this page is
          // linked to the new account, so the purchase lands on that account.
          const { openSignIn } = await import('../auth-nav.js?v=395f277a60');
          const signed = await openSignIn({ reason: 'Pro belongs to your mdothree account. Sign in or create one, then continue to checkout.' }).catch(() => null);
          if (signed && signedInUser(auth)) {
            const status = await refreshSubscription();
            if (status?.isPro) return;   // onSubscriptionChange switches the page to "Manage billing"
          }
          return mountPayment();
        }
        submitBtn.disabled = true;
        submitLabel.textContent = 'Opening secure checkout…';
        try {
          const url = await createCheckout(selectedBilling === 'yearly' ? 'yearly' : 'monthly', {
            baseUrl: STRIPE_CONFIG.functionsBaseUrl,
            auth,
          });
          window.location.assign(url);
        } catch (e) {
          if (errorEl) errorEl.textContent = e instanceof ProApiError ? e.message : proErrorMessage(500, 'internal');
          submitBtn.disabled = false;
          submitLabel.textContent = label();
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
