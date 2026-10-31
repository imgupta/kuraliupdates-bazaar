import type { Order, OrderStatus } from '../types';

export interface BackendOrder {
  orderId?: string;
  id?: string;
  buyerEmail: string;
  buyerName: string;
  buyerPhone: string;
  deliveryAddress: string;
  deliveryLocality: string;
  totalAmount: number;
  discountAmount?: number;
  deliveryFee: number;
  finalPayable?: number;
  paymentMethod: string;
  paymentStatus?: string;
  status?: string;
  deliveryOtp?: string;
  deliveryAgentId?: string;
  sellerId?: string;
  checkoutGroupId?: string;
  fulfilmentStatus?: string;
  checkoutGroupId?: string;
  fulfilmentMode?: 'DELIVERY' | 'STORE_PICKUP';
  deliveryAgent?: any;
  placedAt?: string;
  distanceKm?: number;
  items?: { productId: string; title: string; quantity: number; unitPrice: number; negotiatedPrice?: number; totalPrice: number }[];
}

export const mapBackendOrder = (bo: BackendOrder): Order => ({
  id: bo.orderId || bo.id || '',
  buyerName: bo.buyerName || '',
  buyerPhone: bo.buyerPhone || '',
  buyerEmail: bo.buyerEmail || '',
  deliveryAddress: bo.deliveryAddress || '',
  deliveryLocality: bo.deliveryLocality || 'Kurali',
  items: (bo.items || []) as any,
  sellerId: bo.sellerId || '',
  sellerName: bo.deliveryAgent?.sellerName || '',
  sellerLocality: bo.deliveryAgent?.sellerLocality || bo.deliveryLocality || 'Kurali',
  subtotal: Number((bo as any).subtotal ?? bo.totalAmount ?? 0),
  billDiscountAmount: Number(bo.discountAmount || 0),
  couponDiscountAmount: 0,
  deliveryFee: Number(bo.deliveryFee || 0),
  isFreeDelivery: Number(bo.deliveryFee || 0) === 0,
  totalAmount: Number(bo.finalPayable ?? bo.totalAmount ?? 0),
  paymentMethod: (bo.paymentMethod || 'COD') as Order['paymentMethod'],
  paymentStatus: (bo.paymentStatus || 'pending') as Order['paymentStatus'],
  status: String(bo.status || 'READY_FOR_PICKUP').toLowerCase() as OrderStatus,
  placedAt: bo.placedAt || '',
  deliveryAgentId: bo.deliveryAgentId,
  deliveryOtp: bo.deliveryOtp || '',
  fulfilmentMode: bo.fulfilmentMode || 'DELIVERY',
  checkoutGroupId: bo.checkoutGroupId,
  distanceKm: Number(bo.distanceKm || 0),
  statusUpdates: [],
});
