// jsonValidator.js

export function validateJSON(text) {
  try {
    const parsed = JSON.parse(text);
    return { valid: true, parsed };
  } catch (e) {
    // Try to extract line number from error message
    const lineMatch = e.message.match(/line (\d+)/i) ||
                      e.message.match(/position (\d+)/i);
    let line = null;
    if (lineMatch) {
      if (e.message.toLowerCase().includes('line')) {
        line = parseInt(lineMatch[1]);
      } else {
        // Calculate line from character position
        const pos = parseInt(lineMatch[1]);
        line = text.slice(0, pos).split('\n').length;
      }
    }
    return { valid: false, error: e.message, line };
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
