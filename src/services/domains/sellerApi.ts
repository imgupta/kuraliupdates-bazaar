import type { Product, Seller } from '../../types';
import { API_BASE_URL } from '../http/apiConfig';

/** Domain-owned API operations; endpoint and fallback behavior retained from the legacy client. */
export const sellerApi = {
  async registerSeller(seller: Partial<Seller>): Promise<any> {
      try {
        const res = await fetch(`${API_BASE_URL}/sellers/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeName: seller.name,
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

  async addProduct(sellerId: string, product: Partial<Product>): Promise<any> {
      try {
        const res = await fetch(`${API_BASE_URL}/sellers/${encodeURIComponent(sellerId)}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: product.title,
            category: product.category,
            description: product.description,
            imageUrl: product.image,
            mrp: product.mrp,
            sellerPrice: product.sellerPrice,
            additionalDiscountPercent: product.additionalDiscountPercent || 0,
            stock: product.stock,
            unit: product.unit,
            tags: product.tags || [],
            isFeatured: product.isFeatured || false,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Backend addProduct failed:', err);
        return null;
      }
    },

  async getCurrentSeller(): Promise<any | null> {
      const token = localStorage.getItem('kurali_auth_token');
      if (!token) return null;
      try {
        const res = await fetch(`${API_BASE_URL}/sellers/me`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) { console.warn('Backend getCurrentSeller failed:', err); return null; }
    },

  async getSellerProducts(): Promise<any[]> {
      const token = localStorage.getItem('kurali_auth_token');
      if (!token) return [];
      try {
        const res = await fetch(`${API_BASE_URL}/sellers/me/products`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) { console.warn('Backend getSellerProducts failed:', err); return []; }
    },

  async createSellerProduct(product: Record<string, any>): Promise<any | null> {
      const token = localStorage.getItem('kurali_auth_token');
      if (!token) throw new Error('Your seller session has expired. Please sign in again.');
      const res = await fetch(`${API_BASE_URL}/sellers/me/products`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(product),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      return data;
    },

  async updateSellerProduct(productId: string, product: Record<string, any>): Promise<any | null> {
      const token = localStorage.getItem('kurali_auth_token');
      if (!token) throw new Error('Your seller session has expired. Please sign in again.');
      const res = await fetch(`${API_BASE_URL}/sellers/me/products/${encodeURIComponent(productId)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(product),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      return data;
    },

  async deleteSellerProduct(productId: string): Promise<boolean> {
      const token = localStorage.getItem('kurali_auth_token');
      if (!token) return false;
      const res = await fetch(`${API_BASE_URL}/sellers/me/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const data = await res.json().catch(() => null); throw new Error(data?.message || `HTTP ${res.status}`); }
      return true;
    },

  async getSellerOrders(): Promise<any[]> {
      const token = localStorage.getItem('kurali_auth_token');
      if (!token) return [];
      try {
        const res = await fetch(`${API_BASE_URL}/sellers/me/orders`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) { console.warn('Backend getSellerOrders failed:', err); return []; }
    },

  async updateSellerOrderStatus(orderId: string, status: string): Promise<any | null> {
      const token = localStorage.getItem('kurali_auth_token');
      if (!token) throw new Error('Your seller session has expired. Please sign in again.');
      const res = await fetch(`${API_BASE_URL}/sellers/me/orders/${encodeURIComponent(orderId)}/status?status=${encodeURIComponent(status)}`, {
        method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      return data;
    },

  async getSellerDiscounts(): Promise<any[]> {
      const token = localStorage.getItem('kurali_auth_token');
      if (!token) return [];
      try {
        const res = await fetch(`${API_BASE_URL}/sellers/me/discounts`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) { console.warn('Backend getSellerDiscounts failed:', err); return []; }
    },

  async createSellerDiscount(payload: Record<string, any>): Promise<any> {
      const token = localStorage.getItem('kurali_auth_token');
      if (!token) throw new Error('Your seller session has expired.');
      const res = await fetch(`${API_BASE_URL}/sellers/me/discounts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      return data;
    },

  async deleteSellerDiscount(ruleId: string): Promise<boolean> {
      const token = localStorage.getItem('kurali_auth_token');
      if (!token) return false;
      const res = await fetch(`${API_BASE_URL}/sellers/me/discounts/${encodeURIComponent(ruleId)}`, { method: 'DELETE', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || `HTTP ${res.status}`);
      return true;
    }
};
