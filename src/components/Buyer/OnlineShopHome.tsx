import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Sparkles,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Heart,
  Clock3,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { matchesBuyerSearch } from '../../utils/buyerSearch';
import { CompareSellersModal } from './CompareSellersModal';
import { ProductCard } from './ProductCard';
import { BuyerSavedListsPanel, type BuyerSavedList } from './BuyerSavedListsPanel';
import { ProductDetailsModal } from './ProductDetailsModal';

const SAVED_ITEMS_KEY = 'kurali_buyer_saved_items_v1';
const RECENT_PRODUCTS_KEY = 'kurali_buyer_recent_products_v1';
type SavedItemsState = { favoriteIds: string[]; lists: BuyerSavedList[] };
const loadSavedItems = (): SavedItemsState => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_ITEMS_KEY) || '{}');
    return {
      favoriteIds: Array.isArray(parsed.favoriteIds) ? parsed.favoriteIds.filter((id: unknown) => typeof id === 'string') : [],
      lists: Array.isArray(parsed.lists) ? parsed.lists.filter((list: any) => list && typeof list.id === 'string' && typeof list.name === 'string' && Array.isArray(list.productIds)) : [],
    };
  } catch { return { favoriteIds: [], lists: [] }; }
};

interface BuyerHomeProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onBuyNow: (product: Product) => void;
}

