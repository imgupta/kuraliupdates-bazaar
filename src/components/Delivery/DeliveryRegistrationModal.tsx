import React, { useState } from 'react';
import {
  X,
  Bike,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Mail,
  User,
  MapPin,
  CreditCard,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { KURALI_LOCALITIES } from '../../data/initialData';

interface DeliveryRegistrationModalProps {
  onClose?: () => void;
}

export const DeliveryRegistrationModal: React.FC<DeliveryRegistrationModalProps> = ({ onClose }) => {
  const {
    isDeliveryRegisterOpen,
    setIsDeliveryRegisterOpen,
    registerDeliveryAgent,
    user,
    showToast,
  } = useApp();

  const handleClose = () => {
    if (onClose) onClose();
    setIsDeliveryRegisterOpen(false);
  };

  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [vehicleType, setVehicleType] = useState<'Bike' | 'Scooter' | 'Electric Bike' | 'Auto / Van'>('Bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [locality, setLocality] = useState(KURALI_LOCALITIES[1]);

  if (!isDeliveryRegisterOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim() || !vehicleNumber.trim()) {
      showToast('Please fill all mandatory driver fields.', 'error');
      return;
    }

    registerDeliveryAgent({
      name: name.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}.rider@kuraliupdates.com`,
      phone: phone.trim(),
      vehicleType,
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      licenseNumber: licenseNumber.trim().toUpperCase() || 'PB-65-2026-ACTIVE',
      currentLocality: locality,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        name
      )}&backgroundColor=10b981,0284c7,f59e0b`,
    });

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Bike className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Join Kurali Express Fleet</h3>
              <p className="text-xs text-emerald-100">Earn per delivery across Kurali local routes</p>
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
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Instant Rider Activation</p>
              <p className="text-[11px] text-emerald-800">
                Guaranteed base payout of ₹45 - ₹75 per delivered local order + customer tips.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Rider Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Gurpreet Singh"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Mobile Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 88990"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="rider@kuraliupdates.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Vehicle Type</label>
              <select
                value={vehicleType}
                onChange={e => setVehicleType(e.target.value as 'Bike' | 'Scooter' | 'Electric Bike' | 'Auto / Van')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
              >
                <option value="Bike">Motorcycle / Bike</option>
                <option value="Scooter">Scooter / Activa</option>
                <option value="Electric Bike">Electric Bike (EV)</option>
                <option value="Auto / Van">Auto / Delivery Van</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Vehicle Registration No. <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={e => setVehicleNumber(e.target.value)}
                placeholder="PB 65 AB 4589"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white uppercase"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Driving License Number</label>
              <input
                type="text"
                value={licenseNumber}
                onChange={e => setLicenseNumber(e.target.value)}
                placeholder="PB-65-2022-00431"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white uppercase"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Preferred Locality / Hub</label>
              <select
                value={locality}
                onChange={e => setLocality(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
              >
                {KURALI_LOCALITIES.slice(1).map(loc => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Register &amp; Activate Driver Wallet</span>
          </button>
        </form>
      </div>
    </div>
  );
};
