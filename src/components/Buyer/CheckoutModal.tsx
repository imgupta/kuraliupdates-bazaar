import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CreditCard,
  QrCode,
  Banknote,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  Lock,
  Truck,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { KURALI_LOCALITIES } from '../../data/initialData';

interface CheckoutModalProps {
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ onClose }) => {
  const { cart, cartCalculations, createOrder, user } = useApp();

  const [buyerName, setBuyerName] = useState(user.name || 'Simranjit Kaur');
  const [buyerPhone, setBuyerPhone] = useState(user.phone || '+91 98760 12345');
  const [deliveryLocality, setDeliveryLocality] = useState(KURALI_LOCALITIES[1] || 'Main Bazaar');
  const [streetAddress, setStreetAddress] = useState('House 42, Dashmesh Nagar, Near Gurudwara');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'COD' | 'NetBanking'>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsProcessing(true);

    setTimeout(() => {
      const fullAddress = `${streetAddress}, ${deliveryLocality}, Kurali (Punjab)`;
      const created = createOrder({
        buyerName,
        buyerPhone,
        deliveryAddress: fullAddress,
        deliveryLocality,
        paymentMethod,
      });

      setIsProcessing(false);

      if (created) {
        // Trigger celebratory confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        onClose();
      }
    }, 1200);
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
              {cartCalculations.isFreeDelivery
                ? 'FREE Delivery Qualified (Order > Min Threshold)'
                : `Standard Delivery Fee: ₹${cartCalculations.deliveryFee}`}
            </span>
            <span className="text-emerald-700 font-extrabold">25 Mins ETA</span>
          </div>

          {/* Section 1: Delivery Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
              1. Delivery Address in Kurali
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={e => setBuyerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none"
                    placeholder="Full Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number (for Rider)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={buyerPhone}
                    onChange={e => setBuyerPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kurali Locality / Zone
                </label>
                <select
                  value={deliveryLocality}
                  onChange={e => setDeliveryLocality(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none"
                >
                  {KURALI_LOCALITIES.filter(l => !l.startsWith('All')).map(loc => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  House / Street / Landmark
                </label>
                <input
                  type="text"
                  required
                  value={streetAddress}
                  onChange={e => setStreetAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none"
                  placeholder="e.g. House 42, Near Gurudwara"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Payment Method */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              2. Select Payment Method
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  paymentMethod === 'UPI'
                    ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <QrCode className="w-5 h-5 text-amber-600" />
                  {paymentMethod === 'UPI' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-900">Instant UPI</p>
                  <p className="text-[11px] text-slate-500">GPay, PhonePe, Paytm</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Card')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  paymentMethod === 'Card'
                    ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  {paymentMethod === 'Card' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-900">Cards</p>
                  <p className="text-[11px] text-slate-500">Visa, Mastercard, RuPay</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('COD')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  paymentMethod === 'COD'
                    ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  {paymentMethod === 'COD' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-900">Cash on Delivery</p>
                  <p className="text-[11px] text-slate-500">Pay when delivered</p>
                </div>
              </button>
            </div>

            {/* UPI interactive preview */}
            {paymentMethod === 'UPI' && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">Scan &amp; Pay via UPI App</span>
                  <p className="text-[11px] text-slate-500">UPI ID: kuraliupdates@okhdfcbank</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Zero Processing Fees
                </span>
              </div>
            )}
          </div>

          {/* Section 3: Final Bill Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <h4 className="font-bold text-slate-800">Payment Breakdown</h4>
            <div className="flex justify-between text-slate-600">
              <span>Items Total ({cart.length} items)</span>
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
                <span>Coupon Discount</span>
                <span>-₹{cartCalculations.couponDiscount}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Delivery Fee</span>
              <span>
                {cartCalculations.isFreeDelivery ? 'FREE' : `₹${cartCalculations.deliveryFee}`}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-extrabold text-sm text-slate-900">
              <span>Final Total</span>
              <span className="text-base text-amber-600 font-black">
                ₹{cartCalculations.finalTotal}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white rounded-xl font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <span>Confirming Order with Kurali Store...</span>
            ) : (
              <span>
                Pay &amp; Confirm Order &bull; ₹{cartCalculations.finalTotal}
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
