import sys, glob
from pathlib import Path
H = Path.home()
sys.path.insert(0, str(H/"ahl/distribution/bin"))
import render_posts as rp
src = H/"mdo3d/social/templates/backfill"; out = H/"mdo3d/social/images/backfill"; out.mkdir(parents=True, exist_ok=True)
ch = rp.find_chrome()
for h in sorted(src.glob("[0-9]*.html")):
    p = out/(h.stem + ".png")
    print(h.name, rp.render_one(ch, h, p, rp.size_for(h, (1080,1350)), 2), p)
