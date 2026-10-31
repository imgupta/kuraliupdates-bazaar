import React, { useEffect, useState } from 'react';
import {
  Bike,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Navigation,
  KeyRound,
  DollarSign,
  Truck,
  Package,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Order } from '../../types';
import { deliveryApi } from '../../services/domains/deliveryApi';
import { LiveOrderMap } from '../../components/shared/LiveOrderMap';
import { groupCheckoutOrders } from '../../entities/orderGrouping';


const uniqueOrdersById = (items: Order[]): Order[] => {
  const statusPriority = (status: Order['status']): number => {
    switch (status) {
      case 'delivered': return 4;
      case 'picked_up':
      case 'assigned_to_delivery': return 3;
      case 'ready_for_pickup': return 1;
      default: return 2;
    }
  };

  const byId = new Map<string, Order>();
  for (const order of items) {
    const orderRecord = order as Order & { orderId?: string; orderNumber?: string; publicOrderId?: string };
    const rawId = orderRecord.orderNumber || orderRecord.publicOrderId || orderRecord.orderId || order.id;
    const id = String(rawId || '').trim().toLowerCase().replace(/\\s+/g, '');
    if (!id) continue;
    const existing = byId.get(id);
    if (!existing || statusPriority(order.status) > statusPriority(existing.status)) {
      byId.set(id, order);
    }
  }
  return [...byId.values()];
};

