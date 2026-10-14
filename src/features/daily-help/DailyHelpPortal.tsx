import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck, CalendarClock, CheckCircle2, Clock3, IndianRupee, MapPin,
  Navigation, Phone, Power, RefreshCw, ShieldCheck, Timer, Wallet, XCircle, KeyRound
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { bazaarApi } from '../../services/api';
import { DailyHelpBooking, DailyHelpProfessional, DailyHelpProfessionalEarnings, DailyHelpSlot } from '../../types';

const ACTIVE_STATUSES = ['PROFESSIONAL_ASSIGNED', 'ARRIVING', 'READY_TO_START', 'IN_PROGRESS'];

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const statusLabel: Record<string, string> = {
  PROFESSIONAL_ASSIGNED: 'Assigned',
  ARRIVING: 'On the way',
  READY_TO_START: 'At customer location',
  IN_PROGRESS: 'Service in progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const DailyHelpProfessionalDashboard: React.FC = () => {
  const { user, showToast } = useApp();
  const [professional, setProfessional] = useState<DailyHelpProfessional | null>(null);
  const [earnings, setEarnings] = useState<DailyHelpProfessionalEarnings | null>(null);
  const [availableJobs, setAvailableJobs] = useState<DailyHelpBooking[]>([]);
  const [jobs, setJobs] = useState<DailyHelpBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [now, setNow] = useState(Date.now());
  const [slotDate, setSlotDate] = useState(new Date().toISOString().slice(0, 10));
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('11:00');
  const [mySlots, setMySlots] = useState<DailyHelpSlot[]>([]);

  const load = async (silent = false) => {
    if (!user.phone) return;
    if (!silent) setLoading(true);
    const profile = await bazaarApi.getDailyHelpProfessionalByPhone(user.phone);
    if (!profile) {
      setProfessional(null);
      setLoading(false);
      return;
    }
    setProfessional(profile);
    const [nextJobs, history, money] = await Promise.all([
      bazaarApi.getDailyHelpProfessionalAvailableJobs(profile.professionalId),
      bazaarApi.getDailyHelpProfessionalJobs(profile.professionalId),
      bazaarApi.getDailyHelpProfessionalEarnings(profile.professionalId),
    ]);
    setAvailableJobs(nextJobs);
    setJobs(history);
    setEarnings(money);
    const slotsForDate = await bazaarApi.getDailyHelpProfessionalSlots(profile.professionalId, slotDate);
    setMySlots(slotsForDate as DailyHelpSlot[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user.phone]);

  useEffect(() => {
    if (!professional?.professionalId) return;
    bazaarApi.getDailyHelpProfessionalSlots(professional.professionalId, slotDate).then(data => setMySlots(data as DailyHelpSlot[]));
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
    if (!user.name || !user.phone || !user.locality) {
      showToast('Name, mobile number and locality are required.', 'error');
      return;
    }
    const created = await bazaarApi.registerDailyHelpProfessional({
      name: user.name,
      phone: user.phone,
      locality: user.locality,
    });
    if (!created) {
      showToast('Unable to create Daily Help professional profile.', 'error');
      return;
    }
    setProfessional(created);
    showToast('Professional profile created successfully.', 'success');
    await load(true);
  };

  const toggleAvailability = async () => {
    if (!professional) return;
    setRefreshing(true);
    const next = professional.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
    const updated = await bazaarApi.updateDailyHelpProfessionalAvailability(
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
    const result = await bazaarApi.acceptDailyHelpJob(professional.professionalId, bookingId);
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
    const result = await bazaarApi.updateDailyHelpBookingStatus(booking.id, professional.professionalId, status);
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
    const result = await bazaarApi.startDailyHelpBooking(booking.id, professional.professionalId, otp);
    if (!result) {
      showToast('OTP verification failed or the booking is not ready.', 'error');
      return;
    }
    setOtpInputs(prev => ({ ...prev, [booking.id]: '' }));
    showToast('OTP verified. Service timer has started.', 'success');
    await load(true);
  };

  const complete = async (booking: DailyHelpBooking) => {
    if (!professional) return;
    const result = await bazaarApi.completeDailyHelpBooking(booking.id, professional.professionalId);
    if (!result) {
      showToast('Unable to complete the service.', 'error');
      return;
    }
    showToast('Service completed successfully.', 'success');
    await load(true);
  };

  const openNavigation = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">Loading Daily Help professional workspace...</div>;
  }

  if (!professional) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 text-center shadow-sm">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center"><ShieldCheck className="w-8 h-8" /></div>
        <h1 className="text-xl font-black text-slate-900 mt-4">Become a Daily Help professional</h1>
        <p className="text-sm text-slate-500 mt-2">Use your signed-in profile to create your professional account and start receiving hourly home-help jobs.</p>
        <button onClick={register} className="mt-5 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-black cursor-pointer">Create Professional Profile</button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 rounded-3xl p-5 sm:p-7 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-amber-300" /></div>
              <div>
                <h1 className="text-xl font-black">{professional.fullName}</h1>
                <p className="text-xs text-slate-300 flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5 text-emerald-300" /> Verified Daily Help professional</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-300">★ {professional.rating} ({professional.reviewCount} reviews) · {professional.currentLocality}</div>
          </div>
          <button onClick={toggleAvailability} disabled={refreshing} className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer ${professional.status === 'AVAILABLE' ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white border border-white/20'}`}>
            <Power className="w-4 h-4" /> {professional.status === 'AVAILABLE' ? 'Available' : 'Go Available'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-white/10">
          <div><p className="text-[10px] uppercase text-slate-400 font-bold">Today</p><p className="text-lg font-black">₹{earnings?.today || 0}</p></div>
          <div><p className="text-[10px] uppercase text-slate-400 font-bold">Lifetime</p><p className="text-lg font-black">₹{earnings?.lifetime || 0}</p></div>
          <div><p className="text-[10px] uppercase text-slate-400 font-bold">Completed</p><p className="text-lg font-black">{earnings?.completedBookings || 0}</p></div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">My Availability Slots</h2>
            <p className="text-xs text-slate-500 mt-1">Add exact bookable timings. Customers will only see slots that match their requested duration.</p>
          </div>
          <CalendarClock className="w-5 h-5 text-amber-600" />
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="text-[11px] font-bold text-slate-700">Date
            <input type="date" min={new Date().toISOString().slice(0,10)} value={slotDate} onChange={e => setSlotDate(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5" />
          </label>
          <label className="text-[11px] font-bold text-slate-700">Start
            <input type="time" value={slotStart} onChange={e => setSlotStart(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5" />
          </label>
          <label className="text-[11px] font-bold text-slate-700">End
            <input type="time" value={slotEnd} onChange={e => setSlotEnd(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5" />
          </label>
        </div>
        <button
          onClick={async () => {
            try {
              const created = await bazaarApi.createDailyHelpProfessionalSlot(professional.professionalId, slotDate, slotStart, slotEnd);
              if (created) {
                showToast('Availability slot added.', 'success');
                setMySlots(await bazaarApi.getDailyHelpProfessionalSlots(professional.professionalId, slotDate) as DailyHelpSlot[]);
              }
            } catch (err: any) {
              showToast(err?.message || 'Unable to add availability slot.', 'error');
            }
          }}
          className="mt-3 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black cursor-pointer"
        >Add Availability Slot</button>

        <div className="mt-4 space-y-2">
          {mySlots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500">No slots added for this date.</div>
          ) : mySlots.map(slot => (
            <div key={slot.slotId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <div>
                <p className="text-xs font-black text-slate-900">{slot.startTime.slice(0,5)} - {slot.endTime.slice(0,5)}</p>
                <p className="text-[10px] text-slate-500">{slot.status === 'BOOKED' ? 'Booked' : slot.status === 'AVAILABLE' ? 'Available to customers' : 'Cancelled'}</p>
              </div>
              {slot.status === 'AVAILABLE' && (
                <button
                  onClick={async () => {
                    try {
                      await bazaarApi.cancelDailyHelpProfessionalSlot(professional.professionalId, slot.slotId);
                      setMySlots(await bazaarApi.getDailyHelpProfessionalSlots(professional.professionalId, slotDate) as DailyHelpSlot[]);
                      showToast('Availability slot removed.', 'success');
                    } catch (err: any) {
                      showToast(err?.message || 'Unable to remove slot.', 'error');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-black cursor-pointer"
                >Remove</button>
              )}
            </div>
          ))}
        </div>
      </section>

      {activeJobs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Active Jobs</h2><span className="text-xs text-emerald-700 font-bold">{activeJobs.length} active</span></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeJobs.map(job => {
              const elapsed = job.serviceStartedAt ? Math.floor((now - new Date(job.serviceStartedAt).getTime()) / 1000) : 0;
              return (
                <article key={job.id} className="bg-white border-2 border-amber-300 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between gap-3">
                    <div><p className="font-mono text-[10px] font-black text-amber-700">{job.id}</p><h3 className="font-black text-slate-900 mt-1">{job.serviceName}</h3><p className="text-xs text-slate-500">{job.requestedHours} hr · ₹{job.hourlyRate}/hr · {statusLabel[job.status]}</p></div>
                    <CalendarClock className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-xs space-y-2">
                    <div className="font-bold text-slate-800">{job.buyerName}</div>
                    <div className="flex items-start gap-2 text-slate-600"><MapPin className="w-4 h-4 shrink-0" />{job.address}</div>
                    <div className="flex items-center gap-2 text-slate-600"><Phone className="w-4 h-4" />{job.buyerPhone}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openNavigation(job.address)} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-[11px] font-black flex items-center gap-1.5 cursor-pointer"><Navigation className="w-4 h-4" /> Navigate</button>
                    {job.status === 'PROFESSIONAL_ASSIGNED' && <button onClick={() => setStatus(job, 'ARRIVING')} className="px-3 py-2 rounded-xl bg-blue-600 text-white text-[11px] font-black cursor-pointer">I'm on the way</button>}
                    {job.status === 'ARRIVING' && <button onClick={() => setStatus(job, 'READY_TO_START')} className="px-3 py-2 rounded-xl bg-amber-600 text-white text-[11px] font-black cursor-pointer">I've arrived</button>}
                  </div>

                  {job.status === 'READY_TO_START' && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-[10px] uppercase font-black tracking-wide text-amber-800">Customer OTP</p>
                      <div className="flex gap-2 mt-2">
                        <div className="relative flex-1"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={otpInputs[job.id] || ''} onChange={e => setOtpInputs(p => ({...p, [job.id]: e.target.value.replace(/\D/g, '').slice(0,4)}))} maxLength={4} inputMode="numeric" placeholder="4-digit OTP" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-center font-mono font-black" /></div>
                        <button onClick={() => start(job)} className="px-4 rounded-xl bg-emerald-600 text-white text-xs font-black cursor-pointer">Start Timer</button>
                      </div>
                      <p className="text-[10px] text-amber-800 mt-2">Only enter the OTP provided by the customer after you have arrived.</p>
                    </div>
                  )}

                  {job.status === 'IN_PROGRESS' && (
                    <div className="rounded-2xl bg-slate-900 text-white p-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-emerald-300 text-[10px] font-black uppercase"><Timer className="w-4 h-4" /> Live Service Timer</div>
                      <div className="text-4xl font-mono font-black mt-1">{formatDuration(elapsed)}</div>
                      <p className="text-[10px] text-slate-400 mt-1">Timer is server-started after OTP verification.</p>
                      <button onClick={() => complete(job)} className="mt-3 px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-black cursor-pointer flex items-center gap-1.5 mx-auto"><CheckCircle2 className="w-4 h-4" /> Stop & Complete Service</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Available Jobs</h2><button onClick={() => {setRefreshing(true); void load(true).finally(() => setRefreshing(false));}} className="text-xs font-bold text-slate-500 flex items-center gap-1 cursor-pointer"><RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh</button></div>
        {professional.status !== 'AVAILABLE' ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-7 text-center"><Power className="w-7 h-7 mx-auto text-slate-300" /><p className="font-bold text-slate-700 mt-2">You are offline</p><p className="text-xs text-slate-500 mt-1">Go available to receive nearby Daily Help jobs.</p></div>
        ) : availableJobs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-7 text-center"><Clock3 className="w-7 h-7 mx-auto text-slate-300" /><p className="font-bold text-slate-700 mt-2">No nearby jobs right now</p><p className="text-xs text-slate-500 mt-1">We will keep checking for jobs in {professional.currentLocality}.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableJobs.map(job => (
              <article key={job.id} className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-amber-300 transition-colors">
                <div className="flex justify-between gap-3"><div><p className="text-[10px] uppercase font-black text-amber-700">{job.serviceName}</p><h3 className="font-black mt-1">{job.buyerName}</h3></div><span className="font-black text-emerald-700">₹{job.estimatedTotal}</span></div>
                <p className="text-xs text-slate-500 mt-2 flex gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" />{job.address}</p>
                <div className="mt-3 flex justify-between items-center"><span className="text-[11px] font-bold text-slate-500">{job.requestedHours} hr · {new Date(job.scheduledStart).toLocaleString()}</span><button onClick={() => accept(job.id)} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-[11px] font-black cursor-pointer">Accept Job</button></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3"><Wallet className="w-4 h-4 text-amber-700" /><h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Booking History</h2></div>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {jobs.length === 0 ? <p className="p-6 text-center text-xs text-slate-500">No bookings yet.</p> : jobs.map(job => (
            <div key={job.id} className="p-4 border-b last:border-b-0 border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div><p className="font-mono text-[10px] text-slate-400">{job.id}</p><p className="font-bold text-sm">{job.serviceName} · {job.buyerName}</p><p className="text-[11px] text-slate-500">{new Date(job.scheduledStart).toLocaleString()} · {statusLabel[job.status] || job.status}</p></div>
              <div className="text-right"><p className="font-black text-slate-900">₹{job.estimatedTotal}</p>{job.status === 'COMPLETED' ? <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Earned</span> : <span className="text-[10px] text-slate-400">Not completed</span>}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
