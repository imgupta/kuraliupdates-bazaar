import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterAdminOrders, formatAdminOrderHistory, formatAdminOrderNotes, formatAdminOrderRefunds, orderToForm, parseOrderQuantity } from '../src/features/admin/adminOrders';
import { createAdminOrderActions } from '../src/features/admin/adminOrderActions';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const harness=(overrides:Record<string,any>={})=>{
  const calls:{name:string;args:any[]}[]=[]; const uiCalls:{name:string;args:any[]}[]=[];
  let currentOrders:any[]=[{orderId:'old-order'}], loading=false, saving=false, error='', editing:any={orderId:'edit-1'};
  const prompts:(string|null)[]=[];
  const api={
    getAdminOrders:async(...args:any[])=>{calls.push({name:'getAdminOrders',args});return [{orderId:'reloaded'}];},
    updateAdminOrder:async(...args:any[])=>{calls.push({name:'updateAdminOrder',args});return {orderId:'updated-order'};},
    cancelAdminOrder:async(...args:any[])=>{calls.push({name:'cancelAdminOrder',args});},
    updateAdminOrderItems:async(...args:any[])=>{calls.push({name:'updateAdminOrderItems',args});return {orderId:'order-1',items:[]};},
    getAdminOrderHistory:async(...args:any[])=>{calls.push({name:'getAdminOrderHistory',args});return [];},
    getAdminOrderNotes:async(...args:any[])=>{calls.push({name:'getAdminOrderNotes',args});return [];},
    addAdminOrderNote:async(...args:any[])=>{calls.push({name:'addAdminOrderNote',args});},
    getAdminOrderRefunds:async(...args:any[])=>{calls.push({name:'getAdminOrderRefunds',args});return [];},
    requestAdminOrderRefund:async(...args:any[])=>{calls.push({name:'requestAdminOrderRefund',args});return {refundId:'refund-123'};},
    markAdminOrderRefundProcessed:async(...args:any[])=>{calls.push({name:'markAdminOrderRefundProcessed',args});},
    ...overrides,
  };
  const ui={prompt:(...args:any[])=>{uiCalls.push({name:'prompt',args});return prompts.shift()??null;},alert:(m:string)=>uiCalls.push({name:'alert',args:[m]}),toast:(m:string,t:string)=>uiCalls.push({name:'toast',args:[m,t]})};
  const form={buyerName:'Buyer',buyerPhone:'123',buyerEmail:'b@example.com',deliveryAddress:'Address',deliveryLocality:'Kurali'};
  let filters={search:'current search',status:'PLACED'};
  const actions=createAdminOrderActions({api,ui,getFilters:()=>filters,setOrders:fn=>{currentOrders=fn(currentOrders);},setLoading:v=>{loading=v;},getEditingOrder:()=>editing,getOrderForm:()=>form,setEditingOrder:v=>{editing=v;},setOrderSaving:v=>{saving=v;},setOrderError:v=>{error=v;}});
  return {actions,calls,uiCalls,prompts,orders:()=>currentOrders,loading:()=>loading,saving:()=>saving,error:()=>error,editing:()=>editing,setFilters:(v:typeof filters)=>{filters=v;}};
};

