(()=>{
'use strict';
if(window.__ndrLiveCaseOrderFix)return;window.__ndrLiveCaseOrderFix=true;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function ts(v){const n=Date.parse(v||'');return Number.isFinite(n)?n:0}
function rank(f){return f?.severity==='critical'?4:f?.severity==='high'?3:f?.severity==='medium'?2:1}
function orderFindings(d){
  if(!Array.isArray(d?.findings)||typeof findingKey!=='function'||typeof state==='undefined')return;
  d.findings=d.findings.map((f,i)=>({f,i})).sort((a,b)=>{
    const ak=findingKey(a.f),bk=findingKey(b.f),as=state.seen?.[ak]||{},bs=state.seen?.[bk]||{};
    const aw=a.f.reopened?3:a.f.trend==='new'?2:1,bw=b.f.reopened?3:b.f.trend==='new'?2:1;
    if(bw!==aw)return bw-aw;
    const at=ts(as.firstSeen),bt=ts(bs.firstSeen);if(bt!==at)return bt-at;
    const sr=rank(b.f)-rank(a.f);if(sr)return sr;
    return a.i-b.i;
  }).map(x=>x.f);
}
(async()=>{
  for(let i=0;i<160;i++){if(typeof trackRun==='function'&&typeof state!=='undefined'&&typeof findingKey==='function')break;await sleep(50)}
  if(typeof trackRun!=='function')return;
  const base=trackRun;
  trackRun=function(d){const r=base.apply(this,arguments);try{orderFindings(d)}catch(e){console.warn('NDR case order:',e)}return r};
  if(state?.data){try{orderFindings(state.data);if(typeof renderFindings==='function')renderFindings();if(typeof renderPriorities==='function')renderPriorities(state.data)}catch{}}
})();
})();