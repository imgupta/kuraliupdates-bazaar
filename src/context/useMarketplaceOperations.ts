import type { Dispatch, SetStateAction } from 'react';
import type { Coupon, CartItem, DeliveryAgent, Order, Product, Seller, UserRole } from '../types';
import type { UserProfile } from '../entities/userProfile';
import { useSellerAdminOperations } from './useSellerAdminOperations';
import { useOrderDeliveryOperations } from './useOrderDeliveryOperations';

type MarketplaceOperationsOptions = {
  setSellers: Dispatch<SetStateAction<Seller[]>>;
  setProducts: Dispatch<SetStateAction<Product[]>>;
  setCoupons: Dispatch<SetStateAction<Coupon[]>>;
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

export const useMarketplaceOperations = (options: MarketplaceOperationsOptions) => {
  const sellerAdmin = useSellerAdminOperations({
    setSellers: options.setSellers,
    setProducts: options.setProducts,
    setCoupons: options.setCoupons,
    setDeliveryAgents: options.setDeliveryAgents,
    setUser: options.setUser,
    setRoleState: options.setRoleState,
    showToast: options.showToast,
  });
  const orderDelivery = useOrderDeliveryOperations({
    deliveryAgents: options.deliveryAgents,
    setDeliveryAgents: options.setDeliveryAgents,
    orders: options.orders,
    setOrders: options.setOrders,
    user: options.user,
    setUser: options.setUser,
    setRoleState: options.setRoleState,
    cart: options.cart,
    cartCalculations: options.cartCalculations,
    clearCart: options.clearCart,
    setTrackingOrderId: options.setTrackingOrderId,
    syncWithBackend: options.syncWithBackend,
    showToast: options.showToast,
  });
  return { ...sellerAdmin, ...orderDelivery };
};
