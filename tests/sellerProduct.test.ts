import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapSellerProduct } from '../src/entities/sellerProduct.ts';

test('maps seller API product fields and seller fallback values', () => {
  assert.deepEqual(
    mapSellerProduct({
      productId: 'product-1',
      title: 'Apples',
      category: 'Fruits',
      description: 'Fresh apples',
      imageUrl: 'apples.png',
      mrp: '120',
      sellerPrice: '95',
      additionalDiscountPercent: '5',
      stock: '8',
      unit: '1 kg',
      tags: ['Kurali', 'Fruits'],
      isFeatured: '1',
    }, {
      sellerId: 'seller-1',
      storeName: 'Main Store',
      locality: 'Main Bazaar',
      distanceKm: '2.5',
      rating: '4.2',
    }),
    {
      id: 'product-1',
      sellerId: 'seller-1',
      sellerName: 'Main Store',
      sellerLocality: 'Main Bazaar',
      sellerDistanceKm: 2.5,
      sellerRating: 4.2,
      rating: 0,
      reviewCount: 0,
      isAvailable: true,
      title: 'Apples',
      category: 'Fruits',
      description: 'Fresh apples',
      image: 'apples.png',
      mrp: 120,
      sellerPrice: 95,
      additionalDiscountPercent: 5,
      stock: 8,
      unit: '1 kg',
      tags: ['Kurali', 'Fruits'],
      isFeatured: true,
    },
  );
});

test('preserves mapper defaults, numeric coercions, and invalid-tag fallback', () => {
  assert.deepEqual(
    mapSellerProduct({
      productId: 'product-2',
      title: 'Milk',
      category: 'Dairy',
      mrp: 0,
      sellerPrice: null,
      additionalDiscountPercent: 0,
      stock: 0,
      isFeatured: false,
      tags: 'not-an-array',
    }, {
      sellerId: '',
      storeName: '',
      locality: '',
      distanceKm: 0,
      rating: 0,
    }),
    {
      id: 'product-2',
      sellerId: '',
      sellerName: '',
      sellerLocality: '',
      sellerDistanceKm: 0,
      sellerRating: 0,
      rating: 0,
      reviewCount: 0,
      isAvailable: false,
      title: 'Milk',
      category: 'Dairy',
      description: '',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
      mrp: 0,
      sellerPrice: 0,
      additionalDiscountPercent: 0,
      stock: 0,
      unit: '1 pc',
      tags: [],
      isFeatured: false,
    },
  );
});

test('uses nested seller fields before dashboard seller fallbacks', () => {
  const product = mapSellerProduct({
    productId: 'product-3',
    sellerId: 'nested-seller',
    seller: { name: 'Nested Store', locality: 'Morinda Road', distanceKm: 3, rating: 4.7 },
    stock: 1,
    tags: [],
    isFeatured: true,
  }, {
    sellerId: 'fallback-seller',
    storeName: 'Fallback Store',
    locality: 'Fallback Locality',
    distanceKm: 9,
    rating: 2,
  });

  assert.equal(product.sellerId, 'nested-seller');
  assert.equal(product.sellerName, 'Nested Store');
  assert.equal(product.sellerLocality, 'Morinda Road');
  assert.equal(product.sellerDistanceKm, 3);
  assert.equal(product.sellerRating, 4.7);
  assert.equal(product.isFeatured, true);
});

import { validateSellerProductForm } from '../src/entities/sellerProduct.ts';

test('accepts valid seller product form values', () => {
  assert.equal(validateSellerProductForm({
    title: 'Apples', mrp: '120', sellerPrice: '95', stock: '8', additionalDiscount: '5',
  }), null);
});

test('rejects missing title and non-positive or non-numeric prices', () => {
  const base = { title: 'Apples', mrp: '120', sellerPrice: '95', stock: '8', additionalDiscount: '0' };
  assert.equal(validateSellerProductForm({ ...base, title: '  ' }), 'Enter a valid product name, MRP and selling price.');
  assert.equal(validateSellerProductForm({ ...base, mrp: '0' }), 'Enter a valid product name, MRP and selling price.');
  assert.equal(validateSellerProductForm({ ...base, sellerPrice: 'not-a-number' }), 'Enter a valid product name, MRP and selling price.');
});

test('rejects a seller price above MRP', () => {
  assert.equal(validateSellerProductForm({
    title: 'Apples', mrp: '100', sellerPrice: '101', stock: '8', additionalDiscount: '0',
  }), 'Seller price cannot be higher than MRP.');
});

test('rejects invalid discount and stock values', () => {
  const base = { title: 'Apples', mrp: '120', sellerPrice: '95', stock: '8', additionalDiscount: '5' };
  assert.equal(validateSellerProductForm({ ...base, additionalDiscount: '101' }), 'Check discount and stock values.');
  assert.equal(validateSellerProductForm({ ...base, additionalDiscount: 'invalid' }), 'Check discount and stock values.');
  assert.equal(validateSellerProductForm({ ...base, stock: '-1' }), 'Check discount and stock values.');
  assert.equal(validateSellerProductForm({ ...base, stock: 'NaN' }), 'Check discount and stock values.');
});

test('allows zero stock and blank discount as the existing defaults intend', () => {
  assert.equal(validateSellerProductForm({
    title: 'Apples', mrp: '120', sellerPrice: '95', stock: '0', additionalDiscount: '',
  }), null);
});

