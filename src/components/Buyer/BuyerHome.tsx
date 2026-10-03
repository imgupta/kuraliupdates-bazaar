import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Tag,
  MapPin,
  Star,
  Truck,
  MessageSquare,
  Sparkles,
  ShoppingBag,
  SlidersHorizontal,
  TrendingDown,
  ShieldCheck,
  CheckCircle,
  Store,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { CompareSellersModal } from './CompareSellersModal';

interface BuyerHomeProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onOpenTracking: (orderId: string) => void;
}

export const BuyerHome: React.FC<BuyerHomeProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  onOpenTracking,
}) => {
  const {
    products,
    sellers,
    addToCart,
    openChatForProduct,
    orders,
    selectedCityLocality,
    comparingProduct,
    setComparingProduct,
    setIsCartOpen,
    setIsSellerRegisterOpen,
    setIsBuyerRegisterOpen,
    setIsDeliveryRegisterOpen,
  } = useApp();

  const [sortBy, setSortBy] = useState<'price_asc' | 'distance_asc' | 'discount_desc' | 'featured'>('featured');
  const [maxPrice, setMaxPrice] = useState<number>(3000);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => set.add(p.category));
    return ['All Categories', ...Array.from(set)];
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    // Only products from approved sellers!
    const approvedSellerIds = new Set(
      sellers.filter(s => s.status === 'approved').map(s => s.id)
    );

    return products
      .filter(p => {
        if (!approvedSellerIds.has(p.sellerId)) return false;

        // Category filter
        if (selectedCategory !== 'All Categories' && p.category !== selectedCategory) {
          return false;
        }

        // Locality filter
        if (
          selectedCityLocality !== 'All Localities (Kurali City)' &&
          !p.sellerLocality.toLowerCase().includes(selectedCityLocality.toLowerCase().replace('all localities', ''))
        ) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchSeller = p.sellerName.toLowerCase().includes(q);
          const matchLocality = p.sellerLocality.toLowerCase().includes(q);
          const matchCategory = p.category.toLowerCase().includes(q);
          const matchTags = p.tags.some(t => t.toLowerCase().includes(q));
          if (!matchTitle && !matchSeller && !matchLocality && !matchCategory && !matchTags) {
            return false;
          }
        }

        // Stock filter
        if (onlyInStock && p.stock <= 0) {
          return false;
        }

        // Max price filter (effective price)
        const effectivePrice = Math.round(
          p.sellerPrice * (1 - p.additionalDiscountPercent / 100)
        );
        if (effectivePrice > maxPrice) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const effA = Math.round(a.sellerPrice * (1 - a.additionalDiscountPercent / 100));
        const effB = Math.round(b.sellerPrice * (1 - b.additionalDiscountPercent / 100));

        if (sortBy === 'price_asc') {
          return effA - effB;
        }
        if (sortBy === 'distance_asc') {
          return a.sellerDistanceKm - b.sellerDistanceKm;
        }
        if (sortBy === 'discount_desc') {
          const savingsA = a.mrp - effA;
          const savingsB = b.mrp - effB;
          return savingsB - savingsA;
        }
        // Featured
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      });
  }, [products, sellers, selectedCategory, selectedCityLocality, searchQuery, onlyInStock, maxPrice, sortBy]);

  // Check if any recent active order exists for quick tracking
  const latestActiveOrder = orders.find(
    o => o.status !== 'delivered' && o.status !== 'cancelled'
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Active Order Live Banner if any */}
      {latestActiveOrder && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Truck className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  Live Kurali Order
                </span>
                <span className="text-xs text-emerald-100 font-mono">
                  {latestActiveOrder.id}
                </span>
              </div>
              <p className="text-sm font-bold mt-0.5">
                Status: <span className="capitalize">{latestActiveOrder.status.replace(/_/g, ' ')}</span> &bull; {latestActiveOrder.deliveryLocality}
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenTracking(latestActiveOrder.id)}
            className="px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            Track Real-Time Map
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white shadow-xl p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-amber-100">
            <Sparkles className="w-3.5 h-3.5" />
            Kurali Direct Merchant Bazaar
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Shop Kurali’s Best Stores. <br />
            <span className="text-amber-200">Compare Prices &amp; Bargain Live!</span>
          </h1>
          <p className="text-xs sm:text-sm text-amber-100 font-medium leading-relaxed">
            Find the lowest local prices across Morinda Road, Main Bazaar, Railway Road and Dana Mandi. Direct store discounts, free express delivery on eligible orders, and price negotiation chat.
          </p>

          <div className="pt-2 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="bg-black/20 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-300" /> Best Price Guarantee
            </span>
            <span className="bg-black/20 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-amber-300" /> Direct Seller Bargaining
            </span>
            <span className="bg-black/20 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-sky-300" /> Free Delivery over ₹499
            </span>
          </div>
        </div>

        {/* Decorative backdrop shapes */}
        <div className="absolute right-0 bottom-0 top-0 w-1/2 opacity-15 pointer-events-none hidden sm:block">
          <svg viewBox="0 0 400 400" className="w-full h-full object-cover">
            <circle cx="200" cy="200" r="180" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">
            Shop by Category in Kurali
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            {categories.length - 1} Departments
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Filter & Sorting Control Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              showFilters
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
            <span>Filter</span>
          </button>

          {/* Quick Sorting */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-medium hidden sm:inline">Sort:</span>
            <button
              onClick={() => setSortBy('featured')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                sortBy === 'featured'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Featured
            </button>
            <button
              onClick={() => setSortBy('price_asc')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                sortBy === 'price_asc'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Lowest Price
            </button>
            <button
              onClick={() => setSortBy('distance_asc')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                sortBy === 'distance_asc'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Nearest Store
            </button>
            <button
              onClick={() => setSortBy('discount_desc')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                sortBy === 'discount_desc'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Highest Discount
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{filteredProducts.length}</strong> products in Kurali
        </div>
      </div>

      {/* Expanded Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm space-y-4 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Price slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                <span>Maximum Price</span>
                <span className="text-amber-700">Up to ₹{maxPrice}</span>
              </div>
              <input
                type="range"
                min="100"
                max="3000"
                step="50"
                value={maxPrice}
                onChange={e => setMaxPrice(parseInt(e.target.value, 10))}
                className="w-full accent-amber-600"
              />
            </div>

            {/* In stock toggle */}
            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="stockOnly"
                checked={onlyInStock}
                onChange={e => setOnlyInStock(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="stockOnly" className="text-xs font-semibold text-slate-700 cursor-pointer">
                In-Stock items only
              </label>
            </div>

            {/* Reset */}
            <div className="flex items-center justify-end pt-4">
              <button
                onClick={() => {
                  setMaxPrice(3000);
                  setOnlyInStock(false);
                  setSortBy('featured');
                  setSelectedCategory('All Categories');
                }}
                className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-xs space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white mx-auto flex items-center justify-center shadow-md">
            <Store className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Welcome to KuraliUpdates Bazaar
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Kurali's Local Online Marketplace is Live!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              No products are listed yet. Are you a local shop owner in Kurali? Register your store, list your groceries or products, and start receiving orders from local neighborhood shoppers!
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsSellerRegisterOpen(true)}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Store className="w-4 h-4" /> Register Your Store
            </button>
            <button
              onClick={() => setIsBuyerRegisterOpen(true)}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ShoppingBag className="w-4 h-4" /> Register as Buyer
            </button>
            <button
              onClick={() => setIsDeliveryRegisterOpen(true)}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Truck className="w-4 h-4" /> Join Delivery Fleet
            </button>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No matching products found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms, changing the category, or switching to "All Localities".
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All Categories');
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            View All Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(product => {
            const extraDiscount = (product.sellerPrice * product.additionalDiscountPercent) / 100;
            const effectivePrice = Math.round(product.sellerPrice - extraDiscount);
            const totalSavings = product.mrp - effectivePrice;
            const totalPercentOff = Math.round((totalSavings / product.mrp) * 100);

            // Check if there are other sellers selling this same or similar item
            const otherSellersCount = products.filter(
              p => p.id !== product.id && (p.title === product.title || p.category === product.category)
            ).length;

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden group"
              >
                {/* Image and Badges */}
                <div className="relative aspect-square overflow-hidden bg-slate-100">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Discount Badge */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                    <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                      {totalPercentOff}% OFF
                    </span>
                    {product.additionalDiscountPercent > 0 && (
                      <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-md shadow-xs">
                        +{product.additionalDiscountPercent}% Extra Shop Discount
                      </span>
                    )}
                  </div>

                  {/* Locality Distance Badge */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-1 rounded-xl">
                    <span className="truncate">{product.sellerLocality}</span>
                    <span className="font-extrabold text-amber-300 shrink-0 ml-1">
                      {product.sellerDistanceKm} km
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Seller Name & Rating */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="truncate max-w-[150px] font-medium">
                        {product.sellerName}
                      </span>
                      <div className="flex items-center gap-1 text-amber-600 font-bold shrink-0">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{product.sellerRating}</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                      {product.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">{product.unit}</p>
                  </div>

                  {/* Pricing Breakdown: MRP vs Seller Price vs Additional Discount */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black text-slate-900">
                        ₹{effectivePrice}
                      </span>
                      <span className="text-xs text-slate-400 line-through">
                        MRP ₹{product.mrp}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                      Save ₹{totalSavings} locally
                    </div>
                  </div>

                  {/* Action Buttons: Compare Sellers & Negotiate & Add to Cart */}
                  <div className="pt-1 space-y-1.5">
                    {/* Compare with best sellers giving low price and nearby */}
                    <button
                      onClick={() => setComparingProduct(product)}
                      className="w-full py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <TrendingDown className="w-3.5 h-3.5 text-amber-700" />
                      <span>Compare Sellers &bull; Lowest Price</span>
                    </button>

                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Negotiate / Chat */}
                      <button
                        onClick={() => openChatForProduct(product)}
                        className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Negotiate price directly with seller"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                        <span>Bargain</span>
                      </button>

                      {/* Add to Cart */}
                      <button
                        onClick={() => {
                          addToCart(product, 1);
                          setIsCartOpen(true);
                        }}
                        className="py-2 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compare Sellers Modal when activated */}
      {comparingProduct && (
        <CompareSellersModal
          product={comparingProduct}
          onClose={() => setComparingProduct(null)}
        />
      )}
    </div>
  );
};
