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
  const operations = read('../src/context/useOrderDeliveryOperations.ts');
  assert.ok(operations.includes('deliveryApi.claimDeliveryJob'));
  assert.ok(operations.includes('deliveryApi.verifyDeliveryOtp'));
  assert.ok(operations.includes('deliveryApi.registerDeliveryAgent'));
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

  const providerWorkflow = read('../src/features/daily-help/useDailyHelpProviderOperations.ts');
  const providerPortal = read('../src/features/daily-help/DailyHelpPortal.tsx');
  for (const operation of ['registerDailyHelpProfessional', 'updateDailyHelpProfessionalAvailability', 'acceptDailyHelpJob', 'updateDailyHelpBookingStatus', 'startDailyHelpBooking', 'completeDailyHelpBooking', 'createDailyHelpProfessionalSlot', 'cancelDailyHelpProfessionalSlot']) {
    assert.ok(providerWorkflow.includes(`dailyHelpProviderApi.${operation}`), `provider workflow hook should own ${operation}`);
  }
  assert.ok(providerPortal.includes('useDailyHelpProviderOperations()'));
  assert.doesNotMatch(providerPortal, /dailyHelpProviderApi\./, 'Daily Help provider UI should not call its API client directly');
});


test('portal shell lazy-loads authentication and buyer-only routes', () => {
  const shell = read('../src/app/PortalAppShell.tsx');
  assert.ok(shell.includes("lazy(() => import('../components/Auth/AuthPageV2')"));
  assert.ok(shell.includes("lazy(() => import('../components/Auth/BuyerRegistrationPage')"));
  assert.ok(shell.includes("lazy(() => import('../components/Buyer/BuyerAccountPage')"));
  assert.ok(shell.includes('Suspense fallback={<PortalRouteLoading />}'));
  assert.ok(!shell.includes("from '../components/Buyer/BuyerAccountPage'"));
});


test('authentication session storage is centralized outside the application context', () => {
  const sessionStorage = read('../src/auth/authSessionStorage.ts');
  const appContext = read('../src/context/AppContext.tsx');
  for (const key of ['kurali_auth_session', 'kurali_auth_token', 'kurali_role', 'kurali_user']) {
    assert.ok(sessionStorage.includes(key), `session storage module should own ${key}`);
  }
  for (const operation of ['readStoredAuthSession', 'readStoredRole', 'readAuthToken', 'persistAuthSession', 'persistAuthToken', 'removeAuthSession', 'removeAuthToken', 'clearStoredAuthState', 'hasStoredAuthSession']) {
    assert.ok(sessionStorage.includes(`export const ${operation}`), `session storage module should export ${operation}`);
  }
  assert.ok(sessionStorage.includes('readStoredAuthSession'));
  assert.ok(sessionStorage.includes('readStoredRole'));
  const authOperations = read('../src/context/useAuthOperations.ts');
  assert.ok(authOperations.includes('clearStoredAuthState()'));
  assert.doesNotMatch(appContext, /kurali_auth_session|kurali_auth_token/);
});


test('authentication actions and logout are isolated from AppContext orchestration', () => {
  const authOperations = read('../src/context/useAuthOperations.ts');
  const appContext = read('../src/context/AppContext.tsx');

  for (const operation of ['loginWithGoogle', 'loginWithOtp', 'registerUserWithOtp', 'logout', 'registerBuyer']) {
    assert.ok(authOperations.includes(`const ${operation}`), `auth operations should own ${operation}`);
  }
  assert.ok(authOperations.includes('persistAuthToken(params.token)'));
  assert.ok(authOperations.includes('clearStoredAuthState()'));
  assert.ok(authOperations.includes('refreshBuyerAddresses(params.token, updatedUser.email)'));
  assert.ok(appContext.includes('useAuthOperations({'));
  assert.doesNotMatch(appContext, /const loginWithOtp =|const registerUserWithOtp =|const logout =|const registerBuyer =/);
});

