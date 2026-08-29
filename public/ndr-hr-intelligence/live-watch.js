(()=>{
'use strict';
const AUDIT='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-hr-audit-live';
const WATCH='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-hr-change-watch';
const POLL_MS=10000,FULL_MS=300000;
let lastFingerprint='',lastSources={},lastToken='',lastFull=0,auditBusy=false,watchBusy=false,started=false;
const token=()=>window.NDROdooVault?.token||localStorage.getItem('ndr-connector-token')||'';
function migrateRules(){try{if(localStorage.getItem('ndr-r020-live-migrated')==='1')return;const cfg=JSON.parse(localStorage.getItem('ndr-rule-config')||'{}')||{};cfg.R020={...(cfg.R020||{}),enabled:true};localStorage.setItem('ndr-rule-config',JSON.stringify(cfg));localStorage.setItem('ndr-r020-live-migrated','1');if(typeof state!=='undefined')state.ruleConfig=cfg}catch{}}
const policy=()=>{try{return{...(JSON.parse(localStorage.getItem('ndr-policy-overrides')||'null')||{}),rules:JSON.parse(localStorage.getItem('ndr-rule-config')||'{}')||{}}}catch{return{rules:{}}}};
const findingSig=d=>{try{return(d?.findings||[]).map(f=>`${f.code}:${f.ref?.model||''}:${f.ref?.id||''}:${f.employeeRef?.id||''}`).sort().join('|')}catch{return''}};
const sourceSig=x=>x?`${x.ok?1:0}:${x.count||0}:${x.id||0}:${x.writeDate||''}`:'';
function diffSources(a={},b={}){const keys=new Set([...Object.keys(a||{}),...Object.keys(b||{})]);return[...keys].filter(k=>sourceSig(a?.[k])!==sourceSig(b?.[k]))}
function ready(){return typeof state!=='undefined'&&typeof render==='function'&&typeof trackRun==='function'}
function quietToast(msg){try{if(typeof toast==='function')toast(msg)}catch{}}
async function fetchWatch(t){const r=await fetch(WATCH,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({launchToken:t})}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'تعذر فحص تغييرات Odoo');return d}
async function runAudit(reason='watch',notify=false,changedSources=[]){
  if(auditBusy||!ready())return null;
  const t=token();if(!t)return null;
  auditBusy=true;
  try{
    const before=findingSig(state.data),r=await fetch(`${AUDIT}?action=audit`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({launchToken:t,policy:policy(),scenario:state.scenario||'standard'})}),d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.message||'تعذر التدقيق التلقائي');
    const after=findingSig(d),findingsChanged=before!==after;
    if(findingsChanged)trackRun(d);
    state.data=d;state.demo=d.mode==='demo';state.connected=d.mode==='live';state.selected?.clear?.();state.page=1;render();lastFull=Date.now();
    window.dispatchEvent(new CustomEvent('ndr:audit-updated',{detail:{reason,changed:findingsChanged,sourceChanged:changedSources.length>0,changedSources,total:d.summary?.total||0}}));
    if(notify&&findingsChanged)quietToast('NDR التقط تغييرا جديدا من Odoo وتم تحديث الحالات تلقائيا');
    return d
  }catch(e){console.warn('NDR live audit:',e);return null}finally{auditBusy=false}
}
async function captureFingerprint(){const t=token();if(!t)return;try{const d=await fetchWatch(t);lastFingerprint=String(d.fingerprint||'');lastSources=d.sources||{};lastToken=t}catch(e){console.warn('NDR fingerprint sync:',e)}}
async function checkChanges(){
  if(watchBusy||document.visibilityState==='hidden')return;
  const t=token();if(!t)return;
  if(t!==lastToken){lastToken=t;lastFingerprint='';lastSources={};lastFull=0}
  watchBusy=true;
  try{
    const d=await fetchWatch(t),fp=String(d.fingerprint||''),sources=d.sources||{};
    if(!lastFingerprint){lastFingerprint=fp;lastSources=sources;await runAudit('initial',false,Object.keys(sources));return}
    if(fp&&fp!==lastFingerprint){const changed=diffSources(lastSources,sources);lastFingerprint=fp;lastSources=sources;await runAudit('odoo-change',true,changed);return}
    if(Date.now()-lastFull>FULL_MS)await runAudit('periodic',false,[])
  }catch(e){console.warn('NDR change watch:',e)}finally{watchBusy=false}
}
async function localWrite(){await new Promise(r=>setTimeout(r,250));await runAudit('ndr-write',true,['attendance']);setTimeout(captureFingerprint,1200)}
function start(){
  if(started)return;started=true;migrateRules();
  window.addEventListener('ndr:attendance-changed',localWrite);
  window.addEventListener('focus',()=>checkChanges());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkChanges()});
  window.addEventListener('online',()=>checkChanges());
  setInterval(checkChanges,POLL_MS);
  setTimeout(checkChanges,500);
  window.NDRLiveWatch={forceCheck:checkChanges,forceAudit:()=>runAudit('manual-live',false,[]),status:()=>({pollMs:POLL_MS,lastFull,lastFingerprint:!!lastFingerprint,lastToken:!!lastToken})}
}
(async function boot(){for(let i=0;i<150;i++){if(ready()){start();return}await new Promise(r=>setTimeout(r,80))}})();
})();