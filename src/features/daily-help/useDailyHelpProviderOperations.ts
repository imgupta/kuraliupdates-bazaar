import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { dailyHelpProviderApi } from '../../services/domains/dailyHelpProviderApi';
import type { DailyHelpBooking, DailyHelpProfessional, DailyHelpProfessionalEarnings, DailyHelpSlot } from '../../types';

const ACTIVE_STATUSES = ['PROFESSIONAL_ASSIGNED', 'ARRIVING', 'READY_TO_START', 'IN_PROGRESS'];

export const useDailyHelpProviderOperations = () => {
  const { user, showToast } = useApp();
  const [professional, setProfessional] = useState<DailyHelpProfessional | null>(null);
  const [earnings, setEarnings] = useState<DailyHelpProfessionalEarnings | null>(null);
  const [availableJobs, setAvailableJobs] = useState<DailyHelpBooking[]>([]);
  const [jobs, setJobs] = useState<DailyHelpBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [completionOtpInputs, setCompletionOtpInputs] = useState<Record<string, string>>({});
  const [overrideReasons, setOverrideReasons] = useState<Record<string, string>>({});
  const [now, setNow] = useState(Date.now());
  const [slotDate, setSlotDate] = useState(new Date().toISOString().slice(0, 10));
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('11:00');
  const [mySlots, setMySlots] = useState<DailyHelpSlot[]>([]);
  const [registrationName, setRegistrationName] = useState(user.name || '');
  const [registrationWardNumber, setRegistrationWardNumber] = useState('');
  const [registering, setRegistering] = useState(false);

  const load = async (silent = false) => {
    if (!user.phone) return;
    if (!silent) setLoading(true);
    const profile = await dailyHelpProviderApi.getDailyHelpProfessionalByPhone(user.phone);
    if (!profile) {
      setProfessional(null);
      setLoading(false);
      return;
    }
    setProfessional(profile);
    const [nextJobs, history, money] = await Promise.all([
      dailyHelpProviderApi.getDailyHelpProfessionalAvailableJobs(profile.professionalId),
      dailyHelpProviderApi.getDailyHelpProfessionalJobs(profile.professionalId),
      dailyHelpProviderApi.getDailyHelpProfessionalEarnings(profile.professionalId),
    ]);
    setAvailableJobs(nextJobs);
    setJobs(history);
    setEarnings(money);
    const slotsForDate = await dailyHelpProviderApi.getDailyHelpProfessionalSlots(profile.professionalId, slotDate);
    setMySlots(slotsForDate as DailyHelpSlot[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user.phone]);

  useEffect(() => {
    if (!professional?.professionalId) return;
    dailyHelpProviderApi.getDailyHelpProfessionalSlots(professional.professionalId, slotDate).then(data => setMySlots(data as DailyHelpSlot[]));
  }, [professional?.professionalId, slotDate]);

  useEffect(() => {
    if (!professional?.professionalId) return;
    const interval = window.setInterval(() => void load(true), 10000);
    return () => window.clearInterval(interval);
  }, [professional?.professionalId]);

  useEffect(() => {
    if (!jobs.some(j => j.status === 'IN_PROGRESS' && j.serviceStartedAt)) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [jobs]);

  const activeJobs = useMemo(
    () => jobs.filter(j => ACTIVE_STATUSES.includes(j.status)),
    [jobs]
  );

  const register = async () => {
    const name = registrationName.trim();
    const locality = user.locality?.trim() || 'Kurali';
    const wardNumber = registrationWardNumber.trim();
    const phone = user.phone?.trim() || '';
    if (!name || !phone || !wardNumber) {
      showToast('Enter your full name and ward number. Your signed-in mobile number is required.', 'error');
      return;
    }
    setRegistering(true);
    try {
      const created = await dailyHelpProviderApi.registerDailyHelpProfessional({ name, phone, locality, wardNumber });
      if (!created) {
        showToast('Profile was not created. Check your signed-in mobile number and try again.', 'error');
        return;
      }
      setProfessional(created);
      showToast('Professional profile created successfully.', 'success');
      await load(true);
    } catch (error: any) {
      showToast(error?.message || 'Unable to create Daily Help professional profile.', 'error');
    } finally {
      setRegistering(false);
    }
  };

  const toggleAvailability = async () => {
    if (!professional) return;
    setRefreshing(true);
    const next = professional.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
    const updated = await dailyHelpProviderApi.updateDailyHelpProfessionalAvailability(
      professional.professionalId,
      next,
      professional.currentLocality
    );
    setRefreshing(false);
    if (!updated) {
      showToast('Unable to update availability.', 'error');
      return;
    }
    setProfessional(updated);
    showToast(next === 'AVAILABLE' ? 'You are now available for Daily Help jobs.' : 'You are now offline.', 'success');
    await load(true);
  };

  const accept = async (bookingId: string) => {
    if (!professional) return;
    const result = await dailyHelpProviderApi.acceptDailyHelpJob(professional.professionalId, bookingId);
    if (!result) {
      showToast('This job is no longer available.', 'error');
      await load(true);
      return;
    }
    showToast('Job accepted. Customer details are now available.', 'success');
    await load(true);
  };

  const setStatus = async (booking: DailyHelpBooking, status: 'ARRIVING' | 'READY_TO_START') => {
    if (!professional) return;
    const result = await dailyHelpProviderApi.updateDailyHelpBookingStatus(booking.id, professional.professionalId, status);
    if (!result) {
      showToast('Unable to update job status.', 'error');
      return;
    }
    showToast(status === 'ARRIVING' ? 'Customer notified that you are on the way.' : 'Arrival marked. Ask the customer for the OTP.', 'success');
    await load(true);
  };

  const start = async (booking: DailyHelpBooking) => {
    if (!professional) return;
    const otp = (otpInputs[booking.id] || '').replace(/\D/g, '');
    if (otp.length !== 4) {
      showToast('Enter the 4-digit customer OTP.', 'error');
      return;
    }
    const result = await dailyHelpProviderApi.startDailyHelpBooking(booking.id, professional.professionalId, otp);
    if (!result) {
      showToast('OTP verification failed or the booking is not ready.', 'error');
      return;
    }
    setOtpInputs(prev => ({ ...prev, [booking.id]: '' }));
    showToast('OTP verified. Service timer has started.', 'success');
    await load(true);
  };

  const complete = async (booking: DailyHelpBooking, useOverride = false) => {
    if (!professional) return;
    const otp = (completionOtpInputs[booking.id] || '').replace(/\D/g, '');
    const overrideReason = (overrideReasons[booking.id] || '').trim();
    if (!useOverride && otp.length !== 4) {
      showToast('Enter the 4-digit customer completion OTP.', 'error');
      return;
    }
    if (useOverride && overrideReason.length < 10) {
      showToast('Enter at least 10 characters explaining why the customer OTP is unavailable.', 'error');
      return;
    }
    const result = await dailyHelpProviderApi.completeDailyHelpBooking(
      booking.id, professional.professionalId,
      useOverride ? { overrideReason } : { otp }
    );
    if (!result) {
      showToast('Completion failed. Verify the customer OTP or review the override reason.', 'error');
      return;
    }
    setCompletionOtpInputs(prev => ({ ...prev, [booking.id]: '' }));
    setOverrideReasons(prev => ({ ...prev, [booking.id]: '' }));
    showToast(useOverride ? 'Service completed with audited OTP override.' : 'Customer OTP verified. Service completed.', 'success');
    await load(true);
  };

  const openNavigation = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank', 'noopener,noreferrer');
  };

  const createSlot = async () => {
    if (!professional) return;
    if (slotEnd <= slotStart) {
      showToast('End time must be later than start time.', 'error');
      return;
    }
    try {
      await dailyHelpProviderApi.createDailyHelpProfessionalSlot(professional.professionalId, slotDate, slotStart, slotEnd);
      showToast('Availability window added. Buyers can book available time within it.', 'success');
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Unable to add availability.', 'error');
    } finally {
      setMySlots(await dailyHelpProviderApi.getDailyHelpProfessionalSlots(professional.professionalId, slotDate) as DailyHelpSlot[]);
    }
  };

  const cancelSlot = async (slotId: string) => {
    if (!professional) return;
    try {
      await dailyHelpProviderApi.cancelDailyHelpProfessionalSlot(professional.professionalId, slotId);
      setMySlots(await dailyHelpProviderApi.getDailyHelpProfessionalSlots(professional.professionalId, slotDate) as DailyHelpSlot[]);
      showToast('Availability slot removed.', 'success');
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Unable to remove slot.', 'error');
    }
  };

  return {
    professional, earnings, availableJobs, jobs, loading, refreshing, setRefreshing, otpInputs, setOtpInputs, completionOtpInputs, setCompletionOtpInputs, overrideReasons, setOverrideReasons, now,
    slotDate, setSlotDate, slotStart, setSlotStart, slotEnd, setSlotEnd, mySlots,
    registrationName, setRegistrationName,
    registrationWardNumber, setRegistrationWardNumber, registering, activeJobs,
    register, toggleAvailability, accept, setStatus, start, complete, openNavigation, createSlot, cancelSlot, load,
  };
};
