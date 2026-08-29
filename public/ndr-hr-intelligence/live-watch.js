(()=>{
'use strict';
const AUDIT='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-hr-audit-live';
const WATCH='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-hr-change-watch';
const POLL_MS=10000,FULL_MS=300000,CACHE_KEY='ndr-live-audit-cache-v4',CACHE_MAX=86400000;
let lastFingerprint='',lastSources={},lastToken='',lastFull=0,auditBusy=false,watchBusy=false,started=false;
const token=()=>window.NDROdooVault?.token||localStorage.getItem('ndr-connector-token')||'';
const baseUrl=()=>String(localStorage.getItem('ndr-odoo-url')||'').replace(/\/$/,'');
function migrateRules(){try{const cfg=JSON.parse(localStorage.getItem('ndr-rule-config')||'{}')||{};cfg.R020={...(cfg.R020||{}),enabled:true};cfg.R003={...(cfg.R003||{}),enabled:true};localStorage.setItem('ndr-rule-config',JSON.stringify(cfg));localStorage.setItem('ndr-r020-live-migrated','3');if(typeof state!=='undefined')state.ruleConfig=cfg}catch{}}
const policy=()=>{try{return{...(JSON.parse(localStorage.getItem('ndr-policy-overrides')||'null')||{}),rules:JSON.parse(localStorage.getItem('ndr-rule-config')||'{}')||{}}}catch{return{rules:{}}}};
const findingSig=d=>{try{return(d?.findings||[]).map(f=>JSON.stringify([f.code,f.severity,f.ref?.model||'',f.ref?.id||'',f.employeeRef?.id||'',f.title||'',f.detail||'',f.facts||[],f.relatedDates||[]])).sort().join('|')}catch{return''}};
const sourceSig=x=>x?`${x.ok?1:0}:${x.count||0}:${x.id||0}:${x.writeDate||''}`:'';
function diffSources(a={},b={}){const keys=new Set([...Object.keys(a||{}),...Object.keys(b||{})]);return[...keys].filter(k=>sourceSig(a?.[k])!==sourceSig(b?.[k]))}
function ready(){return typeof state!=='undefined'&&typeof render==='function'&&typeof trackRun==='function'}
function quietToast(msg){try{if(typeof toast==='function')toast(msg)}catch{}}
function nowText(){try{return new Intl.DateTimeFormat('ar-SA',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())}catch{return''}}
function sourceArabic(x){return({attendance:'الحضور',leaves:'الإجازات',planning:'Planning',employees:'الموظفون',contracts:'العقود',employeeVersions:'نسخ العقود',calendarLines:'جدول الدوام',calendars:'التقويم',companies:'الشركة',calendarLeaves:'العطل الرسمية',leaveTypes:'أنواع الإجازات',departments:'الأقسام',resources:'الموارد'}[x]||x)}
function ensureLiveBadge(){
  if(document.getElementById('ndrLiveState'))return;
  const host=document.querySelector('.topactions');if(!host)return;
  const style=document.createElement('style');style.id='ndrLiveStateStyle';style.textContent='#ndrLiveState{display:inline-flex;align-items:center;gap:7px;min-height:34px;padding:0 11px;border-radius:9px;border:1px solid rgba(103,224,180,.18);background:rgba(13,43,50,.72);font-size:9px;color:#9bb4bd;white-space:nowrap}#ndrLiveState i{width:7px;height:7px;border-radius:50%;background:#67e0b4;box-shadow:0 0 12px rgba(103,224,180,.45)}#ndrLiveState.busy i{background:#f2bf68;box-shadow:0 0 12px rgba(242,191,104,.4)}#ndrLiveState.bad i{background:#ef7f89;box-shadow:0 0 12px rgba(239,127,137,.4)}#ndrLiveState b{color:#dce9ed;font-weight:800}';document.head.appendChild(style);
  const el=document.createElement('span');el.id='ndrLiveState';el.innerHTML='<i></i><span><b>مباشر</b> • جار المزامنة</span>';host.appendChild(el)
}
function liveState(text,kind=''){ensureLiveBadge();const el=document.getElementById('ndrLiveState');if(!el)return;el.className=kind;el.innerHTML=`<i></i><span><b>مباشر</b> • ${text}</span>`}
function persistSnapshot(d){try{localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),baseUrl:baseUrl(),data:d,delta:state.delta||null,hasPrevious:!!state.hasPrevious}))}catch{}}
function restoreSnapshot(){
  try{
    const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(!x?.data?.findings||Date.now()-Number(x.savedAt||0)>CACHE_MAX)return false;
    const current=baseUrl();if(x.baseUrl&&current&&x.baseUrl!==current)return false;
    state.data=x.data;state.demo=x.data.mode==='demo';state.connected=x.data.mode==='live';state.selected?.clear?.();state.page=1;
    if(x.delta)state.delta=x.delta;if(typeof x.hasPrevious==='boolean')state.hasPrevious=x.hasPrevious;
    render();liveState(`آخر نتيجة محفوظة ${new Intl.DateTimeFormat('ar-SA',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit'}).format(new Date(x.savedAt))} • جار التحقق`,'busy');return true
  }catch{return false}
}
async function fetchWatch(t){const r=await fetch(WATCH,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({launchToken:t})}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'تعذر فحص تغييرات Odoo');return d}
async function runAudit(reason='watch',notify=false,changedSources=[]){
  if(auditBusy||!ready())return null;
  const t=token();if(!t){liveState('بانتظار اتصال Odoo','bad');return null}
  auditBusy=true;liveState(changedSources.length?`تحليل تغيير: ${changedSources.map(sourceArabic).join('، ')}`:'جاري تحليل Odoo','busy');
  try{
    const before=findingSig(state.data),r=await fetch(`${AUDIT}?action=audit`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({launchToken:t,policy:policy(),scenario:state.scenario||'standard'})}),d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.message||'تعذر التدقيق التلقائي');
    const after=findingSig(d),findingsChanged=before!==after;
    if(findingsChanged)trackRun(d);
    state.data=d;state.demo=d.mode==='demo';state.connected=d.mode==='live';state.selected?.clear?.();state.page=1;render();lastFull=Date.now();persistSnapshot(d);
    window.dispatchEvent(new CustomEvent('ndr:audit-updated',{detail:{reason,changed:findingsChanged,sourceChanged:changedSources.length>0,changedSources,total:d.summary?.total||0}}));
    liveState(`محدث ${nowText()} • ${Number(d.summary?.total||0)} حالة`);
    if(notify&&findingsChanged)quietToast('NDR التقط التغيير من Odoo وحدث الحالات تلقائيا');
    return d
  }catch(e){console.warn('NDR live audit:',e);liveState('فشل آخر تحليل • إعادة المحاولة تلقائيا','bad');return null}finally{auditBusy=false}
}
async function captureFingerprint(){const t=token();if(!t)return false;try{const d=await fetchWatch(t);lastFingerprint=String(d.fingerprint||'');lastSources=d.sources||{};lastToken=t;return true}catch(e){console.warn('NDR fingerprint sync:',e);return false}}
async function checkChanges(){
  if(watchBusy||document.visibilityState==='hidden')return;
  const t=token();if(!t){liveState('بانتظار اتصال Odoo','bad');return}
  if(t!==lastToken){lastToken=t;lastFingerprint='';lastSources={};lastFull=0}
  watchBusy=true;
  try{
    const d=await fetchWatch(t),fp=String(d.fingerprint||''),sources=d.sources||{};
    if(!lastFingerprint){
      const result=await runAudit('initial',false,Object.keys(sources));
      if(result){lastFingerprint=fp;lastSources=sources}else setTimeout(checkChanges,3000);
      return
    }
    if(fp&&fp!==lastFingerprint){
      const changed=diffSources(lastSources,sources),result=await runAudit('odoo-change',true,changed);
      if(result){lastFingerprint=fp;lastSources=sources}else setTimeout(checkChanges,3000);
      return
    }
    if(Date.now()-lastFull>FULL_MS)await runAudit('periodic',false,[]);else liveState(`متصل • آخر فحص ${nowText()}`)
  }catch(e){console.warn('NDR change watch:',e);liveState('تعذر فحص المصدر • سيعيد المحاولة','bad')}finally{watchBusy=false}
}
async function localWrite(){await new Promise(r=>setTimeout(r,250));const result=await runAudit('ndr-write',true,['attendance']);if(result)setTimeout(captureFingerprint,1200);else setTimeout(checkChanges,3000)}
function start(){
  if(started)return;started=true;migrateRules();ensureLiveBadge();restoreSnapshot();
  const runBtn=document.getElementById('runBtn');if(runBtn){const s=runBtn.querySelector('span');if(s)s.textContent='فحص الآن';runBtn.title='المزامنة تلقائية؛ استخدم هذا الزر فقط إذا أردت فحصا فوريا'}
  window.addEventListener('ndr:attendance-changed',localWrite);
  window.addEventListener('focus',()=>checkChanges());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkChanges()});
  window.addEventListener('online',()=>checkChanges());
  setInterval(checkChanges,POLL_MS);
  setTimeout(async()=>{const result=await runAudit('boot',false,[]);if(result)await captureFingerprint();else setTimeout(checkChanges,1500)},120);
  setTimeout(checkChanges,2500);
  window.NDRLiveWatch={forceCheck:checkChanges,forceAudit:()=>runAudit('manual-live',false,[]),status:()=>({pollMs:POLL_MS,lastFull,lastFingerprint:!!lastFingerprint,lastToken:!!lastToken,cached:!!localStorage.getItem(CACHE_KEY)})}
}
(async function boot(){for(let i=0;i<150;i++){if(ready()){start();return}await new Promise(r=>setTimeout(r,80))}})();
})();