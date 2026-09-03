export default async function handler(request:any,response:any){
  if(request.method!=='GET')return response.status(405).json({ok:false});
  const host=String(request.headers?.host||'').trim();
  if(!host)return response.status(400).json({ok:false,message:'host_missing'});
  try{
    const r=await fetch(`https://${host}/api/presentation/gateway/295add81eef0?action=save`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({employeeId:1,attendanceId:null,checkIn:'2026-09-03T07:30',checkOut:'2026-09-03T15:30',reason:'اختبار تكامل NDR قبل العرض'})
    });
    const d=await r.json().catch(()=>({}));
    return response.status(r.status).json({ok:r.ok,action:d.action||'',attendanceId:d.attendanceId||null,message:d.message||''});
  }catch{return response.status(502).json({ok:false,message:'qa_unavailable'});}
}
