export default async function handler(request:any,response:any){
 if(request.method!=='GET')return response.status(405).json({ok:false});
 const host=String(request.headers?.host||'');
 try{
  const r=await fetch(`https://${host}/api/presentation/gateway/6aafc621fa98`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  const d=await r.json().catch(()=>({}));
  const app=(d.findings||[]).filter((f:any)=>f.code==='R024');
  const rule=(d.rules||[]).find((x:any)=>x.code==='R024')||null;
  return response.status(r.status).json({ok:r.ok,total:d.summary?.total||0,appraisalCount:app.length,appraisals:app.map((f:any)=>({title:f.title,employee:f.employee,detail:f.detail,facts:f.facts,ref:f.ref})),rule,coverage:d.coverage?.appraisals??null,monitoring:d.monitoring?.appraisalDateRule===true});
 }catch(e:any){return response.status(502).json({ok:false,message:String(e?.message||e)})}
}