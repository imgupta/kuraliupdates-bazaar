import { Product } from '../../types';

const normalizeComparableValue = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

/**
 * Conservative catalogue matching: compare only the same normalized product
 * name and pack size. Category/tag similarity is not enough to claim products
 * are equivalent (e.g. different brands or pack sizes).
 */
export const isComparableProduct = (candidate: Product, reference: Product) =>
  normalizeComparableValue(candidate.title) === normalizeComparableValue(reference.title)
  && normalizeComparableValue(candidate.unit) === normalizeComparableValue(reference.unit);

export const getComparableSellerOffers = (products: Product[], reference: Product) => {
  const matching = products.filter(product =>
    product.stock > 0 && isComparableProduct(product, reference)
  );
  if (reference.stock > 0 && !matching.some(product => product.id === reference.id)) matching.push(reference);

  // A seller can publish duplicate catalogue rows; represent that store once,
  // preferring the lowest effective in-stock offer.
  const bySeller = new Map<string, Product>();
  matching.forEach(product => {
    const key = product.sellerId || product.id;
    const existing = bySeller.get(key);
    if (!existing || product.id === reference.id) {
      bySeller.set(key, product);
      return;
    }
    const price = product.sellerPrice * (1 - product.additionalDiscountPercent / 100);
    const existingPrice = existing.sellerPrice * (1 - existing.additionalDiscountPercent / 100);
    if (price < existingPrice) bySeller.set(key, product);
  });

  return Array.from(bySeller.values()).sort((a, b) =>
    a.sellerPrice * (1 - a.additionalDiscountPercent / 100)
    - b.sellerPrice * (1 - b.additionalDiscountPercent / 100)
  );
};

/** Build all card counts in one pass so a large catalogue does not cause O(n²) filtering. */
export const getComparableSellerCounts = (products: Product[]) => {
  const sellersByProduct = new Map<string, Set<string>>();
  products.forEach(product => {
    if (product.stock <= 0) return;
    const key = `${normalizeComparableValue(product.title)}::${normalizeComparableValue(product.unit)}`;
    const sellers = sellersByProduct.get(key) || new Set<string>();
    sellers.add(product.sellerId || product.id);
    sellersByProduct.set(key, sellers);
  });

  return new Map(products.map(product => {
    const key = `${normalizeComparableValue(product.title)}::${normalizeComparableValue(product.unit)}`;
    return [product.id, sellersByProduct.get(key)?.size || 0] as const;
  }));
};
