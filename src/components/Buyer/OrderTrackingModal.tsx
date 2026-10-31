import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Bike, Clock, CheckCircle2, ShieldCheck, Phone, Package,
  Store, MapPin, ChevronDown, Headset, Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { buyerApi } from '../../services/domains/buyerApi';
import { API_BASE_URL } from '../../services/http/apiConfig';
import { LiveOrderMap } from './LiveOrderMap';

interface OrderTrackingModalProps {
  orderId: string;
  onClose: () => void;
}

const STEPS = [
  { key: 'placed', label: 'Order placed', detail: 'We have received your order.' },
  { key: 'accepted_by_seller', label: 'Confirmed by store', detail: 'The store is preparing your items.' },
  { key: 'ready_for_pickup', label: 'Packed and ready', detail: 'Your order is ready for pickup.' },
  { key: 'assigned_to_delivery', label: 'Delivery partner assigned', detail: 'Your delivery partner is heading to the store.' },
  { key: 'picked_up', label: 'Picked up', detail: 'Your order has been collected.' },
  { key: 'out_for_delivery', label: 'On the way', detail: 'Your order is on its way to you.' },
  { key: 'delivered', label: 'Delivered', detail: 'Your order has been delivered.' },
] as const;

const statusCopy: Record<string, { title: string; message: string }> = {
  placed: { title: 'Order placed successfully', message: 'We have sent your order to the store.' },
  accepted_by_seller: { title: 'The store is preparing your order', message: 'We will update you as soon as it is ready.' },
  ready_for_pickup: { title: 'Your order is packed', message: 'Your order is ready for the delivery partner.' },
  assigned_to_delivery: { title: 'Delivery partner assigned', message: 'Your delivery partner is heading to the store.' },
  picked_up: { title: 'Your order has been picked up', message: 'Your delivery partner is on the way.' },
  out_for_delivery: { title: 'Your order is on the way', message: 'You will receive your order shortly.' },
  delivered: { title: 'Order delivered', message: 'We hope you enjoy your order.' },
  cancelled: { title: 'Order cancelled', message: 'This order has been cancelled.' },
};

