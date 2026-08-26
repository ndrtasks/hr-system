const LIST_URL='https://laws-gateway.moj.gov.sa/apis/legislations/v1/Judgements/judgements-list';
export default async function handler(req,res){
 try{
  const page=Number(req.query.page||1), courtTypes=req.query.courtTypes==null?'':String(req.query.courtTypes);
  const payload={pageNumber:page,pageSize:12,viewType:'grid',sortingBy:2};
  if(courtTypes!=='') payload.courtTypes=Number(courtTypes);
  const r=await fetch(LIST_URL,{method:'POST',headers:{'content-type':'application/json;charset=UTF-8','user-agent':'Mozilla/5.0'},body:JSON.stringify(payload)});
  const text=await r.text();
  res.status(r.status).setHeader('content-type','application/json; charset=utf-8').send(text);
 }catch(e){res.status(500).json({ok:false,error:String(e?.message||e)})}
}