test('filterAdminOrders applies status and each search field case-insensitively and handles nulls',()=>{
  const rows=[{orderId:'A-1',status:'PLACED',buyerName:'Asha',buyerPhone:'98765',buyerEmail:'asha@example.com',sellerName:'Fresh Mart'},{orderId:'B-2',status:'CANCELLED',buyerName:'Ravi',buyerPhone:null,buyerEmail:null,sellerName:null}];
  assert.deepEqual(filterAdminOrders(rows,'','PLACED'),[rows[0]]);
  for(const term of ['a-1','ASHA','98765','ASHA@EXAMPLE.COM','fresh mart']) assert.deepEqual(filterAdminOrders(rows,term,''),[rows[0]]);
  assert.deepEqual(filterAdminOrders(rows,'ravi','CANCELLED'),[rows[1]]);
  assert.deepEqual(filterAdminOrders(rows,'missing',''),[]);
  assert.deepEqual(filterAdminOrders([{orderId:null,buyerName:null,buyerPhone:null,buyerEmail:null,sellerName:null}],'x',''),[]);
});
test('orderToForm preserves empty fallbacks and quantity parser exact validation',()=>{
  assert.deepEqual(orderToForm({}),{buyerName:'',buyerPhone:'',buyerEmail:'',deliveryAddress:'',deliveryLocality:''});
  assert.equal(parseOrderQuantity('3'),3);
  for(const raw of ['1.5','0','-1']) assert.throws(()=>parseOrderQuantity(raw),{message:'Enter a positive whole-number quantity.'});
});
test('cancel null, empty and whitespace prompt reasons do not call API',async()=>{
  for(const reason of [null,'','   ']) {const h=harness();h.prompts.push(reason);await h.actions.cancelOrder({orderId:'o1'});assert.equal(h.calls.length,0);assert.equal(h.uiCalls.length,0);}
});
test('cancel trims reason, reloads with current filters, then success toast',async()=>{
  const h=harness();h.prompts.push('  duplicate  ');await h.actions.cancelOrder({orderId:'o1'});
  assert.deepEqual(h.calls.map(c=>[c.name,...c.args]),[['cancelAdminOrder','o1','duplicate'],['getAdminOrders','current search','PLACED']]);
  assert.deepEqual(h.uiCalls.at(-1),{name:'toast',args:['Order checkout cancelled and eligible inventory restored.','success']});
});
test('cancel API error uses same fallback error toast',async()=>{
  const h=harness({cancelAdminOrder:async()=>{throw new Error('');}});h.prompts.push('reason');await h.actions.cancelOrder({orderId:'o1'});
  assert.deepEqual(h.uiCalls.at(-1),{name:'toast',args:['Unable to cancel order.','error']});
});
test('quantity prompt cancellation aborts without API or toast',async()=>{
  const h=harness();h.prompts.push(null);await h.actions.editItemQuantities({orderId:'o1',items:[{itemId:'i1',quantity:2}]});assert.equal(h.calls.length,0);assert.equal(h.uiCalls.length,0);
});
test('invalid quantity never updates items and shows exact validation error',async()=>{
  for(const raw of ['1.5','0']) {const h=harness();h.prompts.push(raw);await h.actions.editItemQuantities({orderId:'o1',items:[{itemId:'i1',quantity:2}]});assert.equal(h.calls.some(c=>c.name==='updateAdminOrderItems'),false);assert.deepEqual(h.uiCalls.at(-1),{name:'toast',args:['Enter a positive whole-number quantity.','error']});}
});
test('valid quantity sends item payload and replaces matching orderId',async()=>{
  const h=harness();h.prompts.push('5');await h.actions.editItemQuantities({orderId:'o1',items:[{itemId:'i1',quantity:2}]});
  assert.deepEqual(h.calls.find(c=>c.name==='updateAdminOrderItems')?.args,['o1',[{itemId:'i1',quantity:5}]]);
  assert.deepEqual(h.orders(),[{orderId:'updated-order',items:[]}]);
  assert.deepEqual(h.uiCalls.at(-1),{name:'toast',args:['Quantities, stock and order total recalculated.','success']});
});
test('empty note still fetches and alerts; non-empty note is trimmed before fetch',async()=>{
  const empty=harness();empty.prompts.push('  ');await empty.actions.manageNotes({orderId:'o1'});assert.deepEqual(empty.calls.map(c=>c.name),['getAdminOrderNotes']);assert.deepEqual(empty.uiCalls.at(-1),{name:'alert',args:['No internal notes.']});
  const filled=harness();filled.prompts.push('  private note  ');await filled.actions.manageNotes({orderId:'o1'});assert.deepEqual(filled.calls.map(c=>[c.name,...c.args]),[['addAdminOrderNote','o1','private note'],['getAdminOrderNotes','o1']]);
});
test('empty refund amount aborts; missing reason defaults and success includes refundId',async()=>{
  const empty=harness();empty.prompts.push('');await empty.actions.requestRefund({orderId:'o1'});assert.equal(empty.calls.length,0);
  const h=harness();h.prompts.push('50',null);await h.actions.requestRefund({orderId:'o1'});assert.deepEqual(h.calls.find(c=>c.name==='requestAdminOrderRefund')?.args,['o1','50','Admin refund']);assert.match(h.uiCalls.at(-1).args[0],/refund-123/);
});
test('refund processing uses first REQUESTED refund only and ignores blank provider reference',async()=>{
  const rows=[{REFUND_ID:'first',STATUS:'REQUESTED'},{REFUND_ID:'second',STATUS:'REQUESTED'}];
  const h=harness({getAdminOrderRefunds:async()=>rows});h.prompts.push('  ');await h.actions.viewRefunds({orderId:'o1'});assert.equal(h.calls.some(c=>c.name==='markAdminOrderRefundProcessed'),false);
  const valid=harness({getAdminOrderRefunds:async()=>rows});valid.prompts.push(' ref-1 ');await valid.actions.viewRefunds({orderId:'o1'});assert.deepEqual(valid.calls.find(c=>c.name==='markAdminOrderRefundProcessed')?.args,['o1','first','ref-1']);
});
test('formatters preserve exact history, notes, refunds and empty-state strings',()=>{
  assert.equal(formatAdminOrderHistory([{OCCURRED_AT:123,EVENT_TYPE:'CANCEL',ACTOR_EMAIL:'admin@example.com',DETAILS:'Done'}]),'123 · CANCEL · admin@example.com\nDone');
  assert.equal(formatAdminOrderHistory([]),'No admin history recorded yet.');
  assert.equal(formatAdminOrderNotes([{CREATED_AT:456,CREATED_BY:'admin',NOTE_TEXT:'Private'}]),'456 · admin\nPrivate');
  assert.equal(formatAdminOrderNotes([]),'No internal notes.');
  assert.equal(formatAdminOrderRefunds([{REFUND_ID:'r1',AMOUNT:'10.00',STATUS:'REQUESTED',TRANSACTION_REFERENCE:null}]),'r1 · ₹10.00 · REQUESTED · No reference');
  assert.equal(formatAdminOrderRefunds([]),'No refund requests.');
});
test('save order edit preserves update, list replacement, close, toast and error fallback',async()=>{
  const h=harness();await h.actions.saveOrderEdit();assert.deepEqual(h.calls[0],{name:'updateAdminOrder',args:['edit-1',{buyerName:'Buyer',buyerPhone:'123',buyerEmail:'b@example.com',deliveryAddress:'Address',deliveryLocality:'Kurali'}]});assert.deepEqual(h.orders(),[{orderId:'updated-order'}]);assert.equal(h.editing(),null);assert.equal(h.saving(),false);assert.deepEqual(h.uiCalls.at(-1),{name:'toast',args:['Order details updated.','success']});
  const bad=harness({updateAdminOrder:async()=>{throw new Error('');}});await bad.actions.saveOrderEdit();assert.equal(bad.error(),'Unable to update order details.');assert.equal(bad.saving(),false);
});
test('AdminPortal delegates orders tab; page has no order editor state or order API calls',()=>{
  const portal=read('../src/features/admin/AdminPortal.tsx');const tab=read('../src/features/admin/AdminOrdersTab.tsx');const hook=read('../src/features/admin/useAdminOrders.ts');const actionSource=read('../src/features/admin/adminOrderActions.ts');
  assert.match(portal,/<AdminOrdersTab[\s\S]*adminOrders=\{adminOrders\}[\s\S]*setAdminOrders=\{setAdminOrders\}/);
  assert.doesNotMatch(portal,/const \[(orderSearch|orderStatusFilter|ordersLoading|editingOrder|orderForm|orderSaving|orderError),/);
  assert.doesNotMatch(portal,/adminApi\.(getAdminOrders|updateAdminOrder|cancelAdminOrder|updateAdminOrderItems|getAdminOrderHistory|getAdminOrderNotes|addAdminOrderNote|getAdminOrderRefunds|requestAdminOrderRefund|markAdminOrderRefundProcessed)\(/);
  assert.match(hook,/api:adminApi/);assert.match(actionSource,/api\.updateAdminOrderItems\(/);assert.ok(tab.includes('No orders found.'));
});
