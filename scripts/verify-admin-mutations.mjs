import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root=process.cwd();
const files=['src/features/admin/AdminPortal.tsx','src/features/admin/adminDailyHelpActions.ts','src/features/admin/AdminDailyHelpHelpersTab.tsx','src/features/admin/adminAccountActions.ts','tests/adminAccounts.test.ts','tests/adminDailyHelp.test.ts'];
const mutations=[
['root-admin guard','src/features/admin/AdminPortal.tsx','if (!isRootAdmin) {','if (isRootAdmin) {','tests/adminAccounts.test.ts'],
['verification revoke confirmation','src/features/admin/adminDailyHelpActions.ts',"if(!nextVerified&&!ui.confirm('Revoke verification? This will set the professional offline.'))return;",'','tests/adminDailyHelp.test.ts'],
['availability falsy-result rejection','src/features/admin/adminDailyHelpActions.ts',"if(!updated)throw new Error('The server rejected this availability change. Confirm the admin role is authorized for this action.');",'','tests/adminDailyHelp.test.ts'],
['Daily Help service-save validation','src/features/admin/adminDailyHelpActions.ts',"if(!form.category.trim()||!form.name.trim()||Number(form.pricePerHour)<=0){ui.toast('Category, service name and a valid hourly rate are required.','error');return;}",'','tests/adminDailyHelp.test.ts']];
function copy(dest){for(const f of files){const to=join(dest,f);mkdirSync(resolve(to,'..'),{recursive:true});cpSync(join(root,f),to);}}
function replace(source,before,after){const i=source.indexOf(before);if(i<0||source.indexOf(before,i+before.length)>=0)throw Error('Mutation anchor missing or duplicated: '+before);return source.slice(0,i)+after+source.slice(i+before.length);}
function run(cwd,tests){return spawnSync(process.execPath,['--import','tsx','--test',...tests],{cwd,encoding:'utf8',timeout:120000});}
const temp=mkdtempSync(join(root,'.admin-mutation-check-'));
try{
 const baseDir=join(temp,'baseline');mkdirSync(baseDir);copy(baseDir);
 const baseResult=run(baseDir,['tests/adminAccounts.test.ts','tests/adminDailyHelp.test.ts']);
 if(baseResult.status!==0){process.stderr.write(baseResult.stdout||'');process.stderr.write(baseResult.stderr||'');throw Error('Baseline admin tests failed.');}
 console.log('PASS: baseline admin suites.');
 for(const [name,file,before,after,testFile] of mutations){
  const dir=join(temp,name.replace(/[^a-z0-9]+/gi,'-'));mkdirSync(dir);copy(dir);
  const target=join(dir,file);writeFileSync(target,replace(readFileSync(target,'utf8'),before,after));
  const result=run(dir,[testFile]);
  if(result.status===0){process.stderr.write(result.stdout||'');throw Error('MUTATION SURVIVED: '+name);}
  console.log('PASS: detected mutation — '+name);
 }
 console.log('PASS: all four required mutations detected.');
}finally{rmSync(temp,{recursive:true,force:true});}
