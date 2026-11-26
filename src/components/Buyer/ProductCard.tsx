import React from 'react';
import { ShoppingBag, Star, Store, Plus, Minus, Heart, Scale, MessageCircle } from 'lucide-react';
import { Product } from '../../types';
import { formatProductUnitPrice } from '../../utils/productUnitPricing';

interface ProductCardProps {
  product: Product;
  quantity: number;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (product: Product) => void;
  onViewDetails: (product: Product) => void;
  onCompare: (product: Product) => void;
  onBargain: (product: Product) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (product: Product) => void;
}

const getEffectivePrice = (product: Product) =>
  Math.round(product.sellerPrice * (1 - product.additionalDiscountPercent / 100));

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantity,
  onAddToCart,
  onRemoveFromCart,
  onViewDetails,
  onCompare,
  onBargain,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const effectivePrice = getEffectivePrice(product);
  const savings = Math.max(0, product.mrp - effectivePrice);
  const unitPrice = formatProductUnitPrice(effectivePrice, product.unit);
  const discount = product.mrp > 0 ? Math.round((savings / product.mrp) * 100) : 0;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-amber-300 hover:shadow-md">
      <button type="button" onClick={() => onViewDetails(product)} className="w-full cursor-pointer text-left"
        aria-label={`View ${product.title} details`}>
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

      {onToggleFavorite && (
        <button type="button" onClick={() => onToggleFavorite(product)}
          aria-label={isFavorite ? `Remove ${product.title} from favourites` : `Save ${product.title} to favourites`}
          aria-pressed={isFavorite}
          className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-rose-600 shadow-sm transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500">
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
        </button>
      )}

      <div className="flex flex-1 flex-col gap-2 p-2.5 sm:p-3">
        <button type="button" onClick={() => onViewDetails(product)} className="w-full cursor-pointer text-left">
          <div className="mb-1 flex items-center justify-between gap-1 text-[10px] text-slate-500">
            <span className="flex min-w-0 items-center gap-1 truncate font-medium"><Store className="h-3 w-3 shrink-0" />{product.sellerName || 'Local seller'}</span>
            {product.sellerRating > 0 && <span className="flex shrink-0 items-center gap-1 font-bold text-amber-600"><Star className="h-3 w-3 fill-amber-400" />{product.sellerRating}</span>}
          </div>
          <h3 className="line-clamp-2 min-h-[2.35rem] text-[13px] font-bold leading-snug text-slate-900">{product.title}</h3>
          <p className="text-[10px] text-slate-500">{product.unit}{unitPrice && <> · {unitPrice}</>}</p>
        </button>

        <div className="border-t border-slate-100 pt-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-lg font-black text-slate-900">₹{effectivePrice}</span>
            {product.mrp > effectivePrice && <span className="text-[11px] text-slate-400 line-through">₹{product.mrp}</span>}
            {savings > 0 && <span className="text-[10px] font-bold text-emerald-700">Save ₹{savings}</span>}
          </div>
          <p className={`mt-0.5 text-[10px] font-bold ${product.stock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {product.stock > 0 ? 'In stock' : 'Out of stock'}
          </p>
        </div>

        <div className="mt-auto space-y-2">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => onCompare(product)}
              aria-label={`Compare sellers for ${product.title}`} title="Compare sellers"
              className="flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-400">
              <Scale className="h-4 w-4 shrink-0" />
              <span className="text-[10px] font-bold">Compare</span>
            </button>
            <button type="button" onClick={() => onBargain(product)}
              aria-label={`Bargain for ${product.title}`} title="Bargain"
              className="flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span className="text-[10px] font-bold">Bargain</span>
            </button>
          </div>

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
          <button type="button" onClick={() => onViewDetails(product)}
            className="sr-only">Open full details for {product.title}</button>
        </div>
      </div>
    </article>
  );
};
