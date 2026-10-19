import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('delivery portal consumes the shared live order map, not a buyer-private component', () => {
  const deliveryPortal = read('../src/features/delivery/DeliveryPortal.tsx');
  assert.match(deliveryPortal, /from ['"]\.\.\/\.\.\/components\/shared\/LiveOrderMap['"]/);
  assert.doesNotMatch(deliveryPortal, /components\/Buyer\/LiveOrderMap/);
  assert.ok(existsSync(new URL('../src/components/shared/LiveOrderMap.tsx', import.meta.url)));
});

test('buyer live order map path remains a backwards-compatible re-export', () => {
  const compatibilityEntry = read('../src/components/Buyer/LiveOrderMap.tsx');
  assert.match(compatibilityEntry, /export \{ LiveOrderMap \} from ['"]\.\.\/shared\/LiveOrderMap['"]/);
});


test('delivery API owns delivery lifecycle HTTP operations outside the legacy API client', () => {
  const deliveryApi = read('../src/services/domains/deliveryApi.ts');
  const legacyApi = read('../src/services/api.ts');
  const appContext = read('../src/context/AppContext.tsx');

  for (const method of ['registerDeliveryAgent', 'getAvailableDeliveryJobs', 'getDeliveryAvailableJobs', 'claimDeliveryJob', 'verifyDeliveryOtp', 'resendDeliveryOtp']) {
    assert.match(deliveryApi, new RegExp('\\\\b' + method + '\\\\s*\\\\('), `deliveryApi should own ${method}`);
    assert.doesNotMatch(legacyApi, new RegExp('\\\\b' + method + '\\\\s*\\\\('), `legacy API should not own ${method}`);
  }
  assert.doesNotMatch(deliveryApi, /import \\{[^}]*bazaarApi[^}]*\\} from ['"]\\.\\.\\/api['"]/);
  assert.match(appContext, /deliveryApi\\.claimDeliveryJob/);
  assert.match(appContext, /deliveryApi\\.verifyDeliveryOtp/);
  assert.match(appContext, /deliveryApi\\.registerDeliveryAgent/);
});

test('API configuration and backend order mapping are shared modules', () => {
  const apiConfig = read('../src/services/http/apiConfig.ts');
  const orderMapping = read('../src/entities/orderMapping.ts');
  const trackingApi = read('../src/services/domains/trackingApi.ts');
  assert.match(apiConfig, /export const API_BASE_URL/);
  assert.match(orderMapping, /export const mapBackendOrder/);
  assert.match(trackingApi, /from ['"]\\.\\.\\/http\\/apiConfig['"]/);
});
