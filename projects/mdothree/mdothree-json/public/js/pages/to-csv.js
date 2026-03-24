// Page controller: to-csv.html
import { jsonToCSV } from '../services/jsonConverter.js';
import { saveToHistory } from '../config/firebase.js';
    let lastResult = '';

    document.getElementById('convertBtn').addEventListener('click', () => {
      const alertArea = document.getElementById('alertArea');
      alertArea.innerHTML = '';
      try {
        const parsed = JSON.parse(document.getElementById('inputJson').value);
        const delimiter = document.getElementById('delimiter').value;
        lastResult = jsonToCSV(parsed, delimiter);
        document.getElementById('output').textContent = lastResult;
        document.getElementById('dlBtn').style.display = 'inline-flex';
        await saveToHistory('json-to-csv', { delimiter });
      } catch (e) {
        alertArea.innerHTML = `<div class="alert alert-error">❌ ${e.message}</div>`;
      }
    });

    document.getElementById('copyBtn').addEventListener('click', async () => {
      await navigator.clipboard.writeText(lastResult);
      document.getElementById('copyBtn').textContent = '✅ Copied!';
      setTimeout(() => { document.getElementById('copyBtn').textContent = 'Copy'; }, 2000);
    });

    document.getElementById('dlBtn').addEventListener('click', () => {
      const blob = new Blob([lastResult], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'output.csv'; a.click();
      URL.revokeObjectURL(url);
    });
