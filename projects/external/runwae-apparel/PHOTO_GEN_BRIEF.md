# Runwae Apparel: generated-photo brief (one page; for when the fal.ai key lands)

*2026-10-12. The house style is in `AESTHETIC.md` ("Everybody Influences"). This page covers only what an image model may
make, how, and for how much. Status: **pending the `[setup-fal]` key + billing cap. Nothing has been generated.***

## The one rule
**The model makes the room, never the work.** LB's art, marks, lettering and garments are **never generated, redrawn,
"enhanced" or upscaled by a model**. Every generated image is an empty **plate** (a wall, a desk, a hand, a phone with a
blank screen). LB's real file is composited onto it by code (`tools/photos.py` / `tools/digital_mocks.py`), pixel for pixel.

## What to generate (digital-only offer)
| Offer | Plate | Composite |
|---|---|---|
| TLT digital editions | a gallery wall, warm spotlight from above, empty gilt frame; or a quiet room corner, frame on a charcoal wall | the drawing into the frame |
| Design drops | a hand holding a phone, **blank black screen**, low light; a desk with a monitor, **blank screen** | the wallpaper into the screen (perspective warp) |
| Lookbook | an open magazine on a dark wooden table, **blank pages**, side light | the spreads/cover onto the pages |
| Campaign plates | Baroque/Renaissance-style interior, *no figures*, gilt and shadow (the 2021 issue's world) | product shots hung inside it |

## Style tokens (every prompt)
`charcoal plaster wall, single warm spotlight from above, deep shadow, gilt and old gold, quiet museum at night,
35mm, shallow depth of field, editorial still life, muted palette with one coral accent, no text, no logos`
- **Palette:** charcoal `#1f1f1f`, coral `#fa9674` (one accent object at most), gilt `#bca84a` / `#7f622d`.
- **Composition:** **4:5, 1080×1350** (shop + feed); a 1:1 and a 9:16 crop from the same plate for ads. Leave the
  composite area flat, centred and front-facing (frame or screen at ≥40% of the width).

## Never (negative prompt + review checklist)
`text, letters, watermark, logo, signature, brand names, faces, celebrities, hands with wrong fingers, artwork inside the frame,
images on screens, garments, clothing prints`
- No real person's likeness; hands only. No other brands' products, devices with visible logos, or museum names.
- Reject any plate where the model put art, text or a pattern into the composite area.

## Model, cost, cap
- **Plates:** Flux Dev (~$0.012/img) for still life. **Ideogram is not needed** (no type is ever generated).
- **First batch:** 6 plates × 4 variants = **24 images ≈ $0.30**. Hard cap per batch **$2** (set on the fal billing cap).
- Seeds and prompts are logged next to each plate so a chosen plate can be re-made.

## Review before anything ships
1. The composite matches LB's file **exactly** (a pixel diff in the art area is 0 outside the warp edges).
2. Brand check: one accent, no stray text, "Runwae Apparel" never rendered by the model.
3. **The Principal's taste call** on the chosen plates (alongside JARVIS #108) before any plate goes on the site or in an ad.
