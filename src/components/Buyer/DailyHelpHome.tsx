import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, Check, ChevronRight, Clock3, Home, MapPin, Search, ShieldCheck,
  Sparkles, Timer, UserRound, X, RefreshCw, WashingMachine, Utensils, SprayCan,
  Shirt, CookingPot, HeartHandshake,
} from 'lucide-react';
import { buyerApi } from '../../services/domains/buyerApi';
import { DailyHelpBooking, DailyHelpService, DailyHelpSlot } from '../../types';
import { useApp } from '../../context/AppContext';

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return h > 0 ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const statusLabel: Record<string, string> = {
  SEARCHING: 'Finding a nearby professional',
  CONFIRMED: 'Booking confirmed',
  PROFESSIONAL_ASSIGNED: 'Professional assigned',
  ARRIVING: 'Professional is on the way',
  READY_TO_START: 'Ready to start',
  IN_PROGRESS: 'Service in progress',
  COMPLETED: 'Service completed',
  CANCELLED: 'Booking cancelled',
  CANCELLED_BY_BUYER: 'Cancelled by you',
};

const bookingStages = [
  { key: 'SEARCHING', label: 'Finding help' },
  { key: 'PROFESSIONAL_ASSIGNED', label: 'Professional assigned' },
  { key: 'ARRIVING', label: 'On the way' },
  { key: 'READY_TO_START', label: 'Ready to start' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'COMPLETED', label: 'Completed' },
];

const indiaDateString = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

const formatTime = (time: string) => time?.slice(0, 5) || '';
const formatDate = (date: string) => new Date(`${date}T00:00:00+05:30`).toLocaleDateString('en-IN', {
  weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata',
});

