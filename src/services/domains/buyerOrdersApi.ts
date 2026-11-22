/** Buyer order API boundary. Server remains authoritative for order creation and status. */
import type { Order } from '../../types';
import { mapBackendOrder, type BackendOrder } from '../../entities/orderMapping';
import { API_BASE_URL } from '../http/apiConfig';
import { groupCheckoutOrders } from '../../entities/orderGrouping';

export class OrderPlacementApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly correlationId: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'OrderPlacementApiError';
  }
}

const createCheckoutCorrelationId = (): string =>
  globalThis.crypto?.randomUUID?.() || `ku-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const buyerOrdersApi = {
  async getBuyerDeliveryEstimate(): Promise<number | null> {
    const token = localStorage.getItem('kurali_auth_token');
    if (!token) return null;
    const response = await fetch(`${API_BASE_URL}/buyers/delivery-estimate`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Unable to load delivery estimate (HTTP ${response.status})`);
    const data = await response.json();
    const minutes = Number(data?.estimatedDeliveryMins ?? 0);
    return Number.isInteger(minutes) && minutes > 0 ? minutes : null;
  },

  async placeOrder(order: Partial<Order>): Promise<any> {
    try {
      const sellerCount = new Set((order.items || []).map(item => item.product.sellerId)).size;
      const endpoint = sellerCount > 1 ? '/buyers/orders/checkout' : '/buyers/orders';
      const items = (order.items || []).map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        negotiatedPrice: item.negotiatedPrice,
        acceptedOfferId: item.acceptedOfferId,
      }));
      const multiSellerPayload = {
        deliveryAddress: order.deliveryAddress,
        deliveryLocality: order.deliveryLocality,
        paymentMethod: order.paymentMethod,
        fulfilmentMode: (order as any).fulfilmentMode || 'DELIVERY',
        deliveryLatitude: (order as any).deliveryLatitude,
        deliveryLongitude: (order as any).deliveryLongitude,
        deliveryPlaceId: (order as any).deliveryPlaceId,
        items,
      };
      const singleSellerPayload = {
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
        distanceKm: Number(order.distanceKm ?? 0),
        deliveryLatitude: (order as any).deliveryLatitude,
        deliveryLongitude: (order as any).deliveryLongitude,
        deliveryPlaceId: (order as any).deliveryPlaceId,
        items,
      };
      const requestBody = JSON.stringify(sellerCount > 1 ? multiSellerPayload : singleSellerPayload);
      const fingerprintSource = `${endpoint}|${requestBody}`;
      let fingerprint = 2166136261;
      for (let i = 0; i < fingerprintSource.length; i++) fingerprint = Math.imul(fingerprint ^ fingerprintSource.charCodeAt(i), 16777619);
      const storageKey = `ku-checkout-idem:${(fingerprint >>> 0).toString(16)}`;
      const idempotencyKey = sessionStorage.getItem(storageKey)
        || `ku-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(storageKey, idempotencyKey);
      const correlationId = createCheckoutCorrelationId();\n      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Idempotency-Key': idempotencyKey, 'X-Correlation-ID': correlationId, ...(localStorage.getItem('kurali_auth_token') ? { Authorization: `Bearer ${localStorage.getItem('kurali_auth_token')}` } : {}) },
        body: requestBody,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      sessionStorage.removeItem(storageKey);
      return result;
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
      return groupCheckoutOrders(data.map(order => mapBackendOrder(order)));
    } catch (err) {
      console.warn('Backend getMyOrders request failed:', err);
      return null;
    }
  },

  async cancelOrder(orderId: string): Promise<void> {
    const token = localStorage.getItem('kurali_auth_token');
    if (!token) throw new Error('Please sign in again to cancel this order.');
    const response = await fetch(`${API_BASE_URL}/buyers/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof body?.message === 'string' ? body.message : `Unable to cancel order (HTTP ${response.status}).`);
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
