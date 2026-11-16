export interface AdminDirectoryRow { role: string; name: string; userId: string; profileId: string; contact: string; status: string; }
export interface AdminDirectoryGroup { key: string; userId: string; name: string; contact: string; entries: AdminDirectoryRow[]; statuses: string[]; }
export interface AdminDirectorySources { rootAdminEmail: string; buyers: any[]; sellers: any[]; deliveryAgents: any[]; dailyHelpHelpers: any[]; products: any[]; dailyHelpServices: any[]; }

/** Build account groups from persisted IDs and explicit seller/provider ownership links only. */
export const buildAdminDirectoryGroups = (sources: AdminDirectorySources): AdminDirectoryGroup[] => {
  const { rootAdminEmail, buyers, sellers, deliveryAgents, dailyHelpHelpers, products, dailyHelpServices } = sources;
    const directoryRows: AdminDirectoryRow[] = [
      { role: 'ROOT_ADMIN', name: ROOT_ADMIN_EMAIL, userId: '—', profileId: ROOT_ADMIN_EMAIL, contact: ROOT_ADMIN_EMAIL, status: 'ADMIN' },
      ...buyers.map((item: any) => ({ role: 'BUYER', name: item.name || item.email || item.phone || 'Buyer', userId: item.userId || '—', profileId: item.userId || '—', contact: item.email || item.phone || '—', status: Number(item.isVerified) === 1 ? 'VERIFIED' : 'UNVERIFIED' })),
      ...adminSellers.map((item: any) => ({ role: 'SELLER', name: item.businessName || item.storeName || item.name || item.email || 'Seller', userId: item.userId || item.ownerUserId || '—', profileId: item.sellerId || item.id || '—', contact: item.email || item.phone || '—', status: item.status || 'UNKNOWN' })),
      ...adminDeliveryAgents.map((item: any) => ({ role: 'DELIVERY_AGENT', name: item.fullName || item.name || 'Delivery agent', userId: item.userId || '—', profileId: item.agentId || item.id || '—', contact: item.email || item.phone || '—', status: item.status || 'UNKNOWN' })),
      ...dailyHelpHelpers.map((item: any) => ({ role: 'DAILY_HELP_PROVIDER', name: item.fullName || item.name || 'Daily Help provider', userId: item.userId || '—', profileId: item.professionalId || item.id || '—', contact: item.phone || item.email || '—', status: item.status || (item.verified ? 'VERIFIED' : 'UNVERIFIED') })),
      ...products.map((item: any) => { const sellerId = item.sellerId || item.seller?.sellerId; const seller = adminSellers.find((candidate: any) => String(candidate.sellerId || candidate.id) === String(sellerId)); return { role: 'PRODUCT_FIXTURE', name: item.name || item.title || 'Product', userId: seller?.userId || seller?.ownerUserId || '—', profileId: item.productId || item.id || '—', contact: 'Seller ID: ' + (sellerId || '—'), status: item.status || (Number(item.stock ?? item.stockQty ?? 0) > 0 ? 'IN_STOCK' : 'CHECK_STOCK') }; }),
      ...dailyHelpServices.map((item: any) => ({ role: 'DAILY_HELP_SERVICE', name: item.name || item.category || 'Daily Help service', userId: '—', profileId: item.serviceId || item.id || '—', contact: item.category || '—', status: item.active === true || Number(item.active) === 1 ? 'ACTIVE' : 'INACTIVE' })),
    ];
    const directoryGroups = directoryRows.reduce<AdminDirectoryGroup[]>((groups, item) => {
      // Group all user-owned roles and records under the same account ID. Records without
      // a known owner remain separate rather than being incorrectly assigned to a user.
      const key = item.userId && item.userId !== '—'
        ? 'USER:' + String(item.userId)
        : 'RECORD:' + String(item.role) + ':' + String(item.profileId);
      let group = groups.find(candidate => candidate.key === key);
      if (!group) {
        group = { key, userId: item.userId || '—', name: item.name, contact: item.contact, entries: [], statuses: [] };
        groups.push(group);
      }
      group.entries.push(item);
      if (item.status && !group.statuses.includes(String(item.status).toUpperCase())) group.statuses.push(String(item.status).toUpperCase());
      // Provider profiles should have a persisted USERS link. Surface missing links
      // instead of implying that matching names or emails prove account ownership.
      if (['SELLER', 'DELIVERY_AGENT', 'DAILY_HELP_PROVIDER'].includes(item.role)
        && (!item.userId || item.userId === '—')
        && !group.statuses.includes('ACCOUNT_LINK_MISSING')) {
        group.statuses.push('ACCOUNT_LINK_MISSING');
      }
      if ((!group.name || group.name === '—') && item.name) group.name = item.name;
      if ((!group.contact || group.contact === '—') && item.contact) group.contact = item.contact;
      return groups;
    }, []);
  
  return directoryGroups;
};

export const filterAdminDirectoryGroups = (groups: AdminDirectoryGroup[], search: string): AdminDirectoryGroup[] => {
  const term = search.trim().toLowerCase();
  if (!term) return groups;
  return groups.filter(group =>
    [group.name, group.contact, group.userId, ...group.entries.flatMap(item => [item.role, item.profileId, item.status, item.contact])]
      .some(value => String(value ?? '').toLowerCase().includes(term))
  );
};
