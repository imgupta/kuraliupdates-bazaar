import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('root composition lazy-loads role portals only through their public entry points', () => {
  const app = read('../src/App.tsx');
  const roleEntryPoints = [
    './features/buyer',
    './features/seller',
    './features/delivery',
    './features/daily-help',
    './features/admin',
  ];

  for (const entryPoint of roleEntryPoints) {
    assert.ok(app.includes(`import('${entryPoint}')`), `App must lazy-load ${entryPoint}`);
  }

  assert.match(app, /lazy\(\(\) => import\(/, 'role dashboards must be loaded through React.lazy');
  assert.match(app, /<Suspense fallback=/, 'lazy dashboards must have a loading fallback');
  assert.doesNotMatch(app, /from ['"]\.\/features\/(buyer|seller|delivery|daily-help|admin)\/[^'"]+['"]/);
});

test('each role portal publishes its dashboard from a stable module entry point', () => {
  const contracts = [
    ['../src/features/buyer/index.ts', /export \{ BuyerPortal \} from ['"]\.\/BuyerPortal['"]/],
    ['../src/features/seller/index.ts', /export \{ SellerDashboard \} from ['"]\.\/SellerPortal['"]/],
    ['../src/features/delivery/index.ts', /export \{ DeliveryDashboard \} from ['"]\.\/DeliveryPortal['"]/],
    ['../src/features/daily-help/index.ts', /export \{ DailyHelpProfessionalDashboard \} from ['"]\.\/DailyHelpPortal['"]/],
    ['../src/features/admin/index.ts', /export \{ AdminDashboard \} from ['"]\.\/AdminPortal['"]/],
  ] as const;

  for (const [path, contract] of contracts) {
    assert.match(read(path), contract, `${path} must publish its dashboard`);
  }

  assert.match(
    read('../src/features/buyer/index.ts'),
    /export type \{ BuyerPortalProps \} from ['"]\.\/BuyerPortal['"]/
  );
});

test('legacy auth keeps seller registration in the dedicated wizard', () => {
  const auth = read('../src/components/Auth/AuthPageV2.tsx');
  const legacyStart = auth.indexOf('const AuthPageV2Legacy');
  const legacyEnd = auth.indexOf('const RoleRegistrationCard', legacyStart);
  const legacy = auth.slice(legacyStart, legacyEnd);

  assert.ok(legacyStart >= 0 && legacyEnd > legacyStart);
  assert.doesNotMatch(legacy, /registrationRole\s*===\s*['"]seller['"]/);
  assert.doesNotMatch(legacy, /storeNameRef|shopFrontPhotoRef|gstNumberRef|fssaiCertificateRef|uploadSellerDocument/);
  assert.match(auth, /if \(props\.registrationRole === 'seller'\) return <SellerRegistrationWizard \/>;/);
});

test('legacy auth retains delivery and Daily Help email OTP registration', () => {
  const auth = read('../src/components/Auth/AuthPageV2.tsx');
  const legacyStart = auth.indexOf('const AuthPageV2Legacy');
  const legacyEnd = auth.indexOf('const RoleRegistrationCard', legacyStart);
  const legacy = auth.slice(legacyStart, legacyEnd);

  assert.match(legacy, /registrationRole === 'delivery' \|\| registrationRole === 'professional'/);
  assert.match(legacy, /bazaarApi\.sendOtp\(email, 'EMAIL', 'REGISTER'\)/);
  assert.match(legacy, /mode: 'REGISTER'/);
});

test('admin portal delegates refresh, seller document review and configuration lifecycles to focused hooks', () => {
  const portal = read('../src/features/admin/AdminPortal.tsx');
  const refreshHook = read('../src/features/admin/useAdminDashboardRefresh.ts');
  const documentHook = read('../src/features/admin/useSellerDocumentReview.ts');
  const configurationHook = read('../src/features/admin/useAdminConfiguration.ts');

  assert.match(portal, /useAdminDashboardRefresh\(/);
  assert.match(portal, /useSellerDocumentReview\(showToast\)/);
  assert.match(portal, /useAdminConfiguration\(activeAdminTab, isRootAdmin, showToast\)/);
  assert.match(refreshHook, /setInterval\(\(\) => void refreshAdminData\(\), 45000\)/);
  assert.match(documentHook, /verifySellerDocument/);
  assert.match(configurationHook, /updateDeliveryConfiguration/);
  assert.match(configurationHook, /updateSellerServiceArea/);
});
