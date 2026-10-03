import React, { useState } from 'react';
import {
  Bike,
  MapPin,
  Clock,
  CheckCircle2,
  DollarSign,
  Navigation,
  Phone,
  ShieldCheck,
  TrendingUp,
  Package,
  Store,
  ArrowRight,
  AlertCircle,
  Wallet,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { Order } from '../../types';

export const DeliveryDashboard: React.FC = () => {
  const {
    currentAgent,
    deliveryAgents,
    orders,
    claimDeliveryJob,
    updateOrderStatus,
    completeDelivery,
    setIsDeliveryRegisterOpen,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'jobs' | 'active' | 'earnings'>('jobs');
  const [isOnline, setIsOnline] = useState(true);
  const [otpInputs, setOtpInputs] = useState<{ [orderId: string]: string }>({});
  const [otpError, setOtpError] = useState<{ [orderId: string]: string }>({});

  const agent = currentAgent || deliveryAgents[0];

  // Available pickup jobs (orders ready for pickup that are not yet assigned)
  const availableJobs = orders.filter(
    o => o.status === 'ready_for_pickup' && !o.deliveryAgentId
  );

  // Active deliveries for this rider
  const activeDeliveries = orders.filter(
    o => o.deliveryAgentId === agent.id && o.status !== 'delivered' && o.status !== 'cancelled'
  );

  // Completed deliveries for this rider
  const completedDeliveries = orders.filter(
    o => o.deliveryAgentId === agent.id && o.status === 'delivered'
  );

  const handleAcceptJob = (orderId: string) => {
    claimDeliveryJob(orderId, agent.id);
    setActiveTab('active');
  };

  const handleVerifyAndComplete = (orderId: string) => {
    const enteredOtp = otpInputs[orderId] || '';
    if (!enteredOtp) {
      setOtpError({ ...otpError, [orderId]: 'Please enter the 4-digit OTP provided by the buyer' });
      return;
    }

    const res = completeDelivery(orderId, enteredOtp);
    if (!res.success) {
      setOtpError({ ...otpError, [orderId]: res.message });
    } else {
      setOtpError({ ...otpError, [orderId]: '' });
      showToast(res.message, 'success');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Delivery Agent Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={agent.avatarUrl}
              alt={agent.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-400 shadow-xs"
            />
            <span
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                isOnline ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            ></span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {agent.name}
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                ★ {agent.rating} Verified Kurali Rider
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>Vehicle: <strong>{agent.vehicleType} ({agent.vehicleNumber})</strong></span>
              <span>&bull;</span>
              <span>License: {agent.licenseNumber}</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-600" />
                {agent.currentLocality}
              </span>
            </p>
          </div>
        </div>

        {/* Online Duty Status Switcher & Register new */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              isOnline
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-white animate-ping' : 'bg-slate-500'}`}></span>
            <span>{isOnline ? 'On Duty (Accepting Jobs)' : 'Off Duty'}</span>
          </button>

          <button
            onClick={() => setIsDeliveryRegisterOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Register Another Rider
          </button>
        </div>
      </div>

      {/* Quick Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Today's Payout</span>
          <p className="text-xl font-black text-emerald-600 mt-1">₹{agent.todayEarnings}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Available Jobs</span>
          <p className="text-xl font-black text-amber-600 mt-1">{availableJobs.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Active Deliveries</span>
          <p className="text-xl font-black text-blue-600 mt-1">{activeDeliveries.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Total Trips Done</span>
          <p className="text-xl font-black text-slate-900 mt-1">{agent.totalTrips}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'jobs'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Available Jobs Board ({availableJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'active'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Active Trips &amp; Pickups ({activeDeliveries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('earnings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'earnings'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Earnings &amp; Payouts Dashboard</span>
        </button>
      </div>

      {/* Tab 1: Available Jobs Board (Accept job based on Price & Distance) */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Live Delivery Jobs in Kurali
              </h2>
              <p className="text-xs text-slate-500">
                Pickups verified and packed by shopkeepers. Accept based on delivery fee and distance.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableJobs.length === 0 ? (
              <div className="col-span-2 bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 text-xs space-y-2">
                <Bike className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-bold text-slate-700 text-sm">No pending pickup jobs right now</p>
                <p>
                  When a buyer places an order and the shopkeeper marks it "Ready for Pickup", it will pop up here instantly!
                </p>
              </div>
            ) : (
              availableJobs.map(job => {
                // Calculate dynamic delivery agent payout based on distance
                const payoutAmount = Math.max(45, Math.round(job.distanceKm * 22) + 20);

                return (
                  <div
                    key={job.id}
                    className="bg-white rounded-3xl p-5 border-2 border-slate-200 hover:border-emerald-500 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Top Bar with Payout Offer */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-800">
                            {job.id}
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            READY FOR PICKUP
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-slate-400 font-medium">Payout Offer</span>
                          <p className="text-xl font-black text-emerald-600">
                            ₹{payoutAmount}
                          </p>
                        </div>
                      </div>

                      {/* Route Details */}
                      <div className="mt-3 space-y-2.5 text-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                            <Store className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Pickup Shop
                            </span>
                            <p className="font-bold text-slate-900">{job.sellerName}</p>
                            <p className="text-slate-500">{job.sellerLocality}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Drop Destination
                            </span>
                            <p className="font-bold text-slate-900">{job.buyerName}</p>
                            <p className="text-slate-500">{job.deliveryAddress}</p>
                          </div>
                        </div>
                      </div>

                      {/* Package Summary */}
                      <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <span>Items: <strong>{job.items.length} parcel package</strong></span>
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                          Est. Distance: {job.distanceKm} km
                        </span>
                      </div>
                    </div>

                    {/* Accept Job button */}
                    <button
                      onClick={() => handleAcceptJob(job.id)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept Delivery Job for ₹{payoutAmount}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Active Deliveries & Scheduled Pickups */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Active Trips &amp; In-Progress Pickups ({activeDeliveries.length})
            </h2>
            <p className="text-xs text-slate-500">
              Manage your assigned route, contact customer/store, and verify buyer OTP to complete delivery.
            </p>
          </div>

          <div className="space-y-4">
            {activeDeliveries.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-400 text-xs">
                You have no active trips currently in progress. Go to the "Available Jobs Board" to accept a new delivery job!
              </div>
            ) : (
              activeDeliveries.map(trip => (
                <div
                  key={trip.id}
                  className="bg-white rounded-3xl p-6 border-2 border-emerald-500 shadow-md space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-slate-900">
                          {trip.id}
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                          {trip.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Distance: <strong>{trip.distanceKm} km</strong> &bull; Total Value: ₹{trip.totalAmount} ({trip.paymentStatus === 'paid' ? 'Paid Online' : 'Collect Cash: ₹' + trip.totalAmount})
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400">Guaranteed Payout</span>
                      <p className="text-lg font-black text-emerald-600">
                        ₹{Math.max(45, Math.round(trip.distanceKm * 22) + 20)}
                      </p>
                    </div>
                  </div>

                  {/* Contact Store & Buyer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-amber-800 uppercase">Pickup Merchant</span>
                        <p className="font-bold text-slate-900">{trip.sellerName}</p>
                        <p className="text-slate-500">{trip.sellerLocality}</p>
                      </div>
                      <a
                        href="tel:9876543210"
                        className="p-2 bg-white rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-100"
                        title="Call Store"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>

                    <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase">Customer Drop</span>
                        <p className="font-bold text-slate-900">{trip.buyerName}</p>
                        <p className="text-slate-500">{trip.deliveryAddress}</p>
                      </div>
                      <a
                        href={`tel:${trip.buyerPhone}`}
                        className="p-2 bg-white rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                        title="Call Buyer"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Rider Status Progression Controls */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <span className="text-xs font-bold text-slate-700 block">
                      Rider Workflow Actions:
                    </span>

                    {trip.status === 'assigned_to_delivery' && (
                      <button
                        onClick={() =>
                          updateOrderStatus(
                            trip.id,
                            'picked_up',
                            `Package picked up from store by rider ${agent.name}`
                          )
                        }
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                      >
                        1. Arrived at Store &amp; Picked Up Package
                      </button>
                    )}

                    {trip.status === 'picked_up' && (
                      <button
                        onClick={() =>
                          updateOrderStatus(
                            trip.id,
                            'out_for_delivery',
                            `Rider is on the way to customer address in ${trip.deliveryLocality}`
                          )
                        }
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                      >
                        2. Start Journey &bull; Mark "Out for Delivery"
                      </button>
                    )}

                    {trip.status === 'out_for_delivery' && (
                      <div className="space-y-2">
                        <div className="p-3 bg-white rounded-xl border border-emerald-300">
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Verify Customer 4-Digit Delivery OTP:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={4}
                              placeholder="e.g. 4819"
                              value={otpInputs[trip.id] || ''}
                              onChange={e =>
                                setOtpInputs({ ...otpInputs, [trip.id]: e.target.value })
                              }
                              className="w-32 px-3 py-2 text-center text-sm font-mono font-black tracking-widest bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                            />
                            <button
                              onClick={() => handleVerifyAndComplete(trip.id)}
                              className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              Verify &amp; Complete Delivery
                            </button>
                          </div>
                          {otpError[trip.id] && (
                            <p className="text-[11px] text-rose-600 font-semibold mt-1">
                              {otpError[trip.id]}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Earnings & Payouts Dashboard */}
      {activeTab === 'earnings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                  Kurali Express Earnings &amp; Wallet
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Instant payouts per trip delivered in Kurali municipal zone.
                </p>
              </div>

              <button
                onClick={() => {
                  showToast(`Payout withdrawal request initiated for ₹${agent.todayEarnings}! Transferred to registered Bank/UPI.`, 'success');
                  confetti({
                    particleCount: 50,
                    spread: 50,
                    origin: { y: 0.6 },
                  });
                }}
                disabled={agent.todayEarnings <= 0}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Withdraw to Bank / UPI (₹{agent.todayEarnings})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-800 uppercase">
                  Today's Earnings
                </span>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  ₹{agent.todayEarnings}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  All-Time Earnings
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  ₹{agent.totalEarnings}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Completed Kurali Trips
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {agent.totalTrips} Trips
                </p>
              </div>
            </div>
          </div>

          {/* Completed Trips Log */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900">
              Completed Trip History
            </h4>

            <div className="divide-y divide-slate-100 text-xs">
              {completedDeliveries.length === 0 ? (
                <div className="py-6 text-center text-slate-400">
                  No trips completed in this session yet. Complete an active trip to see earnings recorded here!
                </div>
              ) : (
                completedDeliveries.map(trip => (
                  <div key={trip.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{trip.id}</p>
                      <p className="text-slate-500 text-[11px]">
                        {trip.sellerName} &rarr; {trip.deliveryAddress}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-emerald-600 text-sm">
                        +₹{Math.max(45, Math.round(trip.distanceKm * 22) + 20)}
                      </span>
                      <span className="block text-[10px] text-slate-400">Credited to Wallet</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
