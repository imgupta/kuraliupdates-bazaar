import React from 'react';
import { useAdminAccounts } from './useAdminAccounts';
interface Props { adminAccounts:any[]; userEmail:string | undefined; showToast:(message:string,type?:'success'|'info'|'error')=>void; refreshAdminData:()=>Promise<any>; }
export const AdminAccountsTab:React.FC<Props> =({adminAccounts,userEmail,showToast,refreshAdminData})=>{
 const {accountSearch,setAccountSearch,accountActionId,accountAuditUserId,setAccountAuditUserId,accountAuditEntries,handleAccountStatus,handleRevokeSessions,handleAccountAudit}=useAdminAccounts({showToast,refreshAdminData});
 return (
                  <div className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-base font-extrabold text-amber-950">Account & Permissions Control Center</h2>
              <p className="mt-1 text-xs leading-5 text-amber-900">Manage the underlying account across Buyer, Seller, Daily Help and Delivery roles. Suspension/revocation is enforced by the backend and invalidates active sessions. Role/profile records and order history are retained for audit and dispute handling.</p>
            </div>
            {accountAuditUserId && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div><h3 className="font-extrabold text-sm text-slate-900">Account audit history</h3><p className="text-xs text-slate-500">{accountAuditUserId}</p></div>
                  <button type="button" onClick={() => setAccountAuditUserId(null)} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Close</button>
                </div>
                {accountAuditEntries.length === 0 ? <p className="text-xs text-slate-500">No admin actions recorded for this account.</p> : (
                  <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500"><tr><th className="p-2">Time</th><th className="p-2">Action</th><th className="p-2">Change</th><th className="p-2">Admin</th><th className="p-2">Reason</th></tr></thead>
                    <tbody className="divide-y">{accountAuditEntries.map((entry: any) => <tr key={entry.auditId || entry.audit_id}><td className="p-2">{String(entry.occurredAt || entry.OCCURRED_AT || '—')}</td><td className="p-2">{entry.action || entry.ACTION}</td><td className="p-2">{entry.previousStatus || entry.PREVIOUS_STATUS || '—'} → {entry.newStatus || entry.NEW_STATUS || '—'}</td><td className="p-2">{entry.actorEmail || entry.ACTOR_EMAIL || entry.actorUserId || '—'}</td><td className="p-2">{entry.reason || entry.REASON || '—'}</td></tr>)}</tbody>
                  </table></div>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div><h3 className="text-sm font-extrabold text-slate-900">Marketplace accounts ({adminAccounts.length})</h3><p className="text-xs text-slate-500 mt-1">Search by name, email, phone, user ID, or role.</p></div>
              <input type="search" aria-label="Search marketplace accounts" value={accountSearch} onChange={event => setAccountSearch(event.target.value)} placeholder="Search accounts…" className="w-full sm:w-80 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide"><tr><th className="px-3 py-3">Account</th><th className="px-3 py-3">Roles</th><th className="px-3 py-3">Account status</th><th className="px-3 py-3">Reason / updated</th><th className="px-3 py-3">Admin controls</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {adminAccounts.filter((account: any) => [account.userId, account.name, account.email, account.phone, account.locality, ...(account.roles || [])].some(value => String(value ?? '').toLowerCase().includes(accountSearch.trim().toLowerCase()))).map((account: any) => {
                    const status = String(account.accountStatus || 'ACTIVE').toUpperCase();
                    const isProtected = String(account.email || '').toLowerCase() === String(userEmail || '').toLowerCase()
                      || ['shubham.gupta180296@gmail.com', 'sg7508359237@gmail.com', 'admin@kuraliupdates.com'].includes(String(account.email || '').toLowerCase());
                    return <tr key={account.userId} className="align-top hover:bg-slate-50">
                      <td className="px-3 py-3"><div className="font-bold text-slate-900">{account.name || '—'}</div><div className="mt-1 text-slate-600">{account.email || '—'}</div><div className="mt-1 text-slate-600">{account.phone || '—'}</div><div className="mt-1 font-mono text-[10px] text-slate-400">{account.userId}</div><div className="mt-1 text-[10px] text-slate-500">{account.locality || '—'}</div></td>
                      <td className="px-3 py-3"><div className="flex flex-wrap gap-1">{(account.roles || []).map((role: string) => <span key={role} className="rounded-md bg-purple-50 px-2 py-1 font-bold text-purple-800">{role}</span>)}</div></td>
                      <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : status === 'SUSPENDED' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{status}</span><div className="mt-2 text-[10px] text-slate-500">Last login: {account.lastLogin ? new Date(account.lastLogin).toLocaleString() : '—'}</div></td>
                      <td className="px-3 py-3 max-w-xs"><div className="whitespace-normal text-slate-700">{account.statusReason || '—'}</div><div className="mt-1 text-[10px] text-slate-400">{account.statusUpdatedAt ? new Date(account.statusUpdatedAt).toLocaleString() : 'No status change'}</div></td>
                      <td className="px-3 py-3"><div className="flex max-w-[320px] flex-wrap gap-2">
                        {status === 'ACTIVE' ? <>
                          <button type="button" disabled={isProtected || accountActionId === account.userId} onClick={() => void handleAccountStatus(account, 'SUSPENDED')} className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 font-bold text-amber-900 disabled:opacity-40">{accountActionId === account.userId ? 'Working…' : 'Suspend'}</button>
                          <button type="button" disabled={isProtected || accountActionId === account.userId} onClick={() => void handleAccountStatus(account, 'REVOKED')} className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 font-bold text-rose-900 disabled:opacity-40">Revoke access</button>
                        </> : <button type="button" disabled={isProtected || accountActionId === account.userId} onClick={() => void handleAccountStatus(account, 'ACTIVE')} className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 font-bold text-emerald-900 disabled:opacity-40">Re-enable</button>}
                        <button type="button" disabled={isProtected || accountActionId === account.userId} onClick={() => void handleRevokeSessions(account)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-bold text-slate-700 disabled:opacity-40">Revoke sessions</button>
                        <button type="button" onClick={() => void handleAccountAudit(account)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-bold text-slate-700">Audit history</button>
                      </div>{isProtected && <p className="mt-2 text-[10px] text-slate-500">Protected administrator account.</p>}</td>
                    </tr>;
                  })}
                </tbody>
              </table></div>
              <div className="border-t border-slate-100 bg-slate-50 px-3 py-3 text-[11px] text-slate-500">Account status applies to the linked identity and all marketplace roles. Re-enabling restores access but does not restore revoked sessions. Permanent account deletion is intentionally excluded so order, payment, booking and dispute records remain auditable.</div>
            </div>
          </div>
 );
};