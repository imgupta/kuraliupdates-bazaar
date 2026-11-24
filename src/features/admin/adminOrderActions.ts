import { formatAdminOrderHistory, formatAdminOrderNotes, formatAdminOrderRefunds, parseOrderQuantity, type AdminOrderForm } from './adminOrders';
interface AdminOrderApi {
  getAdminOrders: (search?: string, status?: string) => Promise<any[]>;
  updateAdminOrder: (orderId: string, form: AdminOrderForm) => Promise<any>;
  cancelAdminOrder: (orderId: string, reason: string) => Promise<any>;
  updateAdminOrderItems: (orderId: string, items: Array<{itemId:string;quantity:number}>) => Promise<any>;
  getAdminOrderHistory: (orderId: string) => Promise<any[]>;
  getAdminOrderNotes: (orderId: string) => Promise<any[]>;
  addAdminOrderNote: (orderId: string, note: string) => Promise<any>;
  getAdminOrderRefunds: (orderId: string) => Promise<any[]>;
  requestAdminOrderRefund: (orderId: string, amount: string, reason: string) => Promise<any>;
  markAdminOrderRefundProcessed: (orderId: string, refundId: string, reference: string) => Promise<any>;
}
interface AdminOrderUi {
  prompt: (message: string, defaultValue?: string) => string | null;
  alert: (message: string) => void;
  toast: (message: string, type: 'success' | 'error') => void;
}
interface Options {
  api: AdminOrderApi; ui: AdminOrderUi; getFilters: () => {search:string;status:string};
  setOrders: (updater: (orders:any[]) => any[]) => void; setLoading: (loading:boolean) => void;
  getEditingOrder: () => any | null; getOrderForm: () => AdminOrderForm;
  setEditingOrder: (order:any|null) => void; setOrderSaving: (saving:boolean) => void; setOrderError: (error:string) => void;
}
export const createAdminOrderActions = ({api,ui,getFilters,setOrders,setLoading,getEditingOrder,getOrderForm,setEditingOrder,setOrderSaving,setOrderError}:Options) => ({
  refreshOrders: async () => {
    setLoading(true);
    try {
      const {search,status}=getFilters();
      const rows=await api.getAdminOrders(search,status);
      setOrders(()=>rows);
    } catch(e:any) { ui.toast(e?.message||'Unable to refresh orders.','error'); }
    finally { setLoading(false); }
  },
  cancelOrder: async (order:any) => {
    const reason=ui.prompt('Reason for cancellation (required):');
    if(!reason?.trim()) return;
    try {
      await api.cancelAdminOrder(order.orderId,reason.trim());
      const {search,status}=getFilters();
      const rows=await api.getAdminOrders(search,status);
      setOrders(()=>rows);
      ui.toast('Order checkout cancelled and eligible inventory restored.','success');
    } catch(e:any) { ui.toast(e?.message||'Unable to cancel order.','error'); }
  },
  editItemQuantities: async (order:any) => {
    try {
      const items=[];
      for(const it of (order.items||[])) {
        const raw=ui.prompt(`New quantity for ${it.productName||it.title||it.productId}`,String(it.quantity));
        if(raw===null) return;
        const quantity=parseOrderQuantity(raw);
        items.push({itemId:it.itemId,quantity});
      }
      const updated=await api.updateAdminOrderItems(order.orderId,items);
      setOrders(current=>current.map(o=>o.orderId===updated.orderId?updated:o));
      ui.toast('Quantities, stock and order total recalculated.','success');
    } catch(e:any) { ui.toast(e?.message||'Unable to update quantities.','error'); }
  },
  viewHistory: async (order:any) => {
    try { const rows=await api.getAdminOrderHistory(order.orderId); ui.alert(formatAdminOrderHistory(rows)); }
    catch(e:any) { ui.toast(e?.message||"Unable to load history.",'error'); }
  },
  manageNotes: async (order:any) => {
    try {
      const note=ui.prompt("Add internal support note (not visible to customer):");
      if(note?.trim()) await api.addAdminOrderNote(order.orderId,note.trim());
      const all=await api.getAdminOrderNotes(order.orderId);
      ui.alert(formatAdminOrderNotes(all));
    } catch(e:any) { ui.toast(e?.message||"Unable to save or load notes.",'error'); }
  },
  requestRefund: async (order:any) => {
    try {
      const amount=ui.prompt("Refund amount (INR):");
      if(!amount) return;
      const reason=ui.prompt("Refund reason:")||"Admin refund";
      const result=await api.requestAdminOrderRefund(order.orderId,amount,reason);
      ui.toast("Refund request recorded: "+result.refundId+". Process payment externally and record its reference.",'success');
    } catch(e:any) { ui.toast(e?.message||"Refund request failed.",'error'); }
  },
  viewRefunds: async (order:any) => {
    try {
      const rows=await api.getAdminOrderRefunds(order.orderId);
      if(!rows.length) { ui.alert("No refund requests."); return; }
      ui.alert(formatAdminOrderRefunds(rows));
      const pending=rows.find((r:any)=>r.STATUS==="REQUESTED");
      if(pending) {
        const ref=ui.prompt("Enter actual payment-provider transaction reference to mark refund processed:");
        if(ref?.trim()) {
          await api.markAdminOrderRefundProcessed(order.orderId,pending.REFUND_ID,ref.trim());
          ui.toast("Refund marked processed with provider reference.",'success');
        }
      }
    } catch(e:any) { ui.toast(e?.message||"Unable to reconcile refunds.",'error'); }
  },
  saveOrderEdit: async () => {
    const editingOrder=getEditingOrder();
    if(!editingOrder) return;
    setOrderSaving(true); setOrderError('');
    try {
      const updated=await api.updateAdminOrder(editingOrder.orderId,getOrderForm());
      setOrders(current=>current.map(o=>o.orderId===updated.orderId?updated:o));
      setEditingOrder(null);
      ui.toast('Order details updated.','success');
    } catch(e:any) { setOrderError(e?.message||'Unable to update order details.'); }
    finally { setOrderSaving(false); }
  },
});
