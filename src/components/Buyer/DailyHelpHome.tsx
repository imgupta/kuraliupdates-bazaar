import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, Home, ShieldCheck, Star, UserRound, CalendarDays, Timer, CheckCircle2 } from 'lucide-react';
import { bazaarApi } from '../../services/api';
import { DailyHelpBooking, DailyHelpService } from '../../types';
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

export const DailyHelpHome: React.FC = () => {
  const { user, showToast } = useApp();
  const [services, setServices] = useState<DailyHelpService[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [selected, setSelected] = useState<DailyHelpService | null>(null);
  const [hours, setHours] = useState(2);
  const [scheduledStart, setScheduledStart] = useState('');
  const [booking, setBooking] = useState<DailyHelpBooking | null>(null);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    bazaarApi.getDailyHelpServices()
      .then(data => { setServices(data); setCatalogError(false); })
      .catch(() => { setServices([]); setCatalogError(true); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user.phone) return;
    bazaarApi.getLatestDailyHelpBooking(user.phone).then(latest => {
      if (latest && !['COMPLETED', 'CANCELLED'].includes(latest.status)) setBooking(latest);
    });
  }, [user.phone]);

  useEffect(() => {
    if (!booking?.id || !['SEARCHING','CONFIRMED','PROFESSIONAL_ASSIGNED','ARRIVING','READY_TO_START','IN_PROGRESS'].includes(booking.status)) return;
    const refresh = async () => {
      const latest = await bazaarApi.getDailyHelpBooking(booking.id);
      if (latest) setBooking(latest);
    };
    const interval = window.setInterval(refresh, booking.status === 'IN_PROGRESS' ? 5000 : 15000);
    return () => window.clearInterval(interval);
  }, [booking?.id, booking?.status]);

  useEffect(() => {
    if (booking?.status !== 'IN_PROGRESS' || !booking.serviceStartedAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [booking?.status, booking?.serviceStartedAt]);

  const elapsedSeconds = useMemo(() => {
    if (!booking?.serviceStartedAt) return 0;
    return Math.floor((now - new Date(booking.serviceStartedAt).getTime()) / 1000);
  }, [booking?.serviceStartedAt, now]);

  const openBooking = (service: DailyHelpService) => {
    setSelected(service);
    setHours(Math.max(service.minHours, 2));
    const start = new Date(Date.now() + 30 * 60 * 1000);
    start.setSeconds(0, 0);
    setScheduledStart(start.toISOString().slice(0, 16));
  };

  const createBooking = async () => {
    if (!selected) return;
    setBookingBusy(true);
    const result = await bazaarApi.createDailyHelpBooking({
      serviceId: selected.id,
      buyerName: user.name,
      buyerPhone: user.phone || '',
      address: user.formattedAddress || user.addressLine1 || user.address || '',
      locality: user.locality,
      scheduledStart: new Date(scheduledStart).toISOString(),
      requestedHours: hours,
    });
    setBookingBusy(false);
    if (!result) {
      showToast('Unable to create the daily help booking.', 'error');
      return;
    }
    setSelected(null);
    setBooking(result);
    showToast('Daily help booking created.', 'success');
  };

  if (loading) {
    return <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">Loading Daily Help services...</div>;
  }

  return (
    <div className="space-y-5">
      <section className="bg-gradient-to-br from-amber-50 via-white to-orange-50 border border-amber-100 rounded-2xl p-5 sm:p-7">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5" /> Trusted local professionals
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">Daily Help, whenever you need it</h1>
          <p className="mt-2 text-sm text-slate-600">Book a verified local helper by the hour for cleaning, dishes, laundry, cooking and everyday home tasks.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-slate-600">
            <span className="bg-white border border-slate-200 rounded-full px-3 py-1.5">Hourly pricing</span>
            <span className="bg-white border border-slate-200 rounded-full px-3 py-1.5">Transparent booking</span>
            <span className="bg-white border border-slate-200 rounded-full px-3 py-1.5">OTP start verification</span>
          </div>
        </div>
      </section>

      {booking && (
        <section className="bg-white border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-black text-emerald-700">Active Daily Help</p>
              <h2 className="text-base font-black text-slate-900 mt-1">{booking.serviceName}</h2>
              <p className="text-xs text-slate-500 mt-1">{statusLabel[booking.status] || booking.status}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400">Booking</p>
              <p className="text-xs font-mono font-bold">{booking.id}</p>
            </div>
          </div>

          {booking.professionalName && (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center"><UserRound className="w-4 h-4" /></div>
              <div><p className="text-xs font-bold text-slate-800">{booking.professionalName}</p><p className="text-[11px] text-slate-500">{booking.professionalPhone || 'Verified professional'}</p></div>
            </div>
          )}

          {booking.startOtp && ['ARRIVING','READY_TO_START'].includes(booking.status) && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider font-black text-amber-800">Share this OTP only when the professional is at your home</p>
              <p className="text-3xl font-black tracking-[0.35em] text-slate-900 mt-2">{booking.startOtp}</p>
              <p className="text-[11px] text-slate-600 mt-2">The timer starts only after the OTP is successfully verified.</p>
            </div>
          )}

          {booking.status === 'IN_PROGRESS' && booking.serviceStartedAt && (
            <div className="mt-4 rounded-xl bg-slate-900 text-white p-5 text-center">
              <div className="flex items-center justify-center gap-2 text-emerald-300 text-xs font-bold"><Timer className="w-4 h-4" /> SERVICE TIMER</div>
              <div className="text-4xl font-black font-mono mt-2">{formatDuration(elapsedSeconds)}</div>
              <p className="text-[11px] text-slate-400 mt-2">Started {new Date(booking.serviceStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          )}

          {booking.status === 'COMPLETED' && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 text-emerald-800 p-3 text-xs font-bold"><CheckCircle2 className="w-4 h-4" /> Service completed successfully.</div>
          )}
        </section>
      )}

      <section>
        {catalogError && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-[11px] font-semibold text-rose-800">
            Daily Help services could not be loaded from the database. Please try again shortly.
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <div><h2 className="text-lg font-black text-slate-900">What do you need help with?</h2><p className="text-xs text-slate-500">Choose a service and book by the hour.</p></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map(service => (
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
          {services.length === 0 && !loading && !catalogError && (
            <div className="sm:col-span-2 lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <p className="text-sm font-bold text-slate-700">No Daily Help services are currently available.</p>
              <p className="text-xs text-slate-500 mt-1">The administrator can add or activate services from Admin → Daily Help Services.</p>
            </div>
          )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl">
            <div className="flex items-start justify-between"><div><p className="text-[10px] uppercase font-black text-amber-700">{selected.category}</p><h2 className="text-lg font-black mt-1">{selected.name}</h2></div><button onClick={() => setSelected(null)} className="text-slate-400 text-xl cursor-pointer">×</button></div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-bold text-slate-700">Hours<input type="number" min={selected.minHours} max="12" value={hours} onChange={e => setHours(Math.max(selected.minHours, Math.min(12, Number(e.target.value))))} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5" /></label>
              <label className="text-xs font-bold text-slate-700">Start time<input type="datetime-local" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5" /></label>
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 space-y-2 text-xs"><div className="flex justify-between"><span>Rate</span><strong>₹{selected.pricePerHour}/hr</strong></div><div className="flex justify-between"><span>Estimated total</span><strong>₹{selected.pricePerHour * hours}</strong></div><div className="flex gap-2 text-slate-500"><CalendarDays className="w-4 h-4" /> Final amount is based on confirmed service duration and platform pricing.</div></div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500"><Clock3 className="w-4 h-4" /> OTP verification starts the billable timer.</div>
            <button disabled={bookingBusy || !user.name || !user.phone || !scheduledStart} onClick={createBooking} className="mt-5 w-full py-3 rounded-xl bg-amber-600 disabled:bg-slate-300 text-white text-sm font-black cursor-pointer">{bookingBusy ? 'Booking...' : 'Confirm Daily Help'}</button>
          </div>
        </div>
      )}
    </div>
  );
};
