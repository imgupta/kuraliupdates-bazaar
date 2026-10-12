import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapServerUser, type UserProfile } from '../src/entities/userProfile.ts';

const previous: UserProfile = {
  email: 'old@example.com',
  name: 'Previous Name',
  avatarUrl: 'avatar.png',
  phone: '1112223333',
  locality: 'Old Locality',
  address: 'Old Address',
  addressLine1: 'Old line',
  landmark: 'Old landmark',
  formattedAddress: 'Old formatted address',
  placeId: 'old-place',
  latitude: 12.5,
  longitude: 77.5,
  sellerId: 'seller-1',
  deliveryAgentId: 'agent-1',
  role: 'buyer',
  isSignedIn: true,
  phoneVerified: true,
  emailVerified: true,
  authMethod: 'otp',
  isAdmin: false,
  savedAddresses: [],
  registeredRoles: ['buyer', 'seller'],
};

test('maps backend user fields while preserving unrelated profile fields', () => {
  const result = mapServerUser({
    email: 'new@example.com',
    name: 'Server Name',
    phone: '9998887777',
    locality: 'New Locality',
    address: 'New Address',
    addressLine1: 'New line',
    landmark: 'New landmark',
    formattedAddress: 'New formatted address',
    placeId: 'new-place',
    latitude: 0,
    longitude: 0,
  }, previous);

  assert.deepEqual(result, {
    ...previous,
    email: 'new@example.com',
    name: 'Server Name',
    phone: '9998887777',
    locality: 'New Locality',
    address: 'New Address',
    addressLine1: 'New line',
    landmark: 'New landmark',
    formattedAddress: 'New formatted address',
    placeId: 'new-place',
    latitude: 0,
    longitude: 0,
  });
});

test('nullish server fields retain previous values but empty strings and zero remain valid', () => {
  const result = mapServerUser({
    email: null,
    name: undefined,
    phone: '',
    locality: null,
    address: undefined,
    addressLine1: '',
    landmark: null,
    formattedAddress: '',
    placeId: null,
    latitude: 0,
    longitude: 0,
  }, previous);

  assert.equal(result.email, previous.email);
  assert.equal(result.name, previous.name);
  assert.equal(result.phone, '');
  assert.equal(result.locality, previous.locality);
  assert.equal(result.address, previous.address);
  assert.equal(result.addressLine1, '');
  assert.equal(result.landmark, previous.landmark);
  assert.equal(result.formattedAddress, '');
  assert.equal(result.placeId, previous.placeId);
  assert.equal(result.latitude, 0);
  assert.equal(result.longitude, 0);
  assert.equal(result.role, previous.role);
  assert.equal(result.isSignedIn, previous.isSignedIn);
  assert.equal(result.sellerId, previous.sellerId);
  assert.equal(result.deliveryAgentId, previous.deliveryAgentId);
  assert.equal(result.savedAddresses, previous.savedAddresses);
  assert.equal(result.registeredRoles, previous.registeredRoles);
});
