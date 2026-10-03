import React, { useState } from 'react';
import {
  X,
  Store,
  MapPin,
  Phone,
  Mail,
  FileText,
  DollarSign,
  Truck,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { KURALI_LOCALITIES, PRODUCT_CATEGORIES } from '../../data/initialData';

interface SellerRegistrationModalProps {
  onClose?: () => void;
}

export const SellerRegistrationModal: React.FC<SellerRegistrationModalProps> = ({ onClose }) => {
  const {
    isSellerRegisterOpen,
    setIsSellerRegisterOpen,
    registerSeller,
    user,
    showToast,
  } = useApp();

  const handleClose = () => {
    if (onClose) onClose();
    setIsSellerRegisterOpen(false);
  };

  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [category, setCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [locality, setLocality] = useState(KURALI_LOCALITIES[1]);
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [minOrder, setMinOrder] = useState('499');
  const [baseDeliveryFee, setBaseDeliveryFee] = useState('35');
  const [description, setDescription] = useState('');

  if (!isSellerRegisterOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeName.trim() || !ownerName.trim() || !phone.trim()) {
      showToast('Please fill all mandatory fields.', 'error');
      return;
    }

    registerSeller({
      name: storeName.trim(),
      ownerName: ownerName.trim(),
      email: email.trim() || `${storeName.toLowerCase().replace(/\s+/g, '')}@kuraliupdates.com`,
      phone: phone.trim(),
      category,
      locality,
      address: address.trim() || `${locality}, Kurali, Punjab`,
      distanceKm: 1.2,
      bannerUrl:
        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        storeName
      )}&backgroundColor=0284c7,f59e0b,10b981`,
      description:
        description.trim() ||
        `${storeName} - Trusted local merchant in ${locality}, Kurali. Fresh quality & wholesale retail rates.`,
      gstNumber: gstNumber.trim() || undefined,
      fssaiNumber: fssaiNumber.trim() || undefined,
      minOrderForFreeDelivery: parseFloat(minOrder) || 499,
      baseDeliveryFee: parseFloat(baseDeliveryFee) || 35,
      billDiscounts: [
        {
          id: `bd-${Date.now()}`,
          minBillAmount: 500,
          discountPercentage: 5,
          description: '5% instant discount on orders above ₹500',
        },
      ],
    });

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Store className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Register Your Kurali Store</h3>
              <p className="text-xs text-blue-100">Sell online to shoppers across Kurali City</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Fast Merchant Onboarding</p>
              <p className="text-[11px] text-blue-800">
                Your shop registration will be verified by the KuraliUpdates City Admin before inventory goes live.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Store / Shop Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                placeholder="e.g. Singla Departmental Store"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Owner / Proprietor Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                placeholder="e.g. Ramesh Singla"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Store Contact Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98140 11223"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Store Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="singlastore.kurali@gmail.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Primary Category</label>
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
              <label className="block text-slate-700 font-bold mb-1">Kurali Locality Zone</label>
              <select
                value={locality}
                onChange={e => setLocality(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                {KURALI_LOCALITIES.slice(1).map(loc => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Full Shop Address / Landmark</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Shop No. 14, Opposite State Bank, Morinda Road, Kurali"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">GST Number (Optional)</label>
              <input
                type="text"
                value={gstNumber}
                onChange={e => setGstNumber(e.target.value)}
                placeholder="03BBBBB5678B1Z2"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">FSSAI License (Optional)</label>
              <input
                type="text"
                value={fssaiNumber}
                onChange={e => setFssaiNumber(e.target.value)}
                placeholder="10022064000123"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Free Delivery Min Order (₹)</label>
              <input
                type="number"
                value={minOrder}
                onChange={e => setMinOrder(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Base Delivery Fee (₹)</label>
              <input
                type="number"
                value={baseDeliveryFee}
                onChange={e => setBaseDeliveryFee(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Store Description &amp; Highlights</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tell Kurali buyers about your authentic products, discounts, and fresh stock..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Submit Store for City Verification</span>
          </button>
        </form>
      </div>
    </div>
  );
};
