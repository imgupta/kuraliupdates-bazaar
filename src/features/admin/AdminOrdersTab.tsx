import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Pencil } from 'lucide-react';
import { filterAdminOrders } from './adminOrders';
import { useAdminOrders } from './useAdminOrders';
interface Props { adminOrders:any[]; setAdminOrders:Dispatch<SetStateAction<any[]>>; showToast:(message:string,type?:'success'|'info'|'error')=>void; }
export const AdminOrdersTab:React.FC<Props>=({adminOrders,setAdminOrders,showToast})=>{
  const {orderSearch,setOrderSearch,orderStatusFilter,setOrderStatusFilter,ordersLoading,editingOrder,orderForm,orderSaving,orderError,actions,openOrderEditor,closeOrderEditor,updateOrderFormField}=useAdminOrders({adminOrders,setAdminOrders,showToast});
  const filteredOrders=filterAdminOrders(adminOrders,orderSearch,orderStatusFilter);
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-base font-extrabold text-slate-900">Order management ({adminOrders.length})</h2><p className="mt-1 text-xs text-slate-500">Review orders, update customer delivery details, or cancel eligible COD orders.</p></div>
        <button type="button" onClick={()=>void actions.refreshOrders()} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold">Refresh orders</button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_190px]">
        <input type="search" value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} placeholder="Search order ID, customer, mobile, email or store…" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"/>
        <select value={orderStatusFilter} onChange={e=>setOrderStatusFilter(e.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">All statuses</option>{['PLACED','ACCEPTED_BY_SELLER','PREPARING','READY_FOR_PICKUP','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'].map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select>
      </div>
      {ordersLoading?<div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">Loading orders…</div>:(
        <div className="grid gap-3 xl:grid-cols-2">
          {filteredOrders.map(order=>(
            <article key={order.orderId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-mono text-xs font-bold text-slate-800">{order.orderId}</p><h3 className="mt-1 text-sm font-extrabold text-slate-900">{order.buyerName||'Customer'}</h3><p className="text-xs text-slate-500">{order.buyerPhone} · {order.buyerEmail}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">{String(order.status||'UNKNOWN').replaceAll('_',' ')}</span></div>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs"><div><span className="text-slate-400">Store</span><p className="font-semibold text-slate-800">{order.sellerName||'—'}</p></div><div><span className="text-slate-400">Total</span><p className="font-bold text-slate-900">₹{Number(order.totalAmount||0).toFixed(2)}</p></div><div><span className="text-slate-400">Payment</span><p className="font-semibold">{order.paymentMethod} · {order.paymentStatus}</p></div><div><span className="text-slate-400">Fulfilment</span><p className="font-semibold">{order.fulfilmentStatus||order.fulfilmentMode||'—'}</p></div></div>
              <div className="mt-3 space-y-1 text-xs text-slate-600"><p>{order.deliveryAddress}, {order.deliveryLocality}</p><p>{(order.items||[]).map((it:any)=>(it.productName||it.title||'Item')+' × '+it.quantity).join(' · ')}</p></div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={()=>openOrderEditor(order)} className="min-h-11 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800"><Pencil className="mr-1 inline h-3.5 w-3.5"/> Update order details</button><button type="button" disabled={String(order.status).toUpperCase()==='CANCELLED'} onClick={()=>void actions.cancelOrder(order)} className="min-h-11 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-40">Cancel order</button></div>
              <details className="mt-3"><summary className="cursor-pointer text-xs font-bold text-purple-700">View item breakdown ({(order.items||[]).length})</summary><div className="mt-2 space-y-1 rounded-xl bg-slate-50 p-3 text-xs">{(order.items||[]).map((it:any)=><div key={it.itemId||it.productId} className="flex justify-between gap-3"><span>{it.productName||it.title||it.productId} × {it.quantity}</span><span>₹{Number(it.totalPrice||0).toFixed(2)}</span></div>)}</div></details>
              <details className="mt-3 rounded-xl border border-slate-200 p-3">
                <summary className="cursor-pointer text-xs font-bold text-slate-800">Advanced order operations</summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button type="button" className="min-h-10 rounded-lg border px-3 text-xs font-bold" onClick={()=>void actions.editItemQuantities(order)}>Edit item quantities</button>
                  <button type="button" className="min-h-10 rounded-lg border px-3 text-xs font-bold" onClick={()=>void actions.viewHistory(order)}>View change history</button>
                  <button type="button" className="min-h-10 rounded-lg border px-3 text-xs font-bold" onClick={()=>void actions.manageNotes(order)}>Internal notes</button>
                  <button type="button" className="min-h-10 rounded-lg border px-3 text-xs font-bold" disabled={String(order.paymentStatus||"").toUpperCase()!=="PAID"} onClick={()=>void actions.requestRefund(order)}>Request refund</button>
                  <button type="button" className="min-h-10 rounded-lg border px-3 text-xs font-bold sm:col-span-2" onClick={()=>void actions.viewRefunds(order)}>View / reconcile refunds</button>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Customer notices are queued for delivery after order changes/refund events. Internal notes remain private.</p>
              </details>
            </article>
          ))}
          {!adminOrders.length&&<div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">No orders found.</div>}
        </div>
      )}
      {editingOrder&&<div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Update order details"><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between"><div><h3 className="text-lg font-black">Update order details</h3><p className="text-xs text-slate-500">{editingOrder.orderId}</p></div><button type="button" onClick={closeOrderEditor} className="rounded-lg border px-3 py-2 text-xs font-bold">Close</button></div>
        <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Updates the order customer and delivery snapshot only. Item quantities, prices, payment records and the saved buyer profile are not changed.</p>
        {orderError&&<p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{orderError}</p>}
        <div className="grid gap-3 sm:grid-cols-2">{(['buyerName','buyerPhone','buyerEmail','deliveryLocality','deliveryAddress'] as const).map(field=><label key={field} className="space-y-1 text-xs font-bold text-slate-700"><span>{({buyerName:'Customer name',buyerPhone:'Mobile number',buyerEmail:'Email',deliveryLocality:'Locality',deliveryAddress:'Delivery address'})[field]}</span><input value={orderForm[field]} onChange={e=>updateOrderFormField(field,e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"/></label>)}</div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={closeOrderEditor} className="min-h-11 rounded-xl border px-4 py-2 text-xs font-bold">Cancel</button><button type="button" disabled={orderSaving} onClick={()=>void actions.saveOrderEdit()} className="min-h-11 rounded-xl bg-purple-700 px-5 py-2 text-xs font-bold text-white disabled:opacity-50">{orderSaving?'Saving…':'Save order details'}</button></div>
      </div></div>}
    </div>
  );
};
