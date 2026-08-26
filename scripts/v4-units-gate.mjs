import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
const base='public/ndr-hr-v2/';
const files=['academy-unit-data-1.js','academy-unit-data-2.js','academy-unit-data-3.js','academy-unit-data-4.js'];
const srcs=await Promise.all(files.map(f=>readFile(base+f,'utf8')));
const sandbox={window:{NDR_UNIT_CASES:{}}};vm.createContext(sandbox);
let syntax=true,error='';
try{for(const s of srcs)new vm.Script(s).runInContext(sandbox)}catch(e){syntax=false;error=e.message}
const U=sandbox.window.NDR_UNIT_CASES||{},entries=Object.entries(U);
const tracks=['workforce','recruit','onboard','attendance','relations','payroll','performance','offboard','rewards','talent','gov','policy','experience','analytics'];
const problems=[];
for(const [id,u] of entries){
  const p=[];
  if(!tracks.includes(u.track))p.push('track');
  if(typeof u.name!=='string'||u.name.length<3)p.push('name');
  if(typeof u.case!=='string'||u.case.length<100)p.push('case-depth');
  if(typeof u.wrong!=='string'||u.wrong.length<25)p.push('wrong-action');
  if(!Array.isArray(u.gaps)||u.gaps.length<3||u.gaps.some(x=>String(x).length<20))p.push('gaps');
  if(!Array.isArray(u.legal)||u.legal.length<1||u.legal.some(x=>String(x).length<25))p.push('legal');
  if(typeof u.model!=='string'||u.model.length<80)p.push('model');
  if(typeof u.task!=='string'||u.task.length<35)p.push('task');
  if(!Array.isArray(u.fields)||u.fields.length!==5||u.fields.some(f=>!Array.isArray(f)||f.length<3||String(f[0]).length<2||String(f[1]).length<12||!Array.isArray(f[2])||f[2].length<1))p.push('rubric');
  if((u.case+u.wrong+u.model).includes('نسوي المطلوب ونرفع للمدير'))p.push('generic-fallback');
  if(p.length)problems.push({id,problems:p});
}
const perTrack=Object.fromEntries(tracks.map(t=>[t,entries.filter(([,u])=>u.track===t).length]));
const idsOk=tracks.every(t=>[0,1,2,3].every(i=>U[`${t}-${i}`]));
const checks={syntax,count56:entries.length===56,exactFourPerTrack:tracks.every(t=>perTrack[t]===4),allIds:idsOk,deepContent:problems.length===0};
const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
const report={ok:!failed.length,generatedAt:new Date().toISOString(),checks,failed,error,count:entries.length,perTrack,problems};
await writeFile(base+'units-audit.json',JSON.stringify(report,null,2),'utf8');
console.log(`NDR HR 56-unit gate: ${entries.length}/56 units; tracks=${Object.values(perTrack).filter(x=>x===4).length}/14; content failures=${problems.length}`);
if(failed.length)throw new Error('56-unit gate failed: '+failed.join(', ')+' '+JSON.stringify(problems.slice(0,8))+' '+error);