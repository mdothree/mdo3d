// Page controller: format.html
import { formatJSON, minifyJSON, syntaxHighlight } from '../services/jsonFormatter.js';
const _copyTimers = new Map();
function _flashBtn(btn, msg, restore, ms = 2000) {
  clearTimeout(_copyTimers.get(btn));
  const orig = btn.textContent;
  btn.textContent = msg;
  _copyTimers.set(btn, setTimeout(() => { btn.textContent = restore || orig; _copyTimers.delete(btn); }, ms));
}
    import { initPaywall, isPremium, requirePremium, FREE_LIMITS } from '../stripe-paywall.js';
    import { saveToHistory } from '../config/firebase.js';
    initPaywall();

    const inputJson = document.getElementById('inputJson');
    const jsonOutput = document.getElementById('jsonOutput');
    const alertArea = document.getElementById('alertArea');
    const sizeInfo = document.getElementById('sizeInfo');
    let lastFormatted = '';

    const SAMPLE = JSON.stringify({
      name: "mdothree",
      version: "1.0.0",
      tools: ["format", "validate", "convert"],
      meta: { author: "m.three", free: true, count: 42 },
      tags: null
    });

    function runFormat(minify = false) {
      const text = inputJson.value.trim();
      if (!text) return;
      const sizeKB = new Blob([text]).size / 1024;
      if (sizeKB > FREE_LIMITS.jsonFileSizeKB && !isPremium()) {
        requirePremium('Formatting JSON files over 50KB requires Pro', 'json-format-size');
        return;
      }
      alertArea.innerHTML = '';
      try {
        const indent = document.getElementById('indent').value === 'tab' ? '\t' : parseInt(document.getElementById('indent').value);
        lastFormatted = minify ? minifyJSON(text) : formatJSON(text, indent);
        jsonOutput.innerHTML = syntaxHighlight(lastFormatted);
        const bytes = new Blob([lastFormatted]).size;
        sizeInfo.textContent = `${bytes.toLocaleString()} bytes`;
        await saveToHistory('json-format', { action: minify ? 'minify' : 'format', sizeBytes: bytes });
        document.getElementById('downloadBtn').style.display = 'inline-flex';
      } catch (e) {
        alertArea.innerHTML = `<div class="alert alert-error">❌ ${e.message}</div>`;
        jsonOutput.innerHTML = '';
      }
    }

    document.getElementById('formatBtn').addEventListener('click', () => runFormat(false));
    document.getElementById('minifyBtn').addEventListener('click', () => runFormat(true));
    document.getElementById('sampleBtn').addEventListener('click', () => { inputJson.value = SAMPLE; runFormat(false); });
    document.getElementById('clearBtn').addEventListener('click', () => { inputJson.value = ''; jsonOutput.innerHTML = ''; alertArea.innerHTML = ''; sizeInfo.textContent = ''; lastFormatted = ''; });

    // Auto-format on paste
    inputJson.addEventListener('paste', () => setTimeout(() => runFormat(false), 10));

    document.getElementById('copyBtn').addEventListener('click', async () => {
      if (!lastFormatted) return;
      await navigator.clipboard.writeText(lastFormatted);
      _flashBtn(document.getElementById('copyBtn'), '✅ Copied!', 'Copy');
    });

    document.getElementById('downloadBtn').addEventListener('click', () => {
      if (!lastFormatted) return;
      const blob = new Blob([lastFormatted], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'formatted.json'; a.click();
      URL.revokeObjectURL(url);
    });
