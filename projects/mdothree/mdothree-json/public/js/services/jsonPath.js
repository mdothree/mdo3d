/**
 * jsonPath.js — JSONPath query engine
 *
 * Supports the core JSONPath spec:
 *   $           root element
 *   .key        child key
 *   ['key']     child key (bracket notation)
 *   [*]         all children
 *   ..key       recursive descent
 *   [n]         array index (supports negative)
 *   [1,2,3]     union
 *   [1:3]       slice (start:end:step)
 *   [?(@.x>1)]  filter expression
 *   @           current element (in filters)
 */

export function queryJSONPath(obj, path) {
  if (!path || path.trim() === '$') return [obj];
  path = path.trim();
  if (!path.startsWith('$')) throw new Error('JSONPath must start with $');

  const results = [];
  _traverse(obj, _tokenize(path.slice(1)), results);
  return results;
}

// ── Tokenizer ─────────────────────────────────────────────────────────────────

function _tokenize(path) {
  const tokens = [];
  let i = 0;

  while (i < path.length) {
    // Skip leading dots
    if (path[i] === '.') {
      i++;
      // Recursive descent: ..
      if (path[i] === '.') {
        tokens.push({ type: 'recurse' });
        i++;
        continue;
      }
      // Wildcard after dot
      if (path[i] === '*') {
        tokens.push({ type: 'wildcard' });
        i++; continue;
      }
      // Named key after dot
      const match = path.slice(i).match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (match) {
        tokens.push({ type: 'key', value: match[1] });
        i += match[1].length; continue;
      }
      continue;
    }

    // Bracket notation
    if (path[i] === '[') {
      const end = _findClosingBracket(path, i);
      const inner = path.slice(i + 1, end).trim();
      i = end + 1;

      if (inner === '*') {
        tokens.push({ type: 'wildcard' }); continue;
      }
      // Filter expression [?(...)]
      if (inner.startsWith('?(') && inner.endsWith(')')) {
        tokens.push({ type: 'filter', expr: inner.slice(2, -1) }); continue;
      }
      // Quoted key
      if (/^['"]/.test(inner)) {
        const key = inner.replace(/^['"]|['"]$/g, '');
        tokens.push({ type: 'key', value: key }); continue;
      }
      // Union [1,2,'key']
      if (inner.includes(',')) {
        const parts = inner.split(',').map(p => p.trim().replace(/^['"]|['"]$/g, ''));
        tokens.push({ type: 'union', values: parts }); continue;
      }
      // Slice [start:end:step]
      if (inner.includes(':')) {
        const parts = inner.split(':').map(p => p.trim() === '' ? undefined : parseInt(p));
        tokens.push({ type: 'slice', start: parts[0], end: parts[1], step: parts[2] }); continue;
      }
      // Numeric index
      const n = parseInt(inner);
      if (!isNaN(n)) {
        tokens.push({ type: 'index', value: n }); continue;
      }
      // Plain key
      tokens.push({ type: 'key', value: inner });
      continue;
    }

    i++;
  }

  return tokens;
}

function _findClosingBracket(str, start) {
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    if (str[i] === '[') depth++;
    if (str[i] === ']') { depth--; if (depth === 0) return i; }
  }
  return str.length - 1;
}

// ── Traversal ─────────────────────────────────────────────────────────────────

function _traverse(node, tokens, results) {
  if (tokens.length === 0) {
    results.push(node); return;
  }

  const [token, ...rest] = tokens;

  switch (token.type) {
    case 'key': {
      if (node !== null && typeof node === 'object' && token.value in node) {
        _traverse(node[token.value], rest, results);
      }
      break;
    }
    case 'wildcard': {
      if (Array.isArray(node)) {
        node.forEach(child => _traverse(child, rest, results));
      } else if (node !== null && typeof node === 'object') {
        Object.values(node).forEach(child => _traverse(child, rest, results));
      }
      break;
    }
    case 'index': {
      if (Array.isArray(node)) {
        const idx = token.value < 0 ? node.length + token.value : token.value;
        if (idx >= 0 && idx < node.length) _traverse(node[idx], rest, results);
      }
      break;
    }
    case 'union': {
      token.values.forEach(v => {
        const n = parseInt(v);
        const key = isNaN(n) ? v : n;
        if (Array.isArray(node) && typeof key === 'number') {
          const idx = key < 0 ? node.length + key : key;
          if (idx >= 0 && idx < node.length) _traverse(node[idx], rest, results);
        } else if (node !== null && typeof node === 'object' && v in node) {
          _traverse(node[v], rest, results);
        }
      });
      break;
    }
    case 'slice': {
      if (!Array.isArray(node)) break;
      const len  = node.length;
      const step = token.step ?? 1;
      let start  = token.start ?? (step > 0 ? 0 : len - 1);
      let end    = token.end   ?? (step > 0 ? len : -len - 1);
      if (start < 0) start = Math.max(len + start, 0);
      if (end < 0)   end   = Math.max(len + end, -1);
      if (step > 0) {
        for (let i = start; i < Math.min(end, len); i += step) {
          _traverse(node[i], rest, results);
        }
      } else {
        for (let i = Math.min(start, len - 1); i > Math.max(end, -1); i += step) {
          _traverse(node[i], rest, results);
        }
      }
      break;
    }
    case 'filter': {
      const items = Array.isArray(node)
        ? node
        : (node !== null && typeof node === 'object' ? Object.values(node) : []);
      items.forEach(item => {
        try {
          if (_evalFilter(item, token.expr)) _traverse(item, rest, results);
        } catch (_) { /* skip items that throw */ }
      });
      break;
    }
    case 'recurse': {
      // Apply remaining tokens to current node first
      _traverse(node, rest, results);
      // Then recurse into all children
      if (Array.isArray(node)) {
        node.forEach(child => _traverse(child, tokens, results));
      } else if (node !== null && typeof node === 'object') {
        Object.values(node).forEach(child => _traverse(child, tokens, results));
      }
      break;
    }
  }
}

// ── Filter evaluator — safe recursive descent parser (no eval/Function) ─────────
// Supports: @.key, @['key'], @, ==, !=, <, <=, >, >=, &&, ||, !, literals

function _evalFilter(item, expr) {
  try {
    const tokens = _tokenizeFilter(expr.trim());
    return Boolean(_parseOr(tokens, item, { pos: 0 }));
  } catch (_) {
    return false;
  }
}

function _tokenizeFilter(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    // Skip whitespace
    if (/\s/.test(expr[i])) { i++; continue; }
    // Two-char operators
    if (i + 1 < expr.length) {
      const two = expr.slice(i, i + 2);
      if (['==', '!=', '<=', '>=', '&&', '||'].includes(two)) {
        tokens.push({ type: 'op', val: two }); i += 2; continue;
      }
    }
    // One-char operators / punctuation
    if ('<>!()'.includes(expr[i])) {
      tokens.push({ type: 'op', val: expr[i] }); i++; continue;
    }
    // @ references: @.key or @['key'] or just @
    if (expr[i] === '@') {
      i++;
      if (expr[i] === '.') {
        i++;
        const m = expr.slice(i).match(/^[a-zA-Z_$][\w$]*/);
        if (m) { tokens.push({ type: 'ref', val: m[0] }); i += m[0].length; continue; }
      } else if (expr[i] === '[') {
        i++;
        const q = expr[i]; i++;
        const end = expr.indexOf(q, i);
        tokens.push({ type: 'ref', val: expr.slice(i, end) }); i = end + 2; continue;
      }
      tokens.push({ type: 'current' }); continue;
    }
    // String literal
    if (expr[i] === "'" || expr[i] === '"') {
      const q = expr[i]; i++;
      let s = '';
      while (i < expr.length && expr[i] !== q) {
        if (expr[i] === '\\') { i++; s += expr[i]; } else s += expr[i];
        i++;
      }
      i++; // closing quote
      tokens.push({ type: 'string', val: s }); continue;
    }
    // Number
    const numM = expr.slice(i).match(/^-?\d+(?:\.\d+)?/);
    if (numM) { tokens.push({ type: 'number', val: parseFloat(numM[0]) }); i += numM[0].length; continue; }
    // null/true/false
    const kwM = expr.slice(i).match(/^(null|true|false)/);
    if (kwM) {
      tokens.push({ type: 'literal', val: kwM[0] === 'null' ? null : kwM[0] === 'true' });
      i += kwM[0].length; continue;
    }
    i++; // skip unknown
  }
  return tokens;
}

function _resolveRef(token, item) {
  if (token.type === 'current') return item;
  if (token.type === 'ref') {
    if (item === null || typeof item !== 'object') return undefined;
    return item[token.val];
  }
  if (token.type === 'string') return token.val;
  if (token.type === 'number') return token.val;
  if (token.type === 'literal') return token.val;
  return undefined;
}

function _parseOr(tokens, item, state) {
  let left = _parseAnd(tokens, item, state);
  while (state.pos < tokens.length && tokens[state.pos]?.val === '||') {
    state.pos++;
    const right = _parseAnd(tokens, item, state);
    left = left || right;
  }
  return left;
}

function _parseAnd(tokens, item, state) {
  let left = _parseComparison(tokens, item, state);
  while (state.pos < tokens.length && tokens[state.pos]?.val === '&&') {
    state.pos++;
    const right = _parseComparison(tokens, item, state);
    left = left && right;
  }
  return left;
}

function _parseComparison(tokens, item, state) {
  // Handle leading !
  if (tokens[state.pos]?.val === '!') {
    state.pos++;
    return !_parseComparison(tokens, item, state);
  }
  // Handle parens
  if (tokens[state.pos]?.val === '(') {
    state.pos++;
    const val = _parseOr(tokens, item, state);
    if (tokens[state.pos]?.val === ')') state.pos++;
    return val;
  }
  const left = _resolveRef(tokens[state.pos], item);
  state.pos++;
  const op = tokens[state.pos];
  if (!op || !['==','!=','<','<=','>','>='].includes(op?.val)) return Boolean(left !== undefined && left !== null && left !== false);
  state.pos++;
  const right = _resolveRef(tokens[state.pos], item);
  state.pos++;
  switch (op.val) {
    case '==': return left == right;   // intentional loose equality
    case '!=': return left != right;
    case '<':  return left < right;
    case '<=': return left <= right;
    case '>':  return left > right;
    case '>=': return left >= right;
  }
  return false;
}

// ── Formatter for results display ─────────────────────────────────────────────

export function formatResults(results) {
  if (results.length === 0) return '// No matches found';
  if (results.length === 1) return JSON.stringify(results[0], null, 2);
  return JSON.stringify(results, null, 2);
}
