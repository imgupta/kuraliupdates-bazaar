export interface AdminDecisionApi { approveSeller:(id:string)=>Promise<unknown>; rejectSeller:(id:string)=>Promise<unknown>; approveDeliveryAgent:(id:string)=>Promise<unknown>; rejectDeliveryAgent:(id:string)=>Promise<unknown>; }
export interface AdminDecisionUi { toast:(message:string,type?:'success'|'info'|'error')=>void; }
export const createAdminDecisionActions=({api,ui,refreshAdminData}:{api:AdminDecisionApi;ui:AdminDecisionUi;refreshAdminData:()=>Promise<unknown>})=>({
 handleSellerDecision:async(sellerId:string,approve:boolean)=>{
  const ok=approve?await api.approveSeller(sellerId):await api.rejectSeller(sellerId);
  if(!ok){ui.toast('Unable to update seller status in the database.','error');return;}
  ui.toast(approve?'Seller store approved.':'Seller store rejected.',approve?'success':'info');
  await refreshAdminData();
 },
 handleDeliveryDecision:async(agentId:string,approve:boolean)=>{
  const ok=approve?await api.approveDeliveryAgent(agentId):await api.rejectDeliveryAgent(agentId);
  if(!ok){ui.toast('Unable to update delivery partner status in the database.','error');return;}
  ui.toast(approve?'Delivery partner approved.':'Delivery partner rejected.',approve?'success':'info');
  await refreshAdminData();
 },
});
