import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, Home, ShieldCheck, Star, UserRound, CalendarDays, Timer, MapPin } from 'lucide-react';
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
};

const localDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const earliestBookableStart = (slot: DailyHelpSlot, durationHours: number) => {
  const [startHour, startMinute] = slot.startTime.slice(0, 5).split(':').map(Number);
  const [endHour, endMinute] = slot.endTime.slice(0, 5).split(':').map(Number);
  const windowStart = startHour * 60 + startMinute;
  const windowEnd = endHour * 60 + endMinute;
  const today = localDateString(new Date());
  const now = new Date();
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  const earliest = slot.slotDate === today ? Math.max(windowStart, currentMinute) : windowStart;
  const rounded = Math.ceil(earliest / 15) * 15;
  if (rounded + durationHours * 60 > windowEnd) return null;
  return `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`;
};

export const DailyHelpHome: React.FC<{ searchQuery?: string }> = ({ searchQuery = '' }) => {
  const { user, showToast } = useApp();
  const [services, setServices] = useState<DailyHelpService[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [selected, setSelected] = useState<DailyHelpService | null>(null);
  const [hours, setHours] = useState(1);
  const [bookingDate, setBookingDate] = useState(localDateString(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [slots, setSlots] = useState<DailyHelpSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<DailyHelpSlot | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState('09:00');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookings, setBookings] = useState<DailyHelpBooking[]>([]);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    buyerApi.getDailyHelpServices()
      .then(data => { setServices(data); setCatalogError(false); })
      .catch(() => { setServices([]); setCatalogError(true); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user.phone) return;
    buyerApi.getDailyHelpBookings(user.phone).then(setBookings);
  }, [user.phone]);

  const activeBookings = useMemo(
    () => bookings
      .filter(item => ['SEARCHING', 'CONFIRMED', 'PROFESSIONAL_ASSIGNED', 'ARRIVING', 'READY_TO_START', 'IN_PROGRESS'].includes(item.status))
      .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime()),
    [bookings],
  );
  const currentBooking = activeBookings[0] || null;

  useEffect(() => {
    if (!currentBooking) return;
    let cancelled = false;
    const refresh = async () => {
      const updated = await buyerApi.getDailyHelpBooking(currentBooking.id);
      if (!cancelled && updated) {
        setBookings(current => current.map(item => item.id === updated.id ? updated : item));
      }
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
    setSelectedSlot(null);
    buyerApi.getDailyHelpAvailableSlots(bookingDate, hours, user.locality)
      .then(data => { if (!cancelled) setSlots(data as DailyHelpSlot[]); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [selected, bookingDate, hours, user.locality]);

  const elapsedSeconds = (startedAt?: string, requestedHours?: number) => {
    if (!startedAt) return 0;
    const raw = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
    return Math.min(raw, Math.max(0, Math.round(Number(requestedHours || 0) * 3600)));
  };

  const selectedTimeValid = useMemo(() => {
    if (!selectedSlot || !/^\d{2}:\d{2}$/.test(selectedStartTime)) return false;
    const [startHour, startMinute] = selectedStartTime.split(':').map(Number);
    const [windowStartHour, windowStartMinute] = selectedSlot.startTime.slice(0, 5).split(':').map(Number);
    const [windowEndHour, windowEndMinute] = selectedSlot.endTime.slice(0, 5).split(':').map(Number);
    const start = startHour * 60 + startMinute;
    const windowStart = windowStartHour * 60 + windowStartMinute;
    const windowEnd = windowEndHour * 60 + windowEndMinute;
    const startDateTime = new Date(`${selectedSlot.slotDate}T${selectedStartTime}:00`);\n    return start % 15 === 0 && start >= windowStart && start + hours * 60 <= windowEnd && startDateTime.getTime() >= Date.now();
  }, [selectedSlot, selectedStartTime, hours]);

  const minDate = localDateString(new Date());
  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return services;
    return services.filter(service =>
      [service.name, service.category, service.description]
        .some(value => String(value || '').toLowerCase().includes(query))
    );
  }, [services, searchQuery]);

  const openBooking = (service: DailyHelpService) => {
    setSelected(service);
    setHours(1);
    setBookingDate(localDateString(new Date(Date.now() + 24 * 60 * 60 * 1000)));
    setSelectedSlot(null);
  };

  const createBooking = async () => {
    if (!selected || !selectedSlot) return;
    if (!user.name || !user.phone || !(user.formattedAddress || user.addressLine1 || user.address)) {
      showToast('Please add your name, mobile number and delivery address before booking.', 'error');
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
      showToast('Daily Help booking confirmed.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Unable to create the Daily Help booking.', 'error');
      const refreshed = await buyerApi.getDailyHelpAvailableSlots(bookingDate, hours, user.locality);
      setSlots(refreshed as DailyHelpSlot[]);
    } finally {
      setBookingBusy(false);
    }
  };

  if (loading) {
    return <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">Loading Daily Help services...</div>;
  }

  return (
    <div className="space-y-5">
      <section>
        {catalogError && <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-[11px] font-semibold text-rose-800">Daily Help services could not be loaded from the database. Please try again shortly.</div>}
        <div className="flex items-center justify-between mb-3">
          <div><h2 className="text-lg font-black text-slate-900">What do you need help with?</h2><p className="text-xs text-slate-500">Choose a service, duration and start time within an available helper window.</p></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredServices.map(service => (
            <article key={service.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-amber-300 hover:shadow-md transition-all">
              {service.imageUrl ? <img src={service.imageUrl} alt="" className="w-full h-36 object-cover" /> : <div className="h-28 bg-slate-100 flex items-center justify-center"><Home className="w-10 h-10 text-slate-400" /></div>}
              <div className="p-4">
                <div className="flex items-center justify-between gap-2"><span className="text-[10px] uppercase font-black tracking-wide text-amber-700">{service.category}</span><span className="flex items-center gap-1 text-[11px] font-bold text-slate-500"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Trusted</span></div>
                <h3 className="mt-1 font-black text-slate-900">{service.name}</h3>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{service.description}</p>
                <div className="mt-4 flex items-end justify-between gap-2"><div><span className="text-lg font-black">₹{service.pricePerHour}</span><span className="text-[11px] text-slate-500"> / hour</span></div><button onClick={() => openBooking(service)} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-[11px] font-extrabold cursor-pointer">Book</button></div>
              </div>
            </article>
          ))}
        </div>
        {filteredServices.length === 0 && searchQuery.trim() ? <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-8 text-center"><p className="text-sm font-bold text-slate-700">No matching Daily Help services</p><p className="mt-1 text-xs text-slate-500">Try another service name or category.</p></div> : services.length === 0 && !loading && !catalogError && <div className="sm:col-span-2 lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-10 text-center"><p className="text-sm font-bold text-slate-700">No Daily Help services are currently available.</p><p className="text-xs text-slate-500 mt-1">The administrator can add or activate services from Admin → Daily Help Services.</p></div>}
      </section>

      {currentBooking && (
        <section aria-label="Current Daily Help booking" className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-black text-emerald-700">Current Daily Help booking</p>
              <h2 className="mt-1 text-base font-black text-slate-900">{currentBooking.serviceName}</h2>
              <p className="mt-1 text-xs font-semibold text-slate-600">{statusLabel[currentBooking.status] || currentBooking.status.replace(/_/g, ' ')}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400">Booking</p>
              <p className="text-xs font-mono font-bold text-slate-800">{currentBooking.id}</p>
            </div>
          </div>
          {currentBooking.professionalName && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700"><UserRound className="h-4 w-4" /></div>
              <div><p className="text-xs font-bold text-slate-800">{currentBooking.professionalName}</p><p className="text-[11px] text-slate-500">{currentBooking.professionalPhone || 'Verified professional'}</p></div>
            </div>
          )}
          {currentBooking.startOtp && ['ARRIVING', 'READY_TO_START'].includes(currentBooking.status) && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-wide text-amber-800">Share OTP only when the professional arrives</p>
              <p className="mt-1 text-2xl font-black tracking-[0.3em] text-slate-900">{currentBooking.startOtp}</p>
              <p className="mt-1 text-[11px] text-slate-600">The service timer starts after OTP verification.</p>
            </div>
          )}
          {currentBooking.status === 'IN_PROGRESS' && currentBooking.serviceStartedAt && (
            <div className="mt-3 rounded-xl bg-slate-900 p-4 text-center text-white">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-300"><Timer className="h-4 w-4" /> SERVICE TIMER</div>
              <div className="mt-1 font-mono text-3xl font-black">{formatDuration(elapsedSeconds(currentBooking.serviceStartedAt, currentBooking.requestedHours))}</div>
              <p className="mt-1 text-[11px] text-slate-300">Booked duration: {currentBooking.requestedHours} hours</p>
              {currentBooking.completionOtp && <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-emerald-900"><p className="text-[10px] font-black uppercase">Customer completion OTP</p><p className="mt-1 text-2xl font-black tracking-[0.3em]">{currentBooking.completionOtp}</p><p className="mt-1 text-[10px]">Share only when the service is finished.</p></div>}
            </div>
          )}
        </section>
      )}

      {selected && (
        <div className="fixed inset-0 z-[70] bg-slate-900/50 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div><p className="text-[10px] uppercase font-black text-amber-700">{selected.category}</p><h2 className="text-lg font-black mt-1">{selected.name}</h2></div>
              <button onClick={() => { setSelected(null); setSelectedSlot(null); }} className="text-slate-400 text-xl cursor-pointer">×</button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-bold text-slate-700">Duration
                <select value={hours} onChange={e => setHours(Number(e.target.value))} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-white">
                  <option value={1}>1 hour</option>
                  <option value={1.5}>1.5 hours</option>
                  <option value={2}>2 hours</option>
                  <option value={3}>3 hours</option>
                </select>
              </label>
              <label className="text-xs font-bold text-slate-700">Date
                <input type="date" min={minDate} value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5" />
              </label>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs">
              <div className="flex justify-between"><span>Rate</span><strong>₹{selected.pricePerHour}/hr</strong></div>
              <div className="flex justify-between mt-1"><span>Estimated total</span><strong>₹{selected.pricePerHour * hours}</strong></div>
              <div className="mt-2 flex gap-2 text-slate-500"><CalendarDays className="w-4 h-4 shrink-0" /> Choose a start time inside the helper’s availability window. Start times use 15-minute increments.</div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-black text-slate-900">Available helpers & windows</h3>{slots.length > 0 && <span className="text-[10px] font-bold text-emerald-700">{slots.length} available</span>}</div>
              {slotsLoading ? (
                <div className="rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-500">Checking maid availability...</div>
              ) : slots.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
                  <Clock3 className="w-6 h-6 mx-auto text-amber-600" />
                  <p className="mt-2 text-sm font-black text-slate-800">No matching availability</p>
                  <p className="mt-1 text-xs text-slate-600">Please select another date or availability window.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {slots.map(slot => {
                    const active = selectedSlot?.slotId === slot.slotId;
                    return (
                      <button key={slot.slotId} onClick={() => { const earliest = earliestBookableStart(slot, hours); setSelectedSlot(slot); setSelectedStartTime(earliest || slot.startTime.slice(0,5)); }} className={`w-full text-left rounded-xl border p-3 transition-all cursor-pointer ${active ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-slate-200 hover:border-amber-300 bg-white'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"><UserRound className="w-4 h-4" /></div>
                            <div className="min-w-0"><p className="text-xs font-black text-slate-900 truncate">{slot.professionalName}</p><p className="text-[11px] text-slate-500 flex items-center gap-1"><Clock3 className="w-3 h-3" /> {slot.startTime.slice(0,5)} - {slot.endTime.slice(0,5)} · ★ {slot.rating}</p></div>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-full ${active ? 'bg-amber-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}>{active ? 'Selected' : 'Available'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedSlot && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                <div className="flex items-center gap-2 font-black"><MapPin className="w-4 h-4" /> {selectedSlot.professionalName}</div>
                <p className="mt-1">Availability window: {selectedSlot.startTime.slice(0,5)} - {selectedSlot.endTime.slice(0,5)} on {selectedSlot.slotDate}</p>
                <label className="block mt-3 font-bold">Your start time
                  <input type="time" step={900} min={selectedSlot.startTime.slice(0,5)} max={selectedSlot.endTime.slice(0,5)} value={selectedStartTime} onChange={e => setSelectedStartTime(e.target.value)} className="mt-1 w-full rounded-lg border border-emerald-300 bg-white px-3 py-2" />
                </label>
                <p className="mt-1">Estimated finish: {(() => { const [h,m] = selectedStartTime.split(':').map(Number); const end = h * 60 + m + hours * 60; return `${String(Math.floor(end / 60)).padStart(2,'0')}:${String(end % 60).padStart(2,'0')}`; })()}</p>
              </div>
            )}

            <button disabled={bookingBusy || !selectedSlot || !selectedTimeValid || !user.name || !user.phone} onClick={createBooking} className="mt-5 w-full py-3 rounded-xl bg-amber-600 disabled:bg-slate-300 text-white text-sm font-black cursor-pointer">{bookingBusy ? 'Confirming slot...' : !selectedSlot ? 'Select a Maid Slot' : !selectedTimeValid ? 'Choose a valid start time' : 'Confirm Daily Help Booking'}</button>
          </div>
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><ShieldCheck className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-900">Daily Help, whenever you need it</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">Book a trusted local professional by the hour. Choose a service, date, duration and start time within a helper’s availability window. Your service timer starts only after OTP verification.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-600">
              <span className="rounded-full border border-amber-100 bg-white px-2.5 py-1">Verified professionals</span>
              <span className="rounded-full border border-amber-100 bg-white px-2.5 py-1">Live availability</span>
              <span className="rounded-full border border-amber-100 bg-white px-2.5 py-1">OTP-secured start</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
