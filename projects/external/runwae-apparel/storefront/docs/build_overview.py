#!/usr/bin/env python3
"""Build the apparel shops overview PDF from the built previews.

    python3 docs/build_overview.py [--preview ~/Downloads/apparel-shops-preview-2026-10-14] [--out docs/Apparel_Shops_Overview.pdf]
    python3 docs/build_overview.py --brand runwae [--out-dir ~/Downloads] [--date 2026-10-22]   # one brand's PDF
    python3 docs/build_overview.py --per-brand [--out-dir ~/Downloads]                          # one PDF per brand

Screenshots each shop (home, collection, focus product, phone) with headless Chrome, reads each brand's
brand.json / catalog.json for the identity, palette and pieces, writes an HTML overview and prints it to PDF.
Per-brand mode writes <Brand>_Shop_Overview_<date>.pdf: that brand's cover, identity and palette, shop pages and pieces.
Copy for each shop (identity line, look, open decisions) lives in SHOPS below; keep it in sync with the briefs.
"""
import argparse, glob, html, json, os, re, subprocess, tempfile

E = html.escape
HERE = os.path.dirname(os.path.abspath(__file__))
SF = os.path.dirname(HERE)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
LABEL = {"preorder": "Pre-order · focus", "next_drop": "Next drop", "in_development": "In development",
         "archive": "Archive", "available": "Available", "sold_out": "Sold out", "unavailable": "Not available"}

SHOPS = [
    dict(id="buttsstudios", name="Butts Studios", file="Butts_Studios",
         ident="They make things. Under it: works in progress, playing the long game.",
         look="Dark editorial. The C5 mark (square and X) with Archivo Bold, cream on near-black, rust and olive accents, a contour-line graphic. Built from the early lookbook and the &ldquo;Made of Story&rdquo; first pass. Product shots are now the final front and back renders (2026-10-18): rust and black contour hoodies, the olive/black windbreaker, the plaid flannel and the knit beanie. Lookbook images stay for the hero, detail and story.",
         keys=["bg", "cream", "rust", "olive", "charcoal"], type="Archivo Bold display · clean sans body · mono labels",
         decisions=["Prices, materials and sizing for each piece, and when the first drop opens",
                    "The Studio Bag: still in rework, no render yet (shown as a concept, never buyable)",
                    "Vector logo files and font licences for production"]),
    dict(id="runwae", name="Runwae Apparel", file="Runwae_Apparel",
         ident="They influence. Under it: they notice the little things.",
         look="Still story-led (hero, who we are, the belief, the art, then the pieces), now built around <b>Release 01</b>: the six numbered renders from 2026-10-18. 01 Field Overshirt (rust), 02 Globe Hoodie (forest: RUNWAE APPAREL on the chest, globe emblem on the back), 03 Luv Thy Neighbor Hoodie (creme, new face-and-plants back), 04 Knit Polo (charcoal), 05 Beanie (forest, creme, black, rust), 06 Flannel (forest/rust plaid). Every other concept (Drawn Series, Essentials, The Little Things, reissues) is off the shop; the real Fall &rsquo;21 archive stays.",
         keys=["forest", "paper", "rust", "washed"], type="Playfair Display bold headlines · Inter tracked small caps · Instrument Serif accents",
         decisions=["Name for the six-piece line: &ldquo;Release 01&rdquo; is a working label (it replaced &ldquo;The Drawn Series&rdquo;, which no longer fits a beanie, polo and flannel)",
                    "The black beanie: this release was meant to be no-black; kept because it is in the render",
                    "Master logo: handoff variants A / B / C / globe (current wordmark is provisional)",
                    "Model releases for the 2021 photos of real people (preview-only until then)",
                    "Fabric, print method and prices for the six pieces"]),
    dict(id="glb", name="Girls Love Butts (GLB)", file="GLB",
         ident="Every body is worth drawing. (Both lines provisional.)",
         look="Bright and hand-drawn: pink, yellow and blue, marker type and stickers, body-positive and playful. &ldquo;Clothes for every body.&rdquo; The shop is now the approved Batch 1 (2026-10-18), eight pieces: Icon Tee, Curves Tee, Curves Hoodie, Icon Hoodie, Curves Crewneck, Mini Logo Crew, Chill Shorts and the Good Energy Tote. The other concept-board pieces and both hats are off the shop. Big art leads from the back; chest marks stay medium.",
         keys=["pink", "yellow", "blue", "orange", "cream"], type="Marker display · rounded sans body",
         decisions=["Approve or replace the headline and tagline", "Prices, materials and sizing",
                    "Print-ready files for the curves and icon-grid art (the renders are mockups from your illustrations)"]),
    dict(id="ridgefield", name="Ridgefield", file="Ridgefield",
         ident="Headline borrowed from the site; provisional for the store.",
         look="Measured and technical, matching ridgefieldtech.com: ink background, mono labels, terrain contours, spec-sheet product pages, the square mark and the ember-orange accent. No em dashes (Ridgefield voice). Product images are the new front and back studio renders (2026-10-18), which carry the real marks: the RIDGEFIELD wordmark on the chest and the square mark on the beanie and pack. The old chevron images are gone.",
         keys=["ink", "bone", "olive", "ember", "panel"], type="JetBrains Mono labels · Inter display and body",
         decisions=["Chest wordmark size: the renders show it small; the shop rule is medium",
                    "Store headline (currently the site line, provisional)",
                    "Prices, materials and specs (no performance claims stated as fact)"]),
]


