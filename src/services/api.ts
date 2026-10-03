/**
 * REST API Client for KuraliUpdates Bazaar Spring Boot + Oracle Autonomous Database Backend
 * Hosted Live on Render: https://kuraliupdates-bazaar.onrender.com/api/v1
 */

import { Product, Seller, Order, DeliveryAgent } from '../types';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  'https://kuraliupdates-bazaar.onrender.com/api/v1';

export interface BackendHealthResponse {
  status: string;
  service: string;
  database: string;
  timestamp?: number;
}

export interface BackendProduct {
  productId: string;
  sellerId?: string;
  seller?: {
    sellerId: string;
    name: string;
    locality: string;
    distanceKm: number;
    rating: number;
  };
  name?: string;
  title?: string;
  category: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  price: number;
  sellerPrice?: number;
  originalPrice?: number;
  mrp?: number;
  additionalDiscountPercent?: number;
  stockQty?: number;
  stock?: number;
  unit: string;
  locality?: string;
  approved?: boolean;
  featured?: boolean;
  isFeatured?: boolean;
  tags?: string[] | string;
}

export interface BackendOrder {
  orderId?: string;
  id?: string;
  buyerEmail: string;
  buyerName: string;
  buyerPhone: string;
  deliveryAddress: string;
  deliveryLocality: string;
  totalAmount: number;
  discountAmount?: number;
  deliveryFee: number;
  finalPayable?: number;
  paymentMethod: string;
  paymentStatus?: string;
  status?: string;
  deliveryOtp?: string;
  deliveryAgentId?: string;
  deliveryAgent?: any;
  placedAt?: string;
  distanceKm?: number;
  items?: any[];
}

