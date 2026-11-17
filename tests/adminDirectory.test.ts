import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAdminDirectoryGroups, filterAdminDirectoryGroups } from '../src/features/admin/adminDirectory';

test('admin directory groups records only by persisted user IDs', () => {
  const groups = buildAdminDirectoryGroups({
    rootAdminEmail: 'root@example.com',
    buyers: [{ userId: 'u1', name: 'Buyer', email: 'buyer@example.com', isVerified: 1 }],
    sellers: [{ sellerId: 's1', userId: 'u1', storeName: 'Shop', status: 'APPROVED' }, { sellerId: 's2', storeName: 'Unlinked', status: 'PENDING' }],
    deliveryAgents: [{ agentId: 'd1', userId: 'u1', name: 'Rider', status: 'ACTIVE' }],
    dailyHelpHelpers: [{ professionalId: 'p1', name: 'Helper', phone: '9999999999', status: 'OFFLINE' }],
    products: [{ productId: 'prod1', name: 'Milk', sellerId: 's1', stock: 3 }],
    dailyHelpServices: [{ serviceId: 'svc1', name: 'Cleaning', active: 1 }],
  });
  const linked = groups.find(group => group.userId === 'u1');
  assert.ok(linked);
  assert.deepEqual(linked.entries.map(entry => entry.role), ['BUYER', 'SELLER', 'DELIVERY_AGENT', 'PRODUCT_FIXTURE']);
  assert.ok(groups.some(group => group.statuses.includes('ACCOUNT_LINK_MISSING')));
  assert.ok(groups.some(group => group.key === 'RECORD:DAILY_HELP_SERVICE:svc1'));
});

test('admin directory search matches related IDs and is case-insensitive', () => {
  const groups = buildAdminDirectoryGroups({
    rootAdminEmail: 'root@example.com', buyers: [], sellers: [], deliveryAgents: [],
    dailyHelpHelpers: [], products: [{ productId: 'p-123', name: 'Fresh milk', sellerId: 'unknown' }],
    dailyHelpServices: [],
  });
  assert.equal(filterAdminDirectoryGroups(groups, 'P-123').length, 1);
  assert.equal(filterAdminDirectoryGroups(groups, 'missing').length, 0);
  assert.equal(filterAdminDirectoryGroups(groups, '  ').length, groups.length);
});
