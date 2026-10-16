// js/pages/pro.js — /pro: mdothree Pro, one $29 lifetime purchase (DECISIONS 2026-10-16).
import { ensureAnonymousUser, getFirebaseAuth } from '../config/config.js?v=6e95661319';
import { showToast as uiToast } from '../utils/ui-helpers.js?v=6e95661319';
import { initSubscription, isPro, onSubscriptionChange, refreshSubscription } from '../services/subscriptionService.js?v=6e95661319';
import { STRIPE_CONFIG, PRO_CHECKOUT_ENABLED } from '../config/config.js?v=6e95661319';
// mdothree-api client: Bearer Firebase ID token, guests refused, no uid in bodies. createCheckoutSession opens a
// Stripe-hosted Checkout for the one lifetime price; only the Stripe webhook grants Pro (by uid). No Payment Link.
import { createCheckout, createPortal, signedInUser, ProApiError, proErrorMessage, PRO_OFFER } from '../pro-api.js?v=6e95661319';

// Closed (today): the static page says "opening soon" and nothing can be bought.
// Open (PRO_CHECKOUT_ENABLED, after the Principal's GO): the same page sells the one lifetime offer.
if (PRO_CHECKOUT_ENABLED) {
  document.getElementById('pro-eyebrow').textContent = 'mdothree Pro · lifetime';
  document.getElementById('pro-sub').textContent = 'Every mdothree tool stays open with no sign-up. Pro is a single ' + PRO_OFFER.price + ' purchase that lifts the limits and unlocks the extra features in every tool, on your mdothree account, with no subscription.';
  document.getElementById('pro-label').textContent = 'Lifetime';
  document.getElementById('pro-billed').textContent = 'One payment · lifetime · no subscription';
  const btn = document.getElementById('subscribe-btn');
  btn.disabled = false; btn.removeAttribute('aria-disabled'); btn.textContent = 'Get Pro, ' + PRO_OFFER.price + ' once';
  document.getElementById('faq-buy-today')?.remove();
}

initSubscription();
ensureAnonymousUser();

const auth = getFirebaseAuth();

async function openReceipts() {
  try {
    const url = await createPortal(window.location.href, { baseUrl: STRIPE_CONFIG.functionsBaseUrl, auth });
    window.location.assign(url);
  } catch (e) {
    uiToast(e instanceof ProApiError ? e.message : proErrorMessage(500, 'internal'), 'error');
  }
}

// ---- Return from Stripe with ?checkout=cancel ----
const params = new URLSearchParams(window.location.search);
if (params.get('checkout') === 'cancel') {
  const url = new URL(window.location);
  url.searchParams.delete('checkout');
  history.replaceState({}, '', url);
  uiToast('Checkout cancelled. Nothing was charged.', 'info');
}

// ---- Owner state ----
const headerAuth = document.querySelector('.mdo-actions');   // shared nav cluster (site-chrome)
onSubscriptionChange(status => {
  if (!status.isPro) return;
  if (headerAuth && !headerAuth.querySelector('.pro-badge')) {
    const badge = document.createElement('span');
    badge.className = 'pro-badge';
    badge.textContent = '★ Pro, lifetime';
    headerAuth.insertBefore(badge, headerAuth.querySelector('[data-mdo-account]'));
  }
  const btn = document.getElementById('subscribe-btn');
  btn.disabled = false; btn.removeAttribute('aria-disabled');
  btn.textContent = 'View receipts';
  btn.onclick = openReceipts;
  document.getElementById('checkout-section')?.classList.remove('visible');
  const label = document.getElementById('pro-label');
  if (label) label.textContent = '✓ You own Pro';
  const billed = document.getElementById('pro-billed');
  if (billed) billed.textContent = 'Lifetime · never expires';
});

// ---- Buy ----
document.getElementById('subscribe-btn').addEventListener('click', async () => {
  if (isPro()) return;                     // owners get "View receipts" (onclick above)
  if (!PRO_CHECKOUT_ENABLED) return;       // closed: nothing to buy
  document.getElementById('checkout-section').classList.add('visible');
  document.getElementById('checkout-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  mountCheckout();
});

// Hosted Stripe Checkout through createCheckoutSession (sign-in first). The server fixes the price
// ($29 one-time) and the success/cancel URLs (mdothree.com/success, /pro?checkout=cancel).
function mountCheckout() {
  if (!PRO_CHECKOUT_ENABLED) return;
  const submitBtn   = document.getElementById('checkout-submit');
  const submitLabel = document.getElementById('checkout-submit-label');
  const mountEl     = document.getElementById('payment-element');
  const errorEl     = document.getElementById('payment-error');
  const label = () => signedInUser(auth) ? 'Continue to checkout, ' + PRO_OFFER.price + ' once' : 'Sign in to continue';

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
      // Sign in or create an account (js/auth-ui.js, loaded now) so the purchase lands on that account.
      const { openSignIn } = await import('../auth-nav.js?v=6e95661319');
      const signed = await openSignIn({ reason: 'Pro belongs to your mdothree account. Sign in or create one, then continue to checkout.' }).catch(() => null);
      if (signed && signedInUser(auth)) {
        const status = await refreshSubscription();
        if (status?.isPro) return;       // onSubscriptionChange switches the page to the owner state
      }
      return mountCheckout();
    }
    submitBtn.disabled = true;
    submitLabel.textContent = 'Opening secure checkout…';
    try {
      const url = await createCheckout(PRO_OFFER.plan, { baseUrl: STRIPE_CONFIG.functionsBaseUrl, auth });
      window.location.assign(url);
    } catch (e) {
      if (errorEl) errorEl.textContent = e instanceof ProApiError ? e.message : proErrorMessage(500, 'internal');
      submitBtn.disabled = false;
      submitLabel.textContent = label();
    }
  };
}

document.getElementById('billing-portal-link')?.addEventListener('click', e => {
  e.preventDefault();
  openReceipts();
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
