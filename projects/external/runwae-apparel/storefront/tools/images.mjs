#!/usr/bin/env node
// Web images for a brand, from its crop list. macOS `sips` only (no npm, no Python).
//
//   node tools/images.mjs <brand>          reads brands/<brand>/images.json, writes brands/<brand>/assets/<out>-<w>.jpg
//                                           and brands/<brand>/assets/manifest.json ({out: {widths, w, h}})
//
// images.json: { "sources": {"key": "~/path/to/original.png"}, "crops": [
//   {"out": "rust-hoodie", "src": "key", "x": 0, "y": 0, "w": 300, "h": 400, "widths": [480, 960]} ] }
// Omit x/y/w/h to use the whole image. Widths above the crop width are dropped (we never upscale);
// the crop width (capped by "max", default 1400) is kept as the largest size. Originals are never modified.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir, tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = process.argv[2];
if (!brand) { console.error('usage: node tools/images.mjs <brand>'); process.exit(1); }
const bdir = join(ROOT, 'brands', brand);
const spec = JSON.parse(readFileSync(join(bdir, 'images.json'), 'utf8'));
const out = join(bdir, 'assets');
mkdirSync(out, { recursive: true });
const mpath = join(out, 'manifest.json');
const manifest = existsSync(mpath) ? JSON.parse(readFileSync(mpath, 'utf8')) : {};
const expand = (p) => p.replace(/^~(?=\/)/, homedir());
const sips = (args) => execFileSync('sips', args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const size = (f) => {
  const o = sips(['-g', 'pixelWidth', '-g', 'pixelHeight', f]);
  return { w: Number(/pixelWidth: (\d+)/.exec(o)[1]), h: Number(/pixelHeight: (\d+)/.exec(o)[1]) };
};

/** EXIF orientation (tag 0x0112 in IFD0) of a JPEG, or 1. sips doesn't report it, Chrome honours it. */
function exifOrientation(file) {
  const b = readFileSync(file);
  const i = b.indexOf(Buffer.from('Exif\0\0'));
  if (i < 0) return 1;
  const t = i + 6;
  const le = b.toString('ascii', t, t + 2) === 'II';
  const u16 = (o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
  const u32 = (o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
  const ifd = t + u32(t + 4);
  for (let n = u16(ifd), e = ifd + 2; n > 0; n--, e += 12) if (u16(e) === 0x0112) return u16(e + 8);
  return 1;
}

for (const c of spec.crops) {
  const src = expand(spec.sources[c.src] ?? c.src);
  if (!existsSync(src)) { console.error(`missing source for ${c.out}: ${src}`); process.exitCode = 1; continue; }
  const full = size(src);
  const box = { x: c.x ?? 0, y: c.y ?? 0, w: c.w ?? full.w, h: c.h ?? full.h };
  const whole = box.x === 0 && box.y === 0 && box.w === full.w && box.h === full.h;
  // sips quirk: a crop at x=0 that reaches the bottom/right edge silently returns the whole image. Nudge it 1px.
  if (!whole && box.x === 0) { box.x = 1; box.w -= 1; }
  const tmp = join(tmpdir(), `seed-${brand}-${c.out}.jpg`);
  sips(['-s', 'format', 'jpeg', '-s', 'formatOptions', '86', ...(whole ? [] : ['--cropOffset', String(box.y), String(box.x), '-c', String(box.h), String(box.w)]), src, '--out', tmp]);
  const got = size(tmp);
  if (got.w !== box.w || got.h !== box.h) { console.error(`crop failed for ${c.out}: got ${got.w}x${got.h}`); process.exitCode = 1; continue; }
  const top = Math.min(box.w, c.max ?? 1400); // largest size kept (caps huge phone photos)
  const widths = [...new Set([...(c.widths ?? [640]).filter((w) => w < top), top])].sort((a, b) => a - b);
  for (const w of widths) {
    const dest = join(out, `${c.out}-${w}.jpg`);
    if (w === box.w) sips(['-s', 'formatOptions', '82', tmp, '--out', dest]);
    else sips(['-s', 'formatOptions', '82', '--resampleWidth', String(w), tmp, '--out', dest]);
  }
  // Phone photos often carry EXIF rotation (6/8): browsers display them rotated, so swap the recorded size.
  const rot = String(exifOrientation(tmp));
  const h = Math.round(box.h * top / box.w);
  manifest[c.out] = rot === '6' || rot === '8' ? { widths, w: h, h: top, rotated: true } : { widths, w: top, h };
  console.log(`${c.out}: ${box.w}x${box.h} -> ${widths.join(', ')}`);
}
writeFileSync(mpath, JSON.stringify(manifest, null, 1) + '\n');
