// js/auth-nav.js — mdothree.com adapter for the shared MDOThree nav cluster (shared/mdothree/site-chrome.js).
// Same contract as shared/mdothree/auth-nav.config.js; this site's config.js imports the Firebase SDK
// statically, so it is only loaded on pages that carry the firebase-config meta (e.g. /pro).
//  - Anonymous guests count as signed out; there is no sign-in flow yet, so no "Sign in" button.
//  - A real (non-anonymous) Firebase user gets the account menu with Sign out.
//  - PRO_CHECKOUT_ENABLED=false (#66b): the Pro control stays "Pro (coming soon)" -> /pro.
const chromeReady = () => window.mdoChrome
  ? Promise.resolve(window.mdoChrome)
  : new Promise(res => document.addEventListener('mdo-chrome-ready', () => res(window.mdoChrome), { once: true }));

chromeReady().then(async chrome => {
  if (!document.querySelector('meta[name="firebase-config"]')) { chrome.setUser(null); return; }
  try {
    const [cfg, { signOut }] = await Promise.all([
      import('./config/config.js'),
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'),
    ]);
    if (cfg.PRO_CHECKOUT_ENABLED) chrome.setCheckout({ enabled: true, href: '/pro' });
    cfg.onAuthChange(u => chrome.setUser(u && !u.isAnonymous ? u : null, { signOut: () => signOut(cfg.getFirebaseAuth()) }));
  } catch (e) {
    chrome.setUser(null);
  }
});
