import React, { useState } from 'react';
import { X, Shield, Store, Bike, ShoppingBag, CheckCircle2, Mail, User, Phone, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { ROOT_ADMIN_EMAIL } from '../../data/initialData';

interface GmailAuthModalProps {
  onClose: () => void;
  defaultRole?: UserRole;
}

export const GmailAuthModal: React.FC<GmailAuthModalProps> = ({ onClose, defaultRole = 'buyer' }) => {
  const { loginWithGoogle, user, setIsSellerRegisterOpen, setIsDeliveryRegisterOpen, setIsBuyerRegisterOpen } = useApp();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);

  const isRootAdmin = email.trim().toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase();

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const trimmedEmail = email.trim().toLowerCase();
    const finalRole: UserRole = trimmedEmail === ROOT_ADMIN_EMAIL.toLowerCase() ? 'admin' : selectedRole;
    const finalName = name.trim() || trimmedEmail.split('@')[0];

    loginWithGoogle(trimmedEmail, finalName, finalRole, phone.trim());
    onClose();

    // If new registration for specific role, trigger corresponding modal
    if (finalRole === 'seller') {
      setIsSellerRegisterOpen(true);
    } else if (finalRole === 'delivery') {
      setIsDeliveryRegisterOpen(true);
    } else if (finalRole === 'buyer' && !user.isSignedIn) {
      setIsBuyerRegisterOpen(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-xs">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">Google / Gmail Sign-In</h3>
              <p className="text-[11px] text-slate-300">Official authentication for KuraliUpdates Bazaar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSignIn} className="p-6 space-y-4 text-xs">
          {/* Admin badge if root email typed */}
          {isRootAdmin ? (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Master Administrator Verified</p>
                <p className="text-[11px] text-amber-700">
                  Welcome Root Admin! You have exclusive privileges to manage all sellers, orders, and commissions.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 text-blue-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Register or log in with your Gmail to order products, register your shop, or become a delivery agent in Kurali.
              </span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Your Gmail Address *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="xxxx@xxx.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Jaswinder Singh"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Account Role Selection */}
          {!isRootAdmin && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Select Account Type:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('buyer')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    selectedRole === 'buyer'
                      ? 'border-amber-500 bg-amber-50/60 text-amber-900 font-bold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-amber-600" />
                  <span className="text-[11px]">Buyer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('seller')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    selectedRole === 'seller'
                      ? 'border-blue-500 bg-blue-50/60 text-blue-900 font-bold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Store className="w-4 h-4 text-blue-600" />
                  <span className="text-[11px]">Seller</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('delivery')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    selectedRole === 'delivery'
                      ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-bold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Bike className="w-4 h-4 text-emerald-600" />
                  <span className="text-[11px]">Delivery Agent</span>
                </button>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isRootAdmin ? 'Sign In as Root Administrator' : 'Continue with Google Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
