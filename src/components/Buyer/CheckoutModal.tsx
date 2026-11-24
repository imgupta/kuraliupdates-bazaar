import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  QrCode,
  Banknote,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  Lock,
  Truck,
  Sparkles,
  Store,
  Plus,
  Minus,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { bazaarApi } from '../../services/api';
import { buyerPaymentsApi } from '../../services/domains/buyerPaymentsApi';
import type { CartItem } from '../../types';
import { getCheckoutDeliveryLocation } from '../../entities/checkoutDeliveryLocation';

interface CheckoutModalProps {
  onClose: () => void;
  items?: CartItem[];
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ onClose, items }) => {
  const { cart, cartCalculations, createOrder, user, updateCartQuantity } = useApp();
  const checkoutItems = items ?? cart;
  const isolatedBuyNow = items !== undefined;
  const checkoutItemSubtotal = checkoutItems.reduce((sum, item) => sum + (item.negotiatedPrice ?? item.product.sellerPrice * (1 - (item.product.additionalDiscountPercent || 0) / 100)) * item.quantity, 0);
  const displayedSubtotal = isolatedBuyNow ? checkoutItemSubtotal : cartCalculations.subtotal;
  const buyNowSeller = checkoutItems[0]?.product;
  const buyNowDeliveryFee = buyNowSeller && checkoutItemSubtotal >= Number(buyNowSeller.minOrderForFreeDelivery ?? 499)
    ? 0 : Number(buyNowSeller?.baseDeliveryFee ?? 35);
  const displayedTotal = isolatedBuyNow ? checkoutItemSubtotal + displayedDeliveryFee : cartCalculations.finalTotal;
  const defaultAddress = user.savedAddresses?.find(address => address.isDefault) || user.savedAddresses?.[0];
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?.id || '');
  const selectedAddress = user.savedAddresses?.find(address => address.id === selectedAddressId) || defaultAddress;

  const [buyerName, setBuyerName] = useState(user.name || '');
  const [buyerPhone, setBuyerPhone] = useState(user.phone || '');
  const [configuredDeliveryEta, setConfiguredDeliveryEta] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void bazaarApi.getBuyerDeliveryEstimate()
      .then(minutes => { if (active) setConfiguredDeliveryEta(minutes); })
      .catch(() => { if (active) setConfiguredDeliveryEta(null); });
    return () => { active = false; };
  }, []);

  // Checkout can remain mounted while profile/address data finishes hydrating.
  // Reconcile only when the buyer has not explicitly selected another address.
  useEffect(() => {
    setBuyerName(user.name || '');
    setBuyerPhone(user.phone || '');
    if (!selectedAddressId && defaultAddress?.id) setSelectedAddressId(defaultAddress.id);
    if (defaultAddress && (!selectedAddressId || selectedAddressId === defaultAddress.id)) {
    }
  }, [user.name, user.phone, defaultAddress?.id]);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'COD'>('COD');
  const [paymentOptions, setPaymentOptions] = useState<Record<string,{codEnabled:boolean;upiEnabled:boolean}>>({});
  const [paymentOptionsLoading, setPaymentOptionsLoading] = useState(false);
  const [paymentOptionsError, setPaymentOptionsError] = useState('');
  const sellerIdsKey = Array.from(new Set(checkoutItems.map(item => item.product.sellerId))).sort().join('|');
  const checkoutSellerIds = sellerIdsKey.split('|').filter(Boolean);
  useEffect(() => {
    const sellerIds = sellerIdsKey.split('|').filter(Boolean);
    if (!sellerIds.length) return;
    let active = true;
    setPaymentOptionsLoading(true);
    setPaymentOptionsError('');
    void Promise.all(sellerIds.map(async sellerId => ({
      sellerId, options: await buyerPaymentsApi.getPaymentOptions(sellerId),
    }))).then(results => {
      if (!active) return;
      const next: Record<string,{codEnabled:boolean;upiEnabled:boolean}> = {};
      results.forEach(({sellerId,options}) => { next[sellerId] = { codEnabled: options.codEnabled === true, upiEnabled: options.upiEnabled === true }; });
      setPaymentOptions(next);
      const codAvailable = sellerIds.every(id => next[id]?.codEnabled);
      const upiAvailable = sellerIds.every(id => next[id]?.upiEnabled);
      setPaymentMethod(current => current === 'COD' && codAvailable ? current : current === 'UPI' && upiAvailable ? current : codAvailable ? 'COD' : upiAvailable ? 'UPI' : 'COD');
    }).catch((error:any) => {
      if (active) setPaymentOptionsError(error?.message || 'Unable to verify seller payment options.');
    }).finally(() => { if (active) setPaymentOptionsLoading(false); });
    return () => { active = false; };
  }, [sellerIdsKey]);
  const codAvailable = checkoutSellerIds.length > 0 && !paymentOptionsLoading && checkoutSellerIds.every(id => paymentOptions[id]?.codEnabled);
  const upiAvailable = checkoutSellerIds.length > 0 && !paymentOptionsLoading && checkoutSellerIds.every(id => paymentOptions[id]?.upiEnabled);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'review' | 'payment'>('review');
  const [fulfilmentMode, setFulfilmentMode] = useState<'DELIVERY' | 'STORE_PICKUP'>('DELIVERY');
  const displayedDeliveryFee = fulfilmentMode === 'STORE_PICKUP' ? 0 : isolatedBuyNow ? buyNowDeliveryFee : cartCalculations.deliveryFee;
  const multiSellerCart = new Set(checkoutItems.map(item => item.product.sellerId)).size > 1;
  const pickupTotal = isolatedBuyNow ? checkoutItemSubtotal : Math.max(0, cartCalculations.subtotal - cartCalculations.billDiscount - cartCalculations.couponDiscount);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutItems.length === 0 || isProcessing) return;
    if (checkoutStep === 'review') { setCheckoutStep('payment'); return; }

    setIsProcessing(true);
    try {
      if (fulfilmentMode === 'DELIVERY' && !selectedAddress) {
        throw new Error('Please add and select a saved delivery address before placing this order.');
      }
      const deliveryLocality = user.locality || 'Kurali';
      const fullAddress = fulfilmentMode === 'STORE_PICKUP'
        ? `Store pickup, ${deliveryLocality}, Kurali (Punjab)`
        : [selectedAddress?.addressLine1, selectedAddress?.landmark, selectedAddress?.formattedAddress, deliveryLocality, 'Kurali (Punjab)'].filter((value, index, values) => value && values.indexOf(value) === index).join(', ');
      const deliveryLocation = getCheckoutDeliveryLocation(selectedAddress, fulfilmentMode);
      const created = await createOrder({
        buyerName,
        buyerPhone,
        deliveryAddress: fullAddress,
        deliveryLocality,
        paymentMethod,
        fulfilmentMode,
        ...(deliveryLocation || {}),
        ...(isolatedBuyNow ? { items: checkoutItems } : {}),
      });

      if (created) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        onClose();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Secure Kurali Checkout</h2>
              <p className="text-xs text-amber-100">Direct fulfillment from local Kurali merchant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmitOrder} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Free Delivery Banner */}
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-amber-900 font-bold">
              <Truck className="w-4 h-4 text-amber-600" />
              {fulfilmentMode === 'STORE_PICKUP' ? 'Store pickup selected — no delivery charge' : displayedDeliveryFee === 0 ? 'FREE delivery qualified' : `Delivery charge: ₹${displayedDeliveryFee.toFixed(2)}`}
            </span>
            <span className="text-slate-600 font-semibold">{fulfilmentMode === 'STORE_PICKUP' ? 'Pickup timing confirmed by seller' : configuredDeliveryEta ? `Estimated delivery: ${configuredDeliveryEta} minutes` : 'Delivery timing confirmed after seller acceptance'}</span>
          </div>

          {multiSellerCart && (
            <section className="space-y-2">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Fulfilment preference</h3>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setFulfilmentMode('DELIVERY')}
                  className={`rounded-xl border-2 p-3 text-left ${fulfilmentMode === 'DELIVERY' ? 'border-amber-500 bg-amber-50' : 'border-slate-200'}`}>
                  <Truck className="w-5 h-5 mb-1 text-amber-600" />
                  <span className="block text-xs font-bold text-slate-900">Deliver to me</span>
                  <span className="block text-[11px] text-slate-500">Rider collects from stores</span>
                </button>
                <button type="button" onClick={() => setFulfilmentMode('STORE_PICKUP')}
                  className={`rounded-xl border-2 p-3 text-left ${fulfilmentMode === 'STORE_PICKUP' ? 'border-amber-500 bg-amber-50' : 'border-slate-200'}`}>
                  <Store className="w-5 h-5 mb-1 text-emerald-600" />
                  <span className="block text-xs font-bold text-slate-900">I’ll collect from stores</span>
                  <span className="block text-[11px] text-slate-500">No delivery fee or rider</span>
                </button>
              </div>
            </section>
          )}

          {/* Section 1: Delivery Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
              {fulfilmentMode === 'STORE_PICKUP' ? '1. Your pickup locality in Kurali' : '1. Delivery Address in Kurali'}
            </h3>

            {user.savedAddresses && user.savedAddresses.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Saved address</label>
                <select
                  value={selectedAddress?.id || ''}
                  onChange={e => {
                    const next = user.savedAddresses?.find(address => address.id === e.target.value);
                    setSelectedAddressId(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none"
                >
                  {user.savedAddresses.map(address => (
                    <option key={address.id} value={address.id}>{address.label} · {address.formattedAddress || address.addressLine1}{address.landmark ? ` · ${address.landmark}` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            {!user.savedAddresses?.length && (
              <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                No saved address found. Add a delivery address in My Addresses before checkout.
              </p>
            )}

          </div>

          {checkoutStep === 'payment' && (
          <>
          {/* Section 2: Payment Method */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              2. Select Payment Method
            </h3>

            {paymentOptionsLoading && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Checking payment methods enabled by each seller…</p>}
            {paymentOptionsError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{paymentOptionsError}</p>}
            <div className={`grid grid-cols-1 gap-3 ${codAvailable && upiAvailable ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
              {upiAvailable && <button type="button" onClick={() => setPaymentMethod('UPI')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${paymentMethod === 'UPI' ? 'border-amber-500 bg-amber-50/50 shadow-xs' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="flex items-center justify-between mb-2"><QrCode className="w-5 h-5 text-amber-600"/>{paymentMethod === 'UPI' && <CheckCircle2 className="w-4 h-4 text-amber-600"/>}</div>
                <div><p className="font-bold text-xs text-slate-900">UPI to each seller</p><p className="text-[11px] text-slate-500">Pay verified stores directly</p></div>
              </button>}
              {codAvailable && <button type="button" onClick={() => setPaymentMethod('COD')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${paymentMethod === 'COD' ? 'border-amber-500 bg-amber-50/50 shadow-xs' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="flex items-center justify-between mb-2"><Banknote className="w-5 h-5 text-emerald-600"/>{paymentMethod === 'COD' && <CheckCircle2 className="w-4 h-4 text-amber-600"/>}</div>
                <div><p className="font-bold text-xs text-slate-900">Cash on Delivery</p><p className="text-[11px] text-slate-500">Pay when delivered</p></div>
              </button>}
            </div>
            {!paymentOptionsLoading && !paymentOptionsError && codAvailable && !upiAvailable && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">UPI is shown only when every seller in this basket has an active UPI ID verified by KuraliUpdates admin. Cash on Delivery is currently the only enabled option for this basket.</p>}
            {!paymentOptionsLoading && !paymentOptionsError && !codAvailable && !upiAvailable && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">None of the stores in this basket currently has an available payment method. Contact the sellers before checkout.</p>}

            {paymentMethod === 'UPI' && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs">
                <p className="font-bold text-amber-950">Pay each store separately</p>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-900">
                  Only an admin-verified, active seller UPI ID can be used. You will see each store’s exact amount after checkout.
                  Returning from a UPI app or submitting a UTR does not confirm payment; the seller must confirm it.
                  For multiple stores, each seller order has its own payment status.
                </p>
              </div>
            )}
          </div>

          </>
          )}

          {/* Review the exact items before proceeding to payment. */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Order review · {checkoutItems.reduce((total, item) => total + item.quantity, 0)} units across {checkoutItems.length} products</h3>
            {checkoutItems.map(item => {
              const unitPrice = item.negotiatedPrice ?? Number((item.product.sellerPrice * (1 - (item.product.additionalDiscountPercent || 0) / 100)).toFixed(2));
              const maxQuantity = Math.max(0, Number(item.product.stock) || 0);
              return (
                <div key={item.product.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-800">{item.product.title}</p>
                    <p className="text-slate-500">{item.product.sellerName} · ₹{unitPrice.toFixed(2)} each</p>
                    <div className="mt-2">
                      {isolatedBuyNow ? <span className="text-slate-600 font-semibold">Qty {item.quantity}</span> : <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50">
                        <button type="button" aria-label={`Decrease quantity of ${item.product.title}`} disabled={item.quantity <= 1} onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)} className="p-2 text-slate-700 disabled:opacity-30"><Minus className="h-3 w-3" /></button>
                        <span className="min-w-7 text-center font-bold">{item.quantity}</span>
                        <button type="button" aria-label={`Increase quantity of ${item.product.title}`} disabled={item.quantity >= maxQuantity} onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)} className="p-2 text-slate-700 disabled:opacity-30"><Plus className="h-3 w-3" /></button>
                      </div>}
                    </div>
                  </div>
                  <span className="shrink-0 font-extrabold text-slate-900">₹{(unitPrice * item.quantity).toFixed(2)}</span>
                </div>
              );
            })}
          </section>

          {/* Section 3: Final Bill Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <h4 className="font-bold text-slate-800">Payment Breakdown</h4>
            <div className="flex justify-between text-slate-600">
              <span>Items Total ({checkoutItems.length} items)</span>
              <span>₹{displayedSubtotal.toFixed(2)}</span>
            </div>
            {!isolatedBuyNow && cartCalculations.billDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Store Bill Discount</span>
                <span>-₹{cartCalculations.billDiscount}</span>
              </div>
            )}
            {!isolatedBuyNow && cartCalculations.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Coupon Discount</span>
                <span>-₹{cartCalculations.couponDiscount}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>{fulfilmentMode === 'STORE_PICKUP' ? 'Store Pickup' : 'Delivery Fee'}</span>
              <span>{fulfilmentMode === 'STORE_PICKUP' || displayedDeliveryFee === 0 ? 'FREE' : `₹${displayedDeliveryFee.toFixed(2)}`}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-extrabold text-sm text-slate-900">
              <span>Final Total</span>
              <span className="text-base text-amber-600 font-black">
                ₹{(fulfilmentMode === 'STORE_PICKUP' ? (isolatedBuyNow ? checkoutItemSubtotal : pickupTotal) : displayedTotal).toFixed(2)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing || paymentOptionsLoading || Boolean(paymentOptionsError) || (!codAvailable && !upiAvailable) || (fulfilmentMode === 'DELIVERY' && !selectedAddress) || (paymentMethod === 'COD' && !codAvailable) || (paymentMethod === 'UPI' && !upiAvailable)}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white rounded-xl font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <span>Confirming Order with Kurali Store...</span>
            ) : checkoutStep === 'review' ? (
              <span>Continue to Payment &bull; ₹{(fulfilmentMode === 'STORE_PICKUP' && !isolatedBuyNow ? pickupTotal : displayedTotal).toFixed(2)}</span>
            ) : (
              <span>
                {paymentMethod === 'COD' ? (fulfilmentMode === 'STORE_PICKUP' ? 'Place Store Pickup Order' : 'Place COD Order') : 'Place seller-direct UPI order'} &bull; ₹{(fulfilmentMode === 'STORE_PICKUP' && !isolatedBuyNow ? pickupTotal : displayedTotal).toFixed(2)}
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
