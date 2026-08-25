const UPSTREAM='https://ndr-ref-audit.vercel.app/api/data?name=OCC';
let cache=null,at=0;
export default async function handler(req,res){
  try{
    res.setHeader('Cache-Control','s-maxage=86400, stale-while-revalidate=604800');
    if(cache && Date.now()-at<86400000) return res.status(200).json({ok:true,count:cache.length,data:cache,source:'cached'});
    const r=await fetch(UPSTREAM,{headers:{accept:'application/json'}});
    if(!r.ok) throw new Error('upstream '+r.status);
    const j=await r.json();
    if(!Array.isArray(j.data)||j.data.length!==2122) throw new Error('invalid OCC dataset');
    cache=j.data;at=Date.now();
    res.status(200).json({ok:true,count:cache.length,data:cache,source:'audit-snapshot-adapter'});
  }catch(e){
    res.status(503).json({ok:false,error:'Profession dataset unavailable in preview'});
  }
}