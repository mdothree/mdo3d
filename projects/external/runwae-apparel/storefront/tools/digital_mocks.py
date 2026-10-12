#!/usr/bin/env python3
"""Visual mocks of the digital Runwae Apparel offers (for the Principal's pick; nothing is for sale).

Uses LB's own art only (never generated): TLT flat artboards, the seal, and the styled photos.
    python3 tools/digital_mocks.py      -> brands/runwae/digital/*.jpg   (run off-box)
"""
import importlib.util, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("ph", ROOT / "tools" / "photos.py")
ph = importlib.util.module_from_spec(spec); spec.loader.exec_module(ph)
DESIGN, font, hexrgb = ph.DESIGN, ph.font, ph.hexrgb
B = ROOT / "brands" / "runwae"
theme = json.loads((B / "brand.json").read_text())["theme"]
BG, ACC = hexrgb(theme["bg"]), hexrgb(theme["accent"])
OUT = B / "digital"; OUT.mkdir(exist_ok=True)
W, H = 1080, 1350


def stage():
    c = Image.new("RGB", (W, H), BG)
    spot = ph.radial((W, H), (W // 2, int(H * .4)), int(H * .7), 70, 0)
    return Image.composite(Image.new("RGB", (W, H), (70, 64, 58)), c, spot)


def label(c, title, sub):
    d = ImageDraw.Draw(c)
    d.text((W // 2, H - 150), title, font=font("serif_b", 40), fill=(243, 238, 230), anchor="mm")
    d.text((W // 2, H - 100), sub, font=font("serif_i", 26), fill=(168, 162, 154), anchor="mm")
    d.rectangle([W // 2 - 32, H - 190, W // 2 + 32, H - 186], fill=ACC)


def flat(rel):
    im = Image.open(DESIGN / rel).convert("RGBA")
    base = Image.new("RGB", im.size, (0, 0, 0)); base.paste(im, mask=im.split()[3]); return base


def phone(screen):
    """A plain phone silhouette around a wallpaper (no real-device branding)."""
    pw, ph_ = 430, 900
    body = Image.new("RGBA", (pw + 28, ph_ + 28), (0, 0, 0, 0))
    ImageDraw.Draw(body).rounded_rectangle([0, 0, pw + 27, ph_ + 27], 64, fill=(18, 18, 18, 255), outline=(90, 90, 90, 255), width=3)
    scr = screen.copy(); r = max(pw / scr.width, ph_ / scr.height)
    scr = scr.resize((int(scr.width * r), int(scr.height * r)), Image.LANCZOS)
    scr = scr.crop(((scr.width - pw) // 2, (scr.height - ph_) // 2, (scr.width - pw) // 2 + pw, (scr.height - ph_) // 2 + ph_))
    m = Image.new("L", (pw, ph_), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, pw - 1, ph_ - 1], 52, fill=255)
    body.paste(scr, (14, 14), m)
    return body


# A · Lookbook: "Everybody Influences, Issue No. 2"
c = stage()
cover = Image.new("RGB", (620, 800), (31, 31, 31))
shot = Image.open(B / "photos" / "pave-hoodie-gallery.jpg").resize((620, 775))
cover.paste(shot.crop((0, 60, 620, 560)), (0, 150))
d = ImageDraw.Draw(cover)
d.text((310, 60), "Runwae Apparel", font=font("serif", 54), fill=(243, 238, 230), anchor="mm")
d.text((310, 112), "Everybody Influences", font=font("serif_i", 26), fill=ACC, anchor="mm")
d.text((310, 700), "Issue No. 2", font=font("serif", 30), fill=(243, 238, 230), anchor="mm")
d.rectangle([24, 0, 30, 800], fill=ACC)
c.paste((0, 0, 0), (240, 140), Image.new("L", (620, 800), 150).filter(ImageFilter.GaussianBlur(18)))
c.paste(cover, (230, 120))
label(c, "A · The Lookbook", "Everybody Influences, Issue No. 2 · digital magazine")
c.save(OUT / "a-lookbook.jpg", quality=86)

# B · Design drops: wallpaper packs
c = stage()
p1 = phone(flat("TLT/1x/Artboard 1 copy 9.png"))
seal = Image.new("RGB", (1080, 1080), BG); e = Image.open(B / "assets" / "emblem.png").convert("RGBA").resize((520, 520))
seal.paste(e, (280, 280), e)
p2 = phone(seal)
c.paste(p1, (90, 140), p1); c.paste(p2, (560, 140), p2)
label(c, "B · Design Drops", "Wallpaper packs from each line · phone + desktop")
c.save(OUT / "b-design-drops.jpg", quality=86)

# C · The Little Things as digital art: numbered editions
c = stage()
art = flat("TLT/1x/Artboard 1 copy 14.png").resize((560, 560))
t = 56
frame = ph.gilt_frame(560, 560, t, hexrgb(theme["gold"]), hexrgb(theme["goldDeep"]), hexrgb(theme["goldLight"]))
fx, fy = (W - frame.width) // 2, 150
c.paste((0, 0, 0), (fx + 14, fy + 24), Image.new("L", frame.size, 170).filter(ImageFilter.GaussianBlur(20)))
c.paste(art, (fx + t, fy + t)); c.paste(frame, (fx, fy), frame)
d = ImageDraw.Draw(c)
d.text((W // 2, fy + frame.height + 50), "Edition of 50 · signed high-res file + certificate", font=font("serif_i", 24), fill=(168, 162, 154), anchor="mm")
label(c, "C · The Little Things, Digital Editions", "Numbered, capped, LB's own line art")
c.save(OUT / "c-tlt-editions.jpg", quality=86)
print("wrote", sorted(p.name for p in OUT.iterdir()))
