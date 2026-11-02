import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Store } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { KURALI_LOCALITIES } from '../../data/initialData';
import { API_BASE_URL, bazaarApi } from '../../services/api';
import { DeliveryLocation, LocationPicker } from './LocationPicker';

type Language = 'en' | 'pa' | 'hi';
type Step = 1 | 2 | 3 | 4 | 5;
type BusinessType = 'INDIVIDUAL' | 'PROPRIETORSHIP' | 'PARTNERSHIP' | 'COMPANY';

const COPY = {
  en: {
    title: 'Join as a Kurali Merchant', intro: 'Register your shop in five simple steps.',
    steps: ['Owner & contact', 'Shop identity', 'Shop location', 'Compliance', 'Operations & review'],
    next: 'Continue', back: 'Back', send: 'Send email OTP', verify: 'Verify & submit',
    name: 'Owner / authorised representative name', email: 'Email address', phone: 'Mobile number',
    locality: 'Kurali locality', address: 'Additional address / landmark', shop: 'Shop name',
    category: 'Business category', constitution: 'Business constitution', legalName: 'Registered legal name',
    shopNumber: 'Shop number (optional)', ward: 'Ward (optional)', street: 'Street / mohalla / locality', pin: 'PIN code',
    map: 'Pin your actual shop location', gst: 'GSTIN (if registered)', gstDoc: 'GST certificate',
    fssai: 'FSSAI number (if applicable)', fssaiType: 'FSSAI licence type', fssaiDoc: 'FSSAI certificate',
    opening: 'Opening time', closing: 'Closing time', closed: 'Weekly closing day',
    shopPhoto: 'Shop-front photograph', agreement: 'I confirm that the information is accurate and accept the Seller Agreement, marketplace terms and privacy notice.',
    foodNote: 'If your activity requires FSSAI registration/licensing, provide the details and evidence before seller activation. This is reviewed by the admin team.',
    radius: 'Seller registration is currently limited to the configured radius around Kurali. Your shop location is checked by the server.',
    otp: 'Enter the six-digit code sent to your email.', review: 'Review your details, then verify your email to submit the application.',
    error: 'Please review the highlighted information and try again.'
  },
  pa: {
    title: 'ਕੁਰਾਲੀ ਦੇ ਵਪਾਰੀ ਵਜੋਂ ਜੁੜੋ', intro: 'ਪੰਜ ਆਸਾਨ ਕਦਮਾਂ ਵਿੱਚ ਆਪਣੀ ਦੁਕਾਨ ਰਜਿਸਟਰ ਕਰੋ।',
    steps: ['ਮਾਲਕ ਅਤੇ ਸੰਪਰਕ', 'ਦੁਕਾਨ ਦੀ ਜਾਣਕਾਰੀ', 'ਦੁਕਾਨ ਦਾ ਪਤਾ', 'ਦਸਤਾਵੇਜ਼', 'ਸਮਾਂ ਅਤੇ ਸਮੀਖਿਆ'],
    next: 'ਅੱਗੇ ਜਾਓ', back: 'ਪਿੱਛੇ', send: 'ਈਮੇਲ OTP ਭੇਜੋ', verify: 'ਤਸਦੀਕ ਕਰੋ ਅਤੇ ਜਮ੍ਹਾਂ ਕਰੋ',
    name: 'ਮਾਲਕ / ਅਧਿਕਾਰਤ ਨੁਮਾਇੰਦੇ ਦਾ ਨਾਮ', email: 'ਈਮੇਲ ਪਤਾ', phone: 'ਮੋਬਾਈਲ ਨੰਬਰ',
    locality: 'ਕੁਰਾਲੀ ਦਾ ਇਲਾਕਾ', address: 'ਵਾਧੂ ਪਤਾ / ਨਿਸ਼ਾਨੀ', shop: 'ਦੁਕਾਨ ਦਾ ਨਾਮ',
    category: 'ਕਾਰੋਬਾਰ ਦੀ ਸ਼੍ਰੇਣੀ', constitution: 'ਕਾਰੋਬਾਰ ਦੀ ਕਿਸਮ', legalName: 'ਰਜਿਸਟਰਡ ਕਾਨੂੰਨੀ ਨਾਮ',
    shopNumber: 'ਦੁਕਾਨ ਨੰਬਰ (ਵਿਕਲਪਿਕ)', ward: 'ਵਾਰਡ (ਵਿਕਲਪਿਕ)', street: 'ਗਲੀ / ਮੁਹੱਲਾ / ਇਲਾਕਾ', pin: 'ਪਿੰਨ ਕੋਡ',
    map: 'ਆਪਣੀ ਦੁਕਾਨ ਦੀ ਸਹੀ ਥਾਂ ਚੁਣੋ', gst: 'GSTIN (ਜੇ ਰਜਿਸਟਰ ਹੈ)', gstDoc: 'GST ਸਰਟੀਫਿਕੇਟ',
    fssai: 'FSSAI ਨੰਬਰ (ਜੇ ਲਾਗੂ ਹੋਵੇ)', fssaiType: 'FSSAI ਲਾਇਸੈਂਸ ਕਿਸਮ', fssaiDoc: 'FSSAI ਸਰਟੀਫਿਕੇਟ',
    opening: 'ਖੁੱਲ੍ਹਣ ਦਾ ਸਮਾਂ', closing: 'ਬੰਦ ਹੋਣ ਦਾ ਸਮਾਂ', closed: 'ਹਫ਼ਤਾਵਾਰੀ ਛੁੱਟੀ',
    shopPhoto: 'ਦੁਕਾਨ ਦੇ ਸਾਹਮਣੇ ਦੀ ਤਸਵੀਰ', agreement: 'ਮੈਂ ਜਾਣਕਾਰੀ ਦੀ ਸਹੀ ਹੋਣ ਦੀ ਪੁਸ਼ਟੀ ਕਰਦਾ/ਕਰਦੀ ਹਾਂ ਅਤੇ ਵਪਾਰੀ ਸਮਝੌਤੇ ਅਤੇ ਨਿੱਜਤਾ ਨੋਟਿਸ ਨੂੰ ਸਵੀਕਾਰ ਕਰਦਾ/ਕਰਦੀ ਹਾਂ।',
    foodNote: 'ਜੇ ਤੁਹਾਡੇ ਕਾਰੋਬਾਰ ਲਈ FSSAI ਰਜਿਸਟ੍ਰੇਸ਼ਨ/ਲਾਇਸੈਂਸ ਲਾਜ਼ਮੀ ਹੈ, ਤਾਂ ਵਿਕਰੇਤਾ ਸਰਗਰਮ ਹੋਣ ਤੋਂ ਪਹਿਲਾਂ ਵੇਰਵੇ ਅਤੇ ਸਬੂਤ ਦਿਓ।',
    radius: 'ਦੁਕਾਨ ਦੀ ਥਾਂ ਦੀ ਜਾਂਚ ਸਰਵਰ ਵੱਲੋਂ ਕੁਰਾਲੀ ਦੇ ਨਿਰਧਾਰਤ ਘੇਰੇ ਅਨੁਸਾਰ ਕੀਤੀ ਜਾਵੇਗੀ।',
    otp: 'ਈਮੇਲ ਤੇ ਭੇਜਿਆ ਛੇ ਅੰਕਾਂ ਦਾ ਕੋਡ ਦਰਜ ਕਰੋ।', review: 'ਵੇਰਵਿਆਂ ਦੀ ਜਾਂਚ ਕਰੋ ਅਤੇ ਈਮੇਲ ਤਸਦੀਕ ਕਰਕੇ ਅਰਜ਼ੀ ਜਮ੍ਹਾਂ ਕਰੋ।',
    error: 'ਕਿਰਪਾ ਕਰਕੇ ਜਾਣਕਾਰੀ ਦੀ ਜਾਂਚ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
  },
  hi: {
    title: 'कुराली के व्यापारी के रूप में जुड़ें', intro: 'पाँच आसान चरणों में अपनी दुकान पंजीकृत करें।',
    steps: ['मालिक और संपर्क', 'दुकान की जानकारी', 'दुकान का स्थान', 'अनुपालन दस्तावेज़', 'समय और समीक्षा'],
    next: 'आगे बढ़ें', back: 'पीछे', send: 'ईमेल OTP भेजें', verify: 'सत्यापित करें और जमा करें',
    name: 'मालिक / अधिकृत प्रतिनिधि का नाम', email: 'ईमेल पता', phone: 'मोबाइल नंबर',
    locality: 'कुराली का इलाका', address: 'अतिरिक्त पता / पहचान', shop: 'दुकान का नाम',
    category: 'व्यवसाय श्रेणी', constitution: 'व्यवसाय का प्रकार', legalName: 'पंजीकृत कानूनी नाम',
    shopNumber: 'दुकान नंबर (वैकल्पिक)', ward: 'वार्ड (वैकल्पिक)', street: 'सड़क / मोहल्ला / इलाका', pin: 'पिन कोड',
    map: 'अपनी दुकान का सही स्थान चुनें', gst: 'GSTIN (यदि पंजीकृत)', gstDoc: 'GST प्रमाणपत्र',
    fssai: 'FSSAI नंबर (यदि लागू हो)', fssaiType: 'FSSAI लाइसेंस प्रकार', fssaiDoc: 'FSSAI प्रमाणपत्र',
    opening: 'खुलने का समय', closing: 'बंद होने का समय', closed: 'साप्ताहिक अवकाश',
    shopPhoto: 'दुकान के सामने की तस्वीर', agreement: 'मैं पुष्टि करता/करती हूँ कि जानकारी सही है और विक्रेता समझौते तथा गोपनीयता सूचना को स्वीकार करता/करती हूँ।',
    foodNote: 'यदि आपके व्यवसाय के लिए FSSAI पंजीकरण/लाइसेंस आवश्यक है, तो विक्रेता सक्रिय होने से पहले विवरण और प्रमाण दें।',
    radius: 'दुकान के स्थान की जाँच सर्वर द्वारा कुराली के निर्धारित दायरे के अनुसार की जाएगी।',
    otp: 'ईमेल पर भेजा गया छह अंकों का कोड दर्ज करें।', review: 'विवरण जाँचें और ईमेल सत्यापित करके आवेदन जमा करें।',
    error: 'कृपया जानकारी जाँचें और पुनः प्रयास करें।'
  }
} as const;

