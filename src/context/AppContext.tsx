import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserRole,
  Seller,
  Product,
  CartItem,
  Coupon,
  DeliveryAgent,
  Order,
  OrderStatus,
  NegotiationChat,
  ChatMessage,
  BargainOffer,
} from '../types';
import { bazaarApi } from '../services/api';
import {
  INITIAL_SELLERS,
  INITIAL_PRODUCTS,
  INITIAL_COUPONS,
  INITIAL_DELIVERY_AGENTS,
  INITIAL_ORDERS,
  INITIAL_CHATS,
  ROOT_ADMIN_EMAIL,
  ADMIN_EMAILS,
  isRootAdminEmail,
} from '../data/initialData';

export interface UserProfile {
  email: string;
  name: string;
  avatarUrl: string;
  phone: string;
  locality: string;
  address?: string;
  sellerId?: string;
  deliveryAgentId?: string;
  role: UserRole;
  isSignedIn: boolean;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  authMethod?: 'otp' | 'google';
}

interface AppContextType {
  // Roles & Auth
  role: UserRole;
  setRole: (role: UserRole) => void;
  user: UserProfile;
  loginWithOtp: (params: {
    email: string;
    phone: string;
    name?: string;
    targetRole?: UserRole;
    locality?: string;
    address?: string;
    token?: string;
  }) => { success: boolean; message: string; role: UserRole };
  registerUserWithOtp: (params: {
    name: string;
    email: string;
    phone: string;
    locality: string;
    role: UserRole;
    address?: string;
    token?: string;
  }) => { success: boolean; message: string; role: UserRole };
  loginWithGoogle: (
    email: string,
    name: string,
    targetRole: UserRole,
    phone?: string,
    locality?: string,
    address?: string
  ) => void;
  logout: () => void;
  registerBuyer: (data: { name: string; email: string; phone: string; locality: string; address: string }) => void;

  // Sellers
  sellers: Seller[];
  currentSeller: Seller | undefined;
  registerSeller: (sellerData: Omit<Seller, 'id' | 'status' | 'rating' | 'reviewCount' | 'registeredAt'>) => void;
  approveSeller: (sellerId: string) => void;
  rejectSeller: (sellerId: string) => void;
  updateSeller: (sellerId: string, updates: Partial<Seller>) => void;

  // Products
  products: Product[];
  addProduct: (productData: Omit<Product, 'id' | 'rating' | 'reviewCount' | 'isAvailable'>) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;

  // Coupons
  coupons: Coupon[];
  addCoupon: (coupon: Coupon) => void;
  deleteCoupon: (code: string) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, negotiatedPrice?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  cartCalculations: {
    itemSubtotal: number;
    subtotal: number;
    couponDiscount: number;
    billDiscounts: { sellerId: string; sellerName: string; amount: number; description: string }[];
    totalBillDiscount: number;
    billDiscount: number;
    deliveryFee: number;
    isFreeDelivery: boolean;
    freeDeliveryThresholdRemaining: number;
    amountNeededForFreeDelivery: number;
    freeDeliveryThreshold: number;
    activeSeller?: Seller;
    finalTotal: number;
  };

  // Orders
  orders: Order[];
  createOrder: (orderData: {
    buyerName?: string;
    buyerPhone?: string;
    deliveryAddress: string;
    deliveryLocality?: string;
    deliveryPhone?: string;
    customerNotes?: string;
    paymentMethod: 'COD' | 'UPI' | 'StorePay' | 'Card' | 'NetBanking';
  }) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => void;

  // Delivery
  claimDeliveryJob: (orderId: string, agentId: string) => void;
  completeDelivery: (orderId: string, otp: string) => { success: boolean; message: string };
  deliveryAgents: DeliveryAgent[];
  currentAgent: DeliveryAgent | undefined;
  registerDeliveryAgent: (
    agentData: Omit<DeliveryAgent, 'id' | 'status' | 'rating' | 'totalTrips' | 'todayEarnings' | 'totalEarnings' | 'registeredAt'>
  ) => void;

  // Bargaining & Negotiation Chat
  chats: NegotiationChat[];
  openChatForProduct: (product: Product, startingOfferPrice?: number) => string;
  sendMessage: (chatId: string, text: string, offer?: BargainOffer) => void;
  respondToOffer: (
    chatId: string,
    offerId: string,
    action: 'accept' | 'reject' | 'counter',
    counterPrice?: number
  ) => void;

