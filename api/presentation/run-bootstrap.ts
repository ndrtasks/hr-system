export default async function handler(request:any,response:any){
  if(request.method!=='GET')return response.status(404).end();
  try{
    const r=await fetch('https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-presentation-odoo-bootstrap',{method:'GET',headers:{accept:'application/json'}});
    const text=await r.text();
    response.status(r.status).setHeader('cache-control','no-store').setHeader('content-type','application/json; charset=utf-8').send(text);
  }catch{return response.status(502).json({ok:false});}
}
