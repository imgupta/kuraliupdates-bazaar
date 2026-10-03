import React from 'react';
import { X, CheckCircle2, MapPin, Star, Tag, Truck, MessageSquare, ArrowRight, TrendingDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';

interface CompareSellersModalProps {
  product: Product;
  onClose: () => void;
}

export const CompareSellersModal: React.FC<CompareSellersModalProps> = ({ product, onClose }) => {
  const { products, sellers, addToCart, openChatForProduct, setIsCartOpen } = useApp();

  // Find equivalent or similar products across different approved sellers
  // Match by title keywords or category
  const titleKeywords = product.title.toLowerCase().split(' ').slice(0, 3).join(' ');
  const matchingProducts = products.filter(p => {
    const isSameCategory = p.category === product.category;
    const isSimilarTitle = p.title.toLowerCase().includes(titleKeywords) ||
      product.title.toLowerCase().includes(p.title.toLowerCase().split(' ').slice(0, 2).join(' '));
    return isSimilarTitle || (isSameCategory && (p.title === product.title || p.tags.some(t => product.tags.includes(t))));
  });

  // Ensure unique sellers represented
  const candidateProducts = matchingProducts.length > 1 ? matchingProducts : products.filter(p => p.category === product.category);

  // Calculate effective price for each
  const comparisonList = candidateProducts.map(item => {
    const sellerObj = sellers.find(s => s.id === item.sellerId);
    const extraDiscountAmount = (item.sellerPrice * item.additionalDiscountPercent) / 100;
    const effectivePrice = Math.round(item.sellerPrice - extraDiscountAmount);
    const totalSavings = item.mrp - effectivePrice;
    const savingsPercent = Math.round((totalSavings / item.mrp) * 100);

    return {
      product: item,
      seller: sellerObj,
      effectivePrice,
      totalSavings,
      savingsPercent,
      distanceKm: item.sellerDistanceKm,
    };
  });

  // Sort by effective price ascending to highlight lowest price, and find closest
  const lowestPrice = Math.min(...comparisonList.map(c => c.effectivePrice));
  const minDistance = Math.min(...comparisonList.map(c => c.distanceKm));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase">
                Smart Kurali Price Match
              </span>
              <span className="text-xs text-amber-100">Compare Local Sellers</span>
            </div>
            <h2 className="text-lg font-extrabold tracking-tight mt-0.5">
              Comparing sellers for: {product.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight Summary Strip */}
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-semibold">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            <span>
              Best price found in Kurali: <strong className="text-emerald-700 text-sm">₹{lowestPrice}</strong> (Save up to ₹{product.mrp - lowestPrice})
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span>Closest seller is just <strong>{minDistance} km</strong> away</span>
          </div>
        </div>

        {/* Comparison Cards / Matrix */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisonList.map(({ product: p, seller, effectivePrice, totalSavings, savingsPercent, distanceKm }, idx) => {
              const isLowestPrice = effectivePrice === lowestPrice;
              const isClosest = distanceKm === minDistance;

              return (
                <div
                  key={`${p.id}-${idx}`}
                  className={`relative rounded-2xl p-4 flex flex-col justify-between border-2 transition-all ${
                    isLowestPrice
                      ? 'border-emerald-500 bg-emerald-50/30 shadow-md ring-2 ring-emerald-200'
                      : 'border-slate-200 bg-white hover:border-amber-300'
                  }`}
                >
                  {/* Badge Highlights */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {isLowestPrice && (
                      <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        <CheckCircle2 className="w-3 h-3" /> LOWEST PRICE
                      </span>
                    )}
                    {isClosest && (
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> NEAREST ({distanceKm} km)
                      </span>
                    )}
                    {p.additionalDiscountPercent > 0 && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        +{p.additionalDiscountPercent}% Store Off
                      </span>
                    )}
                  </div>

                  {/* Seller Details */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                      {p.sellerName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{p.sellerLocality}</span>
                      <span>&bull;</span>
                      <span className="font-semibold text-slate-700">{distanceKm} km</span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-slate-800">{p.sellerRating}</span>
                      <span className="text-slate-400 text-[11px]">
                        ({seller?.reviewCount || 45} reviews)
                      </span>
                    </div>
                  </div>

                  {/* Product Preview & Pricing Breakdown */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={p.image}
                        alt={p.title}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{p.title}</p>
                        <p className="text-[11px] text-slate-400">Pack: {p.unit}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Original MRP:</span>
                        <span className="line-through">₹{p.mrp}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Seller Base Rate:</span>
                        <span>₹{p.sellerPrice}</span>
                      </div>
                      {p.additionalDiscountPercent > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium">
                          <span>Extra Shop Discount:</span>
                          <span>-{p.additionalDiscountPercent}%</span>
                        </div>
                      )}
                      <div className="pt-1 border-t border-slate-200 flex justify-between items-baseline font-extrabold text-slate-900">
                        <span className="text-xs">Final Price:</span>
                        <div className="text-right">
                          <span className="text-base text-emerald-600">₹{effectivePrice}</span>
                          <span className="block text-[10px] text-emerald-700 font-semibold">
                            You Save ₹{totalSavings} ({savingsPercent}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delivery & Perks */}
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3 text-slate-400" />
                        Free delivery on ₹{seller?.minOrderForFreeDelivery || 399}
                      </span>
                      <span className="text-emerald-700 font-bold">In Stock ({p.stock})</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-2 space-y-2">
                    <button
                      onClick={() => {
                        addToCart(p, 1);
                        setIsCartOpen(true);
                        onClose();
                      }}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                        isLowestPrice
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Buy from {p.sellerName.split(' ')[0]} at ₹{effectivePrice}
                    </button>

                    <button
                      onClick={() => {
                        openChatForProduct(p, Math.round(effectivePrice * 0.92));
                        onClose();
                      }}
                      className="w-full py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                      Negotiate / Bargain
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>All stores located within Kurali Municipal limits. Direct local warranty & fresh stock.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