export const BuyerHome: React.FC<BuyerHomeProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  onBuyNow,
}) => {
  const {
    products,
    cart,
    addToCart,
    updateCartQuantity,
    openChatForProduct,
    selectedCityLocality,
    comparingProduct,
    setComparingProduct,
    showToast,
  } = useApp();

  const [sortBy, setSortBy] = useState<'price_asc' | 'distance_asc' | 'discount_desc' | 'featured'>('featured');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [savedItems, setSavedItems] = useState<SavedItemsState>(() => loadSavedItems());
  const [showSavedItems, setShowSavedItems] = useState(false);
  const [recentProductIds, setRecentProductIds] = useState<string[]>(() => {
    try { const value = JSON.parse(localStorage.getItem(RECENT_PRODUCTS_KEY) || '[]'); return Array.isArray(value) ? value.filter((id: unknown) => typeof id === 'string').slice(0, 8) : []; } catch { return []; }
  });
  const openProductDetails = (product: Product) => {
    setRecentProductIds(current => [product.id, ...current.filter(id => id !== product.id)].slice(0, 8));
    setSelectedProduct(product);
  };
  useEffect(() => { try { localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(recentProductIds)); } catch { /* Recent history is an optional convenience. */ } }, [recentProductIds]);
  useEffect(() => {
    try { localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(savedItems)); } catch { /* Storage may be disabled; current session still works. */ }
  }, [savedItems]);
  const toggleFavorite = (productId: string) => setSavedItems(current => ({
    ...current,
    favoriteIds: current.favoriteIds.includes(productId)
      ? current.favoriteIds.filter(id => id !== productId)
      : [...current.favoriteIds, productId],
  }));
  const createSavedList = (name: string) => setSavedItems(current => ({
    ...current,
    lists: [...current.lists, { id: globalThis.crypto?.randomUUID?.() || `list-${Date.now()}`, name, productIds: [] }],
  }));
  const deleteSavedList = (listId: string) => setSavedItems(current => ({
    ...current, lists: current.lists.filter(list => list.id !== listId),
  }));
  const addProductToList = (listId: string, productId: string) => setSavedItems(current => ({
    ...current, lists: current.lists.map(list => list.id === listId && !list.productIds.includes(productId)
      ? { ...list, productIds: [...list.productIds, productId] } : list),
  }));
  const removeProductFromList = (listId: string, productId: string) => setSavedItems(current => ({
    ...current, lists: current.lists.map(list => list.id === listId
      ? { ...list, productIds: list.productIds.filter(id => id !== productId) } : list),
  }));

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => set.add(p.category));
    return ['All Categories', ...Array.from(set)];
  }, [products]);

  // Filter and sort products. The backend catalog endpoint already restricts
  // results to approved sellers, so do not re-filter against the local seller
  // cache. That cache intentionally contains only pending admin applications
  // during backend sync and can therefore omit approved stores.
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
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
          const searchableValues = [p.title, p.sellerName, p.sellerLocality, p.category, ...p.tags];
          if (!matchesBuyerSearch(searchQuery, searchableValues)) return false;
        }

        // Stock filter
        if (onlyInStock && p.stock <= 0) {
          return false;
        }

        // Max price filter (effective price)
        const effectivePrice = Math.round(
          p.sellerPrice * (1 - p.additionalDiscountPercent / 100)
        );
        if (maxPrice !== null && effectivePrice > maxPrice) {
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
  }, [products, selectedCategory, selectedCityLocality, searchQuery, onlyInStock, maxPrice, sortBy]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-12">
      {/* Category discovery: compact, visual and easy to scan on mobile */}
      <section aria-label="Shop by category" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-700">Explore Kurali</p>
            <h2 className="text-base font-black tracking-tight text-slate-900">Shop by category</h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">{categories.length - 1} categories</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {categories.map(cat => {
            const count = cat === 'All Categories' ? products.length : products.filter(product => product.category === cat).length;
            const active = selectedCategory === cat;
            const icon = cat === 'All Categories' ? '🛍️' : /fruit|veget|fresh/i.test(cat) ? '🥬' : /dairy|milk|bread|egg/i.test(cat) ? '🥛' : /snack|drink|beverage|juice/i.test(cat) ? '🥤' : /personal|beauty|care|health/i.test(cat) ? '🧴' : /home|kitchen|clean/i.test(cat) ? '🏠' : /grocery|staple|atta|rice|dal/i.test(cat) ? '🌾' : '🧺';
            return (
              <button key={cat} type="button" onClick={() => setSelectedCategory(cat)} aria-pressed={active}
                className={`group flex min-h-[88px] flex-col items-start justify-between rounded-2xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 ${active ? 'border-amber-500 bg-amber-50 shadow-sm ring-1 ring-amber-200' : 'border-slate-200 bg-white hover:border-amber-200'}`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-xl group-hover:bg-white">{icon}</span>
                <span className="mt-2 line-clamp-2 text-[11px] font-extrabold leading-tight text-slate-800">{cat === 'All Categories' ? 'Everything' : cat}</span>
                <span className="text-[10px] font-medium text-slate-500">{count} items</span>
              </button>
            );
          })}
        </div>
      </section>

      {!searchQuery.trim() && selectedCategory === 'All Categories' && (
        <>
          {products.some(product => product.isFeatured) && (
            <section className="space-y-3" aria-label="Featured local products">
              <div className="flex items-end justify-between gap-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-amber-700">Picked for Kurali</p><h2 className="text-base font-black text-slate-900">Featured local finds</h2></div><button type="button" onClick={() => setSortBy('featured')} className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">Explore all <ArrowRight className="h-3 w-3" /></button></div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {products.filter(product => product.isFeatured && product.stock > 0).slice(0, 4).map(product => <button key={product.id} type="button" onClick={() => openProductDetails(product)} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"><div className="aspect-[5/3] overflow-hidden bg-slate-50">{product.image ? <img src={product.image} alt={product.title} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-2xl">🛍️</div>}</div><div className="p-2.5"><p className="line-clamp-1 text-xs font-extrabold text-slate-900">{product.title}</p><p className="mt-1 text-[10px] text-slate-500">{product.sellerName}</p><p className="mt-1 text-sm font-black text-amber-700">₹{Math.round(product.sellerPrice * (1 - product.additionalDiscountPercent / 100))}</p></div></button>)}
              </div>
            </section>
          )}
          {products.some(product => product.mrp > Math.round(product.sellerPrice * (1 - product.additionalDiscountPercent / 100))) && (
            <section className="space-y-3" aria-label="Deals and savings">
              <div className="flex items-end justify-between gap-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-rose-600">Save on your basket</p><h2 className="flex items-center gap-1.5 text-base font-black text-slate-900"><Flame className="h-4 w-4 text-rose-500" /> Deals worth a look</h2></div><span className="text-[10px] font-semibold text-slate-500">Actual catalogue prices</span></div>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
                {[...products].filter(product => product.stock > 0 && product.mrp > Math.round(product.sellerPrice * (1 - product.additionalDiscountPercent / 100))).sort((a,b) => (b.mrp - b.sellerPrice * (1-b.additionalDiscountPercent/100)) - (a.mrp - a.sellerPrice * (1-a.additionalDiscountPercent/100))).slice(0, 8).map(product => { const price = Math.round(product.sellerPrice * (1 - product.additionalDiscountPercent / 100)); const saving = Math.max(0, product.mrp - price); return <button key={product.id} type="button" onClick={() => openProductDetails(product)} className="w-36 shrink-0 overflow-hidden rounded-2xl border border-rose-100 bg-white text-left shadow-sm transition hover:border-rose-300 hover:shadow-md sm:w-44"><div className="relative aspect-square bg-slate-50">{product.image ? <img src={product.image} alt={product.title} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl">🏷️</div>}<span className="absolute left-2 top-2 rounded-full bg-rose-600 px-2 py-1 text-[9px] font-extrabold text-white">SAVE ₹{saving}</span></div><div className="p-2.5"><p className="line-clamp-1 text-xs font-bold text-slate-800">{product.title}</p><p className="mt-1 text-sm font-black text-slate-900">₹{price} <span className="text-[10px] font-medium text-slate-400 line-through">₹{product.mrp}</span></p><span className="mt-1 block text-[10px] text-slate-500">{product.sellerName}</span></div></button>; })}
              </div>
            </section>
          )}
          {recentProductIds.some(id => products.some(product => product.id === id)) && (
            <section className="space-y-3" aria-label="Recently viewed products"><div className="flex items-center justify-between"><h2 className="flex items-center gap-1.5 text-sm font-black text-slate-900"><Clock3 className="h-4 w-4 text-slate-500" /> Recently viewed</h2><button type="button" onClick={() => setRecentProductIds([])} className="text-[10px] font-bold text-slate-500 hover:text-rose-600">Clear history</button></div><div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">{recentProductIds.map(id => products.find(product => product.id === id)).filter((product): product is Product => Boolean(product)).map(product => <button key={product.id} type="button" onClick={() => openProductDetails(product)} className="flex w-52 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-left hover:border-amber-300"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-50">{product.image && <img src={product.image} alt="" loading="lazy" className="h-full w-full object-cover" />}</div><span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-800">{product.title}</span><span className="text-[11px] font-extrabold text-amber-700">₹{Math.round(product.sellerPrice * (1-product.additionalDiscountPercent/100))}</span></span></button>)}</div></section>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <div className="min-w-0">
          <p className="text-xs font-extrabold text-slate-900">Find your everyday essentials</p>
          <p className="text-[10px] text-slate-500">Browse local sellers and compare what’s available</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="buyer-sort" className="sr-only">Sort products</label>
          <select id="buyer-sort" value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)}
            className="max-w-[145px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100">
            <option value="featured">Featured first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="discount_desc">Biggest savings</option>
            <option value="distance_asc">Nearest seller</option>
          </select>
          <button type="button" onClick={() => setShowFilters(open => !open)} aria-expanded={showFilters} aria-label="Filter products"
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${showFilters ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filter
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setShowSavedItems(open => !open)} aria-expanded={showSavedItems}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">
          <Heart className="h-3.5 w-3.5" /> Saved ({savedItems.favoriteIds.length})
        </button>
        <span className="text-xs text-slate-500"><strong className="text-slate-800">{filteredProducts.length}</strong> products</span>
      </div>
      {showSavedItems && (
        <BuyerSavedListsPanel products={products} favoriteIds={savedItems.favoriteIds} lists={savedItems.lists}
          onToggleFavorite={toggleFavorite} onCreateList={createSavedList} onDeleteList={deleteSavedList}
          onAddToList={addProductToList} onRemoveFromList={removeProductFromList}
          onAddToCart={product => { addToCart(product, 1); showToast(`${product.title} added to your basket.`, 'success'); }} onClose={() => setShowSavedItems(false)} />
      )}

      {/* Expanded Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm space-y-4 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                <span>Maximum Price</span>
                <span className="text-amber-700">{maxPrice === null ? 'Any price' : `Up to ₹${maxPrice}`}</span>
              </div>
              <input type="range" min="100" max="10000" step="50" value={maxPrice ?? 10000}
                onChange={e => setMaxPrice(parseInt(e.target.value, 10))} className="w-full accent-amber-600" />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input type="checkbox" id="stockOnly" checked={onlyInStock}
                onChange={e => setOnlyInStock(e.target.checked)} className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
              <label htmlFor="stockOnly" className="text-xs font-semibold text-slate-700 cursor-pointer">In-Stock items only</label>
            </div>
            <div className="flex items-center justify-end pt-4">
              <button onClick={() => {
                setMaxPrice(null); setOnlyInStock(false); setSortBy('featured'); setSelectedCategory('All Categories');
              }} className="text-xs font-bold text-rose-600 hover:underline cursor-pointer">Reset All Filters</button>
            </div>
          </div>
        </div>
      )}

      {(searchQuery.trim() || selectedCategory !== 'All Categories' || onlyInStock || maxPrice !== null) && (
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
          {maxPrice !== null && (
            <button onClick={() => setMaxPrice(null)} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold whitespace-nowrap cursor-pointer">
              Up to ₹{maxPrice} ×
            </button>
          )}
        </div>
      )}

      {products.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-xs space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white mx-auto flex items-center justify-center shadow-md"><Store className="w-8 h-8" /></div>
          <div className="space-y-2 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold"><Sparkles className="w-3.5 h-3.5" /> Welcome to KuraliUpdates Bazaar</div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Kurali's Local Online Marketplace is Live!</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">No products are available in your selected area yet. Try another locality, search term, or category. New local deals will appear here as soon as they go live.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold"><Search className="w-3.5 h-3.5 text-amber-600" />Search products above</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold"><ShoppingBag className="w-3.5 h-3.5 text-amber-600" />Add to cart when stores go live</span>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center"><Search className="w-6 h-6" /></div>
          <h3 className="text-base font-bold text-slate-800">No matching products found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Try adjusting your search terms, changing the category, or switching to "All Localities".</p>
          <button onClick={() => { setSearchQuery(''); setSelectedCategory('All Categories'); }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer">View All Products</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product}
              quantity={cart.find(item => item.product.id === product.id)?.quantity || 0}
              onAddToCart={(item) => { addToCart(item, 1); showToast(`${item.title} added to your basket.`, 'success'); }}
              onRemoveFromCart={(item) => {
                const quantity = cart.find(line => line.product.id === item.id)?.quantity || 0;
                updateCartQuantity(item.id, quantity - 1);
              }}
              onViewDetails={openProductDetails}
              onCompare={item => setComparingProduct(item)}
              onBargain={item => openChatForProduct(item)}
              isFavorite={savedItems.favoriteIds.includes(product.id)}
              onToggleFavorite={product => toggleFavorite(product.id)}
            />
          ))}
        </div>
      )}

      {selectedProduct && (
        <ProductDetailsModal product={selectedProduct} onClose={() => setSelectedProduct(null)}
          onAddToCart={(item) => { addToCart(item, 1); setSelectedProduct(null); }}
          onBuyNow={(item) => { setSelectedProduct(null); onBuyNow(item); }}
          onBargain={(item) => { setSelectedProduct(null); openChatForProduct(item); }}
          onCompare={(item) => { setSelectedProduct(null); setComparingProduct(item); }}
        />
      )}

      {comparingProduct && <CompareSellersModal product={comparingProduct} onClose={() => setComparingProduct(null)} />}
    </div>
  );
};

export const OnlineShopHome = BuyerHome;