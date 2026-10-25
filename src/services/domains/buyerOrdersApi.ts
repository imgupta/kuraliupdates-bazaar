/** Buyer order API boundary. Server remains authoritative for order creation and status. */
import type { Order } from '../../types';
import { mapBackendOrder, type BackendOrder } from '../../entities/orderMapping';
import { API_BASE_URL } from '../http/apiConfig';

export const buyerOrdersApi = {
  async placeOrder(order: Partial<Order>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/buyers/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(localStorage.getItem('kurali_auth_token') ? { Authorization: `Bearer ${localStorage.getItem('kurali_auth_token')}` } : {}) },
        body: JSON.stringify({
          buyerName: order.buyerName,
          buyerEmail: order.buyerEmail,
          buyerPhone: order.buyerPhone,
          deliveryAddress: order.deliveryAddress,
          deliveryLocality: order.deliveryLocality,
          sellerId: order.sellerId,
          subtotal: order.itemSubtotal || order.subtotal || order.totalAmount,
          totalAmount: order.totalAmount,
          discountAmount: (order.billDiscountAmount || 0) + (order.couponDiscountAmount || 0),
          deliveryFee: order.deliveryFee,
          finalPayable: order.totalAmount,
          paymentMethod: order.paymentMethod,
          distanceKm: order.distanceKm || 1.5,
          deliveryLatitude: (order as any).deliveryLatitude,
          deliveryLongitude: (order as any).deliveryLongitude,
          deliveryPlaceId: (order as any).deliveryPlaceId,
          items: (order.items || []).map(item => ({ productId: item.product.id, quantity: item.quantity, negotiatedPrice: item.negotiatedPrice, acceptedOfferId: item.acceptedOfferId })),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend placeOrder failed:', err);
      return null;
    }
  },

  async getMyOrders(): Promise<Order[] | null> {
    const token = localStorage.getItem('kurali_auth_token');
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/buyers/me/orders`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BackendOrder[] = await res.json();
      return data.map(order => mapBackendOrder(order));
    } catch (err) {
      console.warn('Backend getMyOrders request failed:', err);
      return null;
    }
  },

  async trackOrder(orderId: string): Promise<any> {
    try {
      const token = localStorage.getItem('kurali_auth_token');
      const res = await fetch(`${API_BASE_URL}/buyers/orders/${encodeURIComponent(orderId)}/track`, {
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend trackOrder failed:', err);
      return null;
    }
  },
};
