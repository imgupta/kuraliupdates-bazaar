import React, { useMemo, useState } from 'react';
import { ShoppingBag, Home, Search, X, Package, ChevronRight } from 'lucide-react';
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
}

const ACTIVE_ORDER_STATUSES = new Set([
  'placed',
  'accepted_by_seller',
  'ready_for_pickup',
  'assigned_to_delivery',
  'picked_up',
  'out_for_delivery',
]);

const formatOrderStatus = (status: string) =>
  status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

export const BuyerHome: React.FC<BuyerHomeProps> = (props) => {
  const [mode, setMode] = useState<'shop' | 'daily-help'>('shop');
  const { orders, user } = useApp();
  const activeOrders = useMemo(() => {
    const email = user.email?.trim().toLowerCase();
    const phone = user.phone?.replace(/\\D/g, '');
    return orders
      .filter(order => {
        const emailMatches = Boolean(email && order.buyerEmail?.trim().toLowerCase() === email);
        const orderPhone = order.buyerPhone?.replace(/\\D/g, '');
        const phoneMatches = Boolean(phone && orderPhone && orderPhone.slice(-10) === phone.slice(-10));
        return (emailMatches || phoneMatches) && ACTIVE_ORDER_STATUSES.has(order.status);
      })
      .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
  }, [orders, user.email, user.phone]);

  const switchMode = (nextMode: 'shop' | 'daily-help') => {
    if (nextMode !== mode) props.setSearchQuery('');
    setMode(nextMode);
  };

  return (
    <div className={`space-y-4 sm:space-y-5 ${activeOrders.length ? 'pb-36 sm:pb-32' : 'pb-12'}`}>
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

      {activeOrders.length > 0 && (
        <section aria-label="Current orders" className="fixed inset-x-0 bottom-0 z-[90] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-3 py-2 sm:px-4 sm:py-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5 text-xs font-black text-slate-900">
                <Package className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Your current orders</span>
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-800">{activeOrders.length}</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">Track anytime</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {activeOrders.map(order => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => props.onOpenTracking(order.id)}
                  className="flex min-w-[230px] max-w-[290px] flex-1 items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-left transition hover:border-amber-400 hover:bg-amber-50"
                  aria-label={`Track order ${order.id}, ${formatOrderStatus(order.status)}`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 shadow-sm"><Package className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-extrabold text-slate-900">{order.sellerName || 'KuraliUpdates order'}</span>
                    <span className="mt-0.5 block truncate text-[10px] font-semibold text-amber-800">{formatOrderStatus(order.status)} · #{order.id.slice(-6)}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-amber-700" />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
