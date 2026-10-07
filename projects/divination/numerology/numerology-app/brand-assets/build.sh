#!/bin/sh
# Regenerates share image + icons from the SVG sources in this folder.
# Requires rsvg-convert and ImageMagick (brew install librsvg imagemagick).
set -e
cd "$(dirname "$0")"
OUT=../public
rsvg-convert -w 1200 -h 630 og-image.svg -o $OUT/og-image.png
cp favicon.svg $OUT/favicon.svg
rsvg-convert -w 180 -h 180 icon-square.svg -o $OUT/apple-touch-icon.png
rsvg-convert -w 192 -h 192 favicon.svg -o $OUT/icon-192.png
rsvg-convert -w 512 -h 512 favicon.svg -o $OUT/icon-512.png
rsvg-convert -w 16 -h 16 favicon.svg -o /tmp/_fav16.png
rsvg-convert -w 32 -h 32 favicon.svg -o /tmp/_fav32.png
rsvg-convert -w 48 -h 48 favicon.svg -o /tmp/_fav48.png
magick /tmp/_fav16.png /tmp/_fav32.png /tmp/_fav48.png $OUT/favicon.ico
rm -f /tmp/_fav16.png /tmp/_fav32.png /tmp/_fav48.png
