import React, { createContext, useContext, useState } from 'react';
import {
  UserRole,
  Seller,
  Product,
  Coupon,
  DeliveryAgent,
  Order,
} from '../types';
import type { UserProfile } from '../entities/userProfile';
export type { SavedAddress } from '../entities/address';
export type { UserProfile } from '../entities/userProfile';
import {
  INITIAL_SELLERS,
  INITIAL_PRODUCTS,
  INITIAL_COUPONS,
  INITIAL_DELIVERY_AGENTS,
  INITIAL_ORDERS,
  ROOT_ADMIN_EMAIL,
  ADMIN_EMAILS,
  isRootAdminEmail,
} from '../data/initialData';

import type { AppContextType } from './AppContextContract';
import { safeStorageGet, safeStorageJson, safeStorageSet } from '../shared/storage/safeStorage';
import { AuthSessionProvider, useAuthSession } from './AuthSessionContext';
import { usePersistedValue } from './usePersistedValue';
import { useBuyerCommerceState } from './useBuyerCommerceState';
import { useBackendSync } from './useBackendSync';
import { useMarketplaceOperations } from './useMarketplaceOperations';
import { useNegotiationChatState } from './useNegotiationChatState';
import { useBuyerProfileOperations } from './useBuyerProfileOperations';
import { useAuthBootstrap } from './useAuthBootstrap';
import { useAuthOperations } from './useAuthOperations';

const AppContext = createContext<AppContextType | undefined>(undefined);

