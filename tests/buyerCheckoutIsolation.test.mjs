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

test('product cards offer Add, Buy Now and quantity controls as separate actions', () => {
  const source = read('../src/components/Buyer/ProductCard.tsx');
  assert.match(source, /quantity <= 0 \?/);
  assert.match(source, /> ADD\s*</);
  const details = read('../src/components/Buyer/ProductDetailsModal.tsx');
  assert.match(details, /Buy now/);
  assert.match(details, /onBuyNow/);
  assert.match(details, /onClick=\{\(\) => onBuyNow\(product\)\}/);
});

test('buyer has a persistent cart shortcut that opens the cart drawer without scrolling', () => {
  const source = read('../src/components/Buyer/BuyerHome.tsx');
  assert.match(source, /Shopping cart shortcut/);
  assert.match(source, /onClick=\{\(\) => setIsCartOpen\(true\)\}/);
  assert.match(source, /cartCalculations\.finalTotal/);
  assert.match(source, /fixed inset-x-0/);
});

test('checkout does not promise a fixed delivery ETA', () => {
  const checkout = read('../src/components/Buyer/CheckoutModal.tsx');
  const orders = read('../src/context/useOrderDeliveryOperations.ts');
  const service = read('../backend-java-spring/src/main/java/com/kuraliupdates/bazaar/service/OrderService.java');
  assert.doesNotMatch(checkout, /25 Mins ETA/);
  assert.doesNotMatch(orders, /30-45 mins \(Local Express\)/);
  assert.doesNotMatch(service, /estimatedDeliveryMins\(25\)/);
});

test('buyer ETA is admin-configurable, snapshotted by backend, and disabled when zero', () => {
  const admin = read('../src/features/admin/AdminPortal.tsx');
  const hook = read('../src/features/admin/useAdminConfiguration.ts');
  const controller = read('../backend-java-spring/src/main/java/com/kuraliupdates/bazaar/controller/AdminController.java');
  const service = read('../backend-java-spring/src/main/java/com/kuraliupdates/bazaar/service/DeliveryConfigurationService.java');
  const orders = read('../backend-java-spring/src/main/java/com/kuraliupdates/bazaar/service/OrderService.java');
  const migration = read('../backend-java-spring/src/main/java/db/migration/V48__Configurable_buyer_delivery_eta.java');
  assert.match(admin, /Buyer delivery ETA \(minutes; 0 disables\)/);
  assert.match(hook, /estimatedDeliveryMins: Number\(config\.estimatedDeliveryMins \?\? 0\)/);
  assert.match(controller, /ESTIMATED_DELIVERY_MINS AS "estimatedDeliveryMins"/);
  assert.match(controller, /estimatedDeliveryMins == 0 \? null : estimatedDeliveryMins/);
  assert.match(service, /SELECT ESTIMATED_DELIVERY_MINS FROM DELIVERY_CONFIGURATION/);
  assert.match(orders, /estimatedDeliveryMins\(deliveryConfigurationService\.estimatedDeliveryMins\(\)\)/);
  assert.match(migration, /ADD ESTIMATED_DELIVERY_MINS NUMBER\(3\)/);
});
