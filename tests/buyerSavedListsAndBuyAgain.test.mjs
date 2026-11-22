import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('buyer favourites and named saved lists persist locally and expose product actions', () => {
  const catalogue = read('../src/components/Buyer/OnlineShopHome.tsx');
  const panel = read('../src/components/Buyer/BuyerSavedListsPanel.tsx');
  const card = read('../src/components/Buyer/ProductCard.tsx');
  assert.match(catalogue, /kurali_buyer_saved_items_v1/);
  assert.match(catalogue, /localStorage\.setItem\(SAVED_ITEMS_KEY/);
  assert.match(catalogue, /onCreateList=\{createSavedList\}/);
  assert.match(card, /aria-pressed=\{isFavorite\}/);
  assert.match(panel, /Create list/);
  assert.match(panel, /Add to list/);
  assert.match(panel, /Saved on this device/);
});

test('Buy Again uses current catalogue prices and skips unavailable products', () => {
  const tracking = read('../src/components/Buyer/OrderTrackingModal.tsx');
  assert.match(tracking, /const buyAgain = \(\) =>/);
  assert.match(tracking, /products\.find\(product => product\.id === productId\)/);
  assert.match(tracking, /currentProduct\.stock <= 0/);
  assert.match(tracking, /addToCart\(currentProduct, Math\.min\(quantity, currentProduct\.stock\)\)/);
  assert.match(tracking, /isDelivered && <button[^>]*>Buy again/);
});
