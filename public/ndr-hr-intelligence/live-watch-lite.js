(()=>{
'use strict';
if(window.__ndrLiveWatchLite)return;window.__ndrLiveWatchLite=true;
const WATCH='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-hr-change-watch';
const CORE_MS=20000,SECONDARY_MS=60000;
let busy=false,coreFp='',secondaryFp='',secondaryAt=0,lastAuditAt=0;
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
function changedSources(prev={},next={}){const keys=new Set([...Object.keys(prev||{}),...Object.keys(next||{})]);return [...keys].filter(k=>JSON.stringify(prev?.[k]||null)!==JSON.stringify(next?.[k]||null));}
let coreSources={},secondarySources={};
async function audit(reason,sources=[]){
  if(typeof runAudit!=='function')return;
  badge(sources.length?`تحليل ${sources.map(srcAr).join('، ')}`:'تحديث البيانات','busy');
  await runAudit(true);
  lastAuditAt=Date.now();
  window.dispatchEvent(new CustomEvent('ndr:audit-updated',{detail:{reason,sourceChanged:sources.length>0,changedSources:sources,changed:true,total:state?.data?.summary?.total||0}}));
  badge(`محدث الآن • ${Number(state?.data?.summary?.total||0).toLocaleString('ar-SA')} حالة`);
}
async function tick(){
  if(busy||document.visibilityState==='hidden')return;
  const t=token();if(!t){badge('بانتظار اتصال Odoo','bad');return}
  busy=true;
  try{
    const c=await watch('core');
    if(c?.stable===false){badge('Odoo مشغول • إعادة المحاولة','busy');return}
    const fp=String(c?.fingerprint||'');
    if(!coreFp){coreFp=fp;coreSources=c?.sources||{}}
    else if(fp&&fp!==coreFp){const sources=changedSources(coreSources,c?.sources||{});coreFp=fp;coreSources=c?.sources||{};await audit('core-change',sources)}
    if(Date.now()-secondaryAt>=SECONDARY_MS){
      const s=await watch('secondary');secondaryAt=Date.now();
      if(s?.stable!==false){const sfp=String(s?.fingerprint||'');if(!secondaryFp){secondaryFp=sfp;secondarySources=s?.sources||{}}else if(sfp&&sfp!==secondaryFp){const sources=changedSources(secondarySources,s?.sources||{});secondaryFp=sfp;secondarySources=s?.sources||{};await audit('secondary-change',sources)}}
    }
    if(Date.now()-lastAuditAt>300000&&state?.data)lastAuditAt=Date.now();
    if(!busy)badge('متصل');
  }catch(e){console.warn('NDR lite watch:',e);badge('سيعيد المحاولة تلقائيا','bad')}
  finally{busy=false}
}
async function boot(){
  for(let i=0;i<100;i++){if(typeof runAudit==='function'&&typeof state!=='undefined'&&token()&&(window.NDROdooVault?.active||localStorage.getItem('ndr-odoo-url')))break;await sleep(100)}
  badge('جاري التحقق','busy');
  try{if(!state?.data)await audit('boot',[])}catch{}
  try{const c=await watch('core');coreFp=String(c?.fingerprint||'');coreSources=c?.sources||{}}catch{}
  setInterval(tick,CORE_MS);
  window.addEventListener('focus',tick);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tick()});
  window.NDRLiveWatch={forceCheck:tick,forceAudit:()=>audit('manual',[]),status:()=>({mode:'lite',pollMs:CORE_MS,secondaryMs:SECONDARY_MS,lastAuditAt})};
}
boot();
})();