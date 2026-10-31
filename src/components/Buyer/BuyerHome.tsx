import React, { useMemo, useState } from 'react';
import { ShoppingBag, Home, Search, X, Truck } from 'lucide-react';
import { OnlineShopHome } from './OnlineShopHome';
import { DailyHelpHome } from './DailyHelpHome';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';

interface BuyerHomeProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onOpenTracking: (orderId: string) => void;
  onBuyNow: (product: Product) => void;
  isCheckoutOpen?: boolean;
}

export const BuyerHome: React.FC<BuyerHomeProps> = (props) => {
  const [mode, setMode] = useState<'shop' | 'daily-help'>('shop');
  const { orders, user } = useApp();
  const activeOrders = useMemo(() => {
    const email = user.email?.trim().toLowerCase();
    const phone = user.phone?.replace(/\D/g, '');
    return orders
      .filter(order => {
        const emailMatches = Boolean(email && order.buyerEmail?.trim().toLowerCase() === email);
        const orderPhone = order.buyerPhone?.replace(/\D/g, '');
        const phoneMatches = Boolean(phone && orderPhone && orderPhone.slice(-10) === phone.slice(-10));
        const normalizedStatus = String(order.status || 'placed').trim().replace(/[\s-]+/g, '_').toLowerCase();
        const terminalStatuses = new Set(['delivered', 'completed', 'cancelled', 'canceled', 'rejected', 'failed', 'refunded', 'returned', 'closed']);
        return (emailMatches || phoneMatches) && !terminalStatuses.has(normalizedStatus);
      })
      .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
  }, [orders, user.email, user.phone]);

  const switchMode = (nextMode: 'shop' | 'daily-help') => {
    if (nextMode !== mode) props.setSearchQuery('');
    setMode(nextMode);
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-36">
      <div className="sticky top-[108px] sm:top-[68px] z-30 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-1.5 shadow-sm">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => switchMode('shop')}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              mode === 'shop' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Online Shop
          </button>
          <button
            onClick={() => switchMode('daily-help')}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              mode === 'daily-help' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Home className="w-4 h-4" />
            Daily Help
          </button>
        </div>
      </div>

      <div className="sticky top-[160px] sm:top-[123px] z-20 bg-slate-50/95 py-2 backdrop-blur-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={props.searchQuery}
            onChange={event => props.setSearchQuery(event.target.value)}
            placeholder={mode === 'shop' ? 'Search products across Kurali shops...' : 'Search Daily Help services...'}
            aria-label={mode === 'shop' ? 'Search products' : 'Search Daily Help services'}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
          {props.searchQuery && <button type="button" onClick={() => props.setSearchQuery('')} aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>}
        </div>
      </div>
      {mode === 'shop' ? <OnlineShopHome {...props} /> : <DailyHelpHome searchQuery={props.searchQuery} />}

      {activeOrders.length > 0 && !props.isCheckoutOpen && (
        <section className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.10)] backdrop-blur-md pb-[env(safe-area-inset-bottom)]" aria-label="Your current orders">
          <div className="mx-auto max-w-screen-xl px-3 py-2 sm:px-6">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-extrabold text-slate-900">Your orders</h2>
                <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">{activeOrders.length} active</span>
              </div>
              {activeOrders.length > 1 && <span className="text-[9px] text-slate-400">Swipe left for more orders</span>}
            </div>
            <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 scrollbar-none" aria-label="Active orders, swipe left and right">
              {activeOrders.map(order => {
                const status = String(order.status || 'placed').replace(/_/g, ' ').toLowerCase();
                return (
                  <button key={order.id} type="button" onClick={() => props.onOpenTracking(order.id)}
                    className="flex min-w-[190px] max-w-[220px] snap-start items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Truck className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[10px] font-extrabold text-slate-800">Order #{order.id}</span>
                      <span className="mt-0.5 block truncate text-[10px] capitalize text-slate-500">{status}</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-emerald-700">Track ›</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
