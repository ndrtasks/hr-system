import {readFile,writeFile} from 'node:fs/promises';
const base='public/ndr-hr-v2/';
const [academy,coachHtml,coachJs,syncJs,api,sql]=await Promise.all([
 readFile(base+'academy.html','utf8'),readFile(base+'coach.html','utf8'),readFile(base+'coach.js','utf8'),readFile(base+'academy-cloud-sync.js','utf8'),readFile('api/academy-progress.js','utf8'),readFile('supabase/ndr-academy-progress.sql','utf8')
]);
let browserSyntax=true,error='';try{new Function(coachJs);new Function(syncJs)}catch(e){browserSyntax=false;error=e.message}
const checks={
 browserSyntax,
 coachPage:coachHtml.includes('لوحة المدرب')&&coachHtml.includes('trainees')&&coachJs.includes("action:'coach_list'"),
 coachLink:academy.includes('href="./coach.html"'),
 syncLinked:academy.includes('academy-cloud-sync.js')&&academy.includes('academy-cloud-sync.css'),
 dedicatedUrl:api.includes('NDR_ACADEMY_SUPABASE_URL'),
 dedicatedServiceKey:api.includes('NDR_ACADEMY_SUPABASE_SERVICE_KEY'),
 dedicatedCoachToken:api.includes('NDR_ACADEMY_COACH_TOKEN'),
 noGenericSupabaseEnv:!api.includes('SUPABASE_URL||')&&!api.includes('SUPABASE_SERVICE_ROLE_KEY')&&!api.includes('NEXT_PUBLIC_SUPABASE'),
 noOldProjectReference:!api.includes('ndr-assist-training-multi')&&!sql.includes('ndr-assist-training-multi'),
 hashedTraineeToken:api.includes("createHash('sha256')")&&api.includes('sync_token_hash:hash(syncToken)'),
 timingSafeCoach:api.includes('timingSafeEqual'),
 serverOnlyKey:!coachJs.includes('SUPABASE')&&!syncJs.includes('SUPABASE')&&!coachHtml.includes('SUPABASE'),
 limitedPayload:api.includes('140000')&&api.includes('MAX_BODY'),
 rls:sql.includes('enable row level security')&&sql.includes('revoke all on table public.academy_trainees from anon, authenticated'),
 isolatedTable:sql.includes('public.academy_trainees'),
 localFallback:syncJs.includes('التقدم محفوظ على هذا الجهاز')&&api.includes('ACADEMY_CLOUD_NOT_CONFIGURED')
};
const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);const report={ok:!failed.length,generatedAt:new Date().toISOString(),checks,failed,error};await writeFile(base+'coach-audit.json',JSON.stringify(report,null,2),'utf8');console.log(`NDR HR coach sync gate: ${Object.keys(checks).length-failed.length}/${Object.keys(checks).length}; failures=${failed.length}`);if(failed.length)throw new Error('Coach sync gate failed: '+failed.join(', ')+' '+error);