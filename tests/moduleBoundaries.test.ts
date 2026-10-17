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
