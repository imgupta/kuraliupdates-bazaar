import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/utils/buyerSearch.ts', import.meta.url), 'utf8');
const catalogue = readFileSync(new URL('../src/components/Buyer/OnlineShopHome.tsx', import.meta.url), 'utf8');

test('buyer catalogue search expands common Hindi and Punjabi grocery terms', () => {
  for (const term of ['doodh', 'दूध', 'ਦੁੱਧ', 'chawal', 'ਚਾਵਲ', 'atta', 'ਆਟਾ', 'pyaaz', 'ਪਿਆਜ਼', 'aloo', 'ਆਲੂ', 'tamatar', 'ਟਮਾਟਰ', 'chai', 'ਚਾਹ', 'dahi', 'ਦਹੀਂ']) {
    assert.ok(source.includes(term), `missing search synonym: ${term}`);
  }
  assert.match(source, /normalize\(values\.filter\(Boolean\)\.join\(' '\)\)/);
  assert.match(catalogue, /matchesBuyerSearch\(searchQuery, searchableValues\)/);
});

test('buyer search normalizes Unicode and whitespace before matching', () => {
  assert.match(source, /normalize\('NFKC'\)/);
  assert.match(source, /replace\(\/\\s\+\/g, ' '\)/);
  assert.match(source, /terms\.some\(term => haystack\.includes\(term\)\)/);
});
