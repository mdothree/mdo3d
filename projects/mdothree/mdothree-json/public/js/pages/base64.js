// Page controller: base64.html
import { formatJSON } from '../services/jsonFormatter.js';
import { saveToHistory } from '../config/firebase.js';
import { showAlert, copyWithFeedback } from '../utils/dom.js';

    let currentMode = 'encode';
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        document.getElementById('modeEncode').classList.toggle('hidden', currentMode !== 'encode');
        document.getElementById('modeDecode').classList.toggle('hidden', currentMode !== 'decode');
        document.getElementById('alertArea').innerHTML = '';
      });
    });

    document.getElementById('encodeBtn').addEventListener('click', async () => {
      const alertArea = document.getElementById('alertArea');
      alertArea.innerHTML = '';
      try {
        const json = document.getElementById('jsonInput').value.trim();
        JSON.parse(json); // validate first
        let encoded = btoa(unescape(encodeURIComponent(json)));
        if (document.getElementById('urlSafe').checked) {
          encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        }
        document.getElementById('base64Output').textContent = encoded;
        document.getElementById('encodeOutput').style.display = 'block';
        await saveToHistory('json-base64', { action: 'encode' });
      } catch (e) {
        showAlert(alertArea, 'error', `❌ Invalid JSON: ${e.message}`);
      }
    });

    document.getElementById('decodeBtn').addEventListener('click', () => {
      const alertArea = document.getElementById('alertArea');
      alertArea.innerHTML = '';
      try {
        let b64 = document.getElementById('base64Input').value.trim();
        // Handle URL-safe base64
        b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        const decoded = decodeURIComponent(escape(atob(b64)));
        // Format the decoded source directly (lossless) instead of a parse/stringify round trip.
        const formatted = formatJSON(decoded, 2);
        document.getElementById('jsonOutput').textContent = formatted;
        document.getElementById('decodeOutput').style.display = 'block';
      } catch (e) {
        showAlert(alertArea, 'error', `❌ Decode failed: ${e.message}`);
      }
    });

    document.getElementById('copyEncoded').addEventListener('click', async () => {
      await copyWithFeedback(document.getElementById('copyEncoded'), document.getElementById('base64Output').textContent, 'Copy');
    });

    document.getElementById('copyDecoded').addEventListener('click', async () => {
      await copyWithFeedback(document.getElementById('copyDecoded'), document.getElementById('jsonOutput').textContent, 'Copy');
    });
