import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buyerToForm, filterBuyers } from '../src/features/admin/adminBuyers';
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
test('buyer search preserves searchable fields and case-insensitive matching', () => {
  const buyers = [
    { userId: 'user-1', name: 'Asha Kaur', email: 'asha@example.com', phone: '9876543210', locality: 'Kurali' },
    { userId: 'user-2', name: 'Ravi Singh', email: 'ravi@example.com', phone: null, locality: null },
  ];
  assert.deepEqual(filterBuyers(buyers, ' KURALI '), [buyers[0]]);
  assert.deepEqual(filterBuyers(buyers, 'USER-2'), [buyers[1]]);
  assert.deepEqual(filterBuyers(buyers, ''), buyers);
  assert.deepEqual(filterBuyers(buyers, 'not found'), []);
});
test('buyer editor form preserves existing empty-string fallbacks', () => {
  assert.deepEqual(buyerToForm({ userId: 'user-1', name: null, email: undefined }), {
    name: '', email: '', phone: '', locality: '', address: '', formattedAddress: '',
  });
});
test('AdminPortal delegates buyer tab and editor API operation to extracted feature', () => {
  const portal = read('../src/features/admin/AdminPortal.tsx');
  const tab = read('../src/features/admin/AdminBuyersTab.tsx');
  const hook = read('../src/features/admin/useAdminBuyerEditor.ts');
  assert.match(portal, /<AdminBuyersTab[\s\S]*buyers=\{buyers\}[\s\S]*setBuyers=\{setBuyers\}[\s\S]*showToast=\{showToast\}/);
  assert.doesNotMatch(portal, /const \[(buyerSearch|editingBuyer|buyerForm|buyerSaving|buyerEditError),/);
  assert.doesNotMatch(portal, /adminApi\.updateAdminBuyer\(/);
  assert.match(hook, /adminApi\.updateAdminBuyer\(editingBuyer\.userId, buyerForm\)/);
  assert.ok(tab.includes('role="alert"'));
});
