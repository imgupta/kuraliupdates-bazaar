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
    assert.ok(deliveryApi.includes(`${method}(`), `deliveryApi should own ${method}`);
    assert.ok(!legacyApi.includes(`${method}(`), `legacy API should not own ${method}`);
  }
  assert.ok(!deliveryApi.includes('...bazaarApi'), 'delivery API must not spread the legacy client');
  assert.ok(appContext.includes('deliveryApi.claimDeliveryJob'));
  assert.ok(appContext.includes('deliveryApi.verifyDeliveryOtp'));
  assert.ok(appContext.includes('deliveryApi.registerDeliveryAgent'));
});

test('API configuration and backend order mapping are shared modules', () => {
  const apiConfig = read('../src/services/http/apiConfig.ts');
  const orderMapping = read('../src/entities/orderMapping.ts');
  const trackingApi = read('../src/services/domains/trackingApi.ts');
  assert.ok(apiConfig.includes('export const API_BASE_URL'));
  assert.ok(orderMapping.includes('export const mapBackendOrder'));
  assert.ok(trackingApi.includes("from '../http/apiConfig'"));
});


test('seller, admin and Daily Help domain APIs own their HTTP operations', () => {
  const legacyApi = read('../src/services/api.ts');
  const sellerApi = read('../src/services/domains/sellerApi.ts');
  const adminApi = read('../src/services/domains/adminApi.ts');
  const dailyHelpApi = read('../src/services/domains/dailyHelpApi.ts');
  const providerApi = read('../src/services/domains/dailyHelpProviderApi.ts');
  const buyerApi = read('../src/services/domains/buyerApi.ts');

  for (const method of ['getCurrentSeller', 'getSellerProducts', 'createSellerProduct', 'updateSellerProduct', 'deleteSellerProduct', 'getSellerOrders', 'updateSellerOrderStatus', 'getSellerDiscounts', 'createSellerDiscount', 'deleteSellerDiscount', 'registerSeller', 'addProduct']) {
    assert.ok(sellerApi.includes(`${method}(`), `sellerApi should own ${method}`);
    assert.ok(!legacyApi.includes(`${method}(`), `legacy API should not own ${method}`);
  }
  for (const method of ['getAdminDiagnostics', 'getDemandAnalytics', 'getAdminSellers', 'getAdminDeliveryAgents', 'getAdminSearchTrends', 'getAdminAnalytics', 'getPendingSellers', 'getAdminBuyers', 'getPendingDeliveryAgents', 'approveDeliveryAgent', 'rejectDeliveryAgent', 'approveSeller', 'rejectSeller']) {
    assert.ok(adminApi.includes(`${method}(`), `adminApi should own ${method}`);
    assert.ok(!legacyApi.includes(`${method}(`), `legacy API should not own ${method}`);
  }
  for (const method of ['getDailyHelpServices', 'createDailyHelpBooking', 'getDailyHelpAvailableSlots', 'getLatestDailyHelpBooking', 'getDailyHelpBooking']) {
    assert.ok(dailyHelpApi.includes(`${method}(`), `dailyHelpApi should own ${method}`);
    assert.ok(!legacyApi.includes(`${method}(`), `legacy API should not own ${method}`);
    assert.ok(buyerApi.includes(`dailyHelpApi.${method}`));
  }
  for (const method of ['getDailyHelpProfessionalSlots', 'createDailyHelpProfessionalSlot', 'cancelDailyHelpProfessionalSlot', 'registerDailyHelpProfessional', 'getDailyHelpProfessionalByPhone', 'updateDailyHelpProfessionalAvailability', 'getDailyHelpProfessionalAvailableJobs', 'acceptDailyHelpJob', 'getDailyHelpProfessionalJobs', 'getDailyHelpProfessionalEarnings', 'updateDailyHelpBookingStatus', 'startDailyHelpBooking', 'completeDailyHelpBooking']) {
    assert.ok(providerApi.includes(`${method}(`), `provider API should own ${method}`);
    assert.ok(!legacyApi.includes(`${method}(`), `legacy API should not own ${method}`);
  }
  assert.ok(!sellerApi.includes('bazaarApi'));
  assert.ok(!adminApi.includes('bazaarApi'));
  assert.ok(!providerApi.includes('bazaarApi'));
});


test('portal shell lazy-loads authentication and buyer-only routes', () => {
  const shell = read('../src/app/PortalAppShell.tsx');
  assert.ok(shell.includes("lazy(() => import('../components/Auth/AuthPageV2')"));
  assert.ok(shell.includes("lazy(() => import('../components/Auth/BuyerRegistrationPage')"));
  assert.ok(shell.includes("lazy(() => import('../components/Buyer/BuyerAccountPage')"));
  assert.ok(shell.includes('Suspense fallback={<PortalRouteLoading />}'));
  assert.ok(!shell.includes("from '../components/Buyer/BuyerAccountPage'"));
});
