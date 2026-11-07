import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupCheckoutOrders } from '../src/entities/orderGrouping.ts';
import type { Order } from '../src/types/index.ts';

const order = (id: string, status: Order['status']): Order => ({
  id,
  buyerName: 'Synthetic Buyer',
  buyerPhone: '0000000000',
  buyerEmail: 'buyer@example.test',
  deliveryAddress: 'Synthetic address',
  deliveryLocality: 'Kurali',
  items: [],
  checkoutGroupId: 'CHK-SYNTHETIC',
  sellerId: `SELLER-${id}`,
  sellerName: `Store ${id}`,
  sellerLocality: 'Kurali',
  subtotal: 100,
  billDiscountAmount: 0,
  couponDiscountAmount: 0,
  deliveryFee: 0,
  isFreeDelivery: true,
  totalAmount: 100,
  paymentMethod: 'COD',
  paymentStatus: status === 'cancelled' ? 'pending_cod' : 'pending_cod',
  status,
  placedAt: '2026-11-07T10:00:00',
  deliveryOtp: '',
  distanceKm: 0,
  statusUpdates: [],
});

test('keeps a mixed checkout active while any seller suborder remains active', () => {
  const grouped = groupCheckoutOrders([
    order('1', 'cancelled'),
    order('2', 'placed'),
  ]);

  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].status, 'placed');
  assert.deepEqual(grouped[0].checkoutGroupOrderIds, ['1', '2']);
});

test('marks a checkout cancelled only when every seller suborder is cancelled', () => {
  const grouped = groupCheckoutOrders([
    order('1', 'cancelled'),
    order('2', 'cancelled'),
  ]);

  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].status, 'cancelled');
});
