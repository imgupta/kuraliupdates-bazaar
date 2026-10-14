import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { SellerDashboard as SellerPortal } from './features/seller/SellerPortal';
import { DeliveryDashboard as DeliveryPortal } from './features/delivery/DeliveryPortal';
import { DailyHelpProfessionalDashboard as DailyHelpPortal } from './features/daily-help/DailyHelpPortal';
import { AdminDashboard as AdminPortal } from './features/admin/AdminPortal';
import { AuthPageV2 } from './components/Auth/AuthPageV2';
import { BuyerRegistrationPage } from './components/Auth/BuyerRegistrationPage';
import { BuyerAccountPage } from './components/Buyer/BuyerAccountPage';
import { BuyerPortal } from './features/buyer/BuyerPortal';
import { resolvePortalRoute } from './app/routing/routeConfig';
import { authorizeRoleRoute } from './app/routing/roleRouteAccess';
import {
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { role, toast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-slate-50 flex flex-col text-slate-900 font-sans">
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {role === 'buyer' && (
          <BuyerPortal
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />
        )}
        {role === 'seller' && <SellerPortal />}
        {role === 'delivery' && <DeliveryPortal />}
        {role === 'professional' && <DailyHelpPortal />}
        {role === 'admin' && <AdminPortal />}
      </main>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-amber-400 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <footer className="mt-auto border-t border-slate-200 bg-white py-3 text-center text-[11px] text-slate-500">
        &copy; 2026 kuraliupdates.com
      </footer>
    </div>
  );
};

const AccessDenied: React.FC = () => (
  <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
    <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-lg font-black text-slate-900">Portal access restricted</h1>
      <p className="mt-2 text-sm text-slate-600">
        This account is not authorized for that portal. Sign in with an account that has the required role.
      </p>
      <a href="/" className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
        Return to home
      </a>
    </section>
  </main>
);

const RootNavigation: React.FC = () => {
  const { user, role, setRole, registeredRoles } = useApp();
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const configuredPortalRole = import.meta.env.VITE_PORTAL as string | undefined;
  const isPortalScopedBuild = ['buyer', 'seller', 'delivery', 'professional', 'admin'].includes(configuredPortalRole ?? '');
  const route = resolvePortalRoute(pathname, isPortalScopedBuild ? configuredPortalRole : undefined);
  const dashboardRole = route.kind === 'role-dashboard' ? route.role : null;
  const dashboardAccess = dashboardRole
    ? isPortalScopedBuild && dashboardRole !== configuredPortalRole
      ? { allowed: false, reason: 'portal-mismatch' as const }
      : authorizeRoleRoute(dashboardRole, {
          isSignedIn: user.isSignedIn,
          registeredRoles,
          isAdmin: Boolean(user.isAdmin),
        })
    : null;

  useEffect(() => {
    const syncPathname = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', syncPathname);
    return () => window.removeEventListener('popstate', syncPathname);
  }, []);

  useEffect(() => {
    if (dashboardRole && dashboardAccess?.allowed && role !== dashboardRole) {
      setRole(dashboardRole);
    }
  }, [dashboardRole, dashboardAccess?.allowed, role, setRole]);

  switch (route.kind) {
    case 'register':
      return <AuthPageV2 registrationRole={route.role} />;
    case 'register-buyer':
      return <BuyerRegistrationPage />;
    case 'account':
      return user.isSignedIn ? <BuyerAccountPage /> : <AuthPageV2 />;
    case 'role-dashboard':
      if (dashboardAccess?.allowed) return <MainLayout />;
      if (dashboardAccess?.reason === 'authentication-required') return <AuthPageV2 />;
      return <AccessDenied />;
    case 'home':
    default:
      return user.isSignedIn ? <MainLayout /> : <AuthPageV2 />;
  }
};

export default function App() {
  return (
    <AppProvider>
      <RootNavigation />
    </AppProvider>
  );
}
