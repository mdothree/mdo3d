# Runwae Apparel — STATUS

*Updated 2026-10-12 (decision wave) by the C2 Studios/Runwae pane. Plan of record: [`APPAREL_PLAYBOOK.md`](./APPAREL_PLAYBOOK.md)
(replaced 2026-10-08 with the dispatch version of 2026-10-07). Nothing has been published, listed, posted, ordered or charged.*

> **⚠ SUPERSEDED 2026-10-13 (Principal, verbatim):** "its not everything is didigtal only. we ahve apparel stores. take that rule out. that was taken the rwrong way at some point. thats not law. jsut an approaach lossely  internally". Physical apparel is back on; digital point of sale is a loose approach, not a rule.
>
> ~~**⏸ PHYSICAL ON HOLD (2026-10-12 ~18:22 ET):**~~ the Principal said "we dont want to sell phyiscal products". Printful,
> the supplier, the shipping kit, the physical pre-order checkout and the drop ads are **paused** until he confirms the
> Runwae Apparel call in JARVIS §3. Brand work continues: aesthetic, photos, holding page, shop design, and the
> **digital offer draft** (`DIGITAL_OFFER.md`).

## At a glance
| Area | State |
|---|---|
| Model | **Decided** (2026-10-07): pre-order drops from the Pakistan supplier, Printful POD in parallel, self-fulfillment, one custom storefront shared with GLB |
| runwaeapparel.com | **DOWN** (Shopify TLS; DNS at **GoDaddy**). **Holding page built + staged** (`storefront/deploy/holding_go.sh`): it needs a Vercel-token holder to run it and two GoDaddy records (JARVIS setup `[runwae-holding]`). Preview: `http://latarence-xps-9320:8730/holding/index.html` |
| girlslovebutts.com | Resolves, HTTP 200, `Server: DPS/2.0.0` (looks like a GoDaddy builder/parked page, not a store) |
| Design source | Copied to `design/` (139 files, checksums verified; Downloads untouched). **Stays local, git-ignored** (decided #82-c, 2026-10-12) |
| Supplier | Unverified. No contact in years |
| Accounts / keys | None handed over yet (Printful, Stripe, Shippo/EasyPost): `operator_setup.json` → group 4 `setup-apparel-pod` |
| First drop | **Both** (Principal, #82-b, 2026-10-12): the Fall '21 re-release + The Little Things, with ads behind the spend check (`ADS_PLAN.md`) |
| Digital shop preview | **Built** (2026-10-12): `catalog-digital.json`, 9 items (lookbook, 2 wallpaper packs + Drop Pass, 3 TLT editions + set, bundle), product images from LB's art, delivery/license terms. Preview: `http://latarence-xps-9320:8730/` (the held apparel shop is at `/physical/`) |
| Aesthetic + photos | `AESTHETIC.md`: *Everybody Influences*. Two photo looks rendered from LB's real mockups (A Gallery / B Sketchbook, 26 photos) and **awaiting his taste call**. Private preview: `http://latarence-xps-9320:8730/taste.html` (tailnet) |
| Storefront | **Built locally, not deployed** (2026-10-12): `storefront/` is one codebase for Runwae + GLB: static build, Stripe Checkout function (off by default, test keys only), drop toolkit CLI, 17 tests passing. All 13 Runwae products are `draft` with no price, so nothing is purchasable. See `storefront/README.md` |

## Brand source material (real, pre-LLM)
**Visual identity, as it stands in the archive:**
- **Primary mark:** the **dripping "R"** (script R with paint drips), used alone and inside the circular seal
  *"RUNWAE • APPAREL • COMPANY"*.
- **Secondary marks:** *"THE RUNWAE COMPANY"* (TRC) in a hand-drawn marker face; a block-sans **RUNWAE** wordmark;
  a **checkerboard step pattern** used as sleeve/hem trim (see `design/Samples.png`: windbreaker + polo concepts).
- **Editorial look:** the 2021 magazine cover *Runwae — "Everybody Influences", Issue No. 1* (stamped "Published
  October 2020 By Runwae Co."): Runwae garments photoshopped onto figures in **gilded-frame Renaissance/Baroque paintings**
  on charcoal, with salmon/coral accents and a serif wordmark. That's the "gold-frame renaissance" direction the
  playbook names for the storefront.
- **Line-art thread:** *"Luv thy neighbor"* (three hand-drawn figures) shares the hand-drawn line style that GLB is
  built on, a natural bridge between the two brands.
- **Third-party art, resolved:** the **birdcage-head illustration** (formerly the wordmark tee's back print, `FB2`) is signed
  by an outside artist (watermark on `GLB/Design/IMG_3206.JPG`). **Principal, #82-d, 2026-10-12: "drop the birdcage back
  print and go front only."** The wordmark tee is front-only, the art isn't used anywhere in the storefront, and a test
  keeps it out. Don't reuse it without a license.
- **Contact collateral:** business cards (Fayetteville, AR). The mobile site mock is in `design/runwaeapparelmobile.png`.

**Fall '21 line (mapped from file codes):**
| Product | Files (`design/Fall 21/`, transparent versions in `design/Transparent Clothing/`) | Notes |
|---|---|---|
| Crafting tee | `C1` front ("CRAFTING" stencil), `C2` back (dripping R + RUNWAE APPAREL) | orange tee |
| Wordmark tee | `FB1` front (small RUNWAE APPAREL) | black tee, **front only** (#82-d). `FB2` back art is third-party, not used |
| True Grit tee | `TG1` | black tee, orange dripping type |
| True Grit hoodie | `TRB1`, `TrueGrit` | black/white; olive/red version too |
| Poison hoodie | `Transparent Clothing/Poison` | black, cyan/magenta glow type |
| Pave hoodie | `apparel_design/pavemockup.png` | gold hoodie, embroidered brick "PAVE" + flowers, sleeve hit. **Embroidery: a supplier piece, not Printful** |
| Concepts | `Samples.png` | windbreaker, polo, checker trim |

**"The Little Things" line (TLT, catalogued 2026-10-11; `design/TLT/`, master `TLT/RWAline.ai`):**
A second, complete line, separate from Fall '21: white hand-drawn line art on black throughout.
- **Marks:** a hand-drawn **"RWA"** monogram over "THE LITTLE THINGS"; the statement *"In life it's all about the little things"* (copy 4).
- **Art:** the big-eyed line-drawn faces, alone (copy 6/11), in threes with *"Luv thy neighbor"* (copy 16/18/23), and in grids of four or six (copy 9/21/25).
- **Garments mocked up:** tees (front pocket hit + back print, copies 5–24), hoodies (copies 25–30 v2), **sweatpants** with the RWA leg hit (copy 28 v2). Copy, copy 2, copy 3 and `1x/Artboard 1` are line-sheet layouts.
- **Blanks:** `17075_*`, `19981_f_fm` and the hoodie jpeg are blank templates, not designs.
- **Why it matters:** one-colour white-on-black line art is the cheapest, cleanest Printful DTG candidate in the archive, and it's the same hand-drawn style GLB uses, so it's the natural shared-learning line. Whether it ever sold is unknown (no TLT art in the Shopify folder). **Principal: was TLT released?**

**Masters:** `Fall 21/all_products.ai`, `Fall 21/finaldesigns.ai` (also under `Transparent Clothing/`), `TLT/RWAline.ai`.
The PNGs are 2048² mockups, **not print files**. Printful and the supplier both need the vector or ≥300 dpi
artwork exported from the `.ai` masters.

**Elsewhere:** `~/buttsstudios/client_assets_archive/{runwae,runwaeapparel}/` (web exports, magazine, cards, colored
logo) · `~/buttsstudios/clients/runwae_template/` (old Firebase/Bootstrap site; reference only, not the new storefront) ·
`design/inspiration/`, `design/photo_pose_inspiration/` (shoot references).

**GLB (sibling), catalogued 2026-10-12:** `~/mdo3d/projects/external/runwae-apparel/design/glb/source_line_art/`.
- `Design/`: **6 usable line drawings**, single-line figure studies (back views, one sheet of six), shot as phone
  photos of paper. They need a clean scan or vectorising before any mockup (shadows, paper texture). Also: one
  "Brain Dead" notebook doodle, the birdcage illustration (third-party, not used; see above), and a screenshot
  of someone else's tee (reference only).
- `Branding Insp/`: 7 Instagram screenshots of other studios' work (bold hand-lettering, pastel pop palettes). **Mood only, never source.**
- `GLB.docx`, `Progress.xlsx` not opened yet. `GLBKeys.xlsx` holds passwords. It wasn't opened or copied, and it stays out of every repo, doc and chat.
- The tone is tasteful figure line art (non-explicit). Keep mockups and copy on that side of the line.

## Direction (proposed; brand calls are the Principal's)
1. **Lead with the archive, not new art.** The first drop is a Fall '21 re-release (or TLT, if it never shipped: it's all one-colour prints, which suits Printful). The natural split:
   - **Printful now:** the printed tees (Crafting, wordmark tee, True Grit tee). Low risk, live quickly.
   - **Supplier pre-order:** the hoodies (True Grit, Poison) and **Pave** (embroidery is the hero piece).
2. **The storefront wears the magazine.** Gilded frames, charcoal ground, coral accent, serif wordmark, with the
   dripping R as the favicon/seal. GLB shares the codebase but uses its own clean line-art theme.
3. **Mockups come from Printful's generator, lifestyle shots from the "Everybody Influences" concept.** Composite
   the real product shots into public-domain paintings to extend the existing campaign, rather than generic AI lifestyle images.
4. **TLT × the Studios cartoon.** Butts Studios is scoping *The Little Things* as a cartoon (`~/buttsstudios/production/the-little-things/`,
   JARVIS #61), a Butts Studios × Runwae collab using this same art. Time a TLT drop with its first Shorts so the cartoon is
   the reach plan, and reuse its `RWAline.ai` → SVG rigs as print-ready art rather than vectorising twice.
5. **Coordinate with the Butts Studios pane:** Runwae is a subsidiary mark. Agree on an endorsement line (e.g.
   "a Butts Studios company") and footer placement. Don't restyle Runwae into Studios purple/Poppins.

## Open decisions (Principal)
- [ ] **Shopify domain fix** (Admin UI), or let the store lapse once the custom site is live. Until one of those happens the public domain stays broken.
- [ ] **⏸ Supplier (ON HOLD):** reconnect; get MOQ, price, lead time, methods/labels, deposit, air courier; pay for a 1–2 design sample run.
- [x] **Commit playbook/STATUS/storefront** (no deploy, no keys): done (#82-a, 2026-10-12).
- [x] **First drop:** both lines (#82-b, 2026-10-12).
- [ ] **Photo look:** A Gallery / B Sketchbook / A for Fall '21 + B for TLT (taste call; preview link above).
- [ ] **Old accounts:** are the Shopify/Etsy/Pinterest/social accounts in `GLBKeys.xlsx` still live? (reach)
- [ ] **Shopify catalog export:** if wanted, export products CSV from Admin (or share the `*.myshopify.com` handle) so the catalog, prices and copy can seed the new store.
- [ ] **Vector exports:** export print-ready art from the `.ai` masters (Illustrator is LB's machine/hands), or OK an agent to try a CLI export.
- [x] **Versioning `design/`:** stays local-only (#82-c, 2026-10-12).
- [x] **Birdcage illustration:** dropped; the wordmark tee is front-only (#82-d, 2026-10-12).
- [ ] **⏸ Accounts/keys (physical, ON HOLD):** Printful, Shippo/EasyPost, PO box, label printer. Stripe is still needed for any digital offer.
- [x] **Digital vs physical:** resolved 2026-10-13: physical apparel is on; digital offers (`DIGITAL_OFFER.md`) are an add-on, not a replacement.

## Agent-doable
**Done 2026-10-12 (no accounts needed):**
- ✅ Storefront scaffold (`storefront/`): `brands/runwae` + `brands/glb` configs; the Runwae theme comes from the magazine
  (charcoal `#1f1f1f`, coral `#fa9674`, gilded frames, coral-tinted seal); preview mode (noindex + banner, no buy buttons);
  product pages with ship-by dates; policy page (pre-order terms, MOQ refund/swap, size-exchange-only); checkout function
  (server-side price, Stripe Tax, metadata for the tally, refuses `sk_live_`); CSP without `unsafe-inline`.
- ✅ Drop toolkit (`storefront/tools/drop.mjs`): ship-by (49 days after close by default), window check, tally,
  supplier PO CSV (+10%, at least one spare, MOQ flag), landed cost + suggested price, FTC-aware delay-notice text.
- ✅ Checked visually at desktop and 390px.

**Still doable without accounts:** (GLB catalogued 2026-10-12) an "Everybody Influences" lookbook page built
from the magazine assets.

**Once keys exist:** Stripe Checkout + Tax (test mode until OK'd), Printful catalog sync + Mockup Generator,
Shippo/EasyPost label + packing-slip pipeline, tracking/delay emails, GA4 → Stripe attribution.

**Never without a per-item OK:** publish, list for sale, post, place a supplier/Printful order, or take a live charge.

## Log
- **2026-10-08:** Booted the lane. Playbook replaced from the dispatch. Design copied to `design/` (139 files; the brief said 108,
  so the Principal has likely added files while organizing). Domain re-verified DOWN. Fall '21 file codes mapped. STATUS created.
  Nothing committed: the mdo3d change waits for the Principal's OK, per the dispatch.
- **2026-10-11:** Resumed after the usage reset; this lane had no background agents. No Principal replies yet. All 2026-10-08 work is still uncommitted, awaiting his OK. Domain still DOWN (TLS handshake failure). Catalogued the TLT line (36 files) from one contact sheet; no sub-agents used.
- **2026-10-12:** Under the standing order (do ungated work now), built `storefront/`, the shared Runwae + GLB codebase and drop toolkit. 17/17 tests pass; checked visually. Not deployed, not committed. Gated items (commit, deploy, accounts, first drop, pricing) are posted to `~/jarvis/JARVIS QUESTIONS.md` #82.
- **2026-10-12 (later):** Catalogued GLB: 6 usable line drawings that need scanning. Found third-party art: the birdcage illustration on the wordmark tee back is signed by an outside artist. Added a `rights_hold` guard to the catalog and checkout (tested) and posted the question to JARVIS #82-d.
- **2026-10-12 (decision wave):** Wave rows **#82 a + c** and **#95**.
  - **#82-a:** committed the playbook, STATUS and `storefront/` to mdo3d as `5413d8a` (local; no deploy, no keys). Not pushed: mdo3d main has diverged from origin.
  - **#82-c:** `design/` stays local.
  - **#95** (Runwae *app* purple `#6259e8` / grey `#676c88`): verified it's in the pushed runwae tip `213606e` (from `fd07868`, the build #5 ships), so there was nothing to change. Leftovers aren't live: a CSS comment, and `main.min.css`, which no page links. One real one: the `email.html` template button is white on `#9389FF` (~3:1). That's app/email code, so it's handed to the MDO lane, not edited here.
  - **Still with the Principal:** #82-b (first drop), #82-d (birdcage art rights).
- **2026-10-12 (#82-d answered):** The Principal said "drop the birdcage back print and go front only." Applied: catalog (one image, front-only copy, `rights_hold` cleared), the back-print asset removed, a test added so the art can't return, README and STATUS updated. **The only open decision is #82-b (first drop).** Tests now run off-box per doctrine.
- **2026-10-12 (#82-b answered):** The Principal said: "if Frunwae Apparel you need to specify since different from runwae. Yes we can drop this and run adas agianst it. I want to see the shopping page we come up with. Hopefully someone can come up with an aesthetic to style ours and generate our photos". Done:
  - **Naming:** the hero now reads "Runwae Apparel"; the copy sweep found no bare "Runwae".
  - **Aesthetic:** `AESTHETIC.md`.
  - **Photos:** `tools/photos.py` composites LB's real mockups into two looks (26 photos; designs untouched; $0; run on xps).
  - **Shop:** the build supports `--look` and adds `taste.html`.
  - **Ads:** `ADS_PLAN.md`, staged; the spend check fails 4/4 today, so there's no spend.
  - **Preview:** served privately on the xps tailnet (`~/runwae-apparel/serve-preview.sh`).
  - **Tests:** 19/19, run on xps.
  - **AI generation:** no image API key is available to this lane, and the garment itself must never be generated, so AI stays limited to backgrounds (gated: key + spend).
- **2026-10-12 (digital shop):** Holding page finished (absolute OG/canonical, Twitter card, strict CSP in its own `vercel.json`). Digital shop built with a `--catalog digital` build mode; checkout refuses digital items. `PHOTO_GEN_BRIEF.md` is the generated-photo brief (fal pending). Tests 23/23 on xps.


## 2026-10-14 · Butts Studios joins as the third apparel brand (Principal)
> "i want  to sell apparel for butts studios also. thats 3 - BS, Runwae appearl, and GLB."
- **Task (local, ungated):** add `storefront/brands/buttsstudios/` alongside runwae + glb, using the C5 logo
  (Archivo Bold + square-X; spec in `~/buttsstudios/design/DESIGN_DIRECTIONS.md`), black/bone/gold palette, and
  placeholder-free product list (empty until designs exist). Same Printful + Stripe Checkout path, test keys only.
- **Platform:** stays custom (one codebase, three brand configs). Shopify ×3 only if the Principal overrides.
