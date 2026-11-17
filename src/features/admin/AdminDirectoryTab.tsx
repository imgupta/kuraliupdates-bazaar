import React, { useMemo, useState } from 'react';
import { Copy, Search } from 'lucide-react';
import { filterAdminDirectoryGroups, type AdminDirectoryGroup } from './adminDirectory';

interface AdminDirectoryTabProps { groups: AdminDirectoryGroup[]; onCopy: (value: string) => void | Promise<void>; }

export const AdminDirectoryTab: React.FC<AdminDirectoryTabProps> = ({ groups, onCopy }) => {
  const [search, setSearch] = useState('');
  const filteredGroups = useMemo(() => filterAdminDirectoryGroups(groups, search), [groups, search]);
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div><h2 className="text-base font-extrabold text-slate-900">User-wise Role & ID Directory</h2><p className="text-xs text-slate-500 mt-1">Search using the registered email address to find that account and view/copy all known user, role, profile, product, and service IDs grouped under it. Unowned/system records remain separate. Read-only and admin-only.</p></div>
        <div className="relative w-full sm:w-80"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input aria-label="Search by email, user, role or ID" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by email address or user / profile ID…" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" /></div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs">
        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide"><tr><th className="px-4 py-3 font-bold">User / Contact</th><th className="px-4 py-3 font-bold">User ID</th><th className="px-4 py-3 font-bold">Roles & Related IDs</th><th className="px-4 py-3 font-bold">Statuses</th><th className="px-4 py-3 font-bold">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {filteredGroups.map(group => <tr key={group.key} className="align-top hover:bg-slate-50">
            <td className="px-4 py-3"><div className="font-bold text-slate-800">{group.name || '—'}</div><div className="mt-1 text-slate-500">{group.contact || '—'}</div><div className="mt-1 text-[10px] text-slate-400">{group.entries.length} role/record{group.entries.length === 1 ? '' : 's'}</div></td>
            <td className="px-4 py-3 font-mono text-slate-700">{group.userId !== '—' ? <button type="button" onClick={() => void onCopy(String(group.userId))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 hover:bg-slate-100">{group.userId}<Copy className="w-3 h-3" /></button> : '—'}</td>
            <td className="px-4 py-3"><div className="space-y-2">{group.entries.map((item, index) => <div key={item.role + '-' + item.profileId + '-' + index} className="rounded-lg border border-slate-100 bg-white p-2">
              <div><span className="inline-flex rounded-md bg-purple-50 px-2 py-1 font-bold text-purple-800">{item.role}</span></div><div className="mt-1 text-slate-600">{item.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-slate-900"><span>{item.role === 'ROOT_ADMIN' ? 'Admin ID' : item.role === 'PRODUCT_FIXTURE' ? 'Product ID' : item.role === 'DAILY_HELP_SERVICE' ? 'Service ID' : 'Profile ID'}: {item.profileId}</span>{item.profileId && item.profileId !== '—' && <button type="button" aria-label={'Copy ' + item.role + ' ID'} onClick={() => void onCopy(String(item.profileId))} className="inline-flex items-center gap-1 rounded border border-slate-200 px-1.5 py-1 font-sans text-[10px] font-bold text-slate-600 hover:bg-slate-100"><Copy className="w-3 h-3" /> Copy</button>}</div>
              {item.contact && item.contact !== group.contact && <div className="mt-1 text-[10px] text-slate-500">{item.contact}</div>}
            </div>)}</div></td>
            <td className="px-4 py-3 text-slate-600">{group.statuses.join(', ') || 'UNKNOWN'}</td>
            <td className="px-4 py-3"><div className="flex flex-col items-start gap-2">{group.userId !== '—' && <button type="button" onClick={() => void onCopy(String(group.userId))} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-700 hover:bg-slate-100"><Copy className="w-3.5 h-3.5" /> Copy User ID</button>}
              <button type="button" onClick={() => void onCopy(['Email / Contact: ' + (group.contact || '—'), 'User ID: ' + (group.userId || '—'), ...(group.statuses.includes('ACCOUNT_LINK_MISSING') ? ['WARNING: One or more provider profiles have no linked user account; review before merging.'] : []), ...group.entries.map(item => item.role + ' ID: ' + item.profileId + (item.contact && item.contact !== group.contact ? ' | ' + item.contact : ''))].join('\n'))} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-700 hover:bg-slate-100"><Copy className="w-3.5 h-3.5" /> Copy all IDs</button>
            </div></td>
          </tr>)}
          {filteredGroups.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No users or IDs match this search.</td></tr>}
        </tbody></table></div>
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-[11px] text-slate-500">Showing {filteredGroups.length} of {groups.length} user groups / unowned records. Product IDs are attached to a seller's user group when the seller-user relationship is present in the API data. Missing IDs are shown as — and are never guessed. ACCOUNT_LINK_MISSING flags provider profiles that need ownership review.</div>
      </div>
    </div>
  );
};
