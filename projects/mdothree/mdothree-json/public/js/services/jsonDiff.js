// jsonDiff.js — Deep JSON comparison

export function diffJSON(a, b, options = {}) {
  let added = 0, removed = 0, changed = 0;
  const lines = [];

  function diff(valA, valB, path = '', depth = 0) {
    const pad = '  '.repeat(depth);

    // Same reference or primitive equality
    if (valA === valB) {
      const line = `${pad}${formatValue(valA, path, depth)}`;
      lines.push(`<span class="diff-equal">${escHtml(line)}</span>`);
      return;
    }

    const typeA = getType(valA);
    const typeB = getType(valB);

    // Type changed
    if (typeA !== typeB) {
      lines.push(`<span class="diff-removed">${escHtml(`${pad}- ${formatValue(valA, path, depth)}`)}</span>`);
      lines.push(`<span class="diff-added">${escHtml(`${pad}+ ${formatValue(valB, path, depth)}`)}</span>`);
      changed++;
      return;
    }

    if (typeA === 'object') {
      const keysA = Object.keys(valA);
      const keysB = Object.keys(valB);
      const allKeys = [...new Set([...keysA, ...keysB])];
      const label = path ? `<span class="diff-key">"${escHtml(path)}"</span>: ` : '';
      lines.push(`<span class="diff-equal">${pad}${label}{</span>`);
      for (const key of allKeys) {
        if (!(key in valA)) {
          lines.push(`<span class="diff-added">${escHtml(`${pad}  + "${key}": ${JSON.stringify(valB[key])}`)}</span>`);
          added++;
        } else if (!(key in valB)) {
          lines.push(`<span class="diff-removed">${escHtml(`${pad}  - "${key}": ${JSON.stringify(valA[key])}`)}</span>`);
          removed++;
        } else {
          diff(valA[key], valB[key], key, depth + 1);
        }
      }
      lines.push(`<span class="diff-equal">${pad}}</span>`);
      return;
    }

    if (typeA === 'array') {
      const label = path ? `<span class="diff-key">"${escHtml(path)}"</span>: ` : '';
      lines.push(`<span class="diff-equal">${pad}${label}[</span>`);
      const maxLen = Math.max(valA.length, valB.length);
      for (let i = 0; i < maxLen; i++) {
        if (i >= valA.length) {
          lines.push(`<span class="diff-added">${escHtml(`${pad}  + ${JSON.stringify(valB[i])}`)}</span>`);
          added++;
        } else if (i >= valB.length) {
          lines.push(`<span class="diff-removed">${escHtml(`${pad}  - ${JSON.stringify(valA[i])}`)}</span>`);
          removed++;
        } else {
          diff(valA[i], valB[i], `[${i}]`, depth + 1);
        }
      }
      lines.push(`<span class="diff-equal">${pad}]</span>`);
      return;
    }

    // Primitive value changed
    lines.push(`<span class="diff-removed">${escHtml(`${pad}  - ${path ? `"${path}": ` : ''}${JSON.stringify(valA)}`)}</span>`);
    lines.push(`<span class="diff-added">${escHtml(`${pad}  + ${path ? `"${path}": ` : ''}${JSON.stringify(valB)}`)}</span>`);
    changed++;
  }

  diff(a, b);
  return { html: lines.join('\n'), added, removed, changed };
}

function getType(val) {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}

function formatValue(val, key, depth) {
  const pad = '  '.repeat(depth);
  const prefix = key ? `"${key}": ` : '';
  if (val === null) return `${prefix}null`;
  if (typeof val !== 'object') return `${prefix}${JSON.stringify(val)}`;
  if (Array.isArray(val)) return `${prefix}[${val.length} items]`;
  return `${prefix}{${Object.keys(val).length} keys}`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
