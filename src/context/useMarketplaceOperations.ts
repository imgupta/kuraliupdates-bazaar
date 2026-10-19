import type { Dispatch, SetStateAction } from 'react';
import type { Coupon, CartItem, DeliveryAgent, Order, OrderStatus, Product, Seller, UserRole } from '../types';
import type { UserProfile } from '../entities/userProfile';
import { bazaarApi } from '../services/api';
import { sellerApi } from '../services/domains/sellerApi';
import { adminApi } from '../services/domains/adminApi';
import { deliveryApi } from '../services/domains/deliveryApi';

type MarketplaceOperationsOptions = {
  sellers: Seller[];
  setSellers: Dispatch<SetStateAction<Seller[]>>;
  products: Product[];
  setProducts: Dispatch<SetStateAction<Product[]>>;
  coupons: Coupon[];
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

export const useMarketplaceOperations = ({
  sellers, setSellers, products, setProducts, coupons, setCoupons,
  deliveryAgents, setDeliveryAgents, orders, setOrders, user, setUser,
  setRoleState, cart, cartCalculations, clearCart, setTrackingOrderId,
  syncWithBackend, showToast,
}: MarketplaceOperationsOptions) => {
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


  return {
    registerSeller, approveSeller, rejectSeller, approveDeliveryAgent, rejectDeliveryAgent,
    updateSeller, addProduct, updateProduct, deleteProduct, addCoupon, deleteCoupon,
    createOrder, updateOrderStatus, claimDeliveryJob, completeDelivery, registerDeliveryAgent,
  };
};
