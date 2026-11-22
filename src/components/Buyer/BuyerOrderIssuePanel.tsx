import React, { useState } from 'react';
import { buyerPaymentsApi } from '../../services/domains/buyerPaymentsApi';

export const BuyerOrderIssuePanel: React.FC<{ orderIds: string[] }> = ({ orderIds }) => {
  const [orderId,setOrderId]=useState(orderIds[0]||'');
  const [issueType,setIssueType]=useState('MISSING_ITEM');
  const [description,setDescription]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  if(orderIds.length===0)return null;
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();setBusy(true);setMessage('');
    try{
      const result=await buyerPaymentsApi.reportIssue(orderId,issueType,description);
      setMessage(`Issue ${result.issueId} submitted. Our support team will review it.`);
      setDescription('');
    }catch(e:any){setMessage(e?.message||'Unable to submit issue.');}
    finally{setBusy(false);}
  };
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
    <div><h3 className="text-sm font-extrabold text-slate-900">Report an order issue</h3><p className="text-[11px] text-slate-500">Choose the seller order this issue relates to.</p></div>
    <form onSubmit={submit} className="space-y-2">
      {orderIds.length>1&&<select value={orderId} onChange={e=>setOrderId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-xs">{orderIds.map(id=><option key={id} value={id}>Seller order #{id}</option>)}</select>}
      <select value={issueType} onChange={e=>setIssueType(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-xs">
        <option value="MISSING_ITEM">Missing item</option><option value="WRONG_ITEM">Wrong item</option><option value="DAMAGED">Damaged item</option><option value="POOR_QUALITY">Poor quality</option><option value="NOT_DELIVERED">Not delivered</option><option value="PAYMENT">Payment issue</option><option value="REFUND">Refund issue</option><option value="OTHER">Other</option>
      </select>
      <textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={1000} rows={3} required placeholder="Describe what happened" className="w-full rounded-lg border px-3 py-2 text-xs"/>
      <button type="submit" disabled={busy||!description.trim()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">{busy?'Submitting…':'Submit issue'}</button>
    </form>
    {message&&<p role="status" className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700">{message}</p>}
  </section>;
};
