import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Truck,
  Percent,
  Tag,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface CartDrawerProps {
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onProceedToCheckout }) => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    cartCalculations,
    coupons,
    showToast,
  } = useApp();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  if (!isCartOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponInput.trim()) return;

    const res = applyCoupon(couponInput);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      showToast(res.message, 'success');
      setCouponInput('');
    }
  };

  const handleApplyQuickCoupon = (code: string) => {
    setCouponError('');
    const res = applyCoupon(code);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      showToast(res.message, 'success');
    }
  };

  // Progress for free delivery
  const progressToFreeDelivery = Math.min(
    100,
    Math.round((cartCalculations.subtotal / cartCalculations.freeDeliveryThreshold) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in">
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <h2 className="text-base font-extrabold tracking-tight">Your Kurali Basket</h2>
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {cart.reduce((a, b) => a + b.quantity, 0)} items
              </span>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Delivery Goal Bar */}
          {cart.length > 0 && (
            <div className="p-3.5 bg-amber-50 border-b border-amber-200/80">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="flex items-center gap-1.5 text-amber-900">
                  <Truck className="w-4 h-4 text-amber-600" />
                  {cartCalculations.isFreeDelivery
                    ? '🎉 FREE Kurali Delivery Unlocked!'
                    : `Add ₹${cartCalculations.amountNeededForFreeDelivery} more for FREE Delivery`}
                </span>
                <span className="text-amber-700">{progressToFreeDelivery}%</span>
              </div>
              <div className="w-full h-2 bg-amber-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressToFreeDelivery}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-amber-700 mt-1">
                Threshold: ₹{cartCalculations.freeDeliveryThreshold} (Standard fee: ₹
                {cartCalculations.activeSeller?.baseDeliveryFee || 35})
              </p>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Your basket is empty</h3>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    Explore fresh vegetables, groceries, sweets, and tech accessories from approved Kurali shopkeepers.
                  </p>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                  <span>Store: <strong>{cartCalculations.activeSeller?.name}</strong></span>
                  <button
                    onClick={clearCart}
                    className="text-rose-600 hover:text-rose-700 text-xs font-medium cursor-pointer"
                  >
                    Clear Cart
                  </button>
                </div>

                {cart.map((item) => {
                  const effectiveUnitPrice =
                    item.negotiatedPrice ||
                    Math.round(
                      item.product.sellerPrice *
                        (1 - item.product.additionalDiscountPercent / 100)
                    );
                  const itemTotal = effectiveUnitPrice * item.quantity;

                  return (
                    <div
                      key={item.product.id}
                      className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3"
                    >
                      <img
                        src={item.product.image}
                        alt={item.product.title}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-100 shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {item.product.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span>{item.product.unit}</span>
                          <span>&bull;</span>
                          <span className="font-semibold text-emerald-700">₹{effectiveUnitPrice} each</span>
                        </div>

                        {item.negotiatedPrice && (
                          <span className="inline-block mt-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                            💬 Bargain Negotiated
                          </span>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          {/* Quantity selector */}
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                            <button
                              onClick={() =>
                                updateCartQuantity(item.product.id, item.quantity - 1)
                              }
                              className="p-1 hover:bg-slate-200 text-slate-700 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-bold text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateCartQuantity(item.product.id, item.quantity + 1)
                              }
                              className="p-1 hover:bg-slate-200 text-slate-700 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="text-xs font-extrabold text-slate-900">
                            ₹{itemTotal}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

                {/* Bill Discount Alert if applicable */}
                {cartCalculations.billDiscount > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold">Store Bill Discount Applied!</p>
                      <p className="text-[11px] text-emerald-700">
                        You saved ₹{cartCalculations.billDiscount} on your total store bill.
                      </p>
                    </div>
                  </div>
                )}

                {/* Coupons Section */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    Apply Coupon or Discount Code
                  </div>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-2.5 bg-emerald-100/70 border border-emerald-300 rounded-xl text-xs">
                      <div>
                        <span className="font-bold text-emerald-900 uppercase font-mono">
                          {appliedCoupon.code}
                        </span>
                        <span className="ml-2 text-emerald-700 text-[11px]">
                          (-₹{cartCalculations.couponDiscount})
                        </span>
                      </div>
                      <button
                        onClick={removeCoupon}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter coupon code (e.g. KURALI50)"
                        value={couponInput}
                        onChange={e => setCouponInput(e.target.value.toUpperCase())}
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none uppercase font-mono"
                      />
                      <button
                        type="submit"
                        disabled={!couponInput.trim()}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Apply
                      </button>
                    </form>
                  )}

                  {couponError && (
                    <p className="text-[11px] text-rose-600 font-medium">{couponError}</p>
                  )}

                  {/* Available coupon chips */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Available Kurali Coupons:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {coupons.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleApplyQuickCoupon(c.code)}
                          className="bg-white hover:bg-amber-50 hover:border-amber-300 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono text-amber-800 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {c.code}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer / Summary & Checkout */}
          {cart.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>₹{cartCalculations.subtotal}</span>
                </div>

                {cartCalculations.billDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Store Bill Discount</span>
                    <span>-₹{cartCalculations.billDiscount}</span>
                  </div>
                )}

                {cartCalculations.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Coupon ({appliedCoupon?.code})</span>
                    <span>-₹{cartCalculations.couponDiscount}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Delivery Fee</span>
                  <span>
                    {cartCalculations.isFreeDelivery ? (
                      <strong className="text-emerald-600 uppercase">FREE</strong>
                    ) : (
                      `₹${cartCalculations.deliveryFee}`
                    )}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-extrabold text-sm text-slate-900">
                  <span>Final Payable</span>
                  <span className="text-lg text-amber-600 font-black">
                    ₹{cartCalculations.finalTotal}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsCartOpen(false);
                  onProceedToCheckout();
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-extrabold text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
