import React, { useEffect, useState } from 'react';
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
  Users,
  Download,
  Lock,
  Plus,
  Pencil,
  Save,
  UserRoundCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { bazaarApi } from '../../services/api';
import { MarketTrendsVisualization } from './MarketTrendsVisualization';
import { ROOT_ADMIN_EMAIL, isRootAdminEmail } from '../../data/initialData';

export const AdminDashboard: React.FC = () => {
  const {
    user,
    sellers,
    approveSeller,
    rejectSeller,
    approveDeliveryAgent,
    rejectDeliveryAgent,
    deliveryAgents,
    orders,
    products,
    setRole,
    setIsGmailAuthOpen,
    showToast,
  } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState<'trends' | 'approvals' | 'stores' | 'fleet' | 'buyers' | 'daily-help' | 'daily-helpers'>('trends');
  const [buyers, setBuyers] = useState<any[]>([]);
  const [buyersLoading, setBuyersLoading] = useState(false);
  const [adminSellers, setAdminSellers] = useState<any[]>([]);
  const [adminDeliveryAgents, setAdminDeliveryAgents] = useState<any[]>([]);
  const [adminAnalytics, setAdminAnalytics] = useState<any | null>(null);
  const [adminDataLoading, setAdminDataLoading] = useState(false);
  const [adminSearchTrends, setAdminSearchTrends] = useState<any[]>([]);
  const [dailyHelpServices, setDailyHelpServices] = useState<any[]>([]);
  const [dailyHelpHelpers, setDailyHelpHelpers] = useState<any[]>([]);
  const [editingDailyHelpId, setEditingDailyHelpId] = useState<string | null>(null);
  const [dailyHelpForm, setDailyHelpForm] = useState({ category: '', name: '', description: '', pricingUnit: 'HOUR', pricePerHour: '199', minHours: '1', imageUrl: '', active: 1 });
  const isRootAdmin = isRootAdminEmail(user.email);

  const refreshAdminData = async () => {
    if (!isRootAdmin) return;
    setAdminDataLoading(true);
    try {
      const [remoteSellers, remoteAgents, analytics, remoteBuyers, searchTrends, remoteDailyHelpServices, remoteDailyHelpHelpers] = await Promise.all([
        bazaarApi.getAdminSellers(),
        bazaarApi.getAdminDeliveryAgents(),
        bazaarApi.getAdminAnalytics(),
        bazaarApi.getAdminBuyers(),
        bazaarApi.getAdminSearchTrends(),
        bazaarApi.getAdminDailyHelpServices(),
        bazaarApi.getAdminDailyHelpHelpers(),
      ]);
      setAdminSellers(remoteSellers);
      setAdminDeliveryAgents(remoteAgents);
      setAdminAnalytics(analytics);
      setBuyers(remoteBuyers);
      setAdminSearchTrends(searchTrends);
      setDailyHelpServices(remoteDailyHelpServices);
      setDailyHelpHelpers(remoteDailyHelpHelpers);
    } finally {
      setAdminDataLoading(false);
      setBuyersLoading(false);
    }
  };

  useEffect(() => {
    if (!isRootAdmin) return;
    refreshAdminData();
    const interval = setInterval(refreshAdminData, 45000);
    return () => clearInterval(interval);
  }, [isRootAdmin]);

  const handleSellerDecision = async (sellerId: string, approve: boolean) => {
    const ok = approve ? await bazaarApi.approveSeller(sellerId) : await bazaarApi.rejectSeller(sellerId);
    if (!ok) {
      showToast('Unable to update seller status in the database.', 'error');
      return;
    }
    showToast(approve ? 'Seller store approved.' : 'Seller store rejected.', approve ? 'success' : 'info');
    await refreshAdminData();
  };

  const handleDeliveryDecision = async (agentId: string, approve: boolean) => {
    const ok = approve ? await bazaarApi.approveDeliveryAgent(agentId) : await bazaarApi.rejectDeliveryAgent(agentId);
    if (!ok) {
      showToast('Unable to update delivery partner status in the database.', 'error');
      return;
    }
    showToast(approve ? 'Delivery partner approved.' : 'Delivery partner rejected.', approve ? 'success' : 'info');
    await refreshAdminData();
  };


  const resetDailyHelpForm = () => setDailyHelpForm({ category: '', name: '', description: '', pricingUnit: 'HOUR', pricePerHour: '199', minHours: '1', imageUrl: '', active: 1 });

  const saveDailyHelpService = async () => {
    if (!dailyHelpForm.category.trim() || !dailyHelpForm.name.trim() || Number(dailyHelpForm.pricePerHour) <= 0) {
      showToast('Category, service name and a valid hourly rate are required.', 'error'); return;
    }
    const payload = { ...dailyHelpForm, pricePerHour: Number(dailyHelpForm.pricePerHour), minHours: Number(dailyHelpForm.minHours), active: Number(dailyHelpForm.active) };
    const saved = editingDailyHelpId
      ? await bazaarApi.updateAdminDailyHelpService(editingDailyHelpId, payload)
      : await bazaarApi.createAdminDailyHelpService(payload);
    if (!saved) { showToast('Unable to save Daily Help service.', 'error'); return; }
    showToast(editingDailyHelpId ? 'Daily Help service updated.' : 'Daily Help service added.', 'success');
    setEditingDailyHelpId(null); resetDailyHelpForm(); await refreshAdminData();
  };

  const editDailyHelpService = (service: any) => {
    setEditingDailyHelpId(service.id);
    setDailyHelpForm({ category: service.category || '', name: service.name || '', description: service.description || '', pricingUnit: service.pricingUnit || 'HOUR', pricePerHour: String(service.pricePerHour ?? ''), minHours: String(service.minHours ?? 1), imageUrl: service.imageUrl || '', active: Number(service.active ?? 1) });
  };

  if (!isRootAdmin) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-6 bg-white rounded-3xl border border-slate-200 shadow-xl my-8">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto shadow-xs">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900">Admin Desk Restricted</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Access to this master control center is restricted exclusively to the root administrator:
            <br />
            <strong className="text-purple-700 font-mono mt-1 block font-bold">{ROOT_ADMIN_EMAIL}</strong>
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => setIsGmailAuthOpen(true)}
            className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            Sign In with Master Admin Gmail
          </button>
        </div>
      </div>
    );
  }

  const pendingSellers = adminSellers.filter(s => String(s.status).toLowerCase() === 'pending');
  const pendingDeliveryAgents = adminDeliveryAgents.filter(a => String(a.status).toLowerCase() === 'pending');
  const approvedSellers = adminSellers.filter(s => String(s.status).toLowerCase() === 'approved');
  const rejectedSellers = adminSellers.filter(s => String(s.status).toLowerCase() === 'rejected');
  const totalGMV = Number(adminAnalytics?.totalGmv || 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Admin Desk Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-purple-100 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            Root Master Admin Panel ({ROOT_ADMIN_EMAIL})
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            KuraliUpdates Marketplace Control
          </h1>
          <p className="text-xs sm:text-sm text-purple-100 mt-1 max-w-xl">
            Authorize new local merchant registrations, audit low price compliance across Kurali, monitor live express orders, and review delivery fleet.
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-white/10 p-3 sm:p-4 rounded-2xl border border-white/10 shrink-0">
          <div className="text-center px-2">
            <span className="text-[10px] text-purple-200 block uppercase font-bold">Total GMV</span>
            <span className="text-lg font-black">₹{totalGMV.toLocaleString()}</span>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-center px-2">
            <span className="text-[10px] text-purple-200 block uppercase font-bold">Approved Stores</span>
            <span className="text-lg font-black">{approvedSellers.length}</span>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-center px-2">
            <span className="text-[10px] text-purple-200 block uppercase font-bold">Active Fleet</span>
            <span className="text-lg font-black">{adminDeliveryAgents.filter(a => String(a.status).toLowerCase() === 'active').length}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveAdminTab('trends')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'trends'
              ? 'bg-purple-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Market Demand & Search Trends
        </button>

        <button
          onClick={() => setActiveAdminTab('approvals')}
          className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'approvals'
              ? 'bg-purple-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Store className="w-4 h-4" /> Pending Merchant Approvals
          {pendingSellers.length > 0 && (
            <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] rounded-full">
              {pendingSellers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveAdminTab('stores')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'stores'
              ? 'bg-purple-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" /> All Active Stores ({approvedSellers.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('buyers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'buyers'
              ? 'bg-purple-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" /> Buyers ({buyers.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('daily-help')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeAdminTab === 'daily-help' ? 'bg-purple-700 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Sparkles className="w-4 h-4" /> Daily Help Services ({dailyHelpServices.length})
        </button>


        <button
          onClick={() => setActiveAdminTab('daily-helpers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeAdminTab === 'daily-helpers' ? 'bg-purple-700 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <UserRoundCheck className="w-4 h-4" /> Daily Help / Helpers ({dailyHelpHelpers.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('fleet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'fleet'
              ? 'bg-purple-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bike className="w-4 h-4" /> Delivery Fleet ({adminDeliveryAgents.length})
        </button>
      </div>


      {activeAdminTab === 'daily-help' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div><h2 className="text-base font-extrabold text-slate-900">Daily Help Services</h2><p className="text-xs text-slate-500 mt-1">Services and hourly rates shown to buyers come only from the database.</p></div>
            <button onClick={() => { setEditingDailyHelpId(null); resetDailyHelpForm(); }} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 text-white text-xs font-bold"><Plus className="w-4 h-4" /> Add Service</button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input value={dailyHelpForm.category} onChange={e => setDailyHelpForm({...dailyHelpForm, category:e.target.value})} placeholder="Category" className="border rounded-xl px-3 py-2.5 text-xs" />
            <input value={dailyHelpForm.name} onChange={e => setDailyHelpForm({...dailyHelpForm, name:e.target.value})} placeholder="Service name" className="border rounded-xl px-3 py-2.5 text-xs" />
            <input value={dailyHelpForm.pricePerHour} onChange={e => setDailyHelpForm({...dailyHelpForm, pricePerHour:e.target.value})} type="number" min="1" placeholder="₹ / hour" className="border rounded-xl px-3 py-2.5 text-xs" />
            <input value={dailyHelpForm.minHours} onChange={e => setDailyHelpForm({...dailyHelpForm, minHours:e.target.value})} type="number" min="1" placeholder="Minimum hours" className="border rounded-xl px-3 py-2.5 text-xs" />
            <input value={dailyHelpForm.description} onChange={e => setDailyHelpForm({...dailyHelpForm, description:e.target.value})} placeholder="Description" className="border rounded-xl px-3 py-2.5 text-xs sm:col-span-2" />
            <input value={dailyHelpForm.imageUrl} onChange={e => setDailyHelpForm({...dailyHelpForm, imageUrl:e.target.value})} placeholder="Image URL (optional)" className="border rounded-xl px-3 py-2.5 text-xs" />
            <label className="flex items-center gap-2 border rounded-xl px-3 py-2.5 text-xs font-bold"><input type="checkbox" checked={dailyHelpForm.active === 1} onChange={e => setDailyHelpForm({...dailyHelpForm, active:e.target.checked ? 1 : 0})} /> Active for buyers</label>
            <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
              <button onClick={saveDailyHelpService} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"><Save className="w-4 h-4" /> {editingDailyHelpId ? 'Update Service' : 'Save Service'}</button>
              {editingDailyHelpId && <button onClick={() => { setEditingDailyHelpId(null); resetDailyHelpForm(); }} className="px-4 py-2.5 rounded-xl border text-xs font-bold">Cancel</button>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dailyHelpServices.map(service => (
              <div key={service.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-4">
                <div><div className="flex items-center gap-2"><h3 className="font-black text-sm">{service.name}</h3><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${service.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{service.active ? 'Active' : 'Inactive'}</span></div><p className="text-[11px] text-slate-500 mt-1">{service.category} · Min {service.minHours} hr</p><p className="text-lg font-black mt-2">₹{service.pricePerHour}<span className="text-[11px] font-medium text-slate-500"> / hour</span></p><p className="text-xs text-slate-500 mt-1">{service.description || 'No description'}</p></div>
                <button onClick={() => editDailyHelpService(service)} className="p-2 rounded-lg border text-slate-600 hover:bg-slate-50" title="Edit"><Pencil className="w-4 h-4" /></button>
              </div>
            ))}
            {dailyHelpServices.length === 0 && <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-500">No Daily Help services in the database. Add the first service above.</div>}
          </div>
        </div>
      )}

      {activeAdminTab === 'daily-helpers' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Daily Help Helpers</h2>
              <p className="text-xs text-slate-500 mt-1">All registered home-service professionals. Availability and verification status are read directly from the database.</p>
            </div>
            <div className="flex gap-2 text-[11px] font-bold">
              <span className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700">Available {dailyHelpHelpers.filter(h => String(h.status).toUpperCase() === 'AVAILABLE').length}</span>
              <span className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600">Offline {dailyHelpHelpers.filter(h => String(h.status).toUpperCase() === 'OFFLINE').length}</span>
              <span className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700">Verified {dailyHelpHelpers.filter(h => h.verified).length}</span>
            </div>
          </div>

          {dailyHelpHelpers.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
              <UserRoundCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-sm text-slate-700">No Daily Help helpers registered yet.</p>
              <p className="text-xs text-slate-500 mt-1">Helpers will appear here after they register for Daily Help.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-[10px] uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3 font-bold">Helper</th>
                      <th className="px-4 py-3 font-bold">Contact</th>
                      <th className="px-4 py-3 font-bold">Locality</th>
                      <th className="px-4 py-3 font-bold">Availability</th>
                      <th className="px-4 py-3 font-bold">Rating</th>
                      <th className="px-4 py-3 font-bold">Verification</th>
                      <th className="px-4 py-3 font-bold">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyHelpHelpers.map(helper => (
                      <tr key={helper.professionalId} className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="font-extrabold text-xs text-slate-900">{helper.fullName}</div>
                          <div className="font-mono text-[10px] text-slate-400 mt-1">{helper.professionalId}</div>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-600">{helper.phone}</td>
                        <td className="px-4 py-4 text-xs text-slate-600">{helper.currentLocality || '—'}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${String(helper.status).toUpperCase() === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {helper.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs font-bold">★ {helper.rating || '0.00'} <span className="text-slate-400 font-normal">({helper.reviewCount || 0})</span></td>
                        <td className="px-4 py-4">
                          {helper.verified ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span> : <span className="text-[10px] font-bold text-rose-600">Not verified</span>}
                        </td>
                        <td className="px-4 py-4 text-[11px] text-slate-500">{helper.registeredAt ? new Date(helper.registeredAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}


      {/* Tab: Trends */}
      {activeAdminTab === 'trends' && <MarketTrendsVisualization analytics={adminAnalytics} searchTrends={adminSearchTrends} loading={adminDataLoading} />}

      {/* Tab: Approvals */}
      {activeAdminTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">
              New Merchant Applications ({pendingSellers.length})
            </h2>
            <p className="text-xs text-slate-500">
              Stores cannot receive orders or display products until approved by root admin.
            </p>
          </div>

          {pendingSellers.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">All Merchant Applications Processed</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No stores are currently waiting for admin authorization in Kurali.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingSellers.map(seller => (
                <div
                  key={seller.sellerId}
                  className="bg-white rounded-3xl border border-amber-300 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={seller.avatarUrl}
                      alt={seller.storeName}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-sm text-slate-900">{seller.name}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {seller.category}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          Pending Verification
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{seller.description}</p>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {seller.address}, {seller.locality}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" /> {seller.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" /> {seller.email}
                        </span>
                        {seller.gstNumber && (
                          <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            GST: {seller.gstNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={() => handleSellerDecision(seller.sellerId, false)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() => handleSellerDecision(seller.sellerId, true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve &amp; Activate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delivery Partner Approvals */}
      {activeAdminTab === 'approvals' && (
        <div className="space-y-4 mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Delivery Partner Applications ({pendingDeliveryAgents.length})</h2>
            <p className="text-xs text-slate-500">Partners remain inactive until approved by root admin.</p>
          </div>
          {pendingDeliveryAgents.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No delivery applications waiting for approval.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingDeliveryAgents.map(agent => (
                <div key={agent.agentId} className="bg-white rounded-3xl border border-emerald-200 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm text-slate-900">{agent.fullName}</h3>
                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                      <span><Phone className="inline w-3.5 h-3.5 mr-1" />{agent.phone}</span>
                      <span><Mail className="inline w-3.5 h-3.5 mr-1" />{agent.email}</span>
                      <span><Bike className="inline w-3.5 h-3.5 mr-1" />{agent.vehicleType} · {agent.vehicleNumber}</span>
                      <span>Licence: {agent.licenseNumber}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleDeliveryDecision(agent.agentId, false)} className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center gap-1.5"><XCircle className="w-4 h-4" /> Reject</button>
                    <button onClick={() => handleDeliveryDecision(agent.agentId, true)} className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Approve &amp; Activate</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: All Active Stores */}
      {activeAdminTab === 'stores' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">
              Verified Marketplace Stores ({approvedSellers.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedSellers.map(seller => {
              const sellerProdCount = products.filter(p => p.sellerId === seller.sellerId).length;
              return (
                <div
                  key={seller.sellerId}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex items-start gap-4"
                >
                  <img
                    src={seller.avatarUrl}
                    alt={seller.storeName}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-extrabold text-sm text-slate-900 truncate">{seller.storeName}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                        Active
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{seller.category} &bull; {seller.locality}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
                      <span>Products Listed: <strong>{sellerProdCount}</strong></span>
                      <span>Rating: <strong>★ {seller.rating}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Buyers */}
      {activeAdminTab === 'buyers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Registered Buyer Accounts ({buyers.length})</h2>
              <p className="text-xs text-slate-500 mt-1">Buyer profiles registered in the Bazaar user database.</p>
            </div>
          </div>
          {buyersLoading ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-xs text-slate-500">Loading buyer accounts...</div>
          ) : buyers.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No buyer accounts found</p>
              <p className="text-xs text-slate-500">New buyer registrations will appear here automatically.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {buyers.map(buyer => (
                <div key={buyer.userId} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm text-slate-900 truncate">{buyer.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 truncate">{buyer.email || buyer.phone || 'No contact details'}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                      {Number(buyer.isVerified) === 1 ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-600">
                    <div><span className="text-slate-400">Phone:</span> <strong>{buyer.phone || '—'}</strong></div>
                    <div><span className="text-slate-400">Locality:</span> <strong>{buyer.locality || '—'}</strong></div>
                    <div><span className="text-slate-400">Address:</span> <strong>{buyer.formattedAddress || buyer.address || '—'}</strong></div>
                    <div><span className="text-slate-400">Registered:</span> <strong>{buyer.createdAt ? new Date(buyer.createdAt).toLocaleString() : '—'}</strong></div>
                    <div><span className="text-slate-400">Last login:</span> <strong>{buyer.lastLogin ? new Date(buyer.lastLogin).toLocaleString() : '—'}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Delivery Fleet */}
      {activeAdminTab === 'fleet' && (
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-slate-900">
            Registered Kurali Express Delivery Fleet ({adminDeliveryAgents.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminDeliveryAgents.map(agent => (
              <div
                key={agent.agentId}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={agent.avatarUrl}
                    alt={agent.fullName}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                  />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{agent.fullName}</h3>
                    <p className="text-[11px] text-slate-500">{agent.phone}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Vehicle</span>
                    <span className="font-bold text-slate-800">{agent.vehicleType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Plate</span>
                    <span className="font-bold font-mono text-slate-800">{agent.vehicleNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Completed Trips</span>
                    <span className="font-bold text-emerald-600">{agent.totalTrips}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Total Earned</span>
                    <span className="font-bold text-slate-900">₹{agent.totalEarnings}</span>
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
