import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const portal = read('../src/features/seller/SellerPortal.tsx');
const returnsUi = read('../src/components/Seller/SellerReturnsWorkspace.tsx');
const returnsApi = read('../src/services/domains/sellerReturnsApi.ts');
const buyerReturnsUi = read('../src/components/Buyer/BuyerReturnPanel.tsx');
const deliveryReturnsUi = read('../src/components/Delivery/DeliveryReturnsWorkspace.tsx');
const tracking = read('../src/components/Buyer/OrderTrackingModal.tsx');
const deliveryPortal = read('../src/features/delivery/DeliveryPortal.tsx');
const service = read('../backend-java-spring/src/main/java/com/kuraliupdates/bazaar/service/SellerReturnService.java');
const controller = read('../backend-java-spring/src/main/java/com/kuraliupdates/bazaar/controller/SellerReturnController.java');
const migration = read('../backend-java-spring/src/main/resources/db/migration/V51__seller_item_returns_and_agent_pickup.sql');
const policyMigration = read('../backend-java-spring/src/main/resources/db/migration/V53__non_returnable_default_and_product_overrides.sql');
const admin = read('../backend-java-spring/src/main/java/com/kuraliupdates/bazaar/controller/AdminController.java');
const adminUi = read('../src/features/admin/AdminReturnPolicies.tsx');
const orderEntity = read('../backend-java-spring/src/main/java/com/kuraliupdates/bazaar/entity/OrderEntity.java');

test('seller portal starts on an actionable operations overview', () => {
  assert.match(portal, /useState<.*overview.*>('overview')/);
  assert.match(portal, /Needs acceptance/);
  assert.match(portal, /Ready for pickup/);
  assert.match(portal, /Low stock/);
  assert.match(portal, /Out of stock/);
});

test('seller orders support search and status filtering', () => {
  assert.match(portal, /Search order ID, buyer or address/);
  assert.match(portal, /orderStatusFilter/);
  assert.match(portal, /filteredOrders/);
});

test('seller returns workspace is connected to physical return cases', () => {
  assert.match(portal, /activeTab === 'returns'.*SellerReturnsWorkspace/s);
  assert.match(returnsUi, /sellerReturnsApi\.decide/);
  assert.match(returnsUi, /sellerReturnsApi\.refund/);
  assert.match(returnsUi, /originalPaymentMethod/);
  assert.match(returnsApi, /\/sellers\/me\/returns/);
});

test('return service enforces buyer ownership, delivered state and quantity limits', () => {
  assert.match(service, /BUYER_USER_ID/);
  assert.match(service, /DELIVERED/);
  assert.match(service, /unreturned quantity/);
  assert.match(service, /findByUserId/);
});

test('return pickup is assigned-agent-only and seller refund must use original mode', () => {
  assert.match(service, /assignedTo\(c,a\)/);
  assert.match(service, /RECEIVED_BY_SELLER/);
  assert.match(service, /original\.equals\(supplied\)/);
  assert.match(service, /SELLER_RETURN_EVENTS/);
  assert.match(controller, /ROLE_BUYER/);
  assert.match(controller, /ROLE_DELIVERY/);
});

test('Oracle migration creates case and append-only event records', () => {
  assert.match(migration, /CREATE TABLE SELLER_RETURN_CASES/);
  assert.match(migration, /CREATE TABLE SELLER_RETURN_EVENTS/);
  assert.match(migration, /FK_RETURN_AGENT/);
});

test('buyer can request item returns from delivered order tracking', () => {
  assert.match(tracking, /BuyerReturnPanel/);
  assert.match(tracking, /isDelivered &&/);
  assert.match(buyerReturnsUi, /buyerReturnsApi\.create/);
  assert.match(buyerReturnsUi, /item\.itemId/);
});

test('delivery dashboard supports return collection and seller handover', () => {
  assert.match(deliveryPortal, /DeliveryReturnsWorkspace/);
  assert.match(deliveryReturnsUi, /deliveryReturnsApi\.pickup/);
  assert.match(deliveryReturnsUi, /deliveryReturnsApi\.handover/);
});

test('return eligibility uses category-specific admin policy and delivery timestamp', () => {
  assert.match(service, /KU_RETURN_POLICIES/);
  assert.match(service, /RETURN_WINDOW_DAYS/);
  assert.match(service, /deliveredAt\.plusDays\(windowDays\)/);
  assert.match(service, /IS_RETURNABLE/);
  assert.match(orderEntity, /DELIVERED_AT/);
  assert.match(policyMigration, /CREATE TABLE KU_RETURN_POLICIES/);
  assert.match(policyMigration, /INSERT INTO KU_RETURN_POLICIES.*'\*'.*7/s);
});

test('root admin can configure and audit category return policies', () => {
  assert.match(admin, /\/returns\/policies/);
  assert.match(admin, /requireRootAdmin\(\)/);
  assert.match(admin, /KU_RETURN_POLICY_EVENTS/);
  assert.match(adminUi, /adminApi\.updateReturnPolicy/);
  assert.match(adminUi, /category-specific rule overrides the global/);
});

test('delivery return assignment uses the same ACTIVE profile rule as normal delivery jobs', () => {
  assert.match(service, /!"ACTIVE".equalsIgnoreCase\(agent.getStatus\(\)\)/);
});

test('seller confirms physical receipt, condition and accepted quantity before refund', () => {
  assert.match(controller, /\/returns\/\{returnId\}\/receipt/);
  assert.match(service, /sellerConfirmReceipt/);
  assert.match(service, /HANDED_TO_SELLER/);
  assert.match(service, /RECEIPT_DISPUTED/);
  assert.match(service, /ACCEPTED_QUANTITY/);
  assert.match(returnsUi, /sellerReturnsApi\.confirmReceipt/);
  assert.match(returnsUi, /accepted quantity/i);
});

test('return eligibility defaults to disabled and supports product overrides', () => { assert.match(service, /PRODUCT:/); assert.match(service, /productRule/); assert.match(admin, /PRODUCT:\[A-Z0-9_-\]/); assert.match(policyMigration, /UPDATE KU_RETURN_POLICIES SET IS_RETURNABLE=0/); });

test('buyer order tracking displays backend-authoritative item return eligibility and deadline', () => { assert.match(buyerReturnsUi, /buyerReturnsApi\.eligibility/); assert.match(buyerReturnsUi, /Non-returnable/); assert.match(buyerReturnsUi, /returnDeadline/); assert.match(buyerReturnsUi, /returnWindowDays/); assert.match(controller, /return-eligibility/); });
