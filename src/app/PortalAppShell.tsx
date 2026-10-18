import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import { AuthPageV2 } from '../components/Auth/AuthPageV2';
import { BuyerRegistrationPage } from '../components/Auth/BuyerRegistrationPage';
import { BuyerAccountPage } from '../components/Buyer/BuyerAccountPage';
import { resolvePortalRoute } from './routing/routeConfig';
import { buildPortalRedirectUrl } from './routing/portalRedirect';
import { authorizeRoleRoute } from './routing/roleRouteAccess';
import type { UserRole } from '../types';

const PORTAL_URLS: Partial<Record<UserRole, string | undefined>> = {
  buyer: import.meta.env.VITE_BUYER_PORTAL_URL,
  seller: import.meta.env.VITE_SELLER_PORTAL_URL,
  delivery: import.meta.env.VITE_DELIVERY_PORTAL_URL,
  professional: import.meta.env.VITE_DAILY_HELP_PORTAL_URL,
  admin: import.meta.env.VITE_ADMIN_PORTAL_URL,
};
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export interface PortalAppShellProps {
  portalRole?: UserRole;
  Dashboard: React.ComponentType<any>;
}

const MainLayout: React.FC<{ Dashboard: React.ComponentType<any> }> = ({ Dashboard }) => {
  const { role, toast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-slate-50 flex flex-col text-slate-900 font-sans">
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Dashboard role={role} searchQuery={searchQuery} setSearchQuery={setSearchQuery} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
      </main>
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5">
          <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold ${toast.type === 'success' ? 'bg-emerald-900 text-white border-emerald-700' : toast.type === 'error' ? 'bg-rose-900 text-white border-rose-700' : 'bg-slate-900 text-white border-slate-700'}`}>
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-amber-400 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
      <footer className="mt-auto border-t border-slate-200 bg-white py-3 text-center text-[11px] text-slate-500">&copy; 2026 kuraliupdates.com</footer>
    </div>
  );
};

const AccessDenied: React.FC = () => (
  <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
    <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-lg font-black text-slate-900">Portal access restricted</h1>
      <p className="mt-2 text-sm text-slate-600">This account is not authorized for that portal. Sign in with an account that has the required role.</p>
      <a href="/" className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Return to home</a>
    </section>
  </main>
);

const RootNavigation: React.FC<PortalAppShellProps> = ({ portalRole, Dashboard }) => {
  const { user, role, setRole, registeredRoles, authInitializing } = useApp();
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const route = resolvePortalRoute(pathname, portalRole);
  const dashboardRole = route.kind === 'role-dashboard' ? route.role : null;
  const dashboardAccess = dashboardRole
    ? portalRole && dashboardRole !== portalRole
      ? { allowed: false, reason: 'portal-mismatch' as const }
      : authorizeRoleRoute(dashboardRole, { isSignedIn: user.isSignedIn, registeredRoles, isAdmin: Boolean(user.isAdmin) })
    : null;
  const redirectRole = portalRole
    ? dashboardRole && dashboardRole !== portalRole
      ? dashboardRole
      : user.isSignedIn && !registeredRoles.includes(portalRole) && role !== portalRole
        ? role
        : null
    : null;
  const redirectUrl = redirectRole
    ? buildPortalRedirectUrl(redirectRole, window.location.href, PORTAL_URLS)
    : null;

  useEffect(() => {
    const syncPathname = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', syncPathname);
    return () => window.removeEventListener('popstate', syncPathname);
  }, []);

  useEffect(() => {
    if (redirectUrl) window.location.replace(redirectUrl);
  }, [redirectUrl]);

  useEffect(() => {
    if (dashboardRole && dashboardAccess?.allowed && role !== dashboardRole) setRole(dashboardRole);
  }, [dashboardRole, dashboardAccess?.allowed, role, setRole]);

  if (authInitializing) {
    return <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6"><p className="text-sm font-semibold text-slate-600">Securely opening your profile…</p></main>;
  }

  switch (route.kind) {
    case 'register':
      return <AuthPageV2 registrationRole={route.role} />;
    case 'register-buyer':
      return <BuyerRegistrationPage />;
    case 'account':
      return user.isSignedIn ? <BuyerAccountPage /> : <AuthPageV2 />;
    case 'role-dashboard':
      if (redirectUrl) return <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6"><p className="text-sm font-semibold text-slate-600">Opening your authorized portal…</p></main>;
      if (dashboardAccess?.allowed) return <MainLayout Dashboard={Dashboard} />;
      if (dashboardAccess?.reason === 'authentication-required') return <AuthPageV2 />;
      return <AccessDenied />;
    case 'home':
    default:
      return user.isSignedIn ? <MainLayout Dashboard={Dashboard} /> : <AuthPageV2 />;
  }
};

export const PortalAppShell: React.FC<PortalAppShellProps> = (props) => (
  <AppProvider><RootNavigation {...props} /></AppProvider>
);
