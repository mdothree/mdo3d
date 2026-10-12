from pathlib import Path
D = Path.home()/"mdo3d/social/templates/backfill"
CSS = """
@font-face{font-family:'DM Serif Display';src:url(fonts/DMSerifDisplay.woff2) format('woff2');font-style:normal}
@font-face{font-family:'DM Serif Display';src:url(fonts/DMSerifDisplay-Italic.woff2) format('woff2');font-style:italic}
@font-face{font-family:'DM Sans';src:url(fonts/DMSans.woff2) format('woff2');font-weight:100 900}
@font-face{font-family:'JetBrains Mono';src:url(fonts/JetBrainsMono-500.woff2) format('woff2');font-weight:500}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden}
body{background:#131320;color:#f8f8fc;font-family:'DM Sans',sans-serif;position:relative}
.top{position:absolute;left:96px;top:88px;display:flex;align-items:center;gap:22px}
.top img{width:72px;height:72px}
.top span{font-family:'DM Sans';font-weight:600;font-size:34px;letter-spacing:4px;color:#f8f8fc}
.stack{position:absolute;left:96px;right:96px;top:236px}
.eyebrow{font-family:'JetBrains Mono';font-weight:500;font-size:24px;letter-spacing:3px;text-transform:uppercase;color:#9090a8}
h1{margin-top:28px;font-family:'DM Serif Display';font-weight:400;font-size:100px;line-height:1.06;letter-spacing:-1px;color:#f8f8fc}
h1 em{font-style:italic;color:#a78bfa}
.sub{margin-top:40px;margin-right:24px;font-family:'DM Sans';font-size:36px;line-height:1.4;color:#c4c4d4}
.foot{position:absolute;left:96px;bottom:84px;font-family:'JetBrains Mono';font-weight:500;font-size:26px;letter-spacing:1px;color:#9090a8}
.art{position:absolute}
.a{border-color:#a78bfa;color:#a78bfa}
"""
(D/"card.css").write_text(CSS)
HEAD = """<!-- @render 1080x1350 -->
<!-- MDO3D LinkedIn backfill card #{n}. Caption: ~/mdo3d/social/data/GATE_2026-10-12.md draft {n}. Adds no claims beyond the caption. -->
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="card.css"><style>{css}</style></head><body>
<div class="top"><img src="m3-tile.png" alt=""><span>MDO3D</span></div>
<div class="stack"><div class="eyebrow">{eyebrow}</div>
<h1>{h1}</h1>
<div class="sub">{sub}</div>{inflow}</div>
{art}
{foot}
</body></html>
"""
DEF=dict(inflow="")
cards = [
 dict(n=1, slug="studio-intro", eyebrow="A small software studio",
  h1="Many small tools, each doing <em>one job well.</em>", subtop=650,
  sub="Career help, everyday utilities, and self-reflection, each on its own site.",
  css=".sq{position:absolute;border:4px solid #a78bfa;border-radius:22px}",
  art="""<div class="art" style="left:96px;top:930px;width:888px;height:260px">
<div class="sq" style="left:0;top:60px;width:200px;height:200px"></div>
<div class="sq" style="left:240px;top:120px;width:140px;height:140px"></div>
<div class="sq" style="left:420px;top:0;width:260px;height:260px;background:#a78bfa"></div>
<div class="sq" style="left:720px;top:150px;width:110px;height:110px"></div>
</div>""", foot=""),
 dict(n=4, slug="payment-loop", eyebrow="Behind the build: payments",
  h1="When money is involved, <em>the server says yes.</em>", subtop=650,
  sub="Each premium reading is verified against a completed payment before it is generated.",
  css=""".box{position:absolute;top:0;width:340px;height:200px;border:4px solid #a78bfa;border-radius:24px;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono';font-weight:500;font-size:34px;color:#a78bfa}
.box.fill{background:#a78bfa;color:#131320}
.arrow{position:absolute;top:96px;left:370px;width:148px;height:4px;background:#a78bfa}
.arrow:after{content:'';position:absolute;right:-4px;top:-14px;border-left:24px solid #a78bfa;border-top:16px solid transparent;border-bottom:16px solid transparent}""",
  art="""<div class="art" style="left:96px;top:990px;width:888px;height:200px">
<div class="box" style="left:0">Browser</div><div class="arrow"></div><div class="box fill" style="left:548px">Server</div></div>""", foot=""),
 dict(n=5, slug="json-parser", eyebrow="Behind the build: AI numerology",
  h1="Find the first complete <em>JSON object.</em>", subtop=540,
  sub="A small parser that ignores whatever the model wraps around its answer, so the reading comes back clean.",
  css=".brace{font-family:'JetBrains Mono';font-weight:500;font-size:300px;line-height:1;color:#a78bfa}",
  art="""<div class="art brace" style="left:96px;top:930px">{ }</div>""", foot=""),
 dict(n=6, slug="sibling-apps", eyebrow="Running many small products",
  h1="A bug found in one app gets <em>checked in all of them.</em>", subtop=760,
  sub="A fix written once gets carried to each copy.",
  css=""".dot{position:absolute;top:0;width:120px;height:120px;border:4px solid #a78bfa;border-radius:50%}
.line{position:absolute;top:58px;left:60px;width:768px;height:4px;background:#a78bfa}""",
  art="""<div class="art" style="left:96px;top:1010px;width:888px;height:120px">
<div class="line"></div>
<div class="dot" style="left:0;background:#a78bfa"></div><div class="dot" style="left:192px;background:#131320"></div><div class="dot" style="left:384px;background:#131320"></div><div class="dot" style="left:576px;background:#131320"></div><div class="dot" style="left:768px;background:#131320"></div></div>""", foot=""),
 dict(n=7, slug="mdothree-utilities", eyebrow="mdothree",
  h1="Small browser utilities, <em>one job each.</em>", subtop=540,
  sub="No signup.",
  css=""".chips{display:flex;flex-wrap:wrap;gap:22px}
.chip{border:3px solid #a78bfa;border-radius:999px;padding:18px 34px;font-family:'JetBrains Mono';font-weight:500;font-size:32px;color:#a78bfa}""",
  inflow="""<div class="chips" style="margin-top:56px">
<div class="chip">Format JSON</div><div class="chip">Generate a hash</div><div class="chip">Make a QR code</div><div class="chip">Convert a timestamp</div><div class="chip">Check color contrast</div></div>""", art="",
  foot='<div class="foot">mdothree.com</div>'),
 dict(n=9, slug="dark-mode", eyebrow="Landing site polish",
  h1="Dark and light mode, <em>no flash on load.</em>", subtop=540,
  sub="The theme is applied before the page paints.",
  css=""".half{position:absolute;top:0;width:150px;height:300px;border:4px solid #a78bfa}
.l{left:0;border-radius:150px 0 0 150px;background:#a78bfa}
.r{left:150px;border-radius:0 150px 150px 0;border-left:none}""",
  art="""<div class="art" style="left:96px;top:830px;width:300px;height:300px"><div class="half l"></div><div class="half r"></div></div>""",
  foot='<div class="foot">mdo3d.com</div>'),
]
for c in cards:
    c={**DEF,**c}; (D/f"{c['n']}-{c['slug']}.html").write_text(HEAD.format(**c))
print("ok")
