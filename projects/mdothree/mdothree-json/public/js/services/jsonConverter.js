// jsonConverter.js — JSON to YAML, CSV, XML, TypeScript

// ─── JSON → YAML ────────────────────────────────────────────────────────────
export function jsonToYAML(obj, indent = 0) {
  const pad = '  '.repeat(indent);

  if (obj === null)      return 'null';
  if (obj === undefined) return '~';
  if (typeof obj === 'boolean') return String(obj);
  if (typeof obj === 'number')  return String(obj);
  if (typeof obj === 'string') {
    // JSON string syntax is valid YAML double-quoted syntax (escapes \\, \", \n, \uXXXX).
    return needsQuotes(obj) ? JSON.stringify(obj) : obj;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map(item => {
      const val = jsonToYAML(item, indent + 1);
      if (typeof item === 'object' && item !== null) {
        return `${pad}- \n${val.split('\n').map(l => `${pad}  ${l}`).join('\n')}`;
      }
      return `${pad}- ${val}`;
    }).join('\n');
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    return keys.map(key => {
      const val = obj[key];
      const safeKey = needsQuotes(key) ? JSON.stringify(key) : key;
      if (val === null || typeof val !== 'object') {
        return `${pad}${safeKey}: ${jsonToYAML(val, indent + 1)}`;
      }
      if (Array.isArray(val) && val.length === 0) {
        return `${pad}${safeKey}: []`;
      }
      if (!Array.isArray(val) && Object.keys(val).length === 0) {
        return `${pad}${safeKey}: {}`;
      }
      return `${pad}${safeKey}:\n${jsonToYAML(val, indent + 1)}`;
    }).join('\n');
  }

  return String(obj);
}

