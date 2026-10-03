import React from 'react';
import {
  X,
  MapPin,
  Bike,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Phone,
  Package,
  Store,
  Navigation,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { OrderStatus } from '../../types';

interface OrderTrackingModalProps {
  orderId: string;
  onClose: () => void;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({ orderId, onClose }) => {
  const { orders } = useApp();
  const order = orders.find(o => o.id === orderId) || orders[0];

  if (!order) return null;

  const statusSteps: { key: OrderStatus; label: string; desc: string }[] = [
    { key: 'placed', label: 'Order Placed', desc: 'Received & sent to shopkeeper' },
    { key: 'accepted_by_seller', label: 'Accepted by Seller', desc: 'Shop verifying items' },
    { key: 'ready_for_pickup', label: 'Packed & Ready', desc: 'Ready for rider pickup' },
    { key: 'assigned_to_delivery', label: 'Rider Assigned', desc: 'Rider reaching store' },
    { key: 'picked_up', label: 'Picked Up', desc: 'In transit from store' },
    { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'Rider on Kurali road' },
    { key: 'delivered', label: 'Delivered', desc: 'Package delivered safely' },
  ];

  const getStepIndex = (status: OrderStatus) => {
    return statusSteps.findIndex(s => s.key === status);
  };

  const currentStepIdx = getStepIndex(order.status);

  // Map progress % for simulation
  const progressPercent = Math.min(
    100,
    Math.max(15, ((currentStepIdx + 1) / statusSteps.length) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Bike className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">
                  Live Kurali Express Tracker
                </h3>
                <span className="bg-emerald-400 text-emerald-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-amber-100">
                Order ID: <strong className="text-white font-mono">{order.id}</strong> &bull; {order.sellerLocality}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Visual Simulation Map */}
        <div className="relative bg-slate-900 text-white h-52 p-4 flex flex-col justify-between overflow-hidden">
          {/* Subtle stylized city road grid pattern */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#fff" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Map Top Bar */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              <span>Route: <strong>{order.sellerLocality}</strong> &rarr; <strong>{order.deliveryLocality}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-xl text-xs font-bold">
              <Clock className="w-3.5 h-3.5" />
              ETA: {order.status === 'delivered' ? 'Delivered' : `${order.estimatedDeliveryMins} mins`}
            </div>
          </div>

          {/* Interactive animated delivery progress visual on Kurali Map */}
          <div className="relative z-10 my-auto py-2">
            <div className="relative h-2 bg-slate-800 rounded-full border border-slate-700/80 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-400 transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            {/* Pins on the route */}
            <div className="flex items-center justify-between text-[11px] mt-2 font-medium">
              <div className="flex items-center gap-1 text-amber-300">
                <Store className="w-4 h-4" />
                <span>{(order.sellerName || order.sellerNames?.[0] || 'Store').split(' ')[0]}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-300">
                <span>Morinda Rd / Chowk</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400">
                <MapPin className="w-4 h-4" />
                <span>Your Location</span>
              </div>
            </div>
          </div>

          {/* Bottom live notification bar */}
          <div className="relative z-10 flex items-center justify-between text-xs bg-slate-800/70 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-300">
              {order.statusUpdates[order.statusUpdates.length - 1]?.note || 'In transit within Kurali'}
            </span>
            <span className="text-amber-400 font-mono text-[11px]">
              {order.statusUpdates[order.statusUpdates.length - 1]?.timestamp}
            </span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* OTP and Delivery Agent Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* OTP Box */}
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  DELIVERY SECURITY OTP
                </div>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Share this 4-digit code with the delivery partner upon arrival:
                </p>
              </div>
              <div className="bg-white px-4 py-2 rounded-xl border border-amber-300 shadow-xs text-center font-mono text-xl font-extrabold text-amber-700 tracking-wider">
                {order.deliveryOtp}
              </div>
            </div>

            {/* Delivery Agent Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                  <Bike className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {order.deliveryAgentName || 'Gurpreet Singh (Rider)'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {order.deliveryAgentVehicle || 'Hero Splendor (PB 65 AB 4589)'}
                  </p>
                  <span className="inline-block mt-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                    ★ 4.9 Verified Kurali Partner
                  </span>
                </div>
              </div>

              <a
                href={`tel:${order.deliveryAgentPhone || '9876588990'}`}
                className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
                title="Call Delivery Partner"
              >
                <Phone className="w-4 h-4 text-emerald-600" />
              </a>
            </div>
          </div>

          {/* Step Timeline */}
          <div>
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
              Order Timeline &amp; Journey
            </h4>
            <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {order.statusUpdates.map((update, idx) => (
                <div key={idx} className="relative flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 z-10 shadow-xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 capitalize">
                        {update.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {update.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{update.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Items & Payment Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Items in this Order ({order.items.length})</span>
              <span className="text-emerald-700 font-bold">
                {order.isFreeDelivery ? '🎉 FREE Kurali Delivery' : `Delivery Fee: ₹${order.deliveryFee}`}
              </span>
            </h4>

            <div className="divide-y divide-slate-200">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={item.product.image}
                      alt={item.product.title}
                      className="w-8 h-8 rounded-md object-cover border border-slate-200"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">{item.product.title}</span>
                      <span className="text-slate-500 ml-1.5 font-medium">&times; {item.quantity}</span>
                      {item.negotiatedPrice && (
                        <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                          Negotiated Deal
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-bold text-slate-900">
                    ₹
                    {(item.negotiatedPrice ||
                      Math.round(
                        item.product.sellerPrice *
                          (1 - item.product.additionalDiscountPercent / 100)
                      )) * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{order.subtotal}</span>
              </div>
              {order.billDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Store Bill Discount</span>
                  <span>-₹{order.billDiscountAmount}</span>
                </div>
              )}
              {order.couponDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon ({order.couponCode})</span>
                  <span>-₹{order.couponDiscountAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Delivery Fee</span>
                <span>{order.isFreeDelivery ? 'FREE (Threshold met)' : `₹${order.deliveryFee}`}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-300 flex justify-between font-extrabold text-sm text-slate-900">
                <span>Total Paid ({order.paymentMethod})</span>
                <span className="text-amber-600">₹{order.totalAmount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Delivery to: <strong className="text-slate-700">{order.deliveryAddress}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close Tracker
          </button>
        </div>
      </div>
    </div>
  );
};
