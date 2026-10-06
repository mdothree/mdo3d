// Page controller: to-yaml.html
import { jsonToYAML } from '../services/jsonConverter.js';
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
        lastResult = jsonToYAML(parsed);
        document.getElementById('output').textContent = lastResult;
        document.getElementById('dlBtn').style.display = 'inline-flex';
        const lossy = lossyNumberWarning(raw);
        if (lossy) showAlert(alertArea, 'warning', lossy);
        await saveToHistory('json-to-yaml', {});
      } catch (e) {
        showAlert(alertArea, 'error', `❌ ${e.message}`);
      }
    });

    document.getElementById('inputJson').addEventListener('paste', () => setTimeout(() => document.getElementById('convertBtn').click(), 10));

    document.getElementById('copyBtn').addEventListener('click', async () => {
      if (!lastResult) return;
      const ok = await copyText(lastResult);
      _flashBtn(document.getElementById('copyBtn'), ok ? '✅ Copied!' : '⚠️ Copy failed', 'Copy');
    });

    document.getElementById('dlBtn').addEventListener('click', () => {
      const blob = new Blob([lastResult], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'output.yaml'; a.click();
      URL.revokeObjectURL(url);
    });
