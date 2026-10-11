import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorizeRoleRoute } from '../src/app/routing/roleRouteAccess.ts';
import type { UserRole } from '../src/types/index.ts';

const roles: UserRole[] = ['buyer', 'seller', 'delivery', 'professional', 'admin'];

test('requires a signed-in session before granting any role route', () => {
  for (const role of roles) {
    assert.deepEqual(
      authorizeRoleRoute(role, {
        isSignedIn: false,
        registeredRoles: roles,
        isAdmin: true,
      }),
      { allowed: false, reason: 'authentication-required' },
    );
  }
});

test('allows registered non-admin roles and denies unregistered roles', () => {
  for (const role of roles.filter((item) => item !== 'admin')) {
    assert.deepEqual(
      authorizeRoleRoute(role, {
        isSignedIn: true,
        registeredRoles: [role],
        isAdmin: false,
      }),
      { allowed: true, role },
    );
  }

  assert.deepEqual(
    authorizeRoleRoute('seller', {
      isSignedIn: true,
      registeredRoles: ['buyer'],
      isAdmin: false,
    }),
    { allowed: false, reason: 'role-not-registered' },
  );
});

test('requires verified admin authority as well as admin role registration', () => {
  assert.deepEqual(
    authorizeRoleRoute('admin', {
      isSignedIn: true,
      registeredRoles: ['admin'],
      isAdmin: false,
    }),
    { allowed: false, reason: 'admin-required' },
  );

  assert.deepEqual(
    authorizeRoleRoute('admin', {
      isSignedIn: true,
      registeredRoles: ['admin'],
      isAdmin: true,
    }),
    { allowed: true, role: 'admin' },
  );

  assert.deepEqual(
    authorizeRoleRoute('admin', {
      isSignedIn: true,
      registeredRoles: ['buyer'],
      isAdmin: true,
    }),
    { allowed: false, reason: 'role-not-registered' },
  );
});
