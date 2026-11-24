export interface AdminOrderForm {
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  deliveryAddress: string;
  deliveryLocality: string;
}
export const filterAdminOrders = <T extends Record<string, any>>(orders: T[], search: string, statusFilter: string): T[] => {
  const normalizedSearch = search.trim().toLowerCase();
  return orders.filter(order =>
    (!statusFilter || String(order.status).toUpperCase() === statusFilter) &&
    [order.orderId, order.buyerName, order.buyerPhone, order.buyerEmail, order.sellerName].some(value =>
      String(value || '').toLowerCase().includes(normalizedSearch)
    )
  );
};
export const orderToForm = (order: Record<string, any>): AdminOrderForm => ({
  buyerName: order.buyerName || '',
  buyerPhone: order.buyerPhone || '',
  buyerEmail: order.buyerEmail || '',
  deliveryAddress: order.deliveryAddress || '',
  deliveryLocality: order.deliveryLocality || '',
});
export const parseOrderQuantity = (raw: string): number => {
  const quantity = Number(raw);
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Enter a positive whole-number quantity.');
  return quantity;
};
export const formatAdminOrderHistory = (rows: any[]): string =>
  rows.length ? rows.map((r: any) => String(r.OCCURRED_AT) + " · " + r.EVENT_TYPE + " · " + r.ACTOR_EMAIL + "\n" + r.DETAILS).join("\n\n") : "No admin history recorded yet.";
export const formatAdminOrderNotes = (rows: any[]): string =>
  rows.length ? rows.map((r: any) => String(r.CREATED_AT) + " · " + r.CREATED_BY + "\n" + r.NOTE_TEXT).join("\n\n") : "No internal notes.";
export const formatAdminOrderRefunds = (rows: any[]): string =>
  rows.length ? rows.map((r: any) => r.REFUND_ID + " · ₹" + r.AMOUNT + " · " + r.STATUS + " · " + (r.TRANSACTION_REFERENCE || "No reference")).join("\n") : "No refund requests.";
