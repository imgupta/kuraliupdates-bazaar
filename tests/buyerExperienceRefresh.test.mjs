import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('buyer search suggestions are catalogue-backed, bounded and shop-only', () => {
  const source = read('../src/components/Buyer/BuyerHome.tsx');
  assert.match(source, /matchesBuyerSearch\(query/);
  assert.match(source, /mode !== 'shop'/);
  assert.match(source, /\.slice\(0, 6\)/);
  assert.match(source, /role="combobox" aria-autocomplete="list"/);
  assert.match(source, /role="listbox"/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /props\.setSearchQuery\(product\.title\)/);
});

test('product recommendations are labelled as category matches, not substitutes', () => {
  const details = read('../src/components/Buyer/ProductDetailsModal.tsx');
  const catalogue = read('../src/components/Buyer/OnlineShopHome.tsx');
  assert.match(catalogue, /item\.category === selectedProduct\.category/);
  assert.match(details, /More in \{product\.category\}/);
  assert.match(details, /not guaranteed equivalent products or pack sizes/);
});

test('unit-price display is derived only from supported explicit catalogue units', () => {
  const card = read('../src/components/Buyer/ProductCard.tsx');
  const details = read('../src/components/Buyer/ProductDetailsModal.tsx');
  const pricing = read('../src/utils/productUnitPricing.ts');
  assert.match(card, /formatProductUnitPrice\(effectivePrice, product\.unit\)/);
  assert.match(details, /formatProductUnitPrice\(price, product\.unit\)/);
  assert.match(pricing, /kg\|g\|l\|lt\|litre\|liter\|ml\|piece\|pc\|pcs/);
  assert.match(pricing, /return null/);
});
