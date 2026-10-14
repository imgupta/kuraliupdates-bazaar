import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathForRole, resolveAppRoute, resolvePortalRoute } from '../src/app/routing/routeConfig.ts';

test('resolves all existing registration routes to their legacy registration roles', () => {
  assert.deepEqual(resolveAppRoute('/register/seller'), { kind: 'register', role: 'seller' });
  assert.deepEqual(resolveAppRoute('/register/delivery'), { kind: 'register', role: 'delivery' });
  assert.deepEqual(resolveAppRoute('/register/daily-help'), { kind: 'register', role: 'professional' });
});

test('keeps buyer registration and account as explicit route kinds', () => {
  assert.deepEqual(resolveAppRoute('/register/buyer'), { kind: 'register-buyer' });
  assert.deepEqual(resolveAppRoute('/account'), { kind: 'account' });
});

test('resolves canonical dashboard URLs for all five roles', () => {
  const routes = [
    ['/buyer', 'buyer'],
    ['/seller', 'seller'],
    ['/delivery', 'delivery'],
    ['/daily-help', 'professional'],
    ['/admin', 'admin'],
  ] as const;

  for (const [path, role] of routes) {
    assert.deepEqual(resolveAppRoute(path), { kind: 'role-dashboard', role });
    assert.equal(pathForRole(role), path);
  }
});

test('normalizes trailing slashes without changing route identity', () => {
  assert.deepEqual(resolveAppRoute('/register/seller/'), { kind: 'register', role: 'seller' });
  assert.deepEqual(resolveAppRoute('/account///'), { kind: 'account' });
  assert.deepEqual(resolveAppRoute('/seller/'), { kind: 'role-dashboard', role: 'seller' });
  assert.deepEqual(resolveAppRoute('////'), { kind: 'home' });
});

test('uses the current home fallback for unknown paths', () => {
  assert.deepEqual(resolveAppRoute('/not-yet-supported'), { kind: 'home' });
});

test('portal builds default to their configured dashboard only at the root path', () => {
  assert.deepEqual(resolvePortalRoute('/', 'buyer'), { kind: 'role-dashboard', role: 'buyer' });
  assert.deepEqual(resolvePortalRoute('/', 'professional'), { kind: 'role-dashboard', role: 'professional' });
  assert.deepEqual(resolvePortalRoute('/register/seller', 'buyer'), { kind: 'register', role: 'seller' });
  assert.deepEqual(resolvePortalRoute('/admin', 'buyer'), { kind: 'role-dashboard', role: 'admin' });
});

test('invalid or missing portal configuration preserves the shared app routes', () => {
  assert.deepEqual(resolvePortalRoute('/', undefined), { kind: 'home' });
  assert.deepEqual(resolvePortalRoute('/', 'unknown'), { kind: 'home' });
  assert.deepEqual(resolvePortalRoute('/seller', 'unknown'), { kind: 'role-dashboard', role: 'seller' });
});
