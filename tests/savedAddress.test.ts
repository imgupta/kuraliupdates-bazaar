import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSavedAddress } from '../src/entities/address.ts';

test('maps backend address fields and prefers addressId over id', () => {
  assert.deepEqual(
    toSavedAddress({
      addressId: 'addr-1',
      id: 'legacy-id',
      label: 'Work',
      addressLine1: '12 Main Road',
      landmark: 'Near the market',
      formattedAddress: '12 Main Road, Kurali',
      placeId: 'place-123',
      latitude: 0,
      longitude: 0,
      isDefault: '1',
    }),
    {
      id: 'addr-1',
      label: 'Work',
      addressLine1: '12 Main Road',
      landmark: 'Near the market',
      formattedAddress: '12 Main Road, Kurali',
      placeId: 'place-123',
      latitude: 0,
      longitude: 0,
      isDefault: true,
    },
  );
});

test('preserves legacy id fallback and optional-field normalization', () => {
  assert.deepEqual(
    toSavedAddress({
      id: 'legacy-id',
      label: '',
      addressLine1: '',
      landmark: '',
      formattedAddress: null,
      placeId: '',
      latitude: null,
      longitude: undefined,
      isDefault: false,
    }),
    {
      id: 'legacy-id',
      label: 'Home',
      addressLine1: '',
      landmark: undefined,
      formattedAddress: undefined,
      placeId: undefined,
      latitude: undefined,
      longitude: undefined,
      isDefault: false,
    },
  );
});

test('recognizes both numeric and boolean default-address values', () => {
  assert.equal(toSavedAddress({ id: 'numeric', isDefault: 1 }).isDefault, true);
  assert.equal(toSavedAddress({ id: 'boolean', isDefault: true }).isDefault, true);
  assert.equal(toSavedAddress({ id: 'zero', isDefault: 0 }).isDefault, false);
});
