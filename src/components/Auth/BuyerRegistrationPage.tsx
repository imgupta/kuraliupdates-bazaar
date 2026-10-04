import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Mail, MapPin, Phone, ShieldCheck, ShoppingBag, Sparkles, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { bazaarApi } from '../../services/api';
import { DeliveryLocation, LocationPicker } from './LocationPicker';

export const BuyerRegistrationPage: React.FC = () => {
  const { registerUserWithOtp, showToast } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [landmark, setLandmark] = useState('');
  const [location, setLocation] = useState<DeliveryLocation | null>(null);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!countdown) return;
    const timer = window.setTimeout(() => setCountdown(v => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const sendOtp = async () => {
    setError('');
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.replace(/\D/g, '');
    const normalizedAddressLine = addressLine.trim();
    const normalizedLandmark = landmark.trim();

    if (!normalizedName) return setError('Please enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return setError('Please enter a valid email address.');
    if (!/^\d{10}$/.test(normalizedPhone)) return setError('Please enter a valid 10-digit mobile number.');
    if (!normalizedAddressLine) return setError('Please enter your house / flat / building details.');
    if (!normalizedLandmark) return setError('Please enter a nearby landmark so our rider can find you easily.');

    setLoading(true);
    const response = await bazaarApi.sendOtp(normalizedEmail, 'EMAIL', 'REGISTER');
    setLoading(false);
    if (!response.success) {
      setError(response.message);
      return;
    }
    setCountdown(60);
    setStep('otp');
    showToast('Verification code sent to your email', 'info');
  };

  const verify = async () => {
    const code = otp.replace(/\D/g, '');
    if (code.length !== 6) return setError('Enter the complete 6-digit OTP.');
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.replace(/\D/g, '');
    const normalizedAddressLine = addressLine.trim();
    const normalizedLandmark = landmark.trim();
    setLoading(true);
    const response = await bazaarApi.verifyOtp({
      mode: 'REGISTER',
      role: 'BUYER',
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      locality: 'Kurali',
      address: [normalizedAddressLine, normalizedLandmark, location?.formattedAddress].filter(Boolean).join(', '),
      addressLine1: normalizedAddressLine,
      landmark: normalizedLandmark,
      formattedAddress: location?.formattedAddress,
      placeId: location?.placeId,
      latitude: location?.latitude,
      longitude: location?.longitude,
      emailOtp: code,
    } as any);
    setLoading(false);

    if (!response.success || !response.token || !response.user) {
      setError(response.message || 'Registration verification failed.');
      return;
    }

    registerUserWithOtp({
      name,
      identifier: normalizedEmail,
      email: normalizedEmail,
      phone: normalizedPhone,
      locality: 'Kurali',
      role: 'buyer',
      address: [addressLine, landmark, location?.formattedAddress].filter(Boolean).join(', '),
      token: response.token,
      serverUser: response.user,
    });
    showToast(location ? 'Buyer account created. Delivery location saved.' : 'Buyer account created. You can add a delivery location anytime from My Account.', 'success');
    setStep('done');
  };

  if (step === 'done') {
    return <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 flex items-center justify-center p-4"><div className="w-full max-w-xl rounded-3xl bg-white p-8 text-center shadow-2xl"><CheckCircle2 className="w-14 h-14 mx-auto text-emerald-600" /><h1 className="mt-4 text-2xl font-black text-slate-900">Welcome to KuraliUpdates Bazaar</h1><p className="mt-2 text-sm text-slate-600">Your buyer account is ready. You can add a precise delivery location anytime from My Account.</p><a href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-black text-white"><ArrowLeft className="w-4 h-4" /> Continue to Bazaar</a></div></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 sm:p-8 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black"><Sparkles className="w-3.5 h-3.5" /> Kurali Express Delivery</div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-black">Set up your doorstep delivery</h1>
          <p className="mt-2 text-sm text-amber-50 max-w-2xl">Add your delivery location now or skip it and add it later from My Account.</p>
        </div>
        <div className="p-5 sm:p-8 space-y-6">
          <div className="flex justify-end">
            <a href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-amber-700">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </a>
          </div>
          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-900 flex gap-2"><AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />{error}</div>}
          {step === 'form' ? <>
            <div className="grid md:grid-cols-3 gap-4">
              <Field icon={<User />} label="Full name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
              <Field icon={<Mail />} label="Email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" type="email" />
              <Field icon={<Phone />} label="Mobile" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile" inputMode="numeric" />
            </div>
            <div><LocationPicker value={location} onChange={setLocation} /><p className="mt-2 text-[11px] text-slate-500">Optional during registration. You can add or change your delivery location later from My Account.</p></div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field icon={<MapPin />} label="House / Flat / Building" value={addressLine} onChange={e => setAddressLine(e.target.value)} placeholder="Flat 201, House 14, Building name" />
              <Field icon={<MapPin />} label="Nearby landmark" value={landmark} onChange={e => setLandmark(e.target.value)} placeholder="Near Gurudwara / school / market" />
            </div>
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div><p className="text-xs font-black text-emerald-900">Why we need precise location</p><p className="text-[11px] text-emerald-800 mt-1">Your address pin helps us show nearby stores, calculate delivery distance and give riders a reliable doorstep destination. We only use it for marketplace and delivery services.</p></div>
            </div>
            <button type="button" onClick={sendOtp} disabled={loading} className="w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-black text-white hover:bg-black disabled:opacity-50"><ShoppingBag className="inline w-4 h-4 mr-2" /> {loading ? 'Sending verification code…' : 'Continue & send email OTP'}</button>
          </> : <div className="max-w-md mx-auto text-center py-8">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center"><Mail className="w-7 h-7 text-amber-700" /></div>
            <h2 className="mt-4 text-xl font-black text-slate-900">Verify your email</h2>
            <p className="mt-2 text-xs text-slate-500">Enter the 6-digit code sent to your email.</p>
            <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="mt-5 w-full rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 py-4 text-center text-2xl font-black tracking-[0.5em] outline-none focus:border-amber-500" placeholder="000000" />
            <button type="button" onClick={verify} disabled={loading} className="mt-4 w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-black text-white disabled:opacity-50">{loading ? 'Creating account…' : 'Verify & create buyer account'}</button>
            <button type="button" onClick={sendOtp} disabled={countdown > 0 || loading} className="mt-3 text-xs font-bold text-amber-700 disabled:text-slate-400">{countdown ? `Resend in ${countdown}s` : 'Resend OTP'}</button>
          </div>}
        </div>
      </div>
    </div>
  );
};

const Field = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode; label: string }>(
  ({ icon, label, ...props }, ref) => (
    <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">{label} <b className="text-rose-500">*</b></span><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">{icon}</span><input ref={ref} {...props} className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-amber-500 focus:bg-white" /></div></label>
  )
);