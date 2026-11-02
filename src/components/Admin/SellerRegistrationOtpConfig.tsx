import React, { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL, adminAuthHeaders } from '../../services/http/apiConfig';
import { RefreshCw, Save, ShieldCheck, History } from 'lucide-react';

type OtpSettings = { emailOtpEnabled: boolean; mobileOtpEnabled: boolean; updatedBy?: string | null; updatedAt?: string | null };
type OtpAudit = { auditId: string; emailOtpEnabled: boolean; mobileOtpEnabled: boolean; previousEmailOtpEnabled: boolean; previousMobileOtpEnabled: boolean; changedBy: string; changedAt: string };

export const SellerRegistrationOtpConfig: React.FC = () => {
  const [settings, setSettings] = useState<OtpSettings>({ emailOtpEnabled: false, mobileOtpEnabled: false });
  const [saved, setSaved] = useState<OtpSettings | null>(null);
  const [history, setHistory] = useState<OtpAudit[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const headers = adminAuthHeaders();
      const [settingsResponse, historyResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/seller-registration/otp-settings`, { headers }),
        fetch(`${API_BASE_URL}/admin/seller-registration/otp-settings/history?limit=20`, { headers }),
      ]);
      const data = await settingsResponse.json().catch(() => ({}));
      if (!settingsResponse.ok) throw new Error(data.message || 'Unable to load OTP settings');
      const next = { emailOtpEnabled: Boolean(data.emailOtpEnabled), mobileOtpEnabled: Boolean(data.mobileOtpEnabled), updatedBy: data.updatedBy, updatedAt: data.updatedAt };
      setSettings(next); setSaved(next);
      if (historyResponse.ok) {
        const auditData = await historyResponse.json().catch(() => ({}));
        setHistory(Array.isArray(auditData.items) ? auditData.items : []);
      } else setHistory([]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load OTP settings'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setSaving(true); setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/seller-registration/otp-settings`, {
        method: 'PUT', headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOtpEnabled: settings.emailOtpEnabled, mobileOtpEnabled: settings.mobileOtpEnabled }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to save OTP settings');
      const next = { emailOtpEnabled: Boolean(data.emailOtpEnabled), mobileOtpEnabled: Boolean(data.mobileOtpEnabled), updatedBy: data.updatedBy, updatedAt: data.updatedAt };
      setSettings(next); setSaved(next);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save OTP settings'); }
    finally { setSaving(false); }
  };

  const changed = !saved || settings.emailOtpEnabled !== saved.emailOtpEnabled || settings.mobileOtpEnabled !== saved.mobileOtpEnabled;
  return <section className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-base font-extrabold text-slate-900">Customer & seller registration OTP controls</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Enable or disable email and mobile OTP independently for new buyer and seller registrations. These controls do not change login OTP, payment verification or existing accounts.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading || saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Refresh</button>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <div className="grid gap-4 md:grid-cols-2">
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4"><input type="checkbox" checked={settings.emailOtpEnabled} onChange={event => setSettings(current => ({ ...current, emailOtpEnabled: event.target.checked }))} disabled={loading || saving} className="mt-1 h-4 w-4 accent-purple-700"/><span><span className="block text-sm font-bold text-slate-900">Email OTP verification</span><span className="mt-1 block text-xs text-slate-500">Send and require a registration code by email.</span><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${settings.emailOtpEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{settings.emailOtpEnabled ? 'Enabled' : 'Disabled'}</span></span></label>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4"><input type="checkbox" checked={settings.mobileOtpEnabled} onChange={event => setSettings(current => ({ ...current, mobileOtpEnabled: event.target.checked }))} disabled={loading || saving} className="mt-1 h-4 w-4 accent-purple-700"/><span><span className="block text-sm font-bold text-slate-900">Mobile OTP verification</span><span className="mt-1 block text-xs text-slate-500">Send and require a registration code by SMS.</span><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${settings.mobileOtpEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{settings.mobileOtpEnabled ? 'Enabled' : 'Disabled'}</span></span></label>
    </div>
    {!settings.emailOtpEnabled && !settings.mobileOtpEnabled && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><strong>Both channels are disabled.</strong> New buyer and seller registrations can continue after contact details are captured without OTP. Contact details remain available to authorized admins. Re-enable channels when permitted.</div>}
    {(settings.emailOtpEnabled || settings.mobileOtpEnabled) && <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">Only enabled channels receive a code and are required. Seller leads retain the settings snapshot taken when registration starts.</div>}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div className="text-[11px] text-slate-500">{saved?.updatedAt ? `Last updated by ${saved.updatedBy || 'admin'} · ${new Date(saved.updatedAt).toLocaleString()}` : 'Settings have not been loaded yet.'}</div><button type="button" onClick={() => void save()} disabled={!changed || loading || saving} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white disabled:opacity-40"><Save className="h-4 w-4"/>{saving ? 'Saving…' : 'Save OTP settings'}</button></div>
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2"><History className="h-4 w-4 text-slate-600"/><h3 className="text-sm font-bold text-slate-900">Configuration change history</h3></div>
      {history.length === 0 ? <p className="text-xs text-slate-500">No configuration changes recorded yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b text-slate-500"><th className="py-2 pr-3">Changed</th><th className="py-2 pr-3">Admin</th><th className="py-2 pr-3">Email OTP</th><th className="py-2">Mobile OTP</th></tr></thead><tbody>{history.map(item => <tr key={item.auditId} className="border-b last:border-0"><td className="py-2 pr-3 whitespace-nowrap">{new Date(item.changedAt).toLocaleString()}</td><td className="py-2 pr-3">{item.changedBy}</td><td className="py-2 pr-3">{item.previousEmailOtpEnabled ? 'ON' : 'OFF'} → {item.emailOtpEnabled ? 'ON' : 'OFF'}</td><td className="py-2">{item.previousMobileOtpEnabled ? 'ON' : 'OFF'} → {item.mobileOtpEnabled ? 'ON' : 'OFF'}</td></tr>)}</tbody></table></div>}
    </div>
    <p className="flex items-start gap-2 text-[11px] text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/>Changes are backend-enforced. Existing in-progress seller leads keep their original requirements. Every effective policy change is recorded with administrator and timestamp.</p>
  </section>;
};
