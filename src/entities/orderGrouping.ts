import type { Order, OrderStatus } from '../types';

const STATUS_RANK: Record<OrderStatus, number> = {
  placed: 0, accepted_by_seller: 1, ready_for_pickup: 2,
  assigned_to_delivery: 3, picked_up: 4, out_for_delivery: 5,
  delivered: 6, cancelled: -1,
};

/** One checkout group is one buyer-facing order and one rider-facing job. */
export const groupCheckoutOrders = (orders: Order[]): Order[] => {
  const groups = new Map<string, Order[]>();
  const standalone: Order[] = [];
  for (const order of orders) {
    if (order.checkoutGroupId && order.fulfilmentMode !== 'STORE_PICKUP') {
      const group = groups.get(order.checkoutGroupId) || [];
      group.push(order);
      groups.set(order.checkoutGroupId, group);
    } else standalone.push(order);
  }

  const grouped: Order[] = [...groups.entries()].map(([checkoutGroupId, children]) => {
    const sorted = [...children].sort((a,b) => new Date(a.placedAt || 0).getTime() - new Date(b.placedAt || 0).getTime() || a.id.localeCompare(b.id));
    const first = sorted[0];
    const status = sorted.reduce((least, current) =>
      STATUS_RANK[current.status] < STATUS_RANK[least] ? current.status : least, first.status);
    const sellerIds = [...new Set(sorted.map(order => order.sellerId).filter(Boolean))];
    const sellerNames = [...new Set(sorted.map(order => order.sellerName).filter(Boolean))];
    return {
      ...first,
      id: checkoutGroupId,
      trackingOrderId: first.trackingOrderId || first.id,
      checkoutGroupId,
      checkoutGroupOrderIds: sorted.map(order => order.id),
      checkoutGroupOrders: sorted,
      sellerIds,
      sellerNames,
      sellerName: sellerNames.join(', ') || (sorted.length + ' stores'),
      sellerLocality: sorted.map(order => order.sellerLocality).filter(Boolean).join(' · '),
      items: sorted.flatMap(order => order.items || []),
      subtotal: sorted.reduce((sum, order) => sum + Number(order.subtotal || 0), 0),
      itemSubtotal: sorted.reduce((sum, order) => sum + Number(order.itemSubtotal ?? order.subtotal ?? 0), 0),
      billDiscountAmount: sorted.reduce((sum, order) => sum + Number(order.billDiscountAmount || 0), 0),
      couponDiscountAmount: sorted.reduce((sum, order) => sum + Number(order.couponDiscountAmount || 0), 0),
      deliveryFee: sorted.reduce((sum, order) => sum + Number(order.deliveryFee || 0), 0),
      totalAmount: sorted.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
      isFreeDelivery: sorted.every(order => order.isFreeDelivery),
      status,
      deliveryAgentId: sorted.find(order => order.deliveryAgentId)?.deliveryAgentId,
      deliveryOtp: sorted.find(order => order.deliveryOtp)?.deliveryOtp || '',
      distanceKm: sorted.reduce((sum, order) => sum + Number(order.distanceKm || 0), 0),
      fulfilmentMode: 'DELIVERY',
    };
  });
  return [...grouped, ...standalone].sort((a,b) =>
    new Date(b.placedAt || 0).getTime() - new Date(a.placedAt || 0).getTime());
};
