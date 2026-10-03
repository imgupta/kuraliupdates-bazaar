import React, { useState } from 'react';
import { X, Sparkles, Store, Bike, ShoppingBag, ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

interface GmailAuthModalProps {
  onClose: () => void;
}

export const GmailAuthModal: React.FC<GmailAuthModalProps> = ({ onClose }) => {
  const { loginWithGoogle, user, sellers, deliveryAgents } = useApp();
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [targetRole, setTargetRole] = useState<UserRole>('seller');

  const presetAccounts = [
    {
      role: 'seller' as UserRole,
      name: 'Sunil Aggarwal',
      storeName: 'Aggarwal Super Kirana & Provision',
      email: 'aggarwalkirana.kurali@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80',
      badge: 'Approved Kirana Store',
    },
    {
      role: 'seller' as UserRole,
      name: 'Vikas Sharma',
      storeName: 'Punjab Mobile Care & Electronics',
      email: 'punjabmobiles.kurali@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      badge: 'Electronics & Mobiles',
    },
    {
      role: 'seller' as UserRole,
      name: 'Manpreet Singh Dhillon',
      storeName: 'Dhillon Organic Farm & Health Store',
      email: 'manpreet.dhillon.kurali@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      badge: 'Pending Admin Review',
    },
    {
      role: 'delivery' as UserRole,
      name: 'Gurpreet Singh (Rider)',
      storeName: 'Hero Splendor (PB 65 AB 4589)',
      email: 'gurpreet.rider@kuraliupdates.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      badge: 'Delivery Partner',
    },
    {
      role: 'buyer' as UserRole,
      name: 'Simranjit Kaur',
      storeName: 'Kurali Resident (Dashmesh Nagar)',
      email: 'simran.kurali@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      badge: 'Local Buyer',
    },
  ];

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    const nameToUse = customName.trim() || customEmail.split('@')[0];
    loginWithGoogle(customEmail.trim(), nameToUse, targetRole);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
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
              <h3 className="font-extrabold text-sm tracking-tight">
                Google / Gmail Sign-In
              </h3>
              <p className="text-[11px] text-slate-300">
                Authenticate your Seller or Rider profile on kuraliupdates.com
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-900 block mb-1">
              Select a Demo Profile or Enter Any Gmail:
            </span>
            <span>
              Click any verified Kurali store owner or rider below to test account management instantly.
            </span>
          </div>

          {/* Quick preset accounts */}
          <div className="space-y-2">
            {presetAccounts.map((acc, idx) => (
              <button
                key={idx}
                onClick={() => {
                  loginWithGoogle(acc.email, acc.name, acc.role);
                  onClose();
                }}
                className="w-full p-3 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={acc.avatar}
                    alt={acc.name}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900">
                        {acc.name}
                      </span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded-full">
                        {acc.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{acc.storeName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{acc.email}</p>
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
              </button>
            ))}
          </div>

          <div className="relative my-3 text-center">
            <span className="bg-white px-2 text-[11px] text-slate-400 font-medium relative z-10">
              Or Use Your Own Gmail
            </span>
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-slate-200" />
          </div>

          {/* Custom Email Form */}
          <form onSubmit={handleCustomLogin} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Your Gmail Address *
              </label>
              <input
                type="email"
                required
                placeholder="yourname@gmail.com"
                value={customEmail}
                onChange={e => setCustomEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Gurminder Singh"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Authenticate As
                </label>
                <select
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                >
                  <option value="seller">Seller Portal</option>
                  <option value="delivery">Delivery Agent</option>
                  <option value="buyer">Local Buyer</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
            >
              Sign In with Google
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
