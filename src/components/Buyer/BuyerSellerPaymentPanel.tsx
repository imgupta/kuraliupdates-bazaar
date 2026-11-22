import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Copy, RefreshCw, ShieldCheck } from 'lucide-react';
import { buyerPaymentsApi } from '../../services/domains/buyerPaymentsApi';

type SellerPayment = {
  paymentId: string; orderId: string; expectedAmount: number; upiId: string; payeeName: string;
  paymentStatus: string; utrReference?: string; expiresAt?: string; refundStatus?: string;
  refundReason?: string; refundReference?: string;
};

const statusLabel = (value?: string) => String(value || 'UNKNOWN').replaceAll('_', ' ').toLowerCase();

export const BuyerSellerPaymentPanel: React.FC<{ orderId: string; checkoutGroupId?: string }> = ({ orderId, checkoutGroupId }) => {
  const [payments, setPayments] = useState<SellerPayment[]>([]);
  const [utr, setUtr] = useState<Record<string,string>>({});
  const [refundReason, setRefundReason] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const result = checkoutGroupId
        ? await buyerPaymentsApi.getCheckoutPayments(checkoutGroupId)
        : [await buyerPaymentsApi.getOrderPayment(orderId)];
      setPayments(Array.isArray(result) ? result : []);
    } catch (e: any) {
      if (!String(e?.message || '').includes('404')) setError(e?.message || 'Unable to load seller payment details.');
    }
  };
  useEffect(() => { void load(); }, [orderId, checkoutGroupId]);

  const submit = async (payment: SellerPayment) => {
    const reference = (utr[payment.orderId] || '').trim();
    if (!reference) return;
    setBusy(payment.orderId);
    try {
      await buyerPaymentsApi.submitUtr(payment.orderId, reference);
      setUtr(prev => ({ ...prev, [payment.orderId]: '' }));
      await load();
    } catch (e: any) { setError(e?.message || 'Unable to submit UTR.'); }
    finally { setBusy(null); }
  };
  const refund = async (payment: SellerPayment) => {
    const reason = (refundReason[payment.orderId] || '').trim();
    if (!reason) return;
    setBusy(payment.orderId);
    try { await buyerPaymentsApi.requestRefund(payment.orderId, reason); await load(); }
    catch (e: any) { setError(e?.message || 'Unable to request seller refund.'); }
    finally { setBusy(null); }
  };

  if (payments.length === 0 && !error) return null;
  return <section className="rounded-2xl border border-amber-200 bg-white p-4 space-y-3">
    <div className="flex items-center justify-between gap-2">
      <div><h3 className="text-sm font-extrabold text-slate-900">Pay each store directly</h3>
        <p className="text-[11px] text-slate-600">KuraliUpdates does not collect or hold these payments.</p></div>
      <button type="button" onClick={() => void load()} aria-label="Refresh seller payment status" className="rounded-lg border p-2"><RefreshCw className="h-4 w-4"/></button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
    {payments.map(payment => <div key={payment.paymentId} className="rounded-xl border border-slate-200 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-bold text-slate-900">Seller order #{payment.orderId}</p>
        <p className="text-[11px] text-slate-600">Payee: {payment.payeeName}</p></div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{statusLabel(payment.paymentStatus)}</span></div>
      <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2"><div><p className="text-[10px] text-slate-500">Exact seller payable</p>
        <p className="text-lg font-black">₹{Number(payment.expectedAmount || 0).toFixed(2)}</p></div>
        <div className="text-right"><p className="text-[10px] text-slate-500">Verified seller UPI ID</p><p className="text-xs font-bold">{payment.upiId}</p>
          <button type="button" onClick={() => void navigator.clipboard?.writeText(payment.upiId)} className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-blue-700"><Copy className="h-3 w-3"/>Copy UPI ID</button></div></div>
      {['AWAITING_PAYMENT','PAYMENT_REJECTED'].includes(payment.paymentStatus) && <div className="space-y-2">
        <label className="block text-[11px] font-semibold">After paying the seller in your UPI app, enter the UTR/reference</label>
        <input value={utr[payment.orderId] || ''} onChange={e => setUtr(prev => ({...prev,[payment.orderId]:e.target.value}))}
          maxLength={64} placeholder="UPI transaction reference" className="w-full rounded-lg border px-3 py-2 text-xs"/>
        <button type="button" disabled={!utr[payment.orderId]?.trim() || busy === payment.orderId}
          onClick={() => void submit(payment)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">
          {busy === payment.orderId ? 'Submitting…' : 'Submit payment reference'}</button>
      </div>}
      {payment.paymentStatus === 'AWAITING_SELLER_CONFIRMATION' && <p className="flex items-center gap-2 text-xs text-amber-800"><Clock className="h-4 w-4"/>Reference {payment.utrReference} submitted. Waiting for seller confirmation.</p>}
      {payment.paymentStatus === 'PAYMENT_CONFIRMED' && <p className="flex items-center gap-2 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4"/>Seller confirmed payment.</p>}
      {payment.paymentStatus === 'PAYMENT_EXPIRED' && <p className="text-xs text-rose-700">Payment request expired. Contact the seller before making another payment.</p>}
      {payment.refundStatus && payment.refundStatus !== 'NOT_REQUESTED' && <p className="text-xs text-slate-700">Seller-funded refund: <strong>{statusLabel(payment.refundStatus)}</strong>{payment.refundReference ? ` · Ref ${payment.refundReference}` : ''}</p>}
      {payment.paymentStatus === 'PAYMENT_CONFIRMED' && ['NOT_REQUESTED','REJECTED_BY_SELLER'].includes(payment.refundStatus || 'NOT_REQUESTED') &&
        <div className="space-y-2"><input value={refundReason[payment.orderId] || ''} onChange={e => setRefundReason(prev => ({...prev,[payment.orderId]:e.target.value}))}
          placeholder="Reason for refund request" maxLength={500} className="w-full rounded-lg border px-3 py-2 text-xs"/>
          <button type="button" disabled={!refundReason[payment.orderId]?.trim() || busy === payment.orderId}
            onClick={() => void refund(payment)} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-800 disabled:opacity-40">Request refund from seller</button></div>}
      <p className="text-[10px] leading-relaxed text-slate-500"><ShieldCheck className="mr-1 inline h-3 w-3"/>UPI app return and UTR submission are not proof of payment. The seller must confirm the payment.</p>
    </div>)}
  </section>;
};
