import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('root composition imports role portals only through their public entry points', () => {
  const app = read('../src/App.tsx');
  const roleEntryPoints = [
    './features/buyer',
    './features/seller',
    './features/delivery',
    './features/daily-help',
    './features/admin',
  ];

  for (const entryPoint of roleEntryPoints) {
    assert.ok(app.includes(`from '${entryPoint}'`), `App must import ${entryPoint}`);
  }

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
