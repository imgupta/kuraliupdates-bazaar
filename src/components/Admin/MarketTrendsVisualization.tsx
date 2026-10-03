import React, { useState } from 'react';
import {
  TrendingUp,
  Search,
  PieChart,
  BarChart3,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Calendar,
  Filter,
  Sparkles,
  ShoppingBag,
  Store,
  Clock,
  Layers,
  HelpCircle,
  Download,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SearchTrend {
  query: string;
  category: string;
  searchVolume: number;
  growthRate: number; // percentage e.g. +38%
  peakLocality: string;
  conversionRate: number; // e.g. 64%
  trendHistory: number[]; // 7-day sparkline points
  status: 'surging' | 'steady' | 'breakout';
}

interface CategoryMetric {
  name: string;
  color: string;
  badgeBg: string;
  percentage: number;
  orderCount: number;
  revenue: number;
  growth: number;
  topItem: string;
  avgOrderValue: number;
}

export const MarketTrendsVisualization: React.FC = () => {
  const { products, orders, sellers, showToast } = useApp();

  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('7d');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [hoveredTrend, setHoveredTrend] = useState<string | null>(null);
  const [activeCategorySlice, setActiveCategorySlice] = useState<string | null>(null);

  // Trending search queries in Kurali City dataset
  const searchTrendsData: SearchTrend[] = [
    {
      query: 'Pure Desi Ghee 1L',
      category: 'Dairy, Bakery & Sweets',
      searchVolume: timeframe === '24h' ? 420 : timeframe === '7d' ? 2840 : 11200,
      growthRate: 48,
      peakLocality: 'Railway Station Road & Morinda Rd',
      conversionRate: 68,
      trendHistory: [35, 42, 58, 65, 74, 88, 98],
      status: 'surging',
    },
    {
      query: 'Fortune Basmati Rice 5kg',
      category: 'Groceries & Daily Essentials',
      searchVolume: timeframe === '24h' ? 380 : timeframe === '7d' ? 2450 : 9800,
      growthRate: 34,
      peakLocality: 'Main Bazaar & Fountain Chowk',
      conversionRate: 72,
      trendHistory: [50, 52, 60, 68, 70, 82, 89],
      status: 'steady',
    },
    {
      query: 'boAt ANC Earbuds',
      category: 'Electronics & Mobiles',
      searchVolume: timeframe === '24h' ? 290 : timeframe === '7d' ? 1890 : 7600,
      growthRate: 54,
      peakLocality: 'Chandigarh Road & Ward 6',
      conversionRate: 45,
      trendHistory: [20, 28, 35, 45, 62, 78, 92],
      status: 'breakout',
    },
    {
      query: 'Fresh Malai Paneer 500g',
      category: 'Dairy, Bakery & Sweets',
      searchVolume: timeframe === '24h' ? 310 : timeframe === '7d' ? 2120 : 8400,
      growthRate: 26,
      peakLocality: 'Dashmesh Nagar & Dana Mandi',
      conversionRate: 76,
      trendHistory: [60, 64, 62, 70, 75, 78, 84],
      status: 'steady',
    },
    {
      query: 'Aashirvaad Chakki Atta 10kg',
      category: 'Groceries & Daily Essentials',
      searchVolume: timeframe === '24h' ? 260 : timeframe === '7d' ? 1780 : 7100,
      growthRate: 22,
      peakLocality: 'Morinda Road & Main Chowk',
      conversionRate: 81,
      trendHistory: [55, 58, 62, 66, 71, 74, 80],
      status: 'steady',
    },
    {
      query: 'Punjab Farm Kinnow 3kg',
      category: 'Fruits & Vegetables',
      searchVolume: timeframe === '24h' ? 240 : timeframe === '7d' ? 1620 : 6400,
      growthRate: 41,
      peakLocality: 'Dana Mandi Yard',
      conversionRate: 64,
      trendHistory: [30, 38, 48, 55, 63, 72, 85],
      status: 'surging',
    },
    {
      query: 'Desi Mustard Oil (Sarson Tel)',
      category: 'Organic & Farm Produce',
      searchVolume: timeframe === '24h' ? 190 : timeframe === '7d' ? 1240 : 4900,
      growthRate: 62,
      peakLocality: 'Siswan Road Bypass',
      conversionRate: 59,
      trendHistory: [15, 22, 34, 48, 58, 70, 88],
      status: 'breakout',
    },
    {
      query: 'Besan Pinni Gift Box 1kg',
      category: 'Dairy, Bakery & Sweets',
      searchVolume: timeframe === '24h' ? 170 : timeframe === '7d' ? 1150 : 4600,
      growthRate: 38,
      peakLocality: 'Railway Station Road',
      conversionRate: 52,
      trendHistory: [25, 30, 42, 50, 60, 72, 82],
      status: 'surging',
    },
  ];

  // Popular product categories in Kurali
  const categoryData: CategoryMetric[] = [
    {
      name: 'Groceries & Daily Essentials',
      color: '#f59e0b', // amber-500
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
      percentage: 36,
      orderCount: timeframe === '24h' ? 58 : timeframe === '7d' ? 392 : 1560,
      revenue: timeframe === '24h' ? 42100 : timeframe === '7d' ? 285400 : 1140000,
      growth: 28,
      topItem: 'Fortune Basmati Rice & Aashirvaad Atta',
      avgOrderValue: 728,
    },
    {
      name: 'Dairy, Bakery & Sweets',
      color: '#ec4899', // pink-500
      badgeBg: 'bg-pink-100 text-pink-900 border-pink-300',
      percentage: 26,
      orderCount: timeframe === '24h' ? 44 : timeframe === '7d' ? 295 : 1180,
      revenue: timeframe === '24h' ? 31200 : timeframe === '7d' ? 218600 : 874000,
      growth: 35,
      topItem: 'Desi Buffalo Ghee & Fresh Paneer',
      avgOrderValue: 741,
    },
    {
      name: 'Fruits & Vegetables',
      color: '#10b981', // emerald-500
      badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      percentage: 18,
      orderCount: timeframe === '24h' ? 32 : timeframe === '7d' ? 210 : 840,
      revenue: timeframe === '24h' ? 14800 : timeframe === '7d' ? 98700 : 395000,
      growth: 22,
      topItem: 'Fresh Kinnow Bag & Potato/Onion Combo',
      avgOrderValue: 470,
    },
    {
      name: 'Electronics & Mobiles',
      color: '#3b82f6', // blue-500
      badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
      percentage: 12,
      orderCount: timeframe === '24h' ? 18 : timeframe === '7d' ? 122 : 490,
      revenue: timeframe === '24h' ? 26400 : timeframe === '7d' ? 184500 : 738000,
      growth: 42,
      topItem: 'boAt ANC Earbuds & Fast Power Bank',
      avgOrderValue: 1512,
    },
    {
      name: 'Organic & Farm Produce',
      color: '#8b5cf6', // purple-500
      badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
      percentage: 8,
      orderCount: timeframe === '24h' ? 12 : timeframe === '7d' ? 84 : 336,
      revenue: timeframe === '24h' ? 9600 : timeframe === '7d' ? 68900 : 275600,
      growth: 64,
      topItem: 'Cold-Pressed Mustard Oil & Desi Honey',
      avgOrderValue: 820,
    },
  ];

  // Hourly shopping & search traffic distribution in Kurali (24 hours)
  const hourlyTraffic = [
    { hour: '6 AM', volume: 15, label: 'Early Milk/Mandi' },
    { hour: '8 AM', volume: 48, label: 'Morning Rush' },
    { hour: '10 AM', volume: 85, label: 'Peak Grocery Orders' },
    { hour: '12 PM', volume: 62, label: 'Mid-day' },
    { hour: '2 PM', volume: 38, label: 'Afternoon Slump' },
    { hour: '4 PM', volume: 55, label: 'Snacks & Bakery' },
    { hour: '6 PM', volume: 96, label: 'Prime Shopping Peak' },
    { hour: '8 PM', volume: 88, label: 'Dinner & Tech Bargains' },
    { hour: '10 PM', volume: 32, label: 'Late Delivery' },
  ];

  const filteredTrends = searchTrendsData.filter(trend => {
    if (selectedCategoryFilter === 'all') return true;
    return trend.category === selectedCategoryFilter;
  });

  const maxVolume = Math.max(...searchTrendsData.map(t => t.searchVolume));

  const totalMarketVolume = categoryData.reduce((acc, c) => acc + c.revenue, 0);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8 animate-in fade-in">
      {/* Component Title & Controls Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
              Live City Intelligence
            </span>
            <span className="text-xs text-slate-400 font-medium">
              kuraliupdates.com &bull; Search &amp; Demand Radar
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-amber-600" />
            Trending Searches &amp; Category Demand in Kurali
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Real-time visual breakdown of what local Kurali residents are searching for, top category revenue shares, and locality demand hotspots.
          </p>
        </div>

        {/* Timeframe Selector & Export Simulation */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setTimeframe('24h')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeframe === '24h'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              24 Hours
            </button>
            <button
              onClick={() => setTimeframe('7d')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeframe === '7d'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Past 7 Days
            </button>
            <button
              onClick={() => setTimeframe('30d')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeframe === '30d'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Past 30 Days
            </button>
          </div>

          <button
            onClick={() => showToast('Exported Kurali Demand Report (CSV/PDF) summary', 'success')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
            title="Download Report"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid: 2 Major Visualization Pillars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* PILLAR 1: Trending Search Queries (7 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-600" />
                Top Trending Search Queries in Kurali
              </h3>
              <span className="text-[11px] text-slate-400">
                Ranked by search volume &amp; high purchase intent
              </span>
            </div>

            {/* Filter by Category */}
            <select
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="Dairy, Bakery & Sweets">Dairy &amp; Sweets</option>
              <option value="Groceries & Daily Essentials">Groceries &amp; Staples</option>
              <option value="Electronics & Mobiles">Electronics</option>
              <option value="Fruits & Vegetables">Fruits &amp; Veggies</option>
              <option value="Organic & Farm Produce">Organic Farm</option>
            </select>
          </div>

          {/* Interactive Trends List with Progress Bars & Sparkline Visuals */}
          <div className="space-y-3">
            {filteredTrends.map((trend, idx) => {
              const barWidthPercent = Math.max(12, Math.round((trend.searchVolume / maxVolume) * 100));

              return (
                <div
                  key={trend.query}
                  onMouseEnter={() => setHoveredTrend(trend.query)}
                  onMouseLeave={() => setHoveredTrend(null)}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 ${
                    hoveredTrend === trend.query
                      ? 'bg-amber-50/80 border-amber-300 shadow-sm scale-[1.01]'
                      : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                            {trend.query}
                          </span>
                          {trend.status === 'breakout' && (
                            <span className="bg-purple-100 text-purple-800 text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" /> Breakout
                            </span>
                          )}
                          {trend.status === 'surging' && (
                            <span className="bg-rose-100 text-rose-800 text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5 text-rose-600" /> Hot
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>{trend.category}</span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1 text-slate-600">
                            <MapPin className="w-3 h-3 text-amber-600" />
                            {trend.peakLocality}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1 font-mono font-extrabold text-xs text-slate-900">
                        <span>{trend.searchVolume.toLocaleString()} searches</span>
                        <span className="text-emerald-700 flex items-center text-[10px] font-sans font-bold bg-emerald-100 px-1 rounded">
                          <ArrowUpRight className="w-3 h-3" />+{trend.growthRate}%
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Intent to Buy: <strong className="text-slate-700">{trend.conversionRate}%</strong>
                      </span>
                    </div>
                  </div>

                  {/* Visual Bar Gauge & 7-day Sparkline */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/50 flex items-center gap-3">
                    {/* Volume Bar */}
                    <div className="flex-1 h-2 bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 rounded-full transition-all duration-500"
                        style={{ width: `${barWidthPercent}%` }}
                      ></div>
                    </div>

                    {/* Mini SVG Sparkline */}
                    <div className="w-20 h-5 shrink-0 flex items-center">
                      <svg viewBox="0 0 100 24" className="w-full h-full overflow-visible">
                        <polyline
                          fill="none"
                          stroke={trend.growthRate > 40 ? '#10b981' : '#f59e0b'}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={trend.trendHistory
                            .map((val, i) => `${(i / (trend.trendHistory.length - 1)) * 100},${24 - (val / 100) * 20}`)
                            .join(' ')}
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PILLAR 2: Popular Product Categories & Market Share (5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-600" />
              Category Demand &amp; Revenue Share
            </h3>
            <span className="text-[11px] text-slate-400">
              Total city commerce volume: <strong className="text-slate-800">₹{totalMarketVolume.toLocaleString()}</strong>
            </span>
          </div>

          {/* Segmented Stacked Bar Chart */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Market Share Distribution</span>
              <span className="text-[11px] text-slate-400">100% of Orders</span>
            </div>

            <div className="h-4 w-full bg-slate-200 rounded-xl overflow-hidden flex shadow-inner">
              {categoryData.map(cat => (
                <div
                  key={cat.name}
                  onClick={() => setActiveCategorySlice(activeCategorySlice === cat.name ? null : cat.name)}
                  style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                  title={`${cat.name}: ${cat.percentage}%`}
                  className={`h-full cursor-pointer transition-all hover:opacity-85 ${
                    activeCategorySlice && activeCategorySlice !== cat.name ? 'opacity-30' : 'opacity-100'
                  }`}
                />
              ))}
            </div>

            {/* Quick Color Legend */}
            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              {categoryData.map(cat => (
                <div
                  key={cat.name}
                  onClick={() => setActiveCategorySlice(activeCategorySlice === cat.name ? null : cat.name)}
                  className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${
                    activeCategorySlice && activeCategorySlice !== cat.name ? 'opacity-40' : 'opacity-100 font-bold'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                  <span className="text-slate-700">{cat.name.split(' ')[0]} ({cat.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category Metric Cards */}
          <div className="space-y-2.5">
            {categoryData.map(cat => {
              const isSelected = activeCategorySlice === cat.name;

              return (
                <div
                  key={cat.name}
                  onClick={() => setActiveCategorySlice(isSelected ? null : cat.name)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-50/80 border-purple-400 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                      <h4 className="font-extrabold text-xs text-slate-900 leading-snug">
                        {cat.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded-md">
                      <TrendingUp className="w-3 h-3" />
                      +{cat.growth}%
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Volume</span>
                      <span className="font-mono font-bold text-slate-800">{cat.orderCount} orders</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Revenue</span>
                      <span className="font-mono font-bold text-slate-800">₹{cat.revenue.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Avg Basket</span>
                      <span className="font-mono font-bold text-slate-800">₹{cat.avgOrderValue}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2 truncate">
                    Bestseller: <strong className="text-slate-700">{cat.topItem}</strong>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PILLAR 3: Peak Hourly Shopping & Search Heatmap in Kurali */}
      <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="font-extrabold text-sm tracking-tight">
                Kurali City Hourly Shopping Activity Curve
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Identifies peak ordering windows when delivery fleet and shopkeepers need maximum staffing.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-amber-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Peak Window: 6:00 PM – 8:30 PM (Evening Dinner/Grocery Rush)
            </span>
          </div>
        </div>

        {/* Visual Bar Graph */}
        <div className="pt-2">
          <div className="grid grid-cols-9 gap-2 items-end h-28 pt-4 pb-2 border-b border-slate-800">
            {hourlyTraffic.map((item, idx) => {
              const isPeak = item.volume > 80;
              return (
                <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.volume}%
                  </span>
                  <div
                    style={{ height: `${item.volume}%` }}
                    className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                      isPeak
                        ? 'bg-gradient-to-t from-amber-600 to-orange-400 shadow-md shadow-orange-500/20'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  ></div>
                  <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                    {item.hour}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
            <span>Morning Spike (8:00 AM - 10:00 AM): Fresh Milk, Paneer &amp; Mandi Vegetables</span>
            <span>Evening Spike (6:00 PM - 9:00 PM): Groceries, Mobile Accessories &amp; Sweets</span>
          </div>
        </div>
      </div>

      {/* Actionable Strategic Insights for Kurali City Admin */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold text-amber-950">
              Admin Recommendation for Kuraliupdates Merchants:
            </span>
            <p className="text-amber-800 mt-0.5">
              High search volume for <strong>Cold-Pressed Mustard Oil &amp; Organic Jaggery</strong> (+62% spike) with limited inventory in Siswan Road. Approving more farm produce sellers will capture unfulfilled city demand.
            </p>
          </div>
        </div>

        <button
          onClick={() => showToast('Dispatched demand alert to registered Kurali sellers', 'success')}
          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-colors shrink-0 shadow-xs cursor-pointer"
        >
          Send Merchant Alert
        </button>
      </div>
    </div>
  );
};
