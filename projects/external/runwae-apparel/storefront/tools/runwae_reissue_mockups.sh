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

paint_out() { # file X Y W H out : paint bright art out of a dark garment. Only the art pixels are replaced,
  # with the region's own fabric tone (mean of the clamped region) + grain, so no box or ghost shows.
  magick "$1" -crop ${4}x${5}+$2+$3 +repage "$T/r.png"
  magick "$T/r.png" -colorspace gray -threshold 24% -morphology Dilate Disk:7 "$T/rm.png"
  local tone; tone=$(magick "$T/r.png" -channel RGB -evaluate min 20% +channel -statistic median 25x25 -scale 1x1! -format "%[pixel:p{0,0}]" info:)
  magick -size ${4}x${5} xc:"$tone" -attenuate 0.09 +noise Gaussian "$T/fill.png"
  magick "$T/r.png" "$T/fill.png" \( "$T/rm.png" -blur 0x2.5 \) -composite "$T/rc.png"
  magick "$1" "$T/rc.png" -geometry +$2+$3 -composite "$6"; }
recolor() { # blank lightcolour floorcolour out : tint by multiply so folds and shading survive; keep the studio ground
  magick "$1" -colorspace gray -colorspace sRGB -level 4%,30% \( +clone -fill "$2" -colorize 100 \) -compose multiply -composite \( +clone -fill "$3" -colorize 100 \) -compose lighten -composite "$T/c.png"
  magick "$1" -colorspace gray -threshold 70% -negate -morphology Open Disk:2 -blur 0x1.2 "$T/gm.png"
  magick "$1" "$T/c.png" "$T/gm.png" -composite "$4"; }
ink() { # mask colour out : alpha mask -> solid colour strokes
  magick "$1" -alpha off -fill "$2" -colorize 100 "$1" -compose CopyOpacity -composite -trim +repage "$3"; }

# Blanks: back (Luv Thy Neighbor back, art out) and front (its front, chest monogram out)
paint_out $B/tlt-neighbor-hoodie-1.jpg 335 300 390 440 "$T/back-black.png"
paint_out $B/tlt-neighbor-hoodie-2.jpg 530 395 180 140 "$T/front-black.png"
for v in back front; do
  recolor "$T/$v-black.png" '#7aa98a' '#16241b' "$T/$v-forest.png"
  magick "$T/$v-black.png" -colorspace gray -colorspace sRGB -level 2%,26% +level-colors '#a59d8a','#f3eee2' "$T/iv.png"   # ivory: lift the fabric, keep folds
  magick "$T/$v-black.png" -colorspace gray -threshold 70% -negate -morphology Open Disk:2 -blur 0x1.2 "$T/gm.png"; magick "$T/$v-black.png" "$T/iv.png" "$T/gm.png" -composite "$T/$v-ivory.png"
done

# Masks of the owner's real lettering and lines
magick $B/wordmark-tee-1.jpg -crop 300x80+350+250 +repage -colorspace gray -level 40%,80% "$T/wm-mask.png"            # RUNWAE APPAREL (Fall '21 tee)
S731="$O/731190D9-31BF-4AA6-A7C2-F6C79D5689A5.JPG"   # 2021 TRC hoodie: four faces over TRC, embroidered
magick "$S731" -auto-orient -crop 700x620+1030+2300 +repage -channel G -separate +channel \( +clone -statistic minimum 15x15 -blur 0x12 \) -compose minus_src -composite -level 12%,34% "$T/m-faces.png"   # thin lines: lighting-flattened
magick "$S731" -auto-orient -crop 700x620+1030+2300 +repage -channel G -separate +channel -level 30%,62% \( -size 700x620 xc:black -fill white -draw "rectangle 0,330 700,620" -blur 0x6 \) -compose multiply -composite "$T/m-letters.png"   # solid letters
magick "$T/m-faces.png" "$T/m-letters.png" -compose lighten -composite -level 0%,70% "$T/trc-front-mask.png"
magick "$I/Artboard 1 copy 9.png" -alpha extract -trim +repage -resize 480x -blur 0x0.5 -level 20%,80% "$T/trc-mask.png"   # the letters live in the alpha channel                              # TRC monogram
magick "$I/Artboard 1 copy 2.png" -alpha extract "$T/company-mask.png"                          # THE RUNWAE COMPANY lettering
ink "$T/wm-mask.png" "$CREAM" "$T/wm-cream.png";       ink "$T/wm-mask.png" "$INK" "$T/wm-ink.png"
ink "$T/trc-front-mask.png" "#e6d29c" "$T/trcf-gold.png"; ink "$T/trc-mask.png" "$CREAM" "$T/trc-cream.png"
ink "$T/company-mask.png" "$CREAM" "$T/co-cream.png";  ink "$T/company-mask.png" "$INK" "$T/co-ink.png"

place() { # blank art WxH X Y out   (X,Y = centre)
  magick "$2" -resize "$3" "$T/a.png"; local w h; w=$(magick identify -format %w "$T/a.png"); h=$(magick identify -format %h "$T/a.png")
  magick "$1" "$T/a.png" -geometry +$(( $4 - w/2 ))+$(( $5 - h/2 )) -composite "$6"; }
# Chest marks: medium, left chest (viewer's right), centre ~(620,465). Back marks: centred on the back.
place "$T/front-ivory.png"  "$T/wm-ink.png"   150x60  500 462 "$T/ra-ivory.png"
place "$T/front-forest.png" "$T/wm-cream.png" 150x60  500 462 "$T/ra-forest.png"
place "$T/front-forest.png" "$T/trcf-gold.png" 110x110 500 505 "$T/trc-front.png"   # centre chest, medium (~4 in)
# Detail view so the faces read: the same art at full size on forest fabric from the blank
magick "$T/front-forest.png" -crop 300x300+350+380 +repage -resize 1000x1000 \( "$T/trcf-gold.png" -resize 640x640 \) -gravity center -composite "$T/trc-detail.png"
place "$T/back-forest.png"  "$T/trc-cream.png" 240x200 500 410 "$T/trc-back.png"   # upper back, medium
place "$T/back-ivory.png"   "$T/co-ink.png"   300x240 500 480 "$T/co-ivory.png"
place "$T/back-forest.png"  "$T/co-cream.png" 300x240 500 480 "$T/co-forest.png"
for n in ra-ivory ra-forest trc-front trc-detail trc-back co-ivory co-forest; do
  for w in 640 1000; do magick "$T/$n.png" -resize ${w}x -quality 84 "$B/re-$n-$w.jpg"; done
done
node -e 'const f=process.argv[1],fs=require("fs"),m=JSON.parse(fs.readFileSync(f));for(const k of ["ra-ivory","ra-forest","trc-front","trc-detail","trc-back","co-ivory","co-forest"])m["re-"+k]={widths:[640,1000],w:1000,h:1000};fs.writeFileSync(f,JSON.stringify(m,null,1)+"\n")' $B/manifest.json

rm -rf "$T"; echo done
# Original 2021 photo that sips rotates wrongly (HEIC orientation): bagged light-blue Runwae Company hoodies.
for w in 640 1080 1400; do magick "$O/IMG_4199.HEIC" -auto-orient -strip -resize ${w}x -quality 82 "$B/orig-company-bagged-$w.jpg"; done
node -e 'const f=process.argv[1],fs=require("fs"),m=JSON.parse(fs.readFileSync(f));m["orig-company-bagged"]={widths:[640,1080,1400],w:1400,h:1867};fs.writeFileSync(f,JSON.stringify(m,null,1)+"\n")' $B/manifest.json
