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
import {
  INITIAL_SELLERS,
  INITIAL_PRODUCTS,
  INITIAL_COUPONS,
  INITIAL_DELIVERY_AGENTS,
  INITIAL_ORDERS,
  INITIAL_CHATS,
  ROOT_ADMIN_EMAIL,
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
}

interface AppContextType {
  // Roles & Auth
  role: UserRole;
  setRole: (role: UserRole) => void;
  user: UserProfile;
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
    couponDiscount: number;
    billDiscounts: { sellerId: string; sellerName: string; amount: number; description: string }[];
    totalBillDiscount: number;
    deliveryFee: number;
    isFreeDelivery: boolean;
    freeDeliveryThresholdRemaining: number;
    finalTotal: number;
  };

  // Orders
  orders: Order[];
  createOrder: (orderData: {
    deliveryAddress: string;
    deliveryPhone: string;
    customerNotes?: string;
    paymentMethod: 'COD' | 'UPI' | 'StorePay';
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load state from localStorage or fallback
  const [role, setRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem('kurali_role') as UserRole) || 'buyer';
  });

  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('kurali_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        /* ignore */
      }
    }
    return {
      email: '',
      name: 'Guest Shopper',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      phone: '',
      locality: 'Main Bazaar, Kurali',
      role: 'buyer',
      isSignedIn: false,
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

  // Secure Role Switcher: Admin is strictly restricted to ROOT_ADMIN_EMAIL
  const setRole = (targetRole: UserRole) => {
    if (targetRole === 'admin') {
      if (user.email.toLowerCase() !== ROOT_ADMIN_EMAIL.toLowerCase()) {
        showToast(`Access Restricted: Admin portal is reserved exclusively for master root user (${ROOT_ADMIN_EMAIL})`, 'error');
        setIsGmailAuthOpen(true);
        return;
      }
    }
    setRoleState(targetRole);
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
    const isRoot = email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase();
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
    };

    setUser(updatedUser);
    setRoleState(effectiveRole);

    showToast(
      isRoot
        ? `Root Administrator Verified! Welcome ${name}.`
        : `Signed in successfully via Gmail (${effectiveRole.toUpperCase()})`,
      'success'
    );
  };

  // Register Buyer
  const registerBuyer = (data: { name: string; email: string; phone: string; locality: string; address: string }) => {
    const isRoot = data.email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase();
    const updatedUser: UserProfile = {
      email: data.email,
      name: data.name,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name)}&backgroundColor=0284c7,f59e0b,10b981`,
      phone: data.phone,
      locality: data.locality,
      address: data.address,
      role: isRoot ? 'admin' : 'buyer',
      isSignedIn: true,
    };
    setUser(updatedUser);
    setRoleState(isRoot ? 'admin' : 'buyer');
    showToast(`Buyer registration complete! Welcome to KuraliUpdates Bazaar, ${data.name}.`, 'success');
  };

  const logout = () => {
    setUser({
      email: '',
      name: 'Guest Shopper',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      phone: '',
      locality: 'Main Bazaar, Kurali',
      role: 'buyer',
      isSignedIn: false,
    });
    setRoleState('buyer');
    showToast('Signed out successfully.', 'info');
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
  const registerSeller = (
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
  };

  const approveSeller = (sellerId: string) => {
    setSellers(prev =>
      prev.map(s => (s.id === sellerId ? { ...s, status: 'approved', approvedAt: new Date().toISOString() } : s))
    );
    showToast('Seller store approved! Now live for Kurali buyers.', 'success');
  };

  const rejectSeller = (sellerId: string) => {
    setSellers(prev =>
      prev.map(s => (s.id === sellerId ? { ...s, status: 'rejected' } : s))
    );
    showToast('Seller store rejected.', 'info');
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
      if (appliedCoupon.flatDiscount) {
        couponDiscount = appliedCoupon.flatDiscount;
      } else if (appliedCoupon.discountPercentage) {
        couponDiscount = Math.round((itemSubtotal * appliedCoupon.discountPercentage) / 100);
        if (appliedCoupon.maxDiscount) {
          couponDiscount = Math.min(couponDiscount, appliedCoupon.maxDiscount);
        }
      }
    }

    const isFreeDelivery = itemSubtotal >= highestDeliveryThreshold;
    const deliveryFee = cart.length === 0 || isFreeDelivery ? 0 : baseDeliveryFee;
    const freeDeliveryThresholdRemaining = Math.max(0, highestDeliveryThreshold - itemSubtotal);
    const finalTotal = Math.max(0, itemSubtotal - totalBillDiscount - couponDiscount + deliveryFee);

    return {
      itemSubtotal,
      couponDiscount,
      billDiscounts: activeBillDiscounts,
      totalBillDiscount,
      deliveryFee,
      isFreeDelivery,
      freeDeliveryThresholdRemaining,
      finalTotal,
    };
  }, [cart, sellers, appliedCoupon]);

  // Order Actions
  const createOrder = (orderData: {
    deliveryAddress: string;
    deliveryPhone: string;
    customerNotes?: string;
    paymentMethod: 'COD' | 'UPI' | 'StorePay';
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
      buyerName: user.name || 'Local Shopper',
      buyerEmail: user.email || 'shopper@kuraliupdates.com',
      buyerPhone: orderData.deliveryPhone,
      deliveryAddress: orderData.deliveryAddress,
      deliveryLocality: user.locality || 'Main Bazaar',
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
