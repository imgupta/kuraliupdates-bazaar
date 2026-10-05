import React, { useEffect, useMemo, useState } from 'react';
import { Store, PlusCircle, Package, ShoppingBag, Percent, Trash2, Pencil, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PRODUCT_CATEGORIES } from '../../data/initialData';
import { Product, Seller } from '../../types';
import { bazaarApi } from '../../services/api';

const mapProduct = (p: any, seller?: any): Product => ({
  id: p.productId,
  sellerId: p.sellerId || seller?.sellerId || '',
  sellerName: p.seller?.name || seller?.storeName || '',
  sellerLocality: p.seller?.locality || seller?.locality || '',
  sellerDistanceKm: Number(p.seller?.distanceKm ?? seller?.distanceKm ?? 1),
  sellerRating: Number(p.seller?.rating ?? seller?.rating ?? 0),
  rating: 0,
  reviewCount: 0,
  isAvailable: Number(p.stock ?? 0) > 0,
  title: p.title,
  category: p.category,
  description: p.description || '',
  image: p.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
  mrp: Number(p.mrp || 0),
  sellerPrice: Number(p.sellerPrice || 0),
  additionalDiscountPercent: Number(p.additionalDiscountPercent || 0),
  stock: Number(p.stock || 0),
  unit: p.unit || '1 pc',
  tags: Array.isArray(p.tags) ? p.tags : [],
  isFeatured: Number(p.isFeatured) === 1 || p.isFeatured === true,
});

