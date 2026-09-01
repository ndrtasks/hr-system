(()=>{
'use strict';
if(window.__ndrAuditV3Router)return;window.__ndrAuditV3Router=true;
const V2='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-hr-audit-live-v2';
const V4='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-hr-audit-live-v4';
const previous=window.fetch.bind(window);
window.fetch=(input,init)=>{
  try{
    const url=typeof input==='string'?input:input?.url||'';
    if(url&&url.startsWith(V2)){
      const next=url.replace(V2,V4);
      if(typeof input==='string')return previous(next,init);
      return previous(new Request(next,input),init);
    }
  }catch(e){console.warn('NDR audit v4 router:',e)}
  return previous(input,init);
};
})();