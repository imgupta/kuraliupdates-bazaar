import React, { useState } from 'react';
import {
  Store,
  PlusCircle,
  Package,
  Tag,
  ShoppingBag,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  MapPin,
  TrendingDown,
  Percent,
  Truck,
  DollarSign,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, Coupon, BillDiscountRule } from '../../types';

export const SellerDashboard: React.FC = () => {
  const {
    currentSeller,
    sellers,
    updateSeller,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    coupons,
    addCoupon,
    deleteCoupon,
    orders,
    updateOrderStatus,
    chats,
    setActiveChatId,
    user,
    loginWithGoogle,
    setIsGmailAuthOpen,
    setIsSellerRegisterOpen,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'inventory' | 'discounts' | 'orders' | 'bargains' | 'profile'>('inventory');

  // Add Product Form State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Groceries & Daily Essentials');
  const [newDescription, setNewDescription] = useState('');
  const [newImage, setNewImage] = useState('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80');
  const [newMrp, setNewMrp] = useState<number>(500);
  const [newSellerPrice, setNewSellerPrice] = useState<number>(420);
  const [newAdditionalDiscount, setNewAdditionalDiscount] = useState<number>(5);
  const [newStock, setNewStock] = useState<number>(25);
  const [newUnit, setNewUnit] = useState('1 Pack');

  // Add Coupon Form State
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscountType, setNewCouponDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [newCouponValue, setNewCouponValue] = useState<number>(50);
  const [newCouponMinOrder, setNewCouponMinOrder] = useState<number>(399);

  // Add Bill Discount State
  const [newMinBill, setNewMinBill] = useState<number>(500);
  const [newBillDiscountType, setNewBillDiscountType] = useState<'percent' | 'flat'>('percent');
  const [newBillDiscountVal, setNewBillDiscountVal] = useState<number>(5);

  const activeSeller = currentSeller || (user.sellerId ? sellers.find(s => s.id === user.sellerId) : sellers[0]);

  if (!activeSeller) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6 bg-white rounded-3xl border border-slate-200 shadow-xl my-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
          <Store className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Kurali Merchant Portal</h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Sell to thousands of local customers in Kurali! Register your shop, set competitive prices, offer bill discounts, and manage orders with express local delivery.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <button
            onClick={() => setIsSellerRegisterOpen(true)}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Register Your Store in Kurali
          </button>
          <button
            onClick={() => setIsGmailAuthOpen(true)}
            className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
          >
            Sign In with Store Gmail
          </button>
        </div>
      </div>
    );
  }

  const isApproved = activeSeller?.status === 'approved';

  // Products belonging to this store
  const storeProducts = products.filter(p => p.sellerId === activeSeller.id);

  // Orders for this store
  const storeOrders = orders.filter(o => o.sellerIds ? o.sellerIds.includes(activeSeller.id) : (o as any).sellerId === activeSeller.id);

  // Bargain chats for this store
  const storeChats = chats.filter(c => c.sellerId === activeSeller.id);

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addProduct({
      sellerId: activeSeller.id,
      sellerName: activeSeller.name,
      sellerLocality: activeSeller.locality,
      sellerDistanceKm: activeSeller.distanceKm || 0.8,
      sellerRating: activeSeller.rating || 5.0,
      title: newTitle.trim(),
      category: newCategory,
      description: newDescription || 'Fresh local stock available at best rates in Kurali.',
      image: newImage,
      mrp: Number(newMrp),
      sellerPrice: Number(newSellerPrice),
      additionalDiscountPercent: Number(newAdditionalDiscount),
      stock: Number(newStock),
      unit: newUnit,
      tags: [newCategory.toLowerCase(), 'kurali', 'local'],
      isFeatured: false,
    });

    setIsAddProductOpen(false);
    // Reset form
    setNewTitle('');
    setNewMrp(500);
    setNewSellerPrice(420);
    setNewAdditionalDiscount(5);
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;

    addCoupon({
      code: newCouponCode.trim().toUpperCase(),
      discountPercentage: newCouponDiscountType === 'percentage' ? Number(newCouponValue) : undefined,
      flatDiscount: newCouponDiscountType === 'flat' ? Number(newCouponValue) : undefined,
      minOrderValue: Number(newCouponMinOrder),
      description: `${newCouponDiscountType === 'flat' ? `₹${newCouponValue} OFF` : `${newCouponValue}% OFF`} on orders above ₹${newCouponMinOrder} at ${activeSeller.name}`,
    });

    setNewCouponCode('');
  };

  const handleAddBillDiscountRule = (e: React.FormEvent) => {
    e.preventDefault();
    const newRule: BillDiscountRule = {
      id: `bd-${Date.now()}`,
      minBillAmount: Number(newMinBill),
      flatDiscount: newBillDiscountType === 'flat' ? Number(newBillDiscountVal) : undefined,
      discountPercentage: newBillDiscountType === 'percent' ? Number(newBillDiscountVal) : undefined,
      description:
        newBillDiscountType === 'flat'
          ? `Flat ₹${newBillDiscountVal} OFF on total bill above ₹${newMinBill}`
          : `${newBillDiscountVal}% OFF on total bill above ₹${newMinBill}`,
    };

    updateSeller(activeSeller.id, {
      billDiscounts: [...(activeSeller.billDiscounts || []), newRule],
    });
    showToast('Bill discount tier added successfully', 'success');
  };

  const calculatedNewEffectivePrice = Math.round(
    newSellerPrice * (1 - newAdditionalDiscount / 100)
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Seller Top Bar: Gmail Auth & Account Status */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={activeSeller.avatarUrl}
            alt={activeSeller.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-300 shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {activeSeller.name}
              </h1>
              {isApproved ? (
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Admin Approved &amp; Live
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  Pending Admin Verification
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>Owner: <strong>{activeSeller.ownerName}</strong></span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-600" />
                {activeSeller.locality} ({activeSeller.distanceKm || 0.8} km from Chowk)
              </span>
            </p>

            {/* Gmail Authentication Identity */}
            <div className="mt-2 flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Gmail: <strong>{activeSeller.email}</strong></span>
              </div>
              <button
                onClick={() => setIsGmailAuthOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Switch Account
              </button>
            </div>
          </div>
        </div>

        {/* Quick action button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddProductOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" /> Add Product Item
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" /> Store Inventory ({storeProducts.length})
        </button>

        <button
          onClick={() => setActiveTab('discounts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'discounts'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Percent className="w-4 h-4" /> Bill Discounts &amp; Coupons
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Live Orders ({storeOrders.length})
          {storeOrders.filter(o => o.status === 'placed').length > 0 && (
            <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] rounded-full">
              {storeOrders.filter(o => o.status === 'placed').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('bargains')}
          className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'bargains'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Customer Negotiations ({storeChats.length})
        </button>
      </div>

      {/* Tab: Inventory */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">
              Product Catalog ({storeProducts.length} Items)
            </h2>
            <button
              onClick={() => setIsAddProductOpen(!isAddProductOpen)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> {isAddProductOpen ? 'Cancel' : 'Add New Item'}
            </button>
          </div>

          {/* Add Product Modal Form */}
          {isAddProductOpen && (
            <form onSubmit={handleCreateProduct} className="bg-blue-50/50 border border-blue-200 rounded-3xl p-6 space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-600" /> Add Product to {activeSeller.name}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Verka Standard Milk 1 Litre"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="Groceries & Daily Essentials">Groceries & Daily Essentials</option>
                    <option value="Dairy, Bakery & Sweets">Dairy, Bakery & Sweets</option>
                    <option value="Fruits & Vegetables">Fruits & Vegetables</option>
                    <option value="Electronics & Mobiles">Electronics & Mobiles</option>
                    <option value="Pharmacy & Healthcare">Pharmacy & Healthcare</option>
                    <option value="Hardware & Home Utility">Hardware & Home Utility</option>
                    <option value="Apparel & Footwear">Apparel & Footwear</option>
                    <option value="Organic & Farm Produce">Organic & Farm Produce</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">MRP (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newMrp}
                    onChange={e => setNewMrp(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Your Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newSellerPrice}
                    onChange={e => setNewSellerPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Extra Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={newAdditionalDiscount}
                    onChange={e => setNewAdditionalDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stock Qty &bull; Unit</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min="1"
                      value={newStock}
                      onChange={e => setNewStock(Number(e.target.value))}
                      className="w-16 px-2 py-2 bg-white border border-slate-200 rounded-xl outline-none"
                    />
                    <input
                      type="text"
                      value={newUnit}
                      onChange={e => setNewUnit(e.target.value)}
                      placeholder="1 kg"
                      className="flex-1 px-2 py-2 bg-white border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={newImage}
                  onChange={e => setNewImage(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-600">
                  Buyer pays: <strong className="text-emerald-700 text-sm">₹{calculatedNewEffectivePrice}</strong> (saves ₹{newMrp - calculatedNewEffectivePrice})
                </span>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Save &amp; List Item
                </button>
              </div>
            </form>
          )}

          {storeProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Products in Inventory Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click "Add New Item" above to list your groceries, daily essentials, or sweets for Kurali customers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {storeProducts.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 flex flex-col justify-between">
                  <img src={p.image} alt={p.title} className="w-full h-32 object-cover rounded-xl" />
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {p.category}
                    </span>
                    <h4 className="font-extrabold text-xs text-slate-900 mt-1 line-clamp-1">{p.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-black text-sm text-slate-900">₹{p.sellerPrice}</span>
                      <span className="text-slate-400 line-through text-xs">₹{p.mrp}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500">Stock: <strong>{p.stock}</strong> {p.unit}</span>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
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

      {/* Tab: Discounts */}
      {activeTab === 'discounts' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Percent className="w-4 h-4 text-amber-500" /> Create Bill Discount Rule for {activeSeller.name}
            </h3>
            <form onSubmit={handleAddBillDiscountRule} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Min Bill Amount (₹)</label>
                <input
                  type="number"
                  min="100"
                  value={newMinBill}
                  onChange={e => setNewMinBill(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Discount Type</label>
                <select
                  value={newBillDiscountType}
                  onChange={e => setNewBillDiscountType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="flat">Flat Cash (₹)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Value ({newBillDiscountType === 'flat' ? '₹' : '%'})</label>
                <input
                  type="number"
                  min="1"
                  value={newBillDiscountVal}
                  onChange={e => setNewBillDiscountVal(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Add Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-slate-900">Store Orders ({storeOrders.length})</h2>
          {storeOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Orders Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Orders placed by Kurali residents for your items will appear here for packing and dispatch.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {storeOrders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900">#{order.id}</span>
                    <p className="text-xs text-slate-500">Buyer: {order.buyerName} &bull; {order.deliveryAddress}</p>
                    <span className="font-bold text-xs text-slate-900">₹{order.totalAmount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-blue-50 text-blue-700">
                      {order.status}
                    </span>
                    {order.status === 'placed' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'ready_for_pickup', 'Packed by merchant')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
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

      {/* Tab: Bargains */}
      {activeTab === 'bargains' && (
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-slate-900">Customer Bargaining Requests ({storeChats.length})</h2>
          {storeChats.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Active Price Negotiations</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When buyers make a lower offer on your bulk items, their chat requests will show here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {storeChats.map(c => (
                <div
                  key={c.id}
                  onClick={() => setActiveChatId(c.id)}
                  className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-amber-400 cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <img src={c.productImage} alt={c.productTitle} className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{c.productTitle}</h4>
                      <p className="text-[11px] text-slate-500">From: {c.buyerName}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-600">Open Chat &rarr;</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
