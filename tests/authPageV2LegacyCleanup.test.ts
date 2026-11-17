import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/Auth/AuthPageV2.tsx', import.meta.url), 'utf8');
const legacyStart = source.indexOf('const AuthPageV2Legacy');
const legacyEnd = source.indexOf('const RoleRegistrationCard', legacyStart);
const legacy = source.slice(legacyStart, legacyEnd);

test('legacy auth flow contains no seller registration implementation', () => {
  assert.ok(legacyStart >= 0 && legacyEnd > legacyStart);
  assert.doesNotMatch(legacy, /registrationRole\s*===\s*['"]seller['"]/);
  assert.doesNotMatch(legacy, /storeNameRef|shopFrontPhotoRef|gstNumberRef|fssaiCertificateRef|uploadSellerDocument/);
});

test('seller registration continues to use the dedicated wizard', () => {
  assert.match(source, /if \(props\.registrationRole === 'seller'\) return <SellerRegistrationWizard \/>;/);
});

test('delivery and Daily Help registration roles remain in the legacy OTP flow', () => {
  assert.match(legacy, /registrationRole === 'delivery' \|\| registrationRole === 'professional'/);
  assert.match(legacy, /bazaarApi\.sendOtp\(email, 'EMAIL', 'REGISTER'\)/);
  assert.match(legacy, /mode: 'REGISTER'/);
});
