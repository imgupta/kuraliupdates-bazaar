import {useCallback,useEffect,useState} from 'react';
import {adminApi} from '../../services/domains/adminApi';
import {createAdminDiagnosticsActions} from './adminDiagnosticsActions';
export const useAdminDiagnostics=()=>{
 const [diagnostics,setDiagnostics]=useState<any|null>(null);
 const [diagnosticsLoading,setDiagnosticsLoading]=useState(false);
 const [diagnosticsError,setDiagnosticsError]=useState<string|null>(null);
 const refreshDiagnostics=useCallback(()=>createAdminDiagnosticsActions({api:adminApi,setDiagnostics,setDiagnosticsLoading,setDiagnosticsError}).refreshDiagnostics(),[]);
 useEffect(()=>{void refreshDiagnostics();},[refreshDiagnostics]);
 return {diagnostics,diagnosticsLoading,diagnosticsError,refreshDiagnostics};
};
