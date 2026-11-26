import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const portal = read('../src/features/seller/SellerPortal.tsx');
const payment = read('../src/components/Seller/SellerPaymentWorkspace.tsx');

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

test('seller refund actions are reachable from dedicated returns workspace', () => {
  assert.match(portal, /activeTab === 'returns'.*SellerPaymentWorkspace hideDestination/s);
  assert.match(payment, /hideDestination/);
  assert.match(payment, /updateRefund/);
  assert.match(payment, /seller-funded/);
});
