import React, { useMemo, useState } from 'react';
import { Heart, ListPlus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type { Product } from '../../types';

export type BuyerSavedList = { id: string; name: string; productIds: string[] };

interface BuyerSavedListsPanelProps {
  products: Product[];
  favoriteIds: string[];
  lists: BuyerSavedList[];
  onToggleFavorite: (productId: string) => void;
  onCreateList: (name: string) => void;
  onDeleteList: (listId: string) => void;
  onAddToList: (listId: string, productId: string) => void;
  onRemoveFromList: (listId: string, productId: string) => void;
  onAddToCart: (product: Product) => void;
  onClose: () => void;
}

export const BuyerSavedListsPanel: React.FC<BuyerSavedListsPanelProps> = ({
  products, favoriteIds, lists, onToggleFavorite, onCreateList, onDeleteList,
  onAddToList, onRemoveFromList, onAddToCart, onClose,
}) => {
  const [newListName, setNewListName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedListId, setSelectedListId] = useState(lists[0]?.id || '');
  const productById = useMemo(() => new Map(products.map(product => [product.id, product])), [products]);
  const favorites = favoriteIds.map(id => productById.get(id)).filter((p): p is Product => Boolean(p));

  const createList = () => {
    const name = newListName.trim();
    if (!name) return;
    onCreateList(name);
    setNewListName('');
  };
  const addSelectedProduct = () => {
    if (selectedListId && selectedProductId) onAddToList(selectedListId, selectedProductId);
  };

  return (
    <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm" aria-label="Saved products and lists">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div><h3 className="text-sm font-black text-slate-900">Favourites &amp; saved lists</h3><p className="text-[11px] text-slate-500">Saved on this device</p></div>
        <button type="button" onClick={onClose} aria-label="Close saved products" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input value={newListName} onChange={event => setNewListName(event.target.value)} maxLength={40}
          placeholder="Name a list, e.g. Monthly groceries" aria-label="New saved list name"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-amber-500" />
        <button type="button" onClick={createList} disabled={!newListName.trim()}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><Plus className="h-3.5 w-3.5" /> Create list</button>
      </div>

      {lists.length > 0 && (
        <div className="mb-5 flex flex-col gap-2 sm:flex-row">
          <select value={selectedListId} onChange={event => setSelectedListId(event.target.value)} aria-label="Choose saved list"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
            {lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
          </select>
          <select value={selectedProductId} onChange={event => setSelectedProductId(event.target.value)} aria-label="Choose product to save"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
            <option value="">Choose a product…</option>
            {products.map(product => <option key={product.id} value={product.id}>{product.title}</option>)}
          </select>
          <button type="button" onClick={addSelectedProduct} disabled={!selectedListId || !selectedProductId}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-40"><ListPlus className="h-3.5 w-3.5" /> Add to list</button>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-slate-800"><Heart className="h-3.5 w-3.5 text-rose-600" /> Favourites ({favorites.length})</h4>
          {favorites.length === 0 ? <p className="text-[11px] text-slate-500">Tap the heart on any product to save it here.</p> : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
              {favorites.map(product => <div key={product.id} className="flex items-center gap-2 p-2">
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">{product.title}</span>
                <button type="button" onClick={() => onAddToCart(product)} disabled={product.stock <= 0} className="rounded-lg bg-amber-500 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-40"><ShoppingBag className="mr-1 inline h-3 w-3" />Add</button>
                <button type="button" onClick={() => onToggleFavorite(product.id)} aria-label={`Remove ${product.title} from favourites`} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><X className="h-3.5 w-3.5" /></button>
              </div>)}
            </div>
          )}
        </div>

        {lists.map(list => {
          const members = list.productIds.map(id => productById.get(id)).filter((p): p is Product => Boolean(p));
          return <div key={list.id} className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between gap-2"><h4 className="truncate text-xs font-extrabold text-slate-800">{list.name} <span className="font-medium text-slate-400">({members.length})</span></h4>
              <button type="button" onClick={() => onDeleteList(list.id)} aria-label={`Delete list ${list.name}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button></div>
            {members.length === 0 ? <p className="text-[11px] text-slate-500">This list is empty. Add products using the selector above.</p> : members.map(product => <div key={product.id} className="flex items-center gap-2 border-t border-slate-100 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{product.title}</span>
              <button type="button" onClick={() => onAddToCart(product)} disabled={product.stock <= 0} className="rounded-lg bg-amber-500 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-40">Add</button>
              <button type="button" onClick={() => onRemoveFromList(list.id, product.id)} aria-label={`Remove ${product.title} from ${list.name}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-3.5 w-3.5" /></button>
            </div>)}
          </div>;
        })}
      </div>
    </section>
  );
};
