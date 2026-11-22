import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Buy Now uses an isolated item set and does not mutate or clear the saved basket', () => {
  const portal = read('../src/features/buyer/BuyerPortal.tsx');
  const checkout = read('../src/components/Buyer/CheckoutModal.tsx');
  const operations = read('../src/context/useOrderDeliveryOperations.ts');

  assert.match(portal, /setBuyNowItems\(\[\{ product, quantity: 1 \}\]\)/);
  assert.match(portal, /<CheckoutModal items=\{buyNowItems \?\? undefined\}/);
  assert.match(checkout, /const checkoutItems = items \?\? cart/);
  assert.match(checkout, /items: checkoutItems/);
  assert.match(operations, /const checkoutItems = orderData\.items \?\? cart/);
  assert.match(operations, /if \(!isIsolatedCheckout\) clearCart\(\)/);
});

test('buyer catalogue has no implicit maximum-price filter', () => {
  const source = read('../src/components/Buyer/OnlineShopHome.tsx');
  assert.match(source, /useState<number \| null>\(null\)/);
  assert.match(source, /maxPrice !== null && effectivePrice > maxPrice/);
});

test('product cards use Add then quantity controls rather than Buy Now', () => {
  const source = read('../src/components/Buyer/ProductCard.tsx');
  assert.match(source, /quantity <= 0 \?/);
  assert.match(source, /> ADD</);
  assert.doesNotMatch(source, /Buy Now/);
  assert.doesNotMatch(source, /onBuyNow/);
});

test('checkout does not promise a fixed delivery ETA', () => {
  const checkout = read('../src/components/Buyer/CheckoutModal.tsx');
  const orders = read('../src/context/useOrderDeliveryOperations.ts');
  const service = read('../backend-java-spring/src/main/java/com/kuraliupdates/bazaar/service/OrderService.java');
  assert.doesNotMatch(checkout, /25 Mins ETA/);
  assert.doesNotMatch(orders, /30-45 mins \(Local Express\)/);
  assert.doesNotMatch(service, /estimatedDeliveryMins\(25\)/);
});
