/**
 * REST API Client for KuraliUpdates Bazaar Spring Boot + Oracle DB Backend
 */

export const API_BASE_URL = 
  (import.meta.env.VITE_API_BASE_URL as string) || 
  'https://kuraliupdates-bazaar.onrender.com/api/v1';

export interface BackendProduct {
  productId: string;
  sellerId: string;
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  stockQty: number;
  unit: string;
  locality: string;
  approved: boolean;
  featured: boolean;
}

export interface BackendOrder {
  orderId?: string;
  buyerEmail: string;
  buyerName: string;
  buyerPhone: string;
  deliveryAddress: string;
  deliveryLocality: string;
  totalAmount: number;
  discountAmount: number;
  deliveryFee: number;
  finalPayable: number;
  paymentMethod: string;
  status?: string;
  deliveryOtp?: string;
  deliveryAgentId?: string;
  placedAt?: string;
}

export const bazaarApi = {
  // Health check probe
  async checkHealth(): Promise<{ status: string; service: string; database: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend offline or starting up, using local state:', err);
      return { status: 'STANDALONE', service: 'kurali-bazaar', database: 'Local' };
    }
  },

  // Search products across sellers in Oracle DB
  async searchProducts(query: string = ''): Promise<BackendProduct[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/buyers/products/search?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Failed to fetch from Oracle backend, fallback to local products:', err);
      return [];
    }
  },

  // Place order into Oracle DB
  async placeOrder(order: BackendOrder): Promise<BackendOrder | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/buyers/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('Failed to submit order to Oracle DB:', err);
      return null;
    }
  },

  // Track order in Oracle DB
  async trackOrder(orderId: string): Promise<BackendOrder | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/buyers/orders/${encodeURIComponent(orderId)}/track`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('Failed to track order from Oracle DB:', err);
      return null;
    }
  },

  // Get available delivery jobs from Oracle DB
  async getAvailableDeliveryJobs(): Promise<BackendOrder[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/delivery/jobs/available`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Failed to load delivery jobs from Oracle DB:', err);
      return [];
    }
  }
};
