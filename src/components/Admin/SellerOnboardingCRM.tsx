import React, { useCallback, useEffect, useState } from 'react';
import { adminAuthHeaders, API_BASE_URL } from '../../services/http/apiConfig';
import { Phone, RefreshCw, Search, MessageSquare, UserRoundCheck } from 'lucide-react';
import { SellerApplicationWorkspace } from './SellerApplicationWorkspace';

type Lead = {
  leadId: string; ownerName: string; email: string; phone: string; status: string;
  emailVerified: boolean; phoneVerified: boolean; emailOtpSkipped: boolean; phoneOtpSkipped: boolean; emailOtpRequired: boolean; phoneOtpRequired: boolean; contactConsent: boolean;
  callbackRequested: boolean; assignedTo?: string; callbackAt?: string; createdAt?: string;
};

const STATUSES = ['STARTED','CONTACT_VERIFIED','CALLBACK_REQUESTED','IN_PROGRESS','APPLICATION_SUBMITTED','CONVERTED','NOT_INTERESTED','UNREACHABLE'];

export const SellerOnboardingCRM: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [outcome, setOutcome] = useState('CALL_ATTEMPTED');
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const query = new URLSearchParams({ page: '0', size: '100' });
      if (status) query.set('status', status);
      if (search.trim()) query.set('search', search.trim());
      const response = await fetch(`${API_BASE_URL}/admin/seller-leads?${query}`, { headers: adminAuthHeaders() });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.message || 'Unable to load seller leads');
      setLeads(Array.isArray(data) ? data : []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load seller leads'); }
    finally { setBusy(false); }
  }, [search, status]);

  const loadNotes = useCallback(async (lead: Lead) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/seller-leads/${encodeURIComponent(lead.leadId)}/notes`, { headers: adminAuthHeaders() });
      const data = await response.json().catch(() => []);
      if (response.ok) setNotes(Array.isArray(data) ? data : []);
    } catch { setNotes([]); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (selected) { setAssignedTo(selected.assignedTo || ''); setFollowUpAt(selected.callbackAt ? selected.callbackAt.slice(0,16) : ''); void loadNotes(selected); }
  }, [selected, loadNotes]);

  const updateLead = async () => {
    if (!selected) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/seller-leads/${encodeURIComponent(selected.leadId)}`, {
        method: 'PATCH', headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo, followUpAt: followUpAt || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to update lead');
      await load();
      setSelected(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update lead'); }
    finally { setBusy(false); }
  };

  const saveNote = async () => {
    if (!selected || !note.trim()) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/seller-leads/${encodeURIComponent(selected.leadId)}/notes`, {
        method: 'POST', headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, outcome, followUpAt: followUpAt || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to save call note');
      setNote(''); await loadNotes(selected); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save call note'); }
    finally { setBusy(false); }
  };

  const changeStatus = async (nextStatus: string) => {
    if (!selected) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/seller-leads/${encodeURIComponent(selected.leadId)}`, {
        method: 'PATCH', headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to update lead status');
      setSelected(data); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update status'); }
    finally { setBusy(false); }
  };

  return <><section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-black text-slate-900">Merchant onboarding leads</h2><p className="mt-1 text-xs text-slate-500">Verified contact, callback consent, assignment and call follow-up. Unverified leads are visible but must not be contacted.</p></div>
      <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"><RefreshCw className={`h-4 w-4 ${busy?'animate-spin':''}`}/>Refresh</button>
    </div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <label className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border px-3"><Search className="h-4 w-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email or mobile" className="w-full py-2 text-sm outline-none"/></label>
      <select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl border px-3 py-2 text-sm"><option value="">All statuses</option>{['STARTED',...STATUSES].map(s=><option key={s}>{s}</option>)}</select>
    </div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <div className="overflow-hidden rounded-2xl border bg-white">
        {leads.length===0 ? <p className="p-6 text-sm text-slate-500">{busy?'Loading leads…':'No matching seller leads.'}</p> : <div className="divide-y">{leads.map(lead=><button key={lead.leadId} type="button" onClick={()=>setSelected(lead)} className={`block w-full p-4 text-left hover:bg-amber-50 ${selected?.leadId===lead.leadId?'bg-amber-50':''}`}>
          <div className="flex items-start justify-between gap-2"><div><p className="font-bold text-slate-900">{lead.ownerName}</p><p className="mt-1 text-xs text-slate-600">{lead.email} · {lead.phone}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{lead.status}</span></div>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px]"><span className={lead.emailVerified||lead.emailOtpSkipped?'text-emerald-700':'text-amber-700'}>Email {lead.emailVerified?'verified':lead.emailOtpSkipped?'OTP not required':'unverified'}</span><span className={lead.phoneVerified||lead.phoneOtpSkipped?'text-emerald-700':'text-amber-700'}>Mobile {lead.phoneVerified?'verified':lead.phoneOtpSkipped?'OTP not required':'unverified'}</span>{lead.callbackRequested&&<span className="font-bold text-rose-700">Callback requested</span>}</div>
        </button>)}</div>}
      </div>
      <div className="rounded-2xl border bg-white p-4">
        {!selected ? <div className="py-10 text-center text-sm text-slate-500">Select a lead to view the calling workflow.</div> : <div className="space-y-4">
          <div><h3 className="text-lg font-black">{selected.ownerName}</h3><p className="text-xs text-slate-500">{selected.leadId}</p></div>
          <div className="flex flex-wrap gap-2">
            <a href={selected.contactConsent&&(selected.phoneVerified||selected.phoneOtpSkipped)?`tel:${selected.phone}`:undefined} onClick={e=>{if(!selected.contactConsent||(!selected.phoneVerified&&!selected.phoneOtpSkipped))e.preventDefault();}} aria-disabled={!selected.contactConsent||!selected.phoneVerified} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"><Phone className="h-3 w-3"/>Call merchant</a>
            <a href={selected.contactConsent&&(selected.emailVerified||selected.emailOtpSkipped)?`mailto:${selected.email}`:undefined} onClick={e=>{if(!selected.contactConsent||(!selected.emailVerified&&!selected.emailOtpSkipped))e.preventDefault();}} aria-disabled={!selected.contactConsent||!selected.emailVerified} className="rounded-lg border px-3 py-2 text-xs font-bold">Email</a>
          </div>
          {(!selected.contactConsent||(!selected.phoneVerified&&!selected.phoneOtpSkipped))&&<p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Contact is disabled until the applicant verifies their mobile and explicitly consents to a callback.</p>}
          <label className="block text-xs font-bold">Assigned admin / agent<input value={assignedTo} onChange={e=>setAssignedTo(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" placeholder="Admin name or team member"/></label>
          <label className="block text-xs font-bold">Follow-up date & time<input type="datetime-local" value={followUpAt} onChange={e=>setFollowUpAt(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label>
          <button type="button" onClick={updateLead} disabled={busy} className="w-full rounded-lg bg-amber-600 p-2.5 text-xs font-black text-white"><UserRoundCheck className="mr-1 inline h-4 w-4"/>Save assignment / follow-up</button>
          <label className="block text-xs font-bold">Application / call status<select value={selected.status} onChange={e=>void changeStatus(e.target.value)} disabled={busy} className="mt-1 w-full rounded-lg border p-2 text-sm">{STATUSES.map(s=><option key={s}>{s}</option>)}</select></label>
          <div className="border-t pt-3"><h4 className="mb-2 flex items-center gap-2 text-sm font-black"><MessageSquare className="h-4 w-4"/>Call notes & outcomes</h4>
            <select value={outcome} onChange={e=>setOutcome(e.target.value)} className="mb-2 w-full rounded-lg border p-2 text-sm"><option value="CALL_ATTEMPTED">Call attempted</option><option value="CONNECTED">Connected</option><option value="NO_ANSWER">No answer</option><option value="INTERESTED">Interested</option><option value="FOLLOW_UP">Follow-up required</option><option value="NOT_INTERESTED">Not interested</option></select>
            <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={2000} placeholder="Record discussion, requirements or next steps…" className="w-full rounded-lg border p-2 text-sm"/>
            <button type="button" onClick={saveNote} disabled={busy||!note.trim()} className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-xs font-bold">Save call note</button>
            <div className="mt-3 max-h-52 space-y-2 overflow-auto">{notes.map(n=><article key={n.noteId} className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold">{n.outcome||'Note'} · {n.author}</p><p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">{n.note}</p><p className="mt-1 text-[10px] text-slate-400">{n.createdAt}</p></article>)}</div>
          </div>
        </div>}
      </div>
    </div>
  </section><SellerApplicationWorkspace />
  </>;
};
