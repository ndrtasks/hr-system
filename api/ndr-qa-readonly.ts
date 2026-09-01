const TARGET='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-qa-readonly-20260901';
export default async function handler(request:any,response:any){
  if(request.method!=='GET')return response.status(405).json({error:'method_not_allowed'});
  const qaKey=String(request.query?.qaKey||'').trim();
  if(!qaKey)return response.status(400).json({error:'missing_key'});
  try{
    const r=await fetch(`${TARGET}?pass=${encodeURIComponent(qaKey)}`,{headers:{'cache-control':'no-store'}});
    const text=await r.text();
    response.status(r.status).setHeader('content-type','application/json; charset=utf-8').setHeader('cache-control','no-store').send(text);
  }catch(e:any){response.status(500).json({error:String(e?.message||e)})}
}
