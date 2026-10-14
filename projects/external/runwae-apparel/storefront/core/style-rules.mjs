// Shared style rules the build enforces for every brand. Brand-agnostic.
//
// Small corners (Principal 2026-10-14, verbatim: "i dont like the larg eborder radius on any of those sites. im
// generally not a fan of alrge border radius unless circle."):
//   border-radius <= 4px everywhere. 50% only on a true circle: a rule that also sets equal width and height
//   (or aspect-ratio 1 with one side). No pills (999px), no 8-24px cards, panels, stickers or buttons.

const PX = { px: 1, rem: 16, em: 16 };
export const MAX_RADIUS_PX = 4;

function decls(body) {
  const out = {};
  for (const d of body.split(';')) {
    const i = d.indexOf(':');
    if (i < 0) continue;
    out[d.slice(0, i).trim().toLowerCase()] = d.slice(i + 1).trim().replace(/\s*!important$/, '');
  }
  return out;
}

function isCircle(ds) {
  const w = ds.width ?? ds['min-width'];
  const h = ds.height ?? ds['min-height'];
  if (w && h && w === h) return true;
  const ar = (ds['aspect-ratio'] ?? '').replace(/\s/g, '');
  return (ar === '1' || ar === '1/1') && !!(w || h);
}

/** One radius token is ok? */
function tokenOk(tok, circle) {
  if (tok === '0' || tok === 'inherit' || tok === 'initial' || tok === 'unset') return true;
  const m = /^(-?\d*\.?\d+)(px|rem|em|%)$/.exec(tok);
  if (!m) return false;
  const n = Number(m[1]);
  if (m[2] === '%') return n === 50 && circle;
  return n * PX[m[2]] <= MAX_RADIUS_PX;
}

/** Errors for every border-radius in a CSS string that breaks the small-corners rule. */
export function radiusErrors(css, file = 'css') {
  const errs = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of clean.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const sel = m[1].replace(/^[\s\S]*\{/, '').trim().replace(/^@[^{]*$/, '').slice(-80);
    const ds = decls(m[2]);
    const circle = isCircle(ds);
    for (const [k, v] of Object.entries(ds)) {
      if (!/^border(-[a-z]+)*-radius$/.test(k)) continue;
      const bad = v.split(/[\s/]+/).filter(Boolean).filter((t) => !tokenOk(t, circle));
      if (bad.length) errs.push(`${file}: "${sel}" ${k}:${v} (max ${MAX_RADIUS_PX}px; 50% only on equal width/height circles)`);
    }
  }
  return errs;
}

/** Templates (.mjs) may not carry radius at all: inline styles are banned by the CSP, and SVG rect rx/ry
 *  above 4 counts as a rounded corner too. */
export function templateRadiusErrors(src, file = 'template') {
  const errs = [];
  if (/border-radius/.test(src)) errs.push(`${file}: border-radius in a template (put it in styles.css)`);
  for (const m of src.matchAll(/<rect\b[^>]*\b(rx|ry)="(\d*\.?\d+)"/g)) if (Number(m[2]) > MAX_RADIUS_PX) errs.push(`${file}: <rect ${m[1]}="${m[2]}"> rounded corner`);
  return errs;
}
