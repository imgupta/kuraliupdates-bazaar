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
import { buyerApi } from '../services/domains/buyerApi';
import { sellerApi } from '../services/domains/sellerApi';
import { adminApi } from '../services/domains/adminApi';
import { deliveryApi } from '../services/domains/deliveryApi';
import { toSavedAddress, type SavedAddress } from '../entities/address';
import { mapServerUser, type UserProfile } from '../entities/userProfile';
export type { SavedAddress } from '../entities/address';
export type { UserProfile } from '../entities/userProfile';
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

import type { AppContextType } from './AppContextContract';
import { safeStorageGet, safeStorageJson, safeStorageRemove, safeStorageSet } from '../shared/storage/safeStorage';
import { clearStoredAuthState, hasStoredAuthSession, persistAuthSession, persistAuthToken, readAuthToken, removeAuthSession, removeAuthToken } from '../auth/authSessionStorage';
import { AuthSessionProvider, useAuthSession } from './AuthSessionContext';

const AppContext = createContext<AppContextType | undefined>(undefined);

const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setUser, role, setRoleState, authInitializing, setAuthInitializing } = useAuthSession();

  const updateUserProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    const token = readAuthToken();
    if (!token || !user.isSignedIn) {
      showToast('Your session has expired. Please sign in again.', 'error');
      return false;
    }
    const result = await buyerApi.updateCurrentUser(token, updates);
    if (!result.success || !result.user) {
      showToast(result.message || 'Unable to save your changes.', 'error');
      return false;
    }
    setUser(prev => {
      const next = {
        ...prev,
        ...updates,
        ...mapServerUser(result.user, prev),
        savedAddresses: prev.savedAddresses,
      };
      persistAuthSession(next);
      return next;
    });
    return true;
  };

  const createBuyerAddress = async (address: SavedAddress): Promise<SavedAddress | null> => {
    const token = readAuthToken();
    if (!token) return null;
    const saved = await buyerApi.createBuyerAddress(token, address);
    if (!saved) return null;
    const next = toSavedAddress(saved);
    setUser(prev => {
      const addresses = [...(prev.savedAddresses || []).filter(a => a.id !== next.id), next]
        .map(a => ({ ...a, isDefault: next.isDefault ? a.id === next.id : a.isDefault }));
      const updated = { ...prev, savedAddresses: addresses };
      persistAuthSession(updated);
      return updated;
    });
    return next;
  };

  const updateBuyerAddress = async (address: SavedAddress): Promise<SavedAddress | null> => {
    const token = readAuthToken();
    if (!token) return null;
    const saved = await buyerApi.updateBuyerAddress(token, address.id, address);
    if (!saved) return null;
    const next = toSavedAddress(saved);
    setUser(prev => {
      const addresses = (prev.savedAddresses || []).map(a => a.id === next.id ? next : a);
      const updated = { ...prev, savedAddresses: addresses };
      persistAuthSession(updated);
      return updated;
    });
    return next;
  };

  const setDefaultBuyerAddress = async (addressId: string): Promise<SavedAddress | null> => {
    const token = readAuthToken();
    if (!token) return null;
    const saved = await buyerApi.setDefaultBuyerAddress(token, addressId);
    if (!saved) return null;
    const next = toSavedAddress(saved);
    setUser(prev => {
      const updated = { ...prev, savedAddresses: (prev.savedAddresses || []).map(a => ({ ...a, isDefault: a.id === addressId })) };
      persistAuthSession(updated);
      return updated;
    });
    return next;
  };

  // Keep legacy client-side addresses visible when the server's address collection is empty.
  // The authenticated user response includes addresses too, so the follow-up request is a refresh,
  // not the only source of address state.
  const refreshBuyerAddresses = (token: string, expectedEmail?: string) => {
    void buyerApi.getBuyerAddresses(token).then(remoteAddresses => {
      if (!remoteAddresses || readAuthToken() !== token) return;
      const mappedAddresses = remoteAddresses.map(toSavedAddress).filter(address => Boolean(address.id));
      setUser(prev => {
        if (expectedEmail && (prev.email || '').toLowerCase() !== expectedEmail.toLowerCase()) return prev;
        // A successful but empty response must not erase previously saved addresses. This is
        // important for addresses created by older versions before server-side address sync.
        const addresses = mappedAddresses.length > 0 ? mappedAddresses : (prev.savedAddresses || []);
        const next = { ...prev, savedAddresses: addresses };
        persistAuthSession(next);
        return next;
      });
    });
  };

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
  const [registeredRoles, setRegisteredRoles] = useState<UserRole[]>(['buyer']);
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

  const syncDeliveryJobs = async () => {
    const remoteJobs = await deliveryApi.getDeliveryAvailableJobs();
    if (!remoteJobs.length) return;
    setOrders(prev => {
      const remoteIds = new Set(remoteJobs.map(o => o.id));
      const localRemaining = prev.filter(o => !remoteIds.has(o.id) || o.status !== 'ready_for_pickup');
      return [...remoteJobs, ...localRemaining];
    });
  };

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

      await syncDeliveryJobs();

      if (user.isSignedIn && user.role === 'buyer') {
        const remoteBuyerOrders = await bazaarApi.getMyOrders();
        if (remoteBuyerOrders.length > 0) {
          setOrders(prev => {
            const remoteIds = new Set(remoteBuyerOrders.map(order => order.id));
            return [...remoteBuyerOrders, ...prev.filter(order => !remoteIds.has(order.id))];
          });
        }
      }

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
        adminApi.getPendingSellers(),
        adminApi.getPendingDeliveryAgents(),
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
            bannerUrl: s.bannerUrl || '',
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

      // Synchronize available pickup jobs from Oracle DB for the delivery dashboard.
      const availableJobs = await deliveryApi.getDeliveryAvailableJobs();
      setOrders(prev => {
        const remoteIds = new Set(availableJobs.map(order => order.id));
        const localWithoutRemoteReadyJobs = prev.filter(
          order => !(order.status === 'ready_for_pickup' && remoteIds.has(order.id))
        );
        return [...availableJobs, ...localWithoutRemoteReadyJobs];
      });
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
    const savedToken = readAuthToken();
    if (savedToken) {
      bazaarApi.getMe(savedToken).then(res => {
        if (res.authenticated && res.user) {
          const u = res.user;
          const effectiveRole: UserRole = (u.role?.toLowerCase() as UserRole) || 'buyer';
          const hadStoredSession = hasStoredAuthSession();
          setUser(prev => ({
            ...prev,
            email: u.email,
            name: u.name,
            phone: u.phone,
            locality: u.locality || prev.locality,
            address: u.address || prev.address,
            savedAddresses: (() => {
              const fromServer = Array.isArray(res.addresses)
                ? res.addresses.map(toSavedAddress).filter((address: SavedAddress) => Boolean(address.id))
                : [];
              // Do not let an empty server list erase locally retained addresses during session restore.
              return fromServer.length > 0 ? fromServer : (prev.savedAddresses || []);
            })(),
            addressLine1: u.addressLine1 || prev.addressLine1,
            landmark: u.landmark || prev.landmark,
            formattedAddress: u.formattedAddress || prev.formattedAddress,
            placeId: u.placeId || prev.placeId,
            latitude: u.latitude ?? prev.latitude,
            longitude: u.longitude ?? prev.longitude,
            // Keep the user's selected portal when refreshing a valid session.
            // The backend's primary role is only a fallback for a missing local session.
            role: prev.isSignedIn ? prev.role : effectiveRole,
            isSignedIn: true,
            phoneVerified: true,
            emailVerified: Boolean(u.email),
            isAdmin: Number(u.isAdmin) === 1 || effectiveRole === 'admin',
          }));
          if (!hadStoredSession) setRoleState(effectiveRole);
        }
      });
    }

    return () => clearInterval(interval);
  }, [backendUrl]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('sso_code') || new URLSearchParams(url.hash.slice(1)).get('sso_code');
    if (!code) {
      setAuthInitializing(false);
      return;
    }

    // Remove the one-time code from browser history before exchanging it.
    url.searchParams.delete('sso_code');
    url.hash = '';
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);

    let cancelled = false;
    bazaarApi.redeemPortalHandoff(code).then(result => {
      if (cancelled) return;
      if (!result?.success || !result.token || !result.user || !result.role) {
        removeAuthToken();
        removeAuthSession();
        setAuthInitializing(false);
        return;
      }

      const roles = (result.roles || []).map((r: string) => r.toLowerCase() as UserRole)
        .filter((r: UserRole) => ['buyer', 'seller', 'delivery', 'professional', 'admin'].includes(r));
      const targetRole = result.role.toLowerCase() as UserRole;
      if (!roles.includes(targetRole)) {
        removeAuthToken();
        removeAuthSession();
        setAuthInitializing(false);
        return;
      }

      const previous = user;
      const profile: UserProfile = {
        ...previous,
        ...mapServerUser(result.user, previous),
        email: result.user.email || previous.email,
        name: result.user.name || previous.name,
        phone: result.user.phone || previous.phone,
        role: targetRole,
        isSignedIn: true,
        isAdmin: roles.includes('admin'),
        registeredRoles: roles,
      };
      persistAuthToken(result.token);
      persistAuthSession(profile);
      setUser(profile);
      setRoleState(targetRole);
      setRegisteredRoles(Array.from(new Set(['buyer', ...roles])));
      setAuthInitializing(false);
    }).catch(() => {
      if (!cancelled) setAuthInitializing(false);
    });

    return () => { cancelled = true; };
  // This bootstrap must run once per portal load, before role discovery.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authInitializing) return;
    const token = readAuthToken();
    if (!user.isSignedIn || !token) {
      setRegisteredRoles(['buyer']);
      return;
    }
    bazaarApi.getRegisteredRoles(token).then(roles => {
      const normalized = roles
        .map(r => r.toLowerCase() as UserRole)
        .filter(r => ['buyer', 'seller', 'delivery', 'professional', 'admin'].includes(r));
      setRegisteredRoles(Array.from(new Set(['buyer', ...normalized])));
    });
  }, [authInitializing, user.isSignedIn, user.email, user.phone, role]);

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
      addressLine1: params.serverUser.addressLine1 || undefined,
      landmark: params.serverUser.landmark || undefined,
      formattedAddress: params.serverUser.formattedAddress || undefined,
      placeId: params.serverUser.placeId || undefined,
      latitude: params.serverUser.latitude ?? undefined,
      longitude: params.serverUser.longitude ?? undefined,
      // The verify-OTP response already carries UserResponse.addresses. Use it immediately,
      // and retain same-account client addresses when older data is not in the backend yet.
      savedAddresses: (() => {
        const fromServer = Array.isArray(params.serverUser.addresses)
          ? params.serverUser.addresses.map(toSavedAddress).filter((address: SavedAddress) => Boolean(address.id))
          : [];
        const sameAccount = (user.email || '').toLowerCase() === (params.serverUser.email || trimmedEmail || '').toLowerCase()
          || Boolean(cleanPhone && (user.phone || '').replace(/\D/g, '') === cleanPhone.replace(/\D/g, ''));
        return fromServer.length > 0 ? fromServer : (sameAccount ? user.savedAddresses || [] : []);
      })(),
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
    persistAuthSession(updatedUser);
    persistAuthToken(params.token);
    refreshBuyerAddresses(params.token, updatedUser.email);

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
    addressLine1?: string;
    landmark?: string;
    formattedAddress?: string;
    placeId?: string;
    latitude?: number;
    longitude?: number;
    token?: string;
    serverUser?: any;
  }) => {
    if (!params.token || !params.serverUser) {
      return { success: false, message: 'Registration was not completed by the server.', role: 'buyer' as UserRole };
    }

    const trimmedEmail = (params.serverUser.email || params.email || '').trim().toLowerCase();
    const cleanPhone = (params.serverUser.phone || params.phone || '').replace(/\D/g, '');
    // A single identity can hold multiple role profiles. For a role-registration
    // flow, activate the role just registered rather than replacing backend identity data.
    const serverRole = ((params.serverUser.role || 'buyer').toLowerCase() as UserRole);
    const effectiveRole: UserRole = serverRole === 'admin' ? 'admin' : params.role;

    let sellerId: string | undefined;
    let deliveryAgentId: string | undefined;

    const updatedUser: UserProfile = {
      email: trimmedEmail || undefined, name: params.serverUser.name || params.name,
      avatarUrl: params.serverUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(params.name)}&backgroundColor=0284c7,f59e0b,10b981`,
      phone: cleanPhone || undefined, locality: params.serverUser.locality || params.locality,
      address: params.serverUser.address || params.address || '',
      addressLine1: params.serverUser.addressLine1 || params.addressLine1,
      landmark: params.serverUser.landmark || params.landmark,
      formattedAddress: params.serverUser.formattedAddress || params.formattedAddress,
      placeId: params.serverUser.placeId || params.placeId,
      latitude: params.serverUser.latitude ?? params.latitude,
      longitude: params.serverUser.longitude ?? params.longitude,
      savedAddresses: (() => {
        const fromServer = Array.isArray(params.serverUser.addresses)
          ? params.serverUser.addresses.map(toSavedAddress).filter((address: SavedAddress) => Boolean(address.id))
          : [];
        const sameAccount = (user.email || '').toLowerCase() === trimmedEmail
          || Boolean(cleanPhone && (user.phone || '').replace(/\D/g, '') === cleanPhone);
        return fromServer.length > 0 ? fromServer : (sameAccount ? user.savedAddresses || [] : []);
      })(),
      sellerId, deliveryAgentId,
      role: effectiveRole, isSignedIn: true, phoneVerified: Boolean(cleanPhone),
      emailVerified: Boolean(trimmedEmail), isAdmin: Number(params.serverUser.isAdmin) === 1 || effectiveRole === 'admin',
      authMethod: 'otp',
    };

    setUser(updatedUser);
    setRoleState(effectiveRole);
    persistAuthSession(updatedUser);
    persistAuthToken(params.token);
    refreshBuyerAddresses(params.token, updatedUser.email);

    return { success: true, message: `Registration and OTP verification successful! Welcome ${updatedUser.name}.`, role: effectiveRole };
  };

  const logout = () => {
    const token = readAuthToken();
    if (token) {
      bazaarApi.logout(token);
    }
    clearStoredAuthState();
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
    persistAuthSession(buyer);
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
    sellerApi.registerSeller(newSeller).then(res => {
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
    adminApi.approveSeller(sellerId);
  };

  const rejectSeller = (sellerId: string) => {
    setSellers(prev =>
      prev.map(s => (s.id === sellerId ? { ...s, status: 'rejected' } : s))
    );
    showToast('Seller store rejected.', 'info');
    adminApi.rejectSeller(sellerId);
  };

  const approveDeliveryAgent = (agentId: string) => {
    adminApi.approveDeliveryAgent(agentId).then(ok => {
      if (!ok) {
        showToast('Unable to approve delivery partner in backend.', 'error');
        return;
      }
      setDeliveryAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'active' } : a));
      showToast('Delivery partner approved and activated.', 'success');
    });
  };

  const rejectDeliveryAgent = (agentId: string) => {
    adminApi.rejectDeliveryAgent(agentId).then(ok => {
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
    sellerApi.addProduct(productData.sellerId, newProduct).then(res => {
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
  const claimDeliveryJob = async (orderId: string, agentId: string): Promise<boolean> => {
    const agent = deliveryAgents.find(a => a.id === agentId);
    // The server owns assignment and lifecycle state. Do not optimistically claim
    // locally: a conflict/auth failure must not make an order appear assigned.
    const claimed = await deliveryApi.claimDeliveryJob(orderId, agentId);
    if (!claimed) {
      showToast('Unable to claim this order. Refresh the pickup list and try again.', 'error');
      await syncWithBackend();
      return false;
    }

    setOrders(prev =>
      prev.map(ord => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          deliveryAgentId: agentId,
          deliveryAgentName: agent?.name || 'Kurali Express Partner',
          deliveryAgentPhone: agent?.phone || '',
          status: 'assigned_to_delivery',
          statusUpdates: [
            ...ord.statusUpdates,
            {
              status: 'assigned_to_delivery',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              note: `Claimed by delivery rider ${agent?.name || ''}. En route to buyer.`,
            },
          ],
        };
      })
    );
    showToast('Delivery order claimed successfully.', 'success');
    await syncWithBackend();
    return true;
  };

  const completeDelivery = async (orderId: string, otp: string): Promise<{ success: boolean; message: string }> => {
    const order = orders.find(o => o.id === orderId);

    // Oracle is authoritative: local cached OTP values can be stale or differ from
    // the current OTP after a resend. Never reject a code using browser state.
    const verification = await deliveryApi.verifyDeliveryOtp(orderId, otp.trim());
    if (!verification.success) {
      return { success: false, message: verification.message || 'Unable to verify delivery OTP.' };
    }

    const deliveryFeePayout = Math.max(45, Math.round((order?.distanceKm || 1.4) * 22) + 20);
    setOrders(prev =>
      prev.map(ord => ord.id !== orderId ? ord : {
        ...ord,
        status: 'delivered',
        paymentStatus: 'paid',
        statusUpdates: [
          ...ord.statusUpdates,
          {
            status: 'delivered',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            note: `Delivered safely to ${ord.deliveryAddress}. OTP verified by server.`,
          },
        ],
      })
    );

    if (order?.deliveryAgentId) {
      setDeliveryAgents(prev =>
        prev.map(ag => ag.id !== order.deliveryAgentId ? ag : {
          ...ag,
          totalTrips: ag.totalTrips + 1,
          todayEarnings: ag.todayEarnings + deliveryFeePayout,
          totalEarnings: ag.totalEarnings + deliveryFeePayout,
        })
      );
    }

    return {
      success: true,
      message: verification.message || `Order successfully delivered! Payout of ₹${deliveryFeePayout} credited to delivery wallet.`,
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
    deliveryApi.registerDeliveryAgent(newAgent);
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
