import React, { createContext, useContext } from 'react';
import { UserRole } from '../types';
import type { UserProfile } from '../entities/userProfile';
export type { SavedAddress } from '../entities/address';
export type { UserProfile } from '../entities/userProfile';
import type { AppContextType } from './AppContextContract';
import { AuthSessionProvider, useAuthSession } from './AuthSessionContext';
import { usePersistedValue } from './usePersistedValue';
import { useBuyerCommerceState } from './useBuyerCommerceState';
import { useMarketplaceOperations } from './useMarketplaceOperations';
import { useNegotiationChatState } from './useNegotiationChatState';
import { useBuyerProfileOperations } from './useBuyerProfileOperations';
import { useAuthOperations } from './useAuthOperations';
import { useBackendConnection } from './useBackendConnection';
import { useMarketplaceCollections } from './useMarketplaceCollections';
import { usePortalUiState } from './usePortalUiState';

const AppContext = createContext<AppContextType | undefined>(undefined);

const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setUser, role, setRoleState, authInitializing, setAuthInitializing } = useAuthSession();

  const {
    sellers, setSellers,
    products, setProducts,
    coupons, setCoupons,
    deliveryAgents, setDeliveryAgents,
    orders, setOrders,
  } = useMarketplaceCollections();

  const {
    registeredRoles, setRegisteredRoles,
    selectedCityLocality, setSelectedCityLocality,
    comparingProduct, setComparingProduct,
    trackingOrderId, setTrackingOrderId,
    isCartOpen, setIsCartOpen,
    isSellerRegisterOpen, setIsSellerRegisterOpen,
    isBuyerRegisterOpen, setIsBuyerRegisterOpen,
    isDeliveryRegisterOpen, setIsDeliveryRegisterOpen,
    isGmailAuthOpen, setIsGmailAuthOpen,
    toast, showToast,
  } = usePortalUiState();

  // Keep authentication persistence and session semantics centralized here.
  usePersistedValue('kurali_role', role, { serialize: false });
  usePersistedValue('kurali_user', user);

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


  const { backendUrl, setBackendUrl, backendStatus, syncWithBackend } = useBackendConnection({
    user,
    setUser,
    role,
    setRoleState,
    authInitializing,
    setAuthInitializing,
    setRegisteredRoles,
    setOrders,
    setProducts,
    setSellers,
    setDeliveryAgents,
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
