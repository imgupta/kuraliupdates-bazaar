import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../../services/http/apiConfig';

export const AdminSellerPaymentReview: React.FC = () => {
  const [records,setRecords]=useState<any[]>([]);
  const [codSettings,setCodSettings]=useState<any[]>([]);
  const [issues,setIssues]=useState<any[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const load=async()=>{
    setBusy(true);
    try {
      const token=localStorage.getItem('kurali_auth_token');
      const response=await fetch(`${API_BASE_URL}/admin/payment-destinations?status=ALL`,{headers:{Accept:'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},cache:'no-store'});
      const data=await response.json().catch(()=>[]);
      if(!response.ok) throw new Error(data?.message||`Unable to load payment destinations (HTTP ${response.status})`);
      setRecords(Array.isArray(data)?data:[]);
      const codResponse=await fetch(`${API_BASE_URL}/admin/payment-destinations/cod-settings`,{headers:{Accept:'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},cache:'no-store'});
      const codData=await codResponse.json().catch(()=>[]);
      if(!codResponse.ok) throw new Error(codData?.message||`Unable to load COD settings (HTTP ${codResponse.status})`);
      setCodSettings(Array.isArray(codData)?codData:[]);
      const issueResponse=await fetch(`${API_BASE_URL}/admin/payment-destinations/order-issues?status=ALL`,{headers:{Accept:'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},cache:'no-store'});
      const issueData=await issueResponse.json().catch(()=>[]);
      if(!issueResponse.ok) throw new Error(issueData?.message||`Unable to load order issues (HTTP ${issueResponse.status})`);
      setIssues(Array.isArray(issueData)?issueData:[]);setError('');
    } catch(e:any){setError(e?.message||'Unable to load seller payment destinations.');}
    finally{setBusy(false);}
  };
  useEffect(()=>{void load();},[]);
  const updateCod=async(sellerId:string,enabled:boolean)=>{
    setBusy(true);
    try{
      const token=localStorage.getItem('kurali_auth_token');
      const response=await fetch(`${API_BASE_URL}/admin/payment-destinations/${encodeURIComponent(sellerId)}/cod`,{
        method:'PUT',headers:{'Content-Type':'application/json',Accept:'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
        body:JSON.stringify({enabled}),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data?.message||`COD update failed (HTTP ${response.status})`);
      setCodSettings(prev=>prev.map(item=>item.sellerId===sellerId?{...item,codEnabled:enabled?1:0}:item));
    }catch(e:any){setError(e?.message||'Unable to update COD availability.');}
    finally{setBusy(false);}
  };
  const updateIssue=async(issueId:string,status:string)=>{
    setBusy(true);
    try{
      const token=localStorage.getItem('kurali_auth_token');
      const response=await fetch(`${API_BASE_URL}/admin/payment-destinations/order-issues/${encodeURIComponent(issueId)}`,{
        method:'PATCH',headers:{'Content-Type':'application/json',Accept:'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
        body:JSON.stringify({status}),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data?.message||`Issue update failed (HTTP ${response.status})`);
      setIssues(prev=>prev.map(issue=>issue.issueId===issueId?{...issue,status}:issue));
    }catch(e:any){setError(e?.message||'Unable to update issue.');}
    finally{setBusy(false);}
  };
  const activate=async(sellerId:string,active:boolean)=>{
    setBusy(true);
    try{
      const token=localStorage.getItem('kurali_auth_token');
      const response=await fetch(`${API_BASE_URL}/admin/payment-destinations/${encodeURIComponent(sellerId)}/activation`,{method:'PUT',headers:{'Content-Type':'application/json',Accept:'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({active})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data?.message||`UPI activation update failed (HTTP ${response.status})`);
      await load();
    }catch(e:any){setError(e?.message||'Unable to update UPI availability.');}
    finally{setBusy(false);}
  };
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
    <div className="flex items-center justify-between"><div><h2 className="text-base font-extrabold">Seller payment methods</h2><p className="mt-1 text-xs text-slate-500">All seller COD and UPI configurations. Only verified and active UPI destinations appear at buyer checkout.</p></div><button type="button" onClick={()=>void load()} disabled={busy} className="rounded-xl border p-2"><RefreshCw className="h-4 w-4"/></button></div>
    {error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
    <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
      <h3 className="text-sm font-extrabold">Cash on Delivery availability · all sellers</h3>
      <p className="text-[11px] text-slate-500">COD is enabled by default for existing sellers. Disable it per seller when COD is not supported.</p>
      {codSettings.map(s=><div key={s.sellerId} className="flex items-center justify-between gap-3 border-t py-2"><span className="text-xs font-semibold">{s.storeName}</span><button type="button" disabled={busy} onClick={()=>void updateCod(s.sellerId,Number(s.codEnabled)!==1)} className={`rounded-lg px-3 py-2 text-xs font-bold ${Number(s.codEnabled)===1?'bg-emerald-50 text-emerald-800':'bg-slate-100 text-slate-700'}`}>{Number(s.codEnabled)===1?'COD enabled · Disable':'COD disabled · Enable'}</button></div>)}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div><h3 className="text-sm font-extrabold">Buyer order issues</h3><p className="text-[11px] text-slate-500">Open missing, wrong, damaged, delivery, payment and refund reports.</p></div>
      {issues.length===0?<p className="text-xs text-slate-500">No open buyer issues.</p>:issues.map(issue=><article key={issue.issueId} className="rounded-xl border p-3 space-y-2">
        <div className="flex items-start justify-between gap-2"><p className="text-xs font-extrabold">{issue.issueType?.replaceAll('_',' ')} · Order #{issue.orderId}</p><span className="text-[10px] text-slate-500">{issue.sellerId} · {issue.status}</span></div>
        <p className="text-xs text-slate-700">{issue.description}</p><p className="text-[10px] text-slate-500">{issue.buyerEmail||'Buyer'} · {issue.issueId}</p>
        <div className="flex flex-wrap gap-2">{issue.status==='OPEN'&&<button type="button" disabled={busy} onClick={()=>void updateIssue(issue.issueId,'IN_REVIEW')} className="rounded-lg border px-3 py-2 text-[11px] font-bold">Mark in review</button>}{issue.status!=='RESOLVED'&&issue.status!=='CLOSED'&&<button type="button" disabled={busy} onClick={()=>void updateIssue(issue.issueId,'RESOLVED')} className="rounded-lg bg-emerald-700 px-3 py-2 text-[11px] font-bold text-white">Resolve</button>}</div>
      </article>)}
    </section>
    {records.length===0?<p className="rounded-xl border bg-white p-5 text-xs text-slate-500">No seller UPI destinations are configured yet.</p>:records.map(r=><article key={r.destinationId} className="rounded-2xl border bg-white p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold">{r.storeName}</p><p className="text-xs text-slate-500">{r.ownerName} · {r.sellerId}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${r.verificationStatus==='VERIFIED'?'bg-emerald-50 text-emerald-800':r.verificationStatus==='REJECTED'?'bg-rose-50 text-rose-800':'bg-amber-50 text-amber-800'}`}>{r.verificationStatus} · {Number(r.active)===1?'ACTIVE':'INACTIVE'}</span></div>
      <div className="mt-3 rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold">{r.upiId}</p><p className="text-[11px] text-slate-500">Payee name: {r.payeeName}</p></div>
      <div className="mt-3 flex flex-wrap gap-2">{r.verificationStatus==='PENDING_VERIFICATION' && <button type="button" disabled={busy} onClick={()=>void review(r.sellerId,true)} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><ShieldCheck className="mr-1 inline h-3.5 w-3.5"/>Verify & activate</button><button type="button" disabled={busy} onClick={()=>void review(r.sellerId,false)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-40">Reject</button>} {r.verificationStatus==='VERIFIED' && <button type="button" disabled={busy} onClick={()=>void activate(r.sellerId,Number(r.active)!==1)} className={`rounded-xl px-3 py-2 text-xs font-bold ${Number(r.active)===1?'border border-rose-200 text-rose-700':'bg-emerald-700 text-white'}`}>{Number(r.active)===1?'Deactivate UPI':'Activate UPI'}</button>}</div>
    </article>)}
  </section>;
};
