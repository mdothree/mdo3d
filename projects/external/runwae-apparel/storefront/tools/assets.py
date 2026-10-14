#!/usr/bin/env python3
"""Make web-size product images from the (git-ignored) design copies.

Reads brands/<brand>/catalog.json `source_images`, resolves each path under ../design, and writes
brands/<brand>/assets/<product>-<n>.jpg (max 1000px, flattened onto the brand's panel colour).
Also writes the brand logo if brand.json names one. Originals are never modified.

    python3 tools/assets.py runwae
"""
import json, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DESIGN = ROOT.parent / "design"
MAX = 1000


def flatten(src: Path, bg: str) -> Image.Image:
    im = Image.open(src)
    im = im.convert("RGBA")
    im.thumbnail((MAX, MAX), Image.LANCZOS)
    # Centre on a square canvas so every card and gallery frame is the same shape.
    base = Image.new("RGB", (MAX, MAX), bg)
    base.paste(im, ((MAX - im.width) // 2, (MAX - im.height) // 2), mask=im.split()[3])
    return base


def main(brand: str) -> None:
    bdir = ROOT / "brands" / brand
    cfg = json.loads((bdir / "brand.json").read_text())
    cat = json.loads((bdir / "catalog.json").read_text())
    out = bdir / "assets"
    out.mkdir(exist_ok=True)
    panel = "#f2f0ec"  # light studio grey reads well inside both themes' frames
    n = 0
    for p in cat["products"]:
        for i, rel in enumerate(p.get("source_images") or [], 1):
            src = DESIGN / rel
            if not src.exists():
                sys.exit(f"missing design file: {src}")
            flatten(src, panel).save(out / f"{p['id']}-{i}.jpg", "JPEG", quality=82, optimize=True, progressive=True)
            n += 1
    if cfg.get("logo"):
        logo_src = DESIGN / "Fall 21" / "emblem.png"
        im = Image.open(logo_src).convert("RGBA")
        im.thumbnail((400, 400), Image.LANCZOS)
        # Recolour the black emblem to the brand accent (coral, as on the 2021 magazine cover).
        tint = Image.new("RGBA", im.size, cfg["theme"]["accent"])
        tint.putalpha(im.split()[3])
        im = tint
        im.save(out / Path(cfg["logo"]).name, "PNG", optimize=True)
        n += 1
    print(f"{brand}: wrote {n} files to {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "runwae")
