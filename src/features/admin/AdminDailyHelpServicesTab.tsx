import React,{useState} from 'react';
import {Pencil,Plus,Save} from 'lucide-react';
import {adminApi} from '../../services/domains/adminApi';
import {createAdminDailyHelpActions} from './adminDailyHelpActions';
const initialForm={category:'',name:'',description:'',pricingUnit:'HOUR',pricePerHour:'199',minHours:'1',imageUrl:'',active:1};
interface Props{dailyHelpServices:any[];showToast:(message:string,type?:'success'|'info'|'error')=>void;refreshAdminData:()=>Promise<unknown>;}
export const AdminDailyHelpServicesTab:React.FC<Props>=({dailyHelpServices,showToast,refreshAdminData})=>{
 const [dailyHelpForm,setDailyHelpForm]=useState(initialForm);const [editingDailyHelpId,setEditingDailyHelpId]=useState<string|null>(null);
 const actions=createAdminDailyHelpActions({api:adminApi,ui:{toast:showToast,confirm:m=>window.confirm(m)},refreshAdminData,setUpdatingHelperId:()=>{},setDailyHelpForm,setEditingDailyHelpId});
 const resetDailyHelpForm=()=>actions.resetDailyHelpForm();const saveDailyHelpService=()=>actions.saveDailyHelpService(dailyHelpForm,editingDailyHelpId);const editDailyHelpService=(service:any)=>actions.editDailyHelpService(service);
 return (
                  <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div><h2 className="text-base font-extrabold text-slate-900">Daily Help Services</h2><p className="text-xs text-slate-500 mt-1">Services and hourly rates shown to buyers come only from the database.</p></div>
                <button onClick={() => { setEditingDailyHelpId(null); resetDailyHelpForm(); }} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 text-white text-xs font-bold"><Plus className="w-4 h-4" /> Add Service</button>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input value={dailyHelpForm.category} onChange={e => setDailyHelpForm({...dailyHelpForm, category:e.target.value})} placeholder="Category" className="border rounded-xl px-3 py-2.5 text-xs" />
                <input value={dailyHelpForm.name} onChange={e => setDailyHelpForm({...dailyHelpForm, name:e.target.value})} placeholder="Service name" className="border rounded-xl px-3 py-2.5 text-xs" />
                <input value={dailyHelpForm.pricePerHour} onChange={e => setDailyHelpForm({...dailyHelpForm, pricePerHour:e.target.value})} type="number" min="1" placeholder="₹ / hour" className="border rounded-xl px-3 py-2.5 text-xs" />
                <input value={dailyHelpForm.minHours} onChange={e => setDailyHelpForm({...dailyHelpForm, minHours:e.target.value})} type="number" min="1" placeholder="Minimum hours" className="border rounded-xl px-3 py-2.5 text-xs" />
                <input value={dailyHelpForm.description} onChange={e => setDailyHelpForm({...dailyHelpForm, description:e.target.value})} placeholder="Description" className="border rounded-xl px-3 py-2.5 text-xs sm:col-span-2" />
                <input value={dailyHelpForm.imageUrl} onChange={e => setDailyHelpForm({...dailyHelpForm, imageUrl:e.target.value})} placeholder="Image URL (optional)" className="border rounded-xl px-3 py-2.5 text-xs" />
                <label className="flex items-center gap-2 border rounded-xl px-3 py-2.5 text-xs font-bold"><input type="checkbox" checked={dailyHelpForm.active === 1} onChange={e => setDailyHelpForm({...dailyHelpForm, active:e.target.checked ? 1 : 0})} /> Active for buyers</label>
                <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
                  <button onClick={saveDailyHelpService} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"><Save className="w-4 h-4" /> {editingDailyHelpId ? 'Update Service' : 'Save Service'}</button>
                  {editingDailyHelpId && <button onClick={() => { setEditingDailyHelpId(null); resetDailyHelpForm(); }} className="px-4 py-2.5 rounded-xl border text-xs font-bold">Cancel</button>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dailyHelpServices.map(service => (
                  <div key={service.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-4">
                    <div><div className="flex items-center gap-2"><h3 className="font-black text-sm">{service.name}</h3><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${service.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{service.active ? 'Active' : 'Inactive'}</span></div><p className="text-[11px] text-slate-500 mt-1">{service.category} · Min {service.minHours} hr</p><p className="text-lg font-black mt-2">₹{service.pricePerHour}<span className="text-[11px] font-medium text-slate-500"> / hour</span></p><p className="text-xs text-slate-500 mt-1">{service.description || 'No description'}</p></div>
                    <button onClick={() => editDailyHelpService(service)} className="p-2 rounded-lg border text-slate-600 hover:bg-slate-50" title="Edit"><Pencil className="w-4 h-4" /></button>
                  </div>
                ))}
                {dailyHelpServices.length === 0 && <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-500">No Daily Help services in the database. Add the first service above.</div>}
              </div>
            </div>
 );
};