const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setUser, role, setRoleState, authInitializing, setAuthInitializing } = useAuthSession();

  const [sellers, setSellers] = useState<Seller[]>(() => {
    return safeStorageJson('kurali_sellers', INITIAL_SELLERS);
  });

  const [products, setProducts] = useState<Product[]>(() => {
    return safeStorageJson('kurali_products', INITIAL_PRODUCTS);
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    return safeStorageJson('kurali_coupons', INITIAL_COUPONS);
  });

  const [deliveryAgents, setDeliveryAgents] = useState<DeliveryAgent[]>(() => {
    return safeStorageJson('kurali_delivery_agents', INITIAL_DELIVERY_AGENTS);
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    return safeStorageJson('kurali_orders', INITIAL_ORDERS);
  });

  // UI state
  const [registeredRoles, setRegisteredRoles] = useState<UserRole[]>(['buyer']);
  const [selectedCityLocality, setSelectedCityLocality] = useState('All Localities (Kurali City)');
  const [comparingProduct, setComparingProduct] = useState<Product | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSellerRegisterOpen, setIsSellerRegisterOpen] = useState(false);
  const [isBuyerRegisterOpen, setIsBuyerRegisterOpen] = useState(false);
  const [isDeliveryRegisterOpen, setIsDeliveryRegisterOpen] = useState(false);
  const [isGmailAuthOpen, setIsGmailAuthOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Persist domain state through a focused hook; initialization stays local to this provider.
  usePersistedValue('kurali_role', role, { serialize: false });
  usePersistedValue('kurali_user', user);
  usePersistedValue('kurali_sellers', sellers);
  usePersistedValue('kurali_products', products);
  usePersistedValue('kurali_coupons', coupons);
  usePersistedValue('kurali_delivery_agents', deliveryAgents);
  usePersistedValue('kurali_orders', orders);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const buyerProfile = useBuyerProfileOperations({ user, setUser, showToast });
  const {
    updateUserProfile,
    createBuyerAddress,
    updateBuyerAddress,
    setDefaultBuyerAddress,
    refreshBuyerAddresses,
  } = buyerProfile;

  const buyerCommerce = useBuyerCommerceState(sellers, coupons, showToast);
  const {
    cart, appliedCoupon, addToCart, removeFromCart,
    updateCartQuantity, clearCart, applyCoupon, removeCoupon, cartCalculations,
  } = buyerCommerce;


  // Backend Sync State
  const [backendUrl, setBackendUrlState] = useState<string>(() => {
    return safeStorageGet('kurali_backend_url') || 'https://kuraliupdates-bazaar.onrender.com/api/v1';
  });

  const setBackendUrl = (url: string) => {
    setBackendUrlState(url);
    safeStorageSet('kurali_backend_url', url);
  };

  const [backendStatus, setBackendStatus] = useState<{
    isOnline: boolean;
    status: string;
    database: string;
    lastSynced?: string;
    isLoading: boolean;
    error?: string;
  }>({
    isOnline: false,
    status: 'INITIALIZING',
    database: 'Oracle Cloud Autonomous Database (ap-mumbai-1)',
    isLoading: true,
  });

  const { syncWithBackend } = useBackendSync({
    user,
    setBackendStatus,
    setOrders,
    setProducts,
    setSellers,
    setDeliveryAgents,
  });

  useAuthBootstrap({
    backendUrl,
    syncWithBackend,
    user,
    setUser,
    role,
    setRoleState,
    authInitializing,
    setAuthInitializing,
    setRegisteredRoles,
  });

  // Secure Role Switcher: Admin is strictly restricted to authorized Root Admins
  const setRole = (targetRole: UserRole) => {
    if (!registeredRoles.includes(targetRole)) {
      showToast('This account does not have access to that profile. Register or sign in with an authorized account.', 'error');
      return;
    }
    if (targetRole === 'admin') {
      if (!user.isAdmin) {
        showToast(`Access Restricted: City Admin portal is reserved exclusively for verified Root Admins.`, 'error');
        return;
      }
    }
    setRoleState(targetRole);
  };

  const authOperations = useAuthOperations({
    sellers,
    deliveryAgents,
    user,
    setUser,
    setRoleState,
    refreshBuyerAddresses,
    showToast,
  });
  const { loginWithGoogle, loginWithOtp, registerUserWithOtp, logout, registerBuyer } = authOperations;

  // Current Seller
  const currentSeller = sellers.find(
    s => s.id === user.sellerId || (user.email && s.email.toLowerCase() === user.email.toLowerCase()) || (user.phone && s.phone === user.phone)
  );

  const marketplaceOperations = useMarketplaceOperations({
    setSellers, setProducts, setCoupons,
    deliveryAgents, setDeliveryAgents, orders, setOrders, user, setUser,
    setRoleState, cart, cartCalculations, clearCart, setTrackingOrderId,
    syncWithBackend, showToast,
  });
  const {
    registerSeller, approveSeller, rejectSeller, approveDeliveryAgent, rejectDeliveryAgent,
    updateSeller, addProduct, updateProduct, deleteProduct, addCoupon, deleteCoupon,
    createOrder, updateOrderStatus, claimDeliveryJob, completeDelivery, registerDeliveryAgent,
  } = marketplaceOperations;

  // Keep the public AppContext contract while delegating bargaining behavior to its domain hook.
  const negotiationChat = useNegotiationChatState({ role, user, currentSeller, showToast });
  const { chats, activeChatId, setActiveChatId, openChatForProduct, sendMessage, respondToOffer } = negotiationChat;

  // Current Agent
  const currentAgent = deliveryAgents.find(
    a => a.id === user.deliveryAgentId || (user.email && a.email && a.email.toLowerCase() === user.email.toLowerCase()) || (user.phone && a.phone === user.phone)
  );

  // Seller Actions


  return (
    <AppContext.Provider
      value={{
        role,
        registeredRoles,
        authInitializing,
        setRole,
        user,
        loginWithOtp,
        registerUserWithOtp,
        loginWithGoogle,
        logout,
        updateUserProfile,
        createBuyerAddress,
        updateBuyerAddress,
        setDefaultBuyerAddress,
        registerBuyer,
        sellers,
        currentSeller,
        registerSeller,
        approveSeller,
        rejectSeller,
        approveDeliveryAgent,
        rejectDeliveryAgent,
        updateSeller,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        coupons,
        addCoupon,
        deleteCoupon,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        cartCalculations,
        orders,
        createOrder,
        updateOrderStatus,
        claimDeliveryJob,
        completeDelivery,
        deliveryAgents,
        currentAgent,
        registerDeliveryAgent,
        chats,
        openChatForProduct,
        sendMessage,
        respondToOffer,
        selectedCityLocality,
        setSelectedCityLocality,
        activeChatId,
        setActiveChatId,
        comparingProduct,
        setComparingProduct,
        trackingOrderId,
        setTrackingOrderId,
        isCartOpen,
        setIsCartOpen,
        isSellerRegisterOpen,
        setIsSellerRegisterOpen,
        isBuyerRegisterOpen,
        setIsBuyerRegisterOpen,
        isDeliveryRegisterOpen,
        setIsDeliveryRegisterOpen,
        isGmailAuthOpen,
        setIsGmailAuthOpen,
        toast,
        showToast,
        backendUrl,
        setBackendUrl,
        backendStatus,
        syncWithBackend,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthSessionProvider>
    <AppStateProvider>{children}</AppStateProvider>
  </AuthSessionProvider>
);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
