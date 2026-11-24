import React from 'react';
import { Bike } from 'lucide-react';
interface Props { adminDeliveryAgents:any[]; }
export const AdminFleetTab:React.FC<Props>=({adminDeliveryAgents})=>{
 return (
                  <div className="space-y-4">
              <h2 className="text-base font-extrabold text-slate-900">
                Registered Kurali Express Delivery Fleet ({adminDeliveryAgents.length})
              </h2>
    
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {adminDeliveryAgents.map(agent => (
                  <div
                    key={agent.agentId}
                    className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={agent.avatarUrl}
                        alt={agent.fullName}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                      />
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900">{agent.fullName}</h3>
                        <p className="text-[11px] text-slate-500">{agent.phone}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Vehicle</span>
                        <span className="font-bold text-slate-800">{agent.vehicleType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Plate</span>
                        <span className="font-bold font-mono text-slate-800">{agent.vehicleNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Completed Trips</span>
                        <span className="font-bold text-emerald-600">{agent.totalTrips}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Total Earned</span>
                        <span className="font-bold text-slate-900">₹{agent.totalEarnings}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
 );
};
