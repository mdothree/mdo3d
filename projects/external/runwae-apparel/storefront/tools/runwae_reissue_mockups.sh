#!/bin/bash
# Runwae 2026 reissue mockups: the owner's ORIGINAL designs in the cohesive palette (forest, ivory, washed black,
# rust accent). Real lines/lettering only (extracted from his photos and files, never redrawn), composited on
# clean hoodie blanks made from the Runwae product shots. Needs ImageMagick. Writes brands/runwae/assets + manifest.
#   bash tools/runwae_reissue_mockups.sh
set -euo pipefail
cd "$(dirname "$0")/.."
B=brands/runwae/assets; O=../design/original_apparel_photos; I=../design/handoff_2026-10-14/assets/02_original_identity
T=$(mktemp -d)
FOREST='#1c2b21'; FOREST_HI='#4a6655'; IVORY='#f1ece0'; IVORY_LO='#b9b09b'; BLACK='#161615'; BLACK_HI='#4a4a46'
CREAM='#ede6d6'; GOLD='#d9c28a'; INK='#22301f'

paint_out() { # file X Y W H out : paint bright art out of a dark garment region (fabric tone + grain)
  magick "$1" -crop ${4}x${5}+$2+$3 +repage "$T/r.png"
  magick "$T/r.png" -colorspace gray -threshold 19% -morphology Dilate Disk:9 "$T/rm.png"
  magick "$T/r.png" \( -size ${4}x${5} xc:"srgb(13.9%,14.1%,15%)" -attenuate 0.12 +noise Gaussian \) \( "$T/rm.png" -blur 0x4 \) -composite "$T/rc.png"
  magick "$1" "$T/rc.png" -geometry +$2+$3 -composite "$6"; }
recolor() { # blank lo hi out : map the dark garment's tones to a palette colour, leave the white studio ground
  magick "$1" -colorspace gray -level 6%,34% -gamma 0.9 +level-colors "$2","$3" "$T/c.png"   # stretch the dark fabric range so folds survive
  magick "$1" -colorspace gray -threshold 62% -negate -morphology Erode Disk:1 -blur 0x1 "$T/gm.png"
  magick "$1" "$T/c.png" "$T/gm.png" -composite "$4"; }
ink() { # mask colour out : alpha mask -> solid colour strokes
  magick "$1" -alpha off -fill "$2" -colorize 100 "$1" -compose CopyOpacity -composite -trim +repage "$3"; }

# Blanks: back (Luv Thy Neighbor back, art out) and front (its front, chest monogram out)
paint_out $B/tlt-neighbor-hoodie-1.jpg 335 300 390 440 "$T/back-black.png"
paint_out $B/tlt-neighbor-hoodie-2.jpg 530 395 180 140 "$T/front-black.png"
for v in back front; do
  recolor "$T/$v-black.png" "$FOREST" "$FOREST_HI" "$T/$v-forest.png"
  recolor "$T/$v-black.png" "$IVORY_LO" "$IVORY" "$T/$v-ivory.png"
  recolor "$T/$v-black.png" "$BLACK" "$BLACK_HI" "$T/$v-washed.png"
done

# Masks of the owner's real lettering and lines
magick $B/wordmark-tee-1.jpg -crop 300x80+350+250 +repage -colorspace gray -level 40%,80% "$T/wm-mask.png"            # RUNWAE APPAREL (Fall '21 tee)
magick "$O/731190D9-31BF-4AA6-A7C2-F6C79D5689A5.JPG" -auto-orient -crop 600x540+1075+2360 +repage -fx "g-b" -colorspace gray -level 16%,30% -statistic median 3x3 "$T/trc-front-mask.png"  # faces + TRC chest (2021 hoodie)
magick "$I/Artboard 1 copy 9.png" -alpha extract "$T/trc-mask.png"   # the letters live in the alpha channel                              # TRC monogram
magick "$I/Artboard 1 copy 2.png" -alpha extract "$T/company-mask.png"                          # THE RUNWAE COMPANY lettering
ink "$T/wm-mask.png" "$CREAM" "$T/wm-cream.png";       ink "$T/wm-mask.png" "$INK" "$T/wm-ink.png"
ink "$T/trc-front-mask.png" "$GOLD" "$T/trcf-gold.png"; ink "$T/trc-mask.png" "$CREAM" "$T/trc-cream.png"
ink "$T/company-mask.png" "$CREAM" "$T/co-cream.png";  ink "$T/company-mask.png" "$INK" "$T/co-ink.png"

place() { # blank art WxH X Y out   (X,Y = centre)
  magick "$2" -resize "$3" "$T/a.png"; local w h; w=$(magick identify -format %w "$T/a.png"); h=$(magick identify -format %h "$T/a.png")
  magick "$1" "$T/a.png" -geometry +$(( $4 - w/2 ))+$(( $5 - h/2 )) -composite "$6"; }
# Chest marks: medium, left chest (viewer's right), centre ~(620,465). Back marks: centred on the back.
place "$T/front-ivory.png"  "$T/wm-ink.png"   150x60  600 462 "$T/ra-ivory.png"
place "$T/front-forest.png" "$T/wm-cream.png" 150x60  600 462 "$T/ra-forest.png"
place "$T/front-forest.png" "$T/trcf-gold.png" 150x140 600 470 "$T/trc-front.png"
place "$T/back-forest.png"  "$T/trc-cream.png" 300x200 500 470 "$T/trc-back.png"
place "$T/back-ivory.png"   "$T/co-ink.png"   300x240 500 480 "$T/co-ivory.png"
place "$T/back-forest.png"  "$T/co-cream.png" 300x240 500 480 "$T/co-forest.png"
for n in ra-ivory ra-forest trc-front trc-back co-ivory co-forest; do
  for w in 640 1000; do magick "$T/$n.png" -resize ${w}x -quality 84 "$B/re-$n-$w.jpg"; done
done
node -e 'const f=process.argv[1],fs=require("fs"),m=JSON.parse(fs.readFileSync(f));for(const k of ["ra-ivory","ra-forest","trc-front","trc-back","co-ivory","co-forest"])m["re-"+k]={widths:[640,1000],w:1000,h:1000};fs.writeFileSync(f,JSON.stringify(m,null,1)+"\n")' $B/manifest.json

rm -rf "$T"; echo done
# Original 2021 photo that sips rotates wrongly (HEIC orientation): bagged light-blue Runwae Company hoodies.
for w in 640 1080 1400; do magick "$O/IMG_4199.HEIC" -auto-orient -strip -resize ${w}x -quality 82 "$B/orig-company-bagged-$w.jpg"; done
node -e 'const f=process.argv[1],fs=require("fs"),m=JSON.parse(fs.readFileSync(f));m["orig-company-bagged"]={widths:[640,1080,1400],w:1400,h:1867};fs.writeFileSync(f,JSON.stringify(m,null,1)+"\n")' $B/manifest.json
