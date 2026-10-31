import React, { useEffect, useState } from 'react';
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
import { LiveOrderMap } from './LiveOrderMap';
import { buyerApi } from '../../services/domains/buyerApi';
import { API_BASE_URL } from '../../services/http/apiConfig';

interface OrderTrackingModalProps {
  orderId: string;
  onClose: () => void;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({ orderId, onClose }) => {
  const { orders, syncWithBackend, showToast } = useApp();
  const order = orders.find(o => o.id === orderId);
  const orderItems = Array.isArray(order?.items) ? order.items : [];
  const statusUpdates = Array.isArray(order?.statusUpdates) ? order.statusUpdates : [];
  const orderStatus = String(order?.status || 'placed').toLowerCase();
  const [authorizedDeliveryOtp, setAuthorizedDeliveryOtp] = useState<string | null>(null);
  const [pickupOtp, setPickupOtp] = useState('');
  const [pickupSubmitting, setPickupSubmitting] = useState(false);
  const isStorePickup = order?.fulfilmentMode === 'STORE_PICKUP';

  const confirmPickup = async () => {
    if (!/^\d{4}$/.test(pickupOtp) || pickupSubmitting) return;
    setPickupSubmitting(true);
    try {
      const token = localStorage.getItem('kurali_auth_token');
      const response = await fetch(`${API_BASE_URL}/buyers/orders/${encodeURIComponent(orderId)}/confirm-pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ otp: pickupOtp }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'Pickup confirmation failed');
      showToast('Store pickup confirmed successfully.', 'success');
      setPickupOtp('');
      await syncWithBackend();
    } catch (error: any) {
      showToast(error?.message || 'Unable to confirm pickup.', 'error');
    } finally {
      setPickupSubmitting(false);
    }
  };

  useEffect(() => {
    let active = true;
    setAuthorizedDeliveryOtp(null);
    const refreshOtp = async () => {
      try {
        const tracking = await buyerApi.getLiveTracking(orderId);
        if (active && typeof tracking?.deliveryOtp === 'string' && /^\d{4}$/.test(tracking.deliveryOtp)) {
          setAuthorizedDeliveryOtp(tracking.deliveryOtp);
        }
      } catch {
        // Keep the last authorized OTP visible if a transient refresh fails.
      }
    };
    void refreshOtp();
    const timer = window.setInterval(refreshOtp, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [orderId]);

  if (!order) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div role="alert" className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
        <h3 className="text-base font-extrabold text-slate-900">Order details are still loading</h3>
        <p className="mt-2 text-sm text-slate-600">We couldn't find order #{orderId} in the current order list. Refresh your orders and try again.</p>
        <button type="button" onClick={onClose} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Close</button>
      </div>
    </div>
  );

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
  const visibleTimeline = statusUpdates.length > 0
    ? statusUpdates
    : statusSteps.slice(0, Math.max(1, currentStepIdx + 1)).map(step => ({ status: step.key, timestamp: '', note: step.desc }));

  // Map progress % for simulation
  const progressPercent = Math.min(
    100,
    Math.max(15, ((currentStepIdx + 1) / statusSteps.length) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-950/60 backdrop-blur-sm animate-in fade-in sm:items-center sm:p-4">
      <div className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-slate-50 shadow-2xl sm:h-auto sm:max-h-[94vh] sm:rounded-2xl sm:border sm:border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 text-slate-900 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Bike className="h-5 w-5" /></div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold tracking-tight">Track your order</h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                  {orderStatus.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Order #{order.id} · {order.sellerLocality || 'Seller location pending'}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Google Maps tracking */}
        {!isStorePickup && <LiveOrderMap orderId={order.id} fallbackBuyer={{ latitude: order.deliveryLatitude, longitude: order.deliveryLongitude }} sellerAddress={order.sellerLocality} destinationAddress={order.deliveryAddress} orderStatus={order.status} />}

        {/* Scrollable Content Body */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-4">
          {/* OTP and Delivery Agent Card */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {/* OTP Box */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  {isStorePickup ? 'STORE PICKUP OTP' : 'DELIVERY SECURITY OTP'}
                </div>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  {isStorePickup ? 'Show this code to the shopkeeper when collecting your order.' : 'This code updates automatically when the delivery partner generates a new one. Share only at handover:'}
                </p>
              </div>
              <div className="bg-white px-4 py-2 rounded-xl border border-amber-300 shadow-xs text-center font-mono text-xl font-extrabold text-amber-700 tracking-wider">
                {authorizedDeliveryOtp || '----'}
              </div>
            </div>

            {!isStorePickup && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                  <Bike className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {order.deliveryAgentName || 'Delivery partner not assigned'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {order.deliveryAgentVehicle || 'Vehicle details will appear here'}
                  </p>
                  
                </div>
              </div>

              <a
                href={order.deliveryAgentPhone ? `tel:${order.deliveryAgentPhone}` : undefined}
                className={`rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 transition-colors ${order.deliveryAgentPhone ? 'hover:bg-slate-100' : 'cursor-not-allowed opacity-40'}`}
                title={order.deliveryAgentPhone ? "Call Delivery Partner" : "Phone number unavailable"}
                aria-disabled={!order.deliveryAgentPhone}
              >
                <Phone className="w-4 h-4 text-emerald-600" />
              </a>
            </div>
            )}
          </div>
          {isStorePickup && orderStatus === 'ready_for_pickup' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
              <p className="text-xs font-bold text-emerald-900">Have you collected your items from the store?</p>
              <div className="flex gap-2">
                <input aria-label="Store pickup OTP" inputMode="numeric" maxLength={4} value={pickupOtp}
                  onChange={event => setPickupOtp(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Enter 4-digit OTP" className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-mono tracking-widest" />
                <button type="button" onClick={confirmPickup} disabled={pickupOtp.length !== 4 || pickupSubmitting}
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                  {pickupSubmitting ? 'Confirming…' : 'Confirm collection'}
                </button>
              </div>
            </div>
          )}

          {/* Step Timeline */}
          <div>
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
              Order Timeline &amp; Journey
            </h4>
            <div className="relative space-y-2 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-0.5 before:bg-slate-200">
              {visibleTimeline.map((update, idx) => (
                <div key={idx} className="relative flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 z-10 shadow-xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 rounded-lg border border-slate-100 bg-white px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 capitalize">
                        {String(update?.status || 'Update').replace(/_/g, ' ')}
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
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Items in this Order ({orderItems.length})</span>
              <span className="text-emerald-700 font-bold">
                {order.isFreeDelivery ? '🎉 FREE Kurali Delivery' : `Delivery Fee: ₹${order.deliveryFee}`}
              </span>
            </h4>

            <div className="divide-y divide-slate-200">
              {orderItems.map((item: any, idx) => {
                // API orders use flat item fields; locally-created orders use item.product.
                const product = item?.product || item || {};
                const quantity = Math.max(1, Number(item?.quantity) || 1);
                const title = product?.title || item?.title || item?.productName || 'Order item';
                const image = product?.image || item?.imageUrl || item?.image;
                const negotiatedPrice = Number(item?.negotiatedPrice) || 0;
                const unitPrice = negotiatedPrice ||
                  Number(product?.sellerPrice) ||
                  Number(item?.unitPrice) ||
                  (Number(item?.totalPrice) > 0 ? Number(item.totalPrice) / quantity : 0);
                const discountPercent = Number(product?.additionalDiscountPercent) || 0;
                const effectiveUnitPrice = product?.sellerPrice
                  ? Math.round(unitPrice * (1 - discountPercent / 100))
                  : unitPrice;
                return (
                  <div key={item?.productId || item?.id || idx} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex min-w-0 items-center gap-2">
                      {image ? (
                        <img src={image} alt={title} className="w-8 h-8 rounded-md object-cover border border-slate-200" />
                      ) : (
                        <div className="w-8 h-8 rounded-md border border-slate-200 bg-white flex items-center justify-center"><Package className="w-4 h-4 text-slate-400" /></div>
                      )}
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-800">{title}</span>
                        <span className="text-slate-500 ml-1.5 font-medium">&times; {quantity}</span>
                        {negotiatedPrice > 0 && (
                          <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded">Negotiated Deal</span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 font-bold text-slate-900">₹{Math.round(effectiveUnitPrice * quantity)}</span>
                  </div>
                );
              })}
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
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
          <span className="text-xs text-slate-500">
            Delivery to: <strong className="text-slate-700">{order.deliveryAddress}</strong>
          </span>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
          >
            Close Tracker
          </button>
        </div>
      </div>
    </div>
  );
};
