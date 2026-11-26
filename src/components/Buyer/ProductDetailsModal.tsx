import React from 'react';
import { CheckCircle2, MapPin, MessageSquare, ShoppingBag, Star, Store, Truck, X } from 'lucide-react';
import { Product } from '../../types';

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onBargain: (product: Product) => void;
  onCompare: (product: Product) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  onBargain,
  onCompare,
}) => {
  const price = Math.round(product.sellerPrice * (1 - product.additionalDiscountPercent / 100));
  const savings = Math.max(0, product.mrp - price);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={product.title}
    >
      <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-black text-slate-900 sm:text-xl">{product.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-2">
          <div className="min-h-[220px] bg-slate-100 md:min-h-[280px]">
            {product.image ? (
              <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex min-h-[220px] items-center justify-center text-slate-300 md:min-h-[280px]">
                <ShoppingBag className="h-14 w-14" />
              </div>
            )}
          </div>

          <div className="space-y-5 p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:p-7">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black">₹{price}</span>
              <span className="text-sm text-slate-400 line-through">MRP ₹{product.mrp}</span>
            </div>
            <p className="text-sm font-bold text-emerald-700">You save ₹{savings} · {product.unit}</p>

            <div className="space-y-2 rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Store className="h-4 w-4" />
                {product.sellerName || 'Seller details unavailable'}
              </div>
              {(product.sellerLocality || product.sellerDistanceKm > 0) && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="h-4 w-4" />
                  {product.sellerLocality}
                  {product.sellerLocality && product.sellerDistanceKm > 0 ? ' · ' : ''}
                  {product.sellerDistanceKm > 0 ? `${product.sellerDistanceKm} km` : ''}
                </div>
              )}
              {product.sellerRating > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Star className="h-4 w-4" />
                  {product.sellerRating} seller rating
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-emerald-700">
                <Truck className="h-4 w-4" />
                Local delivery available
              </div>
            </div>

            {product.description && <p className="text-sm leading-6 text-slate-600">{product.description}</p>}

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onCompare(product)} className="rounded-xl border bg-amber-50 py-2.5 text-xs font-bold">
                Compare sellers
              </button>
              <button
                type="button"
                onClick={() => onBargain(product)}
                className="flex items-center justify-center gap-1 rounded-xl border py-2.5 text-xs font-bold"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Bargain
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={product.stock <= 0}
                onClick={() => onAddToCart(product)}
                className="flex items-center justify-center gap-1 rounded-xl bg-amber-500 py-3 text-xs font-black text-white disabled:bg-slate-300"
              >
                <ShoppingBag className="h-4 w-4" />
                Add to cart
              </button>
              <button
                type="button"
                disabled={product.stock <= 0}
                onClick={() => onBuyNow(product)}
                className="flex items-center justify-center gap-1 rounded-xl bg-slate-900 py-3 text-xs font-black text-white disabled:bg-slate-300"
              >
                <CheckCircle2 className="h-4 w-4" />
                Buy now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
