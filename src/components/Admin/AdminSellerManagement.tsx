import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MapPin, RefreshCw, Save, Search, Store, XCircle } from 'lucide-react';
import { adminApi } from '../../services/domains/adminApi';
import { API_BASE_URL, adminAuthHeaders } from '../../services/http/apiConfig';

type Seller = Record<string, any>;
type Tab = 'manage' | 'locations';

const value = (v: unknown) => String(v ?? '');

export const AdminSellerManagement: React.FC = () => {
  const [rows, setRows] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('manage');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [editing, setEditing] = useState<Seller | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/sellers`, {
        headers: adminAuthHeaders(),
        cache: 'no-store',
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data?.message || `Unable to load sellers (HTTP ${response.status})`);
      const sellers = Array.isArray(data) ? data : [];
      setRows(sellers);
      setSelectedId(current => sellers.some((seller: Seller) => seller.sellerId === current) ? current : (sellers[0]?.sellerId || ''));
    } catch (e: any) {
      setError(e?.message || 'Unable to load seller records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const selected = rows.find(seller => seller.sellerId === selectedId) || null;
  useEffect(() => { setEditing(selected ? { ...selected } : null); }, [selected]);

  const pendingLocations = useMemo(() => rows.filter(seller =>
    String(seller.status || '').toUpperCase() === 'APPROVED' && seller.locationVerified !== true
  ).filter(seller => [seller.storeName, seller.ownerName, seller.email, seller.phone, seller.address, seller.locality]
    .some(field => value(field).toLowerCase().includes(query.toLowerCase()))), [rows, query]);

  const saveSeller = async () => {
    if (!editing) return;
    if (!value(editing.storeName).trim() || !value(editing.ownerName).trim() ||
        !value(editing.phone).trim() || !value(editing.category).trim() ||
        !value(editing.address).trim() || !value(editing.locality).trim()) {
      setError('Store, owner, phone, category, address and locality are required.');
      return;
    }
    setSaving(true); setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/sellers/${encodeURIComponent(editing.sellerId)}`, {
        method: 'PATCH',
        headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: editing.storeName, ownerName: editing.ownerName, phone: editing.phone,
          category: editing.category, address: editing.address, locality: editing.locality,
          description: editing.description || '',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || 'Seller profile update failed.');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Unable to save seller profile.');
    } finally { setSaving(false); }
  };

  const reviewLocation = async (seller: Seller, approve: boolean) => {
    const latitude = Number(seller.latitude);
    const longitude = Number(seller.longitude);
    if (approve && (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) {
      setError('This seller has no valid map coordinates. Ask the seller to update the address and map pin before approval.');
      return;
    }
    let reason = '';
    if (!approve) {
      const supplied = window.prompt(`Reason for rejecting the updated location for ${seller.storeName || 'this seller'}:`);
      if (supplied === null) return;
      reason = supplied.trim();
      if (!reason) { setError('A rejection reason is required.'); return; }
      if (reason.length > 500) { setError('Rejection reason must be 500 characters or fewer.'); return; }
      if (!window.confirm(`Reject this location? It will remain unverified and delivery/checkout eligibility will stay blocked.`)) return;
    }
    setSaving(true); setError('');
    try {
      await adminApi.verifySellerLocation(seller.sellerId, latitude, longitude, approve, reason);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Unable to update seller location verification.');
    } finally { setSaving(false); }
  };

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-black text-slate-900">Seller workspace</h2><p className="text-xs text-slate-500">One place to maintain seller profiles and review changed store locations.</p></div>
      <button onClick={() => void load()} disabled={loading || saving} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Refresh</button>
    </div>
    <div role="tablist" aria-label="Seller workspace" className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
      <button role="tab" aria-selected={tab === 'manage'} onClick={() => { setTab('manage'); setError(''); }} className={`rounded-lg px-3 py-3 text-sm font-bold ${tab === 'manage' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600'}`}>Manage seller</button>
      <button role="tab" aria-selected={tab === 'locations'} onClick={() => { setTab('locations'); setError(''); }} className={`rounded-lg px-3 py-3 text-sm font-bold ${tab === 'locations' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600'}`}>Location approvals <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px]">{rows.filter(s => String(s.status || '').toUpperCase() === 'APPROVED' && s.locationVerified !== true).length}</span></button>
    </div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
    {tab === 'manage' ? <div className="space-y-4 rounded-2xl border bg-white p-4">
      <label className="block text-xs font-bold text-slate-700">Select seller
        <select value={selectedId} onChange={event => setSelectedId(event.target.value)} disabled={loading || !rows.length} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
          {rows.length === 0 && <option value="">No sellers available</option>}
          {rows.map(seller => <option key={seller.sellerId} value={seller.sellerId}>{seller.storeName || 'Unnamed store'} · {seller.ownerName || seller.email} · {seller.status}</option>)}
        </select>
      </label>
      {editing && <><div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3"><Store className="h-5 w-5 text-teal-700"/><div className="min-w-0"><p className="truncate text-sm font-extrabold">{editing.storeName}</p><p className="truncate text-[11px] text-slate-500">{editing.email} · {editing.sellerId}</p></div><span className="ml-auto rounded-full bg-white px-2 py-1 text-[10px] font-bold">{editing.status}</span></div>
        <div className="grid gap-3 sm:grid-cols-2">{([
          ['storeName','Store name'],['ownerName','Owner name'],['phone','Phone'],['category','Category'],['address','Address'],['locality','Locality']
        ] as const).map(([key,label]) => <label key={key} className="text-xs font-bold text-slate-700">{label}<input value={value(editing[key])} onChange={event => setEditing(current => current ? { ...current, [key]: event.target.value } : current)} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"/></label>)}
          <label className="text-xs font-bold text-slate-700 sm:col-span-2">Business description<textarea value={value(editing.description)} onChange={event => setEditing(current => current ? { ...current, description: event.target.value } : current)} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm"/></label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"><p className="text-[11px] text-slate-500">Email and seller identity are read-only. Address changes require location re-verification.</p><button onClick={() => void saveSeller()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Save className="h-4 w-4"/>{saving ? 'Saving…' : 'Save seller'}</button></div>
      </>}
    </div> : <div className="space-y-3">
      <label className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search pending location reviews" className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm"/></label>
      <p className="text-xs text-slate-500">Only approved sellers whose current store location is not verified appear here. Approval restores location verification; rejection keeps the location blocked.</p>
      {loading && rows.length === 0 ? <p className="rounded-xl border bg-white p-5 text-sm text-slate-500">Loading sellers…</p> : pendingLocations.length === 0 ? <p className="rounded-xl border bg-white p-5 text-sm text-slate-500">No pending location reviews.</p> : pendingLocations.map(seller => <article key={seller.sellerId} className="space-y-3 rounded-2xl border bg-white p-4">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-sm font-extrabold">{seller.storeName}</h3><p className="text-xs text-slate-500">{seller.ownerName} · {seller.phone}</p><p className="break-words text-xs text-slate-600">{seller.address}, {seller.locality}</p></div><span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">Verification pending</span></div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500"><MapPin className="h-4 w-4"/><span>Lat: {value(seller.latitude) || 'Missing'} · Long: {value(seller.longitude) || 'Missing'}</span>{seller.latitude != null && seller.longitude != null && <a className="font-bold text-teal-700 underline" href={`https://www.google.com/maps?q=${encodeURIComponent(`${seller.latitude},${seller.longitude}`)}`} target="_blank" rel="noreferrer">Open map</a>}</div>
        <div className="flex flex-wrap gap-2"><button disabled={saving} onClick={() => void reviewLocation(seller, true)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4"/>Approve location</button><button disabled={saving} onClick={() => void reviewLocation(seller, false)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2.5 text-xs font-bold text-rose-700 disabled:opacity-50"><XCircle className="h-4 w-4"/>Reject location</button></div>
      </article>)}
    </div>}
  </section>;
};
