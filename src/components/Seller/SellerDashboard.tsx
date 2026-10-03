import React, { useState } from 'react';
import {
  Store,
  PlusCircle,
  Package,
  ShoppingBag,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  TrendingUp,
  Tag,
  Sparkles,
  Truck,
  Eye,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PRODUCT_CATEGORIES } from '../../data/initialData';
import { Product } from '../../types';

export const SellerDashboard: React.FC = () => {
  const {
    currentSeller,
    sellers,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    orders,
    updateOrderStatus,
    setIsSellerRegisterOpen,
    user,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'add' | 'discounts'>('inventory');

  // New Product form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [mrp, setMrp] = useState('');
  const [sellerPrice, setSellerPrice] = useState('');
  const [additionalDiscount, setAdditionalDiscount] = useState('0');
  const [stock, setStock] = useState('25');
  const [unit, setUnit] = useState('1 kg');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');

  // Fallback to first seller if user isn't assigned to one yet
  const seller = currentSeller || sellers[0];

  const sellerProducts = products.filter(p => p.sellerId === seller?.id);
  const sellerOrders = orders.filter(o => o.sellerId === seller?.id || (o.sellerIds && o.sellerIds.includes(seller?.id)));

  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !sellerPrice || !mrp) {
      showToast('Please fill all mandatory product fields.', 'error');
      return;
    }

    const mrpVal = parseFloat(mrp);
    const sellerPriceVal = parseFloat(sellerPrice);
    const discountVal = parseFloat(additionalDiscount) || 0;

    if (sellerPriceVal > mrpVal) {
      showToast('Seller price cannot be higher than MRP.', 'error');
      return;
    }

    addProduct({
      sellerId: seller?.id || 'seller-1',
      sellerName: seller?.name || 'Kurali Store',
      sellerLocality: seller?.locality || 'Main Bazaar',
      sellerDistanceKm: seller?.distanceKm || 1.0,
      sellerRating: seller?.rating || 4.8,
      title: title.trim(),
      category,
      description: description.trim() || `${title} from ${seller?.name}`,
      image:
        image.trim() ||
        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
      mrp: mrpVal,
      sellerPrice: sellerPriceVal,
      additionalDiscountPercent: discountVal,
      stock: parseInt(stock, 10) || 20,
      unit: unit.trim() || '1 pc',
      tags: ['Kurali', 'Local', category.split(' ')[0]],
      isFeatured: false,
    });

    // Reset form
    setTitle('');
    setMrp('');
    setSellerPrice('');
    setAdditionalDiscount('0');
    setDescription('');
    setImage('');
    setActiveTab('inventory');
  };

  return (
    <div className="space-y-6">
      {/* Store Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
              <Store className="w-8 h-8 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{seller?.name || 'Kurali Store'}</h1>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                    seller?.status === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                      : seller?.status === 'pending'
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                      : 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
                  }`}
                >
                  {seller?.status || 'Active Store'}
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-1">
                Owner: <strong>{seller?.ownerName}</strong> &bull; Locality: <strong>{seller?.locality}</strong> &bull; Min Free Delivery: <strong>₹{seller?.minOrderForFreeDelivery}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('add')}
              className="px-4 py-2.5 bg-white text-blue-800 hover:bg-blue-50 font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span>Add Inventory</span>
            </button>
            <button
              onClick={() => setIsSellerRegisterOpen(true)}
              className="px-3 py-2.5 bg-blue-800/60 hover:bg-blue-800 text-white font-bold rounded-xl text-xs transition-colors border border-blue-400/30 cursor-pointer"
            >
              Update Store
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-blue-200 block">Listed Products</span>
            <span className="text-xl font-black text-white">{sellerProducts.length} items</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-blue-200 block">Total Orders</span>
            <span className="text-xl font-black text-white">{sellerOrders.length}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-blue-200 block">Customer Rating</span>
            <span className="text-xl font-black text-white">★ {seller?.rating || '4.8'}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-blue-200 block">City Proximity</span>
            <span className="text-xl font-black text-white">{seller?.distanceKm || '1.0'} km</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-4 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap border-b-2 ${
            activeTab === 'inventory'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Store Inventory ({sellerProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-4 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap border-b-2 ${
            activeTab === 'orders'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Incoming Orders ({sellerOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('add')}
          className={`pb-3 px-4 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap border-b-2 ${
            activeTab === 'add'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Upload New Product</span>
        </button>

        <button
          onClick={() => setActiveTab('discounts')}
          className={`pb-3 px-4 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap border-b-2 ${
            activeTab === 'discounts'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Bill Discounts</span>
        </button>
      </div>

      {/* Tab: Store Inventory */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-800">Products in Kurali Catalog</h3>
            <span className="text-xs text-slate-500">Live prices shown to shoppers</span>
          </div>

          {sellerProducts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700 text-sm">No products in your catalog yet.</p>
              <p className="text-xs text-slate-400 mt-1">Upload your store inventory to start receiving orders.</p>
              <button
                onClick={() => setActiveTab('add')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                + Add First Product
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sellerProducts.map(p => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex gap-3">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-18 h-18 rounded-xl object-cover border border-slate-100 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md inline-block mb-1">
                        {p.category}
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 truncate">{p.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Unit: {p.unit}</p>

                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="font-black text-sm text-slate-900">₹{p.sellerPrice}</span>
                        <span className="text-xs text-slate-400 line-through">₹{p.mrp}</span>
                        {p.additionalDiscountPercent ? (
                          <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-1.5 py-0.2 rounded">
                            {p.additionalDiscountPercent}% EXTRA
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Stock: {p.stock} units</span>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="text-rose-600 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Upload Product Form */}
      {activeTab === 'add' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-2xl">
          <h3 className="text-base font-extrabold text-slate-900 mb-1">Add Product to Store Inventory</h3>
          <p className="text-xs text-slate-500 mb-6">
            Input retail MRP, your seller discounted price, and stock for Kurali buyers.
          </p>

          <form onSubmit={handleAddProductSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Product Title / Brand Name *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Fortune Royal Basmati Rice (5 kg)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  {PRODUCT_CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Packaging Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="e.g. 5 kg Bag / 1 Litre Jar"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">MRP Printed Price (₹) *</label>
                <input
                  type="number"
                  value={mrp}
                  onChange={e => setMrp(e.target.value)}
                  placeholder="520"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Your Selling Price (₹) *</label>
                <input
                  type="number"
                  value={sellerPrice}
                  onChange={e => setSellerPrice(e.target.value)}
                  placeholder="425"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Additional Discount %</label>
                <input
                  type="number"
                  value={additionalDiscount}
                  onChange={e => setAdditionalDiscount(e.target.value)}
                  placeholder="5"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Inventory Stock Quantity</label>
                <input
                  type="number"
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  placeholder="25"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Photo URL (Optional)</label>
                <input
                  type="url"
                  value={image}
                  onChange={e => setImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Product Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Provide details about quality, packaging, freshness or authenticity..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer mt-2"
            >
              Publish to Kurali Catalog &amp; Oracle DB
            </button>
          </form>
        </div>
      )}

      {/* Tab: Store Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-800">Orders for Your Store</h3>

          {sellerOrders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700 text-sm">No incoming orders yet.</p>
              <p className="text-xs text-slate-400 mt-1">Orders placed by Kurali buyers will appear here in real time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sellerOrders.map(ord => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-blue-700">#{ord.id}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                        {ord.status}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">
                      Buyer: {ord.buyerName} &bull; {ord.deliveryAddress}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Items: {ord.items.map(i => `${i.product.title} (${i.quantity})`).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <span className="font-black text-sm text-slate-900 block">₹{ord.totalAmount}</span>
                      <span className="text-[10px] text-slate-400">{ord.paymentMethod}</span>
                    </div>

                    {ord.status === 'placed' && (
                      <button
                        onClick={() => updateOrderStatus(ord.id, 'ready_for_pickup', 'Packed and waiting for delivery fleet')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Mark Ready for Pickup
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Bill Discounts */}
      {activeTab === 'discounts' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 max-w-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-200">
              <Percent className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Store Bill Discount Configuration</h3>
              <p className="text-xs text-slate-500">Automatic discounts applied on total cart checkout</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-800 block">5% Instant Discount</span>
                <span className="text-[11px] text-slate-500">Applicable on cart orders above ₹500</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                Active
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-800 block">Flat ₹100 OFF</span>
                <span className="text-[11px] text-slate-500">Applicable on cart orders above ₹1,200</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                Active
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
