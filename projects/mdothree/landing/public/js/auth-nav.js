// js/auth-nav.js — mdothree.com adapter for the shared MDOThree nav cluster (shared/mdothree/site-chrome.js).
// Same contract as shared/mdothree/auth-nav.config.js; this site's config.js imports the Firebase SDK
// statically, so it is only loaded on pages that carry the firebase-config meta (e.g. /pro).
//  - Anonymous guests count as signed out.
//  - PRO_CHECKOUT_ENABLED=false (#66b, today): the Pro control stays "Pro (coming soon)" -> /pro and
//    signed-out visitors see no account control.
//  - When it is on, signed-out visitors get a "Sign in" button that opens js/auth-ui.js (loaded on demand).
//  - A real (non-anonymous) Firebase user gets the account menu with Sign out.
const chromeReady = () => window.mdoChrome
  ? Promise.resolve(window.mdoChrome)
  : new Promise(res => document.addEventListener('mdo-chrome-ready', () => res(window.mdoChrome), { once: true }));

async function getAuthInstance() {
  const cfg = await import('./config/config.js?v=395f277a60');
  return cfg.getFirebaseAuth();
}

/**
 * Open the shared sign-in / create-account / reset dialog. Resolves to the signed-in user, or null.
 * @param {{ mode?: 'signin'|'signup'|'reset', reason?: string }} [opts]
 */
export async function openSignIn(opts = {}) {
  const ui = await import('./auth-ui.js?v=395f277a60');
  return ui.openAuthDialog({ ...opts, getAuth: getAuthInstance });
}

chromeReady().then(async chrome => {
  if (!document.querySelector('meta[name="firebase-config"]')) { chrome.setUser(null); return; }
  try {
    const [cfg, { signOut }] = await Promise.all([
      import('./config/config.js?v=395f277a60'),
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'),
    ]);
    if (cfg.PRO_CHECKOUT_ENABLED) chrome.setCheckout({ enabled: true, href: '/pro' });
    const signedOutOpts = cfg.PRO_CHECKOUT_ENABLED ? { signIn: () => openSignIn() } : {};
    cfg.onAuthChange(u => chrome.setUser(u && !u.isAnonymous ? u : null, { ...signedOutOpts, signOut: () => signOut(cfg.getFirebaseAuth()) }));
  } catch (e) {
    chrome.setUser(null);
  }
});
