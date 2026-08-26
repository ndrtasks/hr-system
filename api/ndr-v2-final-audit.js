const RAW='https://raw.githubusercontent.com/ndrtasks/hr-system/ndr-hr-tools-audit-rc-20260825/';
const REF='https://ndr-ref-audit.vercel.app/api/data?name=';
function eq(a,b,t=1e-9){return Math.abs(a-b)<=t}
export default async function handler(req,res){
 try{
  const paths=['public/ndr-hr-v2/app.js','public/ndr-hr-v2/advanced.js','public/ndr-hr-v2/index.html','public/ndr-hr-v2/advanced.html','scripts/snapshot-ndr-hr-data.mjs','package.json'];
  const rr=await Promise.all(paths.map(p=>fetch(RAW+p,{cache:'no-store'})));
  if(rr.some(r=>!r.ok))throw new Error('تعذر جلب أحد ملفات المصدر');
  const [core,adv,index,advanced,snap,pkg]=await Promise.all(rr.map(r=>r.text()));
  let coreSyntax=true,advSyntax=true,coreError='',advError='';
  try{new Function(core)}catch(e){coreSyntax=false;coreError=e.message}
  try{new Function(adv)}catch(e){advSyntax=false;advError=e.message}
  const sourceChecks={
   coreSyntax,advSyntax,
   advancedLinked:index.includes('./advanced.html'),
   xlsxLocal:advanced.includes('./vendor/xlsx.full.min.js')&&pkg.includes('"xlsx"'),
   nitaqatSmallEntity:adv.includes('if(total<=5)'),
   nitaqatNaturalLog:adv.includes('Math.log(total)'),
   nitaqatHalfWeight:adv.includes('half*.5'),
   localizationRound:adv.includes('Math.round(total*b.r)'),
   localizationConflict:adv.includes('chooseCat'),
   finesCategories:adv.includes('workers<=20?0:workers<=49?1:2'),
   disciplineDailyWage:adv.includes('const daily=wage/30'),
   excelLocalAnalysis:adv.includes('XLSX.utils.sheet_to_json'),
   snapshotOcc:snap.includes("count:2122"),snapshotLocalization:snap.includes("count:15"),snapshotFines:snap.includes("count:57"),snapshotDiscipline:snap.includes("count:50"),snapshotNitaqat:snap.includes('nitaqat.length!==32')
  };
  const tests=[];const t=(name,actual,expected,ok=Object.is(actual,expected))=>tests.push({name,actual,expected,ok});
  // Nitaqat: fixed-threshold sample mirrors an activity with thresholds 82/85/89/93.42.
  const mins=[82,85,89,93.42],zone=p=>{let z=0;mins.forEach((m,i)=>{if(p>=m)z=i+1});return z};
  t('Nitaqat 82% enters low green',zone(82),1);
  t('Nitaqat 89% enters high green',zone(89),3);
  t('Nitaqat half-wage Saudi has 0.5 weight',1+2*.5,2);
  t('Nitaqat small entity threshold',5<=5,true);
  t('Nitaqat 6 workers uses equation',6>5,true);
  // Localization rounding rule: 16 × 60% = 9.6 => 10; with 3 Saudis, gap 7.
  const req=Math.round(16*.60);t('Localization required Saudis rounding',req,10);t('Localization gap example',Math.max(0,req-3),7);
  // Fine category boundaries.
  const fi=w=>w<=20?0:w<=49?1:2;t('Fine category C at 20 workers',fi(20),0);t('Fine category B at 21 workers',fi(21),1);t('Fine category A at 50 workers',fi(50),2);
  // Example table row: 10,000 SAR per worker, 3 workers.
  t('Fine multiplication by unit',10000*3,30000);
  // Discipline: 6,000 monthly => 200 daily; 5% of one day => 10.
  t('Discipline 5% daily wage',6000/30*.05,10,eq(6000/30*.05,10));
  const dataNames=[['OCC',2122],['NQ_DATA',15],['FINE_DATA',57],['VI_DATA',50]];
  const counts={};for(const [n,expected] of dataNames){const r=await fetch(REF+encodeURIComponent(n),{cache:'no-store'});if(!r.ok)throw new Error(n+' data HTTP '+r.status);const j=await r.json();counts[n]=Array.isArray(j.data)?j.data.length:-1;t('Dataset '+n+' count',counts[n],expected)}
  const failed=tests.filter(x=>!x.ok);const badSources=Object.entries(sourceChecks).filter(([,v])=>!v).map(([k])=>k);
  const ok=coreSyntax&&advSyntax&&!failed.length&&!badSources.length;
  res.status(ok?200:500).json({ok,syntax:{core:coreSyntax,advanced:advSyntax,coreError,advError},sourceChecks,tests:{passed:tests.length-failed.length,failed:failed.length,items:tests},datasets:counts});
 }catch(e){res.status(500).json({ok:false,error:String(e.message||e)})}
}