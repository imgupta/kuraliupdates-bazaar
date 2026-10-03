import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
  ShieldCheck,
  Bike,
  ShoppingBag,
  Mail,
  Phone,
  User,
  MapPin,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  KeyRound,
  Truck,
  Check,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { KURALI_LOCALITIES, ADMIN_EMAILS, isRootAdminEmail } from '../../data/initialData';
import { UserRole } from '../../types';

export const AuthPage: React.FC = () => {
  const { loginWithOtp, registerUserWithOtp, showToast } = useApp();

  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [step, setStep] = useState<'form' | 'otp'>('form');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [locality, setLocality] = useState(KURALI_LOCALITIES[1] || 'Main Bazaar & Clock Tower');
  const [selectedRole, setSelectedRole] = useState<UserRole>('buyer');
  const [address, setAddress] = useState('');

  // OTP state
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown for OTP
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (step === 'otp' && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  // Generate 6-digit OTP
  const triggerOtpGeneration = (targetEmail: string, targetPhone: string) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setCountdown(60);
    setCanResend(false);
    setOtpValues(['', '', '', '', '', '']);
    setStep('otp');

    showToast(`Verification code sent to ${targetEmail} and ${targetPhone}`, 'info');

    // Auto-focus first input
    setTimeout(() => {
      otpInputRefs.current[0]?.focus();
    }, 150);
  };

  // Form submit handler
  const handleInitiateAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation
    const trimmedEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/\D/g, '');

    if (!trimmedEmail) {
      setValidationError('Email address is mandatory');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setValidationError('Please enter a valid email address');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      setValidationError('Mandatory 10-digit mobile phone number is required');
      return;
    }
    if (authMode === 'register' && !name.trim()) {
      setValidationError('Full Name is required for registration');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      triggerOtpGeneration(trimmedEmail, cleanPhone);
    }, 600);
  };

  // Handle OTP Box Input
  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const newValues = [...otpValues];
    newValues[index] = val.slice(-1);
    setOtpValues(newValues);

    // Auto-advance
    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace in OTP boxes
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Paste
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newValues = [...otpValues];
    for (let i = 0; i < pasted.length; i++) {
      newValues[i] = pasted[i];
    }
    setOtpValues(newValues);
    const focusIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[focusIdx]?.focus();
  };

  // Auto-fill OTP simulation
  const handleAutoFillOtp = () => {
    if (!generatedOtp) return;
    const digits = generatedOtp.split('');
    setOtpValues(digits);
    otpInputRefs.current[5]?.focus();
  };

  // Submit and verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const enteredOtp = otpValues.join('');
    if (enteredOtp.length !== 6) {
      setValidationError('Please enter the complete 6-digit OTP code');
      return;
    }

    if (enteredOtp !== generatedOtp) {
      setValidationError('Invalid OTP. Please check the simulated code banner or click resend.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const cleanPhone = phone.replace(/\D/g, '');
      const trimmedEmail = email.trim().toLowerCase();

      if (authMode === 'register') {
        const res = registerUserWithOtp({
          name: name.trim(),
          email: trimmedEmail,
          phone: cleanPhone,
          locality,
          role: selectedRole,
          address: address.trim(),
        });
        showToast(res.message, 'success');
      } else {
        const res = loginWithOtp({
          email: trimmedEmail,
          phone: cleanPhone,
          name: name.trim() || trimmedEmail.split('@')[0],
          targetRole: selectedRole,
          locality,
        });
        showToast(res.message, 'success');
      }
    }, 600);
  };

  // Quick Demo Profiles
  const fillQuickProfile = (profile: {
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    locality: string;
  }) => {
    setName(profile.name);
    setEmail(profile.email);
    setPhone(profile.phone);
    setSelectedRole(profile.role);
    setLocality(profile.locality);
    setValidationError(null);

    // Instantly simulate OTP flow
    triggerOtpGeneration(profile.email, profile.phone);
  };

  const isCurrentEmailRoot = isRootAdminEmail(email);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      {/* Decorative Blur Backgrounds */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid lg:grid-cols-12 min-h-[640px]">
        {/* Left Column: Visual Branding & Kurali Community Highlights */}
        <div className="lg:col-span-5 bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle watermark pattern */}
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <Store className="w-80 h-80" />
          </div>

          <div>
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold tracking-wide mb-6">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Official Kurali City Portal</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Kurali<span className="text-amber-200">Updates</span>
              <br />
              Bazaar &bull; ਕੁਰਾਲੀ
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-amber-100/90 leading-relaxed font-medium">
              Hyperlocal commerce platform empowering local merchants, fast 25-minute deliveries, and live shop bargaining in Kurali.
            </p>

            {/* Feature List */}
            <div className="mt-8 space-y-4 text-xs font-semibold">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white">25-Min Kurali Express</p>
                  <p className="text-[11px] text-amber-100/80">From Main Bazaar to Morinda &amp; Siswan Roads</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white">Verified Local Merchants</p>
                  <p className="text-[11px] text-amber-100/80">100% Genuine wholesale &amp; retail store prices</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white">Dual Verification Security</p>
                  <p className="text-[11px] text-amber-100/80">Mandatory Email &amp; Phone OTP Verification</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Domain Branding */}
          <div className="pt-8 border-t border-white/20 mt-8 flex items-center justify-between text-[11px] text-amber-100/80">
            <span>kuraliupdates.com &bull; kuraliupdate.com</span>
            <span className="font-mono">Mohali, Punjab</span>
          </div>
        </div>

        {/* Right Column: Dynamic Form / OTP Screen */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-white">
          {step === 'form' ? (
            <div>
              {/* Form Navigation Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {authMode === 'signin' ? 'Sign In to Bazaar' : 'Create Citizen Account'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {authMode === 'signin'
                      ? 'Enter your mandatory email and mobile phone number for OTP verification.'
                      : 'Register your details to order, sell, or deliver in Kurali City.'}
                  </p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setValidationError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      authMode === 'signin'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setValidationError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      authMode === 'register'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Register
                  </button>
                </div>
              </div>

              {/* Validation Alert */}
              {validationError && (
                <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Master Root Admin Banner if Admin email entered */}
              {isCurrentEmailRoot && (
                <div className="mb-5 p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Root Master Administrator Detected</span>
                    <span className="text-[11px] text-purple-700">
                      You will be automatically authorized for City Admin Desk operations upon OTP verification.
                    </span>
                  </div>
                </div>
              )}

              {/* Main Credentials Form */}
              <form onSubmit={handleInitiateAuth} className="space-y-4">
                {/* Full Name (For Register mode) */}
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Rahul Sharma / Baldev Singh"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Email Address (MANDATORY) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Email Address <span className="text-rose-500">* Mandatory</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Receives 6-digit OTP</span>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="e.g. shubham.gupta180296@gmail.com"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                {/* Mobile Phone Number (MANDATORY) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Mobile Phone Number <span className="text-rose-500">* Mandatory</span>
                    </label>
                    <span className="text-[10px] text-slate-400">10-Digit Indian Mobile</span>
                  </div>
                  <div className="relative flex">
                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 text-slate-600 text-xs font-bold">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="98765 43210"
                      maxLength={14}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-r-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                {/* Register Extras: Locality & Role Selection */}
                {authMode === 'register' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Kurali Locality <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <select
                            value={locality}
                            onChange={e => setLocality(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
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
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Account Profile Type
                        </label>
                        <select
                          value={selectedRole}
                          onChange={e => setSelectedRole(e.target.value as UserRole)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                        >
                          <option value="buyer">Shopper / Local Buyer</option>
                          <option value="seller">Kurali Merchant / Shopkeeper</option>
                          <option value="delivery">Delivery Agent (Fleet)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Street Address / Landmark (Optional)
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="House / Shop No., Near Fountain Chowk"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                      />
                    </div>
                  </>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending OTP Verification...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {authMode === 'signin' ? 'Verify with 6-Digit OTP' : 'Register & Verify via OTP'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick One-Click Demo Logins */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    One-Click Demo Profiles (Auto-Fills OTP)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      fillQuickProfile({
                        name: 'Shubham Gupta (Root Admin)',
                        email: 'shubham.gupta180296@gmail.com',
                        phone: '9876500001',
                        role: 'admin',
                        locality: 'Main Bazaar & Clock Tower',
                      })
                    }
                    className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-purple-700 font-bold text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Root Admin</span>
                    </div>
                    <span className="text-[10px] text-purple-600 block mt-0.5 truncate">
                      shubham.gupta
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      fillQuickProfile({
                        name: 'Sunil Aggarwal',
                        email: 'aggarwalkirana.kurali@gmail.com',
                        phone: '9876543210',
                        role: 'seller',
                        locality: 'Main Bazaar & Clock Tower',
                      })
                    }
                    className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[11px]">
                      <Store className="w-3.5 h-3.5" />
                      <span>Merchant</span>
                    </div>
                    <span className="text-[10px] text-blue-600 block mt-0.5 truncate">
                      Aggarwal Kirana
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      fillQuickProfile({
                        name: 'Gurpreet Singh',
                        email: 'gurpreet.rider@kuraliupdates.com',
                        phone: '9876588990',
                        role: 'delivery',
                        locality: 'Morinda Road',
                      })
                    }
                    className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                      <Bike className="w-3.5 h-3.5" />
                      <span>Rider Fleet</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 block mt-0.5 truncate">
                      Gurpreet Singh
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      fillQuickProfile({
                        name: 'Simran Kaur',
                        email: 'simran.kaur.kurali@gmail.com',
                        phone: '9814055667',
                        role: 'buyer',
                        locality: 'Railway Station Road',
                      })
                    }
                    className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-amber-700 font-bold text-[11px]">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Buyer</span>
                    </div>
                    <span className="text-[10px] text-amber-600 block mt-0.5 truncate">
                      Simran Kaur
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: 6-DIGIT OTP VERIFICATION SCREEN */
            <div className="animate-in fade-in space-y-5">
              {/* Back button & Title */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Verify 6-Digit OTP
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Sent to <strong className="text-slate-800">{email}</strong> and{' '}
                    <strong className="text-slate-800">+91 {phone}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                >
                  Edit Details
                </button>
              </div>

              {/* SIMULATED SMS / EMAIL OTP BANNER */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-800">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    Simulated SMS &amp; Email Gateway
                  </span>
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 font-mono px-2 py-0.5 rounded-full font-bold">
                    Active Session
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-amber-200">
                  <div className="font-mono text-base font-extrabold tracking-widest text-slate-900">
                    {generatedOtp}
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoFillOtp}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    1-Click Auto Fill
                  </button>
                </div>
                <p className="text-[11px] text-amber-700">
                  Both your email address and mobile number have been validated and issued this verification OTP.
                </p>
              </div>

              {/* Validation Error */}
              {validationError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* OTP Input Form */}
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <label className="block text-center text-xs font-bold text-slate-700 mb-3">
                    Enter the 6-digit verification code below
                  </label>

                  {/* 6 Digit Input Boxes */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                    {otpValues.map((val, idx) => (
                      <input
                        key={idx}
                        ref={el => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={val}
                        onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                        className="w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl font-black bg-slate-50 border-2 border-slate-300 rounded-2xl text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-xs"
                      />
                    ))}
                  </div>
                </div>

                {/* Resend Timer */}
                <div className="text-center text-xs text-slate-500">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={() => triggerOtpGeneration(email, phone)}
                      className="font-bold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                    >
                      Resend Verification OTP Code
                    </button>
                  ) : (
                    <span>
                      Resend available in <strong className="text-slate-800">{countdown}s</strong>
                    </span>
                  )}
                </div>

                {/* Verification Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validating Security Token...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify OTP &amp; Enter Kurali Bazaar</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
