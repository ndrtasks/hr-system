const ORIGIN='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1';
const ALLOWED=new Set([
  'ndr-odoo-connector','ndr-hr-audit-v4','ndr-hr-audit-vault','ndr-hr-audit-nav','ndr-hr-audit-schedule',
  'ndr-hr-audit-live','ndr-hr-audit-live-v2','ndr-hr-audit-live-v3','ndr-hr-audit-live-v4','ndr-hr-change-watch',
  'ndr-attendance-register','ndr-attendance-bulk','ndr-odoo-app-installer','ndr-odoo-attendance-inspect','ndr-hr-audit-custom'
]);

export default async function handler(request:any,response:any){
  const raw=request.query?.service;
  const service=Array.isArray(raw)?String(raw[0]||''):String(raw||'');
  if(!ALLOWED.has(service))return response.status(404).json({message:'not_found'});
  if(!['GET','POST','OPTIONS'].includes(String(request.method||'GET').toUpperCase()))return response.status(405).json({message:'method_not_allowed'});
  if(request.method==='OPTIONS')return response.status(204).end();
  const qs=new URLSearchParams();
  for(const [k,v] of Object.entries(request.query||{})){
    if(k==='service')continue;
    if(Array.isArray(v))v.forEach(x=>qs.append(k,String(x)));else if(v!==undefined&&v!==null)qs.append(k,String(v));
  }
  const target=`${ORIGIN}/${encodeURIComponent(service)}${qs.toString()?`?${qs}`:''}`;
  const headers:any={'content-type':'application/json','accept':'application/json'};
  const body=request.method==='GET'?undefined:(typeof request.body==='string'?request.body:JSON.stringify(request.body??{}));
  try{
    const upstream=await fetch(target,{method:request.method,headers,body,redirect:'manual'});
    const text=await upstream.text();
    response.status(upstream.status);
    response.setHeader('content-type',upstream.headers.get('content-type')||'application/json; charset=utf-8');
    response.setHeader('cache-control','no-store');
    response.setHeader('x-robots-tag','noindex, nofollow, noarchive');
    return response.send(text);
  }catch{
    return response.status(502).json({message:'تعذر تنفيذ العملية'});
  }
}
