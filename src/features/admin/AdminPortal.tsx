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
  Database,
  RefreshCw,
  Copy,
  Search,
  Settings2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { adminApi } from '../../services/domains/adminApi';
import { MarketTrendsVisualization } from '../../components/Admin/MarketTrendsVisualization';
import { ROOT_ADMIN_EMAIL, isRootAdminEmail } from '../../data/initialData';
import { SellerOnboardingCRM } from '../../components/Admin/SellerOnboardingCRM';
import { SellerRegistrationOtpConfig } from '../../components/Admin/SellerRegistrationOtpConfig';
import { IndiaComplianceSettings } from '../../components/Admin/IndiaComplianceSettings';
import { AdminDirectoryTab } from './AdminDirectoryTab';
import { AdminBuyersTab } from './AdminBuyersTab';
import { AdminOrdersTab } from './AdminOrdersTab';
import { AdminAccountsTab } from './AdminAccountsTab';
import { AdminApprovalsTab } from './AdminApprovalsTab';
import { AdminStoresTab } from './AdminStoresTab';
import { AdminFleetTab } from './AdminFleetTab';
import { createAdminDecisionActions } from './adminDecisionActions';
import { buildAdminDirectoryGroups } from './adminDirectory';
import { useAdminDashboardRefresh } from './useAdminDashboardRefresh';
import { useSellerDocumentReview } from './useSellerDocumentReview';
import { useAdminConfiguration } from './useAdminConfiguration';
import { AdminMfaGate } from './AdminMfaGate';
import { AdminSellerPaymentReview } from '../../components/Admin/AdminSellerPaymentReview';
import { AdminSellerManagement } from '../../components/Admin/AdminSellerManagement';

