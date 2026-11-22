import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../../services/http/apiConfig';

export const AdminSellerPaymentReview: React.FC = () => {
  const [records,setRecords]=useState<any[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const load=async()=>{
    setBusy(true);
    try {
      const token=localStorage.getItem('kurali_auth_token');
      const response=await fetch(`${API_BASE_URL}/admin/payment-destinations?status=PENDING_VERIFICATION`,{headers:{Accept:'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},cache:'no-store'});
      const data=await response.json().catch(()=>[]);
      if(!response.ok) throw new Error(data?.message||`Unable to load payment destinations (HTTP ${response.status})`);
      setRecords(Array.isArray(data)?data:[]);setError('');
    } catch(e:any){setError(e?.message||'Unable to load seller payment destinations.');}
    finally{setBusy(false);}
  };
  useEffect(()=>{void load();},[]);
  const review=async(sellerId:string,approve:boolean)=>{
    setBusy(true);
    try{
      const token=localStorage.getItem('kurali_auth_token');
      const response=await fetch(`${API_BASE_URL}/admin/payment-destinations/${encodeURIComponent(sellerId)}/review`,{
        method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
        body:JSON.stringify({approve,activate:approve,reason:approve?'Verified against seller ownership evidence':'Payment destination rejected by admin'}),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data?.message||`Review failed (HTTP ${response.status})`);
      await load();
    }catch(e:any){setError(e?.message||'Unable to review payment destination.');}
    finally{setBusy(false);}
  };
  return <section className="space-y-4">
    <div className="flex items-center justify-between"><div><h2 className="text-base font-extrabold">Seller UPI destination verification</h2><p className="mt-1 text-xs text-slate-500">Only approved and verified seller destinations can be used at checkout.</p></div><button type="button" onClick={()=>void load()} disabled={busy} className="rounded-xl border p-2"><RefreshCw className="h-4 w-4"/></button></div>
    {error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
    {records.length===0?<p className="rounded-xl border bg-white p-5 text-xs text-slate-500">No seller UPI destinations are awaiting review.</p>:records.map(r=><article key={r.destinationId} className="rounded-2xl border bg-white p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold">{r.storeName}</p><p className="text-xs text-slate-500">{r.ownerName} · {r.sellerId}</p></div><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">{r.verificationStatus}</span></div>
      <div className="mt-3 rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold">{r.upiId}</p><p className="text-[11px] text-slate-500">Payee name: {r.payeeName}</p></div>
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={()=>void review(r.sellerId,true)} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><ShieldCheck className="mr-1 inline h-3.5 w-3.5"/>Verify & activate</button><button type="button" disabled={busy} onClick={()=>void review(r.sellerId,false)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-40">Reject</button></div>
    </article>)}
  </section>;
};
