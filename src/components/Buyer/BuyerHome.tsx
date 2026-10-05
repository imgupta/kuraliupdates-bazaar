import React, { useState } from 'react';
import { ShoppingBag, Sparkles, Home } from 'lucide-react';
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

  return (
    <div className="space-y-4 sm:space-y-5 pb-12">
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => setMode('shop')}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              mode === 'shop' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Online Shop
          </button>
          <button
            onClick={() => setMode('daily-help')}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              mode === 'daily-help' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Home className="w-4 h-4" />
            Daily Help
          </button>
        </div>
      </div>

      {mode === 'shop' ? <OnlineShopHome {...props} /> : <DailyHelpHome />}
    </div>
  );
};
