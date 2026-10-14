import React from 'react';
import { PortalAppShell } from './app/PortalAppShell';
import { BuyerPortal } from './features/buyer/BuyerPortal';
import { SellerDashboard } from './features/seller/SellerPortal';
import { DeliveryDashboard } from './features/delivery/DeliveryPortal';
import { DailyHelpProfessionalDashboard } from './features/daily-help/DailyHelpPortal';
import { AdminDashboard } from './features/admin/AdminPortal';
import type { UserRole } from './types';

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
  return <PortalAppShell Dashboard={AllRoleDashboards} />;
}
