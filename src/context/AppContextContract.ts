import type {
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
import type { SavedAddress } from '../entities/address';
import type { UserProfile } from '../entities/userProfile';

interface AppContextType {
  // Roles & Auth
  role: UserRole;
  setRole: (role: UserRole) => void;
  registeredRoles: UserRole[];
  authInitializing: boolean;
  user: UserProfile;
  loginWithOtp: (params: {
    identifier?: string;
    email?: string;
    phone?: string;
    name?: string;
    targetRole?: UserRole;
    locality?: string;
    address?: string;
    addressLine1?: string;
    landmark?: string;
    formattedAddress?: string;
    placeId?: string;
    latitude?: number;
    longitude?: number;
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
    addressLine1?: string;
    landmark?: string;
    formattedAddress?: string;
    placeId?: string;
    latitude?: number;
    longitude?: number;
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
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  createBuyerAddress: (address: SavedAddress) => Promise<SavedAddress | null>;
  updateBuyerAddress: (address: SavedAddress) => Promise<SavedAddress | null>;
  setDefaultBuyerAddress: (addressId: string) => Promise<SavedAddress | null>;
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
  addToCart: (product: Product, quantity?: number, negotiatedPrice?: number, acceptedOfferId?: string) => void;
  upsertBargainCartItem: (product: Product, bargainId: string, status: 'PENDING_SELLER' | 'PENDING_BUYER' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CLOSED_PURCHASED', offerPrice?: number, negotiatedPrice?: number, acceptedOfferId?: string) => void;
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
    fulfilmentMode?: 'DELIVERY' | 'STORE_PICKUP';
  }) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => void;

  // Delivery
  claimDeliveryJob: (orderId: string, agentId: string) => Promise<boolean>;
  completeDelivery: (orderId: string, otp: string) => Promise<{ success: boolean; message: string }>;
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

export type { AppContextType };
