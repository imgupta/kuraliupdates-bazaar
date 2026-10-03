import React, { useState } from 'react';
import { X, Bike, CheckCircle2, Phone, ShieldCheck, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { KURALI_LOCALITIES } from '../../data/initialData';

interface DeliveryRegistrationModalProps {
  onClose: () => void;
}

export const DeliveryRegistrationModal: React.FC<DeliveryRegistrationModalProps> = ({ onClose }) => {
  const { registerDeliveryAgent, user } = useApp();

  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [email, setEmail] = useState(user.email || '');
  const [vehicleType, setVehicleType] = useState<'Bike' | 'Scooter' | 'Electric Bike' | 'Auto / Van'>('Bike');
  const [vehicleNumber, setVehicleNumber] = useState('PB 65 AB ');
  const [licenseNumber, setLicenseNumber] = useState('PB-65-2024-');
  const [currentLocality, setCurrentLocality] = useState(KURALI_LOCALITIES[1] || 'Main Bazaar');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    registerDeliveryAgent({
      name,
      phone,
      email,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      currentLocality,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                Join Kurali Express Delivery Fleet
              </h2>
              <p className="text-xs text-emerald-100">
                Earn ₹45 - ₹95 per trip across Kurali city
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

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Flexible Payouts:</strong> Review pickup store, distance, and earnings offer before accepting any job in Kurali!
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Full Legal Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Gurpreet Singh"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 00000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Gmail / Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="rider@kuraliupdates.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Vehicle Type *
              </label>
              <select
                value={vehicleType}
                onChange={e => setVehicleType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
              >
                <option value="Bike">Motorcycle / Bike</option>
                <option value="Scooter">Scooter / Activa</option>
                <option value="Electric Bike">Electric Bike / EV</option>
                <option value="Auto / Van">Auto / Delivery Van</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Vehicle Number Plate *
              </label>
              <input
                type="text"
                required
                value={vehicleNumber}
                onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="PB 65 AB 1234"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none uppercase font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Driving License / ID *
              </label>
              <input
                type="text"
                required
                value={licenseNumber}
                onChange={e => setLicenseNumber(e.target.value.toUpperCase())}
                placeholder="PB-65-XXXX"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Primary Kurali Zone *
              </label>
              <select
                value={currentLocality}
                onChange={e => setCurrentLocality(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
              >
                {KURALI_LOCALITIES.filter(l => !l.startsWith('All')).map(loc => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Complete Registration &amp; Start Accepting Jobs
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