const bookableStartTimes = (slot: DailyHelpSlot, durationHours: number) => {
  const [startHour, startMinute] = formatTime(slot.startTime).split(':').map(Number);
  const [endHour, endMinute] = formatTime(slot.endTime).split(':').map(Number);
  const windowStart = startHour * 60 + startMinute;
  const windowEnd = endHour * 60 + endMinute;
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const currentMinute = Number(parts.find(part => part.type === 'hour')?.value || 0) * 60
    + Number(parts.find(part => part.type === 'minute')?.value || 0);
  const earliest = slot.slotDate === indiaDateString(now) ? Math.max(windowStart, currentMinute) : windowStart;
  const first = Math.ceil(earliest / 15) * 15;
  const isToday = slot.slotDate === indiaDateString(now);
  return Array.from({ length: Math.max(0, Math.floor((windowEnd - first - durationHours * 60) / 15) + 1) }, (_, index) => first + index * 15)
    .filter(minute => {
      if (!isToday) return true;
      const instant = new Date(`${slot.slotDate}T${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}:00+05:30`);
      return instant.getTime() >= now.getTime();
    })
    .map(minute => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
};

const categoryIcon = (category: string) => {
  const value = category.toLowerCase();
  if (/utensil|dish|kitchen/.test(value)) return Utensils;
  if (/laundry|wash|iron/.test(value)) return WashingMachine;
  if (/cook|meal|food/.test(value)) return CookingPot;
  if (/clean|mop|sweep/.test(value)) return SprayCan;
  if (/cloth|shirt/.test(value)) return Shirt;
  return Home;
};

export const DailyHelpHome: React.FC<{ searchQuery?: string }> = ({ searchQuery = '' }) => {
  const { user, showToast } = useApp();
  const [services, setServices] = useState<DailyHelpService[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [query, setQuery] = useState(searchQuery);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selected, setSelected] = useState<DailyHelpService | null>(null);
  const [hours, setHours] = useState(1);
  const [bookingDate, setBookingDate] = useState(indiaDateString());
  const [slots, setSlots] = useState<DailyHelpSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<DailyHelpSlot | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [availabilityRetry, setAvailabilityRetry] = useState(0);
  const [bookings, setBookings] = useState<DailyHelpBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState(false);
  const [bookingsRetry, setBookingsRetry] = useState(0);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [cancelBusyId, setCancelBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { setQuery(searchQuery); }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    buyerApi.getDailyHelpServices()
      .then(data => { if (!cancelled) { setServices(data); setCatalogError(false); } })
      .catch(() => { if (!cancelled) { setServices([]); setCatalogError(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user.phone) { setBookingsLoading(false); return; }
    let cancelled = false;
    setBookingsLoading(true);
    buyerApi.getDailyHelpBookings(user.phone)
      .then(data => { if (!cancelled) { setBookings(data); setBookingsError(false); } })
      .catch(() => { if (!cancelled) setBookingsError(true); })
      .finally(() => { if (!cancelled) setBookingsLoading(false); });
    return () => { cancelled = true; };
  }, [user.phone, bookingsRetry]);

  const activeBookings = useMemo(() => bookings
    .filter(item => ['SEARCHING', 'CONFIRMED', 'PROFESSIONAL_ASSIGNED', 'ARRIVING', 'READY_TO_START', 'IN_PROGRESS'].includes(item.status))
    .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime()), [bookings]);
  const currentBooking = activeBookings[0] || null;

  useEffect(() => {
    if (!currentBooking) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const updated = await buyerApi.getDailyHelpBooking(currentBooking.id);
        if (!cancelled && updated) setBookings(current => current.map(item => item.id === updated.id ? updated : item));
      } catch { /* keep the last known booking state visible */ }
    };
    const interval = window.setInterval(refresh, currentBooking.status === 'IN_PROGRESS' ? 5000 : 15000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [currentBooking?.id, currentBooking?.status]);

  useEffect(() => {
    if (currentBooking?.status !== 'IN_PROGRESS' || !currentBooking.serviceStartedAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [currentBooking?.id, currentBooking?.status, currentBooking?.serviceStartedAt]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(false);
    setSelectedSlot(null);
    setSelectedStartTime('');
    buyerApi.getDailyHelpAvailableSlots(bookingDate, hours, user.locality)
      .then(data => { if (!cancelled) setSlots(data as DailyHelpSlot[]); })
      .catch(() => { if (!cancelled) { setSlots([]); setSlotsError(true); } })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [selected, bookingDate, hours, user.locality, availabilityRetry]);

  const elapsedSeconds = (startedAt?: string, requestedHours?: number) => {
    if (!startedAt) return 0;
    const raw = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
    return Math.min(raw, Math.max(0, Math.round(Number(requestedHours || 0) * 3600)));
  };

  const minDate = indiaDateString();
  const categories = useMemo(() => ['All', ...Array.from(new Set(services.map(service => service.category).filter(Boolean)))], [services]);
  const filteredServices = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return services.filter(service => {
      const matchesCategory = activeCategory === 'All' || service.category === activeCategory;
      const matchesQuery = !normalized || [service.name, service.category, service.description]
        .some(value => String(value || '').toLowerCase().includes(normalized));
      return matchesCategory && matchesQuery;
    });
  }, [services, query, activeCategory]);

  const availableTimes = selectedSlot ? bookableStartTimes(selectedSlot, hours) : [];
  const selectedTimeValid = Boolean(selectedSlot && availableTimes.includes(selectedStartTime));
  const estimatedTotal = selected ? selected.pricePerHour * hours : 0;

  const openBooking = (service: DailyHelpService) => {
    setSelected(service);
    setHours(Math.max(1, Number(service.minHours || 1)));
    setBookingDate(indiaDateString());
    setSelectedSlot(null);
    setSelectedStartTime('');
  };

  const closeBooking = () => {
    if (bookingBusy) return;
    setSelected(null);
    setSelectedSlot(null);
    setSlots([]);
  };

  const cancelBooking = async (booking: DailyHelpBooking) => {
    const cancellableStatuses = ['PROFESSIONAL_ASSIGNED', 'ARRIVING', 'READY_TO_START'];
    if (!cancellableStatuses.includes(booking.status) || booking.serviceStartedAt || booking.otpVerifiedAt
        || new Date(booking.scheduledStart).getTime() <= Date.now()) {
      showToast('This booking is no longer eligible for cancellation.', 'error');
      return;
    }
    if (!window.confirm('Cancel this Daily Help booking?')) return;
    setCancelBusyId(booking.id);
    try {
      const updated = await buyerApi.cancelDailyHelpBooking(booking.id);
      setBookings(current => current.map(item => item.id === updated.id ? updated : item));
      showToast('Your Daily Help booking was cancelled.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Unable to cancel this booking. Please refresh and try again.', 'error');
      const refreshed = await buyerApi.getDailyHelpBooking(booking.id);
      if (refreshed) setBookings(current => current.map(item => item.id === refreshed.id ? refreshed : item));
    } finally {
      setCancelBusyId(null);
    }
  };

  const createBooking = async () => {
    if (!selected || !selectedSlot || !selectedTimeValid) return;
    if (!user.name || !user.phone || !(user.formattedAddress || user.addressLine1 || user.address)) {
      showToast('Please add your name, mobile number and service address before booking.', 'error');
      return;
    }
    setBookingBusy(true);
    try {
      const scheduledStart = `${selectedSlot.slotDate}T${selectedStartTime}:00`;
      const result = await buyerApi.createDailyHelpBooking({
        serviceId: selected.id,
        buyerName: user.name,
        buyerPhone: user.phone,
        address: user.formattedAddress || user.addressLine1 || user.address,
        locality: user.locality || selectedSlot.locality || '',
        scheduledStart,
        requestedHours: hours,
        slotId: selectedSlot.slotId,
      });
      if (!result) throw new Error('Unable to create Daily Help booking');
      setSelected(null);
      setSelectedSlot(null);
      setBookings(current => [result, ...current.filter(item => item.id !== result.id)]);
      showToast('Your Daily Help booking is confirmed.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'That time may no longer be available. Please choose another slot.', 'error');
      try {
        const refreshed = await buyerApi.getDailyHelpAvailableSlots(bookingDate, hours, user.locality);
        setSlots(refreshed as DailyHelpSlot[]);
        setSelectedSlot(null);
        setSelectedStartTime('');
      } catch { setSlotsError(true); }
    } finally {
      setBookingBusy(false);
    }
  };

  const stageIndex = currentBooking ? bookingStages.findIndex(stage => stage.key === currentBooking.status) : -1;
  const currentStage = stageIndex >= 0 ? stageIndex : currentBooking?.status === 'CONFIRMED' ? 1 : -1;

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500"><RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin" />Preparing your local help options…</div>;

  return (
    <div className="space-y-6 pb-6">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/50 blur-2xl" />
        <div className="relative grid gap-5 md:grid-cols-[1.2fr_.8fr] md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-amber-800"><Sparkles className="h-3.5 w-3.5" /> A little help goes a long way</div>
            <h1 className="max-w-xl text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">Your home, taken care of.</h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-600">Choose a task, pick a time that works and see the estimated price before you book local household help.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-2"><MapPin className="h-3.5 w-3.5 text-amber-700" />{user.locality || 'Your saved locality'}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />Start with OTP confirmation</span>
            </div>
          </div>
          <div className="hidden md:flex justify-end"><div className="flex h-44 w-44 items-center justify-center rounded-full bg-white/70 shadow-inner"><div className="flex h-32 w-32 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Home className="h-16 w-16" strokeWidth={1.4} /></div></div></div>
        </div>
      </section>

      {currentBooking && (
        <section aria-label="Current Daily Help booking" className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 bg-emerald-50/70 p-4 sm:p-5">
            <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-800">Your active booking</p><h2 className="mt-1 text-lg font-black text-slate-900">{currentBooking.serviceName}</h2><p className="mt-1 text-xs font-semibold text-slate-600">{statusLabel[currentBooking.status] || currentBooking.status.replace(/_/g, ' ')}</p><p className="mt-1 text-[11px] text-slate-500">{new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(/Z|[+-]\\d{2}:?\\d{2}$/.test(currentBooking.scheduledStart) ? currentBooking.scheduledStart : `${currentBooking.scheduledStart}+05:30`))} · {currentBooking.requestedHours} hr · ₹{currentBooking.estimatedTotal}</p><p className="mt-1 text-[11px] text-slate-500">{currentBooking.address}</p></div>
            <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600">#{currentBooking.id}</span>
          </div>
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {bookingStages.map((stage, index) => {
                const done = currentStage >= index;
                const active = currentStage === index;
                return <div key={stage.key} className="min-w-0"><div className={`flex h-8 w-8 items-center justify-center rounded-full ${done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'} `}>{done && !active ? <Check className="h-4 w-4" /> : <span className="text-xs font-black">{index + 1}</span>}</div><p className={`mt-2 text-[10px] font-bold ${active ? 'text-emerald-800' : done ? 'text-slate-700' : 'text-slate-400'}`}>{stage.label}</p></div>;
              })}
            </div>
            {currentBooking.professionalName && <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800"><UserRound className="h-5 w-5" /></div><div><p className="text-sm font-bold text-slate-900">{currentBooking.professionalName}</p><p className="text-xs text-slate-500">Your assigned professional</p></div></div>}
            {currentBooking.startOtp && ['ARRIVING', 'READY_TO_START'].includes(currentBooking.status) && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center"><p className="text-[10px] font-black uppercase tracking-wide text-amber-900">Share only when your professional is at your door</p><p className="mt-1 text-3xl font-black tracking-[.3em] text-slate-950">{currentBooking.startOtp}</p><p className="mt-1 text-xs text-slate-600">The service timer starts only after this OTP is verified.</p></div>}
            {currentBooking.status === 'IN_PROGRESS' && currentBooking.serviceStartedAt && <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-center text-white"><div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-300"><Timer className="h-4 w-4" /> SERVICE TIMER</div><div className="mt-1 font-mono text-3xl font-black">{formatDuration(elapsedSeconds(currentBooking.serviceStartedAt, currentBooking.requestedHours))}</div><p className="mt-1 text-[11px] text-slate-300">Booked duration: {currentBooking.requestedHours} hours</p>{currentBooking.completionOtp && <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-emerald-950"><p className="text-[10px] font-black uppercase">Completion OTP</p><p className="mt-1 text-2xl font-black tracking-[.3em]">{currentBooking.completionOtp}</p><p className="mt-1 text-[10px]">Share only when the service is finished.</p></div>}</div>}
          </div>
        </section>
      )}

      {bookingsError && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4" aria-live="polite">
          <p className="text-sm font-bold text-rose-900">We couldn’t load your Daily Help bookings.</p>
          <button type="button" onClick={() => setBookingsRetry(value => value + 1)} className="mt-2 text-xs font-bold text-rose-900 underline">Retry</button>
        </section>
      )}
      {bookingsLoading && <p className="text-xs text-slate-500" aria-live="polite">Loading your Daily Help bookings…</p>}
      {bookings.length > 0 && (
        <section aria-label="Daily Help booking history" className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-amber-700">Your activity</p><h2 className="mt-1 text-lg font-black text-slate-950">Daily Help bookings</h2></div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-600">{bookings.length} total</span>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {[...bookings].sort((a,b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime()).slice(0,6).map(booking => {
              const canCancel = ['PROFESSIONAL_ASSIGNED', 'ARRIVING', 'READY_TO_START'].includes(booking.status)
                && !booking.serviceStartedAt && !booking.otpVerifiedAt
                && new Date(booking.scheduledStart).getTime() > Date.now();
              const dateValue = /Z|[+-]\\d{2}:?\\d{2}$/.test(booking.scheduledStart)
                ? booking.scheduledStart : `${booking.scheduledStart}+05:30`;
              const dateLabel = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(dateValue));
              return <article key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-900">{booking.serviceName}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{dateLabel} · {booking.requestedHours} hr · ₹{booking.estimatedTotal}</p>
                  <p className="mt-1 text-[10px] font-bold text-slate-600">{statusLabel[booking.status] || booking.status.replace(/_/g, ' ')}</p>
                </div>
                {canCancel && <button type="button" onClick={() => void cancelBooking(booking)} disabled={cancelBusyId === booking.id}
                  className="shrink-0 rounded-xl border border-rose-200 px-3 py-2 text-[11px] font-bold text-rose-700 disabled:opacity-50">
                  {cancelBusyId === booking.id ? 'Cancelling…' : 'Cancel booking'}
                </button>}
              </article>;
            })}
          </div>
        </section>
      )}

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-amber-700">Made for everyday life</p><h2 className="mt-1 text-xl font-black text-slate-950">What would you like help with?</h2><p className="mt-1 text-xs text-slate-500">Pick one task to see local availability and hourly pricing.</p></div>
          <span className="text-[11px] font-semibold text-slate-500">{filteredServices.length} {filteredServices.length === 1 ? 'service' : 'services'}</span>
        </div>
        {catalogError && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">We couldn’t load services right now. Please try again shortly.</div>}
        <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100"><Search className="h-5 w-5 shrink-0 text-slate-400" /><input aria-label="Search Daily Help services" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try “utensils”, “cleaning” or “cooking”…" className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" /></label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Filter services by category">
          {categories.map(category => <button key={category} type="button" onClick={() => setActiveCategory(category)} aria-pressed={activeCategory === category} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${activeCategory === category ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300'}`}>{category}</button>)}
        </div>

        {filteredServices.length > 0 ? <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredServices.map(service => {
            const Icon = categoryIcon(service.category);
            return <article key={service.id} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg">
              <div className="relative h-36 overflow-hidden bg-gradient-to-br from-amber-50 to-orange-100">{service.imageUrl ? <img src={service.imageUrl} alt={service.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-amber-700"><Icon className="h-14 w-14" strokeWidth={1.25} /></div>}<span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900">{service.category}</span></div>
              <div className="p-4"><h3 className="text-base font-black text-slate-950">{service.name}</h3><p className="mt-1 min-h-[2.5rem] text-xs leading-relaxed text-slate-500">{service.description}</p><div className="mt-4 flex items-center justify-between gap-3"><div><strong className="text-xl font-black text-slate-950">₹{service.pricePerHour}</strong><span className="text-[11px] text-slate-500"> / hour</span></div><button type="button" onClick={() => openBooking(service)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-amber-700">Choose <ChevronRight className="h-4 w-4" /></button></div></div>
            </article>;
          })}
        </div> : <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white p-9 text-center"><Search className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-800">{catalogError ? 'Services are temporarily unavailable' : 'No matching services found'}</p><p className="mt-1 text-xs text-slate-500">{catalogError ? 'Please try again in a little while.' : 'Try a different search or choose another category.'}</p><button type="button" onClick={() => { setQuery(''); setActiveCategory('All'); }} className="mt-3 text-xs font-bold text-amber-800 underline">Clear filters</button></div>}
      </section>

      {selected && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeBooking(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="daily-help-booking-title" className="max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl sm:rounded-[28px] sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-amber-700">Book household help</p><h2 id="daily-help-booking-title" className="mt-1 text-xl font-black text-slate-950">{selected.name}</h2><p className="mt-1 text-xs text-slate-500">{selected.description}</p></div><button type="button" aria-label="Close booking" onClick={closeBooking} disabled={bookingBusy} className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-50"><X className="h-5 w-5" /></button></div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div><p className="mb-2 text-xs font-black text-slate-700">How long?</p><div className="grid grid-cols-2 gap-2">{Array.from(new Set([Number(selected.minHours || 1), 1, 1.5, 2, 3, 4, 6, 8, 12])).filter(value => value >= Number(selected.minHours || 1) && value <= 12).sort((a, b) => a - b).map(value => <button key={value} type="button" onClick={() => setHours(value)} aria-pressed={hours === value} className={`rounded-xl border px-2 py-3 text-xs font-black ${hours === value ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-400' : 'border-slate-200 bg-white text-slate-700'}`}>{value} {value === 1 ? 'hour' : 'hours'}</button>)}</div></div>
              <div><p className="mb-2 text-xs font-black text-slate-700">Which day?</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setBookingDate(indiaDateString())} aria-pressed={bookingDate === indiaDateString()} className={`rounded-xl border px-2 py-3 text-xs font-black ${bookingDate === indiaDateString() ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-700'}`}>Today</button><button type="button" onClick={() => { const tomorrow = new Date(Date.now() + 86400000); setBookingDate(indiaDateString(tomorrow)); }} aria-pressed={bookingDate === indiaDateString(new Date(Date.now() + 86400000))} className={`rounded-xl border px-2 py-3 text-xs font-black ${bookingDate === indiaDateString(new Date(Date.now() + 86400000)) ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-700'}`}>Tomorrow</button></div><input aria-label="Choose booking date" type="date" min={minDate} value={bookingDate} onChange={event => setBookingDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700" /></div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-950 p-4 text-white"><div><p className="text-[10px] font-semibold text-slate-300">Estimated service total</p><p className="mt-0.5 text-2xl font-black">₹{estimatedTotal}</p><p className="text-[10px] text-slate-300">₹{selected.pricePerHour} × {hours} {hours === 1 ? 'hour' : 'hours'}</p></div><div className="rounded-xl bg-white/10 p-3"><Clock3 className="h-6 w-6 text-amber-300" /></div></div>

            <div className="mt-5"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-black text-slate-950">Choose an available professional</h3><span className="text-[10px] font-semibold text-slate-500">{slots.length} windows</span></div><p className="mt-1 text-[11px] text-slate-500">Availability is checked for your locality. Your time is confirmed only after booking succeeds.</p>
              {slotsLoading ? <div className="mt-3 rounded-2xl border border-slate-200 p-7 text-center text-xs text-slate-500"><RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />Checking local availability…</div>
                : slotsError ? <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center"><p className="text-sm font-black text-rose-900">Couldn’t check availability</p><p className="mt-1 text-xs text-rose-800">Please change the date or try again.</p><button type="button" onClick={() => setAvailabilityRetry(value => value + 1)} className="mt-2 text-xs font-bold underline">Retry by selecting the date again</button></div>
                : slots.length === 0 ? <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center"><CalendarDays className="mx-auto h-6 w-6 text-amber-700" /><p className="mt-2 text-sm font-black text-slate-900">No matching availability yet</p><p className="mt-1 text-xs text-slate-600">Try another date or a shorter duration to see more options.</p></div>
                : <div className="mt-3 space-y-2">{slots.map(slot => { const times = bookableStartTimes(slot, hours); const active = selectedSlot?.slotId === slot.slotId; return <div key={slot.slotId} className={`rounded-2xl border p-3 ${active ? 'border-amber-400 bg-amber-50/60' : 'border-slate-200 bg-white'}`}><button type="button" onClick={() => { setSelectedSlot(slot); setSelectedStartTime(times[0] || ''); }} className="flex w-full items-center justify-between gap-3 text-left"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800"><UserRound className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-xs font-black text-slate-900">{slot.professionalName}</p><p className="mt-0.5 text-[11px] text-slate-500">{formatDate(slot.slotDate)} · {formatTime(slot.startTime)}–{formatTime(slot.endTime)}</p></div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${active ? 'bg-amber-700 text-white' : 'bg-emerald-50 text-emerald-800'}`}>{active ? 'Selected' : 'View times'}</span></button>{active && <div className="mt-3 border-t border-amber-200 pt-3"><p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-600">Pick a start time</p><div className="flex flex-wrap gap-2">{times.map(time => <button key={time} type="button" onClick={() => setSelectedStartTime(time)} aria-pressed={selectedStartTime === time} className={`rounded-lg border px-3 py-2 text-xs font-bold ${selectedStartTime === time ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>{time}</button>)}</div>{times.length === 0 && <p className="text-xs text-amber-900">This window no longer fits the selected duration. Choose another window.</p>}</div>}</div>; })}</div>}
            </div>

            {selectedSlot && selectedTimeValid && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950"><div className="flex items-center gap-2 font-black"><Check className="h-4 w-4" /> Booking summary</div><p className="mt-1">{selectedSlot.professionalName} · {formatDate(selectedSlot.slotDate)} at {selectedStartTime}</p><p className="mt-1">Estimated finish: {(() => { const [h, m] = selectedStartTime.split(':').map(Number); const end = h * 60 + m + hours * 60; return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`; })()}</p></div>}

            <button type="button" disabled={bookingBusy || !selectedSlot || !selectedTimeValid} onClick={createBooking} className="mt-5 w-full rounded-2xl bg-amber-600 py-4 text-sm font-black text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300">{bookingBusy ? 'Confirming your booking…' : !selectedSlot ? 'Choose a professional' : !selectedTimeValid ? 'Choose a start time' : `Confirm booking · ₹${estimatedTotal}`}</button>
            <p className="mt-2 text-center text-[10px] text-slate-500">Your booking is revalidated by the server before confirmation. Selecting a time does not reserve it.</p>
          </section>
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-start gap-3"><div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><HeartHandshake className="h-5 w-5" /></div><div><h2 className="text-sm font-black text-slate-950">A clearer, safer way to book local help</h2><p className="mt-1 text-xs leading-relaxed text-slate-600">Choose from services currently listed in KuraliUpdates, review the hourly estimate and select an available time. Share your start OTP only when your professional arrives; the service timer begins after verification.</p></div></div><div className="mt-4 grid grid-cols-1 gap-2 text-[11px] font-semibold text-slate-600 sm:grid-cols-3"><span className="flex items-center gap-2 rounded-xl bg-slate-50 p-3"><ShieldCheck className="h-4 w-4 text-emerald-700" /> OTP-confirmed start</span><span className="flex items-center gap-2 rounded-xl bg-slate-50 p-3"><Clock3 className="h-4 w-4 text-amber-700" /> Clear hourly estimate</span><span className="flex items-center gap-2 rounded-xl bg-slate-50 p-3"><MapPin className="h-4 w-4 text-sky-700" /> Local availability</span></div></section>
    </div>
  );
};