const safeSponsorUrl = (value?: string) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
};

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({ orderId, onClose }) => {
  const { orders, syncWithBackend, showToast } = useApp();
  const order = orders.find(o => o.id === orderId || o.checkoutGroupId === orderId);
  const trackingOrderId = order?.trackingOrderId || orderId;
  const orderItems = Array.isArray(order?.items) ? order.items : [];
  const orderStatus = String(order?.status || 'placed').toLowerCase();
  const isStorePickup = order?.fulfilmentMode === 'STORE_PICKUP';
  const isDelivered = orderStatus === 'delivered';
  const isCancelled = orderStatus === 'cancelled';
  const isDeliveryOtpStage = ['picked_up', 'out_for_delivery'].includes(orderStatus);
  const hasRider = Boolean(order?.deliveryAgentName || order?.deliveryAgentPhone);
  const showMap = !isStorePickup && ['assigned_to_delivery', 'picked_up', 'out_for_delivery'].includes(orderStatus);
  const [trackingSnapshot, setTrackingSnapshot] = useState<any>(null);
  const [pickupOtp, setPickupOtp] = useState('');
  const [pickupSubmitting, setPickupSubmitting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const currentStepIndex = STEPS.findIndex(step => step.key === orderStatus);
  const currentStep = STEPS[Math.max(0, currentStepIndex)];
  const copy = statusCopy[orderStatus] || { title: 'Order status update', message: 'We will keep you updated as your order progresses.' };

  useEffect(() => {
    if (!order) return;
    let active = true;
    const refresh = async () => {
      try {
        const snapshot = await buyerApi.getLiveTracking(trackingOrderId);
        if (active && snapshot) setTrackingSnapshot(snapshot);
      } catch {
        // A temporary tracking refresh failure must not interrupt the order screen.
      }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [order, trackingOrderId]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const confirmPickup = async () => {
    if (!/^\\d{4}$/.test(pickupOtp) || pickupSubmitting) return;
    setPickupSubmitting(true);
    try {
      const token = localStorage.getItem('kurali_auth_token');
      const response = await fetch(`${API_BASE_URL}/buyers/orders/${encodeURIComponent(trackingOrderId)}/confirm-pickup`, {
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

  const sponsor = useMemo(() => {
    const title = String(import.meta.env.VITE_TRACKING_SPONSOR_TITLE || '').trim();
    const description = String(import.meta.env.VITE_TRACKING_SPONSOR_DESCRIPTION || '').trim();
    const image = String(import.meta.env.VITE_TRACKING_SPONSOR_IMAGE || '').trim();
    const url = safeSponsorUrl(String(import.meta.env.VITE_TRACKING_SPONSOR_URL || '').trim());
    return title && description ? { title, description, image, url } : null;
  }, []);

  if (!order) return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Order tracking">
      <div role="alert" className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
        <h3 className="text-base font-extrabold text-slate-900">Order details are still loading</h3>
        <p className="mt-2 text-sm text-slate-600">We couldn't find order #{orderId} in the current order list. Refresh your orders and try again.</p>
        <button type="button" onClick={onClose} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Close</button>
      </div>
    </div>
  );

  const etaText = trackingSnapshot?.estimatedDeliveryAt || trackingSnapshot?.estimatedDeliveryTime || trackingSnapshot?.eta;
  const otp = isDeliveryOtpStage && !isDelivered && typeof trackingSnapshot?.deliveryOtp === 'string' && /^\\d{4}$/.test(trackingSnapshot.deliveryOtp)
    ? trackingSnapshot.deliveryOtp
    : null;

  return (
    <div className="fixed inset-0 z-[150] flex items-stretch justify-center bg-slate-950/65 backdrop-blur-sm animate-in fade-in sm:items-center sm:p-4"
      role="dialog" aria-modal="true" aria-label="Order tracking">
      <section className="flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden border border-slate-200 bg-slate-50 shadow-2xl sm:h-auto sm:max-h-[94dvh] sm:rounded-3xl">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black tracking-tight text-slate-900">KuraliUpdates <span className="font-semibold text-slate-400">· Order tracking</span></p>
              <p className="truncate text-[11px] text-slate-500">Order #{order.id}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close order tracking"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 sm:space-y-4 sm:p-5">
          <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">Current order status</p>
                <h1 className="mt-1 text-xl font-black leading-tight text-slate-950 sm:text-2xl">{copy.title}</h1>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{copy.message}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${isCancelled ? 'bg-rose-50 text-rose-700' : isDelivered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                {orderStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                {isDelivered ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Delivery estimate</p>
                <p className="text-sm font-extrabold text-slate-900">
                  {isDelivered ? 'Delivered' : etaText ? String(etaText) : isCancelled ? 'Not applicable' : orderStatus === 'placed' || orderStatus === 'accepted_by_seller' || orderStatus === 'ready_for_pickup' ? 'We’ll show an ETA once a delivery partner is assigned' : 'Your delivery is being coordinated'}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">Order progress</h2>
              <span className="text-[10px] font-semibold text-slate-400">{currentStepIndex >= 0 ? `Step ${currentStepIndex + 1} of ${STEPS.length}` : 'Status update'}</span>
            </div>
            <ol className="space-y-3">
              {STEPS.map((step, index) => {
                const complete = !isCancelled && currentStepIndex >= index;
                const active = !isCancelled && currentStepIndex === index;
                return (
                  <li key={step.key} className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${complete ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {complete ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-[10px] font-bold">{index + 1}</span>}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-extrabold ${active ? 'text-emerald-800' : complete ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</p>
                      {active && <p className="mt-0.5 text-[11px] text-slate-500">{step.detail}</p>}
                    </div>
                    {active && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold uppercase text-emerald-700">Current</span>}
                  </li>
                );
              })}
            </ol>
            {Array.isArray(order.statusUpdates) && order.statusUpdates.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent updates</p>
                {order.statusUpdates.slice(-3).reverse().map((update: any, index: number) => (
                  <div key={`${update.status || 'update'}-${index}`} className="flex items-start justify-between gap-3 py-1.5 text-[11px]">
                    <span className="font-semibold capitalize text-slate-700">{String(update.status || 'Update').replace(/_/g, ' ')}{update.note ? ` · ${update.note}` : ''}</span>
                    <span className="shrink-0 text-slate-400">{update.timestamp || ''}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {showMap && (
            <section className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">Delivery map</h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700"><MapPin className="h-3 w-3" /> OpenStreetMap supported</span>
              </div>
              <LiveOrderMap orderId={order.id} fallbackBuyer={{ latitude: order.deliveryLatitude, longitude: order.deliveryLongitude }}
                sellerAddress={order.sellerLocality} destinationAddress={order.deliveryAddress} orderStatus={order.status} />
            </section>
          )}

          {!isStorePickup && hasRider && !isDelivered && (
            <section className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Bike className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your delivery partner</p>
                  <p className="truncate text-sm font-extrabold text-slate-900">{order.deliveryAgentName || 'Delivery partner assigned'}</p>
                  <p className="text-[11px] text-slate-500">{order.deliveryAgentVehicle || 'Vehicle details unavailable'}</p>
                </div>
              </div>
              {order.deliveryAgentPhone && <a href={`tel:${order.deliveryAgentPhone}`} aria-label="Call delivery partner"
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-800">
                <Phone className="h-4 w-4" /> Call
              </a>}
            </section>
          )}

          {isDeliveryOtpStage && otp && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900"><ShieldCheck className="h-4 w-4" /> Delivery handover code</div>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-800">Share this code with your delivery partner only when your order is being handed to you.</p>
              <div className="mt-3 inline-flex rounded-xl border border-amber-200 bg-white px-5 py-2.5 font-mono text-2xl font-black tracking-[0.3em] text-amber-800">{otp}</div>
            </section>
          )}

          {isStorePickup && orderStatus === 'ready_for_pickup' && (
            <section className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-extrabold text-emerald-900">Collecting your order from the store?</p>
              <p className="text-[11px] text-emerald-800">Enter the collection code provided by the store to confirm pickup.</p>
              <div className="flex gap-2">
                <input aria-label="Store pickup OTP" inputMode="numeric" maxLength={4} value={pickupOtp}
                  onChange={event => setPickupOtp(event.target.value.replace(/\\D/g, '').slice(0, 4))}
                  placeholder="4-digit code" className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-mono tracking-widest" />
                <button type="button" onClick={confirmPickup} disabled={pickupOtp.length !== 4 || pickupSubmitting}
                  className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                  {pickupSubmitting ? 'Confirming…' : 'Confirm pickup'}
                </button>
              </div>
            </section>
          )}

          {order.checkoutGroupOrders && order.checkoutGroupOrders.length > 1 && (
            <section className="space-y-2 rounded-2xl border border-blue-100 bg-blue-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-black uppercase tracking-wider text-blue-900">One combined order · {order.checkoutGroupOrders.length} stores</h2>
                <span className="text-[10px] font-bold text-blue-700">Single delivery</span>
              </div>
              {order.checkoutGroupOrders.map((sellerOrder, index) => (
                <div key={sellerOrder.id} className="flex items-start justify-between gap-2 rounded-xl bg-white/80 px-3 py-2">
                  <div className="min-w-0"><p className="text-xs font-bold text-slate-800">Pickup {index + 1}: {sellerOrder.sellerName || sellerOrder.sellerId}</p><p className="text-[11px] text-slate-500">{sellerOrder.sellerAddress || sellerOrder.sellerLocality}</p></div>
                  <span className="shrink-0 text-[10px] font-bold capitalize text-blue-800">{String(sellerOrder.status).replace(/_/g, ' ')}</span>
                </div>
              ))}
            </section>
          )}

          {sponsor && (
            <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Sponsored local business">
              <div className="flex items-center justify-between px-3 pt-3"><span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Sponsored</span><Sparkles className="h-3.5 w-3.5 text-amber-500" /></div>
              <div className="flex items-center gap-3 p-3 pt-2">
                {sponsor.image && <img src={sponsor.image} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />}
                <div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-slate-900">{sponsor.title}</p><p className="mt-0.5 text-xs leading-relaxed text-slate-600">{sponsor.description}</p></div>
                {sponsor.url && <a href={sponsor.url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white">View</a>}
              </div>
            </aside>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button type="button" onClick={() => setDetailsOpen(open => !open)} aria-expanded={detailsOpen}
              className="flex w-full items-center justify-between gap-3 p-4 text-left">
              <span><span className="block text-xs font-black text-slate-900">Order details</span><span className="mt-0.5 block text-[11px] text-slate-500">{orderItems.length} items · Total ₹{order.totalAmount}</span></span>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
            </button>
            {detailsOpen && <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-2">
              <div className="divide-y divide-slate-100">
                {orderItems.map((item: any, index: number) => {
                  const product = item?.product || item || {};
                  const quantity = Math.max(1, Number(item?.quantity) || 1);
                  const title = product?.title || item?.title || item?.productName || 'Order item';
                  const unitPrice = Number(item?.negotiatedPrice) || Number(product?.sellerPrice) || Number(item?.unitPrice) || (Number(item?.totalPrice) > 0 ? Number(item.totalPrice) / quantity : 0);
                  return <div key={item?.productId || item?.id || index} className="flex items-center justify-between gap-3 py-2">
                    <div className="flex min-w-0 items-center gap-2"><Package className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate text-xs font-semibold text-slate-800">{title} <span className="text-slate-400">× {quantity}</span></span></div>
                    <span className="shrink-0 text-xs font-bold text-slate-900">₹{Math.round(unitPrice * quantity)}</span>
                  </div>;
                })}
              </div>
              <div className="space-y-1 border-t border-slate-100 pt-2 text-xs">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
                {order.billDiscountAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Store discount</span><span>-₹{order.billDiscountAmount}</span></div>}
                {order.couponDiscountAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Coupon ({order.couponCode})</span><span>-₹{order.couponDiscountAmount}</span></div>}
                <div className="flex justify-between text-slate-600"><span>Delivery fee</span><span>{order.isFreeDelivery ? 'FREE' : `₹${order.deliveryFee}`}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-900"><span>Total · {order.paymentMethod}</span><span>₹{order.totalAmount}</span></div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><MapPin className="h-3 w-3" /> Delivery address</p><p className="mt-1 text-xs font-semibold leading-relaxed text-slate-700">{order.deliveryAddress || 'Address not available'}</p></div>
            </div>}
          </section>

          <div className="rounded-xl bg-slate-100 px-3 py-3 text-center text-[11px] text-slate-600">
            <Headset className="mr-1 inline h-3.5 w-3.5" /> Need help with this order? Use Help &amp; Support from your account.
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
          <span className="min-w-0 truncate text-[10px] font-medium text-slate-500">Order #{order.id}</span>
          <button type="button" onClick={onClose} className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-slate-800">Back to orders</button>
        </footer>
      </section>
    </div>
  );
};
