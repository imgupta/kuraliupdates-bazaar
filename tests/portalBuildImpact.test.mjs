import assert from 'node:assert/strict';
import test from 'node:test';
import { affectedPortals, isNonRuntimePath, isPortalIrrelevantPath, PORTALS } from '../scripts/portal-build-impact.mjs';

test('buyer account and buyer order API changes build only Buyer', () => {
  assert.deepEqual(
    affectedPortals(['src/components/Buyer/BuyerAccountPage.tsx', 'src/services/domains/buyerOrdersApi.ts']),
    ['buyer'],
  );
});

test('seller, delivery, admin and Daily Help component changes stay within their portals', () => {
  assert.deepEqual(affectedPortals(['src/components/Seller/SellerDashboard.tsx']), ['seller']);
  assert.deepEqual(affectedPortals(['src/components/Delivery/DeliveryDashboard.tsx']), ['delivery']);
  assert.deepEqual(affectedPortals(['src/components/Admin/AdminDashboard.tsx']), ['admin']);
  assert.deepEqual(affectedPortals(['src/components/DailyHelpProfessional/ProfessionalHome.tsx']), ['daily-help']);
});

test('backend-only changes do not trigger frontend portal builds', () => {
  assert.deepEqual(affectedPortals([
    'backend-java-spring/src/main/java/com/kuraliupdates/bazaar/service/OrderService.java',
    'backend-java-spring/src/main/resources/db/migration/V33__api_rate_limit_buckets.sql',
  ]), []);
});

test('a Buyer-only feature change builds only Buyer', () => {
  assert.deepEqual(affectedPortals(['src/features/buyer/BuyerPortal.tsx']), ['buyer']);
});

test('changes to multiple isolated portals build only those portals', () => {
  assert.deepEqual(
    affectedPortals(['src/features/seller/SellerDashboard.tsx', 'src/entries/admin.tsx']),
    ['seller', 'admin'],
  );
});

test('shared runtime changes fan out to all role portals', () => {
  assert.deepEqual(affectedPortals(['src/context/AppContext.tsx']), PORTALS);
  assert.deepEqual(affectedPortals(['vite.config.ts']), PORTALS);
});

test('unknown runtime paths fail safe and build every portal', () => {
  assert.deepEqual(affectedPortals(['src/new-shared-runtime.ts']), PORTALS);
});

test('documentation, tests, workflows and root-only HTML do not build role portals', () => {
  const files = ['README.md', 'docs/plan.md', 'tests/example.test.ts', '.github/workflows/e2e-login.yml', 'index.html'];
  assert.ok(files.slice(0, 4).every(isNonRuntimePath));
  assert.ok(files.every(isPortalIrrelevantPath));
  assert.deepEqual(affectedPortals(files), []);
});

test('root index changes still count as runtime changes for the combined site', () => {
  assert.equal(isNonRuntimePath('index.html'), false);
});

test('a documentation-only commit combined with a Buyer change still builds Buyer', () => {
  assert.deepEqual(affectedPortals(['docs/plan.md', 'src/features/buyer/BuyerPortal.tsx']), ['buyer']);
});

test('dependency and shared stylesheet changes rebuild every portal', () => {
  assert.deepEqual(affectedPortals(['package.json']), PORTALS);
  assert.deepEqual(affectedPortals(['src/index.css']), PORTALS);
});
