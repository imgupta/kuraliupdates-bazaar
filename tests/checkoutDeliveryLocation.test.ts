import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCheckoutDeliveryLocation } from '../src/entities/checkoutDeliveryLocation.ts';
import type { SavedAddress } from '../src/entities/address.ts';

const address: SavedAddress = {
  id: 'address-1',
  label: 'Home',
  addressLine1: '12 Main Road',
  latitude: 30.83,
  longitude: 76.58,
  placeId: 'kurali-place',
};

test('uses the selected saved address coordinates for delivery', () => {
  assert.deepEqual(getCheckoutDeliveryLocation(address, 'DELIVERY'), {
    deliveryLatitude: 30.83,
    deliveryLongitude: 76.58,
    deliveryPlaceId: 'kurali-place',
  });
});

test('does not require delivery coordinates for store pickup', () => {
  assert.equal(getCheckoutDeliveryLocation(undefined, 'STORE_PICKUP'), null);
});

test('blocks delivery when the selected address has no coordinates', () => {
  assert.throws(
    () => getCheckoutDeliveryLocation({ ...address, latitude: undefined, longitude: undefined }, 'DELIVERY'),
    /missing a verified map location/,
  );
});

test('rejects invalid or zero-zero coordinates instead of falling back to profile location', () => {
  assert.throws(
    () => getCheckoutDeliveryLocation({ ...address, latitude: 0, longitude: 0 }, 'DELIVERY'),
    /missing a verified map location/,
  );
  assert.throws(
    () => getCheckoutDeliveryLocation({ ...address, latitude: 91 }, 'DELIVERY'),
    /missing a verified map location/,
  );
});
