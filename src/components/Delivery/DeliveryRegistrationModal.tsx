import React from 'react';
import { ArrowRight, Bike, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface DeliveryRegistrationModalProps {
  onClose?: () => void;
}

/**
 * Legacy entry point retained for existing navigation links.
 * Actual onboarding is handled by AuthPageV2's email-OTP verified role
 * registration, which binds the profile to the authenticated user ID and
 * leaves it pending until admin approval.
 */
export const DeliveryRegistrationModal: React.FC<DeliveryRegistrationModalProps> = ({ onClose }) => {
  const { isDeliveryRegisterOpen, setIsDeliveryRegisterOpen } = useApp();

  const close = () => {
    setIsDeliveryRegisterOpen(false);
    onClose?.();
  };

  const continueToSecureRegistration = () => {
    close();
    window.location.assign('/register/delivery');
  };

  if (!isDeliveryRegisterOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <section className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <header className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Apply to join the delivery fleet</h3>
              <p className="text-xs text-emerald-100">Secure account-linked onboarding</p>
            </div>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="p-1.5 rounded-full hover:bg-white/20">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3">
            <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-700 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-950">Verify your account with email OTP</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-900">
                Applications are linked to your verified account. Delivery access starts only after admin approval;
                submitting an application does not activate a rider profile.
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Continue to the secure registration page to submit your contact and vehicle details.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
              Cancel
            </button>
            <button type="button" onClick={continueToSecureRegistration}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 inline-flex items-center gap-2">
              Continue securely <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
