import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAppRoute } from '../src/app/routing/routeConfig.ts';

test('resolves all existing registration routes to their legacy registration roles', () => {
  assert.deepEqual(resolveAppRoute('/register/seller'), {
    kind: 'register',
    role: 'seller',
  });
  assert.deepEqual(resolveAppRoute('/register/delivery'), {
    kind: 'register',
    role: 'delivery',
  });
  assert.deepEqual(resolveAppRoute('/register/daily-help'), {
    kind: 'register',
    role: 'professional',
  });
});

test('keeps buyer registration and account as explicit route kinds', () => {
  assert.deepEqual(resolveAppRoute('/register/buyer'), { kind: 'register-buyer' });
  assert.deepEqual(resolveAppRoute('/account'), { kind: 'account' });
});

test('normalizes trailing slashes without changing route identity', () => {
  assert.deepEqual(resolveAppRoute('/register/seller/'), {
    kind: 'register',
    role: 'seller',
  });
  assert.deepEqual(resolveAppRoute('/account///'), { kind: 'account' });
  assert.deepEqual(resolveAppRoute('////'), { kind: 'home' });
});

test('uses the current home fallback for unknown paths', () => {
  assert.deepEqual(resolveAppRoute('/not-yet-supported'), { kind: 'home' });
});
