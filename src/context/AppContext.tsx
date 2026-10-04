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
  email?: string;
  name: string;
  avatarUrl: string;
  phone?: string;
  locality: string;
  address?: string;
  sellerId?: string;
  deliveryAgentId?: string;
  role: UserRole;
  isSignedIn: boolean;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  authMethod?: 'otp' | 'google';
  isAdmin?: boolean;
}

interface AppContextType {
  // Roles & Auth
  role: UserRole;
  setRole: (role: UserRole) => void;
  user: UserProfile;
  loginWithOtp: (params: {
    identifier?: string;
    email?: string;
    phone?: string;
    name?: string;
    targetRole?: UserRole;
    locality?: string;
    address?: string;
    token?: string;
    serverUser?: any;
  }) => { success: boolean; message: string; role: UserRole };
  registerUserWithOtp: (params: {
    name: string;
    identifier?: string;
    email?: string;
    phone?: string;
    locality: string;
    role: UserRole;
    address?: string;
    token?: string;
    serverUser?: any;
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
  approveDeliveryAgent: (agentId: string) => void;
  rejectDeliveryAgent: (agentId: string) => void;
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

const safeStorageGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeStorageJson = <T,>(key: string, fallback: T): T => {
  const raw = safeStorageGet(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    try {
      safeStorageRemove(key);
    } catch {
      // Ignore storage cleanup failures.
    }
    return fallback;
  }
};

const safeStorageRemove = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore unavailable browser storage.
  }
};

const safeStorageSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore unavailable/full browser storage so the UI can still render.
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    const session = safeStorageGet('kurali_auth_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.isSignedIn && (parsed.email || parsed.phone)) {
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

  // Load role directly from signed-in user's role
  const [role, setRoleState] = useState<UserRole>(() => {
    const session = safeStorageGet('kurali_auth_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.isSignedIn && parsed.role) {
          return parsed.role;
        }
      } catch (e) {
        /* ignore */
      }
    }
    return (safeStorageGet('kurali_role') as UserRole) || 'buyer';
  });

  // Automatically sync UI to user's assigned role upon sign-in
  useEffect(() => {
    if (user.isSignedIn && user.role) {
      if (user.role !== 'admin') {
        setRoleState(user.role);
        safeStorageSet('kurali_role', user.role);
      }
    }
  }, [user.isSignedIn, user.role]);

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

  const [chats, setChats] = useState<NegotiationChat[]>(() => {
    return safeStorageJson('kurali_chats', INITIAL_CHATS);
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    return safeStorageJson('kurali_cart', []);
  });

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(() => {
    return safeStorageJson('kurali_applied_coupon', null);
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
    safeStorageSet('kurali_role', role);
  }, [role]);

  useEffect(() => {
    safeStorageSet('kurali_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    safeStorageSet('kurali_sellers', JSON.stringify(sellers));
  }, [sellers]);

  useEffect(() => {
    safeStorageSet('kurali_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    safeStorageSet('kurali_coupons', JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    safeStorageSet('kurali_delivery_agents', JSON.stringify(deliveryAgents));
  }, [deliveryAgents]);

  useEffect(() => {
    safeStorageSet('kurali_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    safeStorageSet('kurali_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    safeStorageSet('kurali_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (appliedCoupon) {
      safeStorageSet('kurali_applied_coupon', JSON.stringify(appliedCoupon));
    } else {
      safeStorageRemove('kurali_applied_coupon');
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

      // Synchronize pending seller and delivery approvals from Oracle DB
      const [remotePendingSellers, remotePendingAgents] = await Promise.all([
        bazaarApi.getPendingSellers(),
        bazaarApi.getPendingDeliveryAgents(),
      ]);
      if (remotePendingSellers?.length) {
        setSellers(prev => {
          const mapped = remotePendingSellers.map((s: any) => ({
            id: s.sellerId,
            name: s.storeName,
            ownerName: s.ownerName,
            email: s.email,
            phone: s.phone,
            avatarUrl: s.avatarUrl || '',
            category: s.category || 'General',
            address: s.address,
            locality: s.locality,
            distanceKm: Number(s.distanceKm || 1),
            rating: Number(s.rating || 0),
            reviewCount: Number(s.reviewCount || 0),
            status: String(s.status || 'PENDING').toLowerCase(),
            registeredAt: s.registeredAt,
            approvedAt: s.approvedAt,
            description: s.description || '',
            minOrderForFreeDelivery: Number(s.minOrderForFreeDelivery || 499),
            baseDeliveryFee: Number(s.baseDeliveryFee || 35),
            billDiscounts: [],
          })) as Seller[];
          const remoteIds = new Set(mapped.map(s => s.id));
          return [...mapped, ...prev.filter(s => !remoteIds.has(s.id))];
        });
      }
      if (remotePendingAgents?.length) {
        setDeliveryAgents(prev => {
          const mapped = remotePendingAgents.map((a: any) => ({
            id: a.agentId,
            name: a.fullName,
            email: a.email,
            phone: a.phone,
            avatarUrl: a.avatarUrl || '',
            vehicleType: a.vehicleType,
            vehicleNumber: a.vehicleNumber,
            licenseNumber: a.licenseNumber,
            status: String(a.status || 'PENDING').toLowerCase(),
            rating: Number(a.rating || 0),
            totalTrips: Number(a.totalTrips || 0),
            todayEarnings: Number(a.todayEarnings || 0),
            totalEarnings: Number(a.totalEarnings || 0),
            currentLocality: a.currentLocality,
            registeredAt: a.registeredAt,
          })) as DeliveryAgent[];
          const remoteIds = new Set(mapped.map(a => a.id));
          return [...mapped, ...prev.filter(a => !remoteIds.has(a.id))];
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
    const savedToken = safeStorageGet('kurali_auth_token');
    if (savedToken) {
      bazaarApi.getMe(savedToken).then(res => {
        if (res.authenticated && res.user) {
          const u = res.user;
          const effectiveRole: UserRole = (u.role?.toLowerCase() as UserRole) || 'buyer';
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
            emailVerified: Boolean(u.email),
            isAdmin: Number(u.isAdmin) === 1 || effectiveRole === 'admin',
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
      if (!user.isAdmin) {
        showToast(`Access Restricted: City Admin portal is reserved exclusively for verified Root Admins.`, 'error');
        return;
      }
    }
    setRoleState(targetRole);
  };

  // Google sign-in is intentionally disabled until a server-side Google OAuth flow is configured.
  // Do not create a local authenticated session here because authentication must remain server-authoritative.
  const loginWithGoogle = (
    _email: string,
    _name: string,
    _targetRole: UserRole,
    _phone?: string,
    _locality?: string,
    _address?: string
  ) => {
    showToast('Google sign-in is not enabled yet. Please use Email or Mobile OTP.', 'info');
  };

  // OTP-Based Authentication (Email OR Phone Verified)
  const loginWithOtp = (params: {
    identifier?: string;
    email?: string;
    phone?: string;
    name?: string;
    targetRole?: UserRole;
    locality?: string;
    address?: string;
    token?: string;
    serverUser?: any;
  }) => {
    if (!params.token || !params.serverUser) {
      return { success: false, message: 'Authentication was not completed by the server.', role: 'buyer' as UserRole };
    }

    const rawId = (params.identifier || params.email || params.phone || '').trim();
    const isEmail = rawId.includes('@');
    const trimmedEmail = isEmail ? rawId.toLowerCase() : (params.email?.trim().toLowerCase() || '');
    const cleanPhone = !isEmail ? rawId : (params.phone?.trim() || '');

    const existingSeller = sellers.find(
      s => (trimmedEmail && s.email.toLowerCase() === trimmedEmail) ||
           (cleanPhone && s.phone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, ''))
    );
    const existingAgent = deliveryAgents.find(
      a => (trimmedEmail && (a.email || '').toLowerCase() === trimmedEmail) ||
           (cleanPhone && a.phone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, ''))
    );

    const serverRole = (params.serverUser.role?.toLowerCase() as UserRole) || 'buyer';
    const effectiveRole: UserRole = Number(params.serverUser.isAdmin) === 1 || serverRole === 'admin'
      ? 'admin'
      : serverRole;
    const displayName = params.serverUser.name || params.name || existingSeller?.ownerName || existingAgent?.name || (isEmail ? trimmedEmail.split('@')[0] : 'Kurali User');

    const updatedUser: UserProfile = {
      email: params.serverUser.email || trimmedEmail || undefined,
      name: displayName,
      avatarUrl: params.serverUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=0284c7,f59e0b,10b981`,
      phone: params.serverUser.phone || cleanPhone || undefined,
      locality: params.serverUser.locality || params.locality || existingSeller?.locality || existingAgent?.currentLocality || 'Main Bazaar & Clock Tower',
      address: params.serverUser.address || params.address || existingSeller?.address || '',
      sellerId: existingSeller?.id,
      deliveryAgentId: existingAgent?.id,
      role: effectiveRole,
      isSignedIn: true,
      phoneVerified: Boolean(params.serverUser.phone),
      emailVerified: Boolean(params.serverUser.email),
      isAdmin: effectiveRole === 'admin',
      authMethod: 'otp',
    };

    setUser(updatedUser);
    setRoleState(effectiveRole);
    safeStorageSet('kurali_auth_session', JSON.stringify(updatedUser));
    safeStorageSet('kurali_auth_token', params.token);

    return {
      success: true,
      message: effectiveRole === 'admin'
        ? `Administrator verified. Welcome ${displayName}.`
        : `Verified via OTP as ${effectiveRole.toUpperCase()}! Welcome to KuraliUpdates Bazaar.`,
      role: effectiveRole,
    };
  };

  // Register Citizen / Merchant / Rider with OTP Verification
  const registerUserWithOtp = (params: {
    name: string;
    identifier?: string;
    email?: string;
    phone?: string;
    locality: string;
    role: UserRole;
    address?: string;
    token?: string;
    serverUser?: any;
  }) => {
    if (!params.token || !params.serverUser) {
      return { success: false, message: 'Registration was not completed by the server.', role: 'buyer' as UserRole };
    }

    const trimmedEmail = (params.serverUser.email || params.email || '').trim().toLowerCase();
    const cleanPhone = (params.serverUser.phone || params.phone || '').replace(/\D/g, '');
    const effectiveRole = ((params.serverUser.role || params.role || 'buyer').toLowerCase() as UserRole);

    let sellerId: string | undefined;
    let deliveryAgentId: string | undefined;

    const updatedUser: UserProfile = {
      email: trimmedEmail || undefined, name: params.serverUser.name || params.name,
      avatarUrl: params.serverUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(params.name)}&backgroundColor=0284c7,f59e0b,10b981`,
      phone: cleanPhone || undefined, locality: params.serverUser.locality || params.locality,
      address: params.serverUser.address || params.address || '', sellerId, deliveryAgentId,
      role: effectiveRole, isSignedIn: true, phoneVerified: Boolean(cleanPhone),
      emailVerified: Boolean(trimmedEmail), isAdmin: Number(params.serverUser.isAdmin) === 1 || effectiveRole === 'admin',
      authMethod: 'otp',
    };

    setUser(updatedUser);
    setRoleState(effectiveRole);
    safeStorageSet('kurali_auth_session', JSON.stringify(updatedUser));
    safeStorageSet('kurali_auth_token', params.token);

    return { success: true, message: `Registration and OTP verification successful! Welcome ${updatedUser.name}.`, role: effectiveRole };
  };

  const logout = () => {
    const token = safeStorageGet('kurali_auth_token');
    if (token) {
      bazaarApi.logout(token);
    }
    safeStorageRemove('kurali_auth_token');
    safeStorageRemove('kurali_auth_session');
    safeStorageRemove('kurali_user');
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

  const registerBuyer = (data: { name: string; email: string; phone: string; locality: string; address: string }) => {
    const cleanPhone = data.phone.replace(/\D/g, '');
    const buyer: UserProfile = {
      email: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name.trim())}&backgroundColor=0284c7,f59e0b,10b981`,
      phone: cleanPhone,
      locality: data.locality,
      address: data.address,
      role: 'buyer',
      isSignedIn: true,
      phoneVerified: false,
      emailVerified: false,
      authMethod: 'otp',
      isAdmin: false,
    };
    setUser(buyer);
    setRoleState('buyer');
    safeStorageSet('kurali_auth_session', JSON.stringify(buyer));
    showToast('Buyer profile created. Please use OTP sign-in for verified authentication.', 'success');
  };

  // Current Seller
  const currentSeller = sellers.find(
    s => s.id === user.sellerId || (user.email && s.email.toLowerCase() === user.email.toLowerCase()) || (user.phone && s.phone === user.phone)
  );

  // Current Agent
  const currentAgent = deliveryAgents.find(
    a => a.id === user.deliveryAgentId || (user.email && a.email && a.email.toLowerCase() === user.email.toLowerCase()) || (user.phone && a.phone === user.phone)
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

  const approveDeliveryAgent = (agentId: string) => {
    bazaarApi.approveDeliveryAgent(agentId).then(ok => {
      if (!ok) {
        showToast('Unable to approve delivery partner in backend.', 'error');
        return;
      }
      setDeliveryAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'active' } : a));
      showToast('Delivery partner approved and activated.', 'success');
    });
  };

  const rejectDeliveryAgent = (agentId: string) => {
    bazaarApi.rejectDeliveryAgent(agentId).then(ok => {
      if (!ok) {
        showToast('Unable to reject delivery partner in backend.', 'error');
        return;
      }
      setDeliveryAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'rejected' } : a));
      showToast('Delivery partner application rejected.', 'info');
    });
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
      buyerEmail: user.email || (user.phone ? `${user.phone}@kuraliupdates.com` : 'shopper@kuraliupdates.com'),
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

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
