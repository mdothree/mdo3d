// js/success-core.js — /success state logic (no imports, so it is unit-testable in node).
//
// Pro is granted ONLY by the Stripe webhook (mdothree-api functions/stripe/webhook.js
// writes subscriptions/{uid} with the Admin SDK; firestore.rules deny client writes).
// This page never writes anything. It reads the signed-in user's own
// subscriptions/{uid} doc (the rules allow the owner to read it), polls briefly while
// the webhook lands, and then says only what it can confirm.

export const CONTACT = 'hello@mdothree.com';
// Stripe Checkout session ids: cs_test_… / cs_live_… (the hardened API's fixed success_url).
export const SESSION_RE = /^cs_[A-Za-z0-9_]{6,250}$/;
/** Mirrors mdothree-api lib/entitlement.js isActiveEntitlement() and pro-api.js hasProEntitlement():
 *  a paid, unrevoked lifetime purchase written by the Stripe webhook. (Kept import-free for node tests.) */
export function isActiveEntitlement(d) {
  return !!d && d.isPro === true && d.plan === 'pro' && d.status === 'lifetime' && d.lifetime === true;
}

export const COPY = {
  activating: {
    title: 'Payment received, activating…',
    message: 'Stripe sent you back here after checkout. Confirming Pro on your account, this usually takes under a minute.',
  },
  active: {
    title: 'Pro is active',
    message: 'Lifetime Pro is on for this account. It never expires. Reload any mdothree tool where you are signed in to use it.',
  },
  // Signed in on the tool, not on mdothree.com: this page cannot read that account.
  received_elsewhere: {
    title: 'Payment received, activating…',
    message: 'Pro turns on for the account you checked out with as soon as Stripe confirms the payment, usually within a minute. Go back to the mdothree tool you came from and reload it. If Pro is not on after 10 minutes, contact ' + CONTACT + '.',
  },
  unconfirmed: {
    title: "We couldn't confirm",
    message: "We couldn't confirm Pro on this account yet. If you were charged, contact " + CONTACT + ' with the time of your payment and we will sort it out.',
  },
  no_session: {
    title: "We couldn't confirm",
    message: 'No checkout session was found on this link. If you completed a payment, contact ' + CONTACT + '.',
  },
};

/**
 * @param {object} o
 * @param {string|null} o.sessionId           ?session_id from the Stripe redirect
 * @param {() => Promise<object|null>} o.waitForUser  first auth state (null when signed out)
 * @param {(uid: string) => Promise<object|null>} o.readSubscription  subscriptions/{uid} data
 * @param {(state: string) => void} [o.onUpdate]
 * @returns {Promise<'active'|'received_elsewhere'|'unconfirmed'|'no_session'>}
 */
export async function resolveSuccessState({ sessionId, waitForUser, readSubscription, onUpdate,
  tries = 12, everyMs = 2500, sleep = (ms) => new Promise(r => setTimeout(r, ms)) }) {
  if (!sessionId || !SESSION_RE.test(sessionId)) return 'no_session';
  if (onUpdate) onUpdate('activating');

  let user = null;
  try { user = await waitForUser(); } catch { user = null; }
  if (!user || user.isAnonymous || !user.uid) return 'received_elsewhere';

  for (let i = 0; i < tries; i++) {
    try {
      if (isActiveEntitlement(await readSubscription(user.uid))) return 'active';
    } catch { /* not readable yet (offline / rules) — keep polling, then say so honestly */ }
    if (i < tries - 1) await sleep(everyMs);
  }
  return 'unconfirmed';
}
