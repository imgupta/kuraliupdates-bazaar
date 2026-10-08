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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Order } from '../../types';
import { bazaarApi } from '../../services/api';

export const DeliveryDashboard: React.FC = () => {
  const {
    currentAgent,
    deliveryAgents,
    orders,
    claimDeliveryJob,
    completeDelivery,
    setIsDeliveryRegisterOpen,
    showToast,
    syncWithBackend,
  } = useApp();

  const [otpInputs, setOtpInputs] = useState<{ [orderId: string]: string }>({});
  const [deliveryJobsLoading, setDeliveryJobsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!active) return;
      setDeliveryJobsLoading(true);
      try {
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
  }, [syncWithBackend]);



  const agent = currentAgent || deliveryAgents[0];

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
      void bazaarApi.updateDeliveryLocation(agent.id, latitude, longitude);
    };

    const watchId = navigator.geolocation.watchPosition(
      publish,
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [agent?.id]);

  // Available jobs in Kurali
  const availableOrders = orders.filter(
    o => o.status === 'ready_for_pickup' && (!o.deliveryAgentId || o.deliveryAgentId !== agent?.id)
  );

  // Active deliveries assigned to this rider
  const myActiveOrders = orders.filter(
    o => o.deliveryAgentId === agent?.id && (o.status === 'picked_up' || o.status === 'assigned_to_delivery')
  );

  // Delivered completed orders
  const completedOrders = orders.filter(
    o => o.deliveryAgentId === agent?.id && o.status === 'delivered'
  );

  const handleClaim = (orderId: string) => {
    if (!agent) {
      setIsDeliveryRegisterOpen(true);
      return;
    }
    claimDeliveryJob(orderId, agent.id);
  };

  const handleVerifyDeliveryOtp = (orderId: string) => {
    const enteredOtp = otpInputs[orderId] || '';
    if (!enteredOtp.trim()) {
      showToast('Please enter customer 4-digit OTP upon delivery.', 'error');
      return;
    }

    const res = completeDelivery(orderId, enteredOtp);
    if (res.success) {
      showToast(res.message, 'success');
      setOtpInputs(prev => ({ ...prev, [orderId]: '' }));
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

          <button
            onClick={() => setIsDeliveryRegisterOpen(true)}
            className="px-4 py-2 bg-emerald-800/60 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors border border-emerald-400/30 cursor-pointer"
          >
            Update Profile / Vehicle
          </button>
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
                    <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800 block">Pickup: {ord.sellerName}</span>
                        <span className="text-[11px] text-slate-500">{ord.sellerLocality}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <Navigation className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800 block">Deliver to: {ord.buyerName}</span>
                        <span className="text-[11px] text-slate-500">{ord.deliveryAddress}</span>
                        <span className="text-[11px] text-slate-500 block">Phone: {ord.buyerPhone}</span>
                      </div>
                    </div>
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
                        onClick={() => handleVerifyDeliveryOtp(ord.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify &amp; Credit ₹{payout}</span>
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
                      <h4 className="font-bold text-xs text-slate-900 mt-0.5">Pickup from: {ord.sellerName}</h4>
                      <p className="text-[11px] text-slate-500">{ord.sellerLocality}</p>
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
                    onClick={() => handleClaim(ord.id)}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Claim Order (Earn ₹{payout})</span>
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
