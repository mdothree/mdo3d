#!/usr/bin/env python3
"""Runwae Apparel styled product photos: two looks for the Principal's taste call.

LB's designs are never generated or redrawn. Each photo is LB's real mockup, cut out
from its background and composited, pixel for pixel, into a procedurally rendered scene.

  A · gallery    "Everybody Influences": the garment hung as a work of art in a gilt frame,
                 on a spot-lit charcoal plaster wall, with a museum placard (from the 2021 magazine).
  B · sketchbook "The Little Things": the garment laid flat on warm sketch paper, coral tape,
                 soft shadow, pencil-grey caption (from TLT's hand-drawn line art).

    python3 tools/photos.py runwae [gallery|sketchbook|all]
Writes brands/<brand>/photos/<product>-<look>.jpg at 1080x1350 (4:5: shop + feed ads).
Runs off-box (xps); needs Pillow and a serif font (FreeSerif on Linux, Georgia/Times on macOS).
"""
import json, random, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

ROOT = Path(__file__).resolve().parent.parent
DESIGN = ROOT.parent / "design"
W, H = 1080, 1350

FONT_DIRS = ["/usr/share/fonts/opentype/freefont", "/System/Library/Fonts/Supplemental", "/Library/Fonts"]
FONTS = {"serif": ["FreeSerif.otf", "Georgia.ttf", "Times New Roman.ttf"],
         "serif_b": ["FreeSerifBold.otf", "Georgia Bold.ttf", "Times New Roman Bold.ttf"],
         "serif_i": ["FreeSerifItalic.otf", "Georgia Italic.ttf", "Times New Roman Italic.ttf"]}


def font(kind, size):
    for d in FONT_DIRS:
        for n in FONTS[kind]:
            p = Path(d) / n
            if p.exists():
                return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


# ---------- garment cut-out (never alters the design pixels) ----------
def cutout(src: Path) -> Image.Image:
    """Return the garment as RGBA, trimmed. Removes only light background connected to the
    image border (flood fill), combined with the file's own alpha, so white ink *inside* a
    design is never touched."""
    im = Image.open(src).convert("RGBA")
    a0 = im.split()[3]
    # Flatten onto white so transparent areas and opaque white panels (some artboards draw a
    # white rectangle behind the garment) are both treated as background, then combine masks.
    rgb = Image.alpha_composite(Image.new("RGBA", im.size, (255, 255, 255, 255)), im).convert("RGB")
    small = rgb.copy()
    small.thumbnail((600, 600))
    sx, sy = rgb.width / small.width, rgb.height / small.height
    # Light, low-saturation pixels count as background (mockup margins are often grey + white
    # panels split by a hairline). 200 is safely above every garment colour in the catalog.
    hsv = small.convert("HSV").split()
    light = small.convert("L").point(lambda v: 255 if v >= 200 else 0)
    grey = hsv[1].point(lambda s: 255 if s <= 40 else 0)
    lum = ImageChops.multiply(light, grey)
    lum = lum.filter(ImageFilter.MaxFilter(3))  # bridge 1-px hairlines between panels
    # flood the background from every border pixel that is near-white
    mark = lum.copy()
    w, h = mark.size
    for x in range(0, w, 3):
        for y in (0, h - 1):
            if mark.getpixel((x, y)) == 255:
                ImageDraw.floodfill(mark, (x, y), 128)
    for y in range(0, h, 3):
        for x in (0, w - 1):
            if mark.getpixel((x, y)) == 255:
                ImageDraw.floodfill(mark, (x, y), 128)
    bg = mark.point(lambda v: 255 if v == 128 else 0)
    alpha = ImageChops.invert(bg).resize(rgb.size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.8))
    alpha = ImageChops.multiply(alpha, a0)
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out.crop(alpha.point(lambda v: 255 if v > 20 else 0).getbbox())


def fit(im, box_w, box_h):
    im = im.copy()
    im.thumbnail((box_w, box_h), Image.LANCZOS)
    return im


def shadow(alpha, blur, opacity):
    s = Image.new("L", alpha.size, 0)
    s.paste(alpha.point(lambda v: int(v * opacity)), (0, 0))
    return s.filter(ImageFilter.GaussianBlur(blur))


def noise(size, amount, seed, blur=1.2):
    rnd = random.Random(seed)
    n = Image.frombytes("L", size, bytes(rnd.randrange(256) for _ in range(size[0] * size[1])))
    n = n.filter(ImageFilter.GaussianBlur(blur))
    return n.point(lambda v: int(128 + (v - 128) * amount))


