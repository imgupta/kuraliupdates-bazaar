export interface AdminBuyer {
  userId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  locality?: string | null;
  address?: string | null;
  formattedAddress?: string | null;
  isVerified?: number | string | null;
}
export interface AdminBuyerForm {
  name: string; email: string; phone: string; locality: string; address: string; formattedAddress: string;
}
export const filterBuyers = <T extends AdminBuyer>(buyers: T[], search: string): T[] => {
  const normalizedSearch = search.trim().toLowerCase();
  return buyers.filter(buyer =>
    [buyer.name, buyer.email, buyer.phone, buyer.userId, buyer.locality].some(value =>
      String(value || '').toLowerCase().includes(normalizedSearch)
    )
  );
};
export const buyerToForm = (buyer: AdminBuyer): AdminBuyerForm => ({
  name: buyer.name || '', email: buyer.email || '', phone: buyer.phone || '',
  locality: buyer.locality || '', address: buyer.address || '', formattedAddress: buyer.formattedAddress || '',
});