export const SellerDashboard: React.FC = () => {
  const { user, setIsSellerRegisterOpen, showToast } = useApp();
  const [seller, setSeller] = useState<any | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [discountMin, setDiscountMin] = useState('500');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState('5');
  const [discountDescription, setDiscountDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'add' | 'discounts'>('inventory');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const emptyForm = { title: '', category: PRODUCT_CATEGORIES[0], mrp: '', sellerPrice: '', additionalDiscount: '0', stock: '25', unit: '1 kg', image: '', description: '' };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const [remoteSeller, remoteProducts, remoteOrders] = await Promise.all([
        bazaarApi.getCurrentSeller(),
        bazaarApi.getSellerProducts(),
        bazaarApi.getSellerOrders(),
        bazaarApi.getSellerDiscounts(),
      ]);
      setSeller(remoteSeller);
      setProducts((remoteProducts || []).map((p: any) => mapProduct(p, remoteSeller)));
      setOrders(remoteOrders || []);
      setDiscounts((remoteDiscounts || []).map((d: any) => ({ ...d })));
      if (!remoteSeller) showToast('Seller store profile could not be loaded. Please sign in again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sellerStatus = String(seller?.status || 'PENDING').toLowerCase();
  const isApproved = sellerStatus === 'approved';

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      title: p.title, category: p.category, mrp: String(p.mrp), sellerPrice: String(p.sellerPrice),
      additionalDiscount: String(p.additionalDiscountPercent || 0), stock: String(p.stock), unit: p.unit,
      image: p.image || '', description: p.description || '',
    });
    setActiveTab('add');
  };

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const mrp = Number(form.mrp), price = Number(form.sellerPrice), stock = Number(form.stock), discount = Number(form.additionalDiscount || 0);
    if (!form.title.trim() || !Number.isFinite(mrp) || !Number.isFinite(price) || mrp <= 0 || price <= 0) {
      showToast('Enter a valid product name, MRP and selling price.', 'error'); return;
    }
    if (price > mrp) { showToast('Seller price cannot be higher than MRP.', 'error'); return; }
    if (discount < 0 || discount > 100 || stock < 0) { showToast('Check discount and stock values.', 'error'); return; }

    const payload = {
      title: form.title.trim(), category: form.category, description: form.description.trim(),
      imageUrl: form.image.trim() || null, mrp, sellerPrice: price,
      additionalDiscountPercent: discount, stock: Math.floor(stock), unit: form.unit.trim() || '1 pc',
      tags: ['Kurali', form.category], isFeatured: false,
    };

    setSaving(true);
    try {
      const saved = editingId
        ? await bazaarApi.updateSellerProduct(editingId, payload)
        : await bazaarApi.createSellerProduct(payload);
      if (!saved) throw new Error('No response from seller service');
      const mapped = mapProduct(saved, seller);
      setProducts(prev => editingId ? prev.map(p => p.id === mapped.id ? mapped : p) : [mapped, ...prev]);
      showToast(editingId ? 'Product updated successfully.' : 'Product published successfully.', 'success');
      setForm(emptyForm); setEditingId(null); setActiveTab('inventory');
    } catch (err: any) {
      showToast(err?.message || 'Unable to save product.', 'error');
    } finally { setSaving(false); }
  };

  const removeProduct = async (id: string) => {
    if (!window.confirm('Remove this product from your store?')) return;
    try {
      await bazaarApi.deleteSellerProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast('Product removed from inventory.', 'success');
    } catch (err: any) { showToast(err?.message || 'Unable to remove product.', 'error'); }
  };

  const addDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    const minBillAmount = Number(discountMin), value = Number(discountValue);
    if (!Number.isFinite(minBillAmount) || minBillAmount < 0 || !Number.isFinite(value) || value <= 0) {
      showToast('Enter valid discount values.', 'error'); return;
    }
    if (discountType === 'percentage' && value > 100) { showToast('Percentage cannot exceed 100%.', 'error'); return; }
    try {
      const saved = await bazaarApi.createSellerDiscount({
        minBillAmount,
        discountPercentage: discountType === 'percentage' ? value : null,
        flatDiscount: discountType === 'flat' ? value : null,
        description: discountDescription.trim() || (discountType === 'percentage' ? `${value}% OFF` : `₹${value} OFF`),
      });
      setDiscounts(prev => [...prev, saved].sort((a,b) => Number(a.minBillAmount)-Number(b.minBillAmount)));
      setDiscountDescription('');
      showToast('Bill discount rule added.', 'success');
    } catch (err: any) { showToast(err?.message || 'Unable to add discount.', 'error'); }
  };

  const removeDiscount = async (ruleId: string) => {
    try {
      await bazaarApi.deleteSellerDiscount(ruleId);
      setDiscounts(prev => prev.filter(d => d.ruleId !== ruleId));
      showToast('Discount rule removed.', 'success');
    } catch (err: any) { showToast(err?.message || 'Unable to remove discount.', 'error'); }
  };

  const advanceOrder = async (order: any) => {
    const next = String(order.status).toUpperCase() === 'PLACED' ? 'ACCEPTED_BY_SELLER' : 'READY_FOR_PICKUP';
    try {
      const saved = await bazaarApi.updateSellerOrderStatus(order.orderId, next);
      setOrders(prev => prev.map(o => o.orderId === order.orderId ? saved : o));
      showToast(next === 'ACCEPTED_BY_SELLER' ? 'Order accepted.' : 'Order marked ready for pickup.', 'success');
    } catch (err: any) { showToast(err?.message || 'Unable to update order.', 'error'); }
  };

  const sellerProducts = useMemo(() => products, [products]);

  if (loading) return <div className="p-10 text-center text-sm font-bold text-slate-500">Loading your store…</div>;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center"><Store className="w-8 h-8 text-blue-200" /></div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black">{seller?.storeName || 'Your Store'}</h1>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20">{sellerStatus}</span>
              </div>
              <p className="text-xs text-blue-100 mt-1">Owner: <strong>{seller?.ownerName || user.name}</strong> • Locality: <strong>{seller?.locality || user.locality}</strong></p>
              {!isApproved && <p className="text-xs text-amber-200 mt-2">Inventory publishing is enabled only after Admin approval.</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="px-3 py-2.5 bg-blue-800/60 rounded-xl text-xs font-bold flex items-center gap-1.5"><RefreshCw className="w-4 h-4" />Refresh</button>
            <button onClick={() => { setEditingId(null); setForm(emptyForm); setActiveTab('add'); }} disabled={!isApproved} className="px-4 py-2.5 bg-white text-blue-800 font-bold rounded-xl text-xs disabled:opacity-50 flex items-center gap-1.5"><PlusCircle className="w-4 h-4" />Add Inventory</button>
            <button onClick={() => setIsSellerRegisterOpen(true)} className="px-3 py-2.5 bg-blue-800/60 rounded-xl text-xs font-bold">Update Store</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/10 p-3 rounded-2xl"><span className="text-[10px] uppercase font-bold text-blue-200 block">Listed Products</span><span className="text-xl font-black">{sellerProducts.length}</span></div>
          <div className="bg-white/10 p-3 rounded-2xl"><span className="text-[10px] uppercase font-bold text-blue-200 block">Total Orders</span><span className="text-xl font-black">{orders.length}</span></div>
          <div className="bg-white/10 p-3 rounded-2xl"><span className="text-[10px] uppercase font-bold text-blue-200 block">Rating</span><span className="text-xl font-black">★ {seller?.rating || 0}</span></div>
          <div className="bg-white/10 p-3 rounded-2xl"><span className="text-[10px] uppercase font-bold text-blue-200 block">Store ID</span><span className="text-sm font-black mt-1 block">{seller?.sellerId || '—'}</span></div>
        </div>
      </div>

      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        {[
          ['inventory', Package, `Store Inventory (${sellerProducts.length})`],
          ['orders', ShoppingBag, `Incoming Orders (${orders.length})`],
          ['add', PlusCircle, editingId ? 'Edit Product' : 'Upload New Product'],
          ['discounts', Percent, 'Bill Discounts'],
        ].map(([tab, Icon, label]: any) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 whitespace-nowrap border-b-2 ${activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}><Icon className="w-4 h-4" />{label}</button>
        ))}
      </div>

      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {sellerProducts.length === 0 ? <div className="p-12 text-center bg-white rounded-3xl border border-slate-200"><Package className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="font-bold text-slate-700 text-sm">No products in your catalog yet.</p><button disabled={!isApproved} onClick={() => setActiveTab('add')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold disabled:opacity-50">+ Add First Product</button></div> :
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{sellerProducts.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <div className="flex gap-3"><img src={p.image} alt={p.title} className="w-18 h-18 rounded-xl object-cover border border-slate-100 shrink-0" /><div className="min-w-0 flex-1"><span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md">{p.category}</span><h4 className="font-bold text-xs text-slate-900 mt-1">{p.title}</h4><p className="text-[11px] text-slate-500">Unit: {p.unit}</p><div className="flex items-baseline gap-2 mt-2"><span className="font-black text-sm">₹{p.sellerPrice}</span><span className="text-xs text-slate-400 line-through">₹{p.mrp}</span></div></div></div>
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs"><span className={`font-semibold ${p.stock === 0 ? 'text-rose-600' : 'text-slate-600'}`}>Stock: {p.stock}</span><div className="flex gap-1"><button onClick={() => startEdit(p)} disabled={!isApproved} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-40"><Pencil className="w-4 h-4" /></button><button onClick={() => removeProduct(p.id)} disabled={!isApproved} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-40"><Trash2 className="w-4 h-4" /></button></div></div>
              </div>
            ))}</div>}
        </div>
      )}

      {activeTab === 'add' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-2xl">
          <h3 className="text-base font-extrabold text-slate-900 mb-1">{editingId ? 'Edit Product' : 'Add Product to Store Inventory'}</h3>
          <form onSubmit={submitProduct} className="space-y-4 text-xs">
            <input value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="Product title / brand name *" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><select value={form.category} onChange={e => setForm({...form,category:e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl">{PRODUCT_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select><input value={form.unit} onChange={e => setForm({...form,unit:e.target.value})} placeholder="Packaging unit" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><input type="number" min="0.01" step="0.01" value={form.mrp} onChange={e => setForm({...form,mrp:e.target.value})} placeholder="MRP ₹ *" className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" required /><input type="number" min="0.01" step="0.01" value={form.sellerPrice} onChange={e => setForm({...form,sellerPrice:e.target.value})} placeholder="Selling price ₹ *" className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" required /><input type="number" min="0" max="100" step="0.01" value={form.additionalDiscount} onChange={e => setForm({...form,additionalDiscount:e.target.value})} placeholder="Extra discount %" className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input type="number" min="0" step="1" value={form.stock} onChange={e => setForm({...form,stock:e.target.value})} placeholder="Stock quantity" className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" /><input type="url" value={form.image} onChange={e => setForm({...form,image:e.target.value})} placeholder="Product image URL (optional)" className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" /></div>
            <textarea rows={3} value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Product description" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl" />
            <div className="flex gap-2"><button type="submit" disabled={saving || !isApproved} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50">{saving ? 'Saving…' : editingId ? 'Save Product Changes' : 'Publish Product'}</button>{editingId && <button type="button" onClick={() => {setEditingId(null);setForm(emptyForm);setActiveTab('inventory')}} className="px-4 py-3 border rounded-xl font-bold">Cancel</button>}</div>
          </form>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-3">{orders.length === 0 ? <div className="p-12 text-center bg-white rounded-3xl border border-slate-200"><ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="font-bold text-sm">No incoming orders yet.</p></div> :
          orders.map(o => { const status=String(o.status||'').toUpperCase(); const next=status==='PLACED'?'Accept Order':status==='ACCEPTED_BY_SELLER'?'Mark Ready for Pickup':null; return <div key={o.orderId} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row justify-between gap-4"><div><div className="flex gap-2 items-center"><span className="font-mono font-bold text-xs text-blue-700">#{o.orderId}</span><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 uppercase">{status}</span></div><p className="text-xs font-bold mt-2">{o.buyerName} • {o.deliveryAddress}</p><p className="text-[11px] text-slate-500">{o.paymentMethod} • {o.placedAt ? new Date(o.placedAt).toLocaleString() : ''}</p></div><div className="flex items-center gap-3"><span className="font-black">₹{Number(o.totalAmount||0).toFixed(2)}</span>{next && <button onClick={()=>advanceOrder(o)} className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold">{next}</button>}</div></div>})}</div>
      )}

      {activeTab === 'discounts' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-xl space-y-5">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center"><Percent className="w-5 h-5 text-amber-600" /></div><div><h3 className="font-extrabold text-sm">Bill Discount Configuration</h3><p className="text-xs text-slate-500">These rules are stored against your seller account.</p></div></div>
          <form onSubmit={addDiscount} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="number" min="0" step="1" value={discountMin} onChange={e=>setDiscountMin(e.target.value)} placeholder="Minimum bill ₹" className="px-3 py-2 bg-slate-50 border rounded-xl text-xs" />
            <select value={discountType} onChange={e=>setDiscountType(e.target.value as any)} className="px-3 py-2 bg-slate-50 border rounded-xl text-xs"><option value="percentage">Percentage OFF</option><option value="flat">Flat ₹ OFF</option></select>
            <input type="number" min="0.01" step="0.01" value={discountValue} onChange={e=>setDiscountValue(e.target.value)} placeholder="Discount value" className="px-3 py-2 bg-slate-50 border rounded-xl text-xs" />
            <input value={discountDescription} onChange={e=>setDiscountDescription(e.target.value)} placeholder="Description (optional)" className="px-3 py-2 bg-slate-50 border rounded-xl text-xs" />
            <button disabled={!isApproved} className="sm:col-span-2 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold disabled:opacity-50">Add Discount Rule</button>
          </form>
          <div className="space-y-2">{discounts.length === 0 ? <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3">No discount rules configured.</p> : discounts.map(d=><div key={d.ruleId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border"><div><p className="text-xs font-bold">Orders above ₹{Number(d.minBillAmount).toFixed(0)} → {d.discountPercentage != null ? `${d.discountPercentage}% OFF` : `₹${d.flatDiscount} OFF`}</p><p className="text-[11px] text-slate-500">{d.description}</p></div><button onClick={()=>removeDiscount(d.ruleId)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button></div>)}</div>
        </div>
      )}
    </div>
  );
};