export const DeliveryDashboard: React.FC = () => {
  const {
    currentAgent,
    orders,
    claimDeliveryJob,
    completeDelivery,
    setIsDeliveryRegisterOpen,
    showToast,
    syncWithBackend,
  } = useApp();

  const [otpInputs, setOtpInputs] = useState<{ [orderId: string]: string }>({});
  const [deliveryJobsLoading, setDeliveryJobsLoading] = useState(false);
  const [backendAgent, setBackendAgent] = useState<any | null>(null);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [liveAvailableOrders, setLiveAvailableOrders] = useState<Order[]>([]);
  const [myAssignedOrders, setMyAssignedOrders] = useState<Order[]>([]);
  const [resendingOtp, setResendingOtp] = useState<Record<string, boolean>>({});
  const [otpCooldowns, setOtpCooldowns] = useState<Record<string, number>>({});
  const [pickupSaving, setPickupSaving] = useState<Record<string, boolean>>({});
  const [, setCooldownTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setCooldownTick(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!active) return;
      setDeliveryJobsLoading(true);
      try {
        const [remoteAgent, remoteJobs, assignedJobs] = await Promise.all([
          deliveryApi.getCurrentDeliveryAgent(),
          deliveryApi.getDeliveryAvailableJobs(),
          deliveryApi.getMyAssignedJobs(),
        ]);
        setBackendAgent(remoteAgent);
        setLiveAvailableOrders(remoteJobs as Order[]);
        setMyAssignedOrders(assignedJobs as Order[]);
        await syncWithBackend();
      } finally {
        if (active) setDeliveryJobsLoading(false);
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 10000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);



  const agent = backendAgent
    ? {
        id: backendAgent.agentId,
        name: backendAgent.fullName,
        email: backendAgent.email,
        phone: backendAgent.phone,
        avatarUrl: backendAgent.avatarUrl || '',
        vehicleType: backendAgent.vehicleType,
        vehicleNumber: backendAgent.vehicleNumber,
        licenseNumber: backendAgent.licenseNumber,
        status: String(backendAgent.status || '').toLowerCase(),
        availableForJobs: backendAgent.availableForJobs !== false,
        rating: Number(backendAgent.rating || 0),
        totalTrips: Number(backendAgent.totalTrips || 0),
        todayEarnings: Number(backendAgent.todayEarnings || 0),
        totalEarnings: Number(backendAgent.totalEarnings || 0),
        currentLocality: backendAgent.currentLocality,
      }
    : currentAgent;

  useEffect(() => {
    if (!agent?.id || !navigator.geolocation) return;

    // GPS is collected locally and sent directly to our backend.
    // Google Maps is NOT involved in rider-location updates.
    const MIN_SEND_INTERVAL_MS = 10_000;
    const MIN_MOVEMENT_METERS = 15;
    const MAX_HEARTBEAT_INTERVAL_MS = 30_000;

    let lastSentAt = 0;
    let lastLatitude: number | null = null;
    let lastLongitude: number | null = null;

    const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const earthRadius = 6_371_000;
      const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
      const dLat = toRadians(lat2 - lat1);
      const dLon = toRadians(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
          Math.cos(toRadians(lat2)) *
          Math.sin(dLon / 2) ** 2;
      return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const publish = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      const now = Date.now();

      const movedEnough =
        lastLatitude === null ||
        lastLongitude === null ||
        distanceMeters(lastLatitude, lastLongitude, latitude, longitude) >= MIN_MOVEMENT_METERS;

      const heartbeatDue = now - lastSentAt >= MAX_HEARTBEAT_INTERVAL_MS;
      const sendDue = now - lastSentAt >= MIN_SEND_INTERVAL_MS && (movedEnough || heartbeatDue);

      if (!sendDue) return;

      lastSentAt = now;
      lastLatitude = latitude;
      lastLongitude = longitude;
      void deliveryApi.updateDeliveryLocation(agent.id, latitude, longitude);
    };

    const watchId = navigator.geolocation.watchPosition(
      publish,
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [agent?.id]);

  const toggleRiderAvailability = async () => {
    if (!backendAgent || availabilitySaving || String(backendAgent.status || '').toUpperCase() !== 'ACTIVE') return;
    setAvailabilitySaving(true);
    try {
      const updated = await deliveryApi.setAvailability(backendAgent.availableForJobs === false);
      setBackendAgent(updated);
      setLiveAvailableOrders(updated.availableForJobs === false ? [] : await deliveryApi.getDeliveryAvailableJobs() as Order[]);
      showToast(updated.availableForJobs === false ? 'You are offline. No new jobs will be assigned.' : 'You are online and can accept new jobs.', 'success');
    } catch (error: any) { showToast(error?.message || 'Unable to update availability.', 'error'); }
    finally { setAvailabilitySaving(false); }
  };

  // Normalize duplicate records from overlapping background syncs. When the same
  // order appears with conflicting states, keep the most advanced server state.
  const uniqueOrders = uniqueOrdersById(orders);

  // Active deliveries assigned to this rider.
  const myActiveOrders = groupCheckoutOrders(uniqueOrdersById([
    ...myAssignedOrders,
    ...uniqueOrders.filter(
      o => o.deliveryAgentId === agent?.id && (o.status === 'picked_up' || o.status === 'assigned_to_delivery')
    ),
  ]));
  const activeOrderIds = new Set(myActiveOrders.map(order => order.id));

  // Available jobs come from the live dispatch endpoint. Never fall back to stale
  // local READY_FOR_PICKUP records when the server currently returns no jobs.
  const availableOrders = agent?.status === 'active' && backendAgent?.availableForJobs !== false
    ? groupCheckoutOrders(uniqueOrdersById(liveAvailableOrders).filter(
        o => o.status === 'ready_for_pickup'
          && !o.deliveryAgentId
      )).filter(o => !activeOrderIds.has(o.id))
    : [];

  // Delivered completed orders
  const completedOrders = groupCheckoutOrders(uniqueOrdersById(uniqueOrders.filter(
    o => o.deliveryAgentId === agent?.id && o.status === 'delivered'
  )));

  const [claimingOrderIds, setClaimingOrderIds] = useState<Record<string, boolean>>({});

  const handleClaim = async (job: Order) => {
    if (!agent) {
      setIsDeliveryRegisterOpen(true);
      return;
    }
    const claimKey = job.checkoutGroupId || job.id;
    if (claimingOrderIds[claimKey]) return;
    setClaimingOrderIds(prev => ({ ...prev, [claimKey]: true }));
    try {
      const claimed = job.checkoutGroupId
        ? await deliveryApi.claimDeliveryCheckoutGroup(job.checkoutGroupId, agent.id)
        : await claimDeliveryJob(job.id, agent.id);
      if (claimed) {
        const childIds = new Set(job.checkoutGroupOrderIds || [job.id]);
        setLiveAvailableOrders(prev => prev.filter(order => !childIds.has(order.id)));
        await syncWithBackend();
      } else {
        showToast('Unable to claim this delivery job. Refresh the pickup list and try again.', 'error');
      }
    } finally {
      setClaimingOrderIds(prev => ({ ...prev, [claimKey]: false }));
    }
  };

  const handleConfirmSellerPickup = async (orderId: string) => {
    if (pickupSaving[orderId]) return;
    setPickupSaving(prev => ({ ...prev, [orderId]: true }));
    try {
      await deliveryApi.confirmSellerPickup(orderId);
      showToast('Seller pickup confirmed. Continue to the next stop.', 'success');
      const assigned = await deliveryApi.getMyAssignedJobs();
      setMyAssignedOrders(assigned as Order[]);
      await syncWithBackend();
    } catch (error: any) {
      showToast(error?.message || 'Unable to confirm this seller pickup.', 'error');
    } finally {
      setPickupSaving(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleResendDeliveryOtp = async (orderId: string) => {
    if (resendingOtp[orderId] || (otpCooldowns[orderId] || 0) > Date.now()) return;
    setResendingOtp(prev => ({ ...prev, [orderId]: true }));
    try {
      const result = await deliveryApi.resendDeliveryOtp(orderId);
      showToast(result.message || 'Delivery OTP resent to the customer.', 'success');
      setOtpCooldowns(prev => ({ ...prev, [orderId]: Date.now() + 60_000 }));
    } catch (error: any) {
      showToast(error?.message || 'Unable to resend delivery OTP.', 'error');
    } finally {
      setResendingOtp(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleVerifyDeliveryOtp = async (orderId: string, inputKey: string = orderId) => {
    const enteredOtp = otpInputs[inputKey] || '';
    if (!/^\d{4}$/.test(enteredOtp.trim())) {
      showToast('Please enter the customer’s 4-digit OTP upon delivery.', 'error');
      return;
    }

    const res = await completeDelivery(orderId, enteredOtp.trim());
    if (res.success) {
      showToast(res.message, 'success');
      setOtpInputs(prev => ({ ...prev, [inputKey]: '' }));
      await syncWithBackend();
    } else {
      showToast(res.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Rider Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
              <Bike className="w-8 h-8 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  {agent?.name || 'Kurali Express Partner'}
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  {agent?.status || 'Active Driver'}
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-1">
                Vehicle: <strong>{agent?.vehicleNumber} ({agent?.vehicleType})</strong> &bull; Rating: <strong>★ {agent?.rating}</strong> &bull; Zone: <strong>{agent?.currentLocality}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {backendAgent && String(backendAgent.status || '').toUpperCase() === 'ACTIVE' && (
              <button type="button" onClick={() => void toggleRiderAvailability()} disabled={availabilitySaving}
                className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-colors disabled:opacity-60 ${backendAgent.availableForJobs === false ? 'bg-slate-200 text-slate-800' : 'bg-emerald-500 text-white'}`}>
                {availabilitySaving ? 'Updating…' : backendAgent.availableForJobs === false ? 'Go Online' : 'Go Offline'}
              </button>
            )}
            <button
              onClick={() => setIsDeliveryRegisterOpen(true)}
              className="px-4 py-2 bg-emerald-800/60 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors border border-emerald-400/30 cursor-pointer"
            >
              Update Profile / Vehicle
            </button>
          </div>
        </div>

        {/* Earnings Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Today's Earnings</span>
            <span className="text-xl font-black text-white">₹{agent?.todayEarnings || 0}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Total Lifetime Trips</span>
            <span className="text-xl font-black text-white">{agent?.totalTrips || 0} trips</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Total Payout Credited</span>
            <span className="text-xl font-black text-white">₹{agent?.totalEarnings || 0}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Active Runs</span>
            <span className="text-xl font-black text-white">{myActiveOrders.length}</span>
          </div>
        </div>
      </div>

      {/* Active Deliveries En Route */}
      {myActiveOrders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Active Trips En Route ({myActiveOrders.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {myActiveOrders.map(ord => {
              const payout = Math.max(45, Math.round((ord.distanceKm || 1.4) * 22) + 20);
              return (
                <div
                  key={ord.id}
                  className="bg-white rounded-3xl border-2 border-emerald-400 p-5 shadow-md space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="font-mono font-extrabold text-xs text-emerald-700">#{ord.id}</span>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">
                        Payout: <span className="text-emerald-600 font-black">₹{payout}</span> ({ord.distanceKm} km)
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                      En Route
                    </span>
                  </div>

                  {/* Route Steps */}
                  <div className="space-y-2 text-xs">
                    {(ord.checkoutGroupOrders || [ord]).map((stop, index) => (
                      <div key={stop.id} className="flex items-start justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div className="flex items-start gap-2 min-w-0">
                          <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 block">Stop {index + 1}: {stop.sellerName || stop.sellerId}</span>
                            <span className="text-[11px] text-slate-500">{stop.sellerAddress || stop.sellerLocality}</span>
                          </div>
                        </div>
                        {stop.status === 'picked_up' ? (
                          <span className="shrink-0 text-[10px] font-bold text-emerald-700">Collected</span>
                        ) : (
                          <button type="button" onClick={() => void handleConfirmSellerPickup(stop.id)}
                            disabled={!!pickupSaving[stop.id]}
                            className="shrink-0 rounded-lg bg-blue-700 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">
                            {pickupSaving[stop.id] ? 'Saving…' : 'Mark collected'}
                          </button>
                        )}
                      </div>
                    ))}

                    <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <Navigation className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800 block">Deliver to: {ord.buyerName}</span>
                        <span className="text-[11px] text-slate-500">{ord.deliveryAddress}</span>
                        <span className="text-[11px] text-slate-500 block">Phone: {ord.buyerPhone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between gap-3 bg-slate-50 px-3 py-2">
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">Live delivery map</p>
                        <p className="text-[10px] text-slate-500">Rider location refreshes automatically</p>
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ord.deliveryAddress || ord.deliveryLocality || 'Kurali, Punjab')}&waypoints=${encodeURIComponent((ord.checkoutGroupOrders || []).map(stop => stop.sellerAddress || stop.sellerLocality).filter(Boolean).join('|'))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-800"
                      >
                        <Navigation className="h-3.5 w-3.5" /> Navigate
                      </a>
                    </div>
                    <LiveOrderMap orderId={ord.trackingOrderId || ord.id} sellerAddress={(ord.checkoutGroupOrders || [ord]).map(stop => stop.sellerAddress || stop.sellerLocality).join(' · ')} destinationAddress={ord.deliveryAddress} orderStatus={ord.status} />
                  </div>

                  {/* Customer Handover OTP input */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Customer 4-Digit Handover OTP *
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          maxLength={4}
                          value={otpInputs[ord.id] || ''}
                          onChange={e =>
                            setOtpInputs(prev => ({ ...prev, [ord.id]: e.target.value.replace(/\D/g, '') }))
                          }
                          placeholder="e.g. 5831"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-center font-mono font-bold text-slate-900 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white"
                        />
                      </div>
                      <button
                        onClick={() => handleVerifyDeliveryOtp(ord.trackingOrderId || ord.id, ord.id)}
                        disabled={(ord.checkoutGroupOrders || [ord]).some(stop => stop.status !== 'picked_up')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify &amp; Credit ₹{payout}</span>
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-[10px] text-slate-500">A new code appears in the customer's app. Ask them to open order tracking.</p>
                      <button
                        type="button"
                        disabled={(ord.checkoutGroupOrders || [ord]).some(stop => stop.status !== 'picked_up') || !!resendingOtp[ord.trackingOrderId || ord.id] || (otpCooldowns[ord.trackingOrderId || ord.id] || 0) > Date.now()}
                        onClick={() => void handleResendDeliveryOtp(ord.trackingOrderId || ord.id)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-[11px] font-bold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${resendingOtp[ord.id] ? 'animate-spin' : ''}`} />
                        {resendingOtp[ord.trackingOrderId || ord.id] ? 'Sending…' : (otpCooldowns[ord.trackingOrderId || ord.id] || 0) > Date.now() ? `New OTP in ${Math.ceil(((otpCooldowns[ord.trackingOrderId || ord.id] || 0) - Date.now()) / 1000)}s` : 'Generate new app OTP'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Job Board */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900">
            Available Pickup Orders in Kurali ({availableOrders.length})
          </h3>
          <span className="text-xs text-slate-500">{deliveryJobsLoading ? 'Refreshing…' : 'Live pickup dispatch'}</span>
        </div>

        {availableOrders.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-700 text-sm">No new orders waiting for pickup right now.</p>
            <p className="text-xs text-slate-400 mt-1">
              As soon as Kurali shopkeepers pack an order, it will appear here for you to claim.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableOrders.map(ord => {
              const payout = Math.max(45, Math.round((ord.distanceKm || 1.4) * 22) + 20);
              return (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-slate-700">#{ord.id}</span>
                      <h4 className="font-bold text-xs text-slate-900 mt-0.5">{ord.checkoutGroupOrders?.length ? `Collect from ${ord.checkoutGroupOrders.length} stores` : `Pickup from: ${ord.sellerName}`}</h4>
                      {(ord.checkoutGroupOrders || [ord]).map(stop => <p key={stop.id} className="text-[11px] text-slate-500">{stop.sellerName || stop.sellerId} · {stop.sellerAddress || stop.sellerLocality}</p>)}
                    </div>

                    <div className="text-right">
                      <span className="font-black text-base text-emerald-600">₹{payout}</span>
                      <span className="text-[10px] text-slate-400 block">{ord.distanceKm} km run</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs">
                    <span className="font-semibold text-slate-700 block">Deliver to: {ord.buyerName}</span>
                    <span className="text-[11px] text-slate-500 truncate block">{ord.deliveryAddress}</span>
                  </div>

                  <button
                    onClick={() => void handleClaim(ord)}
                    disabled={!!claimingOrderIds[ord.checkoutGroupId || ord.id]}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    <Truck className="w-4 h-4" />
                    <span>{claimingOrderIds[ord.checkoutGroupId || ord.id] ? 'Claiming…' : `Claim ${ord.checkoutGroupOrders?.length || 1} pickup${(ord.checkoutGroupOrders?.length || 1) > 1 ? 's' : ''} (Earn ₹${payout})`}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Orders List */}
      {completedOrders.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h3 className="text-sm font-extrabold text-slate-800">Your Completed Deliveries ({completedOrders.length})</h3>
          <div className="space-y-2">
            {completedOrders.map(ord => (
              <div
                key={ord.id}
                className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-slate-700">#{ord.id}</span>
                  <span className="text-slate-500 ml-2">&bull; Delivered to {ord.buyerName}</span>
                </div>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                  Delivered &amp; Paid
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
