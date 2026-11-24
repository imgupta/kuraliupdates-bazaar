import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAdminDiagnosticsActions} from '../src/features/admin/adminDiagnosticsActions';
const harness=(getAdminDiagnostics:()=>Promise<any>)=>{
 const calls:string[]=[];const diagnostics:any[]=[];const loading:boolean[]=[];const errors:any[]=[];
 const actions=createAdminDiagnosticsActions({api:{getAdminDiagnostics:async()=>{calls.push('getAdminDiagnostics');return getAdminDiagnostics();}},setDiagnostics:v=>diagnostics.push(v),setDiagnosticsLoading:v=>loading.push(v),setDiagnosticsError:v=>errors.push(v)});
 return {actions,calls,diagnostics,loading,errors};
};
test('diagnostics success clears prior error, loads result and resets loading',async()=>{const result={database:{status:'UP'}};const h=harness(async()=>result);await h.actions.refreshDiagnostics();assert.deepEqual(h.calls,['getAdminDiagnostics']);assert.deepEqual(h.diagnostics,[result]);assert.deepEqual(h.loading,[true,false]);assert.deepEqual(h.errors,[null]);});
test('diagnostics failure preserves exact fallback, clears data and resets loading',async()=>{const h=harness(async()=>{throw new Error('');});await h.actions.refreshDiagnostics();assert.deepEqual(h.diagnostics,[null]);assert.deepEqual(h.errors,[null,'Could not load database diagnostics.']);assert.deepEqual(h.loading,[true,false]);});
test('diagnostics failure surfaces server message and clears prior data',async()=>{const h=harness(async()=>{throw new Error('Admin session expired');});await h.actions.refreshDiagnostics();assert.deepEqual(h.errors,[null,'Admin session expired']);assert.deepEqual(h.diagnostics,[null]);});
test('AdminPortal retains root guard and delegates diagnostics to the focused tab',()=>{const portal=readFileSync(new URL('../src/features/admin/AdminPortal.tsx',import.meta.url),'utf8');const tab=readFileSync(new URL('../src/features/admin/AdminDiagnosticsTab.tsx',import.meta.url),'utf8');assert.match(portal,/if \(!isRootAdmin\) \{\s*return \(/);assert.ok(portal.includes("{activeAdminTab === 'diagnostics' && <AdminDiagnosticsTab />}"));assert.ok(!portal.includes('const refreshDiagnostics'));assert.ok(tab.includes('useAdminDiagnostics'));});
