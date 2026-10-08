import React, { useEffect, useMemo, useState } from 'react';
import { Search, Store, Tag } from 'lucide-react';
import { Product } from '../../types';

interface SearchSuggestionsProps {
  query: string;
  products: Product[];
  onSelect: (value: string) => void;
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  query,
  products,
  onSelect,
}) => {
  const [dismissedQuery, setDismissedQuery] = useState('');

  // A selected suggestion can still match the new query, so remember the
  // selected value and keep the dropdown closed until the user types again.
  useEffect(() => {
    if (query !== dismissedQuery) {
      setDismissedQuery('');
    }
  }, [query, dismissedQuery]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2 || query === dismissedQuery) return [];

    const seen = new Set<string>();
    const out: { value: string; type: 'product' | 'category' | 'seller' }[] = [];

    const add = (value: string, type: 'product' | 'category' | 'seller') => {
      const key = value.toLowerCase();
      if (!value || seen.has(key) || out.length >= 8) return;
      seen.add(key);
      out.push({ value, type });
    };

    products.forEach(p => {
      if (p.title.toLowerCase().includes(q)) add(p.title, 'product');
      if (p.category.toLowerCase().includes(q)) add(p.category, 'category');
      if (p.sellerName.toLowerCase().includes(q)) add(p.sellerName, 'seller');
      p.tags.forEach(t => {
        if (t.toLowerCase().includes(q)) add(t, 'product');
      });
    });

    return out;
  }, [query, products, dismissedQuery]);

  if (!suggestions.length) return null;

  const handleSelect = (value: string) => {
    setDismissedQuery(value);
    onSelect(value);
  };

  return (
    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50">
      <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-black text-slate-400 border-b border-slate-100">
        Suggestions
      </div>
      {suggestions.map(item => (
        <button
          key={item.type + '-' + item.value}
          onClick={() => handleSelect(item.value)}
          className="w-full px-3 py-2.5 text-left hover:bg-amber-50 flex items-center gap-2.5"
        >
          <span>
            {item.type === 'seller' ? (
              <Store className="w-4 h-4 text-blue-600" />
            ) : item.type === 'category' ? (
              <Tag className="w-4 h-4 text-emerald-600" />
            ) : (
              <Search className="w-4 h-4 text-amber-600" />
            )}
          </span>
          <span className="text-xs font-semibold text-slate-800 truncate">{item.value}</span>
          <span className="ml-auto text-[10px] text-slate-400 capitalize">{item.type}</span>
        </button>
      ))}
    </div>
  );
};
