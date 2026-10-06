import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Mail, MapPin, Phone, RefreshCw, ShieldCheck, Sparkles, Store, Truck, User, Home, Bike } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { KURALI_LOCALITIES } from '../../data/initialData';
import { UserRole } from '../../types';
import { bazaarApi } from '../../services/api';

type AuthMode = 'signin' | 'register';
type ContactMethod = 'email' | 'phone';

interface AuthPageV2Props {
  registrationRole?: UserRole;
}

export const AuthPageV2: React.FC<AuthPageV2Props> = ({ registrationRole = 'buyer' }) => {
  const { loginWithOtp, registerUserWithOtp, showToast } = useApp();
  const roleRegistration = registrationRole === 'seller' || registrationRole === 'delivery' || registrationRole === 'professional';

  const [authMode, setAuthMode] = useState<AuthMode>(roleRegistration ? 'register' : 'signin');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('email');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicatePrompt, setDuplicatePrompt] = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [pendingToken, setPendingToken] = useState('');
  const [pendingIdentifier, setPendingIdentifier] = useState('');
  const [pendingRegistration, setPendingRegistration] = useState<{
    name: string;
    email: string;
    phone: string;
    locality: string;
    address: string;
    storeName?: string;
    category?: string;
    vehicleType?: string;
    vehicleNumber?: string;
    licenseNumber?: string;
  } | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const localityRef = useRef<HTMLSelectElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const storeNameRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLInputElement>(null);
  const vehicleNumberRef = useRef<HTMLInputElement>(null);
  const licenseNumberRef = useRef<HTMLInputElement>(null);
  const vehicleTypeRef = useRef<HTMLSelectElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!countdown) return;
    const timer = window.setTimeout(() => setCountdown(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (step === 'otp') window.setTimeout(() => otpRef.current?.focus(), 100);
  }, [step]);

  const goLogin = () => {
    setDuplicatePrompt(false);
    setAuthMode('signin');
    setStep('form');
    setOtp('');
    setError('');
    setCountdown(0);
    window.history.pushState({}, '', '/');
    window.setTimeout(() => emailRef.current?.focus(), 100);
  };

  const openRegister = (role: UserRole = 'buyer') => {
    if (role === 'seller') {
      window.location.href = '/register/seller';
      return;
    }
    if (role === 'delivery') {
      window.location.href = '/register/delivery';
      return;
    }
    if (role === 'professional') {
      window.location.href = '/register/daily-help';
      return;
    }
    window.location.href = '/register/buyer';
  };

  const handleSendOtp = async () => {
    setError('');
    setLoading(true);

    try {
      if (authMode === 'register') {
        const email = (emailRef.current?.value || '').trim().toLowerCase();
        const phone = (phoneRef.current?.value || '').replace(/\D/g, '');
        const name = (nameRef.current?.value || '').trim();

        if (!name) throw new Error('Please enter your name');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address');
        if (!/^\d{10}$/.test(phone)) throw new Error('Please enter a valid 10-digit mobile number');
        if (registrationRole === 'seller') {
          if (!(storeNameRef.current?.value || '').trim()) throw new Error('Please enter your shop name');
          if (!(categoryRef.current?.value || '').trim()) throw new Error('Please enter your business category');
        }
        if (registrationRole === 'delivery') {
          if (!(vehicleNumberRef.current?.value || '').trim()) throw new Error('Please enter your vehicle number');
          if (!(licenseNumberRef.current?.value || '').trim()) throw new Error('Please enter your driving licence number');
        }

        const response = await bazaarApi.sendOtp(email, 'EMAIL', 'REGISTER');
        if (!response.success) {
          if (/already exists/i.test(response.message)) {
            setDuplicatePrompt(true);
            return;
          }
          throw new Error(response.message);
        }
        setPendingRegistration({
          name,
          email,
          phone,
          locality: localityRef.current?.value || KURALI_LOCALITIES[1] || 'Main Bazaar & Clock Tower',
          address: (addressRef.current?.value || '').trim(),
          storeName: storeNameRef.current?.value.trim(),
          category: categoryRef.current?.value.trim(),
          vehicleType: vehicleTypeRef.current?.value,
          vehicleNumber: vehicleNumberRef.current?.value.trim(),
          licenseNumber: licenseNumberRef.current?.value.trim(),
        });
        setPendingIdentifier(email);
        setCountdown(60);
        setOtp('');
        setStep('otp');
        showToast('Verification code sent to your email', 'info');
        return;
      }

      const identifier = contactMethod === 'email'
        ? (emailRef.current?.value || '').trim().toLowerCase()
        : (phoneRef.current?.value || '').replace(/\D/g, '');

      if (contactMethod === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) throw new Error('Please enter a valid email address');
      } else if (!/^\d{10}$/.test(identifier)) {
        throw new Error('Please enter your 10-digit mobile number');
      }

      const response = await bazaarApi.sendOtp(identifier, contactMethod === 'email' ? 'EMAIL' : 'PHONE', 'LOGIN');
      if (!response.success) throw new Error(response.message);

      setPendingIdentifier(identifier);
      setCountdown(60);
      setOtp('');
      setStep('otp');
      showToast('Verification code sent successfully', 'info');
    } catch (err: any) {
      setError(err?.message || 'Unable to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const code = otp.replace(/\D/g, '');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit verification code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (authMode === 'register') {
        const registration = pendingRegistration;
        if (!registration) throw new Error('Registration details are missing. Please start registration again.');
        const { name, email, phone, locality, address, storeName, category, vehicleType, vehicleNumber, licenseNumber } = registration;

        const response = await bazaarApi.verifyOtp({
          mode: 'REGISTER',
          name,
          role: registrationRole,
          locality,
          address,
          storeName,
          category,
          vehicleType,
          vehicleNumber,
          licenseNumber,
          email,
          phone,
          emailOtp: code,
        });

        if (!response.success || !response.token || !response.user) {
          if (/already exists/i.test(response.message || '')) {
            setDuplicatePrompt(true);
            return;
          }
          throw new Error(response.message || 'Registration verification failed');
        }

        const result = registerUserWithOtp({
          name,
          identifier: email,
          email,
          phone,
          locality,
          role: registrationRole,
          address,
          token: response.token,
          serverUser: response.user,
        });

        showToast(result.message, 'success');
        if (registrationRole === 'professional') {
          window.location.href = '/';
          return;
        }
        setOnboardingStatus('PENDING');
        setPendingToken(response.token);
        setApplicationSubmitted(true);
        return;
      }

      const identifier = pendingIdentifier;
      if (!identifier) throw new Error('Your verification session is missing. Please request a new OTP.');

      const response = await bazaarApi.verifyOtp({
        mode: 'LOGIN',
        identifier,
        otp: code,
        type: contactMethod === 'email' ? 'EMAIL' : 'PHONE',
      });

      if (!response.success || !response.token || !response.user) {
        throw new Error(response.message || 'OTP verification failed');
      }

      const serverRole = (response.user.role || '').toLowerCase();
      if ((serverRole === 'seller' || serverRole === 'delivery') && response.token) {
        const approval = await bazaarApi.getOnboardingStatus(response.token);
        if (approval.success && approval.status !== 'APPROVED') {
          setOnboardingStatus(approval.status || 'PENDING');
          setPendingToken(response.token);
          setApplicationSubmitted(true);
          return;
        }
      }

      const result = loginWithOtp({
        identifier,
        email: contactMethod === 'email' ? identifier : undefined,
        phone: contactMethod === 'phone' ? identifier : undefined,
        token: response.token,
        serverUser: response.user,
      });
      showToast(result.message, 'success');
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (applicationSubmitted) {
    const isSeller = registrationRole === 'seller';
    const isProfessional = registrationRole === 'professional';
    const statusTitle = onboardingStatus === 'APPROVED' ? (isSeller ? 'Merchant account approved' : isProfessional ? 'Daily Help professional account approved' : 'Delivery partner account approved') : onboardingStatus === 'REJECTED' ? (isSeller ? 'Merchant application not approved' : isProfessional ? 'Daily Help professional application not approved' : 'Delivery partner application not approved') : (isSeller ? 'Your merchant application is under review' : isProfessional ? 'Your Daily Help professional application is under review' : 'Your delivery partner application is under review');
    const statusMessage = onboardingStatus === 'APPROVED' ? 'Your account is approved. You can sign in and start using KuraliUpdates Bazaar.' : onboardingStatus === 'REJECTED' ? 'Your application was not approved by the Kurali admin team. Please contact support before submitting another application.' : (isSeller ? 'Our team will review your shop details before activating your merchant account.' : isProfessional ? 'Your professional profile is ready. Sign in to go available and receive nearby Daily Help jobs.' : 'Our team will review your delivery details before activating your partner account.');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200 p-7 sm:p-10 text-center">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${isSeller ? 'bg-blue-100' : 'bg-emerald-100'}`}>
            {isSeller ? <Store className="h-8 w-8 text-blue-700" /> : <Truck className="h-8 w-8 text-emerald-700" />}
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-800">
            <CheckCircle2 className="h-3.5 w-3.5" /> {onboardingStatus === 'APPROVED' ? 'Approved' : onboardingStatus === 'REJECTED' ? 'Rejected' : 'Application submitted'}
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-black text-slate-900">{statusTitle}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{statusMessage}</p>
          <div className="mt-7 grid gap-3 text-left sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black text-slate-900">1. Submitted</p><p className="mt-1 text-[11px] text-slate-500">Details received</p></div>
            <div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-black text-amber-900">2. Review</p><p className="mt-1 text-[11px] text-amber-700">Team verification</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black text-slate-900">3. Activation</p><p className="mt-1 text-[11px] text-slate-500">Access after approval</p></div>
          </div>
          <p className="mt-6 text-xs text-slate-500">You do not need to register again. Keep your email and mobile number available for future updates.</p>
          {pendingToken && onboardingStatus === 'PENDING' && (
            <button type="button" onClick={async () => { const approval = await bazaarApi.getOnboardingStatus(pendingToken); if (approval.status === 'APPROVED') { setOnboardingStatus('APPROVED'); setApplicationSubmitted(false); window.location.href = '/'; } else if (approval.status === 'REJECTED') { setOnboardingStatus('REJECTED'); } else { showToast('Your application is still under review.', 'info'); } }} className="mt-5 inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-5 py-2.5 text-xs font-black text-amber-800">Check approval status</button>
          )}
          <a href="/" className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-black text-white hover:bg-black"><ArrowLeft className="h-4 w-4" /> Return to Bazaar</a>
        </div>
      </div>
    );
  }

  const title = authMode === 'signin'
    ? 'Welcome back'
    : registrationRole === 'seller'
      ? 'Join as a Kurali Merchant'
      : registrationRole === 'delivery'
        ? 'Join Kurali Express'
        : registrationRole === 'professional'
          ? 'Join as a Daily Help Professional'
          : 'Create your buyer account';

  const subtitle = authMode === 'signin'
    ? 'Sign in securely with a one-time verification code.'
    : registrationRole === 'seller'
      ? 'Register your shop. Your merchant profile will be reviewed by the Kurali admin team.'
      : registrationRole === 'delivery'
        ? 'Register as a delivery partner. Your fleet profile will be reviewed before activation.'
        : 'Start shopping across Kurali with email verification.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 grid lg:grid-cols-5">
        <div className="lg:col-span-2 hidden lg:flex bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white p-8 flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Official Kurali Marketplace
            </div>
            <h1 className="mt-6 text-3xl font-black leading-tight">Kurali<span className="text-amber-200">Updates</span><br />Bazaar • ਕੁਰਾਲੀ</h1>
            <p className="mt-4 text-sm text-amber-100/90 leading-relaxed">A simple local marketplace for Kurali shoppers, merchants and delivery partners.</p>
            <div className="mt-8 space-y-3 text-xs font-semibold">
              <div className="flex gap-3 rounded-2xl bg-white/10 p-3"><ShieldCheck className="w-5 h-5 shrink-0" /><span>Secure email OTP registration</span></div>
              <div className="flex gap-3 rounded-2xl bg-white/10 p-3"><Store className="w-5 h-5 shrink-0" /><span>Verified local merchants</span></div>
              <div className="flex gap-3 rounded-2xl bg-white/10 p-3"><Truck className="w-5 h-5 shrink-0" /><span>Fast local delivery</span></div>
            </div>
          </div>
          <div className="text-[11px] text-amber-100/80">kuraliupdates.com • Kurali, Punjab</div>
        </div>

        <div className="lg:col-span-3 p-6 sm:p-9">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{title}</h2>
              <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
            </div>
            {roleRegistration ? (
              <a href="/" className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 whitespace-nowrap"><ArrowLeft className="w-3.5 h-3.5" /> Buyer sign in</a>
            ) : (
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button type="button" onClick={() => { setAuthMode('signin'); setStep('form'); setError(''); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${authMode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Sign In</button>
                <button type="button" onClick={() => openRegister('buyer')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${authMode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Register</button>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-900 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" /> <span>{error}</span>
            </div>
          )}

          {step === 'form' ? (
            <div className="mt-6 space-y-5">
              {authMode === 'signin' && (
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                  <button type="button" onClick={() => { setContactMethod('email'); setError(''); }} className={`py-2 rounded-lg text-xs font-bold ${contactMethod === 'email' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}><Mail className="inline w-3.5 h-3.5 mr-1" /> Email</button>
                  <button type="button" onClick={() => { setContactMethod('phone'); setError(''); }} className={`py-2 rounded-lg text-xs font-bold ${contactMethod === 'phone' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}><Phone className="inline w-3.5 h-3.5 mr-1" /> Mobile</button>
                </div>
              )}

              <div className="space-y-4">
                {authMode === 'register' && (
                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">Name <span className="text-rose-500">*</span></label>
                    <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input ref={nameRef} type="text" placeholder="Your full name" className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-amber-500 focus:bg-white" /></div>
                  </div>
                )}

                <div>
                  <label className="block mb-1 text-xs font-bold text-slate-700">{authMode === 'register' || contactMethod === 'email' ? 'Email address' : 'Mobile number'} <span className="text-rose-500">*</span></label>
                  {authMode === 'register' || contactMethod === 'email' ? (
                    <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input ref={emailRef} type="email" autoComplete="email" placeholder="name@example.com" className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-amber-500 focus:bg-white" /></div>
                  ) : (
                    <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input ref={phoneRef} type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-amber-500 focus:bg-white" /></div>
                  )}
                </div>

                {authMode === 'register' && (
                  <>
                    <div>
                      <label className="block mb-1 text-xs font-bold text-slate-700">Mobile number <span className="text-rose-500">*</span></label>
                      <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input ref={phoneRef} type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-amber-500 focus:bg-white" /></div>
                      <p className="mt-1 text-[10px] text-slate-400">Used for your account and future mobile OTP sign-in.</p>
                    </div>
                    <div>
                      <label className="block mb-1 text-xs font-bold text-slate-700">Locality</label>
                      <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><select ref={localityRef} defaultValue={KURALI_LOCALITIES[1] || 'Main Bazaar & Clock Tower'} className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-amber-500 focus:bg-white">{KURALI_LOCALITIES.map(locality => <option key={locality}>{locality}</option>)}</select></div>
                    </div>
                    <div>
                      <label className="block mb-1 text-xs font-bold text-slate-700">Address <span className="font-normal text-slate-400">(optional)</span></label>
                      <input ref={addressRef} type="text" placeholder="House / shop / landmark" className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3 text-sm outline-none focus:border-amber-500 focus:bg-white" />
                    </div>
                    {registrationRole === 'seller' && (
                      <>
                        <div>
                          <label className="block mb-1 text-xs font-bold text-slate-700">Shop name <span className="text-rose-500">*</span></label>
                          <input ref={storeNameRef} type="text" placeholder="Your shop name" className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3 text-sm outline-none focus:border-amber-500 focus:bg-white" />
                        </div>
                        <div>
                          <label className="block mb-1 text-xs font-bold text-slate-700">Business category <span className="text-rose-500">*</span></label>
                          <input ref={categoryRef} type="text" placeholder="Groceries, pharmacy, electronics..." className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3 text-sm outline-none focus:border-amber-500 focus:bg-white" />
                        </div>
                      </>
                    )}
                    {registrationRole === 'delivery' && (
                      <>
                        <div>
                          <label className="block mb-1 text-xs font-bold text-slate-700">Vehicle type <span className="text-rose-500">*</span></label>
                          <select ref={vehicleTypeRef} defaultValue="Bike" className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3 text-sm outline-none focus:border-amber-500 focus:bg-white">
                            <option>Bike</option><option>EV Bike</option><option>Scooter</option><option>Car</option>
                          </select>
                        </div>
                        <div>
                          <label className="block mb-1 text-xs font-bold text-slate-700">Vehicle number <span className="text-rose-500">*</span></label>
                          <input ref={vehicleNumberRef} type="text" placeholder="PB65AB1234" className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3 text-sm uppercase outline-none focus:border-amber-500 focus:bg-white" />
                        </div>
                        <div>
                          <label className="block mb-1 text-xs font-bold text-slate-700">Driving licence number <span className="text-rose-500">*</span></label>
                          <input ref={licenseNumberRef} type="text" placeholder="Licence number" className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3 text-sm outline-none focus:border-amber-500 focus:bg-white" />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              <button type="button" onClick={handleSendOtp} disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-xs font-black text-white shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {loading ? 'Sending verification code...' : authMode === 'signin' ? 'Send 6-Digit OTP' : 'Register with Email OTP'}
              </button>

              {authMode === 'signin' && (
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-xs font-black text-slate-900">Join KuraliUpdates in more than one role</p>
                    <p className="mt-1 text-[11px] text-slate-500">One email + mobile account can have Buyer, Seller, Rider and Daily Help profiles.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <RoleRegistrationCard
                      href="/register/seller"
                      icon={<Store className="w-5 h-5" />}
                      title="Seller"
                      description="Register your shop and sell locally."
                      className="border-blue-200 bg-blue-50 text-blue-800"
                    />
                    <RoleRegistrationCard
                      href="/register/delivery"
                      icon={<Bike className="w-5 h-5" />}
                      title="Rider"
                      description="Join the delivery fleet."
                      className="border-emerald-200 bg-emerald-50 text-emerald-800"
                    />
                    <RoleRegistrationCard
                      href="/register/daily-help"
                      icon={<Home className="w-5 h-5" />}
                      title="Daily Help"
                      description="Offer home-help services."
                      className="border-amber-200 bg-amber-50 text-amber-800"
                    />
                  </div>
                </div>
              )}

              {authMode === 'register' && registrationRole === 'buyer' && (
                <div className="text-center text-[11px] text-slate-500">
                  <a href="/register/seller" className="font-bold text-blue-700 hover:underline">Register as a Merchant</a>
                  <span className="mx-2 text-slate-300">•</span>
                  <a href="/register/delivery" className="font-bold text-emerald-700 hover:underline">Join as Delivery Partner</a>
                  <span className="mx-2 text-slate-300">•</span>
                  <a href="/register/daily-help" className="font-bold text-amber-700 hover:underline">Join as Daily Help Professional</a>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-7">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-black text-amber-900">Verification code sent</p>
                <p className="mt-1 text-[11px] text-amber-700">
                  {authMode === 'register' ? `Enter the 6-digit code sent to ${emailRef.current?.value || 'your email'}.` : `Enter the 6-digit code sent to your registered ${contactMethod}.`}
                </p>
              </div>
              <div className="mt-6">
                <label className="block mb-2 text-xs font-bold text-slate-700">6-digit verification code</label>
                <input ref={otpRef} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={e => { if (e.key === 'Enter') handleVerify(); }} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" className="w-full rounded-2xl border-2 border-slate-300 bg-slate-50 py-4 text-center font-mono text-2xl font-black tracking-[0.5em] outline-none focus:border-amber-500 focus:bg-white" />
              </div>
              <button type="button" onClick={handleVerify} disabled={loading} className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-xs font-black text-white shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
              <div className="mt-4 flex items-center justify-between text-[11px]">
                <button type="button" onClick={() => { setStep('form'); setOtp(''); setError(''); }} className="font-bold text-slate-600 hover:text-slate-900">Edit details</button>
                {countdown ? <span className="text-slate-400">Resend in {countdown}s</span> : <button type="button" onClick={handleSendOtp} className="font-bold text-amber-700 hover:underline">Resend code</button>}
              </div>
            </div>
          )}

          {authMode === 'signin' && step === 'form' && (
            <p className="mt-7 text-center text-[11px] text-slate-500">New to KuraliUpdates? <button type="button" onClick={() => openRegister('buyer')} className="font-bold text-amber-700 hover:underline">Create a buyer account</button></p>
          )}
        </div>
      </div>

      {duplicatePrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center"><AlertCircle className="w-5 h-5 text-amber-600" /></div>
            <h3 className="mt-4 text-lg font-black text-slate-900">Account already registered</h3>
            <p className="mt-2 text-sm text-slate-600">This email/mobile is already linked to an account. You can still add Seller, Rider or Daily Help as another role using the same account.</p>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => setDuplicatePrompt(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700">Stay here</button>
              <button type="button" onClick={goLogin} className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white">Go to Sign In</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const RoleRegistrationCard: React.FC<{
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  className: string;
}> = ({ href, icon, title, description, className }) => (
  <a
    href={href}
    className={`group rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${className}`}
  >
    <div className="flex items-center gap-2">
      <div className="rounded-xl bg-white/80 p-2 shadow-sm">{icon}</div>
      <span className="text-sm font-black">{title}</span>
    </div>
    <p className="mt-2 text-[11px] leading-relaxed opacity-80">{description}</p>
    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-black">Register <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" /></span>
  </a>
);
