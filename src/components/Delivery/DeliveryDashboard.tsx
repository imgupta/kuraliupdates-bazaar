import React, { useState } from 'react';
import {
  Bike,
  MapPin,
  CheckCircle2,
  Clock,
  Phone,
  Navigation,
  DollarSign,
  Package,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Eye,
  Store,
  PlusCircle,
} from 'lucide-react';
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
    setIsGmailAuthOpen,
    user,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'jobs' | 'active' | 'earnings'>('jobs');
  const [isOnline, setIsOnline] = useState(true);
  const [otpInputs, setOtpInputs] = useState<{ [orderId: string]: string }>({});
  const [otpError, setOtpError] = useState<{ [orderId: string]: string }>({});

  const agent = currentAgent || (user.deliveryAgentId ? deliveryAgents.find(a => a.id === user.deliveryAgentId) : deliveryAgents[0]);

  if (!agent) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6 bg-white rounded-3xl border border-slate-200 shadow-xl my-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
          <Bike className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Kurali Express Delivery Partner Fleet</h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Earn ₹45–₹95 per delivery trip across Kurali city with flexible hours and fast payouts. Register your bike or scooter to start accepting delivery requests.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <button
            onClick={() => setIsDeliveryRegisterOpen(true)}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Bike className="w-4 h-4" />
            Register as Delivery Rider
          </button>
          <button
            onClick={() => setIsGmailAuthOpen(true)}
            className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
          >
            Sign In with Rider Gmail
          </button>
        </div>
      </div>
    );
  }

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
      setOtpInputs({ ...otpInputs, [orderId]: '' });
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Rider Header Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={agent.avatarUrl}
            alt={agent.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-300 shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{agent.name}</h1>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Bike className="w-3.5 h-3.5 text-emerald-600" />
                {agent.vehicleType} ({agent.vehicleNumber})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>Phone: <strong>{agent.phone}</strong></span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-600" /> Zone: {agent.currentLocality}
              </span>
              <span>&bull;</span>
              <span>Rating: <strong>★ {agent.rating}</strong></span>
            </p>
          </div>
        </div>

        {/* Online / Offline Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              isOnline
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
            {isOnline ? 'Online & Available for Orders' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'jobs'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" /> Available Pickup Jobs ({availableJobs.length})
          {availableJobs.length > 0 && (
            <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] rounded-full">
              {availableJobs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'active'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Navigation className="w-4 h-4" /> Active Delivery ({activeDeliveries.length})
        </button>

        <button
          onClick={() => setActiveTab('earnings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'earnings'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Earnings &amp; History (₹{agent.totalEarnings})
        </button>
      </div>

      {/* Tab: Available Jobs */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">
              Orders Ready for Pickup in Kurali ({availableJobs.length})
            </h2>
          </div>

          {availableJobs.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <Clock className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Pickup Jobs Right Now</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Keep the app open and stay online. When local stores pack orders, new delivery requests will ring here!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableJobs.map(job => {
                const payout = Math.max(45, Math.round(job.distanceKm * 22) + 20);
                return (
                  <div
                    key={job.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3 hover:border-emerald-400 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-900">#{job.id}</span>
                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Payout: ₹{payout}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        <p className="flex items-center gap-1 font-semibold text-slate-800">
                          <Store className="w-3.5 h-3.5 text-blue-600" /> Store: {job.sellerNames.join(', ')}
                        </p>
                        <p className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-amber-600" /> Deliver To: {job.deliveryAddress}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Est. Distance: {job.distanceKm} km &bull; {job.items.length} items
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAcceptJob(job.id)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                    >
                      Accept Job &bull; Earn ₹{payout}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Active Deliveries */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-slate-900">
            Active Trips ({activeDeliveries.length})
          </h2>

          {activeDeliveries.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Pending Deliveries</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Check the "Available Pickup Jobs" tab to accept a trip in Kurali.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeDeliveries.map(del => {
                const payout = Math.max(45, Math.round(del.distanceKm * 22) + 20);
                return (
                  <div
                    key={del.id}
                    className="bg-white rounded-3xl border-2 border-emerald-500 p-6 shadow-md space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-900">#{del.id}</span>
                        <h3 className="font-extrabold text-sm text-slate-900 mt-0.5">
                          En Route to {del.buyerName}
                        </h3>
                      </div>
                      <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl">
                        Trip Payout: ₹{payout}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Delivery Address:</span>
                        <p className="font-semibold text-slate-800">{del.deliveryAddress}</p>
                        <p className="text-slate-500 text-[11px]">{del.deliveryLocality}, Kurali</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Customer Contact:</span>
                        <p className="font-semibold text-slate-800">{del.buyerPhone}</p>
                        <span className="text-[11px] text-blue-600 font-bold">Call Buyer for Directions</span>
                      </div>
                    </div>

                    {/* OTP Handover Verification Form */}
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2">
                      <label className="block text-xs font-bold text-emerald-950">
                        Enter 4-Digit Customer OTP upon Delivery:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="4-digit OTP"
                          value={otpInputs[del.id] || ''}
                          onChange={e => setOtpInputs({ ...otpInputs, [del.id]: e.target.value })}
                          className="w-32 px-3 py-2 bg-white border border-emerald-300 rounded-xl text-center font-mono font-bold text-sm tracking-widest outline-none"
                        />
                        <button
                          onClick={() => handleVerifyAndComplete(del.id)}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                        >
                          Verify OTP &amp; Complete Delivery
                        </button>
                      </div>
                      {otpError[del.id] && (
                        <p className="text-[11px] text-rose-600 font-bold">{otpError[del.id]}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Earnings */}
      {activeTab === 'earnings' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">Today's Earnings</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">₹{agent.todayEarnings}</span>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">Total Lifetime Earnings</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">₹{agent.totalEarnings}</span>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">Trips Completed</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{agent.totalTrips}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
