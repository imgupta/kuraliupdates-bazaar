import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
  ShieldCheck,
  Mail,
  Phone,
  User,
  MapPin,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  KeyRound,
  Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { KURALI_LOCALITIES, isRootAdminEmail } from '../../data/initialData';
import { UserRole } from '../../types';
import { bazaarApi } from '../../services/api';

const AuthBrandingPanel = React.memo(() => (
        <div className="lg:col-span-5 [contain:layout_paint] bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <Store className="w-80 h-80" />
          </div>

          <div>
            <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide mb-6">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Official Kurali Marketplace</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Kurali<span className="text-amber-200">Updates</span>
              <br />
              Bazaar &bull; ਕੁਰਾਲੀ
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-amber-100/90 leading-relaxed font-medium">
              Hyperlocal commerce platform connecting local Kurali merchants, neighborhood buyers, and 25-minute fast deliveries.
            </p>

            <div className="mt-8 space-y-3.5 text-xs font-semibold">
              <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white">25-Min Express Delivery</p>
                  <p className="text-[11px] text-amber-100/80">From Main Bazaar to Morinda &amp; Siswan Roads</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white">Verified Local Merchants</p>
                  <p className="text-[11px] text-amber-100/80">Authentic store prices and fresh daily staples</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white">Secure OTP Verification</p>
                  <p className="text-[11px] text-amber-100/80">
                    Sign in with either Email or Phone &bull; Register with both
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/20 mt-8 flex items-center justify-between text-[11px] text-amber-100/80">
            <span>kuraliupdates.com</span>
            <span className="font-mono">Kurali, Punjab</span>
          </div>
        </div>
));

