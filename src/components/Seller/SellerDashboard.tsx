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

  const activeSeller = currentSeller || sellers[0];
  const isApproved = activeSeller?.status === 'approved';

  // Products belonging to this store
  const storeProducts = products.filter(p => p.sellerId === activeSeller.id);

  // Orders for this store
  const storeOrders = orders.filter(o => o.sellerId === activeSeller.id);

  // Bargain chats for this store
  const storeChats = chats.filter(c => c.sellerId === activeSeller.id);

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addProduct({
      title: newTitle,
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
      sellerId: activeSeller.id,
      sellerName: activeSeller.name,
      discountType: newCouponDiscountType,
      discountValue: Number(newCouponValue),
      minOrderValue: Number(newCouponMinOrder),
      expiryDate: '2026-12-31',
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
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
                  Pending Admin Approval
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>Owner: <strong>{activeSeller.ownerName}</strong></span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-600" />
                {activeSeller.locality} ({activeSeller.distanceKm} km from Chowk)
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
                Change Gmail Account
              </button>
            </div>
          </div>
        </div>

        {/* Store Switcher for easy testing */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs flex flex-col gap-1 w-full md:w-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            Active Kurali Store:
          </span>
          <select
            value={activeSeller.id}
            onChange={e => {
              const selected = sellers.find(s => s.id === e.target.value);
              if (selected) {
                loginWithGoogle(selected.email, selected.ownerName, 'seller');
              }
            }}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none cursor-pointer"
          >
            {sellers.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Admin Approval Notice if pending */}
      {!isApproved && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm">Account Awaiting KuraliUpdates Admin Approval</h4>
            <p className="text-amber-800">
              Your store is registered and ready! Products you add here are saved and ready to sell. As soon as the Admin approves your shop from the <strong>Admin Desk</strong>, your catalog will appear to all Kurali buyers on the homepage.
            </p>
          </div>
        </div>
      )}

      {/* Store Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Total Products</span>
          <p className="text-xl font-black text-slate-900 mt-1">{storeProducts.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Orders Received</span>
          <p className="text-xl font-black text-slate-900 mt-1">{storeOrders.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Price Bargains</span>
          <p className="text-xl font-black text-slate-900 mt-1">{storeChats.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Active Coupons</span>
          <p className="text-xl font-black text-slate-900 mt-1">
            {coupons.filter(c => c.sellerId === activeSeller.id || c.sellerId === 'all').length}
          </p>
        </div>
      </div>

      {/* Seller Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Upload &amp; Manage Inventory ({storeProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('discounts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'discounts'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Bill Discounts &amp; Coupons</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Incoming Orders ({storeOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bargains')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'bargains'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Buyer Bargain Inquiries ({storeChats.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Store Settings</span>
        </button>
      </div>

      {/* Tab 1: Inventory & Product Management (MRP, Seller Price, Additional Discount) */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Store Catalog &amp; Pricing
              </h2>
              <p className="text-xs text-slate-500">
                Manage MRP, base seller price, and additional store discounts.
              </p>
            </div>
            <button
              onClick={() => setIsAddProductOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>

          {/* Add Product Modal Form */}
          {isAddProductOpen && (
            <div className="bg-white rounded-3xl p-6 border-2 border-blue-400 shadow-xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  Upload New Product to Kurali Store
                </h3>
                <button
                  onClick={() => setIsAddProductOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Product Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Fortune Mustard Oil (1 Litre)"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                    >
                      <option value="Groceries & Daily Essentials">Groceries & Daily Essentials</option>
                      <option value="Dairy, Bakery & Sweets">Dairy, Bakery & Sweets</option>
                      <option value="Fruits & Vegetables">Fruits & Vegetables</option>
                      <option value="Electronics & Mobiles">Electronics & Mobiles</option>
                      <option value="Pharmacy & Healthcare">Pharmacy & Healthcare</option>
                      <option value="Organic & Farm Produce">Organic & Farm Produce</option>
                    </select>
                  </div>
                </div>

                {/* Pricing Fields: MRP, Seller Price, Additional Discount */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <TrendingDown className="w-4 h-4 text-amber-600" />
                    <span>Pricing Architecture (MRP, Seller Price &amp; Additional Discount)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Printed MRP (₹) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newMrp}
                        onChange={e => setNewMrp(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-amber-500 outline-none font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Base Seller Price (₹) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newSellerPrice}
                        onChange={e => setNewSellerPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-amber-500 outline-none font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Additional Discount (% Off)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        value={newAdditionalDiscount}
                        onChange={e => setNewAdditionalDiscount(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-amber-500 outline-none font-bold text-emerald-700"
                      />
                    </div>
                  </div>

                  {/* Live calculated price indicator */}
                  <div className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                    <span className="text-slate-600">
                      Calculated Buyer Price: <strong>₹{calculatedNewEffectivePrice}</strong> (Save ₹{newMrp - calculatedNewEffectivePrice} vs MRP)
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      {Math.round(((newMrp - calculatedNewEffectivePrice) / newMrp) * 100)}% Total Savings
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Packaging / Unit Size *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1 kg, 500 ml, 1 Set"
                      value={newUnit}
                      onChange={e => setNewUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      In-Stock Quantity *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newStock}
                      onChange={e => setNewStock(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={newImage}
                      onChange={e => setNewImage(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Product Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Short description highlighting quality, origin, freshness..."
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddProductOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                  >
                    Publish Product to Inventory
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Product Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">MRP</th>
                    <th className="py-3 px-4">Seller Rate</th>
                    <th className="py-3 px-4">Extra Discount</th>
                    <th className="py-3 px-4">Effective Price</th>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {storeProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No products added yet. Click "Add New Product" above to build your Kurali catalog!
                      </td>
                    </tr>
                  ) : (
                    storeProducts.map(p => {
                      const eff = Math.round(
                        p.sellerPrice * (1 - p.additionalDiscountPercent / 100)
                      );
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 flex items-center gap-3">
                            <img
                              src={p.image}
                              alt={p.title}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                            />
                            <div>
                              <p className="font-bold text-slate-900">{p.title}</p>
                              <span className="text-[11px] text-slate-400">
                                {p.category} &bull; {p.unit}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-400 line-through">₹{p.mrp}</td>
                          <td className="py-3 px-4 font-semibold text-slate-700">₹{p.sellerPrice}</td>
                          <td className="py-3 px-4">
                            {p.additionalDiscountPercent > 0 ? (
                              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                {p.additionalDiscountPercent}% Off
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-black text-emerald-600 text-sm">
                            ₹{eff}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-bold px-2 py-0.5 rounded-full ${
                                p.stock > 0
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {p.stock > 0 ? `${p.stock} units` : 'Out of Stock'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => deleteProduct(p.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Bill Discounts & Coupons */}
      {activeTab === 'discounts' && (
        <div className="space-y-6">
          {/* Bill Discounts Configuration */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                <Percent className="w-5 h-5 text-blue-600" />
                Discounts on Total Bill (Order Value Milestones)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Encourage bigger orders from Kurali shoppers by giving automatic bill discounts when their cart reaches thresholds.
              </p>
            </div>

            {/* Existing bill discount rules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(activeSeller.billDiscounts || []).map(rule => (
                <div
                  key={rule.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <span className="text-[11px] font-bold text-blue-700 uppercase">
                      Min Order ₹{rule.minBillAmount}
                    </span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">
                      {rule.description}
                    </p>
                  </div>
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    ✓
                  </span>
                </div>
              ))}
            </div>

            {/* Add new rule */}
            <form onSubmit={handleAddBillDiscountRule} className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[140px]">
                <label className="block font-semibold text-slate-700 mb-1">
                  Minimum Bill Amount (₹)
                </label>
                <input
                  type="number"
                  min="100"
                  value={newMinBill}
                  onChange={e => setNewMinBill(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="w-32">
                <label className="block font-semibold text-slate-700 mb-1">
                  Discount Type
                </label>
                <select
                  value={newBillDiscountType}
                  onChange={e => setNewBillDiscountType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                >
                  <option value="percent">% Percentage</option>
                  <option value="flat">₹ Flat Rupees</option>
                </select>
              </div>

              <div className="w-28">
                <label className="block font-semibold text-slate-700 mb-1">
                  Value ({newBillDiscountType === 'percent' ? '%' : '₹'})
                </label>
                <input
                  type="number"
                  min="1"
                  value={newBillDiscountVal}
                  onChange={e => setNewBillDiscountVal(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
              >
                Add Bill Tier
              </button>
            </form>
          </div>

          {/* Coupons Configuration */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-600" />
                Store Coupons for Buyers
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate promo codes that buyers can enter in their cart to receive instant savings.
              </p>
            </div>

            {/* List of Store Coupons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {coupons
                .filter(c => c.sellerId === activeSeller.id || c.sellerId === 'all')
                .map(c => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-300 text-xs">
                        {c.code}
                      </span>
                      {c.sellerId === activeSeller.id && (
                        <button
                          onClick={() => deleteCoupon(c.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-800 pt-1">
                      {c.discountType === 'flat' ? `₹${c.discountValue} OFF` : `${c.discountValue}% OFF`}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Min order ₹{c.minOrderValue} &bull; {c.sellerName}
                    </p>
                  </div>
                ))}
            </div>

            {/* Create new coupon */}
            <form onSubmit={handleCreateCoupon} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[140px]">
                <label className="block font-semibold text-slate-700 mb-1">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE20"
                  value={newCouponCode}
                  onChange={e => setNewCouponCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono uppercase font-bold"
                />
              </div>

              <div className="w-28">
                <label className="block font-semibold text-slate-700 mb-1">
                  Type
                </label>
                <select
                  value={newCouponDiscountType}
                  onChange={e => setNewCouponDiscountType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                >
                  <option value="flat">₹ Flat</option>
                  <option value="percentage">% Percentage</option>
                </select>
              </div>

              <div className="w-24">
                <label className="block font-semibold text-slate-700 mb-1">
                  Discount
                </label>
                <input
                  type="number"
                  min="1"
                  value={newCouponValue}
                  onChange={e => setNewCouponValue(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="w-28">
                <label className="block font-semibold text-slate-700 mb-1">
                  Min Order (₹)
                </label>
                <input
                  type="number"
                  min="50"
                  value={newCouponMinOrder}
                  onChange={e => setNewCouponMinOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
              >
                Create Coupon
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Store Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Store Orders ({storeOrders.length})
              </h2>
              <p className="text-xs text-slate-500">
                Incoming orders from local Kurali buyers ready for fulfillment.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {storeOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-400 text-xs">
                No orders received for this store yet. Place a test order from Buyer mode!
              </div>
            ) : (
              storeOrders.map(ord => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {ord.id}
                        </span>
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {ord.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Buyer: <strong>{ord.buyerName}</strong> ({ord.buyerPhone}) &bull; {ord.deliveryAddress}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-extrabold text-slate-900">
                        ₹{ord.totalAmount}
                      </span>
                      <span className="block text-[11px] text-emerald-700 font-semibold">
                        {ord.paymentStatus === 'paid' ? 'Paid via Online' : 'Cash on Delivery'}
                      </span>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="text-xs text-slate-700 space-y-1">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.quantity}x {item.product.title}</span>
                        <span className="font-medium text-slate-500">{item.product.unit}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons for storekeeper */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      Rider OTP: <strong className="font-mono text-slate-700">{ord.deliveryOtp}</strong>
                    </span>

                    <div className="flex gap-2">
                      {ord.status === 'placed' && (
                        <button
                          onClick={() =>
                            updateOrderStatus(
                              ord.id,
                              'accepted_by_seller',
                              'Shop confirmed order and verified stock'
                            )
                          }
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Accept Order
                        </button>
                      )}

                      {ord.status === 'accepted_by_seller' && (
                        <button
                          onClick={() =>
                            updateOrderStatus(
                              ord.id,
                              'ready_for_pickup',
                              'Parcel packed & ready for Kurali delivery rider'
                            )
                          }
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Mark Ready for Delivery Pickup
                        </button>
                      )}

                      {ord.status === 'ready_for_pickup' && (
                        <span className="text-xs text-amber-700 font-bold bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                          Waiting for Delivery Agent Pickup
                        </span>
                      )}

                      {ord.status === 'assigned_to_delivery' && (
                        <span className="text-xs text-blue-700 font-bold bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                          Agent Assigned: {ord.deliveryAgentName}
                        </span>
                      )}

                      {ord.status === 'delivered' && (
                        <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                          ✓ Completed &amp; Delivered
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Price Bargains & Negotiation Inquiries */}
      {activeTab === 'bargains' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Buyer Price Bargaining Inquiries
            </h2>
            <p className="text-xs text-slate-500">
              Direct live bargaining requests from Kurali customers for your listed inventory.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {storeChats.length === 0 ? (
              <div className="col-span-2 bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-400 text-xs">
                No bargain inquiries yet. Buyers can click "Bargain" on any of your products to negotiate price!
              </div>
            ) : (
              storeChats.map(c => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={c.productImage}
                      alt={c.productTitle}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 truncate">
                        {c.productTitle}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Buyer: <strong>{c.buyerName}</strong> &bull; {c.lastUpdated}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-600 line-clamp-2">
                    {c.messages[c.messages.length - 1]?.text}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {c.currentAgreedPrice ? (
                      <span className="text-emerald-700 font-bold text-xs bg-emerald-100 px-2 py-0.5 rounded-full">
                        Deal Locked: ₹{c.currentAgreedPrice}
                      </span>
                    ) : (
                      <span className="text-amber-700 font-bold text-xs bg-amber-100 px-2 py-0.5 rounded-full">
                        Negotiation Ongoing
                      </span>
                    )}

                    <button
                      onClick={() => setActiveChatId(c.id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Open Live Chat
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Store Profile & Delivery Settings */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 max-w-2xl">
          <h3 className="font-extrabold text-base text-slate-900">
            Store Profile &amp; Kurali Delivery Thresholds
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Store Name
              </label>
              <input
                type="text"
                value={activeSeller.name}
                onChange={e => updateSeller(activeSeller.id, { name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Kurali Locality
              </label>
              <input
                type="text"
                value={activeSeller.locality}
                onChange={e => updateSeller(activeSeller.id, { locality: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Min Order for Free Delivery (₹)
                </label>
                <input
                  type="number"
                  value={activeSeller.minOrderForFreeDelivery}
                  onChange={e =>
                    updateSeller(activeSeller.id, {
                      minOrderForFreeDelivery: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Base Delivery Fee (₹)
                </label>
                <input
                  type="number"
                  value={activeSeller.baseDeliveryFee}
                  onChange={e =>
                    updateSeller(activeSeller.id, {
                      baseDeliveryFee: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => showToast('Store settings saved', 'success')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
