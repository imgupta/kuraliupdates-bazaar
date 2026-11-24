import {useState} from 'react';
import {adminApi} from '../../services/domains/adminApi';
import {createAdminAccountActions} from './adminAccountActions';
interface Options {showToast:(message:string,type?:'success'|'info'|'error')=>void;refreshAdminData:()=>Promise<any>;}
export const useAdminAccounts=({showToast,refreshAdminData}:Options)=>{
 const [accountSearch,setAccountSearch]=useState('');const [accountActionId,setAccountActionId]=useState<string|null>(null);const [accountAuditUserId,setAccountAuditUserId]=useState<string|null>(null);const [accountAuditEntries,setAccountAuditEntries]=useState<any[]>([]);
 const actions=createAdminAccountActions({api:adminApi,ui:{prompt:m=>window.prompt(m),confirm:m=>window.confirm(m),toast:(m,t)=>showToast(m,t)},refreshAdminData,setAccountActionId,setAccountAuditEntries,setAccountAuditUserId});
 return {accountSearch,setAccountSearch,accountActionId,accountAuditUserId,setAccountAuditUserId,accountAuditEntries,...actions};
};