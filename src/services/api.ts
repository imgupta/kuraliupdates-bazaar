/**
 * REST API Client for KuraliUpdates Bazaar Spring Boot + Oracle Autonomous Database Backend
 * Hosted Live on Render: https://kuraliupdates-bazaar.onrender.com/api/v1
 */

import { Product, Seller, Order, DeliveryAgent, DailyHelpService, DailyHelpBooking } from '../types';

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

      if (query.trim()) {
        void fetch(`${API_BASE_URL}/analytics/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            query: query.trim(),
            userId: localStorage.getItem('kurali_user_id') || undefined,
          }),
        }).catch(() => undefined);
      }

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

  async getAdminSellers(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/sellers`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend getAdminSellers failed:', err);
      return [];
    }
  },

  async getAdminDeliveryAgents(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/delivery`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend getAdminDeliveryAgents failed:', err);
      return [];
    }
  },

  async getAdminSearchTrends(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/analytics/search-trends`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend getAdminSearchTrends failed:', err);
      return [];
    }
  },

  async getAdminAnalytics(): Promise<any | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/analytics/demand-trends`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend getAdminAnalytics failed:', err);
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
   * Fetch registered buyer accounts for the root admin
   */
  async getAdminBuyers(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/buyers`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend getAdminBuyers failed:', err);
      return [];
    }
  },

  /**
   * Admin approves seller in Oracle DB
   */
  async getPendingDeliveryAgents(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/delivery/pending`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend getPendingDeliveryAgents failed:', err);
      return [];
    }
  },

  async approveDeliveryAgent(agentId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/delivery/${encodeURIComponent(agentId)}/approve`, { method: 'POST' });
      return res.ok;
    } catch (err) {
      console.warn('Backend approveDeliveryAgent failed:', err);
      return false;
    }
  },

  async rejectDeliveryAgent(agentId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/delivery/${encodeURIComponent(agentId)}/reject`, { method: 'POST' });
      return res.ok;
    } catch (err) {
      console.warn('Backend rejectDeliveryAgent failed:', err);
      return false;
    }
  },

  async getOnboardingStatus(token: string): Promise<{ success: boolean; role?: string; status?: 'PENDING' | 'APPROVED' | 'REJECTED'; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/onboarding-status`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({ success: false }));
      if (!res.ok) return { success: false, message: data.message || 'Unable to load onboarding status' };
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Unable to load onboarding status' };
    }
  },

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
          sellerId: order.sellerId,
          subtotal: order.itemSubtotal || order.subtotal || order.totalAmount,
          totalAmount: order.totalAmount,
          discountAmount: (order.billDiscountAmount || 0) + (order.couponDiscountAmount || 0),
          deliveryFee: order.deliveryFee,
          finalPayable: order.totalAmount,
          paymentMethod: order.paymentMethod,
          distanceKm: order.distanceKm || 1.5,
          deliveryLatitude: (order as any).deliveryLatitude,
          deliveryLongitude: (order as any).deliveryLongitude,
          deliveryPlaceId: (order as any).deliveryPlaceId,
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
      const token = localStorage.getItem('kurali_auth_token');
      const res = await fetch(`${API_BASE_URL}/buyers/orders/${encodeURIComponent(orderId)}/track`, {
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend trackOrder failed:', err);
      return null;
    }
  },

  async getLiveTracking(orderId: string): Promise<any> {
    try {
      const token = localStorage.getItem('kurali_auth_token');
      const res = await fetch(`${API_BASE_URL}/tracking/orders/${encodeURIComponent(orderId)}`, {
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Backend getLiveTracking failed:', err);
      return null;
    }
  },

  async updateDeliveryLocation(agentId: string, latitude: number, longitude: number): Promise<boolean> {
    try {
      const token = localStorage.getItem('kurali_auth_token');
      const res = await fetch(`${API_BASE_URL}/tracking/delivery/${encodeURIComponent(agentId)}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ latitude, longitude }),
      });
      return res.ok;
    } catch (err) {
      console.warn('Backend updateDeliveryLocation failed:', err);
      return false;
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

  /**
   * Request a real OTP from the backend. There is deliberately no client-side fallback.
   */
  async sendOtp(identifier: string, type: 'EMAIL' | 'PHONE', mode: 'LOGIN' | 'REGISTER'): Promise<{ success: boolean; message: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ identifier, type, mode }),
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({ success: false, message: '' }));
      if (!res.ok) {
        if (mode === 'LOGIN' && res.status === 404) {
          return { success: false, message: 'No registered account was found. Please register first.' };
        }
        return { success: false, message: data.message || 'Unable to send verification code' };
      }
      return data;
    } catch (err: any) {
      return { success: false, message: err.name === 'AbortError' ? 'Authentication service timed out' : 'Authentication service is unavailable' };
    }
  },

  /**
   * Verify a real OTP. Backend is the only authority for authentication.
   */
  async verifyOtp(payload: {
    identifier?: string;
    otp?: string;
    type?: 'EMAIL' | 'PHONE';
    mode: 'LOGIN' | 'REGISTER';
    name?: string;
    role?: string;
    locality?: string;
    address?: string;
    addressLine1?: string;
    landmark?: string;
    formattedAddress?: string;
    placeId?: string;
    latitude?: number;
    longitude?: number;
    storeName?: string;
    category?: string;
    vehicleType?: string;
    vehicleNumber?: string;
    licenseNumber?: string;
    email?: string;
    phone?: string;
    emailOtp?: string;
    phoneOtp?: string;
  }): Promise<{ success: boolean; token?: string; user?: any; message: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({ success: false, message: 'Invalid authentication response' }));
      if (!res.ok) return { success: false, message: data.message || 'OTP verification failed' };
      return data;
    } catch (err: any) {
      return { success: false, message: err.name === 'AbortError' ? 'Authentication service timed out' : 'Authentication service is unavailable' };
    }
  },

  /**
   * Live Authentication: Verify active session token on app boot
   */
  async updateCurrentUser(token: string, updates: Record<string, any>): Promise<{ success: boolean; user?: any; addresses?: any[]; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      const data = await res.json().catch(() => ({ success: false, message: 'Invalid response' }));
      if (!res.ok) return { success: false, message: data.message || 'Unable to update profile' };
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Unable to update profile' };
    }
  },

  async getBuyerAddresses(token: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me/addresses`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.warn('Backend getBuyerAddresses failed:', err);
      return [];
    }
  },

  async createBuyerAddress(token: string, address: Record<string, any>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(address),
      });
      const data = await res.json().catch(() => null);
      return res.ok ? data : null;
    } catch (err) {
      console.warn('Backend createBuyerAddress failed:', err);
      return null;
    }
  },

  async updateBuyerAddress(token: string, addressId: string, address: Record<string, any>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me/addresses/${encodeURIComponent(addressId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(address),
      });
      const data = await res.json().catch(() => null);
      return res.ok ? data : null;
    } catch (err) {
      console.warn('Backend updateBuyerAddress failed:', err);
      return null;
    }
  },

  async setDefaultBuyerAddress(token: string, addressId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me/addresses/${encodeURIComponent(addressId)}/default`, {
        method: 'PUT',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      return res.ok ? data : null;
    } catch (err) {
      console.warn('Backend setDefaultBuyerAddress failed:', err);
      return null;
    }
  },

  async getMe(token: string): Promise<{ authenticated: boolean; success?: boolean; user?: any; addresses?: any[] }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${API_BASE_URL}/auth/me?token=${encodeURIComponent(token)}`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      console.warn('Backend getMe check:', err.message || err);
    }
    return { authenticated: false };
  },

  /**
   * Live Authentication: Invalidate session on Logout
   */
  async logout(token: string): Promise<{ success: boolean; message: string }> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      });
    } catch (err) {
      // ignore network errors on logout
    }
    return { success: true, message: 'Logged out successfully' };
  },

  async getDailyHelpServices(): Promise<DailyHelpService[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/daily-help/services`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend getDailyHelpServices failed:', err);
      return [];
    }
  },

  async createDailyHelpBooking(payload: Record<string, any>): Promise<DailyHelpBooking | null> {
    try {
      const token = localStorage.getItem('kurali_auth_token');
      const res = await fetch(`${API_BASE_URL}/daily-help/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend createDailyHelpBooking failed:', err);
      return null;
    }
  },

  async getLatestDailyHelpBooking(buyerPhone: string): Promise<DailyHelpBooking | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/daily-help/bookings/latest?buyerPhone=${encodeURIComponent(buyerPhone)}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Backend getLatestDailyHelpBooking failed:', err);
      return null;
    }
  },

  async getDailyHelpBooking(bookingId: string): Promise<DailyHelpBooking | null> {
    try {
      const token = localStorage.getItem('kurali_auth_token');
      const res = await fetch(`${API_BASE_URL}/daily-help/bookings/${encodeURIComponent(bookingId)}`, {
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Backend getDailyHelpBooking failed:', err);
      return null;
    }
  },

};