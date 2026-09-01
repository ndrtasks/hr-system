const UPSTREAM='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-presentation-gateway';

export default async function handler(request:any,response:any){
  const raw=request.query?.service;
  const service=Array.isArray(raw)?String(raw[0]||''):String(raw||'');
  if(!/^[a-f0-9]{12}$/.test(service))return response.status(404).json({message:'not_found'});
  if(!['GET','POST','OPTIONS'].includes(String(request.method||'GET').toUpperCase()))return response.status(405).json({message:'method_not_allowed'});
  if(request.method==='OPTIONS')return response.status(204).end();
  const qs=new URLSearchParams();
  qs.set('s',service);
  for(const [k,v] of Object.entries(request.query||{})){
    if(k==='service')continue;
    if(Array.isArray(v))v.forEach(x=>qs.append(k,String(x)));else if(v!==undefined&&v!==null)qs.append(k,String(v));
  }
  const body=request.method==='GET'?undefined:(typeof request.body==='string'?request.body:JSON.stringify(request.body??{}));
  try{
    const upstream=await fetch(`${UPSTREAM}?${qs.toString()}`,{method:request.method==='GET'?'GET':'POST',headers:{'content-type':'application/json','accept':'application/json'},body,redirect:'manual'});
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
