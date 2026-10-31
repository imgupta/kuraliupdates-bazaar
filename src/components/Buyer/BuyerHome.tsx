import React, { useState } from 'react';
import { ShoppingBag, Home, Search, X } from 'lucide-react';
import { OnlineShopHome } from './OnlineShopHome';
import { DailyHelpHome } from './DailyHelpHome';
import { Product } from '../../types';

interface BuyerHomeProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onOpenTracking: (orderId: string) => void;
  onBuyNow: (product: Product) => void;
}

export const BuyerHome: React.FC<BuyerHomeProps> = (props) => {
  const [mode, setMode] = useState<'shop' | 'daily-help'>('shop');
  const switchMode = (nextMode: 'shop' | 'daily-help') => {
    if (nextMode !== mode) props.setSearchQuery('');
    setMode(nextMode);
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-12">
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
    </div>
  );
};