test('shared authentication state is owned by AuthSessionProvider, not AppContext', () => {
  const authSession = read('../src/context/AuthSessionContext.tsx');
  const appContext = read('../src/context/AppContext.tsx');
  assert.ok(authSession.includes('export const AuthSessionProvider'));
  assert.ok(authSession.includes('export const useAuthSession'));
  assert.ok(authSession.includes('setAuthInitializing'));
  assert.ok(appContext.includes('const { user, setUser, role, setRoleState, authInitializing, setAuthInitializing } = useAuthSession()'));
  assert.ok(appContext.includes('<AuthSessionProvider>'));
  assert.doesNotMatch(appContext, /const \[user, setUser\] = useState/);
  assert.doesNotMatch(appContext, /const \[role, setRoleState\] = useState/);
  assert.doesNotMatch(appContext, /const \[authInitializing, setAuthInitializing\] = useState/);
});

test('application state persistence is centralized in a reusable hook', () => {
  const persistenceHook = read('../src/context/usePersistedValue.ts');
  const appContext = read('../src/context/AppContext.tsx');
  const marketplaceCollections = read('../src/context/useMarketplaceCollections.ts');

  assert.ok(persistenceHook.includes('export const usePersistedValue'));
  assert.ok(persistenceHook.includes('safeStorageSet(key'));
  assert.ok(persistenceHook.includes('safeStorageRemove(key)'));
  assert.ok(appContext.includes('useMarketplaceCollections()'), 'AppContext should compose marketplace state through its domain hook');
  for (const key of ['kurali_sellers', 'kurali_products', 'kurali_coupons', 'kurali_delivery_agents', 'kurali_orders']) {
    assert.ok(marketplaceCollections.includes(`usePersistedValue('${key}'`), `marketplace collection hook should persist ${key} through the shared hook`);
  }
  const negotiation = read('../src/context/useNegotiationChatState.ts');
  assert.ok(negotiation.includes('negotiationChatApi.list('), 'Negotiation hook should load server-backed conversations');
  assert.ok(negotiation.includes('window.setInterval'), 'Negotiation hook should refresh conversations across devices');
  const commerce = read('../src/context/useBuyerCommerceState.ts');
  for (const key of ['kurali_cart', 'kurali_applied_coupon']) {
    assert.ok(commerce.includes(`usePersistedValue('${key}'`), `Buyer commerce hook should persist ${key} through the shared hook`);
  }
  assert.doesNotMatch(appContext, /safeStorageSet\('kurali_(sellers|products|coupons|delivery_agents|orders|chats|cart)'/);
});

test('buyer cart and coupon state is isolated from the orchestration context', () => {
  const commerce = read('../src/context/useBuyerCommerceState.ts');
  const appContext = read('../src/context/AppContext.tsx');

  for (const operation of ['addToCart', 'removeFromCart', 'updateCartQuantity', 'clearCart', 'applyCoupon', 'removeCoupon']) {
    assert.ok(commerce.includes(`const ${operation} =`) || commerce.includes(`const ${operation}:`), `buyer commerce hook should own ${operation}`);
  }
  assert.ok(commerce.includes('cartCalculations'));
  assert.ok(commerce.includes("safeStorageJson('kurali_cart'"));
  assert.ok(commerce.includes("safeStorageJson('kurali_applied_coupon'"));
  assert.ok(appContext.includes('useBuyerCommerceState(sellers, coupons, showToast)'));
  assert.ok(appContext.includes('createOrder'));
  assert.doesNotMatch(appContext, /const addToCart =|const applyCoupon =|const cartCalculations =/);
});


test('seller/admin and order/delivery operations are split into focused domain hooks', () => {
  const operations = read('../src/context/useMarketplaceOperations.ts');
  const sellerAdmin = read('../src/context/useSellerAdminOperations.ts');
  const orderDelivery = read('../src/context/useOrderDeliveryOperations.ts');
  const appContext = read('../src/context/AppContext.tsx');

  for (const operation of ['registerSeller', 'approveSeller', 'rejectSeller', 'addProduct', 'updateProduct', 'deleteProduct', 'approveDeliveryAgent']) {
    assert.ok(sellerAdmin.includes(`const ${operation}`), `seller/admin operations should own ${operation}`);
  }
  for (const operation of ['createOrder', 'updateOrderStatus', 'claimDeliveryJob', 'completeDelivery', 'registerDeliveryAgent']) {
    assert.ok(orderDelivery.includes(`const ${operation}`), `order/delivery operations should own ${operation}`);
  }
  assert.ok(operations.includes('useSellerAdminOperations'));
  assert.ok(operations.includes('useOrderDeliveryOperations'));
  assert.ok(operations.includes('return { ...sellerAdmin, ...orderDelivery }'));
  assert.ok(appContext.includes('useMarketplaceOperations({'));
  assert.ok(appContext.includes('const marketplaceOperations = useMarketplaceOperations'));
  assert.doesNotMatch(appContext, /const registerSeller =|const createOrder =|const claimDeliveryJob =|const completeDelivery =/);
});

test('negotiation chat state and bargaining actions are isolated from application orchestration', () => {
  const negotiation = read('../src/context/useNegotiationChatState.ts');
  const appContext = read('../src/context/AppContext.tsx');

  for (const operation of ['openChatForProduct', 'sendMessage', 'respondToOffer']) {
    assert.ok(negotiation.includes(`const ${operation}`), `negotiation hook should own ${operation}`);
  }
  assert.ok(negotiation.includes('negotiationChatApi.open('));
  assert.ok(negotiation.includes('negotiationChatApi.send('));
  assert.ok(negotiation.includes('negotiationChatApi.respond('));
  assert.ok(appContext.includes('useNegotiationChatState({'));
  assert.ok(appContext.includes('const { chats, activeChatId, setActiveChatId, openChatForProduct, sendMessage, respondToOffer } = negotiationChat'));
  assert.doesNotMatch(appContext, /const openChatForProduct =|const sendMessage =|const respondToOffer =/);
});

test('guarded transactional E2E covers bargaining through checkout without changing catalogue price', () => {
  const lifecycle = read('../e2e/order-daily-help-lifecycle.spec.ts');

  for (const behavior of [
    'apiBase + "/negotiations"',
    'action: "COUNTER"',
    'action: "ACCEPT"',
    'action: "REJECT"',
    'acceptedOfferId: sellerCounter.offer.id',
    'accepted bargaining price must affect this order only, never catalogue price',
    'E2E_TRANSACTIONAL_FLOWS_ENABLED',
  ]) {
    assert.ok(lifecycle.includes(behavior), `transactional E2E should cover ${behavior}`);
  }
  assert.ok(lifecycle.includes('currentAgreedOfferId'));
  assert.ok(lifecycle.includes('order.items[0].negotiatedPrice'));
});

test('backend connection settings and bootstrap are isolated from AppContext orchestration', () => {
  const sync = read('../src/context/useBackendSync.ts');
  const connection = read('../src/context/useBackendConnection.ts');
  const bootstrap = read('../src/context/useAuthBootstrap.ts');
  const appContext = read('../src/context/AppContext.tsx');

  for (const operation of ['checkHealth', 'getMyOrders', 'searchProducts', 'getPendingSellers', 'getPendingDeliveryAgents', 'getDeliveryAvailableJobs']) {
    assert.ok(sync.includes(operation), `backend sync module should own ${operation}`);
  }
  assert.ok(sync.includes('export const useBackendSync'));
  assert.ok(connection.includes('export const useBackendConnection'));
  assert.ok(connection.includes('useBackendSync({'));
  assert.ok(connection.includes('useAuthBootstrap({'));
  assert.ok(bootstrap.includes('export const useAuthBootstrap'));
  assert.ok(connection.includes("safeStorageGet('kurali_backend_url')"));
  assert.ok(connection.includes("safeStorageSet('kurali_backend_url', url)"));
  assert.ok(appContext.includes('useBackendConnection({'));
  assert.ok(appContext.includes('const { backendUrl, setBackendUrl, backendStatus, syncWithBackend } = useBackendConnection'));
  assert.doesNotMatch(appContext, /useBackendSync|useAuthBootstrap|setBackendStatus/);
});
