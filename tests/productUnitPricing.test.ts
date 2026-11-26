import test from 'node:test';
import assert from 'node:assert/strict';
import { formatProductUnitPrice } from '../src/utils/productUnitPricing';

test('unit price normalizes explicit weight and volume packs', () => {
  assert.equal(formatProductUnitPrice(30, '500 g'), '₹60/kg');
  assert.equal(formatProductUnitPrice(24, '500 ml'), '₹48/L');
  assert.equal(formatProductUnitPrice(80, '1 kg'), '₹80/kg');
});

test('unit price supports pieces and rejects ambiguous pack labels', () => {
  assert.equal(formatProductUnitPrice(30, '3 pcs'), '₹10/piece');
  assert.equal(formatProductUnitPrice(50, '1 Pack'), null);
  assert.equal(formatProductUnitPrice(-1, '1 kg'), null);
  assert.equal(formatProductUnitPrice(10, '0 g'), null);
});
