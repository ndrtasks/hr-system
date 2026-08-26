import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
const base='public/ndr-hr-v2/';
const files=['academy-unit-data-1.js','academy-unit-data-2.js','academy-unit-data-3.js','academy-unit-data-4.js'];
const [srcs,routing,quiz,plan,html]=await Promise.all([Promise.all(files.map(f=>readFile(base+f,'utf8'))),readFile(base+'academy-mastery-routing.js','utf8'),readFile(base+'academy-unit-quiz.js','utf8'),readFile(base+'academy-plan.js','utf8'),readFile(base+'academy.html','utf8')]);
const sandbox={window:{NDR_UNIT_CASES:{}}};vm.createContext(sandbox);
let syntax=true,error='';
try{for(const s of srcs)new vm.Script(s).runInContext(sandbox);new Function(routing);new Function(quiz);new Function(plan)}catch(e){syntax=false;error=e.message}
const U=sandbox.window.NDR_UNIT_CASES||{},entries=Object.entries(U);
const tracks=['workforce','recruit','onboard','attendance','relations','payroll','performance','offboard','rewards','talent','gov','policy','experience','analytics'];
const blockers=[],warnings=[];
for(const [id,u] of entries){
  const b=[],w=[];
  if(!tracks.includes(u.track))b.push('track');
  if(typeof u.name!=='string'||u.name.length<3)b.push('name');
  if(typeof u.case!=='string'||u.case.length<60)b.push('case-missing'); else if(u.case.length<100)w.push('case-depth');
  if(typeof u.wrong!=='string'||u.wrong.length<15)b.push('wrong-missing'); else if(u.wrong.length<25)w.push('wrong-depth');
  if(!Array.isArray(u.gaps)||u.gaps.length<3)b.push('gaps-count'); else if(u.gaps.some(x=>String(x).length<20))w.push('gaps-depth');
  if(!Array.isArray(u.legal)||u.legal.length<1)b.push('legal-missing'); else if(u.legal.some(x=>String(x).length<25))w.push('legal-depth');
  if(typeof u.model!=='string'||u.model.length<50)b.push('model-missing'); else if(u.model.length<80)w.push('model-depth');
  if(typeof u.task!=='string'||u.task.length<25)b.push('task-missing'); else if(u.task.length<35)w.push('task-depth');
  if(!Array.isArray(u.fields)||u.fields.length!==5||u.fields.some(f=>!Array.isArray(f)||f.length<3||String(f[0]).length<2||String(f[1]).length<8||!Array.isArray(f[2])||f[2].length<1))b.push('rubric');
  if((String(u.case)+String(u.wrong)+String(u.model)).includes('نسوي المطلوب ونرفع للمدير'))b.push('generic-fallback');
  if(b.length)blockers.push({id,problems:b});
  if(w.length)warnings.push({id,warnings:w,lengths:{case:u.case?.length||0,wrong:u.wrong?.length||0,model:u.model?.length||0,task:u.task?.length||0}});
}
const perTrack=Object.fromEntries(tracks.map(t=>[t,entries.filter(([,u])=>u.track===t).length]));
const idsOk=tracks.every(t=>[0,1,2,3].every(i=>U[`${t}-${i}`]));
const checks={
 syntax,
 count56:entries.length===56,
 exactFourPerTrack:tracks.every(t=>perTrack[t]===4),
 allIds:idsOk,
 noStructuralBlockers:blockers.length===0,
 strictDepth:warnings.length===0,
 adaptiveThreshold:routing.includes('score(track)<70')&&routing.includes('unitsPassed(track)'),
 capstoneUnlock:routing.includes("[0,1,2,3].every")&&routing.includes(">=80")&&routing.includes('!unitsPassed(track)'),
 quizLinked:html.includes('academy-unit-quiz.js')&&html.includes('academy-unit-quiz.css'),
 quizThree:quiz.includes("correct>=2")&&quiz.includes("جاوب على الأسئلة الثلاثة")&&quiz.includes('quizPassed'),
 quizBlocksCompletion:quiz.includes('item.score=79')&&quiz.includes('item.passed=false')&&quiz.includes('practiceScore'),
 quizCaseSpecific:quiz.includes("same track")===false&&quiz.includes("x.track===u.track")&&quiz.includes("u.gaps[0]")&&quiz.includes("u.legal[0]"),
 planLinked:html.includes('academy-plan.js')&&html.includes('academy-plan.css'),
 personalWeaknessPlan:plan.includes('sort((a,b)=>a.score-b.score)')&&plan.includes('slice(0,4)')&&plan.includes('أضعف مجال'),
 spacedReviewPriority:plan.includes('dueUnits()')&&plan.includes("type:'review'")&&plan.includes('مراجعة تثبيت')
};
const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
const report={ok:!failed.length,strictDepthReady:warnings.length===0,generatedAt:new Date().toISOString(),checks,failed,error,count:entries.length,perTrack,blockers,warnings};
await writeFile(base+'units-audit.json',JSON.stringify(report,null,2),'utf8');
console.log(`NDR HR 56-unit strict gate: ${entries.length}/56; tracks=${Object.values(perTrack).filter(x=>x===4).length}/14; blockers=${blockers.length}; depth warnings=${warnings.length}; quiz=${checks.quizThree}; plan=${checks.personalWeaknessPlan}`);
if(failed.length)throw new Error('56-unit strict gate failed: '+failed.join(', ')+' blockers='+JSON.stringify(blockers.slice(0,5))+' warnings='+JSON.stringify(warnings.slice(0,8))+' '+error);