def shot(url, out, size):
    # Some pages (looping video, timers) never let virtual time settle; cap each attempt, then fall back to a
    # plain wall-clock capture.
    base = [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-prefers-reduced-motion",
            f"--window-size={size}", f"--screenshot={out}"]
    for extra in (["--virtual-time-budget=7000"], ["--timeout=15000"]):
        try:
            subprocess.run(base + extra + [url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=90)
            if os.path.exists(out):
                return
        except subprocess.TimeoutExpired:
            subprocess.run(["pkill", "-f", f"--screenshot={out}"], check=False)
    raise RuntimeError(f"screenshot failed: {url}")


def to_jpg(src, out, width=None, square=None):
    """Resize to a JPEG (width) or a centre-cropped square. ImageMagick when present, else macOS sips."""
    import shutil
    if shutil.which("magick"):
        args = ["-resize", f"{width}x"] if width else ["-resize", f"{square}x{square}^", "-gravity", "center", "-extent", f"{square}x{square}"]
        subprocess.run(["magick", src, *args, "-quality", "80", out], check=True)
        return
    q = ["-s", "format", "jpeg", "-s", "formatOptions", "80"]
    if width:
        subprocess.run(["sips", *q, "--resampleWidth", str(width), src, "--out", out], stdout=subprocess.DEVNULL, check=True)
        return
    o = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", src], capture_output=True, text=True).stdout
    w, h = int(re.search(r"pixelWidth: (\d+)", o).group(1)), int(re.search(r"pixelHeight: (\d+)", o).group(1))
    side = ["--resampleHeight", str(square)] if w >= h else ["--resampleWidth", str(square)]
    subprocess.run(["sips", *q, *side, src, "--out", out], stdout=subprocess.DEVNULL, check=True)
    subprocess.run(["sips", "-c", str(square), str(square), out], stdout=subprocess.DEVNULL, check=True)


def items_of(b):
    # Product definitions from the catalog; status/price from the shared inventory (inventory/inventory.csv).
    import csv
    cat = json.load(open(f"{SF}/brands/{b}/catalog.json"))
    items = cat if isinstance(cat, list) else cat.get("products") or cat.get("items") or []
    items = [i for i in items if i.get("listed") is not False]  # hidden on the site -> hidden here too
    inv = {r["product_id"]: r for r in csv.DictReader(open(f"{SF}/inventory/inventory.csv")) if r["brand"] == b and r["variant"] == "-"}
    for it in items:
        r = inv.get(it["id"], {})
        it["status"] = r.get("status", it.get("status"))
    caps = sorted([i for i in items if isinstance(i.get("capsule"), int)], key=lambda i: i["capsule"])
    return caps + [i for i in items if i not in caps]


def find_img(preview, b, f):
    a = f"{preview}/{b}/assets"
    base = re.sub(r"\.(jpg|jpeg|png|webp)$", "", f)
    for c in [f"{a}/{f}"] + sorted(glob.glob(f"{a}/{base}-1*.*")) + sorted(glob.glob(f"{a}/{base}-*.*")) + glob.glob(f"{a}/{base}.*"):
        if os.path.isfile(c) and re.search(r"\.(jpg|jpeg|png|webp)$", c):
            return c
    return None


def prepare(shops, P, W):
    """Screenshot each shop and gather its brand.json, items and piece cards (images cropped into W)."""
    for s in shops:
        b = s["id"]
        bj = json.load(open(f"{SF}/brands/{b}/brand.json"))
        items = items_of(b)
        focus = next((i for i in items if i.get("status") == "preorder"), items[0])
        for kind, url, size in [("home", f"{P}/{b}/index.html", "1440,900"), ("shop", f"{P}/{b}/shop.html", "1440,900"),
                                ("product", f"{P}/{b}/products/{focus['id']}.html", "1440,900"),
                                ("phone", f"{P}/{b}/index.html", "500,1000")]:
            png = f"{W}/{b}-{kind}.png"
            shot("file://" + url, png, size)
            to_jpg(png, f"{W}/{b}-{kind}.jpg", width=1440 if kind != "phone" else 500)
        s.update(bj=bj, items=items)
    # pieces
    for s in shops:
        b = s["id"]; cards = []
        for n, it in enumerate(s["items"]):
            img = None
            for im in it.get("images") or []:
                img = find_img(P, b, im["file"])
                if img:
                    break
            if img:
                out = f"{W}/piece-{b}-{n}.jpg"
                to_jpg(img, out, square=520)
                img = out
            cols = it.get("colors") or []
            cname = ", ".join((c.get("name") if isinstance(c, dict) else str(c)) for c in cols[:3])
            cards.append(dict(name=it["name"], colors=cname, status=it.get("status"), summary=it.get("summary") or "",
                              img=img, line=it.get("line") or ""))
        s["cards"] = cards


def sw(s):
    c = s["bj"]["tokens"]["colors"]
    return "".join(f'<span class="sw"><i style="background:{c[k]}"></i>{E(k)} <b>{c[k].upper()}</b></span>'
                   for k in s["keys"] if k in c)


def combined_cover(shops, W):
    return ('<section class="page cover"><div class="kicker">Overview · pre-launch, not open for orders</div>'
            '<h1>Apparel shops</h1><p class="lede">Four brand shops on one shared storefront. Each has its own layout and look; '
            'the cart, checkout, pre-order drops and order pages are shared code.</p><div class="grid4">'
            + "".join(f'<figure><img src="{W}/{s["id"]}-home.jpg"><figcaption><b>{E(s["name"])}</b>'
                      f'<span>{E(s["bj"].get("domain", ""))}</span></figcaption></figure>' for s in shops)
            + '</div><div class="facts"><div><b>Shared seed</b><span>One core (catalog, cart, checkout, drops, order lookup, policies); '
              'a brand is added by copying a template folder.</span></div><div><b>Pre-launch</b><span>Every item shows '
              '&ldquo;Not available&rdquo;: no prices, no bag, checkout off, until each shop goes live.</span></div><div><b>Design rules</b><span>Chest marks medium everywhere; '
              'shirt-sized art on the back for GLB; corners 4px or less (circles only when round). Enforced by the build.</span></div>'
              '<div><b>One inventory</b><span>One file for all four shops: status, price, per-size stock, a stock ledger and a local admin page.</span></div>'
              '<div><b>Order emails</b><span>A &ldquo;New order&rdquo; email to each shop and a confirmation to the customer, one shared template.</span></div></div></section>')


def brand_cover(s, W, date):
    # One brand's cover: name, tagline, the home page, then the same pre-launch facts as the combined cover.
    b, n = s["id"], s["name"]
    rules = "Chest marks medium; shirt-sized art on the back. " if b == "glb" else "Chest marks medium. "
    return (f'<section class="page cover"><div class="kicker">{E(n)} · shop overview · {E(date)} · pre-launch, not open for orders</div>'
            f'<h1>{E(n)}</h1><p class="lede">&ldquo;{E(s["bj"].get("tagline", ""))}&rdquo; {E(s["bj"].get("domain", ""))}</p>'
            f'<div class="bcov"><figure><img src="{W}/{b}-home.jpg"><figcaption>Home · desktop</figcaption></figure>'
            f'<figure class="phone"><img src="{W}/{b}-phone.jpg"><figcaption>Phone</figcaption></figure></div>'
            f'<div class="bfacts"><div><b>Pre-launch</b><span>Every item shows &ldquo;Not available&rdquo;: no prices, no bag, '
            f'checkout off, until the shop goes live.</span></div><div><b>Pieces</b><span>{len(s["cards"])} on the shop, listed '
            f'in this overview with their status.</span></div><div><b>Own look, shared core</b><span>This shop has its own layout; '
            f'cart, checkout, pre-order drops and order pages are shared storefront code.</span></div><div><b>Design rules</b>'
            f'<span>{rules}Corners 4px or less (circles only when round). Enforced by the build.</span></div></div></section>')


def brand_pages(s, W):
    """Identity, shop pages and pieces for one brand (the same pages in combined and per-brand mode)."""
    b, n = s["id"], s["name"]
    pages = []
    tag = s["bj"].get("tagline", "")
    pages.append(f'<section class="page"><div class="kicker">{E(s["bj"].get("domain", ""))}</div><h2>{E(n)}</h2><div class="two">'
                 f'<figure class="big"><img src="{W}/{b}-home.jpg"><figcaption>Home · desktop</figcaption></figure><div class="side">'
                 f'<p class="tag">&ldquo;{E(tag)}&rdquo;</p><p class="ident">{E(s["ident"])}</p><h4>Look</h4><p>{s["look"]}</p>'
                 f'<h4>Palette</h4><div class="sws">{sw(s)}</div><h4>Type</h4><p>{E(s["type"])}</p></div></div></section>')
    def table(cs):
        return "<table>" + "".join(f'<tr><td>{E(c["name"])}</td><td><span class="st st-{c["status"]}">{E(LABEL.get(c["status"], c["status"]))}</span></td></tr>'
                                   for c in cs) + "</table>"
    cs = s["cards"]
    if len(cs) > 13:  # long lists go in two columns so they fit the page
        h = (len(cs) + 1) // 2
        rows_html = f'<div class="tcols">{table(cs[:h])}{table(cs[h:])}</div>'
    else:
        rows_html = table(cs)
    pages.append(f'<section class="page"><div class="kicker">{E(n)} · pages</div><div class="three">'
                 f'<figure><img src="{W}/{b}-shop.jpg"><figcaption>Collection</figcaption></figure>'
                 f'<figure><img src="{W}/{b}-product.jpg"><figcaption>Product page</figcaption></figure>'
                 f'<figure class="phone"><img src="{W}/{b}-phone.jpg"><figcaption>Phone</figcaption></figure></div>'
                 f'<div class="two b"><div><h4>Products ({len(s["cards"])})</h4>{rows_html}'
                 f'<p class="note">Pre-launch: every item shows &ldquo;Not available&rdquo;; prices are set at launch.</p></div>'
                 f'<div><h4>Your open decisions</h4><ul>{"".join(f"<li>{x}</li>" for x in s["decisions"])}</ul></div></div></section>')
    chunks = [s["cards"][i:i + 8] for i in range(0, len(s["cards"]), 8)]
    for ci, ch in enumerate(chunks):
        tiles = ""
        for c in ch:
            im = f'<img src="{c["img"]}">' if c["img"] else '<div class="noimg">No image yet</div>'
            summ = c["summary"] if len(c["summary"]) < 120 else c["summary"][:117].rsplit(" ", 1)[0] + "…"
            col = f' · {E(c["colors"])}' if c["colors"] and "," in c["colors"] else ""
            tiles += (f'<div class="pc">{im}<div class="ln">{E(c["line"])}</div><h5>{E(c["name"])}{col}</h5>'
                      f'<span class="st st-{c["status"]}">{E(LABEL.get(c["status"], c["status"]))}</span><p>{E(summ)}</p></div>')
        cont = f" ({ci + 1} of {len(chunks)})" if len(chunks) > 1 else ""
        pages.append(f'<section class="page"><div class="kicker">{E(n)} · the pieces{cont}</div><h2>The pieces</h2>'
                     f'<div class="pgrid">{tiles}</div><p class="note" style="margin-top:12px">Images are concept renders, mockups from '
                     f'original art, or owner photography, as labelled on the site.</p></section>')
    return pages


def write_pdf(pages, title, out, W, body=""):
    css = open(f"{HERE}/overview.css").read()
    htmlp = f"{W}/{re.sub(r'[^A-Za-z0-9]+', '_', title)}.html"
    open(htmlp, "w").write(f'<!doctype html><html><head><meta charset="utf-8"><title>{E(title)}</title>'
                           f'<style>{css}</style></head><body class="{body}">{"".join(pages)}</body></html>')
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=8000",
                    f"--print-to-pdf={os.path.abspath(out)}", "file://" + htmlp],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    print("wrote", out, "pages:", len(pages))


