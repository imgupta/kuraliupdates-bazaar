/** Catalogue and service-health API boundary. Keeps legacy response mapping and paging behavior. */
import type { Product } from '../../types';
import { API_BASE_URL } from '../http/apiConfig';
import type { BackendHealthResponse, BackendProduct } from '../apiTypes';

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

  async searchProducts(query: string = ''): Promise<Product[] | null> {
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

      // Never manufacture product IDs, merchant details, prices, stock, ratings, or images.
      // Ignore incomplete API rows rather than presenting synthetic marketplace inventory.
      return data
        .filter(bp =>
          Boolean(bp.productId && (bp.name || bp.title) && (bp.sellerId || bp.seller?.sellerId) && Number.isFinite(Number(bp.sellerPrice ?? bp.price)) && Number(bp.sellerPrice ?? bp.price) >= 0)
        )
        .map((bp) => ({
          id: bp.productId,
          sellerId: bp.seller?.sellerId || bp.sellerId || '',
          sellerName: bp.seller?.name || '',
          sellerLocality: bp.seller?.locality || bp.locality || '',
          sellerDistanceKm: Number(bp.seller?.distanceKm ?? 0),
          sellerRating: Number(bp.seller?.rating ?? 0),
          title: bp.name || bp.title || '',
          category: bp.category || '',
          description: bp.description || '',
          image: bp.imageUrl || bp.image || '',
          mrp: Number(bp.mrp ?? bp.originalPrice ?? bp.sellerPrice ?? bp.price),
          sellerPrice: Number(bp.sellerPrice ?? bp.price),
          additionalDiscountPercent: Number(bp.additionalDiscountPercent ?? 0),
          stock: Number(bp.stockQty ?? bp.stock ?? 0),
          unit: bp.unit || '',
          tags: Array.isArray(bp.tags)
            ? bp.tags
            : typeof bp.tags === 'string'
            ? bp.tags.split(',').map(tag => tag.trim()).filter(Boolean)
            : [],
          isFeatured: Boolean(bp.featured ?? bp.isFeatured ?? false),
        }));
    } catch (err) {
      console.warn('Backend searchProducts request failed:', err);
      return null;
    }
  },
};
