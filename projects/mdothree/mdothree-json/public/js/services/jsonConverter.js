// jsonConverter.js — JSON to YAML, CSV, XML, TypeScript

// ─── JSON → YAML ────────────────────────────────────────────────────────────
export function jsonToYAML(obj, indent = 0) {
  const pad = '  '.repeat(indent);

  if (obj === null)      return 'null';
  if (obj === undefined) return '~';
  if (typeof obj === 'boolean') return String(obj);
  if (typeof obj === 'number')  return String(obj);
  if (typeof obj === 'string') {
    if (needsQuotes(obj)) return `"${obj.replace(/"/g, '\\"')}"`;
    return obj;
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
      const safeKey = /[:#\[\]{}&*?|<>=!%@`]/.test(key) ? `"${key}"` : key;
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

function needsQuotes(str) {
  return /[:#{}\[\],&*?|<>=!%@`\n\r]/.test(str) ||
    /^(true|false|null|yes|no|on|off|\d)/.test(str) ||
    str.trim() !== str;
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
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
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
    return val.map(item => toXMLNode(item, safeTag, indent)).join('\n');
  }

  const children = Object.entries(val)
    .map(([k, v]) => toXMLNode(v, k, indent + 1))
    .join('\n');
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
  inferType(obj, rootName, interfaces);

  const lines = [];
  // Emit in reverse order so root comes last (more natural reading)
  const entries = [...interfaces.entries()].reverse();
  for (const [name, fields] of entries) {
    const keyword = useInterface ? 'interface' : 'type';
    const sep = useInterface ? '' : ' =';
    lines.push(`${keyword} ${name}${sep} {`);
    for (const [fieldName, fieldType] of Object.entries(fields)) {
      const opt = optionalFields ? '?' : '';
      lines.push(`  ${fieldName}${opt}: ${fieldType};`);
    }
    lines.push('}');
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

let _counter = 0;
function inferType(val, name, interfaces) {
  if (val === null)              return 'null';
  if (val === undefined)         return 'undefined';
  if (typeof val === 'boolean')  return 'boolean';
  if (typeof val === 'number')   return 'number';
  if (typeof val === 'string')   return 'string';

  if (Array.isArray(val)) {
    if (val.length === 0) return 'unknown[]';
    const itemType = inferType(val[0], name + 'Item', interfaces);
    return `${itemType}[]`;
  }

  if (typeof val === 'object') {
    const interfaceName = capitalize(name);
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      const childName = interfaceName + capitalize(k);
      fields[k] = inferType(v, childName, interfaces);
    }
    interfaces.set(interfaceName, fields);
    return interfaceName;
  }

  return 'unknown';
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
