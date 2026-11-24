export const createAdminDiagnosticsActions=({api,setDiagnostics,setDiagnosticsLoading,setDiagnosticsError}:{api:{getAdminDiagnostics:()=>Promise<any>};setDiagnostics:(value:any)=>void;setDiagnosticsLoading:(value:boolean)=>void;setDiagnosticsError:(value:string|null)=>void;})=>({
 refreshDiagnostics:async()=>{
  setDiagnosticsLoading(true);
  setDiagnosticsError(null);
  try{const result=await api.getAdminDiagnostics();setDiagnostics(result);}
  catch(error:any){setDiagnosticsError(error?.message||'Could not load database diagnostics.');setDiagnostics(null);}
  finally{setDiagnosticsLoading(false);}
 },
});
