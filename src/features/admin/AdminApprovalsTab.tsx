import React from 'react';
import { Bike, CheckCircle2, Mail, MapPin, Phone, XCircle } from 'lucide-react';
interface Props { pendingSellerApplications:any[]; adminDeliveryAgents:any[]; onSellerDecision:(sellerId:string,approve:boolean)=>void; onDeliveryDecision:(agentId:string,approve:boolean)=>void; }
export const AdminApprovalsTab:React.FC<Props>=({pendingSellerApplications,adminDeliveryAgents,onSellerDecision,onDeliveryDecision})=>{
 const pendingSellers=pendingSellerApplications;
 const pendingDeliveryAgents=adminDeliveryAgents.filter(a=>String(a.status).toLowerCase()==='pending');
 return (
                  <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900">
                  New Merchant Applications ({pendingSellers.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Stores cannot receive orders or display products until approved by root admin.
                </p>
              </div>
    
              {pendingSellers.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800">All Merchant Applications Processed</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No stores are currently waiting for admin authorization in Kurali.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {pendingSellers.map(seller => (
                    <div
                      key={seller.sellerId}
                      className="bg-white rounded-3xl border border-amber-300 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={seller.avatarUrl}
                          alt={seller.storeName}
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-sm text-slate-900">{seller.name}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              {seller.category}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              Pending Verification
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">{seller.description}</p>
                          <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {seller.address}, {seller.locality}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400" /> {seller.phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-slate-400" /> {seller.email}
                            </span>
                            {seller.gstNumber && (
                              <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                GST: {seller.gstNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
    
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <button
                          onClick={() => handleSellerDecision(seller.sellerId, false)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                        <button
                          onClick={() => handleSellerDecision(seller.sellerId, true)}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Approve &amp; Activate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
    
          {/* Delivery Partner Approvals */}
          {activeAdminTab === 'approvals' && (
            <div className="space-y-4 mt-8">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900">Delivery Partner Applications ({pendingDeliveryAgents.length})</h2>
                <p className="text-xs text-slate-500">Partners remain inactive until approved by root admin.</p>
              </div>
              {pendingDeliveryAgents.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No delivery applications waiting for approval.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {pendingDeliveryAgents.map(agent => (
                    <div key={agent.agentId} className="bg-white rounded-3xl border border-emerald-200 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-sm text-slate-900">{agent.fullName}</h3>
                        <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                          <span><Phone className="inline w-3.5 h-3.5 mr-1" />{agent.phone}</span>
                          <span><Mail className="inline w-3.5 h-3.5 mr-1" />{agent.email}</span>
                          <span><Bike className="inline w-3.5 h-3.5 mr-1" />{agent.vehicleType} · {agent.vehicleNumber}</span>
                          <span>Licence: {agent.licenseNumber}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleDeliveryDecision(agent.agentId, false)} className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center gap-1.5"><XCircle className="w-4 h-4" /> Reject</button>
                        <button onClick={() => handleDeliveryDecision(agent.agentId, true)} className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Approve &amp; Activate</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
 );
};