def radial(size, center, radius, inner, outer):
    """Radial gradient mask (L) from `inner` at the centre to `outer` at `radius`."""
    small = (size[0] // 4, size[1] // 4)
    g = Image.new("L", small)
    cx, cy, r = center[0] / 4, center[1] / 4, radius / 4
    px = g.load()
    for y in range(small[1]):
        for x in range(small[0]):
            d = min(1.0, ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / r)
            px[x, y] = int(inner + (outer - inner) * (d ** 1.6))
    return g.resize(size, Image.BICUBIC)


# ---------- look A: the gallery ----------
def gilt_frame(inner_w, inner_h, t, gold, deep, light):
    """A carved-looking gilt frame: graded gold mitred bands, bead rows, dark rebate."""
    fw, fh = inner_w + 2 * t, inner_h + 2 * t
    fr = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    d = ImageDraw.Draw(fr)
    bands = [(0.00, deep), (0.10, light), (0.22, gold), (0.40, deep), (0.50, light),
             (0.62, gold), (0.80, light), (0.90, deep)]
    for i, (p, col) in enumerate(bands):
        inset = int(p * t)
        nxt = bands[i + 1][0] if i + 1 < len(bands) else 1.0
        width = max(1, int((nxt - p) * t))
        d.rectangle([inset, inset, fw - 1 - inset, fh - 1 - inset], outline=col, width=width)
    # light from the top-left: brighten top/left bands, darken bottom/right
    shade = Image.new("L", (fw, fh), 0)
    sd = ImageDraw.Draw(shade)
    sd.polygon([(fw, 0), (fw, fh), (0, fh), (t, fh - t), (fw - t, fh - t), (fw - t, t)], fill=70)
    dark = Image.new("RGBA", (fw, fh), (25, 15, 0, 0))
    dark.putalpha(shade)
    fr = Image.alpha_composite(fr, dark)
    # bead rows
    for p in (0.30, 0.71):
        inset = int(p * t)
        step = max(6, t // 7)
        rr = max(2, t // 26)
        for x in range(inset + step, fw - inset - step, step):
            for y in (inset, fh - 1 - inset):
                d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=light)
        for y in range(inset + step, fh - inset - step, step):
            for x in (inset, fw - 1 - inset):
                d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=light)
    # grain
    g = noise((fw, fh), 0.35, 7, 0.6)
    tex = Image.merge("RGBA", (g, g, g, Image.new("L", (fw, fh), 0)))
    tex.putalpha(fr.split()[3].point(lambda v: int(v * 0.10)))
    fr = Image.alpha_composite(fr, tex)
    # punch the opening + dark rebate shadow
    hole = Image.new("L", (fw, fh), 255)
    ImageDraw.Draw(hole).rectangle([t, t, t + inner_w - 1, t + inner_h - 1], fill=0)
    fr.putalpha(ImageChops.multiply(fr.split()[3], hole))
    return fr


def gallery(p, garment, theme, line_label):
    gold, deep, light = hexrgb(theme["gold"]), hexrgb(theme["goldDeep"]), hexrgb(theme["goldLight"])
    wall = hexrgb(theme["bg"])
    canvas = Image.new("RGB", (W, H), wall)
    # plaster texture + spotlight from above
    tex = noise((W, H), 0.55, hash(p["id"]) & 0xFFFF, 2.2)
    canvas = Image.composite(Image.new("RGB", (W, H), tuple(min(255, c + 16) for c in wall)), canvas, tex.point(lambda v: max(0, v - 120)))
    spot = radial((W, H), (W // 2, int(H * 0.36)), int(H * 0.62), 95, 0)
    canvas = Image.composite(Image.new("RGB", (W, H), (92, 84, 74)), canvas, spot)
    # frame + mat
    t = 70
    inner_w, inner_h = 700, 820
    fx, fy = (W - inner_w - 2 * t) // 2, 120
    mat = Image.new("RGB", (inner_w, inner_h), (240, 236, 228))
    mat = Image.composite(Image.new("RGB", mat.size, (226, 220, 210)), mat, radial(mat.size, (inner_w // 2, inner_h // 2), int(inner_w * 0.9), 0, 160))
    g = fit(garment, inner_w - 120, inner_h - 120)
    gx, gy = (inner_w - g.width) // 2, (inner_h - g.height) // 2
    mat.paste((40, 34, 28), (gx + 8, gy + 14), shadow(g.split()[3], 14, 0.35))
    mat.paste(g, (gx, gy), g)
    frame = gilt_frame(inner_w, inner_h, t, gold, deep, light)
    # cast shadow of the frame on the wall
    fs = Image.new("L", frame.size, 0)
    ImageDraw.Draw(fs).rectangle([0, 0, frame.width, frame.height], fill=170)
    canvas.paste((8, 8, 8), (fx + 14, fy + 26), fs.filter(ImageFilter.GaussianBlur(22)))
    canvas.paste(mat, (fx + t, fy + t))
    canvas.paste(frame, (fx, fy), frame)
    # placard
    pw, ph = 330, 128
    px_, py_ = W - pw - 130, fy + inner_h + 2 * t + 48
    plate = Image.new("RGB", (pw, ph), (236, 231, 222))
    pd = ImageDraw.Draw(plate)
    pd.rectangle([0, 0, 5, ph], fill=hexrgb(theme["accent"]))
    pd.text((22, 16), p["name"], font=font("serif_b", 25), fill=(30, 28, 26))
    pd.text((22, 52), f"Runwae Apparel · {line_label}", font=font("serif_i", 19), fill=(80, 74, 68))
    medium = "Embroidery" if p.get("method") == "embroidery" else "Print"
    pd.text((22, 82), f"{medium} · {p['type'].capitalize()}", font=font("serif", 18), fill=(110, 104, 96))
    canvas.paste((0, 0, 0), (px_ + 4, py_ + 7), Image.new("L", (pw, ph), 110).filter(ImageFilter.GaussianBlur(6)))
    canvas.paste(plate, (px_, py_))
    return canvas


# ---------- look B: the sketchbook ----------
def sketchbook(p, garment, theme, line_label):
    paper = (238, 232, 219)
    canvas = Image.new("RGB", (W, H), paper)
    fib = noise((W, H), 0.5, (hash(p["id"]) >> 3) & 0xFFFF, 0.7)
    canvas = Image.composite(Image.new("RGB", (W, H), (224, 216, 200)), canvas, fib.point(lambda v: max(0, v - 135) * 2))
    canvas = Image.composite(Image.new("RGB", (W, H), (205, 196, 178)), canvas, radial((W, H), (W // 2, H // 2), int(H * 0.75), 0, 120))
    # faint ruled margin, like a sketchbook page
    d = ImageDraw.Draw(canvas)
    d.line([(90, 0), (90, H)], fill=(214, 160, 140), width=2)
    g = fit(garment, 820, 940)
    gx, gy = (W - g.width) // 2, 140
    canvas.paste((60, 50, 40), (gx + 10, gy + 18), shadow(g.split()[3], 18, 0.42))
    canvas.paste(g, (gx, gy), g)
    # coral tape at two corners
    accent = hexrgb(theme["accent"])
    for (cx, cy, ang) in ((gx + 40, gy + 10, 32), (gx + g.width - 40, gy + 10, -32)):
        tape = Image.new("RGBA", (150, 42), accent + (190,))
        tape = tape.rotate(ang, expand=True, resample=Image.BICUBIC)
        canvas.paste(tape, (cx - tape.width // 2, cy - tape.height // 2), tape)
    cap_y = gy + g.height + 56
    d.text((140, cap_y), p["name"].lower(), font=font("serif_i", 44), fill=(58, 56, 54))
    d.text((140, cap_y + 60), f"runwae apparel · {line_label.lower()}", font=font("serif", 24), fill=(120, 114, 106))
    return canvas


LOOKS = {"gallery": gallery, "sketchbook": sketchbook}


def main(brand="runwae", which="all"):
    bdir = ROOT / "brands" / brand
    theme = json.loads((bdir / "brand.json").read_text())["theme"]
    cat = json.loads((bdir / "catalog.json").read_text())["products"]
    out = bdir / "photos"
    out.mkdir(exist_ok=True)
    looks = list(LOOKS) if which == "all" else [which]
    n = 0
    for p in cat:
        src = DESIGN / p["images"][0]
        alt = DESIGN / "Transparent Clothing" / Path(p["images"][0]).name  # prefer the alpha version if LB made one
        garment = cutout(alt if alt.exists() else src)
        for look in looks:
            LOOKS[look](p, garment, theme, p["line"]).save(out / f"{p['id']}-{look}.jpg", "JPEG", quality=84, optimize=True, progressive=True)
            n += 1
    print(f"{brand}: wrote {n} photos to {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main(*(sys.argv[1:3] if len(sys.argv) > 1 else []))
