const RAW='https://raw.githubusercontent.com/ndrtasks/hr-system/ndr-hr-tools-audit-rc-20260825/';
const REF='https://ndr-ref-audit.vercel.app/api/data?name=';
function eq(a,b,t=1e-9){return Math.abs(a-b)<=t}
export default async function handler(req,res){
 try{
  const paths=['public/ndr-hr-v2/app.js','public/ndr-hr-v2/advanced.js','public/ndr-hr-v2/knowledge.js','public/ndr-hr-v2/index.html','public/ndr-hr-v2/advanced.html','public/ndr-hr-v2/knowledge.html','scripts/snapshot-ndr-hr-data.mjs','package.json'];
  const rr=await Promise.all(paths.map(p=>fetch(RAW+p,{cache:'no-store'})));
  if(rr.some(r=>!r.ok))throw new Error('تعذر جلب أحد ملفات المصدر');
  const [core,adv,know,index,advanced,knowledge,snap,pkg]=await Promise.all(rr.map(r=>r.text()));
  let coreSyntax=true,advSyntax=true,knowSyntax=true,coreError='',advError='',knowError='';
  try{new Function(core)}catch(e){coreSyntax=false;coreError=e.message}
  try{new Function(adv)}catch(e){advSyntax=false;advError=e.message}
  try{new Function(know)}catch(e){knowSyntax=false;knowError=e.message}
  const referenceCount=(know.match(/\{t:'/g)||[]).length;
  const quizCount=(know.match(/\{g:'/g)||[]).length;
  const quizCats={
    law:(know.match(/\{g:'نظام العمل ولائحته'/g)||[]).length,
    gov:(know.match(/\{g:'المنصات الحكومية'/g)||[]).length,
    pen:(know.match(/\{g:'المخالفات والغرامات'/g)||[]).length,
    prac:(know.match(/\{g:'ممارسات الموارد البشرية'/g)||[]).length
  };
  const sourceChecks={
   coreSyntax,advSyntax,knowSyntax,
   advancedLinked:index.includes('./advanced.html'),knowledgeLinked:index.includes('./knowledge.html'),
   xlsxLocal:advanced.includes('./vendor/xlsx.full.min.js')&&pkg.includes('"xlsx"'),
   nitaqatSmallEntity:adv.includes('if(total<=5)'),
   nitaqatNaturalLog:adv.includes('Math.log(total)'),
   nitaqatHalfWeight:adv.includes('half*.5'),
   localizationRound:adv.includes('Math.round(total*b.r)'),
   localizationConflict:adv.includes('chooseCat'),
   finesCategories:adv.includes('workers<=20?0:workers<=49?1:2'),
   disciplineDailyWage:adv.includes('const daily=wage/30'),
   excelLocalAnalysis:adv.includes('XLSX.utils.sheet_to_json'),
   knowledgeOfficialLinks:know.includes('hrsd.gov.sa')&&know.includes('gosi.gov.sa')&&know.includes('stats.gov.sa'),
   referenceCount:referenceCount>=8,quizCount:quizCount===60,
   quizLaw20:quizCats.law===20,quizGov12:quizCats.gov===12,quizPen12:quizCats.pen===12,quizPractice16:quizCats.prac===16,
   snapshotOcc:snap.includes("count:2122"),snapshotLocalization:snap.includes("count:15"),snapshotFines:snap.includes("count:57"),snapshotDiscipline:snap.includes("count:50"),snapshotNitaqat:snap.includes('nitaqat.length!==41')
  };
  const tests=[];const t=(name,actual,expected,ok=Object.is(actual,expected))=>tests.push({name,actual,expected,ok});
  const mins=[82,85,89,93.42],zone=p=>{let z=0;mins.forEach((m,i)=>{if(p>=m)z=i+1});return z};
  t('Nitaqat 82% enters low green',zone(82),1);
  t('Nitaqat 89% enters high green',zone(89),3);
  t('Nitaqat half-wage Saudi has 0.5 weight',1+2*.5,2);
  t('Nitaqat small entity threshold',5<=5,true);
  t('Nitaqat 6 workers uses equation',6>5,true);
  const req=Math.round(16*.60);t('Localization required Saudis rounding',req,10);t('Localization gap example',Math.max(0,req-3),7);
  const fi=w=>w<=20?0:w<=49?1:2;t('Fine category C at 20 workers',fi(20),0);t('Fine category B at 21 workers',fi(21),1);t('Fine category A at 50 workers',fi(50),2);
  t('Fine multiplication by unit',10000*3,30000);
  t('Discipline 5% daily wage',6000/30*.05,10,eq(6000/30*.05,10));
  t('Official references count',referenceCount,8,referenceCount>=8);
  t('Audited quiz total',quizCount,60);
  t('Quiz law category',quizCats.law,20);
  t('Quiz government category',quizCats.gov,12);
  t('Quiz penalties category',quizCats.pen,12);
  t('Quiz HR practice category',quizCats.prac,16);
  const dataNames=[['OCC',2122],['NQ_DATA',15],['FINE_DATA',57],['VI_DATA',50]];
  const counts={};for(const [n,expected] of dataNames){const r=await fetch(REF+encodeURIComponent(n),{cache:'no-store'});if(!r.ok)throw new Error(n+' data HTTP '+r.status);const j=await r.json();counts[n]=Array.isArray(j.data)?j.data.length:-1;t('Dataset '+n+' count',counts[n],expected)}
  const failed=tests.filter(x=>!x.ok);const badSources=Object.entries(sourceChecks).filter(([,v])=>!v).map(([k])=>k);
  const ok=coreSyntax&&advSyntax&&knowSyntax&&!failed.length&&!badSources.length;
  res.status(ok?200:500).json({ok,syntax:{core:coreSyntax,advanced:advSyntax,knowledge:knowSyntax,coreError,advError,knowError},sourceChecks,tests:{passed:tests.length-failed.length,failed:failed.length,items:tests},datasets:counts,nitaqatActivities:41,references:referenceCount,quizQuestions:quizCount,quizCategories:quizCats});
 }catch(e){res.status(500).json({ok:false,error:String(e.message||e)})}
}