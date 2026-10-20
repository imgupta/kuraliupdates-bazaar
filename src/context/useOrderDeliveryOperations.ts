import type { Dispatch, SetStateAction } from 'react';
import type { CartItem, DeliveryAgent, Order, OrderStatus, UserRole } from '../types';
import type { UserProfile } from '../entities/userProfile';
import { bazaarApi } from '../services/api';
import { deliveryApi } from '../services/domains/deliveryApi';

type OrderDeliveryOperationsOptions = {
  deliveryAgents: DeliveryAgent[];
  setDeliveryAgents: Dispatch<SetStateAction<DeliveryAgent[]>>;
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  user: UserProfile;
  setUser: Dispatch<SetStateAction<UserProfile>>;
  setRoleState: Dispatch<SetStateAction<UserRole>>;
  cart: CartItem[];
  cartCalculations: {
    itemSubtotal: number;
    totalBillDiscount: number;
    couponDiscount: number;
    deliveryFee: number;
    isFreeDelivery: boolean;
    finalTotal: number;
  };
  clearCart: () => void;
  setTrackingOrderId: Dispatch<SetStateAction<string | null>>;
  syncWithBackend: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
};

export const useOrderDeliveryOperations = ({
  deliveryAgents, setDeliveryAgents, orders, setOrders, user, setUser, setRoleState,
  cart, cartCalculations, clearCart, setTrackingOrderId, syncWithBackend, showToast,
}: OrderDeliveryOperationsOptions) => {
  const createOrder = async (orderData: {
    buyerName?: string;
    buyerPhone?: string;
    deliveryAddress: string;
    deliveryLocality?: string;
    deliveryPhone?: string;
    customerNotes?: string;
    paymentMethod: 'COD' | 'UPI' | 'StorePay' | 'Card' | 'NetBanking';
  }): Promise<Order | null> => {
    if (cart.length === 0) return null;
    const sellerIds = Array.from(new Set(cart.map(item => item.product.sellerId)));
    if (sellerIds.length !== 1) {
      showToast('Please place separate orders for products from different stores.', 'error');
      return null;
    }

    const newOrder: Order = {
      id: '',
      buyerName: orderData.buyerName || user.name || 'Local Shopper',
      buyerEmail: user.email || '',
      buyerPhone: orderData.deliveryPhone || orderData.buyerPhone || user.phone || '',
      deliveryAddress: orderData.deliveryAddress,
      deliveryLocality: orderData.deliveryLocality || user.locality || 'Main Bazaar',
      sellerId: sellerIds[0],
      sellerName: cart[0].product.sellerName,
      sellerLocality: cart[0].product.sellerLocality,
      sellerIds,
      sellerNames: [cart[0].product.sellerName],
      items: cart.map(item => ({ ...item })),
      subtotal: cartCalculations.itemSubtotal,
      itemSubtotal: cartCalculations.itemSubtotal,
      billDiscountAmount: cartCalculations.totalBillDiscount,
      billDiscount: cartCalculations.totalBillDiscount,
      couponDiscountAmount: cartCalculations.couponDiscount,
      couponDiscount: cartCalculations.couponDiscount,
      deliveryFee: cartCalculations.deliveryFee,
      isFreeDelivery: cartCalculations.isFreeDelivery,
      totalAmount: cartCalculations.finalTotal,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: 'pending',
      status: 'placed',
      deliveryOtp: '',
      placedAt: new Date().toISOString(),
      estimatedDeliveryTime: '30-45 mins (Local Express)',
      distanceKm: 1.4,
      deliveryLatitude: user.latitude,
      deliveryLongitude: user.longitude,
      deliveryPlaceId: user.placeId,
      statusUpdates: [{ status: 'placed', timestamp: new Date().toISOString(), note: 'Order placed by buyer.' }],
      customerNotes: orderData.customerNotes,
    };

    const response = await bazaarApi.placeOrder(newOrder);
    const serverOrder = response?.order;
    if (!serverOrder?.orderId) {
      showToast('Order was not confirmed by the server. Your cart has been kept; please retry after checking order history.', 'error');
      return null;
    }

    const confirmed: Order = {
      ...newOrder,
      id: serverOrder.orderId,
      subtotal: Number(serverOrder.subtotal ?? newOrder.subtotal),
      itemSubtotal: Number(serverOrder.subtotal ?? newOrder.itemSubtotal),
      billDiscountAmount: Number(serverOrder.billDiscountAmount ?? 0),
      couponDiscountAmount: Number(serverOrder.couponDiscountAmount ?? 0),
      deliveryFee: Number(serverOrder.deliveryFee ?? 0),
      isFreeDelivery: Number(serverOrder.isFreeDelivery) === 1,
      totalAmount: Number(serverOrder.totalAmount ?? newOrder.totalAmount),
      paymentStatus: String(serverOrder.paymentStatus || 'PENDING_COD').toLowerCase() as Order['paymentStatus'],
      status: String(serverOrder.status || 'PLACED').toLowerCase() as OrderStatus,
    };
    setOrders(prev => [confirmed, ...prev.filter(order => order.id !== confirmed.id)]);
    clearCart();
    setTrackingOrderId(confirmed.id);
    showToast(`Order #${confirmed.id} placed successfully!`, 'success');
    return confirmed;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus, note?: string) => {
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id !== orderId) return ord;

  return { createOrder, updateOrderStatus, claimDeliveryJob, completeDelivery, registerDeliveryAgent };
};
