import React, { useState } from 'react';
import { X, Store, MapPin, Phone, Mail, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { KURALI_LOCALITIES } from '../../data/initialData';

interface SellerRegistrationModalProps {
  onClose: () => void;
}

export const SellerRegistrationModal: React.FC<SellerRegistrationModalProps> = ({ onClose }) => {
  const { registerSeller, user, loginWithGoogle, setRole } = useApp();

  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [category, setCategory] = useState('Groceries & Daily Essentials');
  const [locality, setLocality] = useState(KURALI_LOCALITIES[1] || 'Main Bazaar');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [minOrderForFreeDelivery, setMinOrderForFreeDelivery] = useState(499);
  const [baseDeliveryFee, setBaseDeliveryFee] = useState(30);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ownerName.trim()) return;

    registerSeller({
      name,
      ownerName,
      email,
      phone,
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
      category,
      address,
      locality,
      distanceKm: 1.2,
      bannerUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=900&q=80',
      description,
      gstNumber: gstNumber || undefined,
      minOrderForFreeDelivery,
      baseDeliveryFee,
      billDiscounts: [
        {
          id: `bd-${Date.now()}`,
          minBillAmount: 500,
          discountPercentage: 5,
          description: '5% instant store discount above ₹500',
        },
      ],
    });

    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                Register Your Kurali Shop
              </h2>
              <p className="text-xs text-blue-100">
                Join KuraliUpdates Merchant Network &bull; Post Admin Approval
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isSubmitted ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Registration Submitted for Admin Approval!
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                Your shop <strong>"{name}"</strong> has been registered. Our KuraliUpdates Admin will verify your merchant details. You can track and manage your account in the Seller Portal.
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl max-w-md mx-auto text-xs text-amber-800 text-left flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Admin Approval Workflow:</strong> Switch to the <strong>Admin Desk</strong> tab in the header to approve this registration immediately for testing!
              </span>
            </div>

            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={() => {
                  setRole('seller');
                  onClose();
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Go to Seller Portal
              </button>
              <button
                onClick={() => {
                  setRole('admin');
                  onClose();
                }}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Go to Admin Desk (Approve Now)
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Notice regarding Admin approval */}
            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Official Kurali Merchant Verification</p>
                <p className="text-[11px] text-blue-700">
                  As requested, all new seller registrations require Admin Approval before going live to Kurali buyers. Authenticate with Gmail to manage your store profile.
                </p>
              </div>
            </div>

            {/* Shop Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shop / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sharma Kirana & Sweets"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Store Category *
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Owner / Manager Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gmail / Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="storename@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone / WhatsApp Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kurali Locality / Road *
                </label>
                <select
                  value={locality}
                  onChange={e => setLocality(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                >
                  {KURALI_LOCALITIES.filter(l => !l.startsWith('All')).map(loc => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shop Address (Exact Landmark / Shop Number) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Shop No. 18, Opp. Gurudwara, Morinda Road"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GST / Trade License ID
                </label>
                <input
                  type="text"
                  placeholder="03AAAAA0000A1Z5"
                  value={gstNumber}
                  onChange={e => setGstNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Min Order for Free Delivery (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={minOrderForFreeDelivery}
                  onChange={e => setMinOrderForFreeDelivery(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Standard Delivery Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={baseDeliveryFee}
                  onChange={e => setBaseDeliveryFee(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store Bio / Specialties
              </label>
              <textarea
                rows={2}
                placeholder="Describe your store specialties, operating hours, and trusted legacy in Kurali..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Submit Store for Admin Approval
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
