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
    # contain (never crop LB's art): fit the width, centre on the art's own corner colour
    src = screen.convert("RGB"); src = src.crop((3, 3, src.width - 3, src.height - 3))  # drop artboard edge rows
    r = pw / src.width
    art = src.resize((pw, int(src.height * r)), Image.LANCZOS)
    corner = src.getpixel((2, 2)); fill = (0, 0, 0) if sum(corner) < 60 else corner
    scr = Image.new("RGB", (pw, ph_), fill)
    scr.paste(art, (0, (ph_ - art.height) // 2))
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


# ---------- per-product shop images for the digital catalog (p-<id>.jpg, no option labels) ----------
def framed(art, size, t=48):
    a = art.resize((size, size))
    fr = ph.gilt_frame(size, size, t, hexrgb(theme["gold"]), hexrgb(theme["goldDeep"]), hexrgb(theme["goldLight"]))
    out = Image.new("RGBA", fr.size, (0, 0, 0, 0)); out.paste(a, (t, t)); out.alpha_composite(fr); return out


def drop(c, im, x, y, blur=18, op=160):
    c.paste((0, 0, 0), (x + 12, y + 22), Image.new("L", im.size, op).filter(ImageFilter.GaussianBlur(blur)))
    c.paste(im, (x, y), im if im.mode == "RGBA" else None)


def small_phone(screen, scale):
    p = phone(screen); return p.resize((int(p.width * scale), int(p.height * scale)), Image.LANCZOS)


seal_screen = seal
_trc = Image.open(DESIGN / "Fall 21" / "preview_2048x2048.jpeg").convert("RGB")
_m = Image.new("L", _trc.size, 0); ImageDraw.Draw(_m).ellipse([18, 18, _trc.width - 19, _trc.height - 19], fill=255)
trc = Image.new("RGB", _trc.size, (0, 0, 0)); trc.paste(_trc, (0, 0), _m)  # the round TRC mark, off its white square
faces, rwa, inlife = flat("TLT/1x/Artboard 1 copy 9.png"), flat("TLT/1x/Artboard 1 copy 14.png"), flat("TLT/1x/Artboard 1 copy 4.png")

# lookbook: the cover alone, centred
c = stage(); drop(c, cover, (W - 620) // 2, 260); c.save(OUT / "p-lookbook-issue-2.jpg", quality=86)
# packs: two phones each
for pid, a, b in (("pack-fall21", seal_screen, trc), ("pack-tlt", faces, inlife)):
    c = stage(); pa, pb = phone(a), phone(b)
    c.paste(pa, (90, 200), pa); c.paste(pb, (560, 200), pb); c.save(OUT / f"p-{pid}.jpg", quality=86)
# drop pass: three smaller phones, fanned
c = stage()
for i, s in enumerate((seal_screen, faces, rwa)):
    sp = small_phone(s, 0.62).rotate((i - 1) * -8, expand=True, resample=Image.BICUBIC)
    c.paste(sp, (95 + i * 300, 260 + abs(i - 1) * 40), sp)
c.save(OUT / "p-drop-pass.jpg", quality=86)
# editions: one gilt-framed piece each
for pid, art in (("edition-rwa", rwa), ("edition-faces", faces), ("edition-in-life", inlife)):
    c = stage(); f = framed(art, 640, 60); drop(c, f, (W - f.width) // 2, 260); c.save(OUT / f"p-{pid}.jpg", quality=86)
# set of three: a hang of three frames
c = stage()
for i, art in enumerate((rwa, faces, inlife)):
    f = framed(art, 260, 30); drop(c, f, 50 + i * 340, 480, 12, 150)
c.save(OUT / "p-editions-set.jpg", quality=86)
# bundle: lookbook + phone + frame
c = stage()
cv = cover.resize((372, 480)); drop(c, cv, 60, 360)
pp = small_phone(faces, 0.62); c.paste(pp, (450, 330), pp)
f = framed(rwa, 260, 30); drop(c, f, 720, 420, 12, 150)
c.save(OUT / "p-first-drop-bundle.jpg", quality=86)
print("product images:", sorted(p.name for p in OUT.glob("p-*.jpg")))