const AdminDashboardContent: React.FC = () => {
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

  const [activeAdminTab, setActiveAdminTab] = useState<'trends' | 'approvals' | 'stores' | 'fleet' | 'buyers' | 'orders' | 'daily-help' | 'daily-helpers' | 'diagnostics' | 'directory' | 'accounts' | 'delivery-config' | 'seller-area-config' | 'seller-documents' | 'seller-leads' | 'registration-otp-config' | 'india-compliance' | 'seller-payment-review' | 'seller-management'>('trends');
  const [buyers, setBuyers] = useState<any[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<any[]>([]);
  const [buyersLoading, setBuyersLoading] = useState(false);
  const [adminOrders, setAdminOrders] = useState<any[]>([]);

  const [adminSellers, setAdminSellers] = useState<any[]>([]);
  const [pendingSellerApplications, setPendingSellerApplications] = useState<any[]>([]);
  const [adminDeliveryAgents, setAdminDeliveryAgents] = useState<any[]>([]);
  const [adminAnalytics, setAdminAnalytics] = useState<any | null>(null);
  const [adminDataLoading, setAdminDataLoading] = useState(false);
  const [adminSearchTrends, setAdminSearchTrends] = useState<any[]>([]);
  const [dailyHelpServices, setDailyHelpServices] = useState<any[]>([]);
  const [dailyHelpHelpers, setDailyHelpHelpers] = useState<any[]>([]);
  const [diagnostics, setDiagnostics] = useState<any | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);
  const [editingDailyHelpId, setEditingDailyHelpId] = useState<string | null>(null);
  const [updatingHelperId, setUpdatingHelperId] = useState<string | null>(null);
  const [dailyHelpForm, setDailyHelpForm] = useState({ category: '', name: '', description: '', pricingUnit: 'HOUR', pricePerHour: '199', minHours: '1', imageUrl: '', active: 1 });
  const isRootAdmin = isRootAdminEmail(user.email);

  const {
    deliveryConfig,
    setDeliveryConfig,
    deliveryConfigLoading,
    deliveryConfigSaving,
    deliveryConfigError,
    dailyHelpTurnaroundMinutes,
    setDailyHelpTurnaroundMinutes,
    saveDeliveryConfiguration,
    refreshDeliveryConfiguration,
    sellerAreaConfig,
    setSellerAreaConfig,
    sellerAreaLoading,
    sellerAreaSaving,
    sellerAreaError,
    saveSellerAreaConfiguration,
    refreshSellerAreaConfiguration,
  } = useAdminConfiguration(activeAdminTab, isRootAdmin, showToast);

  const refreshAdminData = useAdminDashboardRefresh({
    isRootAdmin,
    setAdminDataLoading,
    setAdminSellers,
    setPendingSellerApplications,
    setAdminDeliveryAgents,
    setAdminAnalytics,
    setBuyers,
    setAdminOrders,
    setAdminSearchTrends,
    setDailyHelpServices,
    setDailyHelpHelpers,
    setAdminAccounts,
    setBuyersLoading,
  });

  const adminDecisionActions = createAdminDecisionActions({ api: adminApi, ui: { toast: showToast }, refreshAdminData });


  const {
    documentSellerId,
    sellerDocuments,
    sellerDocumentsLoading,
    sellerDocumentAction,
    sellerDocumentError,
    documentRejectionReasons,
    setDocumentRejectionReasons,
    loadSellerDocuments,
    openSellerDocument,
    scanSellerDocument,
    reviewSellerDocument,
  } = useSellerDocumentReview(showToast);

  const refreshDiagnostics = async () => {
    if (!isRootAdmin) return;
    setDiagnosticsLoading(true);
    setDiagnosticsError(null);
    try {
      const result = await adminApi.getAdminDiagnostics();
      setDiagnostics(result);
    } catch (error: any) {
      setDiagnosticsError(error?.message || 'Could not load database diagnostics.');
      setDiagnostics(null);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  useEffect(() => {
    if (isRootAdmin && activeAdminTab === 'diagnostics') void refreshDiagnostics();
  }, [activeAdminTab, isRootAdmin]);





  const resetDailyHelpForm = () => setDailyHelpForm({ category: '', name: '', description: '', pricingUnit: 'HOUR', pricePerHour: '199', minHours: '1', imageUrl: '', active: 1 });

  const saveDailyHelpService = async () => {
    if (!dailyHelpForm.category.trim() || !dailyHelpForm.name.trim() || Number(dailyHelpForm.pricePerHour) <= 0) {
      showToast('Category, service name and a valid hourly rate are required.', 'error'); return;
    }
    const payload = {
      ...dailyHelpForm,
      category: dailyHelpForm.category.trim(),
      name: dailyHelpForm.name.trim(),
      pricingUnit: dailyHelpForm.pricingUnit.trim().toUpperCase(),
      pricePerHour: Number(dailyHelpForm.pricePerHour),
      minHours: Number(dailyHelpForm.minHours),
      active: Number(dailyHelpForm.active),
    };
    try {
      const saved = editingDailyHelpId
        ? await adminApi.updateAdminDailyHelpService(editingDailyHelpId, payload)
        : await adminApi.createAdminDailyHelpService(payload);
      if (!saved) { showToast('Unable to save Daily Help service.', 'error'); return; }
      showToast(editingDailyHelpId ? 'Daily Help service updated.' : 'Daily Help service added.', 'success');
      setEditingDailyHelpId(null);
      resetDailyHelpForm();
      await refreshAdminData();
    } catch (err: any) {
      showToast(err?.message || 'Unable to save Daily Help service.', 'error');
    }
  };

  const editDailyHelpService = (service: any) => {
    setEditingDailyHelpId(service.serviceId || service.id);
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

  const pendingSellers = pendingSellerApplications;
  const pendingDeliveryAgents = adminDeliveryAgents.filter(a => String(a.status).toLowerCase() === 'pending');
  const approvedSellers = adminSellers.filter(s => String(s.status).toLowerCase() === 'approved');
  const rejectedSellers = adminSellers.filter(s => String(s.status).toLowerCase() === 'rejected');
  const totalGMV = Number(adminAnalytics?.totalGmv || 0);

  const directoryGroups = buildAdminDirectoryGroups({
    rootAdminEmail: ROOT_ADMIN_EMAIL,
    buyers,
    sellers: adminSellers,
    deliveryAgents: adminDeliveryAgents,
    dailyHelpHelpers,
    products,
    dailyHelpServices,
  });
  const copyDirectoryValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast('ID copied to clipboard.', 'success');
    } catch {
      showToast('Could not copy automatically. Select and copy the ID manually.', 'error');
    }
  };

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

      {/* Grouped admin navigation */}
      <nav aria-label="Admin sections" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <details open={['seller-management','seller-area-config','seller-documents','seller-leads','registration-otp-config','india-compliance','seller-payment-review'].includes(activeAdminTab)} className="group rounded-2xl border border-teal-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 hover:bg-teal-50 [&::-webkit-details-marker]:hidden"><span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Store className="h-5 w-5"/></span><span><span className="block text-sm font-extrabold text-slate-900">Seller Management</span><span className="mt-0.5 block text-[11px] text-slate-500">Applications, profiles, documents and payments</span></span></span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{adminSellers.length} sellers</span></summary>
          <div className="space-y-1 border-t border-slate-100 p-2">
            <button onClick={()=>setActiveAdminTab('seller-management')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab==='seller-management'?'bg-teal-50 text-teal-800':'text-slate-600 hover:bg-slate-50'}`}>Seller applications & all sellers</button>
            <button onClick={()=>setActiveAdminTab('seller-documents')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab==='seller-documents'?'bg-teal-50 text-teal-800':'text-slate-600 hover:bg-slate-50'}`}>Seller document review</button>
            <button onClick={()=>setActiveAdminTab('seller-area-config')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab==='seller-area-config'?'bg-teal-50 text-teal-800':'text-slate-600 hover:bg-slate-50'}`}>Seller registration radius</button>
            <button onClick={()=>setActiveAdminTab('seller-leads')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab==='seller-leads'?'bg-teal-50 text-teal-800':'text-slate-600 hover:bg-slate-50'}`}>Merchant onboarding CRM</button>
            <button onClick={()=>setActiveAdminTab('registration-otp-config')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab==='registration-otp-config'?'bg-teal-50 text-teal-800':'text-slate-600 hover:bg-slate-50'}`}>Seller registration OTP controls</button>
            <button onClick={()=>setActiveAdminTab('india-compliance')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab==='india-compliance'?'bg-teal-50 text-teal-800':'text-slate-600 hover:bg-slate-50'}`}>Seller compliance settings</button>
            <button onClick={()=>setActiveAdminTab('seller-payment-review')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab==='seller-payment-review'?'bg-teal-50 text-teal-800':'text-slate-600 hover:bg-slate-50'}`}>Seller payment methods & UPI verification</button>
          </div>
        </details>
        <details open={['approvals', 'stores', 'buyers'].includes(activeAdminTab)} className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Store className="h-5 w-5" /></span>
              <span><span className="block text-sm font-extrabold text-slate-900">Marketplace & Merchants</span><span className="mt-0.5 block text-[11px] text-slate-500">Approvals, stores and buyers</span></span>
            </span>
            <span className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{pendingSellers.length} pending</span><span className="text-slate-400 transition-transform group-open:rotate-180">⌄</span></span>
          </summary>
          <div className="space-y-1 border-t border-slate-100 p-2">
            <button onClick={() => setActiveAdminTab('approvals')} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab === 'approvals' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-50'}`}><span>Pending merchant approvals</span>{pendingSellers.length > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] text-white">{pendingSellers.length}</span>}</button>
            <button onClick={() => setActiveAdminTab('stores')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab === 'stores' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-50'}`}>All active stores <span className="ml-1 text-slate-400">({approvedSellers.length})</span></button>
            <button onClick={() => setActiveAdminTab('buyers')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab === 'buyers' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-50'}`}>Buyers <span className="ml-1 text-slate-400">({buyers.length})</span></button>
            <button onClick={() => setActiveAdminTab('orders')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab === 'orders' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-50'}`}>Orders <span className="ml-1 text-slate-400">({adminOrders.length})</span></button>
          </div>
        </details>

        <details open={['fleet', 'delivery-config'].includes(activeAdminTab)} className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Bike className="h-5 w-5" /></span><span><span className="block text-sm font-extrabold text-slate-900">Delivery & Fulfilment</span><span className="mt-0.5 block text-[11px] text-slate-500">Fleet, live operations and payouts</span></span></span>
            <span className="text-slate-400 transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="space-y-1 border-t border-slate-100 p-2">
            <button onClick={() => setActiveAdminTab('fleet')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab === 'fleet' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-50'}`}>Delivery fleet <span className="ml-1 text-slate-400">({adminDeliveryAgents.length})</span></button>
            <button onClick={() => setActiveAdminTab('delivery-config')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab === 'delivery-config' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-50'}`}>Delivery charges & payouts</button>
          </div>
        </details>

        <details open={['daily-help', 'daily-helpers'].includes(activeAdminTab)} className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Sparkles className="h-5 w-5" /></span><span><span className="block text-sm font-extrabold text-slate-900">Daily Help Operations</span><span className="mt-0.5 block text-[11px] text-slate-500">Providers and service catalogue</span></span></span>
            <span className="text-slate-400 transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="space-y-1 border-t border-slate-100 p-2">
            <button onClick={() => setActiveAdminTab('daily-helpers')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab === 'daily-helpers' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-50'}`}>Daily Help helpers <span className="ml-1 text-slate-400">({dailyHelpHelpers.length})</span></button>
            <button onClick={() => setActiveAdminTab('daily-help')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab === 'daily-help' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-50'}`}>Daily Help services <span className="ml-1 text-slate-400">({dailyHelpServices.length})</span></button>
          </div>
        </details>

        <details open={activeAdminTab === 'trends'} className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700"><TrendingUp className="h-5 w-5" /></span><span><span className="block text-sm font-extrabold text-slate-900">Business Intelligence</span><span className="mt-0.5 block text-[11px] text-slate-500">Demand signals and search trends</span></span></span>
            <span className="text-slate-400 transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="border-t border-slate-100 p-2">
            <button onClick={() => setActiveAdminTab('trends')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab === 'trends' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-50'}`}>Market demand & search trends</button>
          </div>
        </details>

        <details open={['accounts', 'directory', 'diagnostics', 'seller-payment-review'].includes(activeAdminTab)} className="group rounded-2xl border border-slate-200 bg-white shadow-sm sm:col-span-2 xl:col-span-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><ShieldCheck className="h-5 w-5" /></span><span><span className="block text-sm font-extrabold text-slate-900">Administration & System</span><span className="mt-0.5 block text-[11px] text-slate-500">Access control, identity and health</span></span></span>
            <span className="text-slate-400 transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="space-y-1 border-t border-slate-100 p-2">
            <button onClick={() => setActiveAdminTab('accounts')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab === 'accounts' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-50'}`}>Accounts & permissions <span className="ml-1 text-slate-400">({adminAccounts.length})</span></button>
            <button onClick={() => setActiveAdminTab('directory')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab === 'directory' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-50'}`}>User & role IDs <span className="ml-1 text-slate-400">({directoryGroups.length})</span></button>
            <button onClick={() => setActiveAdminTab('diagnostics')} className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeAdminTab === 'diagnostics' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-50'}`}>Diagnostics</button>
          </div>
        </details>
      </nav>

      {activeAdminTab === 'seller-management' && <AdminSellerManagement />}
      {activeAdminTab === 'directory' && <AdminDirectoryTab groups={directoryGroups} onCopy={copyDirectoryValue} />}

      {activeAdminTab === 'seller-documents' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Seller document review</h2>
            <p className="mt-1 text-xs text-slate-500">Open private seller uploads, verify evidence or reject with a clear correction reason. This review alone does not approve the seller profile.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <label className="block text-xs font-bold text-slate-700">Seller account
              <select value={documentSellerId} onChange={event=>void loadSellerDocuments(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
                <option value="">Select a seller</option>
                {adminSellers.map((seller:any)=><option key={seller.sellerId} value={seller.sellerId}>{seller.storeName || seller.name || seller.sellerId} · {seller.email || seller.sellerId}</option>)}
              </select>
            </label>
            {sellerDocumentError && <div role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{sellerDocumentError}</div>}
            {sellerDocumentsLoading ? <p className="mt-4 text-sm text-slate-500">Loading documents…</p> : documentSellerId && sellerDocuments.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No documents have been uploaded for this seller.</p> : (
              <div className="mt-4 space-y-3">
                {sellerDocuments.map((doc:any)=>(
                  <div key={doc.documentId} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="text-sm font-bold text-slate-900">{String(doc.documentType || '').replaceAll('_',' ')}</p><p className="mt-1 text-xs text-slate-500">{doc.fileName} · {Math.ceil(Number(doc.fileSize || 0)/1024)} KB</p><p className="mt-1 text-[10px] text-slate-400">Uploaded: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : '—'}</p><p className="mt-1 text-[10px] font-bold">Malware scan: {doc.scanStatus || 'QUARANTINED'}</p></div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${doc.verificationStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : doc.verificationStatus === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{doc.verificationStatus || 'PENDING'}</span>
                    </div>
                    {doc.rejectionReason && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-800">Correction reason: {doc.rejectionReason}</p>}
                    {doc.scanStatus !== 'CLEAN' && <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-amber-50 p-2"><p className="text-xs text-amber-900">Document is quarantined until a clean scan result is recorded.</p><button type="button" onClick={()=>void scanSellerDocument(doc.documentId)} disabled={sellerDocumentAction===doc.documentId} className="min-h-9 rounded-lg bg-amber-700 px-3 text-xs font-bold text-white disabled:opacity-50">{sellerDocumentAction===doc.documentId?'Scanning…':'Retry scan'}</button></div>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={()=>void openSellerDocument(doc.documentId)} disabled={sellerDocumentAction===doc.documentId || doc.scanStatus!=='CLEAN'} className="min-h-10 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 disabled:opacity-50">{sellerDocumentAction===doc.documentId?'Opening…':'View / download'}</button>
                      <button type="button" onClick={()=>void reviewSellerDocument(doc.documentId,'VERIFIED')} disabled={sellerDocumentAction===doc.documentId || doc.verificationStatus==='VERIFIED' || doc.scanStatus!=='CLEAN'} className="min-h-10 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white disabled:opacity-40">Verify</button>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input value={documentRejectionReasons[doc.documentId] || ''} onChange={event=>setDocumentRejectionReasons(current=>({...current,[doc.documentId]:event.target.value}))} placeholder="Specific correction reason (required to reject)" className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-xs"/>
                      <button type="button" onClick={()=>void reviewSellerDocument(doc.documentId,'REJECTED')} disabled={sellerDocumentAction===doc.documentId} className="min-h-10 rounded-lg border border-rose-300 bg-rose-50 px-3 text-xs font-bold text-rose-800 disabled:opacity-40">Reject document</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeAdminTab === 'seller-leads' && <SellerOnboardingCRM />}
      {activeAdminTab === 'registration-otp-config' && <SellerRegistrationOtpConfig />}
      {activeAdminTab === 'india-compliance' && <IndiaComplianceSettings />}
      {activeAdminTab === 'seller-payment-review' && <AdminSellerPaymentReview />}
      {activeAdminTab === 'seller-area-config' && (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Seller registration service area</h2>
              <p className="mt-1 text-xs text-slate-500">Controls which shops may register. This is separate from the grocery delivery radius and does not alter existing sellers automatically.</p>
            </div>
            <button type="button" onClick={() => void refreshSellerAreaConfiguration()} disabled={sellerAreaLoading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${sellerAreaLoading ? 'animate-spin' : ''}`}/>Refresh settings</button>
          </div>
          {sellerAreaError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{sellerAreaError}</div>}
          {sellerAreaLoading && !sellerAreaConfig ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading seller registration settings…</div> : sellerAreaConfig && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-bold text-slate-700">Centre latitude<input type="number" step="0.0000001" value={sellerAreaConfig.centerLatitude} onChange={event=>setSellerAreaConfig((current:any)=>({...current,centerLatitude:event.target.value}))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label>
                <label className="space-y-1 text-xs font-bold text-slate-700">Centre longitude<input type="number" step="0.0000001" value={sellerAreaConfig.centerLongitude} onChange={event=>setSellerAreaConfig((current:any)=>({...current,centerLongitude:event.target.value}))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label>
                <label className="space-y-1 text-xs font-bold text-slate-700">Seller registration radius (km)<input type="number" min="0.1" max="100" step="0.1" value={sellerAreaConfig.radiusKm} onChange={event=>setSellerAreaConfig((current:any)=>({...current,radiusKm:event.target.value}))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700"><input type="checkbox" checked={Boolean(sellerAreaConfig.enabled)} onChange={event=>setSellerAreaConfig((current:any)=>({...current,enabled:event.target.checked}))} className="h-4 w-4"/>Enable seller registration within this radius</label>
              </div>
              <div className="mt-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-900">Initial setting: 5 km around Kurali. Confirm the operational centre on the map before changing or enabling public seller onboarding. Current configuration version: {sellerAreaConfig.version ?? '—'}.</div>
              <div className="mt-5 flex justify-end"><button type="button" onClick={saveSellerAreaConfiguration} disabled={sellerAreaSaving || sellerAreaLoading} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-black text-white disabled:opacity-50"><Save className="h-4 w-4"/>{sellerAreaSaving ? 'Saving…' : 'Save seller area settings'}</button></div>
            </div>
          )}
        </div>
      )}

      {activeAdminTab === 'delivery-config' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Delivery, Payout & OTP Settings</h2>
              <p className="text-xs text-slate-500 mt-1">Changes apply to future checkouts and new OTP requests. The buyer ETA is snapshotted on new delivery orders; existing orders keep their original estimate.</p>
            </div>
            <button type="button" onClick={() => void refreshDeliveryConfiguration()} disabled={deliveryConfigLoading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${deliveryConfigLoading ? 'animate-spin' : ''}`} /> Refresh settings
            </button>
          </div>
          {deliveryConfigError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{deliveryConfigError}</div>}
          {deliveryConfigLoading && !deliveryConfig ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading delivery settings…</div> : deliveryConfig && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {([
                  ['customerBaseFee', 'Customer base delivery fee (₹)', 0, 10000, 1],
                  ['customerPerKmFee', 'Customer fee per km (₹)', 0, 1000, 1],
                  ['riderBasePayout', 'Rider base payout (₹)', 0, 10000, 1],
                  ['riderPerKmPayout', 'Rider payout per km (₹)', 0, 1000, 1],
                  ['nearbyRadiusKm', 'Nearby seller radius (km)', 0.5, 50, 0.5],
                  ['maxRouteKm', 'Maximum combined route (km)', 1, 100, 0.5],
                  ['maxSellersPerBatch', 'Maximum sellers per batch', 1, 10, 1],
                  ['maxWaitMinutes', 'Maximum wait (minutes)', 0, 120, 1],
                  ['otpResendTimeoutSeconds', 'OTP resend timeout (seconds)', 5, 300, 1],
                  ['estimatedDeliveryMins', 'Buyer delivery ETA (minutes; 0 disables)', 0, 360, 5],
                ] as [string, string, number, number, number][]).map(([key, label, min, max, step]) => (
                  <label key={key} className="block rounded-xl border border-slate-200 bg-white p-4">
                    <span className="block text-xs font-bold text-slate-700 mb-2">{label}</span>
                    <input type="number" min={min} max={max} step={step} value={deliveryConfig[key]} onChange={event => setDeliveryConfig((current: any) => ({ ...current, [key]: event.target.value === '' ? '' : Number(event.target.value) }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-purple-500 focus:outline-none" />
                  </label>
                ))}
              </div>

              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="text-sm font-extrabold text-amber-950">Daily Help booking buffer</h3>
                <p className="mt-1 text-xs text-amber-900">Minimum turnaround time before and after each booking for the same helper. Applies to new bookings immediately.</p>
                <label className="mt-3 block max-w-xs text-xs font-bold text-slate-700">Turnaround buffer (minutes)
                  <input type="number" min={0} max={120} step={5} value={dailyHelpTurnaroundMinutes} onChange={event => setDailyHelpTurnaroundMinutes(event.target.value === '' ? 15 : Number(event.target.value))} className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold" />
                </label>
                <p className="mt-2 text-[11px] text-amber-900">Allowed range: 0–120 minutes. Default: 15 minutes. Save using the Save settings button below.</p>
              </section>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {([
                  ['batchEnabled', 'Enable combined rider delivery', 'Eligible multi-seller orders can be claimed as one trip.'],
                  ['flexibleFallback', 'Allow separate-job fallback', 'Keep individual rider jobs available when combined routing is unavailable.'],
                  ['storePickupEnabled', 'Enable store pickup', 'Allow buyers to collect orders directly from sellers.'],
                ] as [string, string, string][]).map(([key, label, description]) => (
                  <label key={key} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 cursor-pointer">
                    <input type="checkbox" checked={Boolean(deliveryConfig[key])} onChange={event => setDeliveryConfig((current: any) => ({ ...current, [key]: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-purple-700" />
                    <span><span className="block text-xs font-extrabold text-slate-800">{label}</span><span className="block text-[11px] text-slate-500 mt-1">{description}</span></span>
                  </label>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-slate-50 p-4">
                <p className="text-[11px] text-slate-500">Buyer ETA is optional (0 disables it; otherwise 5–360 minutes in 5-minute steps) and is saved on new delivery orders. OTP resend timeout applies to login and registration; OTP validity remains 10 minutes.</p>
                <button type="button" onClick={() => void saveDeliveryConfiguration()} disabled={deliveryConfigSaving || deliveryConfigLoading} className="rounded-xl bg-purple-700 px-5 py-3 text-xs font-extrabold text-white hover:bg-purple-800 disabled:opacity-50">{deliveryConfigSaving ? 'Saving…' : 'Save settings'}</button>
              </div>
            </>
          )}
        </div>
      )}

      {activeAdminTab === 'diagnostics' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Database Diagnostics</h2>
              <p className="text-xs text-slate-500 mt-1">Read-only checks using the application's Oracle connection. No records are modified.</p>
            </div>
            <button onClick={() => void refreshDiagnostics()} disabled={diagnosticsLoading} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 text-white text-xs font-bold disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${diagnosticsLoading ? 'animate-spin' : ''}`} /> Refresh checks
            </button>
          </div>

          {diagnosticsError && (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <strong>Diagnostics unavailable.</strong> {diagnosticsError}
              <p className="text-xs mt-1">Confirm you are signed in with a valid admin session, then refresh.</p>
            </div>
          )}
          {diagnosticsLoading && !diagnostics && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Reading database diagnostics…</div>
          )}

          {diagnostics && (
            <>
              <div className={`rounded-2xl border p-4 flex items-start gap-3 ${diagnostics.database?.status === 'UP' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                {diagnostics.database?.status === 'UP' ? <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5" />}
                <div>
                  <p className="text-sm font-extrabold text-slate-900">Database: {diagnostics.database?.status || 'UNKNOWN'}</p>
                  <p className="text-xs text-slate-600 mt-1">Connected schema: {diagnostics.database?.schema || 'Unknown'} · Checked: {diagnostics.checkedAt ? new Date(diagnostics.checkedAt).toLocaleString() : 'Unknown'}</p>
                  <p className="text-xs text-slate-500 mt-1">Response is read-only; it does not run cleanup or repair migrations.</p>
                </div>
              </div>

              <div className={`rounded-2xl border p-4 ${diagnostics.migrations?.v13Status === 'SUCCESS' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex items-start gap-3">
                  {diagnostics.migrations?.v13Status === 'SUCCESS' ? <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5" />}
                  <div className="flex-1">
                    <p className="text-sm font-extrabold text-slate-900">Staging reset migration (V13): {diagnostics.migrations?.v13Status || 'UNKNOWN'}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {diagnostics.migrations?.v13Status === 'SUCCESS'
                        ? 'Flyway records V13 as successful. Review the counts below; migration success alone does not prove every table is empty.'
                        : 'Reset completion is not confirmed. Do not run V13 again from this screen; investigate the migration history before any cleanup.'}
                    </p>
                    {diagnostics.migrations?.historyStatus !== 'OK' && <p className="text-xs font-bold text-amber-800 mt-1">Flyway history could not be read.</p>}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-extrabold text-slate-900 mb-2">Table row counts</h3>
                <p className="text-xs text-slate-500 mb-3">Admin accounts and the Daily Help service catalogue may intentionally remain after a staging reset.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(diagnostics.tableCounts || {}).map(([key, value]: [string, any]) => (
                    <div key={key} className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-600">{key.replace(/([A-Z])/g, ' $1').replace(/^./, t => t.toUpperCase())}</span>
                      <span className={`text-sm font-black ${value.status === 'OK' ? 'text-slate-900' : 'text-rose-700'}`}>
                        {value.status === 'OK' ? Number(value.count).toLocaleString() : 'Unavailable'}
                      </span>
                    </div>
                  ))}
                </div>
                {Array.isArray(diagnostics.tableCountErrors) && diagnostics.tableCountErrors.length > 0 && (
                  <p className="text-xs text-rose-700 mt-3">Some table counts could not be read: {diagnostics.tableCountErrors.join(', ')}. Treat overall reset verification as incomplete.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-extrabold text-slate-900 mb-2">Latest Flyway migrations</h3>
                {diagnostics.migrations?.latest?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead><tr className="border-b text-slate-500"><th className="py-2 pr-3">Version</th><th className="py-2 pr-3">Migration</th><th className="py-2 pr-3">Result</th><th className="py-2">Installed</th></tr></thead>
                      <tbody>
                        {diagnostics.migrations.latest.map((item: any, index: number) => (
                          <tr key={`${item.version || 'repeat'}-${index}`} className="border-b last:border-0">
                            <td className="py-2 pr-3">{item.version || '—'}</td>
                            <td className="py-2 pr-3">{item.description || '—'}</td>
                            <td className={`py-2 pr-3 font-bold ${item.success ? 'text-emerald-700' : 'text-rose-700'}`}>{item.success ? 'Success' : 'Failed'}</td>
                            <td className="py-2 whitespace-nowrap">{item.installedOn ? new Date(item.installedOn).toLocaleString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-xs text-slate-500">Flyway history is unavailable.</p>}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                Signed-in admin account record: <strong>{diagnostics.identityCheck?.currentAdminAccountPresent === true ? 'Present (expected for admin access)' : diagnostics.identityCheck?.currentAdminAccountPresent === false ? 'Not found' : 'Unknown'}</strong>. The diagnostic intentionally does not show the account email or any personal record values.
              </div>
            </>
          )}
        </div>
      )}

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
              <span className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700">Available {dailyHelpHelpers.filter(h => Boolean(h.verified) && String(h.status).toUpperCase() === 'AVAILABLE').length}</span>
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
                          <div className="flex flex-col items-start gap-2">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${String(helper.status).toUpperCase() === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{helper.status}</span>
                            <button type="button" disabled={updatingHelperId === helper.professionalId || (!helper.verified && String(helper.status).toUpperCase() !== 'AVAILABLE')}
                              onClick={async () => {
                                const nextStatus = String(helper.status).toUpperCase() === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
                                setUpdatingHelperId(helper.professionalId);
                                try {
                                  const updated = await adminApi.updateAdminDailyHelpProfessionalAvailability(helper.professionalId, nextStatus, helper.currentLocality);
                                  if (!updated) throw new Error('The server rejected this availability change. Confirm the admin role is authorized for this action.');
                                  showToast(nextStatus === 'AVAILABLE' ? 'Daily Help professional is now available.' : 'Daily Help professional is now offline.', 'success');
                                  await refreshAdminData();
                                } catch (error: any) {
                                  showToast(error?.message || 'Unable to change Daily Help availability.', 'error');
                                } finally { setUpdatingHelperId(null); }
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-700 disabled:opacity-50">
                              {updatingHelperId === helper.professionalId ? 'Updating…' : !helper.verified && String(helper.status).toUpperCase() !== 'AVAILABLE' ? 'Verify before availability' : String(helper.status).toUpperCase() === 'AVAILABLE' ? 'Set offline' : 'Set available'}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs font-bold">★ {helper.rating || '0.00'} <span className="text-slate-400 font-normal">({helper.reviewCount || 0})</span></td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-start gap-2">
                            {helper.verified ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span> : <span className="text-[10px] font-bold text-rose-600">Not verified</span>}
                            <button type="button" disabled={updatingHelperId === helper.professionalId}
                              onClick={async () => {
                                const nextVerified = !Boolean(helper.verified);
                                if (!nextVerified && !window.confirm('Revoke verification? This will set the professional offline.')) return;
                                setUpdatingHelperId(helper.professionalId);
                                try {
                                  await adminApi.updateAdminDailyHelpProfessionalVerification(helper.professionalId, nextVerified);
                                  showToast(nextVerified ? 'Daily Help professional verified.' : 'Verification revoked; professional set offline.', 'success');
                                  await refreshAdminData();
                                } catch (error: any) {
                                  showToast(error?.message || 'Unable to update Daily Help verification.', 'error');
                                } finally { setUpdatingHelperId(null); }
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-700 disabled:opacity-50">
                              {updatingHelperId === helper.professionalId ? 'Updating…' : helper.verified ? 'Revoke verification' : 'Approve professional'}
                            </button>
                          </div>
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

      {activeAdminTab === 'approvals' && <AdminApprovalsTab pendingSellerApplications={pendingSellerApplications} adminDeliveryAgents={adminDeliveryAgents} onSellerDecision={adminDecisionActions.handleSellerDecision} onDeliveryDecision={adminDecisionActions.handleDeliveryDecision} />}

      {activeAdminTab === 'stores' && <AdminStoresTab adminSellers={adminSellers} products={products} />}

      {activeAdminTab === 'accounts' && <AdminAccountsTab adminAccounts={adminAccounts} userEmail={user.email} showToast={showToast} refreshAdminData={refreshAdminData} />}

      {/* Tab: Buyers */}
      {activeAdminTab === 'buyers' && (
        <AdminBuyersTab
          buyers={buyers}
          buyersLoading={buyersLoading}
          setBuyers={setBuyers}
          showToast={showToast}
        />
      )}

      {/* Tab: Orders */}
      {activeAdminTab === 'orders' && (
        <AdminOrdersTab adminOrders={adminOrders} setAdminOrders={setAdminOrders} showToast={showToast} />
      )}

      {activeAdminTab === 'fleet' && <AdminFleetTab adminDeliveryAgents={adminDeliveryAgents} />}
    </div>
  );
};

export const AdminDashboard: React.FC = () => (
  <AdminMfaGate>
    <AdminDashboardContent />
  </AdminMfaGate>
);
