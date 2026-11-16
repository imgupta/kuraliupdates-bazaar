import React, { lazy, Suspense } from 'react';
import { PortalAppShell } from './app/PortalAppShell';
import type { UserRole } from './types';
import { SellerApplicationContinuation } from './components/Auth/SellerApplicationContinuation';

// Keep the combined Bazaar entry lightweight: load only the dashboard for the
// authenticated role instead of eagerly pulling all five role portals into the
// initial application bundle. Dedicated portal entry points remain unchanged.
const BuyerPortal = lazy(() => import('./features/buyer').then(module => ({ default: module.BuyerPortal })));
const SellerDashboard = lazy(() => import('./features/seller').then(module => ({ default: module.SellerDashboard })));
const DeliveryDashboard = lazy(() => import('./features/delivery').then(module => ({ default: module.DeliveryDashboard })));
const DailyHelpProfessionalDashboard = lazy(() => import('./features/daily-help').then(module => ({ default: module.DailyHelpProfessionalDashboard })));
const AdminDashboard = lazy(() => import('./features/admin').then(module => ({ default: module.AdminDashboard })));

interface DashboardProps {
  role: UserRole;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
}

const DashboardLoading: React.FC = () => (
  <div className="flex min-h-48 items-center justify-center" role="status" aria-live="polite">
    <p className="text-sm font-semibold text-slate-600">Loading your portal…</p>
  </div>
);

const AllRoleDashboards: React.FC<DashboardProps> = ({ role, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory }) => (
  <Suspense fallback={<DashboardLoading />}>
    {role === 'buyer' && <BuyerPortal searchQuery={searchQuery} setSearchQuery={setSearchQuery} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />}
    {role === 'seller' && <SellerDashboard />}
    {role === 'delivery' && <DeliveryDashboard />}
    {role === 'professional' && <DailyHelpProfessionalDashboard />}
    {role === 'admin' && <AdminDashboard />}
  </Suspense>
);

export default function App() {
  if (window.location.pathname === '/seller-application') return <SellerApplicationContinuation />;
  return <PortalAppShell Dashboard={AllRoleDashboards} />;
}
