import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BuyerHome } from './components/Buyer/BuyerHome';
import { CartDrawer } from './components/Buyer/CartDrawer';
import { CheckoutModal } from './components/Buyer/CheckoutModal';
import { OrderTrackingModal } from './components/Buyer/OrderTrackingModal';
import { NegotiationChatModal } from './components/Buyer/NegotiationChatModal';
import { SellerDashboard } from './components/Seller/SellerDashboard';
import { DeliveryDashboard } from './components/Delivery/DeliveryDashboard';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AuthPageV2 } from './components/Auth/AuthPageV2';
import { BuyerRegistrationPage } from './components/Auth/BuyerRegistrationPage';
import { BuyerAccountPage } from './components/Buyer/BuyerAccountPage';
import {
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    role,
    user,
    trackingOrderId,
    setTrackingOrderId,
    addToCart,
    toast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-slate-50 flex flex-col text-slate-900 font-sans">
      {/* Global Header */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      {/* Main Body - Render Portal According to User Role */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {role === 'buyer' && (
          <BuyerHome
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            onOpenTracking={(orderId) => setTrackingOrderId(orderId)}
            onBuyNow={(product) => {
              addToCart(product, 1);
              setIsCheckoutOpen(true);
            }}
          />
        )}
        {role === 'seller' && <SellerDashboard />}
        {role === 'delivery' && <DeliveryDashboard />}
        {role === 'admin' && <AdminDashboard />}
      </main>

      {/* Toast Notification Banner */}
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

      {/* Global Modals for Active Operations */}
      <CartDrawer onProceedToCheckout={() => setIsCheckoutOpen(true)} />
      {isCheckoutOpen && (
        <CheckoutModal onClose={() => setIsCheckoutOpen(false)} />
      )}
      {trackingOrderId && (
        <OrderTrackingModal
          orderId={trackingOrderId}
          onClose={() => setTrackingOrderId(null)}
        />
      )}
      <NegotiationChatModal />

      {/* Minimal copyright */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-3 text-center text-[11px] text-slate-500">
        &copy; 2026 kuraliupdates.com
      </footer>
    </div>
  );
};

const RootNavigation: React.FC = () => {
  const { user } = useApp();
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';

  if (pathname === '/register/seller') return <AuthPageV2 registrationRole="seller" />;
  if (pathname === '/register/delivery') return <AuthPageV2 registrationRole="delivery" />;
  if (pathname === '/register/buyer') return <BuyerRegistrationPage />;
  if (pathname === '/account') return user.isSignedIn && user.role === 'buyer' ? <BuyerAccountPage /> : <AuthPageV2 />;

  return user.isSignedIn ? <MainLayout /> : <AuthPageV2 />;
};

export default function App() {
  return (
    <AppProvider>
      <RootNavigation />
    </AppProvider>
  );
}
