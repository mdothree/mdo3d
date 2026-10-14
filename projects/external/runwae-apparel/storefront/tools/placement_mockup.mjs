#!/usr/bin/env node
// Placement mockups: a flat tee (front or back) in the garment colour with art placed per the print spec.
// Used where a concept render shows art in the wrong place (design rule: shirt-sized art goes on the back;
// chest marks medium). Renders with headless Chrome + sips (no installs). Output is a CONCEPT image.
//   node tools/placement_mockup.mjs <brand>   reads brands/<brand>/mockups.json, writes assets/<out>-<w>.jpg + manifest
// mockups.json: {"mockups":[{"out","view":"back"|"front","color","bg","art":"assets/x.jpg","artFit":0.5,"chestText":"GLB"}]}
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const brand = process.argv[2];
const bdir = join(ROOT, 'brands', brand);
const { mockups } = JSON.parse(readFileSync(join(bdir, 'mockups.json'), 'utf8'));
const mpath = join(bdir, 'assets', 'manifest.json');
const manifest = existsSync(mpath) ? JSON.parse(readFileSync(mpath, 'utf8')) : {};
const tmp = mkdtempSync(join(tmpdir(), 'mock-'));

const tee = (view, color) => {
  const neck = view === 'front' ? 'Q500 175 600 92' : 'Q500 122 600 92';
  return `<svg viewBox="0 0 1000 1000" class="tee"><path d="M300 120 L400 92 ${neck} L700 120 L868 236 L792 364 L722 322 L728 900 Q500 922 272 900 L278 322 L208 364 L132 236 Z" fill="${color}" stroke="#141414" stroke-width="6" stroke-linejoin="round"/>
<path d="M400 92 ${neck}" fill="none" stroke="#141414" stroke-width="6"/><path d="M412 99 ${view === 'front' ? 'Q500 160 588 99' : 'Q500 112 588 99'}" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="10"/>
<path d="M278 322 L300 640 M722 322 L700 640" stroke="rgba(0,0,0,.06)" stroke-width="30"/></svg>`;
};

const hex = (h) => [1, 3, 5].map((i) => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3));

for (const m of mockups) {
  const art = m.art ? pathToFileURL(join(bdir, m.art)).href : null;
  const html = `<!doctype html><html><head><style>
html,body{margin:0;width:1000px;height:1000px;background:${m.bg ?? '#ffd6e8'};overflow:hidden}
.tee{position:absolute;inset:0;width:1000px;height:1000px}
.art{position:absolute;left:50%;top:${m.artTop ?? 250}px;width:${Math.round(1000 * (m.artFit ?? 0.42))}px;transform:translateX(-50%);
 -webkit-mask-image:radial-gradient(ellipse at center,#000 46%,transparent 60%);mask-image:radial-gradient(ellipse at center,#000 46%,transparent 60%);filter:url(#ink)}
.chest{position:absolute;left:${m.view === 'front' ? 590 : -999}px;top:230px;font:400 46px/1 'Permanent Marker','Marker Felt',cursive;color:#141414;transform:rotate(-4deg)}
.view{position:absolute;left:36px;top:30px;font:400 40px/1 'Permanent Marker','Marker Felt',cursive;color:#141414;transform:rotate(-6deg)}
</style></head><body><svg width="0" height="0" style="position:absolute"><filter id="ink" color-interpolation-filters="sRGB">${m.keep === 'colour' ? '<feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 -1.6 -1.6 -1.6 0 4.1"/></filter><filter id="ink0">' : ''}<feColorMatrix type="matrix" values="0 0 0 0 ${hex(m.ink ?? '#141414')[0]} 0 0 0 0 ${hex(m.ink ?? '#141414')[1]} 0 0 0 0 ${hex(m.ink ?? '#141414')[2]} ${m.keep === 'colour' ? '-2.2 -1.2 -1.2 0 4.2' : `-3.4 -3.4 -3.4 0 ${m.threshold ?? 6.2}`}"/></filter></svg>${tee(m.view, m.color)}${art && m.view === 'back' ? `<img class="art" src="${art}">` : ''}
${m.chestText ? `<div class="chest">${m.chestText}<span style="font-size:.5em;vertical-align:.8em">&#9825;</span></div>` : ''}<div class="view">${m.view === 'back' ? 'BACK' : 'FRONT'}</div></body></html>`;
  const hf = join(tmp, `${m.out}.html`);
  writeFileSync(hf, html);
  const png = join(tmp, `${m.out}.png`);
  execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--window-size=1000,1000', '--virtual-time-budget=3000', `--screenshot=${png}`, pathToFileURL(hf).href], { stdio: 'ignore', timeout: 60000 });
  const widths = [640, 1000];
  for (const w of widths) execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '84', ...(w < 1000 ? ['--resampleWidth', String(w)] : []), png, '--out', join(bdir, 'assets', `${m.out}-${w}.jpg`)], { stdio: 'ignore' });
  manifest[m.out] = { widths, w: 1000, h: 1000 };
  console.log(`${m.out}: ${m.view}`);
}
writeFileSync(mpath, JSON.stringify(manifest, null, 1) + '\n');
