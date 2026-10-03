export type UserRole = 'buyer' | 'seller' | 'delivery' | 'admin';

export type SellerStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Seller {
  sellerId: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  category: string;
  address: string;
  locality: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  status: SellerStatus;
  gstNumber?: string;
  minOrderForFreeDelivery: number;
  baseDeliveryFee: number;
  description?: string;
}

export interface Product {
  productId: string;
  sellerId: string;
  sellerName?: string;
  sellerLocality?: string;
  sellerDistanceKm?: number;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  mrp: number;
  sellerPrice: number;
  additionalDiscountPercent: number;
  effectivePrice?: number;
  stock: number;
  unit: string;
  tags?: string;
  isFeatured?: number;
}

export interface Order {
  orderId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  deliveryAddress: string;
  deliveryLocality: string;
  sellerId: string;
  sellerName?: string;
  subtotal: number;
  billDiscountAmount: number;
  couponDiscountAmount: number;
  deliveryFee: number;
  isFreeDelivery: number;
  totalAmount: number;
  paymentMethod: 'UPI' | 'Card' | 'COD' | 'NetBanking';
  paymentStatus: string;
  status: string;
  deliveryAgentId?: string;
  deliveryOtp: string;
  distanceKm: number;
  estimatedDeliveryMins: number;
}

export interface DeliveryAgent {
  agentId: string;
  fullName: string;
  phone: string;
  email: string;
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
  status: string;
  rating: number;
  totalTrips: number;
  todayEarnings: number;
  totalEarnings: number;
  currentLocality: string;
}
