import React, { useState, useMemo } from 'react';
import {
  Search,
  Truck,
  Sparkles,
  ShoppingBag,
  SlidersHorizontal,
  Store,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { CompareSellersModal } from './CompareSellersModal';
import { ProductCard } from './ProductCard';
import { ProductDetailsModal } from './ProductDetailsModal';

interface BuyerHomeProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onOpenTracking: (orderId: string) => void;
  onBuyNow: (product: Product) => void;
}

export const BuyerHome: React.FC<BuyerHomeProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  onOpenTracking,
  onBuyNow,
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
    setIsCartOpen
  } = useApp();

  const [sortBy, setSortBy] = useState<'price_asc' | 'distance_asc' | 'discount_desc' | 'featured'>('featured');
  const [maxPrice, setMaxPrice] = useState<number>(3000);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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

  // Precompute related-product counts once instead of filtering the full catalog inside every card render.
  const relatedProductCountById = useMemo(() => {
    const titleCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();

    products.forEach(product => {
      titleCounts.set(product.title, (titleCounts.get(product.title) || 0) + 1);
      categoryCounts.set(product.category, (categoryCounts.get(product.category) || 0) + 1);
    });

    return new Map(
      products.map(product => [
        product.id,
        Math.max(
          0,
          (titleCounts.get(product.title) || 0) +
            (categoryCounts.get(product.category) || 0) -
            2
        ),
      ])
    );
  }, [products]);

  // Check if any recent active order exists for quick tracking
  const latestActiveOrder = orders.find(
    o => o.status !== 'delivered' && o.status !== 'cancelled'
  );

  return (
    <div className="space-y-4 sm:space-y-5 pb-12">
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

      {/* Category + Filter Controls */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">Categories</h2>
            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
              {categories.length - 1} available
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
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
        <button
          onClick={() => setShowFilters(!showFilters)}
          aria-label="Filter and sort products"
          className={`shrink-0 mt-6 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${showFilters ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden sm:inline">Filter &amp; Sort</span>
          <span className="sm:hidden">Filter</span>
        </button>
      </div>
      <div className="flex justify-end">
        <span className="text-xs text-slate-500">
          <strong className="text-slate-800">{filteredProducts.length}</strong> products
        </span>
      </div>

      {/* Expanded Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm space-y-4 animate-in fade-in">
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

      {/* Applied filter summary keeps the current shopping scope visible while browsing. */}
      {(searchQuery.trim() || selectedCategory !== 'All Categories' || onlyInStock || maxPrice < 3000) && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-500 shrink-0">Active:</span>
          {searchQuery.trim() && (
            <button onClick={() => setSearchQuery('')} className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold whitespace-nowrap cursor-pointer">
              Search: “{searchQuery.trim()}” ×
            </button>
          )}
          {selectedCategory !== 'All Categories' && (
            <button onClick={() => setSelectedCategory('All Categories')} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold whitespace-nowrap cursor-pointer">
              {selectedCategory} ×
            </button>
          )}
          {onlyInStock && (
            <button onClick={() => setOnlyInStock(false)} className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold whitespace-nowrap cursor-pointer">
              In stock ×
            </button>
          )}
          {maxPrice < 3000 && (
            <button onClick={() => setMaxPrice(3000)} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold whitespace-nowrap cursor-pointer">
              Up to ₹{maxPrice} ×
            </button>
          )}
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
              No products are available in your selected area yet. Try another locality, search term, or category. New local deals will appear here as soon as they go live.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
              <Search className="w-3.5 h-3.5 text-amber-600" />
              Search products above
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
              Add to cart when stores go live
            </span>
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
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {filteredProducts.map(product => {
            return (
              <ProductCard
                key={product.id}
                product={product}
                relatedSellerCount={relatedProductCountById.get(product.id) || 0}
                onCompare={setComparingProduct}
                onBargain={openChatForProduct}
                onAddToCart={(item) => {
                  addToCart(item, 1);
                  setIsCartOpen(true);
                }}
                onBuyNow={onBuyNow}
                onViewDetails={setSelectedProduct}
              />
            );
          })}
        </div>
      )}

      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(item) => {
            addToCart(item, 1);
            setSelectedProduct(null);
            setIsCartOpen(true);
          }}
          onBuyNow={(item) => {
            setSelectedProduct(null);
            onBuyNow(item);
          }}
          onBargain={(item) => {
            setSelectedProduct(null);
            openChatForProduct(item);
          }}
          onCompare={(item) => {
            setSelectedProduct(null);
            setComparingProduct(item);
          }}
        />
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
