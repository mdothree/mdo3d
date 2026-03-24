// Page controller: validate.html
import { validateJSON, summarizeJSON } from '../services/jsonValidator.js';

    const inputJson = document.getElementById('inputJson');

    // Live validation indicator
    inputJson.addEventListener('input', () => {
      const text = inputJson.value.trim();
      if (!text) return;
      try { JSON.parse(text); inputJson.style.borderColor = 'var(--emerald)'; }
      catch { inputJson.style.borderColor = 'var(--danger)'; }
    });

    document.getElementById('validateBtn').addEventListener('click', () => {
      const text = inputJson.value.trim();
      document.getElementById('validResult').classList.add('hidden');
      document.getElementById('invalidResult').classList.add('hidden');
      document.getElementById('emptyState').style.display = 'none';

      if (!text) {
        document.getElementById('emptyState').style.display = 'flex';
        return;
      }

      const result = validateJSON(text);
      if (result.valid) {
        const summary = summarizeJSON(result.parsed);
        document.getElementById('structSummary').innerHTML = summary.map(s =>
          `<div style="display:flex;justify-content:space-between;"><span style="color:var(--slate-400);">${s.key}</span><span style="color:var(--emerald);">${s.value}</span></div>`
        ).join('');
        document.getElementById('validResult').classList.remove('hidden');
      } else {
        document.getElementById('errorMsg').textContent = result.error;
        // Show error context with line highlighting
        const lines = text.split('\n');
        const errorLine = result.line ? result.line - 1 : null;
        const start = Math.max(0, (errorLine || 0) - 3);
        const end = Math.min(lines.length, (errorLine || 0) + 4);
        let html = '';
        for (let i = start; i < end; i++) {
          const isError = i === errorLine;
          const escaped = lines[i].replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
          html += `<span class="code-line${isError ? ' error-line' : ''}"><span class="line-num">${i + 1}</span>${escaped}${isError ? ' ← error' : ''}</span>`;
        }
        document.getElementById('errorContext').innerHTML = html;
        document.getElementById('invalidResult').classList.remove('hidden');
      }
    });