const CATEGORIES = [
  ['Grocery', 'Grocery / Food retail'], ['Bakery', 'Bakery'], ['Restaurant', 'Restaurant / Prepared food'],
  ['Dairy', 'Dairy'], ['Meat', 'Meat / Poultry'], ['Pharmacy', 'Pharmacy'],
  ['Clothing', 'Clothing'], ['Electronics', 'Electronics'], ['General Retail', 'General retail / Other non-food']
];
const FOOD_CATEGORIES = new Set(['Grocery', 'Bakery', 'Restaurant', 'Dairy', 'Meat']);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block space-y-1.5 text-xs font-bold text-slate-700">
    <span>{label}</span>
    {children}
  </label>
);
const inputClass = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100';

export const SellerRegistrationWizard: React.FC = () => {
  const { registerUserWithOtp, showToast } = useApp();
  const [language, setLanguage] = useState<Language>('en');
  const t = COPY[language];
  const [step, setStep] = useState<Step>(1);
  const [otpStep, setOtpStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');
  const [applicationCreated, setApplicationCreated] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [locality, setLocality] = useState(KURALI_LOCALITIES[1] || 'Main Bazaar & Clock Tower');
  const [address, setAddress] = useState('');
  const [storeName, setStoreName] = useState('');
  const [category, setCategory] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('INDIVIDUAL');
  const [registeredBusinessName, setRegisteredBusinessName] = useState('');
  const [shopNumber, setShopNumber] = useState('');
  const [wardNumber, setWardNumber] = useState('');
  const [streetLocality, setStreetLocality] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [location, setLocation] = useState<DeliveryLocation | null>(null);
  const [gstNumber, setGstNumber] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [fssaiLicenseType, setFssaiLicenseType] = useState('');
  const [openingTime, setOpeningTime] = useState('');
  const [closingTime, setClosingTime] = useState('');
  const [weeklyClosedDay, setWeeklyClosedDay] = useState('');
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [shopFrontPhoto, setShopFrontPhoto] = useState<File | null>(null);
  const [gstCertificate, setGstCertificate] = useState<File | null>(null);
  const [fssaiCertificate, setFssaiCertificate] = useState<File | null>(null);
  const [serviceArea, setServiceArea] = useState<{ radiusKm: number; enabled: boolean; centerLatitude: number; centerLongitude: number } | null>(null);
  const [uploadedDocumentTypes, setUploadedDocumentTypes] = useState<string[]>([]);

  const isFood = FOOD_CATEGORIES.has(category);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/seller-service-area`)
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Service area unavailable')))
      .then(value => { if (active) setServiceArea({ radiusKm: Number(value.radiusKm), enabled: Boolean(value.enabled), centerLatitude: Number(value.centerLatitude), centerLongitude: Number(value.centerLongitude) }); })
      .catch(() => { if (active) setServiceArea(null); });
    return () => { active = false; };
  }, []);

  const validateStep = (): boolean => {
    if (step === 1) {
      if (!name.trim()) throw new Error('Enter the owner or authorised representative name');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Enter a valid email address');
      if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) throw new Error('Enter a valid 10-digit mobile number');
    }
    if (step === 2) {
      if (!storeName.trim()) throw new Error('Enter your shop name');
      if (!category) throw new Error('Select a business category');
      if (businessType !== 'INDIVIDUAL' && !registeredBusinessName.trim()) throw new Error('Enter the registered legal business name');
    }
    if (step === 3) {
      if (!streetLocality.trim()) throw new Error('Enter your shop street or locality');
      if (!/^\d{6}$/.test(pinCode.trim())) throw new Error('Enter a valid 6-digit PIN code');
      if (!location) throw new Error('Pin your actual shop location on the map');
    }
    if (step === 4) {
      if (gstNumber.trim() && !gstCertificate) throw new Error('Upload the GST certificate when providing a GSTIN');
      if (gstNumber.trim() && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(gstNumber.trim().toUpperCase())) throw new Error('Enter a valid GSTIN format');
      if (fssaiNumber.trim() && !/^\d{14}$/.test(fssaiNumber.trim())) throw new Error('FSSAI number must contain 14 digits');
      if (fssaiNumber.trim() && !fssaiCertificate) throw new Error('Upload the FSSAI certificate when providing an FSSAI number');
    }
    if (step === 5) {
      if (!shopFrontPhoto) throw new Error('Upload a shop-front photograph');
      if (!agreementAccepted) throw new Error('Accept the seller agreement to continue');
    }
    return true;
  };

  const uploadDocuments = async (authToken: string) => {
    const pending = [
      ['SHOP_FRONT_PHOTO', shopFrontPhoto],
      ['GST_CERTIFICATE', gstCertificate],
      ['FSSAI_CERTIFICATE', fssaiCertificate],
    ] as const;
    const uploaded = new Set(uploadedDocumentTypes);
    for (const [documentType, file] of pending) {
      if (!file || uploaded.has(documentType)) continue;
      const result = await bazaarApi.uploadSellerDocument(authToken, documentType, file);
      if (!result.success) throw new Error(result.message || `Unable to upload ${documentType}. Retry the upload.`);
      uploaded.add(documentType);
      setUploadedDocumentTypes([...uploaded]);
    }
  };

  const submitRegistration = async () => {
    if (!otpStep) {
      const check = await bazaarApi.checkRegistration(email.trim().toLowerCase(), phone.replace(/\D/g, ''), 'SELLER');
      if (!check.success) throw new Error(check.message || 'Unable to validate account details');
      const sent = await bazaarApi.sendOtp(email.trim().toLowerCase(), 'EMAIL', 'REGISTER');
      if (!sent.success) throw new Error(sent.message || 'Unable to send verification code');
      setOtpStep(true);
      showToast('Verification code sent to your email', 'info');
      return;
    }
    if (otp.replace(/\D/g, '').length !== 6) throw new Error('Enter the complete six-digit email OTP');
    const response = await bazaarApi.verifyOtp({
      mode: 'REGISTER', name: name.trim(), role: 'seller', locality, address,
      storeName: storeName.trim(), category, businessType,
      registeredBusinessName: registeredBusinessName.trim() || name.trim(),
      shopNumber: shopNumber.trim(), wardNumber: wardNumber.trim(), streetLocality: streetLocality.trim(),
      pinCode: pinCode.trim(), gstNumber: gstNumber.trim(), fssaiNumber: fssaiNumber.trim(),
      fssaiLicenseType, openingTime, closingTime, weeklyClosedDay,
      agreementAccepted, agreementVersion: 'seller-terms-2026-11-01',
      latitude: location?.latitude, longitude: location?.longitude,
      formattedAddress: location?.formattedAddress, placeId: location?.placeId,
      email: email.trim().toLowerCase(), phone: phone.replace(/\D/g, ''), emailOtp: otp.replace(/\D/g, '')
    });
    if (!response.success || !response.token || !response.user) throw new Error(response.message || 'Seller registration failed');
    setToken(response.token);
    setApplicationCreated(true);
    registerUserWithOtp({
      name, identifier: email.trim().toLowerCase(), email: email.trim().toLowerCase(),
      phone: phone.replace(/\D/g, ''), locality, role: 'seller', address,
      token: response.token, serverUser: response.user
    });
    await uploadDocuments(response.token);
    showToast('Seller application submitted. It will be reviewed by the Kurali admin team.', 'success');
    setSubmissionComplete(true);
  };

  const handleContinue = async () => {
    setError('');
    try {
      validateStep();
      if (step < 5) {
        setStep((step + 1) as Step);
        return;
      }
      setLoading(true);
      await submitRegistration();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally {
      setLoading(false);
    }
  };

  const retryDocuments = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      await uploadDocuments(token);
      showToast('Documents uploaded successfully. Your seller application is submitted for review.', 'success');
      setSubmissionComplete(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Document upload failed');
    } finally {
      setLoading(false);
    }
  };

  const control = (value: string, onChange: (value: string) => void, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input {...props} value={value} onChange={event => onChange(event.target.value)} className={inputClass} />
  );

  if (submissionComplete) {
    return <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4"><section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-2xl"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600"/><h1 className="mt-4 text-2xl font-black text-slate-900">Application submitted</h1><p className="mt-3 text-sm leading-relaxed text-slate-600">Your seller profile and uploaded documents have been received. Your shop will remain pending until the KuraliUpdates admin team reviews the profile, shop-front photo and all applicable compliance evidence.</p><p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">You cannot publish products or accept orders until approval is granted.</p><button type="button" onClick={() => { window.location.href = '/'; }} className="mt-5 w-full rounded-xl bg-slate-900 p-3 text-sm font-bold text-white">Continue to KuraliUpdates</button></section></main>;
  }

  if (applicationCreated && token && error) {
    return <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4"><section className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl"><h1 className="text-xl font-black text-slate-900">Your seller account is created</h1><p className="mt-2 text-sm text-slate-600">Your account is safe. One or more documents still need to upload. Replace a rejected local file if needed, then retry; successfully uploaded documents will not be duplicated.</p><p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p><div className="mt-4 space-y-3"><label className="block text-xs font-bold text-slate-700">Shop-front photograph<input type="file" accept="image/jpeg,image/png" capture="environment" onChange={event=>setShopFrontPhoto(event.target.files?.[0]||null)} className="mt-1 w-full rounded-xl border p-2"/></label><label className="block text-xs font-bold text-slate-700">GST certificate<input type="file" accept="application/pdf,image/jpeg,image/png" onChange={event=>setGstCertificate(event.target.files?.[0]||null)} className="mt-1 w-full rounded-xl border p-2"/></label><label className="block text-xs font-bold text-slate-700">FSSAI certificate<input type="file" accept="application/pdf,image/jpeg,image/png" onChange={event=>setFssaiCertificate(event.target.files?.[0]||null)} className="mt-1 w-full rounded-xl border p-2"/></label></div><button type="button" onClick={retryDocuments} disabled={loading} className="mt-4 w-full rounded-xl bg-amber-600 p-3 text-sm font-bold text-white">{loading ? 'Uploading…' : 'Retry document upload'}</button></section></main>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 flex items-center justify-center p-3 sm:p-6">
      <section className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 text-white sm:p-8">
          <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><Store className="h-8 w-8"/><div><h1 className="text-xl font-black sm:text-2xl">{t.title}</h1><p className="mt-1 text-xs text-amber-50">{t.intro}</p></div></div><select aria-label="Language" value={language} onChange={event => setLanguage(event.target.value as Language)} className="rounded-lg border border-white/30 bg-white/15 px-2 py-2 text-xs text-white"><option className="text-slate-900" value="en">English</option><option className="text-slate-900" value="pa">ਪੰਜਾਬੀ</option><option className="text-slate-900" value="hi">हिन्दी</option></select></div>
        </header>
        <div className="p-5 sm:p-8">
          <div className="mb-6 grid grid-cols-5 gap-2">{t.steps.map((label, index) => <div key={label} className="min-w-0"><div className={`h-1.5 rounded-full ${step >= index + 1 ? 'bg-amber-500' : 'bg-slate-200'}`}/><p className={`mt-2 text-[9px] leading-tight ${step === index + 1 ? 'font-black text-slate-900' : 'text-slate-500'}`}>{index + 1}. {label}</p></div>)}</div>
          {error && <div role="alert" className="mb-5 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</div>}
          {!otpStep ? (
            <div className="space-y-4">
              {step === 1 && <div className="grid gap-4 sm:grid-cols-2"><Field label={t.name}>{control(name,setName,{autoComplete:'name',placeholder:'Full name'})}</Field><Field label={t.email}>{control(email,setEmail,{type:'email',autoComplete:'email',placeholder:'name@example.com'})}</Field><Field label={t.phone}>{control(phone,setPhone,{type:'tel',inputMode:'numeric',maxLength:10,placeholder:'10-digit mobile number'})}</Field></div>}
              {step === 2 && <div className="grid gap-4 sm:grid-cols-2"><Field label={t.shop}>{control(storeName,setStoreName,{placeholder:'Shop name'})}</Field><Field label={t.category}><select value={category} onChange={event=>setCategory(event.target.value)} className={inputClass}><option value="">Select category</option>{CATEGORIES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field><Field label={t.constitution}><select value={businessType} onChange={event=>setBusinessType(event.target.value as BusinessType)} className={inputClass}><option value="INDIVIDUAL">Individual</option><option value="PROPRIETORSHIP">Proprietorship</option><option value="PARTNERSHIP">Partnership</option><option value="COMPANY">Company / LLP</option></select></Field>{businessType!=='INDIVIDUAL'&&<Field label={t.legalName}>{control(registeredBusinessName,setRegisteredBusinessName,{placeholder:'Name as per registration'})}</Field>}</div>}
              {step === 3 && <div className="space-y-4"><p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900">{t.radius} {serviceArea?.enabled ? `Configured radius: ${serviceArea.radiusKm} km.` : 'Service-area configuration will be checked by the server.'}</p><div className="grid gap-4 sm:grid-cols-2"><Field label={t.locality}><select value={locality} onChange={event=>setLocality(event.target.value)} className={inputClass}>{KURALI_LOCALITIES.map(item=><option key={item}>{item}</option>)}</select></Field><Field label={t.address}>{control(address,setAddress,{placeholder:'Landmark or additional address'})}</Field><Field label={t.shopNumber}>{control(shopNumber,setShopNumber)}</Field><Field label={t.ward}>{control(wardNumber,setWardNumber)}</Field><Field label={t.street}>{control(streetLocality,setStreetLocality)}</Field><Field label={t.pin}>{control(pinCode,setPinCode,{inputMode:'numeric',maxLength:6,placeholder:'140103'})}</Field></div><div><p className="mb-2 text-xs font-bold text-slate-700">{t.map}</p><LocationPicker value={location} onChange={setLocation} purpose="shop" initialCenter={serviceArea ? { latitude: serviceArea.centerLatitude, longitude: serviceArea.centerLongitude } : undefined}/></div></div>}
              {step === 4 && <div className="space-y-4"><Field label={t.gst}>{control(gstNumber,setGstNumber,{maxLength:15,placeholder:'15-character GSTIN',onChange:undefined})}</Field>{gstNumber.trim()&&<Field label={t.gstDoc}><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={event=>setGstCertificate(event.target.files?.[0]||null)} className={inputClass}/></Field>}<div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{t.foodNote}</div>{isFood&&<><Field label={t.fssai}>{control(fssaiNumber,setFssaiNumber,{maxLength:14,placeholder:'14-digit FSSAI number'})}</Field><Field label={t.fssaiType}><select value={fssaiLicenseType} onChange={event=>setFssaiLicenseType(event.target.value)} className={inputClass}><option value="">Select licence type if applicable</option><option>Basic Registration</option><option>State Licence</option><option>Central Licence</option></select></Field><Field label={t.fssaiDoc}><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={event=>setFssaiCertificate(event.target.files?.[0]||null)} className={inputClass}/></Field></>}</div>}
              {step === 5 && <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label={t.opening}>{control(openingTime,setOpeningTime,{type:'time'})}</Field><Field label={t.closing}>{control(closingTime,setClosingTime,{type:'time'})}</Field></div><Field label={t.closed}><select value={weeklyClosedDay} onChange={event=>setWeeklyClosedDay(event.target.value)} className={inputClass}><option value="">No fixed weekly closure</option>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day=><option key={day}>{day}</option>)}</select></Field><Field label={t.shopPhoto}><input type="file" accept="image/jpeg,image/png" capture="environment" onChange={event=>setShopFrontPhoto(event.target.files?.[0]||null)} className={inputClass}/></Field><label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700"><input type="checkbox" checked={agreementAccepted} onChange={event=>setAgreementAccepted(event.target.checked)} className="mt-0.5 h-4 w-4"/><span>{t.agreement} <a href="/seller-agreement.html" target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline">Seller Agreement</a></span></label><div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">{t.review}<div className="mt-2 font-semibold">{storeName} · {category} · {streetLocality}, {pinCode}</div></div></div>}
              <div className="flex gap-3 pt-2">{step>1&&<button type="button" onClick={()=>setStep((step-1) as Step)} disabled={loading} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700">{t.back}</button>}<button type="button" onClick={handleContinue} disabled={loading||!serviceArea?.enabled} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-black text-white disabled:opacity-50">{loading?<Loader2 className="h-4 w-4 animate-spin"/>:<ArrowRight className="h-4 w-4"/>}{step<5?t.next:t.send}</button></div>
            </div>
          ) : (
            <div className="space-y-4"><div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{t.otp}</div><Field label="6-digit OTP"><input value={otp} onChange={event=>setOtp(event.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={inputClass}/></Field><div className="flex gap-3"><button type="button" onClick={()=>setOtpStep(false)} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold">{t.back}</button><button type="button" onClick={handleContinue} disabled={loading} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white disabled:opacity-50">{loading?<Loader2 className="h-4 w-4 animate-spin"/>:<CheckCircle2 className="h-4 w-4"/>}{t.verify}</button></div></div>
          )}
        </div>
      </section>
    </main>
  );
};
