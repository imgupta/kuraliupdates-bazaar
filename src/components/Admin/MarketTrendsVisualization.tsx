import React from 'react';
import { BarChart3, Database, MapPin, Search, ShoppingBag, Store, Users } from 'lucide-react';

interface AdminAnalytics {
  totalStores: number;
  approvedStores: number;
  totalProducts: number;
  totalOrders: number;
  totalGmv: number;
  totalBuyers: number;
  activeDeliveryAgents: number;
  categories: Array<{
    category: string;
    productCount: number;
    orderCount: number;
    revenue: number;
  }>;
  localities: Array<{
    locality: string;
    sellerCount: number;
    productCount: number;
    orderCount: number;
  }>;
}

interface Props {
  analytics: AdminAnalytics | null;
  searchTrends?: Array<{ query: string; searchCount: number }>;
  loading?: boolean;
}

export const MarketTrendsVisualization: React.FC<Props> = ({ analytics, searchTrends = [], loading }) => {
  if (loading || !analytics) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center text-xs text-slate-500">
        Loading live database analytics...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
      <div className="flex items-start gap-3 pb-5 border-b border-slate-100">
        <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900">Live Database Analytics</h2>
          <p className="text-xs text-slate-500 mt-1">
            All figures below are calculated from the current Oracle database records. No sample or hardcoded business metrics are used.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          ['Stores', analytics.totalStores, Store],
          ['Approved', analytics.approvedStores, Store],
          ['Products', analytics.totalProducts, ShoppingBag],
          ['Orders', analytics.totalOrders, ShoppingBag],
          ['Buyers', analytics.totalBuyers, Users],
          ['Active Fleet', analytics.activeDeliveryAgents, Users],
        ].map(([label, value, Icon]: any) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Icon className="w-4 h-4 text-slate-500 mb-2" />
            <p className="text-[10px] uppercase font-bold text-slate-400">{label}</p>
            <p className="text-xl font-black text-slate-900">{Number(value).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-purple-600" />
          <h3 className="font-extrabold text-sm text-slate-900">Category Performance</h3>
        </div>
        {analytics.categories.length === 0 ? (
          <p className="text-xs text-slate-500 border border-dashed rounded-2xl p-6 text-center">No product/category data in the database.</p>
        ) : (
          <div className="space-y-3">
            {analytics.categories.map(category => (
              <div key={category.category} className="border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-sm text-slate-900">{category.category}</span>
                  <span className="text-xs font-bold text-slate-500">{category.productCount} products</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                  <div><span className="text-slate-400">Orders</span><strong className="block">{category.orderCount.toLocaleString()}</strong></div>
                  <div><span className="text-slate-400">Revenue</span><strong className="block">₹{Number(category.revenue).toLocaleString()}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-purple-600" />
          <h3 className="font-extrabold text-sm text-slate-900">Top Search Trends — Last 30 Days</h3>
        </div>
        {searchTrends.length === 0 ? (
          <p className="text-xs text-slate-500 border border-dashed rounded-2xl p-6 text-center">
            No buyer search activity has been recorded yet. Search trends will appear automatically as buyers search the marketplace.
          </p>
        ) : (
          <div className="space-y-2">
            {searchTrends.map((trend, index) => (
              <div key={trend.query} className="flex items-center justify-between gap-3 border border-slate-200 rounded-2xl p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-black shrink-0">{index + 1}</span>
                  <span className="font-bold text-sm text-slate-900 truncate">{trend.query}</span>
                </div>
                <span className="text-xs font-bold text-slate-500 shrink-0">{Number(trend.searchCount).toLocaleString()} searches</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-purple-600" />
          <h3 className="font-extrabold text-sm text-slate-900">Locality Activity</h3>
        </div>
        {analytics.localities.length === 0 ? (
          <p className="text-xs text-slate-500 border border-dashed rounded-2xl p-6 text-center">No locality data in the database.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analytics.localities.map(locality => (
              <div key={locality.locality} className="border border-slate-200 rounded-2xl p-4">
                <div className="flex justify-between gap-3">
                  <span className="font-bold text-sm text-slate-900">{locality.locality}</span>
                  <span className="text-xs text-slate-500">{locality.sellerCount} stores</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                  <div><span className="text-slate-400">Products</span><strong className="block">{locality.productCount}</strong></div>
                  <div><span className="text-slate-400">Orders</span><strong className="block">{locality.orderCount}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600">
        <strong className="text-slate-900">Total GMV:</strong> ₹{Number(analytics.totalGmv).toLocaleString()}
      </div>
    </div>
  );
};
