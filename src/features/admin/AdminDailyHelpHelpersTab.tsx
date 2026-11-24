import React,{useState} from 'react';
import {CheckCircle2,UserRoundCheck} from 'lucide-react';
import {adminApi} from '../../services/domains/adminApi';
import {createAdminDailyHelpActions} from './adminDailyHelpActions';
interface Props{dailyHelpHelpers:any[];showToast:(message:string,type?:'success'|'info'|'error')=>void;refreshAdminData:()=>Promise<unknown>;}
export const AdminDailyHelpHelpersTab:React.FC<Props>=({dailyHelpHelpers,showToast,refreshAdminData})=>{
 const [updatingHelperId,setUpdatingHelperId]=useState<string|null>(null);
 const actions=createAdminDailyHelpActions({api:adminApi,ui:{toast:showToast,confirm:m=>window.confirm(m)},refreshAdminData,setUpdatingHelperId,setDailyHelpForm:()=>{},setEditingDailyHelpId:()=>{}});
 return (
                  <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Daily Help Helpers</h2>
                  <p className="text-xs text-slate-500 mt-1">All registered home-service professionals. Availability and verification status are read directly from the database.</p>
                </div>
                <div className="flex gap-2 text-[11px] font-bold">
                  <span className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700">Available {dailyHelpHelpers.filter(h => Boolean(h.verified) && String(h.status).toUpperCase() === 'AVAILABLE').length}</span>
                  <span className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600">Offline {dailyHelpHelpers.filter(h => String(h.status).toUpperCase() === 'OFFLINE').length}</span>
                  <span className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700">Verified {dailyHelpHelpers.filter(h => h.verified).length}</span>
                </div>
              </div>
    
              {dailyHelpHelpers.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                  <UserRoundCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-bold text-sm text-slate-700">No Daily Help helpers registered yet.</p>
                  <p className="text-xs text-slate-500 mt-1">Helpers will appear here after they register for Daily Help.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-[10px] uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-3 font-bold">Helper</th>
                          <th className="px-4 py-3 font-bold">Contact</th>
                          <th className="px-4 py-3 font-bold">Locality</th>
                          <th className="px-4 py-3 font-bold">Availability</th>
                          <th className="px-4 py-3 font-bold">Rating</th>
                          <th className="px-4 py-3 font-bold">Verification</th>
                          <th className="px-4 py-3 font-bold">Registered</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dailyHelpHelpers.map(helper => (
                          <tr key={helper.professionalId} className="hover:bg-slate-50">
                            <td className="px-4 py-4">
                              <div className="font-extrabold text-xs text-slate-900">{helper.fullName}</div>
                              <div className="font-mono text-[10px] text-slate-400 mt-1">{helper.professionalId}</div>
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-600">{helper.phone}</td>
                            <td className="px-4 py-4 text-xs text-slate-600">{helper.currentLocality || '—'}</td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col items-start gap-2">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${String(helper.status).toUpperCase() === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{helper.status}</span>
                                <button type="button" disabled={updatingHelperId === helper.professionalId || (!helper.verified && String(helper.status).toUpperCase() !== 'AVAILABLE')}
                                  onClick={() => void actions.toggleAvailability(helper)}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-700 disabled:opacity-50">
                                  {updatingHelperId === helper.professionalId ? 'Updating…' : !helper.verified && String(helper.status).toUpperCase() !== 'AVAILABLE' ? 'Verify before availability' : String(helper.status).toUpperCase() === 'AVAILABLE' ? 'Set offline' : 'Set available'}
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-xs font-bold">★ {helper.rating || '0.00'} <span className="text-slate-400 font-normal">({helper.reviewCount || 0})</span></td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col items-start gap-2">
                                {helper.verified ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span> : <span className="text-[10px] font-bold text-rose-600">Not verified</span>}
                                <button type="button" disabled={updatingHelperId === helper.professionalId}
                                  onClick={() => void actions.toggleVerification(helper)}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-700 disabled:opacity-50">
                                  {updatingHelperId === helper.professionalId ? 'Updating…' : helper.verified ? 'Revoke verification' : 'Approve professional'}
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-[11px] text-slate-500">{helper.registeredAt ? new Date(helper.registeredAt).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
 );
};
