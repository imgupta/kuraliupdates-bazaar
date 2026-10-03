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
} from '../data/initialData';

export interface UserProfile {
  email: string;
  name: string;
  avatarUrl: string;
  phone: string;
  locality: string;
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
  loginWithGoogle: (email: string, name?: string, role?: UserRole) => void;
  logout: () => void;

  // Sellers
  sellers: Seller[];
  currentSeller: Seller | null;
  registerSeller: (data: Omit<Seller, 'id' | 'status' | 'registeredAt' | 'rating' | 'reviewCount'>) => string;
  approveSeller: (sellerId: string) => void;
  rejectSeller: (sellerId: string) => void;
  updateSeller: (sellerId: string, updates: Partial<Seller>) => void;

  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'sellerId' | 'sellerName' | 'sellerLocality' | 'sellerDistanceKm' | 'sellerRating'>) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;

  // Coupons
  coupons: Coupon[];
  addCoupon: (coupon: Omit<Coupon, 'id'>) => void;
  deleteCoupon: (couponId: string) => void;

  // Cart & Pricing Calculations
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, negotiatedPrice?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  cartCalculations: {
    subtotal: number;
    billDiscount: number;
    couponDiscount: number;
    deliveryFee: number;
    isFreeDelivery: boolean;
    freeDeliveryThreshold: number;
    amountNeededForFreeDelivery: number;
    finalTotal: number;
    activeSeller: Seller | null;
  };

  // Orders
  orders: Order[];
  createOrder: (orderData: {
    buyerName: string;
    buyerPhone: string;
    deliveryAddress: string;
    deliveryLocality: string;
    paymentMethod: 'UPI' | 'Card' | 'COD' | 'NetBanking';
  }) => Order | null;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, note: string) => void;
  claimDeliveryJob: (orderId: string, agentId: string) => void;
  completeDelivery: (orderId: string, enteredOtp: string) => { success: boolean; message: string };

  // Delivery Agents
  deliveryAgents: DeliveryAgent[];
  currentAgent: DeliveryAgent | null;
  registerDeliveryAgent: (data: Omit<DeliveryAgent, 'id' | 'status' | 'rating' | 'totalTrips' | 'todayEarnings' | 'totalEarnings' | 'registeredAt'>) => void;

  // Negotiation & Bargaining Chat
  chats: NegotiationChat[];
  openChatForProduct: (product: Product, startingOfferPrice?: number) => string;
  sendMessage: (chatId: string, text: string, offer?: BargainOffer) => void;
  respondToOffer: (chatId: string, offerId: string, action: 'accept' | 'reject' | 'counter', counterPrice?: number) => void;

  // UI state & Modals
  selectedCityLocality: string;
  setSelectedCityLocality: (loc: string) => void;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  comparingProduct: Product | null;
  setComparingProduct: (product: Product | null) => void;
  trackingOrderId: string | null;
  setTrackingOrderId: (id: string | null) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isSellerRegisterOpen: boolean;
  setIsSellerRegisterOpen: (open: boolean) => void;
  isDeliveryRegisterOpen: boolean;
  setIsDeliveryRegisterOpen: (open: boolean) => void;
  isGmailAuthOpen: boolean;
  setIsGmailAuthOpen: (open: boolean) => void;
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
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      email: 'sg7508359237@gmail.com',
      name: 'Simran Singh',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      phone: '+91 75083 59237',
      locality: 'Main Bazaar, Kurali',
      role: 'buyer',
      isSignedIn: true,
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

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    setUser(prev => ({
      ...prev,
      role: newRole,
      sellerId: newRole === 'seller' ? (prev.sellerId || 'seller-1') : prev.sellerId,
      deliveryAgentId: newRole === 'delivery' ? (prev.deliveryAgentId || 'agent-1') : prev.deliveryAgentId,
    }));
    showToast(`Switched view to ${newRole.toUpperCase()} mode`, 'info');
  };

  const loginWithGoogle = (email: string, name = 'Google User', targetRole: UserRole = role) => {
    let matchedSellerId: string | undefined;
    let matchedAgentId: string | undefined;

    const matchedSeller = sellers.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (matchedSeller) {
      matchedSellerId = matchedSeller.id;
    } else if (targetRole === 'seller') {
      matchedSellerId = 'seller-1';
    }

    const matchedAgent = deliveryAgents.find(a => a.email.toLowerCase() === email.toLowerCase());
    if (matchedAgent) {
      matchedAgentId = matchedAgent.id;
    } else if (targetRole === 'delivery') {
      matchedAgentId = 'agent-1';
    }

    setUser({
      email,
      name,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0284c7,f59e0b,10b981`,
      phone: '+91 98765 00000',
      locality: 'Main Bazaar, Kurali',
      sellerId: matchedSellerId,
      deliveryAgentId: matchedAgentId,
      role: targetRole,
      isSignedIn: true,
    });
    setRoleState(targetRole);
    setIsGmailAuthOpen(false);
    showToast(`Welcome ${name}! Authenticated via Google (${email})`, 'success');
  };

  const logout = () => {
    setUser({
      email: '',
      name: 'Guest User',
      avatarUrl: '',
      phone: '',
      locality: 'Kurali City',
      role: 'buyer',
      isSignedIn: false,
    });
    setRoleState('buyer');
    showToast('Logged out successfully', 'info');
  };

  const currentSeller = sellers.find(s => s.id === (user.sellerId || 'seller-1')) || sellers[0] || null;
  const currentAgent = deliveryAgents.find(a => a.id === (user.deliveryAgentId || 'agent-1')) || deliveryAgents[0] || null;

  // Seller management
  const registerSeller = (data: Omit<Seller, 'id' | 'status' | 'registeredAt' | 'rating' | 'reviewCount'>): string => {
    const newId = `seller-${Date.now()}`;
    const newSeller: Seller = {
      ...data,
      id: newId,
      status: 'pending', // Requires admin approval!
      registeredAt: new Date().toISOString(),
      rating: 0,
      reviewCount: 0,
    };
    setSellers(prev => [newSeller, ...prev]);
    setUser(prev => ({ ...prev, sellerId: newId }));
    showToast('Store registration submitted for Admin Approval!', 'success');
    return newId;
  };

  const approveSeller = (sellerId: string) => {
    setSellers(prev =>
      prev.map(s =>
        s.id === sellerId
          ? { ...s, status: 'approved', approvedAt: new Date().toISOString() }
          : s
      )
    );
    showToast('Seller registration approved successfully!', 'success');
  };

  const rejectSeller = (sellerId: string) => {
    setSellers(prev =>
      prev.map(s => (s.id === sellerId ? { ...s, status: 'rejected' } : s))
    );
    showToast('Seller registration rejected', 'info');
  };

  const updateSeller = (sellerId: string, updates: Partial<Seller>) => {
    setSellers(prev =>
      prev.map(s => (s.id === sellerId ? { ...s, ...updates } : s))
    );
    showToast('Seller profile updated', 'success');
  };

  // Product management
  const addProduct = (
    productData: Omit<Product, 'id' | 'sellerId' | 'sellerName' | 'sellerLocality' | 'sellerDistanceKm' | 'sellerRating'>
  ) => {
    const activeSellerObj = currentSeller;
    if (!activeSellerObj) {
      showToast('Please select or register an approved store first', 'error');
      return;
    }
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      sellerId: activeSellerObj.id,
      sellerName: activeSellerObj.name,
      sellerLocality: activeSellerObj.locality,
      sellerDistanceKm: activeSellerObj.distanceKm,
      sellerRating: activeSellerObj.rating,
    };
    setProducts(prev => [newProduct, ...prev]);
    showToast(`Product "${productData.title}" added to inventory`, 'success');
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, ...updates } : p))
    );
    showToast('Product updated successfully', 'success');
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    showToast('Product removed from inventory', 'info');
  };

  // Coupon management
  const addCoupon = (couponData: Omit<Coupon, 'id'>) => {
    const newCoupon: Coupon = {
      ...couponData,
      id: `c-${Date.now()}`,
    };
    setCoupons(prev => [newCoupon, ...prev]);
    showToast(`Coupon ${couponData.code} created successfully`, 'success');
  };

  const deleteCoupon = (couponId: string) => {
    setCoupons(prev => prev.filter(c => c.id !== couponId));
    showToast('Coupon removed', 'info');
  };

  // Cart operations
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
    showToast(`Added ${product.title} to cart`, 'success');
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    showToast('Item removed from cart', 'info');
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  // Cart Calculations (MRP, Seller Price, Additional Discount, Bill Discount, Coupons, Free Delivery)
  const cartCalculations = (() => {
    if (cart.length === 0) {
      return {
        subtotal: 0,
        billDiscount: 0,
        couponDiscount: 0,
        deliveryFee: 0,
        isFreeDelivery: false,
        freeDeliveryThreshold: 499,
        amountNeededForFreeDelivery: 499,
        finalTotal: 0,
        activeSeller: null,
      };
    }

    // Determine the primary seller for bill discount and free delivery rules
    const primarySellerId = cart[0].product.sellerId;
    const activeSeller = sellers.find(s => s.id === primarySellerId) || sellers[0];

    // Calculate subtotal using negotiated price or (sellerPrice - additionalDiscountPercent)
    let subtotal = 0;
    cart.forEach(item => {
      let unitPrice: number;
      if (item.negotiatedPrice && item.negotiatedPrice > 0) {
        unitPrice = item.negotiatedPrice;
      } else {
        const extraDiscount = (item.product.sellerPrice * item.product.additionalDiscountPercent) / 100;
        unitPrice = Math.round(item.product.sellerPrice - extraDiscount);
      }
      subtotal += unitPrice * item.quantity;
    });

    // Calculate Bill Discount provided by the seller
    let billDiscount = 0;
    if (activeSeller && activeSeller.billDiscounts) {
      activeSeller.billDiscounts.forEach(rule => {
        if (subtotal >= rule.minBillAmount) {
          let discountFromRule = 0;
          if (rule.flatDiscount) {
            discountFromRule = rule.flatDiscount;
          } else if (rule.discountPercentage) {
            discountFromRule = Math.round((subtotal * rule.discountPercentage) / 100);
          }
          if (discountFromRule > billDiscount) {
            billDiscount = discountFromRule;
          }
        }
      });
    }

    // Calculate Coupon Discount
    let couponDiscount = 0;
    if (appliedCoupon) {
      if (subtotal >= appliedCoupon.minOrderValue) {
        if (appliedCoupon.discountType === 'flat') {
          couponDiscount = appliedCoupon.discountValue;
        } else {
          const calculated = Math.round((subtotal * appliedCoupon.discountValue) / 100);
          couponDiscount = appliedCoupon.maxDiscount
            ? Math.min(calculated, appliedCoupon.maxDiscount)
            : calculated;
        }
      }
    }

    // Free delivery check
    const freeDeliveryThreshold = activeSeller ? activeSeller.minOrderForFreeDelivery : 499;
    const baseFee = activeSeller ? activeSeller.baseDeliveryFee : 35;
    const isFreeDelivery = subtotal >= freeDeliveryThreshold;
    const deliveryFee = isFreeDelivery ? 0 : baseFee;
    const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);

    const finalTotal = Math.max(0, subtotal - billDiscount - couponDiscount + deliveryFee);

    return {
      subtotal,
      billDiscount,
      couponDiscount,
      deliveryFee,
      isFreeDelivery,
      freeDeliveryThreshold,
      amountNeededForFreeDelivery,
      finalTotal,
      activeSeller,
    };
  })();

  const applyCoupon = (code: string): { success: boolean; message: string } => {
    const formattedCode = code.trim().toUpperCase();
    const found = coupons.find(c => c.code.toUpperCase() === formattedCode);
    if (!found) {
      return { success: false, message: 'Invalid coupon code' };
    }
    if (cartCalculations.subtotal < found.minOrderValue) {
      return {
        success: false,
        message: `Min order value for ${found.code} is ₹${found.minOrderValue}. Add items worth ₹${found.minOrderValue - cartCalculations.subtotal} more!`,
      };
    }
    if (found.sellerId !== 'all' && cart[0]?.product.sellerId !== found.sellerId) {
      return {
        success: false,
        message: `This coupon is exclusively valid for ${found.sellerName || 'specific store'}`,
      };
    }
    setAppliedCoupon(found);
    return { success: true, message: `Coupon ${found.code} applied! Saved discount.` };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast('Coupon removed', 'info');
  };

  // Order creation and tracking
  const createOrder = (orderData: {
    buyerName: string;
    buyerPhone: string;
    deliveryAddress: string;
    deliveryLocality: string;
    paymentMethod: 'UPI' | 'Card' | 'COD' | 'NetBanking';
  }): Order | null => {
    if (cart.length === 0) return null;

    const primarySeller = cartCalculations.activeSeller || sellers[0];
    const newOrderId = `ORD-KUR-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomOtp = `${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: newOrderId,
      buyerName: orderData.buyerName,
      buyerPhone: orderData.buyerPhone,
      buyerEmail: user.email || 'customer@kuraliupdates.com',
      deliveryAddress: orderData.deliveryAddress,
      deliveryLocality: orderData.deliveryLocality,
      items: [...cart],
      sellerId: primarySeller.id,
      sellerName: primarySeller.name,
      sellerLocality: primarySeller.locality,
      subtotal: cartCalculations.subtotal,
      billDiscountAmount: cartCalculations.billDiscount,
      couponDiscountAmount: cartCalculations.couponDiscount,
      couponCode: appliedCoupon?.code,
      deliveryFee: cartCalculations.deliveryFee,
      isFreeDelivery: cartCalculations.isFreeDelivery,
      totalAmount: cartCalculations.finalTotal,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: orderData.paymentMethod === 'COD' ? 'pending_cod' : 'paid',
      status: 'placed',
      placedAt: new Date().toISOString(),
      deliveryOtp: randomOtp,
      distanceKm: primarySeller.distanceKm + 0.8,
      estimatedDeliveryMins: 25,
      statusUpdates: [
        {
          status: 'placed',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          note: `Order placed via ${orderData.paymentMethod} on KuraliUpdates`,
        },
      ],
    };

    setOrders(prev => [newOrder, ...prev]);
    clearCart();
    setTrackingOrderId(newOrderId);
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus, note: string) => {
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          status: newStatus,
          statusUpdates: [
            ...ord.statusUpdates,
            {
              status: newStatus,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              note,
            },
          ],
        };
      })
    );
    showToast(`Order ${orderId} updated: ${newStatus.replace(/_/g, ' ')}`, 'info');
  };

  const claimDeliveryJob = (orderId: string, agentId: string) => {
    const agent = deliveryAgents.find(a => a.id === agentId) || deliveryAgents[0];
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          status: 'assigned_to_delivery',
          deliveryAgentId: agent.id,
          deliveryAgentName: agent.name,
          deliveryAgentPhone: agent.phone,
          deliveryAgentVehicle: `${agent.vehicleType} (${agent.vehicleNumber})`,
          statusUpdates: [
            ...ord.statusUpdates,
            {
              status: 'assigned_to_delivery',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              note: `Assigned to delivery agent ${agent.name}. Pickup underway.`,
            },
          ],
        };
      })
    );
    showToast(`Delivery job claimed! Navigating to seller pickup`, 'success');
  };

  const completeDelivery = (orderId: string, enteredOtp: string): { success: boolean; message: string } => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return { success: false, message: 'Order not found' };
    if (order.deliveryOtp !== enteredOtp.trim()) {
      return { success: false, message: 'Incorrect Delivery OTP. Ask buyer for 4-digit code.' };
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

    // Update agent earnings
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
    setUser(prev => ({ ...prev, deliveryAgentId: newId, role: 'delivery' }));
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

        // Add automated reply message
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
