import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Pencil } from 'lucide-react';
import { filterBuyers, type AdminBuyer } from './adminBuyers';
import { useAdminBuyerEditor } from './useAdminBuyerEditor';
type ToastType = 'success' | 'error' | 'info';
type ShowToast = (message: string, type?: ToastType) => void;
interface AdminBuyersTabProps {
  buyers: AdminBuyer[];
  buyersLoading: boolean;
  setBuyers: Dispatch<SetStateAction<any[]>>;
  showToast: ShowToast;
}
export const AdminBuyersTab: React.FC<AdminBuyersTabProps> = ({ buyers, buyersLoading, setBuyers, showToast }) => {
  const { buyerSearch, setBuyerSearch, editingBuyer, buyerForm, buyerSaving, buyerEditError, openBuyerEditor, closeBuyerEditor, updateBuyerFormField, saveBuyer } = useAdminBuyerEditor({ setBuyers, showToast });
  const filteredBuyers = filterBuyers(buyers, buyerSearch);
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-base font-extrabold text-slate-900">Registered buyers ({buyers.length})</h2><p className="mt-1 text-xs text-slate-500">Search existing customer accounts and update their contact or delivery address details.</p></div>
        <input type="search" value={buyerSearch} onChange={event => setBuyerSearch(event.target.value)} placeholder="Search name, email or mobile…" aria-label="Search buyers" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm sm:max-w-sm"/>
      </div>
      {buyersLoading ? <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">Loading buyers…</div> : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredBuyers.map(buyer => (
            <article key={buyer.userId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><h3 className="truncate text-sm font-extrabold text-slate-900">{buyer.name || 'Unnamed customer'}</h3><p className="mt-1 break-all text-xs text-slate-500">{buyer.email || 'No email'} · {buyer.phone || 'No mobile'}</p></div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{Number(buyer.isVerified)===1?'Verified':'Unverified'}</span>
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-600"><p><span className="text-slate-400">Locality:</span> {buyer.locality || '—'}</p><p><span className="text-slate-400">Address:</span> {buyer.formattedAddress || buyer.address || '—'}</p><p className="font-mono text-[10px] text-slate-400">{buyer.userId}</p></div>
              <button type="button" onClick={() => openBuyerEditor(buyer)} className="mt-4 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"><Pencil className="mr-1 inline h-3.5 w-3.5"/> Edit customer details</button>
            </article>
          ))}
          {filteredBuyers.length===0 && <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">No customers match your search.</div>}
        </div>
      )}
      {editingBuyer && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Edit customer details">
        <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
          <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="text-lg font-black text-slate-900">Edit customer</h3><p className="text-xs text-slate-500">Changes are recorded in the admin audit history.</p></div><button type="button" onClick={closeBuyerEditor} className="rounded-lg border px-3 py-2 text-xs font-bold">Close</button></div>
          {buyerEditError && <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{buyerEditError}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {(['name','email','phone','locality','address','formattedAddress'] as const).map(field=><label key={field} className="block space-y-1 text-xs font-bold text-slate-700 sm:col-span-1"><span>{({name:'Customer name',email:'Email',phone:'Mobile number',locality:'Locality',address:'Address',formattedAddress:'Formatted address'})[field]}</span><input value={buyerForm[field]} onChange={event=>updateBuyerFormField(field, event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"/></label>)}
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={closeBuyerEditor} className="min-h-11 rounded-xl border px-4 py-2 text-xs font-bold">Cancel</button><button type="button" disabled={buyerSaving} onClick={saveBuyer} className="min-h-11 rounded-xl bg-purple-700 px-5 py-2 text-xs font-bold text-white disabled:opacity-50">{buyerSaving?'Saving…':'Save customer details'}</button></div>
        </div>
      </div>}
    </div>
  );
};