// Quote anything YAML could read as non-string or that isn't a safe plain scalar.
// Over-quoting is always valid; under-quoting changes meaning ("" -> null,
// "Yes" -> true, "- dash" -> sequence).
const YAML_SPECIAL_WORDS = /^(?:true|false|yes|no|on|off|y|n|null|~)$/i;
function needsQuotes(str) {
  return str === '' ||
    str.trim() !== str ||
    YAML_SPECIAL_WORDS.test(str) ||
    /^[-?:,\[\]{}#&*!|>'"%@`+.\d]/.test(str) ||        // indicator / number-like start
    /[:#{}\[\],&*?|<>=!%@`'"\\]/.test(str) ||          // structural or escape-worthy chars
    /[\u0000-\u001f\u007f\u0085\u2028\u2029]/.test(str); // control chars / line breaks
}

// ─── JSON → CSV ─────────────────────────────────────────────────────────────
export function jsonToCSV(data, delimiter = ',') {
  const arr = Array.isArray(data) ? data : [data];
  if (!arr.length) throw new Error('Input must be a non-empty array of objects.');

  // Collect all keys (headers) from all rows
  const headers = [...new Set(arr.flatMap(row =>
    typeof row === 'object' && row !== null ? Object.keys(row) : []
  ))];

  if (!headers.length) throw new Error('Objects have no keys to convert.');

  const escape = (val) => {
    if (val === null || val === undefined) return '';
    let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    // CSV/formula-injection guard: a text cell starting with = + - @ (or tab/CR)
    // is executed as a formula by Excel/Sheets. Prefix with ' so it stays text.
    if (typeof val === 'string' && /^[=+\-@\t\r]/.test(str)) str = "'" + str;
    if (str.includes(delimiter) || /["\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(h => escape(h)).join(delimiter),
    ...arr.map(row =>
      headers.map(h => escape(row[h])).join(delimiter)
    )
  ];

  return lines.join('\n');
}

// ─── JSON → XML ─────────────────────────────────────────────────────────────
export function jsonToXML(obj, rootName = 'root', options = {}, indent = 0) {
  const { xmlDecl = true } = options;
  const xml = toXMLNode(obj, rootName, indent);
  return xmlDecl ? `<?xml version="1.0" encoding="UTF-8"?>\n${xml}` : xml;
}

function toXMLNode(val, tag, indent) {
  const pad = '  '.repeat(indent);
  const safeTag = sanitizeTag(tag);

  if (val === null || val === undefined) {
    return `${pad}<${safeTag} />`; 
  }

  if (typeof val !== 'object') {
    const escaped = escapeXML(String(val));
    return `${pad}<${safeTag}>${escaped}</${safeTag}>`;
  }

  if (Array.isArray(val)) {
    return val.map(item => toXMLNode(item, safeTag, indent)).filter(Boolean).join('\n');
  }

  const children = Object.entries(val)
    .map(([k, v]) => toXMLNode(v, k, indent + 1))
    .filter(Boolean)
    .join('\n');
  if (!children) return `${pad}<${safeTag} />`;
  return `${pad}<${safeTag}>\n${children}\n${pad}</${safeTag}>`;
}

function sanitizeTag(tag) {
  // XML tag names can't start with numbers or contain spaces
  tag = String(tag).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  if (/^[^a-zA-Z_]/.test(tag)) tag = '_' + tag;
  return tag || 'item';
}

function escapeXML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── JSON → TypeScript ──────────────────────────────────────────────────────
export function jsonToTypeScript(obj, rootName = 'Root', options = {}) {
  const { useInterface = true, optionalFields = false } = options;
  const interfaces = new Map();
  const rootType = inferMany([obj], typeName(rootName), interfaces);

  const lines = [];
  const keyword = useInterface ? 'interface' : 'type';
  const sep = useInterface ? '' : ' =';
  // Emit in reverse insertion order so the root interface comes first
  const entries = [...interfaces.entries()].reverse();
  for (const [name, fields] of entries) {
    lines.push(`${keyword} ${name}${sep} {`);
    for (const [fieldName, f] of Object.entries(fields)) {
      const opt = optionalFields || f.optional ? '?' : '';
      lines.push(`  ${tsKey(fieldName)}${opt}: ${f.type};`);
    }
    lines.push('}');
    lines.push('');
  }
  // Root that isn't an object (e.g. a primitive or array of primitives)
  if (!interfaces.has(rootType)) lines.unshift(`type ${typeName(rootName)} = ${rootType};`, '');
  return lines.join('\n').trimEnd();
}

const TS_IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
// Keys like "user-name" or "2fa" must be quoted to be valid TypeScript.
function tsKey(k) { return TS_IDENT.test(k) ? k : JSON.stringify(k); }

// Turn any key into a PascalCase identifier usable as an interface name.
function typeName(str) {
  let n = String(str)
    .replace(/['’]/g, '')
    .split(/[^A-Za-z0-9_$]+/)
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
  if (!n) n = 'Item';
  if (/^\d/.test(n)) n = '_' + n;
  return n;
}

const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function primitiveType(v) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'string') return 'string';
  return 'unknown';
}

// Infer one type covering ALL sample values (array items are no longer typed from item [0] only).
function inferMany(values, name, interfaces) {
  const types = new Set();
  const objs = values.filter(isPlainObject);
  const arrs = values.filter(Array.isArray);
  if (objs.length) types.add(inferObject(objs, name, interfaces));
  if (arrs.length) {
    const items = arrs.flat();
    if (!items.length) types.add('unknown[]');
    else {
      const t = inferMany(items, name + 'Item', interfaces);
      types.add(t.includes(' | ') ? `(${t})[]` : `${t}[]`);
    }
  }
  for (const v of values) if (!isPlainObject(v) && !Array.isArray(v)) types.add(primitiveType(v));
  return [...types].join(' | ');
}

// Merge several sample objects into one interface; keys missing from some samples become optional.
function inferObject(objs, name, interfaces) {
  const base = typeName(name);
  const byKey = new Map();
  for (const o of objs) {
    for (const [k, v] of Object.entries(o)) {
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(v);
    }
  }
  const fields = {};
  for (const [k, vals] of byKey) {
    fields[k] = { type: inferMany(vals, base + typeName(k), interfaces), optional: vals.length < objs.length };
  }
  // Avoid silently overwriting a different interface that got the same name
  const sig = JSON.stringify(fields);
  let iname = base, i = 2;
  while (interfaces.has(iname) && JSON.stringify(interfaces.get(iname)) !== sig) iname = base + i++;
  interfaces.set(iname, fields);
  return iname;
}
