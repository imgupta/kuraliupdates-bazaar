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
import { AuthPage } from './components/Auth/AuthPage';
import { isRootAdminEmail } from './data/initialData';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    role,
    setRole,
    user,
    logout,
    trackingOrderId,
    setTrackingOrderId,
    toast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const isRootAdmin = isRootAdminEmail(user.email);

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

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-extrabold text-sm">
                  K
                </div>
                <span className="font-black text-white text-base tracking-tight">
                  kuraliupdates.com
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Hyperlocal eCommerce &amp; delivery ecosystem for Kurali city, Punjab. Connecting local merchants with neighborhood buyers.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-amber-400 font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                <span>Rupnagar / Mohali District, Punjab</span>
              </div>
            </div>

            <div>
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider mb-3">
                Key Features
              </h4>
              <ul className="space-y-2 text-xs">
                <li className="hover:text-white cursor-pointer" onClick={() => setRole('buyer')}>
                  &bull; Compare Sellers for Low Price
                </li>
                <li className="hover:text-white cursor-pointer" onClick={() => setRole('buyer')}>
                  &bull; Direct Price Negotiation Chat
                </li>
                <li className="hover:text-white cursor-pointer" onClick={() => setRole('buyer')}>
                  &bull; Free Delivery Above Min Threshold
                </li>
                <li className="hover:text-white cursor-pointer" onClick={() => setRole('buyer')}>
                  &bull; Real-Time Order &amp; Rider Tracking
                </li>
                <li className="hover:text-white cursor-pointer" onClick={() => setRole('seller')}>
                  &bull; Total Bill Discounts &amp; Coupons
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider mb-3">
                Kurali Localities Covered
              </h4>
              <ul className="space-y-1 text-[11px] text-slate-400">
                <li>&bull; Main Bazaar &amp; Old Fountain Chowk</li>
                <li>&bull; Morinda Road Commercial Hub</li>
                <li>&bull; Railway Station Road &amp; Gurudwara</li>
                <li>&bull; Chandigarh Road &amp; Kharar Bypass</li>
                <li>&bull; Siswan Road &amp; River Belt</li>
                <li>&bull; Dana Mandi (Grain Market)</li>
                <li>&bull; Shivalik City &amp; Dashmesh Nagar</li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider mb-3">
                Your Account Session
              </h4>
              <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">User:</span>
                  <span className="font-bold text-white truncate max-w-[130px]">{user.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Role:</span>
                  <span className="font-bold uppercase text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded text-[10px]">
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Locality:</span>
                  <span className="font-bold text-slate-300 text-[11px] truncate max-w-[120px]">{user.locality}</span>
                </div>
                {isRootAdmin && (
                  <button
                    onClick={() => setRole('admin')}
                    className="w-full mt-2 py-1.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/60 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                  >
                    🛡️ Open Admin Desk
                  </button>
                )}
                <button
                  onClick={logout}
                  className="w-full mt-1 py-1.5 bg-rose-900/40 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          <div className="pt-8 mt-8 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>&copy; 2026 kuraliupdates.com &bull; Designed for Kurali City Merchants, Shoppers &amp; Delivery Fleet.</p>
            <div className="flex items-center gap-4">
              <span>Admin Approved Merchants</span>
              <span>&bull;</span>
              <span>Express Local Delivery</span>
              <span>&bull;</span>
              <span>Bargain Direct</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const RootNavigation: React.FC = () => {
  const { user } = useApp();

  if (!user.isSignedIn) {
    return <AuthPage />;
  }

  return <MainLayout />;
};

export default function App() {
  return (
    <AppProvider>
      <RootNavigation />
    </AppProvider>
  );
}
