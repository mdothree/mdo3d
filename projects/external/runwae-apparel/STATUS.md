# Runwae Apparel — STATUS

*Updated 2026-10-12 (decision wave) by the C2 Studios/Runwae pane. Plan of record: [`APPAREL_PLAYBOOK.md`](./APPAREL_PLAYBOOK.md)
(replaced 2026-10-08 with the dispatch version of 2026-10-07). Nothing has been published, listed, posted, ordered or charged.*

## At a glance
| Area | State |
|---|---|
| Model | **Decided** (2026-10-07): pre-order drops from the Pakistan supplier, Printful POD in parallel, self-fulfillment, one custom storefront shared with GLB |
| runwaeapparel.com | **DOWN.** Re-checked 2026-10-08: `sslv3 alert handshake failure` on apex + www (Shopify edge 23.227.38.32 serves no cert for the custom domain). Fix is **operator-only**: Shopify Admin → Settings → Domains → remove + reconnect |
| girlslovebutts.com | Resolves, HTTP 200, `Server: DPS/2.0.0` (looks like a GoDaddy builder/parked page, not a store) |
| Design source | Copied to `design/` (139 files, checksums verified; Downloads untouched). **Stays local, git-ignored** (decided #82-c, 2026-10-12) |
| Supplier | Unverified. No contact in years |
| Accounts / keys | None handed over yet (Printful, Stripe, Shippo/EasyPost): `operator_setup.json` → group 4 `setup-apparel-pod` |
| First drop | Undetermined (most likely a Fall '21 re-release) |
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
- ⚠️ **Rights flag (found 2026-10-12):** the **birdcage-head illustration** (back of the wordmark tee, `FB2`) is signed by an
  **outside artist**: `GLB/Design/IMG_3206.JPG` carries the watermark `NINEPARDON105@GMAIL.COM` (file dated 2021-01-11).
  Probably a commission, but the playbook says the designs are LB's. `wordmark-tee` is on `rights_hold` in the catalog,
  so it can't be sold until LB confirms commercial rights or drops the back print.
- **Contact collateral:** business cards (Fayetteville, AR). The mobile site mock is in `design/runwaeapparelmobile.png`.

**Fall '21 line (mapped from file codes):**
| Product | Files (`design/Fall 21/`, transparent versions in `design/Transparent Clothing/`) | Notes |
|---|---|---|
| Crafting tee | `C1` front ("CRAFTING" stencil), `C2` back (dripping R + RUNWAE APPAREL) | orange tee |
| Wordmark tee | `FB1` front (small RUNWAE APPAREL), `FB2` back (birdcage-head illustration, coral) | black tee |
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

**GLB (sibling), catalogued 2026-10-12:** `~/Downloads/Butts_Studios/GLB/`.
- `Design/`: **6 usable line drawings**, single-line figure studies (back views, one sheet of six), shot as phone
  photos of paper. They need a clean scan or vectorising before any mockup (shadows, paper texture). Also: one
  "Brain Dead" notebook doodle, the birdcage illustration (third-party, see the rights flag above), and a screenshot
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
- [ ] **Supplier:** reconnect; get MOQ, price, lead time, methods/labels, deposit, air courier; pay for a 1–2 design sample run.
- [x] **Commit playbook/STATUS/storefront** (no deploy, no keys): done (#82-a, 2026-10-12).
- [ ] **First drop:** which pieces, and whether that's the split above. Was TLT ever released?
- [ ] **Old accounts:** are the Shopify/Etsy/Pinterest/social accounts in `GLBKeys.xlsx` still live? (reach)
- [ ] **Shopify catalog export:** if wanted, export products CSV from Admin (or share the `*.myshopify.com` handle) so the catalog, prices and copy can seed the new store.
- [ ] **Vector exports:** export print-ready art from the `.ai` masters (Illustrator is LB's machine/hands), or OK an agent to try a CLI export.
- [x] **Versioning `design/`:** stays local-only (#82-c, 2026-10-12).
- [ ] **Birdcage illustration rights:** commissioned with commercial rights, or drop it from the wordmark tee? (JARVIS #82-d)
- [ ] **Accounts/keys:** Printful, Stripe (test mode first), Shippo or EasyPost; PO box / virtual mailbox; label printer.

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
  - **#82-a:** committed the playbook, STATUS and `storefront/` to mdo3d (no deploy, no keys).
  - **#82-c:** `design/` stays local.
  - **#95** (Runwae *app* purple `#6259e8` / grey `#676c88`): verified it's in the pushed runwae tip `213606e` (from `fd07868`, the build #5 ships), so there was nothing to change. Leftovers aren't live: a CSS comment, and `main.min.css`, which no page links. One real one: the `email.html` template button is white on `#9389FF` (~3:1). That's app/email code, so it's handed to the MDO lane, not edited here.
  - **Still with the Principal:** #82-b (first drop), #82-d (birdcage art rights).