  // Active filters and Modals
  selectedCityLocality: string;
  setSelectedCityLocality: (locality: string) => void;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  comparingProduct: Product | null;
  setComparingProduct: (p: Product | null) => void;
  trackingOrderId: string | null;
  setTrackingOrderId: (id: string | null) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isSellerRegisterOpen: boolean;
  setIsSellerRegisterOpen: (open: boolean) => void;
  isBuyerRegisterOpen: boolean;
  setIsBuyerRegisterOpen: (open: boolean) => void;
  isDeliveryRegisterOpen: boolean;
  setIsDeliveryRegisterOpen: (open: boolean) => void;
  isGmailAuthOpen: boolean;
  setIsGmailAuthOpen: (open: boolean) => void;

  // Toast / Alerts
  toast: { message: string; type: 'success' | 'info' | 'error' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;

  // Backend & Oracle DB Sync
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  backendStatus: {
    isOnline: boolean;
    status: string;
    database: string;
    lastSynced?: string;
    isLoading: boolean;
    error?: string;
  };
  syncWithBackend: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load state from localStorage or fallback
  const [role, setRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem('kurali_role') as UserRole) || 'buyer';
  });

  const [user, setUser] = useState<UserProfile>(() => {
    const session = localStorage.getItem('kurali_auth_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.isSignedIn && parsed.email && parsed.phone) {
          return parsed;
        }
      } catch (e) {
        /* ignore */
      }
    }
    return {
      email: '',
      name: '',
      avatarUrl: '',
      phone: '',
      locality: 'Main Bazaar & Clock Tower',
      role: 'buyer',
      isSignedIn: false,
      phoneVerified: false,
      emailVerified: false,
    };
  });

  const [sellers, setSellers] = useState<Seller[]>(() => {
    const saved = localStorage.getItem('kurali_sellers');
    return saved ? JSON.parse(saved) : INITIAL_SELLERS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('kurali_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const saved = localStorage.getItem('kurali_coupons');
    return saved ? JSON.parse(saved) : INITIAL_COUPONS;
  });

  const [deliveryAgents, setDeliveryAgents] = useState<DeliveryAgent[]>(() => {
    const saved = localStorage.getItem('kurali_delivery_agents');
    return saved ? JSON.parse(saved) : INITIAL_DELIVERY_AGENTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('kurali_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [chats, setChats] = useState<NegotiationChat[]>(() => {
    const saved = localStorage.getItem('kurali_chats');
    return saved ? JSON.parse(saved) : INITIAL_CHATS;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('kurali_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(() => {
    const saved = localStorage.getItem('kurali_applied_coupon');
    return saved ? JSON.parse(saved) : null;
  });

  // UI state
  const [selectedCityLocality, setSelectedCityLocality] = useState('All Localities (Kurali City)');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [comparingProduct, setComparingProduct] = useState<Product | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSellerRegisterOpen, setIsSellerRegisterOpen] = useState(false);
  const [isBuyerRegisterOpen, setIsBuyerRegisterOpen] = useState(false);
  const [isDeliveryRegisterOpen, setIsDeliveryRegisterOpen] = useState(false);
  const [isGmailAuthOpen, setIsGmailAuthOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem('kurali_role', role);
  }, [role]);

  useEffect(() => {
    localStorage.setItem('kurali_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('kurali_sellers', JSON.stringify(sellers));
  }, [sellers]);

  useEffect(() => {
    localStorage.setItem('kurali_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('kurali_coupons', JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    localStorage.setItem('kurali_delivery_agents', JSON.stringify(deliveryAgents));
  }, [deliveryAgents]);

  useEffect(() => {
    localStorage.setItem('kurali_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('kurali_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('kurali_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem('kurali_applied_coupon', JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem('kurali_applied_coupon');
    }
  }, [appliedCoupon]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Backend Sync State
  const [backendUrl, setBackendUrlState] = useState<string>(() => {
    return localStorage.getItem('kurali_backend_url') || 'https://kuraliupdates-bazaar.onrender.com/api/v1';
  });

  const setBackendUrl = (url: string) => {
    setBackendUrlState(url);
    localStorage.setItem('kurali_backend_url', url);
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

  const syncWithBackend = async () => {
    setBackendStatus(prev => ({ ...prev, isLoading: true, error: undefined }));
    try {
      const health = await bazaarApi.checkHealth();
      const isOnline = health.status === 'UP';
      setBackendStatus({
        isOnline,
        status: health.status || (isOnline ? 'UP' : 'STANDALONE'),
        database: health.database || 'Oracle Autonomous Database Connected',
        lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isLoading: false,
      });

      // Synchronize Products from Oracle DB
      const remoteProducts = await bazaarApi.searchProducts();
      if (remoteProducts && remoteProducts.length > 0) {
        setProducts(prev => {
          const remoteIds = new Set(remoteProducts.map(p => p.id));
          const localRemaining = prev.filter(p => !remoteIds.has(p.id));
          return [...remoteProducts, ...localRemaining];
        });
      }

      // Synchronize Available Delivery Jobs from Oracle DB if in delivery role
      const availableJobs = await bazaarApi.getAvailableDeliveryJobs();
      if (availableJobs && availableJobs.length > 0) {
        console.log(`Synced ${availableJobs.length} delivery jobs from Oracle DB`);
      }
    } catch (err: any) {
      console.warn('Backend sync failed:', err);
      setBackendStatus(prev => ({
        ...prev,
        isOnline: false,
        status: 'STANDALONE',
        isLoading: false,
        error: err.message,
      }));
    }
  };

  useEffect(() => {
    syncWithBackend();
    const interval = setInterval(syncWithBackend, 45000);

    // Live session token check against Oracle DB / Spring Boot backend
    const savedToken = localStorage.getItem('kurali_auth_token');
    if (savedToken) {
      bazaarApi.getMe(savedToken).then(res => {
        if (res.authenticated && res.user) {
          const u = res.user;
          const isRoot = isRootAdminEmail(u.email);
          const effectiveRole: UserRole = isRoot ? 'admin' : (u.role?.toLowerCase() as UserRole) || 'buyer';
          setUser(prev => ({
            ...prev,
            email: u.email,
            name: u.name,
            phone: u.phone,
            locality: u.locality || prev.locality,
            address: u.address || prev.address,
            role: effectiveRole,
            isSignedIn: true,
            phoneVerified: true,
            emailVerified: true,
          }));
          setRoleState(effectiveRole);
        }
      });
    }

    return () => clearInterval(interval);
  }, [backendUrl]);

  // Secure Role Switcher: Admin is strictly restricted to authorized Root Admins
  const setRole = (targetRole: UserRole) => {
    if (targetRole === 'admin') {
      if (!isRootAdminEmail(user.email)) {
        showToast(`Access Restricted: City Admin portal is reserved exclusively for verified Root Admins.`, 'error');
        return;
      }
    }
    setRoleState(targetRole);
  };

  // OTP-Based Authentication (Email & Phone Verified)
  const loginWithOtp = (params: {
    email: string;
    phone: string;
    name?: string;
    targetRole?: UserRole;
    locality?: string;
    address?: string;
    token?: string;
  }) => {
    const trimmedEmail = params.email.trim().toLowerCase();
    const isRoot = isRootAdminEmail(trimmedEmail);

    const existingSeller = sellers.find(
      s => s.email.toLowerCase() === trimmedEmail || s.phone.replace(/\D/g, '') === params.phone.replace(/\D/g, '')
    );
    const existingAgent = deliveryAgents.find(
      a => (a.email || '').toLowerCase() === trimmedEmail || a.phone.replace(/\D/g, '') === params.phone.replace(/\D/g, '')
    );

    let effectiveRole: UserRole = isRoot
      ? 'admin'
      : existingSeller
      ? 'seller'
      : existingAgent
      ? 'delivery'
      : params.targetRole || 'buyer';

    const displayName = params.name || existingSeller?.ownerName || existingAgent?.name || trimmedEmail.split('@')[0];

    const updatedUser: UserProfile = {
      email: trimmedEmail,
      name: displayName,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=0284c7,f59e0b,10b981`,
      phone: params.phone,
      locality: params.locality || existingSeller?.locality || existingAgent?.currentLocality || 'Main Bazaar & Clock Tower',
      address: params.address || existingSeller?.address || '',
      sellerId: existingSeller?.id,
      deliveryAgentId: existingAgent?.id,
      role: effectiveRole,
      isSignedIn: true,
      phoneVerified: true,
      emailVerified: true,
      authMethod: 'otp',
    };

    setUser(updatedUser);
    setRoleState(effectiveRole);
    localStorage.setItem('kurali_auth_session', JSON.stringify(updatedUser));
    if (params.token) {
      localStorage.setItem('kurali_auth_token', params.token);
    }

    return {
      success: true,
      message: isRoot
        ? `Root Administrator Verified via OTP! Welcome ${displayName}.`
        : `Verified via OTP as ${effectiveRole.toUpperCase()}! Welcome to KuraliUpdates Bazaar.`,
      role: effectiveRole,
    };
  };

  // Register Citizen / Merchant / Rider with OTP Verification
  const registerUserWithOtp = (params: {
    name: string;
    email: string;
    phone: string;
    locality: string;
    role: UserRole;
    address?: string;
    token?: string;
  }) => {
    const trimmedEmail = params.email.trim().toLowerCase();
    const isRoot = isRootAdminEmail(trimmedEmail);
    const effectiveRole: UserRole = isRoot ? 'admin' : params.role;

    let sellerId: string | undefined = undefined;
    let deliveryAgentId: string | undefined = undefined;

    if (effectiveRole === 'seller') {
      const newSellerId = `seller-${Date.now()}`;
      sellerId = newSellerId;
      const newSeller: Seller = {
        id: newSellerId,
        name: `${params.name}'s Shop`,
        ownerName: params.name,
        email: trimmedEmail,
        phone: params.phone,
        category: 'Groceries & Daily Essentials',
        locality: params.locality,
        address: params.address || `${params.locality}, Kurali`,
        distanceKm: 1.0,
        rating: 5.0,
        reviewCount: 0,
        status: 'pending',
        registeredAt: new Date().toISOString(),
        bannerUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(params.name)}&backgroundColor=0284c7,f59e0b,10b981`,
        description: `Verified retail store registered in ${params.locality}, Kurali.`,
        minOrderForFreeDelivery: 499,
        baseDeliveryFee: 35,
        billDiscounts: [],
      };
      setSellers(prev => [newSeller, ...prev]);
      bazaarApi.registerSeller(newSeller);
    } else if (effectiveRole === 'delivery') {
      const newAgentId = `agent-${Date.now()}`;
      deliveryAgentId = newAgentId;
      const newAgent: DeliveryAgent = {
        id: newAgentId,
        name: params.name,
        email: trimmedEmail,
        phone: params.phone,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(params.name)}&backgroundColor=0284c7,f59e0b,10b981`,
        vehicleType: 'Bike',
        vehicleNumber: 'PB 65 TR 1001',
        licenseNumber: 'PB-65-2026-ACTIVE',
        status: 'active',
        rating: 5.0,
        totalTrips: 0,
        todayEarnings: 0,
        totalEarnings: 0,
        currentLocality: params.locality,
        registeredAt: new Date().toISOString(),
      };
      setDeliveryAgents(prev => [newAgent, ...prev]);
      bazaarApi.registerDeliveryAgent(newAgent);
    }

    const updatedUser: UserProfile = {
      email: trimmedEmail,
      name: params.name,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(params.name)}&backgroundColor=0284c7,f59e0b,10b981`,
      phone: params.phone,
      locality: params.locality,
      address: params.address || '',
      sellerId,
      deliveryAgentId,
      role: effectiveRole,
      isSignedIn: true,
      phoneVerified: true,
      emailVerified: true,
      authMethod: 'otp',
    };

    setUser(updatedUser);
    setRoleState(effectiveRole);
    localStorage.setItem('kurali_auth_session', JSON.stringify(updatedUser));
    if (params.token) {
      localStorage.setItem('kurali_auth_token', params.token);
    }

    return {
      success: true,
      message: isRoot
        ? `Root Master Administrator registered and verified via OTP!`
        : `Registration and dual OTP verification successful! Welcome ${params.name}.`,
      role: effectiveRole,
    };
  };

  // Google / Gmail Authentication
  const loginWithGoogle = (
    email: string,
    name: string,
    targetRole: UserRole,
    phone?: string,
    locality?: string,
    address?: string
  ) => {
    const isRoot = isRootAdminEmail(email);
    const effectiveRole: UserRole = isRoot ? 'admin' : targetRole;

    const existingSeller = sellers.find(s => s.email.toLowerCase() === email.toLowerCase());
    const existingAgent = deliveryAgents.find(a => (a.email || '').toLowerCase() === email.toLowerCase());

    const updatedUser: UserProfile = {
      email,
      name,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0284c7,f59e0b,10b981`,
      phone: phone || user.phone || '',
      locality: locality || user.locality || 'Main Bazaar',
      address: address || user.address || '',
      sellerId: existingSeller?.id,
      deliveryAgentId: existingAgent?.id,
      role: effectiveRole,
      isSignedIn: true,
      phoneVerified: true,
      emailVerified: true,
      authMethod: 'google',
    };

    setUser(updatedUser);
    setRoleState(effectiveRole);
    localStorage.setItem('kurali_auth_session', JSON.stringify(updatedUser));

    showToast(
      isRoot
        ? `Root Administrator Verified! Welcome ${name}.`
        : `Signed in successfully (${effectiveRole.toUpperCase()})`,
      'success'
    );
  };

  // Register Buyer
  const registerBuyer = (data: { name: string; email: string; phone: string; locality: string; address: string }) => {
    const isRoot = isRootAdminEmail(data.email);
    const updatedUser: UserProfile = {
      email: data.email,
      name: data.name,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name)}&backgroundColor=0284c7,f59e0b,10b981`,
      phone: data.phone,
      locality: data.locality,
      address: data.address,
      role: isRoot ? 'admin' : 'buyer',
      isSignedIn: true,
      phoneVerified: true,
      emailVerified: true,
      authMethod: 'otp',
    };
    setUser(updatedUser);
    setRoleState(isRoot ? 'admin' : 'buyer');
    localStorage.setItem('kurali_auth_session', JSON.stringify(updatedUser));
    showToast(`Buyer registration complete! Welcome to KuraliUpdates Bazaar, ${data.name}.`, 'success');
  };

  const logout = () => {
    const token = localStorage.getItem('kurali_auth_token');
    if (token) {
      bazaarApi.logout(token);
    }
    localStorage.removeItem('kurali_auth_token');
    localStorage.removeItem('kurali_auth_session');
    localStorage.removeItem('kurali_user');
    setUser({
      email: '',
      name: '',
      avatarUrl: '',
      phone: '',
      locality: 'Main Bazaar & Clock Tower',
      role: 'buyer',
      isSignedIn: false,
      phoneVerified: false,
      emailVerified: false,
    });
    setRoleState('buyer');
    showToast('Signed out. Please sign in or register to continue.', 'info');
  };

  // Current Seller
  const currentSeller = sellers.find(
    s => s.id === user.sellerId || s.email.toLowerCase() === user.email.toLowerCase()
  );

  // Current Agent
  const currentAgent = deliveryAgents.find(
    a => a.id === user.deliveryAgentId || (a.email && a.email.toLowerCase() === user.email.toLowerCase())
  );

  // Seller Actions
  const registerSeller = async (
    data: Omit<Seller, 'id' | 'status' | 'rating' | 'reviewCount' | 'registeredAt'>
  ) => {
    const newId = `seller-${Date.now()}`;
    const newSeller: Seller = {
      ...data,
      id: newId,
      status: 'pending',
      rating: 5.0,
      reviewCount: 0,
      registeredAt: new Date().toISOString(),
    };

    setSellers(prev => [newSeller, ...prev]);
    setUser(prev => ({ ...prev, sellerId: newId, role: 'seller', isSignedIn: true, email: data.email, name: data.ownerName }));
    setRoleState('seller');
    showToast('Store registered successfully! Submitted for Admin verification.', 'success');

    // Async sync to Oracle DB via Render backend
    bazaarApi.registerSeller(newSeller).then(res => {
      if (res && res.sellerId) {
        console.log('Seller successfully recorded in Oracle DB:', res.sellerId);
      }
    });
  };

  const approveSeller = (sellerId: string) => {
    setSellers(prev =>
      prev.map(s => (s.id === sellerId ? { ...s, status: 'approved', approvedAt: new Date().toISOString() } : s))
    );
    showToast('Seller store approved! Now live for Kurali buyers.', 'success');
    bazaarApi.approveSeller(sellerId);
  };

  const rejectSeller = (sellerId: string) => {
    setSellers(prev =>
      prev.map(s => (s.id === sellerId ? { ...s, status: 'rejected' } : s))
    );
    showToast('Seller store rejected.', 'info');
    bazaarApi.rejectSeller(sellerId);
  };

  const updateSeller = (sellerId: string, updates: Partial<Seller>) => {
    setSellers(prev =>
      prev.map(s => (s.id === sellerId ? { ...s, ...updates } : s))
    );
    showToast('Store profile updated successfully.', 'success');
  };

  // Product Actions
  const addProduct = (
    productData: Omit<Product, 'id' | 'rating' | 'reviewCount' | 'isAvailable'>
  ) => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      rating: 5.0,
      reviewCount: 0,
      isAvailable: true,
    };
    setProducts(prev => [newProduct, ...prev]);
    showToast(`"${productData.title}" added to your store inventory.`, 'success');

    // Async sync to Oracle DB via Render backend
    bazaarApi.addProduct(productData.sellerId, newProduct).then(res => {
      if (res && res.productId) {
        console.log('Product created in Oracle DB:', res.productId);
      }
    });
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, ...updates } : p))
    );
    showToast('Product updated successfully.', 'success');
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    showToast('Product removed from inventory.', 'info');
  };

  // Coupon Actions
  const addCoupon = (coupon: Coupon) => {
    setCoupons(prev => [coupon, ...prev.filter(c => c.code !== coupon.code)]);
    showToast(`Coupon "${coupon.code}" created!`, 'success');
  };

  const deleteCoupon = (code: string) => {
    setCoupons(prev => prev.filter(c => c.code !== code));
    showToast(`Coupon "${code}" deleted.`, 'info');
  };

  // Cart Actions
  const addToCart = (product: Product, quantity = 1, negotiatedPrice?: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                negotiatedPrice: negotiatedPrice || item.negotiatedPrice,
              }
            : item
        );
      }
      return [...prev, { product, quantity, negotiatedPrice }];
    });
    showToast(`Added "${product.title}" to cart`, 'success');
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const applyCoupon = (code: string): { success: boolean; message: string } => {
    const trimmed = code.trim().toUpperCase();
    const found = coupons.find(c => c.code.toUpperCase() === trimmed);
    if (!found) {
      return { success: false, message: 'Invalid coupon code for Kurali Bazaar.' };
    }
    const currentSubtotal = cart.reduce((sum, item) => {
      const price = item.negotiatedPrice || item.product.sellerPrice;
      return sum + price * item.quantity;
    }, 0);

    if (found.minOrderValue && currentSubtotal < found.minOrderValue) {
      return {
        success: false,
        message: `Min order value for ${found.code} is ₹${found.minOrderValue}. Add items worth ₹${
          found.minOrderValue - currentSubtotal
        } more.`,
      };
    }
    setAppliedCoupon(found);
    showToast(`Coupon ${found.code} applied successfully!`, 'success');
    return { success: true, message: `Coupon ${found.code} applied!` };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast('Coupon removed.', 'info');
  };

  // Cart Calculations
  const cartCalculations = React.useMemo(() => {
    const itemSubtotal = cart.reduce((sum, item) => {
      const price = item.negotiatedPrice || item.product.sellerPrice;
      return sum + price * item.quantity;
    }, 0);

    // Group items by seller to calculate seller-specific bill discounts
    const sellerSpend: { [sellerId: string]: { sellerName: string; amount: number; seller: Seller | undefined } } = {};
    cart.forEach(item => {
      const sId = item.product.sellerId;
      const price = item.negotiatedPrice || item.product.sellerPrice;
      if (!sellerSpend[sId]) {
        sellerSpend[sId] = {
          sellerName: item.product.sellerName,
          amount: 0,
          seller: sellers.find(s => s.id === sId),
        };
      }
      sellerSpend[sId].amount += price * item.quantity;
    });

    const activeBillDiscounts: { sellerId: string; sellerName: string; amount: number; description: string }[] = [];
    let highestDeliveryThreshold = 499;
    let baseDeliveryFee = 30;

    Object.entries(sellerSpend).forEach(([sId, data]) => {
      if (data.seller) {
        if (data.seller.minOrderForFreeDelivery) {
          highestDeliveryThreshold = Math.max(highestDeliveryThreshold, data.seller.minOrderForFreeDelivery);
        }
        if (data.seller.baseDeliveryFee) {
          baseDeliveryFee = Math.max(baseDeliveryFee, data.seller.baseDeliveryFee);
        }
        if (data.seller.billDiscounts) {
          data.seller.billDiscounts.forEach(bd => {
            if (data.amount >= bd.minBillAmount) {
              const discountVal = bd.flatDiscount || Math.round((data.amount * (bd.discountPercentage || 0)) / 100);
              activeBillDiscounts.push({
                sellerId: sId,
                sellerName: data.sellerName,
                amount: discountVal,
                description: bd.description,
              });
            }
          });
        }
      }
    });

    const totalBillDiscount = activeBillDiscounts.reduce((sum, bd) => sum + bd.amount, 0);

    let couponDiscount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.discountType === 'flat' || appliedCoupon.flatDiscount) {
        couponDiscount = appliedCoupon.flatDiscount || appliedCoupon.discountValue || 0;
      } else if (appliedCoupon.discountType === 'percentage' || appliedCoupon.discountPercentage) {
        const pct = appliedCoupon.discountPercentage || appliedCoupon.discountValue || 0;
        couponDiscount = Math.round((itemSubtotal * pct) / 100);
        if (appliedCoupon.maxDiscount) {
          couponDiscount = Math.min(couponDiscount, appliedCoupon.maxDiscount);
        }
      }
    }

    const isFreeDelivery = itemSubtotal >= highestDeliveryThreshold;
    const deliveryFee = cart.length === 0 || isFreeDelivery ? 0 : baseDeliveryFee;
    const freeDeliveryThresholdRemaining = Math.max(0, highestDeliveryThreshold - itemSubtotal);
    const finalTotal = Math.max(0, itemSubtotal - totalBillDiscount - couponDiscount + deliveryFee);
    const activeSeller = Object.values(sellerSpend)[0]?.seller;

    return {
      itemSubtotal,
      subtotal: itemSubtotal,
      couponDiscount,
      billDiscounts: activeBillDiscounts,
      totalBillDiscount,
      billDiscount: totalBillDiscount,
      deliveryFee,
      isFreeDelivery,
      freeDeliveryThresholdRemaining,
      amountNeededForFreeDelivery: freeDeliveryThresholdRemaining,
      freeDeliveryThreshold: highestDeliveryThreshold,
      activeSeller,
      finalTotal,
    };
  }, [cart, sellers, appliedCoupon]);

  // Order Actions
  const createOrder = (orderData: {
    buyerName?: string;
    buyerPhone?: string;
    deliveryAddress: string;
    deliveryLocality?: string;
    deliveryPhone?: string;
    customerNotes?: string;
    paymentMethod: 'COD' | 'UPI' | 'StorePay' | 'Card' | 'NetBanking';
  }): Order => {
    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const newOrderId = `ORD-KUR-${Math.floor(100000 + Math.random() * 900000)}`;
    const sellerIds = Array.from(new Set(cart.map(c => c.product.sellerId)));
    const sellerNames = Array.from(new Set(cart.map(c => c.product.sellerName)));
    const primarySellerName = sellerNames[0] || 'Local Kurali Store';
    const primarySellerId = sellerIds[0] || 'seller-kurali';
    const primarySellerLocality = cart[0]?.product.sellerLocality || 'Main Bazaar';

    const newOrder: Order = {
      id: newOrderId,
      buyerName: orderData.buyerName || user.name || 'Local Shopper',
      buyerEmail: user.email || 'shopper@kuraliupdates.com',
      buyerPhone: orderData.deliveryPhone || orderData.buyerPhone || '9876543210',
      deliveryAddress: orderData.deliveryAddress,
      deliveryLocality: orderData.deliveryLocality || user.locality || 'Main Bazaar',
      sellerId: primarySellerId,
      sellerName: primarySellerName,
      sellerLocality: primarySellerLocality,
      sellerIds,
      sellerNames,
      items: [...cart],
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
      paymentStatus: orderData.paymentMethod === 'UPI' ? 'paid' : 'pending',
      status: 'placed',
      deliveryOtp: randomOtp,
      placedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      estimatedDeliveryTime: '30-45 mins (Local Express)',
      distanceKm: 1.4,
      statusUpdates: [
        {
          status: 'placed',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          note: 'Order placed by buyer. Waiting for store packing.',
        },
      ],
      customerNotes: orderData.customerNotes,
    };

    setOrders(prev => [newOrder, ...prev]);
    clearCart();
    setTrackingOrderId(newOrderId);
    showToast(`Order #${newOrderId} placed successfully! 4-digit OTP: ${randomOtp}`, 'success');

    // Async sync to Oracle DB via Render backend
    bazaarApi.placeOrder(newOrder).then(res => {
      if (res) console.log('Order sent to Oracle DB:', res);
    });

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus, note?: string) => {
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          status,
          statusUpdates: [
            ...ord.statusUpdates,
            {
              status,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              note: note || `Order updated to ${status}.`,
            },
          ],
        };
      })
    );
    showToast(`Order status updated to ${status.toUpperCase()}`, 'info');
  };

  // Delivery Actions
  const claimDeliveryJob = (orderId: string, agentId: string) => {
    const agent = deliveryAgents.find(a => a.id === agentId);
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          deliveryAgentId: agentId,
          deliveryAgentName: agent?.name || 'Kurali Express Partner',
          deliveryAgentPhone: agent?.phone || '+91 98765 00000',
          status: 'picked_up',
          statusUpdates: [
            ...ord.statusUpdates,
            {
              status: 'picked_up',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              note: `Picked up by delivery rider ${agent?.name || ''}. En route to buyer.`,
            },
          ],
        };
      })
    );
    showToast('Delivery order accepted! Navigate to store for pickup.', 'success');
    bazaarApi.claimDeliveryJob(orderId, agentId);
  };

  const completeDelivery = (orderId: string, otp: string): { success: boolean; message: string } => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return { success: false, message: 'Order not found.' };

    if (order.deliveryOtp !== otp.trim()) {
      return { success: false, message: 'Invalid OTP! Please request 4-digit OTP from customer upon handover.' };
    }

    const deliveryFeePayout = Math.max(45, Math.round(order.distanceKm * 22) + 20);
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          status: 'delivered',
          paymentStatus: 'paid',
          statusUpdates: [
            ...ord.statusUpdates,
            {
              status: 'delivered',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              note: `Delivered safely to ${order.deliveryAddress}. OTP verified.`,
            },
          ],
        };
      })
    );

    if (order.deliveryAgentId) {
      setDeliveryAgents(prev =>
        prev.map(ag => {
          if (ag.id !== order.deliveryAgentId) return ag;
          return {
            ...ag,
            totalTrips: ag.totalTrips + 1,
            todayEarnings: ag.todayEarnings + deliveryFeePayout,
            totalEarnings: ag.totalEarnings + deliveryFeePayout,
          };
        })
      );
    }

    bazaarApi.verifyDeliveryOtp(orderId, otp);

    return {
      success: true,
      message: `Order successfully delivered! Payout of ₹${deliveryFeePayout} credited to delivery wallet.`,
    };
  };

  const registerDeliveryAgent = (
    data: Omit<DeliveryAgent, 'id' | 'status' | 'rating' | 'totalTrips' | 'todayEarnings' | 'totalEarnings' | 'registeredAt'>
  ) => {
    const newId = `agent-${Date.now()}`;
    const newAgent: DeliveryAgent = {
      ...data,
      id: newId,
      status: 'active',
      rating: 5.0,
      totalTrips: 0,
      todayEarnings: 0,
      totalEarnings: 0,
      registeredAt: new Date().toISOString(),
    };
    setDeliveryAgents(prev => [newAgent, ...prev]);
    setUser(prev => ({ ...prev, deliveryAgentId: newId, role: 'delivery', isSignedIn: true, email: data.email, name: data.name }));
    setRoleState('delivery');
    showToast('Delivery Partner registered successfully! Welcome to Kurali Express fleet.', 'success');
    bazaarApi.registerDeliveryAgent(newAgent);
  };

  // Negotiation & Bargaining Chat
  const openChatForProduct = (product: Product, startingOfferPrice?: number): string => {
    const existing = chats.find(
      c => c.productId === product.id && c.sellerId === product.sellerId
    );
    if (existing) {
      setActiveChatId(existing.id);
      return existing.id;
    }
    const newChatId = `chat-${Date.now()}`;
    const initialOfferPrice = startingOfferPrice || Math.round(product.sellerPrice * 0.9);
    const newChat: NegotiationChat = {
      id: newChatId,
      productId: product.id,
      productTitle: product.title,
      productImage: product.image,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      buyerName: user.name || 'Local Kurali Buyer',
      buyerEmail: user.email,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: [
        {
          id: `m-${Date.now()}-1`,
          chatId: newChatId,
          senderRole: 'buyer',
          senderName: user.name || 'Local Kurali Buyer',
          text: `Sat Sri Akal! I am interested in purchasing "${product.title}" from your shop in ${product.sellerLocality}. Can you offer a special local price?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          offer: {
            id: `off-${Date.now()}`,
            productId: product.id,
            productTitle: product.title,
            productImage: product.image,
            originalPrice: product.sellerPrice,
            offeredPrice: initialOfferPrice,
            senderRole: 'buyer',
            quantity: 1,
            status: 'pending',
          },
        },
      ],
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChatId);
    return newChatId;
  };

  const sendMessage = (chatId: string, text: string, offer?: BargainOffer) => {
    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      chatId,
      senderRole: role === 'seller' ? 'seller' : 'buyer',
      senderName: role === 'seller' ? (currentSeller?.name || 'Seller') : (user.name || 'Buyer'),
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      offer,
    };
    setChats(prev =>
      prev.map(c => {
        if (c.id !== chatId) return c;
        return {
          ...c,
          messages: [...c.messages, newMsg],
          lastUpdated: newMsg.timestamp,
        };
      })
    );
  };

  const respondToOffer = (
    chatId: string,
    offerId: string,
    action: 'accept' | 'reject' | 'counter',
    counterPrice?: number
  ) => {
    setChats(prev =>
      prev.map(c => {
        if (c.id !== chatId) return c;
        let agreedPrice = c.currentAgreedPrice;
        const updatedMessages = c.messages.map(m => {
          if (m.offer && m.offer.id === offerId) {
            const updatedOfferStatus =
              action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'countered';
            if (action === 'accept') {
              agreedPrice = m.offer.offeredPrice;
            }
            return {
              ...m,
              offer: {
                ...m.offer,
                status: updatedOfferStatus as any,
              },
            };
          }
          return m;
        });

        const responseMsg: ChatMessage = {
          id: `m-${Date.now()}`,
          chatId,
          senderRole: role === 'seller' ? 'seller' : 'buyer',
          senderName: role === 'seller' ? (currentSeller?.name || 'Seller') : (user.name || 'Buyer'),
          text:
            action === 'accept'
              ? `Deal agreed! The price of ₹${agreedPrice} is confirmed. You can now add this directly to your cart at the negotiated rate.`
              : action === 'reject'
              ? `Offer declined. Standard store price applies.`
              : `Counter offer sent: ₹${counterPrice}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          offer:
            action === 'counter' && counterPrice
              ? {
                  id: `off-${Date.now()}`,
                  productId: c.productId,
                  productTitle: c.productTitle,
                  productImage: c.productImage,
                  originalPrice: c.messages[0]?.offer?.originalPrice || 0,
                  offeredPrice: counterPrice,
                  senderRole: role === 'seller' ? 'seller' : 'buyer',
                  quantity: 1,
                  status: 'pending',
                }
              : undefined,
        };
        return {
          ...c,
          currentAgreedPrice: agreedPrice,
          messages: [...updatedMessages, responseMsg],
          lastUpdated: responseMsg.timestamp,
        };
      })
    );
    if (action === 'accept') {
      showToast('Price deal accepted! Special price locked in.', 'success');
    }
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        user,
        loginWithOtp,
        registerUserWithOtp,
        loginWithGoogle,
        logout,
        registerBuyer,
        sellers,
        currentSeller,
        registerSeller,
        approveSeller,
        rejectSeller,
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

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
