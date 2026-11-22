import React from 'react';
import { MessageSquare, ShoppingBag, Star, Store, Plus, Minus } from 'lucide-react';
import { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  quantity: number;
  onBargain: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (product: Product) => void;
  onViewDetails: (product: Product) => void;
}

const getEffectivePrice = (product: Product) =>
  Math.round(product.sellerPrice * (1 - product.additionalDiscountPercent / 100));

export const ProductCard: React.FC<ProductCardProps> = ({
  product, quantity, onBargain, onAddToCart, onRemoveFromCart, onViewDetails,
}) => {
  const effectivePrice = getEffectivePrice(product);
  const savings = Math.max(0, product.mrp - effectivePrice);
  const discount = product.mrp > 0 ? Math.round((savings / product.mrp) * 100) : 0;

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-amber-300 hover:shadow-md">
      <button onClick={() => onViewDetails(product)} className="w-full cursor-pointer text-left" aria-label={`View ${product.title} details`}>
        <div className="relative aspect-square overflow-hidden bg-slate-50">
          {product.image ? (
            <img src={product.image} alt={product.title} loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={event => { event.currentTarget.style.display = 'none'; }} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300"><ShoppingBag className="h-9 w-9" /></div>
          )}
          {discount > 0 && <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-extrabold text-white shadow-sm">{discount}% OFF</span>}
          <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-lg bg-slate-900/75 px-2.5 py-1.5 text-[10px] text-white">
            <span className="truncate">{product.sellerLocality || 'Local seller'}</span>
            {product.sellerDistanceKm > 0 && <span className="ml-2 shrink-0 font-bold text-amber-300">{product.sellerDistanceKm} km</span>}
          </div>
        </div>
      </button>

      <div className="space-y-2.5 p-2.5 sm:p-3.5">
        <button onClick={() => onViewDetails(product)} className="w-full cursor-pointer text-left">
          <div className="mb-1 flex items-center justify-between gap-1 text-[10px] text-slate-500">
            <span className="flex min-w-0 items-center gap-1 truncate font-medium"><Store className="h-3 w-3 shrink-0" />{product.sellerName || 'Local seller'}</span>
            {product.sellerRating > 0 && <span className="flex shrink-0 items-center gap-1 font-bold text-amber-600"><Star className="h-3 w-3 fill-amber-400" />{product.sellerRating}</span>}
          </div>
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-slate-900">{product.title}</h3>
          <p className="text-[11px] text-slate-500">{product.unit}</p>
        </button>

        <div className="border-t border-slate-100 pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-slate-900">₹{effectivePrice}</span>
            {product.mrp > effectivePrice && <span className="text-[11px] text-slate-400 line-through">₹{product.mrp}</span>}
          </div>
          {savings > 0 && <p className="text-[10px] font-semibold text-emerald-700">You save ₹{savings}</p>}
          <p className={`mt-1 text-[10px] font-bold ${product.stock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {product.stock > 0 ? 'In stock' : 'Out of stock'}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          {quantity <= 0 ? (
            <button type="button" onClick={() => onAddToCart(product)} disabled={product.stock <= 0}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-extrabold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300">
              <ShoppingBag className="h-4 w-4" /> ADD
            </button>
          ) : (
            <div className="flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-1.5 py-1">
              <button type="button" onClick={() => onRemoveFromCart(product)}
                aria-label={`Remove one ${product.title} from cart`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-800 hover:bg-amber-100">
                <Minus className="h-4 w-4" />
              </button>
              <span aria-live="polite" className="min-w-5 text-center text-sm font-extrabold tabular-nums text-slate-900">{quantity}</span>
              <button type="button" onClick={() => onAddToCart(product)} disabled={product.stock <= 0 || quantity >= product.stock}
                aria-label={`Add one ${product.title} to cart`}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-2">
          <button onClick={() => onBargain(product)} disabled={product.stock <= 0}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold text-amber-800 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40">
            <MessageSquare className="h-3.5 w-3.5" />Make an offer
          </button>
        </div>
      </div>
    </article>
  );
};
