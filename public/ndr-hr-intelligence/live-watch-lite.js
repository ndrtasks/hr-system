(()=>{
'use strict';
if(window.__ndrLiveWatchLite)return;window.__ndrLiveWatchLite=true;
const WATCH='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-hr-change-watch';
const CORE_MS=20000,SECONDARY_MS=60000,FALLBACK_AUDIT_MS=300000;
let busy=false,coreFp='',secondaryFp='',secondaryAt=0,lastAuditAt=0,bootAuditDone=false;
const token=()=>window.NDROdooVault?.token||localStorage.getItem('ndr-connector-token')||'';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const srcAr=x=>({attendance:'الحضور',leaves:'الإجازات',planning:'جدول الدوام',employees:'الموظفون',employeeVersions:'العقود',contracts:'العقود',calendarLines:'أوقات العمل',calendarLeaves:'العطل',calendars:'التقويم',departments:'الأقسام',resources:'Planning'}[x]||x);
function badge(text,kind=''){
  let el=document.getElementById('ndrLiveState');
  if(!el){const host=document.querySelector('.topactions');if(!host)return;el=document.createElement('span');el.id='ndrLiveState';host.appendChild(el)}
  el.className=kind;el.innerHTML=`<i></i><span><b>مباشر</b> • ${text}</span>`;
}
async function watch(profile){
  const t=token();if(!t)return null;
  const r=await fetch(WATCH,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({launchToken:t,profile})});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'تعذر فحص التغييرات');return d;
}
function sourceSig(x){return `${x?.model||''}:${x?.id||0}:${x?.writeDate||''}`}
function changedSources(prev={},next={}){const keys=new Set([...Object.keys(prev||{}),...Object.keys(next||{})]);return [...keys].filter(k=>sourceSig(prev?.[k])!==sourceSig(next?.[k]));}
function detailsFor(keys,prev,next){return (keys||[]).map(key=>({key,before:prev?.[key]||null,after:next?.[key]||null}));}
let coreSources={},secondarySources={};
async function observedAuditRun(){
  const previousFetch=window.fetch;
  let seen=false,ok=false,status=0;
  const wrapped=async(input,init)=>{
    const url=typeof input==='string'?input:input?.url||'';
    const response=await previousFetch(input,init);
    if((url.includes('/ndr-hr-audit-v4')||url.includes('/ndr-hr-audit-live')||url.includes('/ndr-hr-audit-vault'))&&url.includes('action=audit')){
      seen=true;ok=!!response?.ok;status=Number(response?.status||0);
    }
    return response;
  };
  window.fetch=wrapped;
  try{await runAudit(true);}finally{if(window.fetch===wrapped)window.fetch=previousFetch;}
  return{seen,ok,status};
}
async function audit(reason,sources=[],changedDetails=[]){
  if(typeof runAudit!=='function'||window.__ndrAttendanceActive)return false;
  badge(sources.length?`تحليل ${sources.map(srcAr).join('، ')}`:'تحديث البيانات','busy');
  const observed=await observedAuditRun();
  const after=state?.data;
  const succeeded=!!after&&observed.seen&&observed.ok;
  if(!succeeded){
    badge('تعذر التحديث • سيعيد المحاولة','bad');
    throw new Error(observed.seen?`لم يكتمل التدقيق الحي (${observed.status||'network'})`:'لم يبدأ طلب التدقيق الحي');
  }
  bootAuditDone=true;lastAuditAt=Date.now();
  window.dispatchEvent(new CustomEvent('ndr:audit-updated',{detail:{reason,sourceChanged:sources.length>0,changedSources:sources,changedDetails,changed:true,total:after?.summary?.total||0}}));
  badge(`محدث الآن • ${Number(after?.summary?.total||0).toLocaleString('ar-SA')} حالة`);
  return true;
}
async function tick(){
  if(busy||document.visibilityState==='hidden'||window.__ndrAttendanceActive)return;
  const t=token();if(!t){badge('بانتظار اتصال Odoo','bad');return}
  if(!window.NDROdooVault?.active&&!window.__ndrVaultFetchEnabled){badge('جاري تفعيل اتصال Odoo','busy');return}
  busy=true;
  try{
    if(!state?.data&&!bootAuditDone)await audit('restore-after-refresh',[]);
    const c=await watch('core');
    if(c?.stable===false){badge('Odoo مشغول • إعادة المحاولة','busy');return}
    const fp=String(c?.fingerprint||'');
    if(!coreFp){coreFp=fp;coreSources=c?.sources||{}}
    else if(fp&&fp!==coreFp){
      const nextSources=c?.sources||{},sources=changedSources(coreSources,nextSources),changedDetails=detailsFor(sources,coreSources,nextSources);
      await audit('core-change',sources,changedDetails);
      coreFp=fp;coreSources=nextSources;
    }

    if(Date.now()-secondaryAt>=SECONDARY_MS){
      const s=await watch('secondary');
      if(s?.stable===false){badge('Odoo مشغول • إعادة المحاولة','busy')}
      else{
        const sfp=String(s?.fingerprint||''),nextSources=s?.sources||{};
        if(!secondaryFp){secondaryFp=sfp;secondarySources=nextSources}
        else if(sfp&&sfp!==secondaryFp){
          const sources=changedSources(secondarySources,nextSources),changedDetails=detailsFor(sources,secondarySources,nextSources);
          await audit('secondary-change',sources,changedDetails);
          secondaryFp=sfp;secondarySources=nextSources;
        }
        secondaryAt=Date.now();
      }
    }

    if(state?.data&&lastAuditAt&&Date.now()-lastAuditAt>=FALLBACK_AUDIT_MS)await audit('periodic-refresh',[]);
    else if(state?.data)badge(`محدث • ${Number(state.data?.summary?.total||0).toLocaleString('ar-SA')} حالة`);
  }catch(e){console.warn('NDR lite watch:',e);badge('سيعيد المحاولة تلقائيا','bad')}
  finally{busy=false}
}
async function boot(){
  badge('جاري تفعيل اتصال Odoo','busy');
  for(let i=0;i<150;i++){
    const ready=typeof runAudit==='function'&&typeof state!=='undefined'&&token()&&(window.NDROdooVault?.active===true||window.__ndrVaultFetchEnabled===true);
    if(ready)break;
    await sleep(100);
  }
  if(!token()){badge('بانتظار اتصال Odoo','bad');setInterval(tick,CORE_MS);return}
  try{if(!state?.data&&!window.__ndrAttendanceActive)await audit('boot',[])}catch{}
  try{if(!window.__ndrAttendanceActive){const c=await watch('core');if(c?.stable!==false){coreFp=String(c?.fingerprint||'');coreSources=c?.sources||{}}}}catch{}
  if(state?.data&&!lastAuditAt){lastAuditAt=Date.now();bootAuditDone=true;badge(`محدث • ${Number(state.data?.summary?.total||0).toLocaleString('ar-SA')} حالة`);}
  setInterval(tick,CORE_MS);
  window.addEventListener('focus',tick);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tick()});
  window.addEventListener('ndr:attendance-view',e=>{if(e?.detail?.active)badge('الحضور مفتوح • المراقبة مؤقتا متوقفة','busy');else setTimeout(tick,500)});
  window.addEventListener('ndr:odoo-vault-ready',()=>{if(!state?.data)setTimeout(tick,100)});
  window.NDRLiveWatch={forceCheck:tick,forceAudit:()=>audit('manual',[]),status:()=>({mode:'lite',pollMs:CORE_MS,secondaryMs:SECONDARY_MS,fallbackAuditMs:FALLBACK_AUDIT_MS,lastAuditAt,attendancePaused:!!window.__ndrAttendanceActive})};
}
boot();
})();