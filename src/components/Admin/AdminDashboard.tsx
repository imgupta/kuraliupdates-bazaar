import React, { useState } from 'react';
import {
  ShieldCheck,
  Store,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Mail,
  FileText,
  Bike,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Layers,
  Download,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MarketTrendsVisualization } from './MarketTrendsVisualization';

export const AdminDashboard: React.FC = () => {
  const {
    sellers,
    approveSeller,
    rejectSeller,
    deliveryAgents,
    orders,
    products,
    setRole,
  } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState<'trends' | 'approvals' | 'stores' | 'fleet'>('trends');

  const pendingSellers = sellers.filter(s => s.status === 'pending');
  const approvedSellers = sellers.filter(s => s.status === 'approved');
  const rejectedSellers = sellers.filter(s => s.status === 'rejected');

  const totalGMV = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Admin Desk Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-purple-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            KuraliUpdates City Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Merchant Approval &amp; City Operations Desk
          </h1>
          <p className="text-xs sm:text-sm text-purple-200 max-w-xl">
            Monitor search query demand trends across Kurali neighborhoods, popular product categories, and grant merchant operating licenses.
          </p>
        </div>

        {/* Actions & Pending Badge */}
        <div className="flex items-center gap-3">
          <a
            href="/kuraliupdates-bazaar.zip"
            download="kuraliupdates-bazaar.zip"
            className="bg-white/10 hover:bg-white/20 text-white border border-white/25 px-4 py-3 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer text-center"
            title="Download full project ZIP to upload to GitHub"
          >
            <Download className="w-4 h-4 text-amber-300" />
            <span>Download Repo ZIP</span>
            <span className="text-[10px] text-purple-200 font-mono">For imgupta/kuraliupdates-bazaar</span>
          </a>

          <div
            onClick={() => setActiveAdminTab('approvals')}
            className="bg-white/10 hover:bg-white/15 cursor-pointer transition-colors backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center min-w-[140px]"
          >
            <span className="text-xs font-bold text-purple-200 uppercase">Pending Approvals</span>
            <p className="text-3xl font-black text-amber-300 mt-0.5">
              {pendingSellers.length}
            </p>
            <span className="text-[10px] text-amber-200 block mt-0.5 font-medium underline">
              Review Applications &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* City Commerce Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Total Kurali Stores</span>
          <p className="text-xl font-black text-slate-900 mt-1">{sellers.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Approved &amp; Live</span>
          <p className="text-xl font-black text-emerald-600 mt-1">{approvedSellers.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Active Delivery Riders</span>
          <p className="text-xl font-black text-blue-600 mt-1">{deliveryAgents.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Total City Orders (GMV)</span>
          <p className="text-xl font-black text-purple-600 mt-1">₹{totalGMV}</p>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveAdminTab('trends')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'trends'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Demand &amp; Trends Analytics</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('approvals')}
          className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'approvals'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Pending Seller Approvals</span>
          {pendingSellers.length > 0 && (
            <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {pendingSellers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveAdminTab('stores')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'stores'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Approved Stores ({approvedSellers.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('fleet')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'fleet'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Bike className="w-4 h-4" />
          <span>Delivery Fleet ({deliveryAgents.length})</span>
        </button>
      </div>

      {/* TAB 1: DATA VISUALIZATION - TRENDING SEARCHES & CATEGORIES */}
      {activeAdminTab === 'trends' && <MarketTrendsVisualization />}

      {/* TAB 2: PENDING APPROVALS */}
      {activeAdminTab === 'approvals' && (
        <div className="bg-white rounded-3xl p-6 border-2 border-amber-300 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Pending Seller Registrations
                </h2>
                <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
                  Action Required ({pendingSellers.length})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                These sellers submitted their store registration for Kurali and require administrative approval before going live.
              </p>
            </div>
          </div>

          {pendingSellers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">All pending registrations are cleared!</p>
              <p className="mt-1">
                To test the approval flow, click "Register Your Kurali Shop" from the header or Seller Portal.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSellers.map(seller => (
                <div
                  key={seller.id}
                  className="bg-amber-50/40 rounded-2xl p-5 border border-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={seller.avatarUrl}
                      alt={seller.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-slate-900">
                          {seller.name}
                        </h3>
                        <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          Pending Verification
                        </span>
                        <span className="text-xs text-slate-400">
                          Submitted: {new Date(seller.registeredAt).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 font-medium">
                        Owner: <strong>{seller.ownerName}</strong> &bull; Category: <span className="text-blue-700 font-bold">{seller.category}</span>
                      </p>

                      <p className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-600" />
                          {seller.address}, {seller.locality}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {seller.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {seller.email}
                        </span>
                      </p>

                      {seller.gstNumber && (
                        <p className="text-[11px] text-slate-500 font-mono">
                          GST / License: <strong>{seller.gstNumber}</strong>
                        </p>
                      )}

                      <p className="text-xs text-slate-600 italic bg-white/70 p-2 rounded-xl border border-amber-100 max-w-xl">
                        "{seller.description}"
                      </p>
                    </div>
                  </div>

                  {/* Approve & Reject Actions */}
                  <div className="flex sm:flex-col gap-2 w-full md:w-auto shrink-0">
                    <button
                      onClick={() => approveSeller(seller.id)}
                      className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve &amp; Go Live
                    </button>

                    <button
                      onClick={() => rejectSeller(seller.id)}
                      className="flex-1 sm:flex-none px-5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Application
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: APPROVED STORES */}
      {activeAdminTab === 'stores' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Approved Active Stores in Kurali ({approvedSellers.length})
              </h2>
              <p className="text-xs text-slate-500">
                Verified merchants with active product catalogs published to buyers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approvedSellers.map(seller => {
              const count = products.filter(p => p.sellerId === seller.id).length;

              return (
                <div
                  key={seller.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-400 transition-all space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={seller.avatarUrl}
                      alt={seller.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 truncate">
                        {seller.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">{seller.locality}</p>
                      <span className="inline-block mt-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded-full">
                        ★ {seller.rating} &bull; {seller.reviewCount} reviews
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <span>Catalog: <strong>{count} items</strong></span>
                    <span>Free delivery &gt; ₹{seller.minOrderForFreeDelivery}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: DELIVERY FLEET */}
      {activeAdminTab === 'fleet' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Registered Kurali Delivery Partners ({deliveryAgents.length})
            </h2>
            <p className="text-xs text-slate-500">
              Active riders delivering orders across Kurali city sectors and roads.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {deliveryAgents.map(ag => (
              <div
                key={ag.id}
                className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex items-center gap-3"
              >
                <img
                  src={ag.avatarUrl}
                  alt={ag.name}
                  className="w-12 h-12 rounded-xl object-cover border border-emerald-300"
                />
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-slate-900">{ag.name}</h4>
                  <p className="text-[11px] text-slate-500">
                    {ag.vehicleType} ({ag.vehicleNumber})
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-emerald-800 mt-0.5">
                    <span>★ {ag.rating}</span>
                    <span>&bull;</span>
                    <span>{ag.totalTrips} Trips Completed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

