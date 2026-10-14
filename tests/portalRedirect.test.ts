import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPortalRedirectUrl } from '../src/app/routing/portalRedirect.ts';

test('builds a role dashboard URL on the configured HTTPS portal origin', () => {
  assert.equal(
    buildPortalRedirectUrl('seller', 'https://buyer.example.test', { seller: 'https://seller.example.test/' }),
    'https://seller.example.test/seller',
  );
  assert.equal(
    buildPortalRedirectUrl('professional', 'https://buyer.example.test', { professional: 'https://help.example.test/app' }),
    'https://help.example.test/daily-help',
  );
});

test('rejects missing, malformed, insecure, and same-path redirect URLs', () => {
  assert.equal(buildPortalRedirectUrl('seller', 'https://buyer.example.test', {}), null);
  assert.equal(buildPortalRedirectUrl('seller', 'https://buyer.example.test', { seller: 'not a url' }), null);
  assert.equal(buildPortalRedirectUrl('seller', 'https://buyer.example.test', { seller: 'http://seller.example.test' }), null);
  assert.equal(buildPortalRedirectUrl('seller', 'https://buyer.example.test/seller', { seller: 'https://buyer.example.test/other' }), null);
});

test('supports same-origin redirects to a different role path', () => {
  assert.equal(
    buildPortalRedirectUrl('seller', 'https://bazaar.kuraliupdates.com/buyer', { seller: 'https://bazaar.kuraliupdates.com' }),
    'https://bazaar.kuraliupdates.com/seller',
  );
  assert.equal(
    buildPortalRedirectUrl('buyer', 'https://bazaar.kuraliupdates.com/buyer', { buyer: 'https://bazaar.kuraliupdates.com/' }),
    null,
  );
});
