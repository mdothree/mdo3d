#!/bin/bash
# Runwae "Mockup · original drawing" images: the owner's real lines (no redrawing), cleanly extracted and placed
# full-back on a plain garment. Needs ImageMagick (`magick`) + Chrome (for the SVG blank). Writes brands/runwae/assets.
#   bash tools/runwae_line_mockups.sh
set -euo pipefail
cd "$(dirname "$0")/.."
B=brands/runwae; A=../design/handoff_2026-10-14/assets/01_original_artwork
T=$(mktemp -d); CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
lines() { # dark strokes on lime -> cream strokes on transparent (levels only, no smoothing)
  magick "$A/Artboard 1 copy ${1}_.PNG" -colorspace Gray -negate -level 45%,75% "$T/m$1.png"
  magick -size 1080x1081 xc:'#EDE6D6' "$T/m$1.png" -alpha off -compose CopyOpacity -composite -trim +repage "$T/l$1.png"; }
lines 12; lines 16
# Black hoodie back: the Luv Thy Neighbor product shot with its art painted out (fabric tone + grain).
W=390; H=440; X=335; Y=300
magick $B/assets/tlt-neighbor-hoodie-1.jpg -crop ${W}x${H}+$X+$Y +repage "$T/reg.png"
magick "$T/reg.png" -colorspace gray -threshold 19% -morphology Dilate Disk:9 "$T/mask.png"
magick "$T/reg.png" \( -size ${W}x${H} xc:"srgb(13.9%,14.1%,15%)" -attenuate 0.12 +noise Gaussian \) \( "$T/mask.png" -blur 0x4 \) -composite "$T/clean.png"
magick $B/assets/tlt-neighbor-hoodie-1.jpg "$T/clean.png" -geometry +$X+$Y -composite "$T/hoodie.png"
magick "$T/l12.png" -resize 440x440 "$T/p.png"
magick "$T/hoodie.png" "$T/p.png" -gravity north -geometry +0+300 -composite "$T/portrait.png"
# Olive overshirt back: flat drawn blank (mockup-src/overshirt-back.svg) + grain.
"$CHROME" --headless=new --hide-scrollbars --window-size=1000,1000 --virtual-time-budget=1000 --screenshot="$T/os.png" "file://$PWD/$B/mockup-src/overshirt-back.svg" 2>/dev/null
magick "$T/os.png" \( -size 1000x1000 xc:gray50 -attenuate 0.35 +noise Gaussian -colorspace gray \) -compose softlight -composite "$T/osb.png"
magick "$T/l16.png" -resize 380x500 "$T/f.png"
magick "$T/osb.png" "$T/f.png" -gravity north -geometry +0+340 -compose over -composite "$T/overshirt.png"
for n in portrait:mock-portrait-hoodie overshirt:mock-figure-overshirt; do
  for w in 640 1000; do magick "$T/${n%%:*}.png" -resize ${w}x -quality 84 "$B/assets/${n##*:}-$w.jpg"; done
done
node -e 'const f=process.argv[1],fs=require("fs"),m=JSON.parse(fs.readFileSync(f));for(const k of ["mock-portrait-hoodie","mock-figure-overshirt"])m[k]={widths:[640,1000],w:1000,h:1000};fs.writeFileSync(f,JSON.stringify(m,null,1)+"\n")' $B/assets/manifest.json
rm -rf "$T"; echo done
