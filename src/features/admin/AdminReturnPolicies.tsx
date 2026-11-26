import React,{useCallback,useEffect,useState} from 'react';
import {adminApi} from '../../services/domains/adminApi';
export const AdminReturnPolicies:React.FC=()=>{
 const [rows,setRows]=useState<any[]>([]),[category,setCategory]=useState(''),[days,setDays]=useState('0'),[returnable,setReturnable]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const load=useCallback(async()=>{try{setError('');setRows(await adminApi.getReturnPolicies());}catch(e:any){setError(e.message||'Unable to load return policies');}},[]);
 useEffect(()=>{void load();},[load]);
 const save=async()=>{setBusy(true);setError('');setSuccess('');try{const saved=await adminApi.updateReturnPolicy({category:category.trim()||'*',returnable,returnWindowDays:Number(days)});setRows(old=>[...old.filter(x=>String(x.category).toUpperCase()!==String(saved.category).toUpperCase()),saved].sort((a,b)=>String(a.category).localeCompare(String(b.category))));setCategory('');setSuccess('Return policy saved and audited.');}catch(e:any){setError(e.message||'Unable to save policy');}finally{setBusy(false);}};
 return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
  <div><h2 className="text-lg font-black text-slate-900">Returns policy configuration</h2><p className="mt-1 text-xs text-slate-500">Root-admin controls. A category-specific rule overrides the global * default. Policy changes are audited.</p></div>
  {error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}{success&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">{success}</p>}
  <div className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
   <label className="text-xs font-bold text-slate-700">Policy key (* = default, category, or PRODUCT:{'<productId>'})<input value={category} onChange={e=>setCategory(e.target.value)} placeholder="e.g. GROCERY or PRODUCT:ABC123" className="mt-1 w-full rounded-lg border bg-white p-2.5 text-sm"/></label>
   <label className="text-xs font-bold text-slate-700">Return window (calendar days)<input type="number" min="0" max="90" value={days} onChange={e=>setDays(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2.5 text-sm"/></label>
   <label className="flex items-center gap-2 text-xs font-bold text-slate-700 sm:col-span-2"><input type="checkbox" checked={returnable} onChange={e=>setReturnable(e.target.checked)}/> Allow item returns for this category</label>
   <button disabled={busy} onClick={()=>void save()} className="rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white disabled:opacity-50 sm:col-span-2">{busy?'Saving…':'Save return policy'}</button>
  </div>
  <div className="space-y-2">{rows.map(r=><div key={r.category} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"><div><p className="text-sm font-bold">{r.category==='*'?'Default policy':r.category}</p><p className="text-xs text-slate-500">{Number(r.returnable)===1?'Returns allowed':'Returns disabled'} · {r.returnWindowDays} day(s)</p></div><button onClick={()=>{setCategory(r.category==='*'?'':r.category);setDays(String(r.returnWindowDays));setReturnable(Number(r.returnable)===1);}} className="rounded-lg border px-3 py-2 text-xs font-bold">Edit</button></div>)}</div>
  <p className="text-[10px] text-slate-500">Global default is non-returnable. Add rules only for eligible categories; PRODUCT:{'<productId>'} creates an individual product exception. Product rules override category rules, which override the global default. Existing delivered orders are backfilled using their prior UPDATED_AT timestamp as an approximation; new deliveries record DELIVERED_AT directly.</p>
 </section>;
};
