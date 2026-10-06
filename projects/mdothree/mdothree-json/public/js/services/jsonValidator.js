// jsonValidator.js

export function validateJSON(text) {
  try {
    const parsed = JSON.parse(text);
    return { valid: true, parsed };
  } catch (e) {
    // Engine messages differ (V8 "Unexpected token" and Safari give no position),
    // so locate the error ourselves for a consistent line/column everywhere.
    let pos = locateJSONError(text);
    if (pos < 0) {
      const m = e.message.match(/position (\d+)/i);
      pos = m ? parseInt(m[1], 10) : -1;
    }
    let line = null, column = null, hint = '';
    if (pos >= 0) {
      const before = text.slice(0, pos);
      line = before.split('\n').length;
      column = pos - before.lastIndexOf('\n');
      hint = hintFor(text, pos);
    }
    return { valid: false, error: e.message, line, column, hint };
  }
}

function hintFor(text, pos) {
  const ch = text[pos];
  const prev = text.slice(0, pos).replace(/\s+$/, '').slice(-1);
  if ((ch === '}' || ch === ']') && prev === ',') return `Trailing comma before "${ch}" is not allowed in JSON.`;
  if (ch === "'") return 'JSON strings and keys must use double quotes (").';
  if (pos >= text.length) return 'Unexpected end of input — check for a missing closing bracket or quote.';
  if (/[A-Za-z_$]/.test(ch || '') && (prev === '{' || prev === ',')) return 'Object keys must be wrapped in double quotes.';
  return '';
}

/**
 * Offset of the first syntax error in `src`, or -1 if none / unknown.
 * Minimal RFC 8259 recogniser (no values are built).
 */
export function locateJSONError(src) {
  const n = src.length;
  const NUM = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
  let i = 0;
  const fail = () => { throw { pos: i }; };
  const ws = () => { while (i < n && (src[i] === ' ' || src[i] === '\t' || src[i] === '\n' || src[i] === '\r')) i++; };
  function string() {
    i++;
    while (i < n) {
      const c = src[i];
      if (c === '"') { i++; return; }
      if (c === '\\') {
        const e = src[i + 1];
        if (e !== undefined && '"\\/bfnrt'.includes(e)) { i += 2; continue; }
        if (e === 'u' && /^[0-9a-fA-F]{4}$/.test(src.slice(i + 2, i + 6))) { i += 6; continue; }
        fail();
      }
      if (c < ' ') fail();
      i++;
    }
    fail();
  }
  function value() {
    ws();
    const c = src[i];
    if (c === '{') {
      i++; ws();
      if (src[i] === '}') { i++; return; }
      for (;;) {
        ws();
        if (src[i] !== '"') fail();
        string(); ws();
        if (src[i] !== ':') fail();
        i++; value(); ws();
        if (src[i] === ',') { i++; continue; }
        if (src[i] === '}') { i++; return; }
        fail();
      }
    }
    if (c === '[') {
      i++; ws();
      if (src[i] === ']') { i++; return; }
      for (;;) {
        value(); ws();
        if (src[i] === ',') { i++; continue; }
        if (src[i] === ']') { i++; return; }
        fail();
      }
    }
    if (c === '"') return string();
    if (c === '-' || (c >= '0' && c <= '9')) {
      NUM.lastIndex = i;
      const m = NUM.exec(src);
      if (!m) fail();
      i += m[0].length;
      return;
    }
    for (const lit of ['true', 'false', 'null']) {
      if (src.startsWith(lit, i)) { i += lit.length; return; }
    }
    fail();
  }
  try {
    value(); ws();
    if (i < n) fail();
    return -1;
  } catch (e) {
    return e && typeof e.pos === 'number' ? Math.min(e.pos, n) : -1;
  }
}

export function summarizeJSON(obj, depth = 0, maxDepth = 3) {
  const type = Array.isArray(obj) ? 'array' : typeof obj;
  const summary = [];

  if (type === 'object' && obj !== null) {
    const keys = Object.keys(obj);
    summary.push({ key: 'Type', value: 'Object' });
    summary.push({ key: 'Keys', value: keys.length.toString() });
    if (depth < maxDepth) {
      keys.slice(0, 8).forEach(k => {
        const v = obj[k];
        const vType = Array.isArray(v) ? `array[${v.length}]` : typeof v;
        summary.push({ key: `  .${k}`, value: vType });
      });
      if (keys.length > 8) summary.push({ key: `  ...`, value: `+${keys.length - 8} more` });
    }
  } else if (type === 'array') {
    summary.push({ key: 'Type', value: 'Array' });
    summary.push({ key: 'Length', value: obj.length.toString() });
    if (obj.length > 0) {
      const firstType = Array.isArray(obj[0]) ? 'array' : typeof obj[0];
      summary.push({ key: 'Item type', value: firstType });
      if (firstType === 'object' && obj[0] !== null) {
        summary.push({ key: 'Item keys', value: Object.keys(obj[0]).length.toString() });
      }
    }
  } else {
    summary.push({ key: 'Type', value: type });
    summary.push({ key: 'Value', value: String(obj).slice(0, 50) });
  }

  return summary;
}
