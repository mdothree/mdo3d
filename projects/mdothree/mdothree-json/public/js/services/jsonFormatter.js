// jsonFormatter.js

// Formatting is SOURCE-PRESERVING: we validate with JSON.parse, then re-indent the
// original tokens instead of round-tripping through JS values. A JSON.parse /
// JSON.stringify round trip silently rewrote big integers
// (12345678901234567890 -> 12345678901234567000), "1.10" -> 1.1, and dropped
// duplicate keys.

function tokenize(src) {
  const toks = [];
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '"') {
      let j = i + 1;
      while (j < n && src[j] !== '"') { if (src[j] === '\\') j++; j++; }
      toks.push(src.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    if (c === '{' || c === '}' || c === '[' || c === ']' || c === ':' || c === ',') { toks.push(c); i++; continue; }
    let j = i;
    while (j < n && !' \t\n\r{}[]:,"'.includes(src[j])) j++;
    toks.push(src.slice(i, j));
    i = j;
  }
  return toks;
}

export function formatJSON(jsonStr, indent = 2) {
  JSON.parse(jsonStr); // throws on invalid
  const unit = typeof indent === 'number' ? ' '.repeat(Math.max(0, Math.min(10, indent))) : String(indent);
  if (!unit) return minifyJSON(jsonStr);
  const toks = tokenize(jsonStr);
  let out = '';
  let depth = 0;
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (t === '{' || t === '[') {
      const close = t === '{' ? '}' : ']';
      if (toks[k + 1] === close) { out += t + close; k++; continue; }
      depth++;
      out += t + '\n' + unit.repeat(depth);
    } else if (t === '}' || t === ']') {
      depth--;
      out += '\n' + unit.repeat(depth) + t;
    } else if (t === ',') {
      out += ',\n' + unit.repeat(depth);
    } else if (t === ':') {
      out += ': ';
    } else {
      out += t;
    }
  }
  return out;
}

export function minifyJSON(jsonStr) {
  JSON.parse(jsonStr); // throws on invalid
  return tokenize(jsonStr).join('');
}

// Canonical decimal form (digits + exponent) used to compare a literal with what JS keeps.
function canonNumber(s) {
  s = String(s).toLowerCase();
  let sign = '';
  if (s[0] === '-') { sign = '-'; s = s.slice(1); }
  let exp = 0;
  const e = s.indexOf('e');
  if (e >= 0) { exp = parseInt(s.slice(e + 1), 10); s = s.slice(0, e); }
  const [ip, fp = ''] = s.split('.');
  let digits = ip + fp;
  exp += ip.length;
  const lead = digits.match(/^0*/)[0].length;
  digits = digits.slice(lead).replace(/0+$/, '');
  exp -= lead;
  if (!digits) return '0';
  return `${sign}${digits}e${exp}`;
}

/**
 * Number literals in `jsonStr` that JavaScript cannot represent exactly
 * (e.g. 64-bit IDs). Converters that parse JSON will round these.
 * @returns {Array<{ literal: string, parsed: string }>}
 */
export function findLossyNumbers(jsonStr) {
  const out = [];
  for (const t of tokenize(jsonStr)) {
    if (!/^-?\d/.test(t)) continue;
    const parsed = Number(t);
    if (canonNumber(t) !== canonNumber(String(parsed))) out.push({ literal: t, parsed: String(parsed) });
  }
  return out;
}

/** One-line user-facing warning for lossy numbers, or '' if none. */
export function lossyNumberWarning(jsonStr) {
  let lossy;
  try { lossy = findLossyNumbers(jsonStr); } catch { return ''; }
  if (!lossy.length) return '';
  const ex = lossy[0];
  return `⚠️ ${lossy.length} number${lossy.length > 1 ? 's are' : ' is'} too large/precise for JavaScript and ${lossy.length > 1 ? 'were' : 'was'} rounded in this output (e.g. ${ex.literal} → ${ex.parsed}). Quote such values as strings to keep them exact.`;
}

export function syntaxHighlight(json) {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2);
  }
  // Escape HTML first
  json = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    match => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
          // Remove trailing colon from key for display
          return `<span class="${cls}">${match.slice(0, -1)}</span><span class="json-punct">:</span>`;
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}
