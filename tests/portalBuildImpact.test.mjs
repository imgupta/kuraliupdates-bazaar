import assert from 'node:assert/strict';
import test from 'node:test';
import { affectedPortals, isNonRuntimePath, isPortalIrrelevantPath, PORTALS } from '../scripts/portal-build-impact.mjs';

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
