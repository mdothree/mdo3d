// jsonFormatter.js

export function formatJSON(jsonStr, indent = 2) {
  const parsed = JSON.parse(jsonStr); // throws on invalid
  return JSON.stringify(parsed, null, indent);
}

export function minifyJSON(jsonStr) {
  const parsed = JSON.parse(jsonStr);
  return JSON.stringify(parsed);
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
