# MDO3 — Status (rolling snapshot, kept true by the MDO3D CoS)

*Last updated: 2026-10-16 ~08:10 ET (rewritten to the Now / State / Next / Gate shape; the 2026-08-16 → 09-01 content
is verbatim in [`documentation/archive/STATUS_through_2026-09-01.md`](documentation/archive/STATUS_through_2026-09-01.md)).
Seat: [`Organization/Chief-of-Staff/README.md`](Organization/Chief-of-Staff/README.md) · direction log:
[`coordination/COS_CHANNEL.md`](coordination/COS_CHANNEL.md) · fix queue: [`grok/FLEET_FIX_QUEUE.md`](grok/FLEET_FIX_QUEUE.md)
· decisions: `~/latarence/docs/DECISIONS.md` · what is broken for real users: `~/latarence/coordination/BROKEN_NOW.md`
· open calls: `~/jarvis/JARVIS QUESTIONS.md` · access steps: `~/latarence/coordination/SETUP_TODO.md`.*

## Now
| Area | State | Next | Gate |
|---|---|---|---|
| Direction (before/after proposal) | 13-page PDF `~/Downloads/MDO_BEFORE_AFTER_PROPOSAL_2026-10-16.pdf` (source `staged/proposal_2026-10-16/`): one design system, 33 hosts → Guidance / Rigor / mdothree + an mdo3d.com index, a price ladder, Daily AI Toll patron + data packages (merch later). Principal 10-16 07:30: "proceed with this mdothree direction"; "our domains are real estate". | Execute per family below | — |
| Brand pass | Branches `design/brand-2026-10-16` (not pushed or deployed); preview `staged/brand_preview_2026-10-16/index.html` (+ `mdo_variants.html`). **Approved:** Blacklab B as is; **Rigor = the yellow-and-black look**; **no italics** anywhere in MDO3 / Rigor (Principal 08:20). **Decided:** mdo3d.com keeps its original design with a light polish; Baby Name Oracle keeps its original colors; names + leads in the MDO3 family; Ronna is its own identity. **Still weighed:** the 3 MDO variants (Principal: "keep weighing all 3"). No-italics pass done on the brand-pass surfaces; a follow-up sweep (divination CSS, mdo3d-static, social templates) and the `tokens.json` → `brand-tokens.json` rename (gitignore collision) were running at 10-16 07:55 ET. | Finish the italics sweep; MDO production deploy | Principal GO (MDO production deploys) |
| mdothree.com | Approved direction (10-16): open developer tools usable without sign-up (never called "free") funnelling to paid products, plus a one-time **$29 lifetime Pro** (a Principal-approved paid-only exception for these tools only). Built on `feat/mdothree-pro-2026-10-16` in 10 repos; xps API tests 35/35. GO staged `staged/mdothree_pro_2026-10-16/MDOTHREE_PRO_GO.sh` (stripe → api → web). Live today: a Pro purchase charges but never grants (BROKEN_NOW P0 #6). | Run the GO in TEST, then live | Setup `[mdo-stripe-test]` + `[mdothree-firebase-login]`; JARVIS §1b GO |
| Rigor | Yellow-and-black look approved; Rigor Pro API answers 404 under `/api/*` (BROKEN_NOW P1 #10); $9.99 → $10 decided under pricing delegation. | Secrets + API deploy | Setup "Rigor API secrets into Vercel"; JARVIS M1 (sprint pass) |
| BlacklabB (blacklabb.com; MDO3, not AHL's Blacklab) | Brand approved. blacklabb.com 404 (Bubble). Options for the "Future Technology Trackers" (Frontier / Promise Ledger; member-curated verified alerts): `~/jarvis/BLACKLABB_AND_MDOTHREE_OPTIONS_2026-10-16.md`. Domain future undecided (Principal 10-14). "The Channels" is the YouTube channel name only. | Build after the pick | JARVIS BL1 |
| Divination + names | Privacy disclosure (birth data / dream text sent to Anthropic) **live** (Principal GO 10-15). mdo3d `main` 078d344 → b70c23f (ff; checkout-email prompt, example readings, footer links). Price ladder $3 / $5 / $9 and names $2.99 → $3 decided under pricing delegation; need the Stripe price script. | Price script run | Setup `[mdo-stripe-pricing-key]`; JARVIS L1 (BlackLabb line items) |
| Daily AI Toll | Paid = patron tier + packaged datasets (Principal 10-15). Open: add-patron workflow shell-injection fix can't be pushed (BROKEN_NOW P0 #7); KV unreachable (#39). | Push the workflow fix; KV | Setup `[mdo-dat-workflow]`, `[mdo-dat-kv]`, `[gh-tokens-expired-2026-10-16]` |
| Ronna scanner + leads | Pro $10/mo decided; backend hardened on `harden/deploy-ready`; API TLS 525 (BROKEN_NOW #14); leads.mdo3d.com 530 (#13), fix retargeted to xps. | Deploy after keys | Setup `[mdo-ronna-keys]`, `[R-leads-mdo3d-530-1]`; JARVIS M1 |
| Runwae app (runwae.com) | Feed/XSS hotfix **live** (10-15). Live P0: creators can self-verify a payout (BROKEN_NOW #1). Interim payout guard + full security fix staged (`staged/runwae_sec_GO/`). One-style system approved 10-14; pricing copy + the "100%" claim still open. | Guard, then the full fix | JARVIS RUNWAE-PAYOUT-GUARD-GO, RUNWAE-SEC-GO; setup `[runwae-rtdb-admin]` |
| Runwae Apparel (Butts Studios brand; files here) | Release lineup applied (no black; Botanical Tee, True Grit Hoodie, Figure Overshirt, Faces Tee dropped; Knit Polo Charcoal). Release notes are **notes only** (`projects/external/runwae-apparel/RELEASE_NOTES_PENDING_2026-10-16.md`). Identity drafts (audience stereotypes) in `APPAREL_PLAYBOOK.md`. Photo + teaser prompt folders in ~/Downloads (see `~/buttsstudios/STATUS.md`). runwaeapparel.com TLS down. | Principal picks; shop launch mode | JARVIS R1, R2, AP1, SH1; setup `[runwae-holding]` |
| Domains | Every owned domain must carry an income path (Principal 10-16). Study: `~/latarence/docs/strategy/DOMAIN_REAL_ESTATE_2026-10-16.md`. | Per-domain calls | JARVIS DR1 |
| Repos + tokens | Tokens moved out of git remote URLs into `~/.config/git-tokens.env`; `MDOTHREE_GH_TOKEN` and `LATARENCE_GH_TOKEN` return 401, so pushes from those repos fail (BROKEN_NOW #45). | Re-token | Setup `[gh-tokens-expired-2026-10-16]` |
| MDO P0 GO bundle (10-14) | Staged `staged/mdo_go_2026-10-14/README.md` (rigor tools, dailyaitoll dataset, honest copy, quick wins, fulfilment); on the Bridge's GO list. | Run per GO | Principal GO |
| Loops | 9 loop specs drafted in [`loops/`](loops/README.md); never fired (LEDGER has the setup row only). | Fire one loop | — |

## Open Principal decisions (JARVIS ids)
M1 (Rigor sprint pass, Ronna park, Runwae membership) · BL1 (BlacklabB trackers + domain) · DR1 (domain calls) · L1
(governing law; BlackLabb on Stripe line items) · MDO-STRIPE-NAME · MDO-RONNA-KEYS · MDO-LAUNCH-GATES · R1 / R2 / AP1 / SH1
(apparel) · RUNWAE-PAYOUT-GUARD-GO / RUNWAE-SEC-GO · §1b mdothree Pro GO.

## Recent (newest first)
- 2026-10-16: before/after proposal PDF; brand pass + round-2 preview; Principal review (Blacklab B approved, Rigor
  yellow-and-black, mdo3d original + polish, no italics, 3 MDO variants still weighed); mdothree Pro built and staged;
  BlacklabB / mdothree options doc; domain real-estate study; Runwae Apparel lineup + notes-only release notes; mdo3d
  main synced; CoS seat state check (loops never fired).
- 2026-10-15: Runwae feed/XSS hotfix live; MDO privacy disclosure live; seller = project name on legal pages.
- 2026-10-14: "The Channels" = YouTube channel name only; pricing delegated to the Bridge (no *.99).
