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

export interface SellerProductFormInput {
  title: string;
  mrp: string;
  sellerPrice: string;
  stock: string;
  additionalDiscount: string;
}

/**
 * Validate seller product form values without side effects so the rules can be
 * regression-tested independently of React and API calls.
 * Returns the existing user-facing validation message, or null when valid.
 */
export const validateSellerProductForm = (form: SellerProductFormInput): string | null => {
  const mrp = Number(form.mrp);
  const price = Number(form.sellerPrice);
  const stock = Number(form.stock);
  const discount = Number(form.additionalDiscount || 0);

  if (!form.title.trim() || !Number.isFinite(mrp) || !Number.isFinite(price) || mrp <= 0 || price <= 0) {
    return 'Enter a valid product name, MRP and selling price.';
  }
  if (price > mrp) {
    return 'Seller price cannot be higher than MRP.';
  }
  if (!Number.isFinite(discount) || !Number.isFinite(stock) || discount < 0 || discount > 100 || stock < 0) {
    return 'Check discount and stock values.';
  }
  return null;
};
