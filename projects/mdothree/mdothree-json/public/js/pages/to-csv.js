// Page controller: to-csv.html
import { jsonToCSV } from '../services/jsonConverter.js';
import { showAlert, copyText, copyWithFeedback } from '../utils/dom.js';
import { lossyNumberWarning } from '../services/jsonFormatter.js';
import { saveToHistory } from '../config/firebase.js';
    let lastResult = '';

    document.getElementById('convertBtn').addEventListener('click', async () => {
      const alertArea = document.getElementById('alertArea');
      alertArea.innerHTML = '';
      try {
        const raw = document.getElementById('inputJson').value;
        const parsed = JSON.parse(raw);
        const delimiter = document.getElementById('delimiter').value;
        lastResult = jsonToCSV(parsed, delimiter);
        document.getElementById('output').textContent = lastResult;
        document.getElementById('dlBtn').style.display = 'inline-flex';
        const lossy = lossyNumberWarning(raw);
        if (lossy) showAlert(alertArea, 'warning', lossy);
        await saveToHistory('json-to-csv', { delimiter });
      } catch (e) {
        showAlert(alertArea, 'error', `❌ ${e.message}`);
      }
    });

    document.getElementById('copyBtn').addEventListener('click', async () => {
      if (!lastResult) return;
      await copyWithFeedback(document.getElementById('copyBtn'), lastResult, 'Copy');
    });

    document.getElementById('dlBtn').addEventListener('click', () => {
      const blob = new Blob([lastResult], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'output.csv'; a.click();
      URL.revokeObjectURL(url);
    });
