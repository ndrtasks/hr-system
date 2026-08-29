(()=>{
'use strict';
if(window.__ndrCustomAuditRoute)return;window.__ndrCustomAuditRoute=true;
const TARGET='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-hr-audit-custom';
const previous=window.fetch.bind(window);
window.fetch=(input,init)=>{
  try{
    const url=typeof input==='string'?input:(input?.url||'');
    if(url.includes('/functions/v1/ndr-hr-audit-v4')||url.includes('/functions/v1/ndr-hr-audit-live')){
      const u=new URL(url,location.href),action=u.searchParams.get('action')||'audit';
      let body={};try{body=init?.body?JSON.parse(String(init.body)):{};}catch{}
      const t=window.NDROdooVault?.token||localStorage.getItem('ndr-connector-token')||'';
      if(t){delete body.connection;body.launchToken=t;}
      return previous(`${TARGET}?action=${encodeURIComponent(action)}`,{...(init||{}),method:'POST',headers:{...((init&&init.headers)||{}),'Content-Type':'application/json'},body:JSON.stringify(body)});
    }
  }catch{}
  return previous(input,init);
};
})();
