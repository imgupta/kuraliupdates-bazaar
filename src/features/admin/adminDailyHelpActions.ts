export const createAdminDailyHelpActions=({api,ui,refreshAdminData,setUpdatingHelperId,setDailyHelpForm,setEditingDailyHelpId}:{api:any;ui:{toast:(message:string,type?:'success'|'info'|'error')=>void;confirm:(message:string)=>boolean};refreshAdminData:()=>Promise<unknown>;setUpdatingHelperId:(id:string|null)=>void;setDailyHelpForm:(form:any)=>void;setEditingDailyHelpId:(id:string|null)=>void;})=>({
 resetDailyHelpForm:()=>setDailyHelpForm({category:'',name:'',description:'',pricingUnit:'HOUR',pricePerHour:'199',minHours:'1',imageUrl:'',active:1}),
 editDailyHelpService:(service:any)=>{setEditingDailyHelpId(service.serviceId||service.id);setDailyHelpForm({category:service.category||'',name:service.name||'',description:service.description||'',pricingUnit:service.pricingUnit||'HOUR',pricePerHour:String(service.pricePerHour??''),minHours:String(service.minHours??1),imageUrl:service.imageUrl||'',active:Number(service.active??1)});},
 saveDailyHelpService:async(form:any,editingId:string|null)=>{
  if(!form.category.trim()||!form.name.trim()||Number(form.pricePerHour)<=0){ui.toast('Category, service name and a valid hourly rate are required.','error');return;}
  const payload={...form,category:form.category.trim(),name:form.name.trim(),pricingUnit:form.pricingUnit.trim().toUpperCase(),pricePerHour:Number(form.pricePerHour),minHours:Number(form.minHours),active:Number(form.active)};
  try{const saved=editingId?await api.updateAdminDailyHelpService(editingId,payload):await api.createAdminDailyHelpService(payload);if(!saved){ui.toast('Unable to save Daily Help service.','error');return;}ui.toast(editingId?'Daily Help service updated.':'Daily Help service added.','success');setEditingDailyHelpId(null);setDailyHelpForm({category:'',name:'',description:'',pricingUnit:'HOUR',pricePerHour:'199',minHours:'1',imageUrl:'',active:1});await refreshAdminData();}catch(err:any){ui.toast(err?.message||'Unable to save Daily Help service.','error');}
 },
 toggleAvailability:async(helper:any)=>{
  const nextStatus=String(helper.status).toUpperCase()==='AVAILABLE'?'OFFLINE':'AVAILABLE';setUpdatingHelperId(helper.professionalId);
  try{const updated=await api.updateAdminDailyHelpProfessionalAvailability(helper.professionalId,nextStatus,helper.currentLocality);if(!updated)throw new Error('The server rejected this availability change. Confirm the admin role is authorized for this action.');ui.toast(nextStatus==='AVAILABLE'?'Daily Help professional is now available.':'Daily Help professional is now offline.','success');await refreshAdminData();}catch(error:any){ui.toast(error?.message||'Unable to change Daily Help availability.','error');}finally{setUpdatingHelperId(null);}
 },
 toggleVerification:async(helper:any)=>{
  const nextVerified=!Boolean(helper.verified);if(!nextVerified&&!ui.confirm('Revoke verification? This will set the professional offline.'))return;setUpdatingHelperId(helper.professionalId);
  try{await api.updateAdminDailyHelpProfessionalVerification(helper.professionalId,nextVerified);ui.toast(nextVerified?'Daily Help professional verified.':'Verification revoked; professional set offline.','success');await refreshAdminData();}catch(error:any){ui.toast(error?.message||'Unable to update Daily Help verification.','error');}finally{setUpdatingHelperId(null);}
 },
});