def main():
    import datetime
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", default=os.path.expanduser("~/Downloads/apparel-shops-preview-2026-10-14"))
    ap.add_argument("--out", default=f"{HERE}/Apparel_Shops_Overview.pdf", help="combined mode: the PDF path")
    ap.add_argument("--brand", choices=[s["id"] for s in SHOPS], help="write one brand's PDF instead of the combined one")
    ap.add_argument("--per-brand", action="store_true", help="write one PDF per brand")
    ap.add_argument("--out-dir", default=HERE, help="per-brand mode: folder for <Brand>_Shop_Overview_<date>.pdf")
    ap.add_argument("--date", default=datetime.date.today().isoformat(), help="per-brand mode: date in the file name and cover")
    a = ap.parse_args()
    P = os.path.expanduser(a.preview)
    W = tempfile.mkdtemp(prefix="overview-")
    if not (a.brand or a.per_brand):
        prepare(SHOPS, P, W)
        pages = [combined_cover(SHOPS, W)]
        for s in SHOPS:
            pages += brand_pages(s, W)
        write_pdf(pages, "Apparel Shops Overview", a.out, W)
        return
    shops = SHOPS if a.per_brand else [s for s in SHOPS if s["id"] == a.brand]
    prepare(shops, P, W)
    od = os.path.expanduser(a.out_dir)
    os.makedirs(od, exist_ok=True)
    for s in shops:
        write_pdf([brand_cover(s, W, a.date)] + brand_pages(s, W), f'{s["name"]} Shop Overview',
                  f'{od}/{s["file"]}_Shop_Overview_{a.date}.pdf', W, body="solo")


if __name__ == "__main__":
    main()
