/**
 * REST API Client for KuraliUpdates Bazaar Spring Boot + Oracle Autonomous Database Backend
 * Hosted Live on Render: https://kuraliupdates-bazaar.onrender.com/api/v1
 */

import { Product, Order } from '../types';
import { mapBackendOrder, type BackendOrder } from '../entities/orderMapping';
import { API_BASE_URL } from './http/apiConfig';
export { API_BASE_URL } from './http/apiConfig';

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
      // The backend caps each response to keep catalogue queries bounded. Fetch
      // successive pages here so existing screens continue to receive the full
      // matching catalogue without requiring every caller to implement paging.
      const pageSize = 100;
      const data: BackendProduct[] = [];
      for (let page = 0; ; page += 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        let res: Response;
        try {
          res = await fetch(
            `${API_BASE_URL}/buyers/products/search?query=${encodeURIComponent(query)}&page=${page}&size=${pageSize}`,
            { signal: controller.signal, headers: { Accept: 'application/json' } }
          );
        } finally {
          clearTimeout(timeoutId);
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const pageData: BackendProduct[] = await res.json();
        data.push(...pageData);
        if (pageData.length < pageSize) break;
      }

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
  async getOnboardingStatus(token: string, role?: string): Promise<{ success: boolean; role?: string; status?: 'PENDING' | 'APPROVED' | 'REJECTED'; message?: string }> {
    try {
      const query = role ? `?role=${encodeURIComponent(role)}` : '';
      const res = await fetch(`${API_BASE_URL}/auth/onboarding-status${query}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({ success: false }));
      if (!res.ok) return { success: false, message: data.message || 'Unable to load onboarding status' };
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Unable to load onboarding status' };
    }
  },

  async placeOrder(order: Partial<Order>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/buyers/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(localStorage.getItem('kurali_auth_token') ? { Authorization: `Bearer ${localStorage.getItem('kurali_auth_token')}` } : {}) },
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
          items: (order.items || []).map(item => ({ productId: item.product.id, quantity: item.quantity, negotiatedPrice: item.negotiatedPrice })),
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
  async getMyOrders(): Promise<Order[]> {
    const token = localStorage.getItem('kurali_auth_token');
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE_URL}/buyers/me/orders`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BackendOrder[] = await res.json();
      return data.map(order => mapBackendOrder(order));
    } catch (err) {
      console.warn('Backend getMyOrders failed:', err);
      return [];
    }
  },

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


  async checkRegistration(email: string, phone: string, role: string): Promise<{ success: boolean; message: string; available?: boolean; existingAccount?: boolean }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/registration-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, phone, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, message: data.message || 'Unable to validate registration details' };
      return data;
    } catch {
      return { success: false, message: 'Authentication service is unavailable. Please try again.' };
    }
  },

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
    const controller = new AbortController();
    // Verification consumes the OTP and creates a session in one request. Avoid
    // abandoning the response while the backend wakes up or completes DB work.
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({ success: false, message: 'Invalid authentication response' }));
      if (!res.ok) return { success: false, message: data.message || 'OTP verification failed' };
      return data;
    } catch (err: any) {
      return { success: false, message: err.name === 'AbortError' ? 'Authentication service timed out. Please request a fresh code before trying again.' : 'Authentication service is unavailable' };
    } finally {
      clearTimeout(timeoutId);
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

  async createPortalHandoff(token: string, role: string): Promise<{ code: string; role: string } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/portal-handoff`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: role.toUpperCase() }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.success && data.code && data.role ? { code: data.code, role: data.role } : null;
    } catch (err) {
      console.warn('Backend createPortalHandoff failed:', err);
      return null;
    }
  },

  async redeemPortalHandoff(code: string): Promise<{ success: boolean; token?: string; user?: any; roles?: string[]; role?: string } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/portal-handoff/redeem`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Backend redeemPortalHandoff failed:', err);
      return null;
    }
  },

  async getRegisteredRoles(token: string): Promise<string[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me/roles`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return ['BUYER'];
      const data = await res.json();
      return data.success && Array.isArray(data.roles) ? data.roles : ['BUYER'];
    } catch (err) {
      console.warn('Backend getRegisteredRoles failed:', err);
      return ['BUYER'];
    }
  },


};