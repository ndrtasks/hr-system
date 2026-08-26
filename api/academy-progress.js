import crypto from 'node:crypto';
const MAX_BODY=180_000;
const cfg=()=>({url:(process.env.NDR_ACADEMY_SUPABASE_URL||'').replace(/\/$/,''),key:process.env.NDR_ACADEMY_SUPABASE_SERVICE_KEY||'',coach:process.env.NDR_ACADEMY_COACH_TOKEN||''});
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.end(JSON.stringify(data))};
const hash=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const equal=(a,b)=>{try{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)}catch{return false}};
const token=()=>crypto.randomBytes(24).toString('base64url');
async function body(req){let n=0,s='';for await(const c of req){n+=c.length;if(n>MAX_BODY)throw new Error('BODY_TOO_LARGE');s+=c}return s?JSON.parse(s):{}}
async function db(path,opt={}){const c=cfg();const r=await fetch(c.url+'/rest/v1/'+path,{...opt,headers:{apikey:c.key,authorization:'Bearer '+c.key,'content-type':'application/json',prefer:opt.prefer||'',...(opt.headers||{})}});const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}if(!r.ok)throw new Error('DB_'+r.status+':'+String(text).slice(0,500));return data}
async function findTrainee(id){const x=await db('academy_trainees?id=eq.'+encodeURIComponent(id)+'&select=id,name,sync_token_hash,progress,last_seen,created_at');return x?.[0]||null}
function validCoach(v){const c=cfg().coach;return c&&equal(hash(v||''),hash(c))}
function validTrainee(row,v){return row?.sync_token_hash&&equal(row.sync_token_hash,hash(v||''))}
function configured(){const c=cfg();return !!(c.url&&c.key&&c.coach)}
export default async function handler(req,res){
 try{
  if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}
  const b=req.method==='POST'?await body(req):{};const action=b.action||req.query?.action||'health';
  if(action==='health')return json(res,200,{ok:true,configured:configured(),mode:configured()?'cloud':'local-only'});
  if(!configured())return json(res,503,{ok:false,code:'ACADEMY_CLOUD_NOT_CONFIGURED',message:'قاعدة متابعة الأكاديمية المستقلة لم يتم ربطها بعد.'});
  if(action==='coach_list'){
   if(!validCoach(b.coachToken))return json(res,401,{ok:false,message:'رمز المدرب غير صحيح.'});
   const rows=await db('academy_trainees?select=id,name,progress,last_seen,created_at&order=last_seen.desc.nullslast');return json(res,200,{ok:true,trainees:rows||[]});
  }
  if(action==='coach_create'){
   if(!validCoach(b.coachToken))return json(res,401,{ok:false,message:'رمز المدرب غير صحيح.'});
   const name=String(b.name||'').trim().slice(0,60);if(name.length<2)return json(res,400,{ok:false,message:'اكتب اسم المتدرب.'});
   const syncToken=token(),id=crypto.randomUUID();
   await db('academy_trainees',{method:'POST',prefer:'return=minimal',body:JSON.stringify({id,name,sync_token_hash:hash(syncToken),progress:{},last_seen:new Date().toISOString()})});
   return json(res,200,{ok:true,trainee:{id,name,syncToken}});
  }
  if(action==='trainee_sync'){
   const row=await findTrainee(b.id);if(!row||!validTrainee(row,b.syncToken))return json(res,401,{ok:false,message:'بيانات ربط المتدرب غير صحيحة.'});
   const progress=b.progress&&typeof b.progress==='object'?b.progress:{};const raw=JSON.stringify(progress);if(raw.length>140000)return json(res,413,{ok:false,message:'حجم بيانات التقدم أكبر من المسموح.'});
   const updated={progress,last_seen:new Date().toISOString()};await db('academy_trainees?id=eq.'+encodeURIComponent(row.id),{method:'PATCH',prefer:'return=minimal',body:JSON.stringify(updated)});return json(res,200,{ok:true,lastSeen:updated.last_seen});
  }
  if(action==='trainee_get'){
   const row=await findTrainee(b.id);if(!row||!validTrainee(row,b.syncToken))return json(res,401,{ok:false,message:'بيانات ربط المتدرب غير صحيحة.'});return json(res,200,{ok:true,trainee:{id:row.id,name:row.name,progress:row.progress||{},lastSeen:row.last_seen}});
  }
  return json(res,400,{ok:false,message:'طلب غير معروف.'});
 }catch(e){console.error('academy-progress',e);return json(res,e?.message==='BODY_TOO_LARGE'?413:500,{ok:false,message:'تعذر تنفيذ مزامنة الأكاديمية.',detail:process.env.NODE_ENV==='development'?String(e?.message||e):undefined})}
}