from PIL import Image
from pathlib import Path
d = Path.home()/"mdo3d/social/images/backfill"
fs = sorted(p for p in d.glob("[0-9]*.png"))
W,H = 540,675
sheet = Image.new("RGB",(W*3+40,H*2+30),"white")
for i,f in enumerate(fs):
    im = Image.open(f).convert("RGB").resize((W,H))
    sheet.paste(im,(10+(i%3)*(W+10),10+(i//3)*(H+10)))
sheet.save(d/"_contact_sheet.png"); print(d/"_contact_sheet.png")
