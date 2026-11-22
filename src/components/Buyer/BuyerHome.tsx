import React, { useMemo, useState } from 'react';
import { ShoppingBag, Home, Search, X, Truck, ArrowRight } from 'lucide-react';
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
  const [showAllActiveOrders, setShowAllActiveOrders] = useState(false);
  const { orders, user, cart, cartCalculations, setIsCartOpen } = useApp();
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

      {(cart.length > 0 || activeOrders.length > 0) && !props.isCheckoutOpen && (
        <section className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)]" aria-label="Cart and current orders">
          <div className="mx-auto flex max-w-screen-xl items-stretch gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_-8px_28px_rgba(15,23,42,0.18)] backdrop-blur-md">
            {activeOrders.length > 0 && (
              <div className="flex min-w-0 flex-[1.7] items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2" aria-label="Your current orders">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Truck className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold text-slate-900">Your orders</span>
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">{activeOrders.length}</span>
                    {activeOrders.length > 1 && (
                      <button type="button" onClick={() => setShowAllActiveOrders(value => !value)}
                        className="ml-auto shrink-0 text-[9px] font-bold text-emerald-700">
                        {showAllActiveOrders ? 'Latest' : 'All'}
                      </button>
                    )}
                  </div>
                  <div className="mt-0.5 flex min-w-0 items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[10px] text-slate-600">
                      {showAllActiveOrders ? `${activeOrders.length} active orders` : `#${activeOrders[0].id} · ${String(activeOrders[0].status || 'placed').replace(/_/g, ' ').toLowerCase()}`}
                    </span>
                    <button type="button" onClick={() => props.onOpenTracking(activeOrders[0].id)}
                      className="shrink-0 text-[10px] font-extrabold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      Track ›
                    </button>
                  </div>
                  {showAllActiveOrders && activeOrders.length > 1 && (
                    <div className="mt-1 flex gap-1 overflow-x-auto scrollbar-none">
                      {activeOrders.slice(1).map(order => (
                        <button key={order.id} type="button" onClick={() => props.onOpenTracking(order.id)}
                          className="shrink-0 rounded-md border border-emerald-100 bg-white px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                          #{order.id} · Track
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {mode === 'shop' && cart.length > 0 && (
              <button type="button" onClick={() => setIsCartOpen(true)}
                aria-label={`Open cart, ${cart.reduce((sum, item) => sum + item.quantity, 0)} items, total ₹${cartCalculations.finalTotal}`}
                className="flex min-w-0 flex-1 items-center justify-between gap-1.5 rounded-xl bg-slate-900 px-2.5 py-2 text-left text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <ShoppingBag className="h-5 w-5" />
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-black text-slate-950">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[10px] font-extrabold">Cart · ₹{cartCalculations.finalTotal}</span>
                  <span className="block truncate text-[9px] text-slate-300">Checkout ›</span>
                </span>
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
