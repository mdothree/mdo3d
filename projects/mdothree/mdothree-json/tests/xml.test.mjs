// CQA-JSON-XML-ARRAY-ROOT: a top-level JSON array must export one well-formed XML document (a single root element).
import test from 'node:test';
import assert from 'node:assert/strict';
import { jsonToXML } from '../public/js/services/jsonConverter.js';

// Counts top-level elements in the XML body (after the declaration) with a tiny tag scanner.
function topLevelElements(xml) {
  const body = xml.replace(/^<\?xml[^>]*\?>\s*/, '');
  let depth = 0, tops = 0;
  for (const m of body.matchAll(/<(\/?)([A-Za-z_][^\s/>]*)[^>]*?(\/?)>/g)) {
    if (m[1]) { depth--; continue; }
    if (depth === 0) tops++;
    if (!m[3]) depth++;
  }
  return tops;
}

test('top-level array of objects exports a single root element', () => {
  const xml = jsonToXML([{ a: 1 }, { a: 2 }], 'root');
  assert.equal(topLevelElements(xml), 1, xml);
  assert.match(xml, /<root>[\s\S]*<a>1<\/a>[\s\S]*<a>2<\/a>[\s\S]*<\/root>/);
});

test('top-level array of primitives exports a single root element', () => {
  assert.equal(topLevelElements(jsonToXML([1, 2, 3], 'data')), 1);
});

test('empty top-level array exports a single root element', () => {
  assert.equal(topLevelElements(jsonToXML([], 'root')), 1);
});

test('top-level object output is unchanged', () => {
  assert.equal(jsonToXML({ a: [1, 2] }, 'root', { xmlDecl: false }), '<root>\n  <a>1</a>\n  <a>2</a>\n</root>');
});
