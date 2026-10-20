/** Catalogue and service-health API boundary. Keeps legacy response mapping and paging behavior. */
import type { Product } from '../../types';
import { API_BASE_URL } from '../http/apiConfig';
import type { BackendHealthResponse, BackendProduct } from './apiTypes';

export const catalogApi = {
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
};
