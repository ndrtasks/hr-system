export default async function handler(_request:any,response:any){
  try{
    const r=await fetch('https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-odoo-presentation-diagnostic',{redirect:'manual'});
    const text=await r.text();
    response.status(r.status);
    response.setHeader('content-type','application/json; charset=utf-8');
    response.setHeader('cache-control','no-store');
    return response.send(text);
  }catch{
    return response.status(502).json({error:'diagnostic_unavailable'});
  }
}
