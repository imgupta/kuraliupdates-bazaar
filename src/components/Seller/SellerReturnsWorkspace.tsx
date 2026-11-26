import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Truck, CheckCircle2, XCircle, Banknote } from 'lucide-react';
import { sellerReturnsApi } from '../../services/domains/sellerReturnsApi';

export const SellerReturnsWorkspace: React.FC = () => {
  const [rows,setRows]=useState<any[]>([]);
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [references,setReferences]=useState<Record<string,string>>({});
  const [reasons,setReasons]=useState<Record<string,string>>({});
  const load=useCallback(async()=>{try{setError('');setRows(await sellerReturnsApi.list());}catch(e:any){setError(e.message||'Unable to load returns');}},[]);
  useEffect(()=>{void load();},[load]);
  const act=async(id:string,fn:()=>Promise<any>)=>{setBusy(id);try{await fn();await load();}catch(e:any){setError(e.message||'Action failed');}finally{setBusy(null);}};
  const action=(r:any)=>String(r.status||'').toUpperCase();
  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Physical returns & refunds</h2><p className="text-xs text-slate-500">Approve the return, receive it from the delivery agent, then refund using the original payment mode.</p></div><button onClick={()=>void load()} className="rounded-xl border p-2" aria-label="Refresh returns"><RefreshCw className="h-4 w-4"/></button></div>
    {error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {rows.length===0?<div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">No physical return requests yet.</div>:rows.map(r=>{const s=action(r);return <article key={r.returnId} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-mono text-xs font-bold text-blue-700">{r.returnId}</p><p className="mt-1 text-sm font-bold">Order #{r.orderId}</p><p className="text-xs text-slate-500">Item {r.itemId} · Qty {r.quantity} · ₹{Number(r.returnAmount||0).toFixed(2)}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-extrabold">{s.replaceAll('_',' ')}</span></div>
      <p className="text-xs text-slate-600">Reason: {r.reason}</p><p className="text-xs font-semibold text-slate-700">Original payment: {r.originalPaymentMethod}</p>
      {s==='REQUESTED'&&<div className="space-y-2"><input value={reasons[r.returnId]||''} onChange={e=>setReasons(v=>({...v,[r.returnId]:e.target.value}))} placeholder="Reason if rejecting (required)" className="w-full rounded-xl border p-2 text-sm"/><div className="flex gap-2"><button disabled={!!busy} onClick={()=>void act(r.returnId,()=>sellerReturnsApi.decide(r.returnId,true))} className="flex-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><CheckCircle2 className="mr-1 inline h-4 w-4"/>Approve</button><button disabled={!!busy||!(reasons[r.returnId]||'').trim()} onClick={()=>void act(r.returnId,()=>sellerReturnsApi.decide(r.returnId,false,reasons[r.returnId]))} className="flex-1 rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-50"><XCircle className="mr-1 inline h-4 w-4"/>Reject</button></div></div>}
      {s==='PICKUP_ASSIGNED'&&<p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800"><Truck className="mr-1 inline h-4 w-4"/>Delivery agent assigned. Awaiting collection from buyer.</p>}
      {s==='PICKED_UP'&&<p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800"><Truck className="mr-1 inline h-4 w-4"/>Item collected. Delivery agent must hand it over to your store before refund.</p>}
      {s==='RECEIVED_BY_SELLER'&&<button disabled={!!busy} onClick={()=>void act(r.returnId,()=>sellerReturnsApi.refund(r.returnId,'INITIATE'))} className="w-full rounded-xl bg-slate-900 px-3 py-3 text-xs font-bold text-white disabled:opacity-50">Confirm receipt & prepare original-mode refund</button>}
      {s==='REFUND_PENDING'&&<div className="space-y-2"><p className="text-xs text-amber-800">Execute the refund outside KuraliUpdates using {r.originalPaymentMethod}. Then record the actual reference below.</p><input value={references[r.returnId]||''} onChange={e=>setReferences(v=>({...v,[r.returnId]:e.target.value}))} placeholder="Actual refund reference / cash receipt no." className="w-full rounded-xl border p-2 text-sm"/><button disabled={!!busy||!(references[r.returnId]||'').trim()} onClick={()=>void act(r.returnId,()=>sellerReturnsApi.refund(r.returnId,'COMPLETE',r.originalPaymentMethod,references[r.returnId]))} className="w-full rounded-xl bg-emerald-700 px-3 py-3 text-xs font-bold text-white disabled:opacity-50"><Banknote className="mr-1 inline h-4 w-4"/>Record refund completed</button></div>}
      {s==='REFUNDED'&&<p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">Refund recorded · {r.refundMethod} · Ref {r.refundReference}</p>}
      {r.status==='REJECTED'&&<p className="text-xs text-rose-700">Rejected: {r.sellerDecisionReason||'No reason provided'}</p>}
    </article>;})}
    <p className="text-[11px] text-slate-500">KuraliUpdates does not collect or transfer refund funds. The seller executes the refund directly and records the proof.</p>
  </section>;
};