export const AuthPage: React.FC = () => {
  const { loginWithOtp, registerUserWithOtp, showToast } = useApp();

  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email');
  const [step, setStep] = useState<'form' | 'otp'>('form');

  // Form fields
  // Keep credential fields in refs so typing does not trigger an AuthPage re-render.
  // The values are read only when the form is submitted.
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const localityRef = useRef<HTMLSelectElement>(null);
  const selectedRoleRef = useRef<HTMLSelectElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);

  const [authDetails, setAuthDetails] = useState({
    name: '',
    email: '',
    phone: '',
    locality: KURALI_LOCALITIES[1] || 'Main Bazaar & Clock Tower',
    selectedRole: 'buyer' as UserRole,
    address: '',
  });
  const [isCurrentEmailRoot, setIsCurrentEmailRoot] = useState(false);

  // Active identifier for OTP verification
  const [activeIdentifier, setActiveIdentifier] = useState<string>('');

  // OTP state
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [emailOtpValues, setEmailOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [phoneOtpValues, setPhoneOtpValues] = useState<string[]>(['', '', '', '', '', '']);
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

  // Request real OTPs from the backend. Registration verifies both email and phone.
  const triggerOtpDispatch = async (identifier?: string) => {
    setIsLoading(true);
    setValidationError(null);
    try {
      if (authMode === 'register') {
        const email = authDetails.email.trim().toLowerCase();
        const phone = authDetails.phone.replace(/\D/g, '');
        const [emailRes, phoneRes] = await Promise.all([
          bazaarApi.sendOtp(email, 'EMAIL', 'REGISTER'),
          bazaarApi.sendOtp(phone, 'PHONE', 'REGISTER'),
        ]);
        if (!emailRes.success || !phoneRes.success) {
          throw new Error(emailRes.success ? phoneRes.message : emailRes.message);
        }
      } else {
        const id = (identifier || '').trim();
        const type = id.includes('@') ? 'EMAIL' : 'PHONE';
        const res = await bazaarApi.sendOtp(id, type, 'LOGIN');
        if (!res.success) throw new Error(res.message);
        setActiveIdentifier(id);
      }

      setCountdown(60);
      setCanResend(false);
      setOtpValues(['', '', '', '', '', '']);
      setEmailOtpValues(['', '', '', '', '', '']);
      setPhoneOtpValues(['', '', '', '', '', '']);
      setStep('otp');
      showToast(
        authMode === 'register'
          ? 'Verification codes sent to your email and mobile number'
          : 'Verification code sent successfully',
        'info'
      );
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Form submit handler
  const handleInitiateAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // REGISTRATION MODE: BOTH Email AND Mobile are mandatory
    if (authMode === 'register') {
      const currentName = nameRef.current?.value || '';
      const currentEmail = emailRef.current?.value || '';
      const currentPhone = phoneRef.current?.value || '';
      const currentLocality = localityRef.current?.value || KURALI_LOCALITIES[1] || 'Main Bazaar & Clock Tower';
      const currentRole = (selectedRoleRef.current?.value as UserRole) || 'buyer';
      const currentAddress = addressRef.current?.value || '';

      setAuthDetails({
        name: currentName,
        email: currentEmail,
        phone: currentPhone,
        locality: currentLocality,
        selectedRole: currentRole,
        address: currentAddress,
      });

      const trimmedName = currentName.trim();
      const trimmedEmail = currentEmail.trim().toLowerCase();
      const cleanPhone = currentPhone.replace(/\D/g, '');

      if (!trimmedName) {
        setValidationError('Full Name is required for registration');
        return;
      }
      if (!trimmedEmail) {
        setValidationError('Email Address is mandatory for registration');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setValidationError('Please enter a valid email address (e.g. name@domain.com)');
        return;
      }
      if (!cleanPhone || cleanPhone.length < 10) {
        setValidationError('10-Digit Mobile Phone Number is mandatory for registration');
        return;
      }

      // Dispatch OTP to primary contact for registration verification
      await triggerOtpDispatch(trimmedEmail);
    } else {
      // SIGN IN MODE: Either Email OR Mobile is mandatory
      let identifier = '';
      if (contactMethod === 'email') {
        const trimmedEmail = (emailRef.current?.value || '').trim().toLowerCase();
        if (!trimmedEmail) {
          setValidationError('Please enter your email address to sign in');
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
          setValidationError('Please enter a valid email address');
          return;
        }
        identifier = trimmedEmail;
      } else {
        const cleanPhone = (phoneRef.current?.value || '').replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 10) {
          setValidationError('Please enter your 10-digit mobile phone number to sign in');
          return;
        }
        identifier = cleanPhone;
      }

      await triggerOtpDispatch(identifier);
    }
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

  // Submit and verify OTP. The backend is the only authority.
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const isRegister = authMode === 'register';
    const enteredOtp = otpValues.join('');
    const emailOtp = emailOtpValues.join('');
    const phoneOtp = phoneOtpValues.join('');

    if (isRegister) {
      if (emailOtp.length !== 6 || phoneOtp.length !== 6) {
        setValidationError('Please enter both 6-digit verification codes');
        return;
      }
    } else if (enteredOtp.length !== 6) {
      setValidationError('Please enter the complete 6-digit verification code');
      return;
    }

    setIsLoading(true);
    try {
      const isEmail = activeIdentifier.includes('@');
      const verifyRes = await bazaarApi.verifyOtp({
        mode: isRegister ? 'REGISTER' : 'LOGIN',
        identifier: isRegister ? undefined : activeIdentifier,
        otp: isRegister ? undefined : enteredOtp,
        type: isRegister ? undefined : (isEmail ? 'EMAIL' : 'PHONE'),
        name: isRegister ? authDetails.name.trim() : undefined,
        role: isRegister ? authDetails.selectedRole : undefined,
        locality: isRegister ? authDetails.locality : undefined,
        address: isRegister ? authDetails.address.trim() : undefined,
        email: isRegister ? authDetails.email.trim().toLowerCase() : (isEmail ? activeIdentifier : undefined),
        phone: isRegister ? authDetails.phone.replace(/\D/g, '') : (!isEmail ? activeIdentifier : undefined),
        emailOtp: isRegister ? emailOtp : undefined,
        phoneOtp: isRegister ? phoneOtp : undefined,
      });

      if (!verifyRes.success || !verifyRes.token) {
        setValidationError(verifyRes.message || 'OTP verification failed');
        return;
      }

      if (isRegister) {
        const res = registerUserWithOtp({
          name: authDetails.name.trim(),
          identifier: authDetails.email.trim().toLowerCase(),
          email: authDetails.email.trim().toLowerCase(),
          phone: authDetails.phone.replace(/\D/g, ''),
          locality: authDetails.locality,
          role: authDetails.selectedRole,
          address: authDetails.address.trim(),
          token: verifyRes.token,
        });
        showToast(res.message, 'success');
      } else {
        const res = loginWithOtp({
          identifier: activeIdentifier,
          email: isEmail ? activeIdentifier : undefined,
          phone: !isEmail ? activeIdentifier : undefined,
          targetRole: authDetails.selectedRole,
          locality: authDetails.locality,
          token: verifyRes.token,
        });
        showToast(res.message, 'success');
      }
    } catch (err: any) {
      setValidationError(err?.message || 'Verification service error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };



  

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid lg:grid-cols-12 min-h-[580px]">
          <AuthBrandingPanel />

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
                      ? 'Sign in using either your Email OR Mobile Phone.'
                      : 'Both Email and Mobile Phone are required for new registration.'}
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

              {/* Root Admin Banner if Admin email entered */}
              {isCurrentEmailRoot && (
                <div className="mb-5 p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Administrator Account</span>
                    <span className="text-[11px] text-purple-700">
                      You will be authorized for City Admin Desk operations upon OTP verification.
                    </span>
                  </div>
                </div>
              )}

              {/* FOR SIGN IN ONLY: Choose Contact Method Toggle (Email OR Mobile) */}
              {authMode === 'signin' && (
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Sign in using
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setContactMethod('email');
                        setValidationError(null);
                      }}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        contactMethod === 'email'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email Address</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setContactMethod('phone');
                        setValidationError(null);
                      }}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        contactMethod === 'phone'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Mobile Number</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Main Credentials Form */}
              <form onSubmit={handleInitiateAuth} className="space-y-4">
                {/* Full Name (For Register mode) */}
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">* Mandatory</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        ref={nameRef}
                        type="text"
                        placeholder="e.g. Jaswinder Singh"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Email Address Field */}
                {/* Visible in Register mode (mandatory), or Sign In mode if Email selected */}
                {(authMode === 'register' || contactMethod === 'email') && (
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
                        ref={emailRef}
                        type="email"
                        onBlur={() => setIsCurrentEmailRoot(isRootAdminEmail(emailRef.current?.value || ''))}
                        placeholder="xxxx@xxx.com"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Mobile Phone Number Field */}
                {/* Visible in Register mode (mandatory), or Sign In mode if Phone selected */}
                {(authMode === 'register' || contactMethod === 'phone') && (
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
                        ref={phoneRef}
                        type="tel"
                        placeholder="XXXXXXXXXX"
                        maxLength={14}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-r-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Register Extras: Locality & Role Selection */}
                {authMode === 'register' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Kurali Locality <span className="text-rose-500">* Mandatory</span>
                        </label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <select
                            ref={localityRef}
                            defaultValue={authDetails.locality}
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
                          ref={selectedRoleRef}
                          defaultValue={authDetails.selectedRole}
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
                        ref={addressRef}
                        type="text"
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
                      <span>Sending Verification Code...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {authMode === 'signin' ? 'Send 6-Digit OTP' : 'Register & Send OTP'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
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
                    {authMode === 'register' ? (
                      <>
                        Sent to <strong className="text-slate-800">{authDetails.email}</strong> and{' '}
                        <strong className="text-slate-800">+91 {authDetails.phone}</strong>
                      </>
                    ) : (
                      <>
                        Sent to{' '}
                        <strong className="text-slate-800">
                          {contactMethod === 'phone' ? `+91 ${activeIdentifier}` : activeIdentifier}
                        </strong>
                      </>
                    )}
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

              {/* Never display the OTP in the browser. It is delivered by the configured provider. */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-800">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    Verification Code
                  </span>
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 font-mono px-2 py-0.5 rounded-full font-bold">
                    Expires in {countdown}s
                  </span>
                </div>
                <p className="text-[11px] text-amber-700">
                  {authMode === 'register'
                    ? 'Enter the separate 6-digit codes sent to your email and mobile number.'
                    : 'Enter the 6-digit code sent to your registered contact.'}
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
                {authMode === 'register' ? (
                  <>
                    <div>
                      <label className="block text-center text-xs font-bold text-slate-700 mb-3">
                        Email verification code
                      </label>
                      <div className="flex items-center justify-center gap-2 sm:gap-3">
                        {emailOtpValues.map((val, idx) => (
                          <input
                            key={idx}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={val}
                            onChange={e => {
                              const value = e.target.value;
                              if (!/^\d*$/.test(value)) return;
                              const next = [...emailOtpValues];
                              next[idx] = value.slice(-1);
                              setEmailOtpValues(next);
                              if (value && idx < 5) document.getElementById(`email-otp-${idx + 1}`)?.focus();
                            }}
                            id={`email-otp-${idx}`}
                            className="w-10                 {/* Resend Timer */}
                <div className="text-center text-xs text-slate-500">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={() => triggerOtpDispatch(authMode === 'register' ? undefined : activeIdentifier)}
                      className="font-bold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                    >
                      Resend Verification Code
                    </button>
                  ) : (
                    <span>
                      Resend code in <strong className="text-slate-800">{countdown}s</strong>
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
                      <span>Authenticating Session...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify &amp; Continue to Bazaar</span>
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
