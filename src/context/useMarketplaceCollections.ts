import { useState } from 'react';
import type { Coupon, DeliveryAgent, Order, Product, Seller } from '../types';
import {
  INITIAL_COUPONS,
  INITIAL_DELIVERY_AGENTS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_SELLERS,
} from '../data/initialData';
import { safeStorageJson } from '../shared/storage/safeStorage';
import { usePersistedValue } from './usePersistedValue';

/** Owns marketplace collection initialization and persistence, independent of provider composition. */
export const useMarketplaceCollections = () => {
  const [sellers, setSellers] = useState<Seller[]>(() => safeStorageJson('kurali_sellers', INITIAL_SELLERS));
  const [products, setProducts] = useState<Product[]>(() => safeStorageJson('kurali_products', INITIAL_PRODUCTS));
  const [coupons, setCoupons] = useState<Coupon[]>(() => safeStorageJson('kurali_coupons', INITIAL_COUPONS));
  const [deliveryAgents, setDeliveryAgents] = useState<DeliveryAgent[]>(() => safeStorageJson('kurali_delivery_agents', INITIAL_DELIVERY_AGENTS));
  const [orders, setOrders] = useState<Order[]>(() => safeStorageJson('kurali_orders', INITIAL_ORDERS));

  usePersistedValue('kurali_sellers', sellers);
  usePersistedValue('kurali_products', products);
  usePersistedValue('kurali_coupons', coupons);
  usePersistedValue('kurali_delivery_agents', deliveryAgents);
  usePersistedValue('kurali_orders', orders);

  return {
    sellers, setSellers,
    products, setProducts,
    coupons, setCoupons,
    deliveryAgents, setDeliveryAgents,
    orders, setOrders,
  };
};
