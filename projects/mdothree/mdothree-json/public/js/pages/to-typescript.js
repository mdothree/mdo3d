// Page controller: to-typescript.html
import { jsonToTypeScript } from '../services/jsonConverter.js';
import { showAlert, copyText, copyWithFeedback } from '../utils/dom.js';
import { lossyNumberWarning } from '../services/jsonFormatter.js';
const _copyTimers = new Map();
function _flashBtn(btn, msg, restore, ms = 2000) {
  clearTimeout(_copyTimers.get(btn));
  const orig = btn.textContent;
  btn.textContent = msg;
  _copyTimers.set(btn, setTimeout(() => { btn.textContent = restore || orig; _copyTimers.delete(btn); }, ms));
}
import { saveToHistory } from '../config/firebase.js';
    let lastResult = '';

    document.getElementById('convertBtn').addEventListener('click', async () => {
      const alertArea = document.getElementById('alertArea');
      alertArea.innerHTML = '';
      try {
        const raw = document.getElementById('inputJson').value;
        const parsed = JSON.parse(raw);
        const rootName = document.getElementById('rootName').value.trim() || 'Root';
        const useInterface = document.getElementById('useInterface').checked;
        const optionalFields = document.getElementById('optionalFields').checked;
        lastResult = jsonToTypeScript(parsed, rootName, { useInterface, optionalFields });
        document.getElementById('output').textContent = lastResult;
        document.getElementById('dlBtn').style.display = 'inline-flex';
        const lossy = lossyNumberWarning(raw);
        if (lossy) showAlert(alertArea, 'warning', lossy);
        await saveToHistory('json-to-typescript', { useInterface, optionalFields });
      } catch (e) {
        showAlert(alertArea, 'error', `❌ ${e.message}`);
      }
    });

    document.getElementById('inputJson').addEventListener('paste', () => setTimeout(() => document.getElementById('convertBtn').click(), 10));

    document.getElementById('copyBtn').addEventListener('click', async () => {
      const ok = await copyText(lastResult);
      _flashBtn(document.getElementById('copyBtn'), ok ? '✅ Copied!' : '⚠️ Copy failed', 'Copy');
    });

    document.getElementById('dlBtn').addEventListener('click', () => {
      const blob = new Blob([lastResult], { type: 'text/typescript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'types.ts'; a.click();
      URL.revokeObjectURL(url);
    });
