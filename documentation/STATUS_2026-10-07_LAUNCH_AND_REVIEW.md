# MDO3D portfolio — review, fixes & launch status (2026-10-06 → 10-07)

Working doc for the multi-agent UI/correctness review, the fixes that shipped, the two new sites, and what's still open. Newest state at top.

## New sites (live)
| Site | Repo (private) | Hosting | Checkout (MDO3 Stripe) |
|---|---|---|---|
| https://layoffleads.com | mdothree/layoffleads → `projects/mdo3d/layoffleads` | Vercel `layoffleads` (team mdothrees-projects) | Pro $49/mo, $490/yr; customer portal |
| https://promptsforbusiness.com | mdothree/promptsforbusiness → `projects/mdo3d/promptsforbusiness` | Vercel `promptsforbusiness` | 12 packs @ $14, All-Access $59 |

- Domains bought on the MDO3 GoDaddy account; nameservers → Cloudflare (rustam/violet) via MDO3 GoDaddy PAT.
- layoffleads data: Big Local News WARN feed (Apache-2.0) + Daily AI Toll events → 4,220 events / 2,965 companies, 3,063 pages.
- Deploy: `vercel deploy --prod --archive=tgz` from each folder (both have `.vercelignore`; Vercel builds remotely).
- Paid delivery is MANUAL for now: prompts `npm run export:pack -- <slug|all>`; layoffleads `node scripts/export-csv.mjs`, then email the buyer.

## Email (all MDO3 Cloudflare zones)
Cloudflare Email Routing on, catch-all → mdo3group@gmail.com (verified) for: layoffleads.com, promptsforbusiness.com, mdo3d.com, mdothree.com, rigor.design, ronnascanner.com, runwae.com. Receive-only; replies go from Gmail.

## Accounts / capacity (verified)
- Vercel team `mdothrees-projects`: **Hobby plan** (non-commercial ToS) — upgrade to Pro before driving paid traffic. ~58 projects of 200.
- Stripe MDO3 (acct_1KQiak…, mdo3group@gmail.com): charges enabled, 2/16 webhook endpoints used.
- Firebase (mdo3group): 6 projects (mdo3d-career, mdo3d-leads, mdo3d-utilities, mdosuite, oracle-mdo3d, runwaedesign).
- Working Vercel token: the `vcp_7F…` one in `projects/external/runwae/.claude/settings.local.json`. `VERCEL_TOKEN_LAMAR` in sega_credentials.env is dead; token committed in `documentation/PROJECTS_STATUS.md` is dead (remove it).
- GoDaddy: LATARENCE and AHL keys work but don't hold MDO3 domains; MDO3 PAT was pasted in chat — rotate.

## Review & fixes shipped (commits on main across ~25 repos + mdo3d)
- Dead pages fixed: astrology/iching/runes/fengshui/pastlives (duplicate `firebaseConfig`), all rigor tools (`env.js` syntax), text/json/pdf/image/qr (imports/CDN), color/timestamp pages.
- Wrong results fixed: I Ching always #64 (+23 trigram pairs), astrology UTC sun sign, numerology 19/28, dreams/names substring matching, hash SHA-3/CRC32, timestamp zones/cron, JSON big numbers, text Unicode.
- Payments: dreams/tarot verify host, oracle checkout, paid-session binding per app/tier, astrology premium bypass, rigor portal/checkout auth, Stripe webhook raw body (9 APIs).
- Privacy: removed Firestore uploads of passwords, hash/timestamp/color input; XSS fixes.
- Honesty: removed fake fallbacks/scores, unverifiable stats & testimonials (FTC), copyright years → 2026.
- New: `projects/mdo3d/stripe-hub` (one webhook per Stripe account; optional — MDO3 has headroom).
- mdo3d.com source of truth moved: `projects/mdo3d/landing` → repo mdothree/mdo3d-landing (mdo3d-static is frozen).

## NOT live yet (needs Vercel CLI deploys)
Most of the reviewed fixes only reach production via `vercel deploy --prod` from each folder: divination APIs (security fixes first), rigor api + tools, dreams/tarot/oracle/numerology/fengshui/pastlife frontends, mdothree tools + landing, names, mdo3d.com (`projects/mdo3d/landing`), stripe-hub. Auto-deployed on push: astrology, iching, runes, compare.

## Open decisions / follow-ups
- Upgrade Vercel to Pro; rotate exposed tokens (Vercel x2, GoDaddy PAT).
- Firestore rules deploy: `firebase deploy --only firestore:rules` (mdo3d-career).
- APIs still down: leads.mdo3d.com (Cloudflare 1033), api.rigor.design (525), api.mdothree.com (525).
- Automate paid delivery (Stripe webhook → email) for both new sites.
- Product decisions in `reports/Paywall lessons for MDO3D apps.md` (divination pricing tests, mdothree single Pro plan, rigor shared quota/anonymous first try, hub pages).
- Retire "Lamar" naming (see below).

## "Lamar" naming (legacy)
Public: rigor.design and mdothree.com footers say "A Lamar Platform" (→ latarence.com); tarot/dreams api package.json author. Internal: `*_LAMAR` vars in `~/latarence/secrets/sega_credentials.env`, token docs' naming table, `~/.claude/skills/{builder,outreach}/orgs/lamar.yaml` and several skill/agent descriptions.

## Reports
- `reports/Paywall lessons for MDO3D apps.md` (research) + `research_notes/Paywall lessons for MDO3D apps/`
