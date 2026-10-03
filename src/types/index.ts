export type UserRole = 'buyer' | 'seller' | 'delivery' | 'admin';

export type SellerStatus = 'pending' | 'approved' | 'rejected';

export interface Seller {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  category: string;
  address: string;
  locality: string; // e.g. "Main Bazaar, Kurali", "Morinda Road", "Railway Station Road"
  distanceKm: number; // distance from central Kurali Clock Tower / Main Chowk
  rating: number;
  reviewCount: number;
  status: SellerStatus;
  registeredAt: string;
  approvedAt?: string;
  bannerUrl: string;
  description: string;
  gstNumber?: string;
  fssaiNumber?: string;
  minOrderForFreeDelivery: number; // e.g. 499
  baseDeliveryFee: number; // e.g. 35
  billDiscounts: BillDiscountRule[];
}

export interface BillDiscountRule {
  id: string;
  minBillAmount: number;
  discountPercentage?: number;
  flatDiscount?: number;
  description: string;
}

export interface Coupon {
  id: string;
  code: string;
  sellerId: string; // 'all' for platform-wide or specific sellerId
  sellerName?: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  expiryDate: string;
  description: string;
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerLocality: string;
  sellerDistanceKm: number;
  sellerRating: number;
  title: string;
  category: string;
  description: string;
  image: string;
  mrp: number; // Maximum Retail Price
  sellerPrice: number; // Base selling price
  additionalDiscountPercent: number; // Extra shop discount %
  stock: number;
  unit: string; // e.g. "1 kg", "500 ml", "1 Pack", "Piece"
  tags: string[];
  isFeatured?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  negotiatedPrice?: number; // if acquired through bargaining
}

export interface DeliveryAgent {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatarUrl: string;
  vehicleType: 'Bike' | 'Scooter' | 'Electric Bike' | 'Auto / Van';
  vehicleNumber: string;
  licenseNumber: string;
  status: 'active' | 'pending' | 'offline';
  rating: number;
  totalTrips: number;
  todayEarnings: number;
  totalEarnings: number;
  currentLocality: string;
  registeredAt: string;
}

export type OrderStatus =
  | 'placed'
  | 'accepted_by_seller'
  | 'ready_for_pickup'
  | 'assigned_to_delivery'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  deliveryAddress: string;
  deliveryLocality: string;
  items: CartItem[];
  sellerId: string;
  sellerName: string;
  sellerLocality: string;
  subtotal: number;
  billDiscountAmount: number;
  couponDiscountAmount: number;
  couponCode?: string;
  deliveryFee: number;
  isFreeDelivery: boolean;
  totalAmount: number;
  paymentMethod: 'UPI' | 'Card' | 'COD' | 'NetBanking';
  paymentStatus: 'paid' | 'pending_cod';
  status: OrderStatus;
  placedAt: string;
  deliveryAgentId?: string;
  deliveryAgentName?: string;
  deliveryAgentPhone?: string;
  deliveryAgentVehicle?: string;
  deliveryOtp: string;
  distanceKm: number;
  estimatedDeliveryMins: number;
  statusUpdates: {
    status: OrderStatus;
    timestamp: string;
    note: string;
  }[];
}

export interface BargainOffer {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  originalPrice: number;
  offeredPrice: number;
  senderRole: 'buyer' | 'seller';
  quantity: number;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderRole: 'buyer' | 'seller';
  senderName: string;
  text: string;
  timestamp: string;
  offer?: BargainOffer;
}

export interface NegotiationChat {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  sellerId: string;
  sellerName: string;
  buyerName: string;
  buyerEmail: string;
  messages: ChatMessage[];
  lastUpdated: string;
  currentAgreedPrice?: number;
}