export const bazaarApi = {
  /**
   * Health check probe to Render + Oracle DB
   */
  async checkHealth(): Promise<BackendHealthResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${API_BASE_URL}/health`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      console.warn('Backend probe:', err.message || err);
      return {
        status: 'STANDALONE',
        service: 'kuraliupdates-bazaar-api',
        database: 'Local Reactive Store (Connecting to Render / Oracle Cloud...)',
      };
    }
  },

  /**
   * Search and load all live products from Oracle DB
   */
  async searchProducts(query: string = ''): Promise<Product[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(
        `${API_BASE_URL}/buyers/products/search?query=${encodeURIComponent(query)}`,
        { signal: controller.signal, headers: { Accept: 'application/json' } }
      );
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BackendProduct[] = await res.json();

      return data.map((bp) => ({
        id: bp.productId || `prod-${Math.random()}`,
        sellerId: bp.seller?.sellerId || bp.sellerId || 'seller-1',
        sellerName: bp.seller?.name || 'Kurali Merchant',
        sellerLocality: bp.seller?.locality || bp.locality || 'Main Bazaar',
        sellerDistanceKm: bp.seller?.distanceKm || 1.2,
        sellerRating: bp.seller?.rating || 4.8,
        title: bp.name || bp.title || 'Kurali Product',
        category: bp.category || 'General',
        description: bp.description || '',
        image:
          bp.imageUrl ||
          bp.image ||
          'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
        mrp: bp.mrp || bp.originalPrice || bp.price || 100,
        sellerPrice: bp.sellerPrice || bp.price || 90,
        additionalDiscountPercent: bp.additionalDiscountPercent || 0,
        stock: bp.stockQty || bp.stock || 20,
        unit: bp.unit || '1 pc',
        tags: Array.isArray(bp.tags)
          ? bp.tags
          : typeof bp.tags === 'string'
          ? (bp.tags as string).split(',')
          : ['Kurali', 'Local'],
        isFeatured: bp.featured || bp.isFeatured || false,
      }));
    } catch (err) {
      console.warn('Backend searchProducts fallback to local store:', err);
      return [];
    }
  },

  /**
   * Register a new merchant store into Oracle DB
   */
  async registerSeller(seller: Partial<Seller>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/sellers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: seller.name,
          ownerName: seller.ownerName,
          email: seller.email,
          phone: seller.phone,
          category: seller.category,
          address: seller.address,
          locality: seller.locality,
          distanceKm: seller.distanceKm || 1.0,
          rating: seller.rating || 5.0,
          reviewCount: seller.reviewCount || 0,
          avatarUrl: seller.avatarUrl,
          bannerUrl: seller.bannerUrl,
          description: seller.description,
          gstNumber: seller.gstNumber,
          fssaiNumber: seller.fssaiNumber,
          minOrderForFreeDelivery: seller.minOrderForFreeDelivery || 499,
          baseDeliveryFee: seller.baseDeliveryFee || 35,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend registerSeller failed:', err);
      return null;
    }
  },

  /**
   * Add a new product into Oracle DB for a specific seller
   */
  async addProduct(sellerId: string, product: Partial<Product>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/sellers/${encodeURIComponent(sellerId)}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.title,
          category: product.category,
          description: product.description,
          imageUrl: product.image,
          price: product.sellerPrice,
          originalPrice: product.mrp,
          additionalDiscountPercent: product.additionalDiscountPercent || 0,
          stockQty: product.stock,
          unit: product.unit,
          locality: product.sellerLocality,
          featured: product.isFeatured || false,
          approved: true,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend addProduct failed:', err);
      return null;
    }
  },

  /**
   * Fetch pending sellers for City Admin approval
   */
  async getPendingSellers(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/sellers/pending`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend getPendingSellers failed:', err);
      return [];
    }
  },

  /**
   * Admin approves seller in Oracle DB
   */
  async approveSeller(sellerId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/sellers/${encodeURIComponent(sellerId)}/approve`, {
        method: 'POST',
      });
      return res.ok;
    } catch (err) {
      console.warn('Backend approveSeller failed:', err);
      return false;
    }
  },

  /**
   * Admin rejects seller in Oracle DB
   */
  async rejectSeller(sellerId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/sellers/${encodeURIComponent(sellerId)}/reject`, {
        method: 'POST',
      });
      return res.ok;
    } catch (err) {
      console.warn('Backend rejectSeller failed:', err);
      return false;
    }
  },

  /**
   * Fetch market search and category trends
   */
  async getDemandAnalytics(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/analytics/demand-trends`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend getDemandAnalytics failed:', err);
      return null;
    }
  },

  /**
   * Place an order into Oracle DB
   */
  async placeOrder(order: Partial<Order>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/buyers/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerName: order.buyerName,
          buyerEmail: order.buyerEmail,
          buyerPhone: order.buyerPhone,
          deliveryAddress: order.deliveryAddress,
          deliveryLocality: order.deliveryLocality,
          totalAmount: order.totalAmount,
          discountAmount: (order.billDiscountAmount || 0) + (order.couponDiscountAmount || 0),
          deliveryFee: order.deliveryFee,
          finalPayable: order.totalAmount,
          paymentMethod: order.paymentMethod,
          distanceKm: order.distanceKm || 1.5,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend placeOrder failed:', err);
      return null;
    }
  },

  /**
   * Track order from Oracle DB
   */
  async trackOrder(orderId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/buyers/orders/${encodeURIComponent(orderId)}/track`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend trackOrder failed:', err);
      return null;
    }
  },

  /**
   * Register a new delivery rider in Oracle DB
   */
  async registerDeliveryAgent(agent: Partial<DeliveryAgent>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/delivery/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agent.name,
          phone: agent.phone,
          email: agent.email,
          vehicleType: agent.vehicleType,
          vehicleNumber: agent.vehicleNumber,
          licenseNumber: agent.licenseNumber,
          currentLocality: agent.currentLocality || 'Main Bazaar',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend registerDeliveryAgent failed:', err);
      return null;
    }
  },

  /**
   * Get available delivery jobs from Oracle DB
   */
  async getAvailableDeliveryJobs(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/delivery/jobs/available`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend getAvailableDeliveryJobs failed:', err);
      return [];
    }
  },

  /**
   * Delivery rider claims job in Oracle DB
   */
  async claimDeliveryJob(orderId: string, agentId: string): Promise<boolean> {
    try {
      const res = await fetch(
        `${API_BASE_URL}/delivery/jobs/${encodeURIComponent(orderId)}/claim?agentId=${encodeURIComponent(agentId)}`,
        { method: 'POST' }
      );
      return res.ok;
    } catch (err) {
      console.warn('Backend claimDeliveryJob failed:', err);
      return false;
    }
  },

  /**
   * Verify buyer OTP to complete delivery in Oracle DB
   */
  async verifyDeliveryOtp(orderId: string, otp: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/delivery/jobs/${encodeURIComponent(orderId)}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      return { success: res.ok && data.success !== false, message: data.message || 'OTP verified' };
    } catch (err: any) {
      console.warn('Backend verifyDeliveryOtp failed:', err);
      return { success: false, message: err.message || 'Failed to verify OTP' };
    }
  },
};
