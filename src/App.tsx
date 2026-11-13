import React from 'react';
import { PortalAppShell } from './app/PortalAppShell';
import { BuyerPortal } from './features/buyer';
import { SellerDashboard } from './features/seller';
import { DeliveryDashboard } from './features/delivery';
import { DailyHelpProfessionalDashboard } from './features/daily-help';
import { AdminDashboard } from './features/admin';
import type { UserRole } from './types';
import { SellerApplicationContinuation } from './components/Auth/SellerApplicationContinuation';

interface DashboardProps {
  role: UserRole;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
}

const AllRoleDashboards: React.FC<DashboardProps> = ({ role, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory }) => (
  <>
    {role === 'buyer' && <BuyerPortal searchQuery={searchQuery} setSearchQuery={setSearchQuery} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />}
    {role === 'seller' && <SellerDashboard />}
    {role === 'delivery' && <DeliveryDashboard />}
    {role === 'professional' && <DailyHelpProfessionalDashboard />}
    {role === 'admin' && <AdminDashboard />}
  </>
);

export default function App() {
  if (window.location.pathname === '/seller-application') return <SellerApplicationContinuation />;
  return <PortalAppShell Dashboard={AllRoleDashboards} />;
}
