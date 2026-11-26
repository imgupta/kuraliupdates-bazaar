import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import { sellerPaymentsApi } from '../../services/domains/sellerPaymentsApi';

export const SellerPaymentWorkspace: React.FC<{ hidePaymentRecords?: boolean; hideDestination?: boolean }> = ({ hidePaymentRecords = false, hideDestination = false }) => {
  const [destination, setDestination] = useState<any>({ configured: false });
  const [upiId, setUpiId] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [payments, setPayments] = useState<any[]>([]);
  const [refundRefs, setRefundRefs] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setBusy(true);
    try {
      const [dest, records] = await Promise.all([sellerPaymentsApi.getDestination(), sellerPaymentsApi.getPayments()]);
      setDestination(dest || { configured: false });
      setUpiId(dest?.upiId || '');
      setPayeeName(dest?.payeeName || '');
      setPayments(Array.isArray(records) ? records : []);
      setError('');
    } catch (e: any) { setError(e?.message || 'Unable to load payment settings.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const next = await sellerPaymentsApi.saveDestination(upiId, payeeName);
      setDestination(next);
      setError('');
    } catch (e: any) { setError(e?.message || 'Unable to save UPI destination.'); }
    finally { setBusy(false); }
  };
  const decide = async (paymentId: string, confirm: boolean) => {
    setBusy(true);
    try { await sellerPaymentsApi.decidePayment(paymentId, confirm, confirm ? '' : 'Seller could not verify this UTR. Contact buyer for clarification.'); await load(); }
    catch (e: any) { setError(e?.message || 'Unable to update payment status.'); }
    finally { setBusy(false); }
  };
  const refund = async (paymentId: string, action: 'INITIATE'|'COMPLETE'|'REJECT') => {
    setBusy(true);
    try { await sellerPaymentsApi.updateRefund(paymentId, action, refundRefs[paymentId]); await load(); }
    catch (e: any) { setError(e?.message || 'Unable to update refund.'); }
    finally { setBusy(false); }
  };
  const label = (value: string) => String(value || '').replaceAll('_',' ').toLowerCase();

  return <div className="space-y-4">
    {!hideDestination && <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-emerald-700"/><div><h3 className="text-sm font-extrabold">Seller UPI payment destination</h3><p className="text-[11px] text-slate-500">Customers pay your store directly. KuraliUpdates never collects these funds.</p></div></div>
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">UPI ID<input value={upiId} onChange={e=>setUpiId(e.target.value)} placeholder="store@bank" maxLength={128} required className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"/></label>
        <label className="text-xs font-semibold">Payee name<input value={payeeName} onChange={e=>setPayeeName(e.target.value)} placeholder="Name shown in UPI app" maxLength={150} required className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"/></label>
        <button disabled={busy} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 sm:col-span-2">{busy ? 'Saving…' : 'Submit UPI details for admin verification'}</button>
      </form>
      {destination?.configured !== false && <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><ShieldCheck className="h-4 w-4"/>Verification: <strong>{label(destination.verificationStatus)}</strong> · {destination.active ? 'Active for new checkouts' : 'Not active for new checkouts'}. Editing details resets verification.</p>}
    </section>}
    {!hidePaymentRecords && <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between"><div><h3 className="text-sm font-extrabold">{hideDestination ? "Returns & refunds" : "Seller payments"}</h3><p className="text-[11px] text-slate-500">Only payment and refund records belonging to your store are shown. Refunds are seller-funded; KuraliUpdates does not transfer funds.</p></div><button type="button" onClick={()=>void load()} className="rounded-lg border p-2" aria-label="Refresh payments"><RefreshCw className="h-4 w-4"/></button></div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
      {payments.filter(p => ['REQUESTED','INITIATED_BY_SELLER'].includes(String(p.refundStatus || '').toUpperCase())).length===0 && hideDestination ? <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No open refund requests. New buyer requests will appear here.</p> : payments.length===0 ? <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No seller-direct UPI payment records yet.</p> : payments.map(p=><article key={p.paymentId} className="rounded-xl border border-slate-200 p-3 space-y-2">
        <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-extrabold">Order #{p.orderId}</p><p className="text-[11px] text-slate-500">Buyer: {p.buyerEmail}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{label(p.paymentStatus)}</span></div>
        <p className="text-sm font-black">₹{Number(p.expectedAmount||0).toFixed(2)} · UTR {p.utrReference || 'not submitted'}</p>
        {p.paymentStatus==='AWAITING_SELLER_CONFIRMATION' && <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={()=>void decide(p.paymentId,true)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Confirm received</button><button type="button" disabled={busy} onClick={()=>void decide(p.paymentId,false)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">Reject reference</button></div>}
        {p.refundStatus==='REQUESTED' && <div className="space-y-2"><p className="text-xs text-amber-800">Buyer refund request: {p.refundReason}</p><button type="button" disabled={busy} onClick={()=>void refund(p.paymentId,'INITIATE')} className="rounded-lg border px-3 py-2 text-xs font-bold">I will initiate seller-funded refund</button><button type="button" disabled={busy} onClick={()=>void refund(p.paymentId,'REJECT')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">Reject refund request</button></div>}
        {p.refundStatus==='INITIATED_BY_SELLER' && <div className="space-y-2"><label className="block text-[11px] font-semibold">Actual bank/UPI refund reference after sending refund<input value={refundRefs[p.paymentId]||''} onChange={e=>setRefundRefs(prev=>({...prev,[p.paymentId]:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2 text-xs" placeholder="Refund transaction reference"/></label><button type="button" disabled={busy||!refundRefs[p.paymentId]?.trim()} onClick={()=>void refund(p.paymentId,'COMPLETE')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Record refund completed</button></div>}
      </article>)}
    </section>}
  </div>;
};
