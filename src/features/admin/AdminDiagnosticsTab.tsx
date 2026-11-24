import React from 'react';
import {AlertTriangle,CheckCircle2,RefreshCw} from 'lucide-react';
import {useAdminDiagnostics} from './useAdminDiagnostics';
export const AdminDiagnosticsTab:React.FC=()=>{
 const {diagnostics,diagnosticsLoading,diagnosticsError,refreshDiagnostics}=useAdminDiagnostics();
 return (
                  <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Database Diagnostics</h2>
                  <p className="text-xs text-slate-500 mt-1">Read-only checks using the application's Oracle connection. No records are modified.</p>
                </div>
                <button onClick={() => void refreshDiagnostics()} disabled={diagnosticsLoading} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 text-white text-xs font-bold disabled:opacity-50">
                  <RefreshCw className={`w-4 h-4 ${diagnosticsLoading ? 'animate-spin' : ''}`} /> Refresh checks
                </button>
              </div>
    
              {diagnosticsError && (
                <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  <strong>Diagnostics unavailable.</strong> {diagnosticsError}
                  <p className="text-xs mt-1">Confirm you are signed in with a valid admin session, then refresh.</p>
                </div>
              )}
              {diagnosticsLoading && !diagnostics && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Reading database diagnostics…</div>
              )}
    
              {diagnostics && (
                <>
                  <div className={`rounded-2xl border p-4 flex items-start gap-3 ${diagnostics.database?.status === 'UP' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                    {diagnostics.database?.status === 'UP' ? <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5" />}
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">Database: {diagnostics.database?.status || 'UNKNOWN'}</p>
                      <p className="text-xs text-slate-600 mt-1">Connected schema: {diagnostics.database?.schema || 'Unknown'} · Checked: {diagnostics.checkedAt ? new Date(diagnostics.checkedAt).toLocaleString() : 'Unknown'}</p>
                      <p className="text-xs text-slate-500 mt-1">Response is read-only; it does not run cleanup or repair migrations.</p>
                    </div>
                  </div>
    
                  <div className={`rounded-2xl border p-4 ${diagnostics.migrations?.v13Status === 'SUCCESS' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                    <div className="flex items-start gap-3">
                      {diagnostics.migrations?.v13Status === 'SUCCESS' ? <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5" />}
                      <div className="flex-1">
                        <p className="text-sm font-extrabold text-slate-900">Staging reset migration (V13): {diagnostics.migrations?.v13Status || 'UNKNOWN'}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {diagnostics.migrations?.v13Status === 'SUCCESS'
                            ? 'Flyway records V13 as successful. Review the counts below; migration success alone does not prove every table is empty.'
                            : 'Reset completion is not confirmed. Do not run V13 again from this screen; investigate the migration history before any cleanup.'}
                        </p>
                        {diagnostics.migrations?.historyStatus !== 'OK' && <p className="text-xs font-bold text-amber-800 mt-1">Flyway history could not be read.</p>}
                      </div>
                    </div>
                  </div>
    
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 mb-2">Table row counts</h3>
                    <p className="text-xs text-slate-500 mb-3">Admin accounts and the Daily Help service catalogue may intentionally remain after a staging reset.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(diagnostics.tableCounts || {}).map(([key, value]: [string, any]) => (
                        <div key={key} className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-600">{key.replace(/([A-Z])/g, ' $1').replace(/^./, t => t.toUpperCase())}</span>
                          <span className={`text-sm font-black ${value.status === 'OK' ? 'text-slate-900' : 'text-rose-700'}`}>
                            {value.status === 'OK' ? Number(value.count).toLocaleString() : 'Unavailable'}
                          </span>
                        </div>
                      ))}
                    </div>
                    {Array.isArray(diagnostics.tableCountErrors) && diagnostics.tableCountErrors.length > 0 && (
                      <p className="text-xs text-rose-700 mt-3">Some table counts could not be read: {diagnostics.tableCountErrors.join(', ')}. Treat overall reset verification as incomplete.</p>
                    )}
                  </div>
    
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-extrabold text-slate-900 mb-2">Latest Flyway migrations</h3>
                    {diagnostics.migrations?.latest?.length ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead><tr className="border-b text-slate-500"><th className="py-2 pr-3">Version</th><th className="py-2 pr-3">Migration</th><th className="py-2 pr-3">Result</th><th className="py-2">Installed</th></tr></thead>
                          <tbody>
                            {diagnostics.migrations.latest.map((item: any, index: number) => (
                              <tr key={`${item.version || 'repeat'}-${index}`} className="border-b last:border-0">
                                <td className="py-2 pr-3">{item.version || '—'}</td>
                                <td className="py-2 pr-3">{item.description || '—'}</td>
                                <td className={`py-2 pr-3 font-bold ${item.success ? 'text-emerald-700' : 'text-rose-700'}`}>{item.success ? 'Success' : 'Failed'}</td>
                                <td className="py-2 whitespace-nowrap">{item.installedOn ? new Date(item.installedOn).toLocaleString() : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <p className="text-xs text-slate-500">Flyway history is unavailable.</p>}
                  </div>
    
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    Signed-in admin account record: <strong>{diagnostics.identityCheck?.currentAdminAccountPresent === true ? 'Present (expected for admin access)' : diagnostics.identityCheck?.currentAdminAccountPresent === false ? 'Not found' : 'Unknown'}</strong>. The diagnostic intentionally does not show the account email or any personal record values.
                  </div>
                </>
              )}
            </div>
 );
};
