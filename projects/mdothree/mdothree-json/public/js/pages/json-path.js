// Page controller: json-path.html
import { queryJSONPath, formatResults } from '../services/jsonPath.js';
import { initPaywall, isPremium, requirePremium } from '../stripe-paywall.js';
import { saveToHistory } from '../config/firebase.js';

const jsonInput    = document.getElementById('jsonInput');
const pathInput    = document.getElementById('pathInput');
const queryBtn     = document.getElementById('queryBtn');
const resultOutput = document.getElementById('resultOutput');
const resultCount  = document.getElementById('resultCount');
const pathError    = document.getElementById('pathError');
const copyBtn      = document.getElementById('copyBtn');
const historyEl    = document.getElementById('history');
const historyEmpty = document.getElementById('historyEmpty');

const EXAMPLES = [
  { path: '$',                     desc: 'Root element' },
  { path: '$.store.books[*].title',desc: 'All book titles' },
  { path: '$.store.books[0]',      desc: 'First book' },
  { path: '$.store.books[-1]',     desc: 'Last book' },
  { path: '$.store.books[0:2]',    desc: 'First two books (slice)' },
  { path: '$..title',              desc: 'All "title" fields (recursive)' },
  { path: '$.store.books[?(@.price < 10)]', desc: 'Books under $10 (filter)' },
  { path: '$.store.books[?(@.price > 10)].title', desc: 'Titles of expensive books' },
  { path: '$..price',              desc: 'All prices anywhere' },
  { path: '$.store.*',             desc: 'All store values' },
];

const SAMPLE_JSON = {
  store: {
    books: [
      { title: 'The Great Gatsby', author: 'Fitzgerald', price: 8.99, genre: 'fiction' },
      { title: 'Clean Code',       author: 'Martin',     price: 32.99, genre: 'technical' },
      { title: 'Dune',             author: 'Herbert',    price: 9.99, genre: 'fiction' },
      { title: 'SICP',             author: 'Abelson',    price: 49.99, genre: 'technical' },
    ],
    bicycle: { color: 'red', price: 19.95 },
  },
  location: 'online',
};

let queryHistory = [];
let lastResults  = null;

// ── Init ──────────────────────────────────────────────────────────────────────

initPaywall().then(premium => {
  if (premium) {
    document.getElementById('freeBanner').classList.add('hidden');
  }
});

document.getElementById('upgradeLink').addEventListener('click', e => {
  e.preventDefault();
  requirePremium('JSONPath queries require Pro', 'json-path');
});

// ── Build example chips ───────────────────────────────────────────────────────

const examplesEl = document.getElementById('examples');
EXAMPLES.forEach(({ path, desc }) => {
  const el = document.createElement('div');
  el.className = 'path-example';
  el.innerHTML = `<code>${path}</code><span>${desc}</span>`;
  el.addEventListener('click', () => {
    pathInput.value = path;
    runQuery();
  });
  examplesEl.appendChild(el);
});

// ── Load sample data ──────────────────────────────────────────────────────────

document.getElementById('sampleBtn').addEventListener('click', () => {
  jsonInput.value = JSON.stringify(SAMPLE_JSON, null, 2);
  pathInput.value = '$.store.books[*].title';
  runQuery();
});

// ── Query runner ──────────────────────────────────────────────────────────────

function runQuery() {
  // Paywall gate
  if (!isPremium()) {
    requirePremium('JSONPath queries require Pro', 'json-path');
    return;
  }

  pathError.textContent = '';
  const rawJson = jsonInput.value.trim();
  const path    = pathInput.value.trim();

  if (!rawJson) { pathError.textContent = 'Paste JSON data first.'; return; }
  if (!path)    { pathError.textContent = 'Enter a JSONPath expression.'; return; }

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    pathError.textContent = 'Invalid JSON: ' + e.message; return;
  }

  let results;
  try {
    results = queryJSONPath(parsed, path);
  } catch (e) {
    pathError.textContent = 'Expression error: ' + e.message; return;
  }

  lastResults = results;
  const formatted = formatResults(results);
  resultOutput.textContent = formatted;
  resultOutput.style.fontStyle = 'normal';
  resultOutput.style.color = results.length ? 'var(--slate-300)' : 'var(--slate-500)';

  const n = results.length;
  resultCount.textContent = `${n} match${n !== 1 ? 'es' : ''}`;
  copyBtn.style.display = n > 0 ? 'inline-flex' : 'none';

  // Add to history
  if (!queryHistory.includes(path)) {
    queryHistory.unshift(path);
    if (queryHistory.length > 10) queryHistory.pop();
    renderHistory();
  }

  // Firebase history
  saveToHistory('json-path', { path, matches: n });
}

queryBtn.addEventListener('click', runQuery);
pathInput.addEventListener('keydown', e => { if (e.key === 'Enter') runQuery(); });

// ── Copy results ──────────────────────────────────────────────────────────────

copyBtn.addEventListener('click', async () => {
  if (!lastResults) return;
  await navigator.clipboard.writeText(formatResults(lastResults));
  copyBtn.textContent = '✅ Copied!';
  setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
});

// ── History ───────────────────────────────────────────────────────────────────

function renderHistory() {
  historyEl.innerHTML = '';
  historyEmpty.style.display = queryHistory.length ? 'none' : 'block';
  queryHistory.forEach(p => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.innerHTML = `<span>${p}</span>`;
    el.addEventListener('click', () => {
      pathInput.value = p;
      runQuery();
    });
    historyEl.appendChild(el);
  });
}
