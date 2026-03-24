// Page controller: json-diff.html
import { diffJSON } from '../services/jsonDiff.js';
import { initPaywall, isPremium, requirePremium, FREE_LIMITS } from '../stripe-paywall.js';
initPaywall();

    document.getElementById('diffBtn').addEventListener('click', () => {
      const alertArea = document.getElementById('alertArea');
      alertArea.innerHTML = '';
      const rawA = document.getElementById('jsonA').value;
      const rawB = document.getElementById('jsonB').value;
      const sizeKB = (new Blob([rawA]).size + new Blob([rawB]).size) / 1024;
      if (sizeKB > FREE_LIMITS.jsonFileSizeKB * 2 && !isPremium()) {
        alertArea.innerHTML = '';
        requirePremium('Diffing JSON over 50KB per side requires Pro', 'json-diff-size');
        return;
      }
      try {
        const a = JSON.parse(rawA);
        const b = JSON.parse(rawB);
        const ignoreOrder = document.getElementById('ignoreOrder').checked;
        const { html, added, removed, changed } = diffJSON(a, b, { ignoreOrder });
        document.getElementById('diffOutput').innerHTML = html;
        document.getElementById('addedCount').textContent = added;
        document.getElementById('removedCount').textContent = removed;
        document.getElementById('changedCount').textContent = changed;
        document.getElementById('resultPanel').style.display = 'block';
      } catch (e) {
        alertArea.innerHTML = `<div class="alert alert-error">❌ ${e.message}</div>`;
      }
    });
