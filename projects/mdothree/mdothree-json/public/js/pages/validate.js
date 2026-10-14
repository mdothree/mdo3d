// Page controller: validate.html
import { validateJSON, summarizeJSON } from '../services/jsonValidator.js';
import { lossyNumberWarning } from '../services/jsonFormatter.js';

    const inputJson = document.getElementById('inputJson');

    // Live validation indicator
    inputJson.addEventListener('input', () => {
      const text = inputJson.value;
      if (!text.trim()) return;
      try { JSON.parse(text); inputJson.style.borderColor = 'var(--emerald)'; }
      catch { inputJson.style.borderColor = 'var(--danger)'; }
    });

    // HID-003: results are announced through a polite live region (the result panels only toggle visibility).
    function announce(msg) {
      const el = document.getElementById('a11yStatus');
      if (!el) return;
      el.textContent = '';
      setTimeout(() => { el.textContent = msg; }, 50);
    }

    document.getElementById('validateBtn').addEventListener('click', () => {
      // Validate the untrimmed text so reported line numbers match the textarea.
      const text = inputJson.value;
      document.getElementById('validResult').classList.add('hidden');
      document.getElementById('invalidResult').classList.add('hidden');
      document.getElementById('emptyState').style.display = 'none';

      if (!text.trim()) {
        document.getElementById('emptyState').style.display = 'flex';
        announce('Paste some JSON first, then click Validate.');
        return;
      }

      const result = validateJSON(text);
      if (result.valid) {
        const summary = summarizeJSON(result.parsed);
        // Keys come from the user's JSON: build nodes with textContent.
        const rows = summary.map(s => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;';
          const k = document.createElement('span'); k.style.color = 'var(--slate-400)'; k.textContent = s.key;
          const v = document.createElement('span'); v.style.color = 'var(--emerald)'; v.textContent = s.value;
          row.append(k, v);
          return row;
        });
        document.getElementById('structSummary').replaceChildren(...rows);
        const lossy = lossyNumberWarning(text);
        if (lossy) {
          const w = document.createElement('div');
          w.style.cssText = 'color:var(--warning);margin-top:8px;white-space:normal;';
          w.textContent = lossy.replace('in this output', 'by JavaScript parsers');
          document.getElementById('structSummary').appendChild(w);
        }
        document.getElementById('validResult').classList.remove('hidden');
        announce('Valid JSON — no syntax errors found.');
      } else {
        const where = result.line ? ` (line ${result.line}, column ${result.column})` : '';
        document.getElementById('errorMsg').textContent = result.error + where + (result.hint ? ' — ' + result.hint : '');
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
        announce('Invalid JSON — ' + document.getElementById('errorMsg').textContent);
      }
    });

// HID-017: the page starts with "Loading tool…" and disabled actions; release them now that the handlers are bound.
document.querySelectorAll('[data-mdo-wait]').forEach(el => { el.disabled = false; el.removeAttribute('aria-busy'); el.removeAttribute('data-mdo-wait'); });
document.getElementById('mdoLoadStatus')?.remove();
