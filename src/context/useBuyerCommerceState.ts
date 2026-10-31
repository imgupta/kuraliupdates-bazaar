import React, { useCallback, useMemo, useState } from 'react';
import type { CartItem, Coupon, Product, Seller } from '../types';
import { safeStorageJson } from '../shared/storage/safeStorage';
import { usePersistedValue } from './usePersistedValue';

type Toast = (message: string, type?: 'success' | 'info' | 'error') => void;

export const useBuyerCommerceState = (
  sellers: Seller[],
  coupons: Coupon[],
  showToast: Toast,
) => {
  const [cart, setCart] = useState<CartItem[]>(() => safeStorageJson('kurali_cart', []));
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(() => safeStorageJson('kurali_applied_coupon', null));

  usePersistedValue('kurali_cart', cart);
  usePersistedValue('kurali_applied_coupon', appliedCoupon, { removeWhenNull: true });

  const addToCart = (product: Product, quantity = 1, negotiatedPrice?: number, acceptedOfferId?: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id
          ? { ...item, quantity: item.quantity + quantity, negotiatedPrice: negotiatedPrice ?? item.negotiatedPrice, acceptedOfferId: acceptedOfferId ?? item.acceptedOfferId }
          : item);
      }
      return [...prev, { product, quantity, negotiatedPrice, acceptedOfferId }];
    });
    showToast(`Added "${product.title}" to cart`, 'success');
  };

  const upsertBargainCartItem = useCallback((
    product: Product,
    bargainId: string,
    bargainStatus: NonNullable<CartItem['bargainStatus']>,
    bargainOfferPrice?: number,
    negotiatedPrice?: number,
    acceptedOfferId?: string,
  ) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      const bargainFields = {
        bargainId,
        bargainStatus,
        bargainOfferPrice,
        negotiatedPrice: bargainStatus === 'ACCEPTED' ? negotiatedPrice : undefined,
        acceptedOfferId: bargainStatus === 'ACCEPTED' ? acceptedOfferId : undefined,
      };
      if (existing) {
        if (existing.bargainId === bargainId && existing.bargainStatus === bargainStatus
          && existing.bargainOfferPrice === bargainOfferPrice
          && existing.negotiatedPrice === bargainFields.negotiatedPrice
          && existing.acceptedOfferId === bargainFields.acceptedOfferId) return prev;
        return prev.map(item => item.product.id === product.id ? { ...item, ...bargainFields } : item);
      }
      return [...prev, { product, quantity: 1, ...bargainFields }];
    });
  }, []);

  // Update only a cart line that already represents a bargain. Unlike upsertBargainCartItem,
  // this never recreates a line the buyer deliberately removed while waiting for a response.
  const updateExistingBargainCartItem = useCallback((
    product: Product,
    bargainId: string,
    bargainStatus: NonNullable<CartItem['bargainStatus']>,
    bargainOfferPrice?: number,
    negotiatedPrice?: number,
    acceptedOfferId?: string,
  ) => {
    setCart(prev => {
      let changed = false;
      const next = prev.map(item => {
        if (item.product.id !== product.id || (!item.bargainId && !item.bargainStatus)) return item;
        const bargainFields = {
          bargainId,
          bargainStatus,
          bargainOfferPrice,
          negotiatedPrice: bargainStatus === 'ACCEPTED' ? negotiatedPrice : undefined,
          acceptedOfferId: bargainStatus === 'ACCEPTED' ? acceptedOfferId : undefined,
        };
        if (item.bargainId === bargainFields.bargainId
          && item.bargainStatus === bargainFields.bargainStatus
          && item.bargainOfferPrice === bargainFields.bargainOfferPrice
          && item.negotiatedPrice === bargainFields.negotiatedPrice
          && item.acceptedOfferId === bargainFields.acceptedOfferId) return item;
        changed = true;
        return { ...item, ...bargainFields };
      });
      return changed ? next : prev;
    });
  }, []);

  const effectivePrice = (item: CartItem) => item.negotiatedPrice
    ?? Number((item.product.sellerPrice * (1 - (item.product.additionalDiscountPercent || 0) / 100)).toFixed(2));

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(item => item.product.id !== productId));

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity } : item));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const applyCoupon = (code: string): { success: boolean; message: string } => {
    const trimmed = code.trim().toUpperCase();
    const found = coupons.find(c => c.code.toUpperCase() === trimmed);
    if (!found) return { success: false, message: 'Invalid coupon code for Kurali Bazaar.' };
    const currentSubtotal = cart.reduce((sum, item) => sum + effectivePrice(item) * item.quantity, 0);
    if (found.minOrderValue && currentSubtotal < found.minOrderValue) {
      return { success: false, message: `Min order value for ${found.code} is ₹${found.minOrderValue}. Add items worth ₹${found.minOrderValue - currentSubtotal} more.` };
    }
    setAppliedCoupon(found);
    showToast(`Coupon ${found.code} applied successfully!`, 'success');
    return { success: true, message: `Coupon ${found.code} applied!` };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast('Coupon removed.', 'info');
  };

  const cartCalculations = useMemo(() => {
    const itemSubtotal = cart.reduce((sum, item) => sum + (item.negotiatedPrice || item.product.sellerPrice) * item.quantity, 0);
    const sellerSpend: Record<string, { sellerName: string; amount: number; seller: Seller | undefined }> = {};
    cart.forEach(item => {
      const sellerId = item.product.sellerId;
      const price = effectivePrice(item);
      if (!sellerSpend[sellerId]) sellerSpend[sellerId] = { sellerName: item.product.sellerName, amount: 0, seller: sellers.find(s => s.id === sellerId) };
      sellerSpend[sellerId].amount += price * item.quantity;
    });

    const billDiscounts: { sellerId: string; sellerName: string; amount: number; description: string }[] = [];
    let freeDeliveryThreshold = 499;
    let baseDeliveryFee = 30;
    Object.entries(sellerSpend).forEach(([sellerId, data]) => {
      if (!data.seller) return;
      if (data.seller.minOrderForFreeDelivery) freeDeliveryThreshold = Math.max(freeDeliveryThreshold, data.seller.minOrderForFreeDelivery);
      if (data.seller.baseDeliveryFee) baseDeliveryFee = Math.max(baseDeliveryFee, data.seller.baseDeliveryFee);
      data.seller.billDiscounts?.forEach(discount => {
        if (data.amount >= discount.minBillAmount) {
          billDiscounts.push({
            sellerId, sellerName: data.sellerName,
            amount: discount.flatDiscount || Math.round((data.amount * (discount.discountPercentage || 0)) / 100),
            description: discount.description,
          });
        }
      });
    });

    const totalBillDiscount = billDiscounts.reduce((sum, discount) => sum + discount.amount, 0);
    let couponDiscount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.discountType === 'flat' || appliedCoupon.flatDiscount) {
        couponDiscount = appliedCoupon.flatDiscount || appliedCoupon.discountValue || 0;
      } else if (appliedCoupon.discountType === 'percentage' || appliedCoupon.discountPercentage) {
        couponDiscount = Math.round((itemSubtotal * (appliedCoupon.discountPercentage || appliedCoupon.discountValue || 0)) / 100);
        if (appliedCoupon.maxDiscount) couponDiscount = Math.min(couponDiscount, appliedCoupon.maxDiscount);
      }
    }
    const isFreeDelivery = itemSubtotal >= freeDeliveryThreshold;
    const deliveryFee = cart.length === 0 || isFreeDelivery ? 0 : baseDeliveryFee;
    const freeDeliveryThresholdRemaining = Math.max(0, freeDeliveryThreshold - itemSubtotal);
    const finalTotal = Math.max(0, itemSubtotal - totalBillDiscount - couponDiscount + deliveryFee);
    return {
      itemSubtotal, subtotal: itemSubtotal, couponDiscount, billDiscounts,
      totalBillDiscount, billDiscount: totalBillDiscount, deliveryFee, isFreeDelivery,
      freeDeliveryThresholdRemaining, amountNeededForFreeDelivery: freeDeliveryThresholdRemaining,
      freeDeliveryThreshold, activeSeller: Object.values(sellerSpend)[0]?.seller, finalTotal,
    };
  }, [cart, sellers, appliedCoupon]);

  return { cart, setCart, appliedCoupon, setAppliedCoupon, addToCart, upsertBargainCartItem, updateExistingBargainCartItem, removeFromCart, updateCartQuantity, clearCart, applyCoupon, removeCoupon, cartCalculations };
};
