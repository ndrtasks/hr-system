(()=>{
'use strict';
const AUDIT='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-hr-audit-live';
const WATCH='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-hr-change-watch';
const POLL_MS=10000, FULL_MS=300000;
let lastFingerprint='',lastFull=0,auditBusy=false,watchBusy=false,started=false;
const token=()=>window.NDROdooVault?.token||localStorage.getItem('ndr-connector-token')||'';
function migrateRules(){try{if(localStorage.getItem('ndr-r020-live-migrated')==='1')return;const cfg=JSON.parse(localStorage.getItem('ndr-rule-config')||'{}')||{};cfg.R020={...(cfg.R020||{}),enabled:true};localStorage.setItem('ndr-rule-config',JSON.stringify(cfg));localStorage.setItem('ndr-r020-live-migrated','1');if(typeof state!=='undefined')state.ruleConfig=cfg}catch{}}
const policy=()=>{try{return{...(JSON.parse(localStorage.getItem('ndr-policy-overrides')||'null')||{}),rules:JSON.parse(localStorage.getItem('ndr-rule-config')||'{}')||{}}}catch{return{rules:{}}}};
const findingSig=d=>{try{return(d?.findings||[]).map(f=>`${f.code}:${f.ref?.model||''}:${f.ref?.id||''}:${f.employeeRef?.id||''}`).sort().join('|')}catch{return''}};
function ready(){return typeof state!=='undefined'&&typeof render==='function'&&typeof trackRun==='function'}
function quietToast(msg){try{if(typeof toast==='function')toast(msg)}catch{}}
async function runAudit(reason='watch',notify=false){
  if(auditBusy||!ready())return;
  const t=token();if(!t)return;
  auditBusy=true;
  try{
    const before=findingSig(state.data),r=await fetch(`${AUDIT}?action=audit`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({launchToken:t,policy:policy(),scenario:state.scenario||'standard'})}),d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.message||'تعذر التدقيق التلقائي');
    const after=findingSig(d),changed=before!==after;
    if(changed)trackRun(d);
    state.data=d;state.demo=d.mode==='demo';state.connected=d.mode==='live';state.selected?.clear?.();state.page=1;render();lastFull=Date.now();
    window.dispatchEvent(new CustomEvent('ndr:audit-updated',{detail:{reason,changed,total:d.summary?.total||0}}));
    if(notify&&changed)quietToast('NDR التقط تغييرا جديدا من Odoo وتم تحديث الحالات تلقائيا');
  }catch(e){console.warn('NDR live audit:',e)}finally{auditBusy=false}
}
async function checkChanges(){
  if(watchBusy||document.visibilityState==='hidden')return;
  const t=token();if(!t)return;
  watchBusy=true;
  try{
    const r=await fetch(WATCH,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({launchToken:t})}),d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.message||'تعذر فحص التغييرات');
    const fp=String(d.fingerprint||'');
    if(!lastFingerprint){lastFingerprint=fp;if(!state?.data)await runAudit('initial',false)}
    else if(fp&&fp!==lastFingerprint){lastFingerprint=fp;await runAudit('odoo-change',true)}
    else if(Date.now()-lastFull>FULL_MS){await runAudit('periodic',false)}
  }catch(e){console.warn('NDR change watch:',e)}finally{watchBusy=false}
}
function start(){if(started)return;started=true;migrateRules();window.addEventListener('ndr:attendance-changed',()=>setTimeout(()=>runAudit('attendance-write',true),250));window.addEventListener('focus',()=>checkChanges());document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkChanges()});setInterval(checkChanges,POLL_MS);setTimeout(checkChanges,700)}
(async function boot(){for(let i=0;i<150;i++){if(ready()){start();return}await new Promise(r=>setTimeout(r,80))}})();
})();