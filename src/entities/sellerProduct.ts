import type { Product } from '../types';

/**
 * Maps a seller API product response into the existing buyer-facing Product
 * contract. Keep the legacy defaults and coercions stable during extraction.
 */
export const mapSellerProduct = (p: any, seller?: any): Product => ({
  id: p.productId,
  sellerId: p.sellerId || seller?.sellerId || '',
  sellerName: p.seller?.name || seller?.storeName || '',
  sellerLocality: p.seller?.locality || seller?.locality || '',
  sellerDistanceKm: Number(p.seller?.distanceKm ?? seller?.distanceKm ?? 1),
  sellerRating: Number(p.seller?.rating ?? seller?.rating ?? 0),
  rating: 0,
  reviewCount: 0,
  isAvailable: Number(p.stock ?? 0) > 0,
  title: p.title,
  category: p.category,
  description: p.description || '',
  image: p.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
  mrp: Number(p.mrp || 0),
  sellerPrice: Number(p.sellerPrice || 0),
  additionalDiscountPercent: Number(p.additionalDiscountPercent || 0),
  stock: Number(p.stock || 0),
  unit: p.unit || '1 pc',
  tags: Array.isArray(p.tags) ? p.tags : [],
  isFeatured: Number(p.isFeatured) === 1 || p.isFeatured === true,
});
