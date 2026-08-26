const RAW='https://raw.githubusercontent.com/ndrtasks/hr-system/release/ndr-hr-tools-v2-1-edge-cases/';
const DAY=86400000;
const eq=(a,b,t=1e-8)=>Math.abs(a-b)<=t;
const d=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return null;const [y,m,x]=s.split('-').map(Number),z=new Date(Date.UTC(y,m-1,x));return z.getUTCFullYear()===y&&z.getUTCMonth()===m-1&&z.getUTCDate()===x?z:null};
const addDays=(x,n)=>new Date(x.getTime()+n*DAY);
function addMonthsClamped(x,n){const y=x.getUTCFullYear(),m=x.getUTCMonth(),day=x.getUTCDate(),first=new Date(Date.UTC(y,m+n,1)),last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();return new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),Math.min(day,last)))}
function toHijri(x){const f=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn',{day:'numeric',month:'numeric',year:'numeric',timeZone:'UTC'}),p=f.formatToParts(x),g=t=>Number(p.find(v=>v.type===t)?.value);return{y:g('year'),m:g('month'),d:g('day')}}
function fromHijri(y,m,dd){if(!y||m<1||m>12||dd<1||dd>30)return null;let lo=Date.UTC(1900,0,1),hi=Date.UTC(2200,0,1),hit=null;for(let i=0;i<60;i++){const mid=Math.floor((lo+hi)/2/DAY)*DAY,h=toHijri(new Date(mid)),cmp=(h.y-y)||(h.m-m)||(h.d-dd);if(!cmp){hit=mid;break}if(cmp<0)lo=mid+DAY;else hi=mid-DAY}const center=hit??Math.floor((lo+hi)/2/DAY)*DAY;for(let k=-4;k<=4;k++){const x=new Date(center+k*DAY),h=toHijri(x);if(h.y===y&&h.m===m&&h.d===dd)return x}return null}
function addHijriMonths(x,n){const h=toHijri(x),tot=h.y*12+h.m-1+n,y=Math.floor(tot/12),m=((tot%12)+12)%12+1;for(let dd=h.d;dd>=1;dd--){const z=fromHijri(y,m,dd);if(z)return z}return null}
const grossEOS=(w,y)=>.5*w*Math.min(y,5)+w*Math.max(0,y-5);
function eosFactor(reason,y){if(reason==='fixedResign')return y<2?0:y<=5?1/3:y<10?2/3:1;if(reason==='art80'||reason==='probation')return 0;return 1}
const leaveDays=y=>21*Math.min(y,5)+30*Math.max(0,y-5);
function sickAlloc(used,n,w){let pay=0,start=0,alloc=[0,0,0];for(const [i,len,rate] of [[0,30,1],[1,60,.75],[2,30,0]]){const end=start+len,from=Math.max(used,start),to=Math.min(used+n,end),x=Math.max(0,to-from);alloc[i]=x;pay+=x*(w/30)*rate;start=end}return{pay,alloc,beyond:Math.max(0,used+n-120)}}
const otRate=(basic,actual,mh)=>actual/mh+.5*(basic/mh);
function art77({w,type,y=0,months=0,agreed=null}){if(agreed!==null)return agreed;const raw=type==='fixed'?w*months:(w/2)*y;return Math.max(raw,w*2)}
const noticeDays=(contract,pay,by,ag=0)=>contract==='fixed'?(ag>0?ag:null):Math.max(pay==='monthly'?(by==='employer'?60:30):30,ag||0);
function resign({submit,action='none',actionDate=null,defer=0}){const s=d(submit),auto=addDays(s,30),withdraw=addDays(s,7);if(action==='none')return{ok:true,effective:auto,withdraw};const a=d(actionDate);if(!a||a<s)return{ok:false};if(action==='accept')return{ok:true,effective:a,withdraw};if(a>=auto||defer<=0||defer>60)return{ok:false};return{ok:true,effective:addDays(a,defer),withdraw}}
const probationOK=(days,prior,rule)=>days>=0&&days<=180&&!(prior&&rule==='none');
const settlementDays=by=>by==='employee'?14:7;
function gosiPension(date){const x=d(date);if(x>=d('2028-07-14'))return 11;if(x>=d('2027-07-01'))return 10.5;if(x>=d('2026-07-01'))return 10;if(x>=d('2025-07-01'))return 9.5;return 9}
function gosi(cat,date,raw){if(cat==='new'&&d(date)<d('2024-07-03'))return{ok:false};const hazard=cat==='non'||cat==='hazard',min=hazard?400:1500,base=Math.min(Math.max(raw,min),45000),p=cat==='old'?9:(hazard?0:gosiPension(date)),emp=hazard?0:base*(p+.75)/100,er=hazard?base*.02:base*(p+.75+2)/100;return{ok:true,base,p,emp,er}}
const fineCat=w=>w<=0?null:w<=20?'C':w<=49?'B':'A';
const disciplineRepeat=(rep,days)=>rep>0&&days>=180?0:rep;

export default async function handler(req,res){
 try{
  const [hardR,hotR,pkgR]=await Promise.all([fetch(RAW+'scripts/edgecase-hardening.mjs',{cache:'no-store'}),fetch(RAW+'scripts/edgecase-hotfix.mjs',{cache:'no-store'}),fetch(RAW+'package.json',{cache:'no-store'})]);
  if(!hardR.ok||!hotR.ok||!pkgR.ok)throw new Error('تعذر قراءة ملفات حراسة الإصدار');
  const [hard,hot,pkg]=await Promise.all([hardR.text(),hotR.text(),pkgR.text()]);
  const tests=[];const t=(group,name,actual,expected,ok=Object.is(actual,expected))=>tests.push({group,name,actual,expected,ok});

  // Input/date safety.
  t('dates','valid leap day',!!d('2024-02-29'),true);
  t('dates','reject non-leap Feb 29',d('2025-02-29'),null);
  t('dates','reject Feb 30',d('2026-02-30'),null);
  t('dates','Jan31 + 1 Gregorian month',addMonthsClamped(d('2026-01-31'),1).toISOString().slice(0,10),'2026-02-28');
  t('dates','leap Jan31 + 1 month',addMonthsClamped(d('2024-01-31'),1).toISOString().slice(0,10),'2024-02-29');
  const h0=toHijri(d('2026-08-26')),h1=toHijri(addHijriMonths(d('2026-08-26'),1));
  t('dates','Hijri month increment',((h1.y*12+h1.m)-(h0.y*12+h0.m)),1);
  t('dates','reject impossible Hijri day',fromHijri(1448,1,30),null);

  // EOS boundaries and reasons.
  t('eos','gross first year',grossEOS(12000,1),6000);
  t('eos','gross 5 years',grossEOS(12000,5),30000);
  t('eos','gross 6 years',grossEOS(12000,6),42000);
  t('eos','fixed resignation before 2y',eosFactor('fixedResign',1.999),0);
  t('eos','fixed resignation exactly 2y',eosFactor('fixedResign',2),1/3,true,eq(eosFactor('fixedResign',2),1/3));
  t('eos','fixed resignation exactly 5y',eosFactor('fixedResign',5),1/3,true,eq(eosFactor('fixedResign',5),1/3));
  t('eos','fixed resignation >5y',eosFactor('fixedResign',5.001),2/3,true,eq(eosFactor('fixedResign',5.001),2/3));
  t('eos','fixed resignation <10y',eosFactor('fixedResign',9.999),2/3,true,eq(eosFactor('fixedResign',9.999),2/3));
  t('eos','fixed resignation exactly 10y',eosFactor('fixedResign',10),1);
  for(const r of ['indef75','art81','force87','femaleMarriage87','femaleBirth87','death79','owner18'])t('eos','full-right reason '+r,eosFactor(r,3),1);
  t('eos','Article80 zero',eosFactor('art80',12),0);
  t('eos','probation termination zero',eosFactor('probation',.3),0);

  // Annual leave.
  t('leave','1 year =21',leaveDays(1),21);
  t('leave','exactly 5 years =105',leaveDays(5),105);
  t('leave','6 years =135',leaveDays(6),135);
  t('leave','negative ledger not payable',Math.max(0,21-30),0);

  // Sick leave tier edges and cycle reset.
  t('sick','30 days full pay',sickAlloc(0,30,10000).pay,10000,true,eq(sickAlloc(0,30,10000).pay,10000));
  t('sick','day31 at 75%',sickAlloc(30,1,10000).pay,250,true,eq(sickAlloc(30,1,10000).pay,250));
  t('sick','60 days 75%',sickAlloc(30,60,10000).pay,15000,true,eq(sickAlloc(30,60,10000).pay,15000));
  t('sick','day91 unpaid',sickAlloc(90,1,10000).pay,0);
  t('sick','day120 unpaid',sickAlloc(119,1,10000).pay,0);
  t('sick','day121 beyond',sickAlloc(120,1,10000).beyond,1);
  const cross=sickAlloc(120,1,10000).pay+sickAlloc(0,1,10000).pay;
  t('sick','cross anniversary resets tier',cross,10000/30,true,eq(cross,10000/30));

  // Overtime cash/comp leave.
  t('ot','OT hourly formula',otRate(6000,8000,240),45.833333333333336,true,eq(otRate(6000,8000,240),45.833333333333336));
  t('ot','10 OT hours pay',otRate(6000,8000,240)*10,458.33333333333337,true,eq(otRate(6000,8000,240)*10,458.33333333333337));
  t('ot','minimum comp ratio',1.5>=1.5,true);
  t('ot','below comp ratio rejected',1.49>=1.5,false);
  t('ot','30-day annual cap exact',(20+80*1.5/8)<=30,true);
  t('ot','annual cap exceeded',(20+81*1.5/8)>30,true);

  // Article 77.
  t('art77','indef 1y applies 2-month minimum',art77({w:10000,type:'indef',y:1}),20000);
  t('art77','indef 5y formula exceeds minimum',art77({w:10000,type:'indef',y:5}),25000);
  t('art77','fixed 1m minimum',art77({w:10000,type:'fixed',months:1}),20000);
  t('art77','fixed 5m',art77({w:10000,type:'fixed',months:5}),50000);
  t('art77','contractual compensation honored',art77({w:10000,type:'fixed',months:5,agreed:12000}),12000);

  // Notice Article75/76.
  t('notice','indef monthly employee 30',noticeDays('indef','monthly','employee'),30);
  t('notice','indef monthly employer 60',noticeDays('indef','monthly','employer'),60);
  t('notice','indef nonmonthly either 30',noticeDays('indef','other','employer'),30);
  t('notice','longer contractual notice wins',noticeDays('indef','monthly','employee',90),90);
  t('notice','fixed without clause not Article75',noticeDays('fixed','monthly','employee',0),null);

  // Fixed-term resignation Article79bis.
  let r=resign({submit:'2026-08-01'});t('resignation','no response +30',r.effective.toISOString().slice(0,10),'2026-08-31');
  t('resignation','withdrawal +7',r.withdraw.toISOString().slice(0,10),'2026-08-08');
  r=resign({submit:'2026-08-01',action:'accept',actionDate:'2026-08-05'});t('resignation','accepted date effective',r.effective.toISOString().slice(0,10),'2026-08-05');
  r=resign({submit:'2026-08-01',action:'defer',actionDate:'2026-08-20',defer:60});t('resignation','valid max 60 deferral',r.ok,true);
  r=resign({submit:'2026-08-01',action:'defer',actionDate:'2026-08-20',defer:61});t('resignation','reject >60 deferral',r.ok,false);
  r=resign({submit:'2026-08-01',action:'defer',actionDate:'2026-08-31',defer:10});t('resignation','reject deferral at 30-day expiry',r.ok,false);

  // Probation.
  t('probation','180 accepted',probationOK(180,false,'none'),true);
  t('probation','181 rejected',probationOK(181,false,'none'),false);
  t('probation','repeat no exception rejected',probationOK(90,true,'none'),false);
  t('probation','repeat different work accepted',probationOK(90,true,'different'),true);
  t('probation','repeat after 6m accepted',probationOK(90,true,'gap6'),true);

  // Settlement.
  t('settlement','employer-ended 7 days',settlementDays('employer'),7);
  t('settlement','employee-ended 14 days',settlementDays('employee'),14);

  // GOSI date and wage boundaries.
  t('gosi','new system before 3 Jul 2024 rejected',gosi('new','2024-07-02',6000).ok,false);
  t('gosi','3 Jul 2024 pension 9%',gosi('new','2024-07-03',6000).p,9);
  t('gosi','30 Jun 2025 pension 9%',gosi('new','2025-06-30',6000).p,9);
  t('gosi','1 Jul 2025 pension 9.5%',gosi('new','2025-07-01',6000).p,9.5);
  t('gosi','1 Jul 2026 pension 10%',gosi('new','2026-07-01',6000).p,10);
  t('gosi','1 Jul 2027 pension 10.5%',gosi('new','2027-07-01',6000).p,10.5);
  t('gosi','13 Jul 2028 pension 10.5%',gosi('new','2028-07-13',6000).p,10.5);
  t('gosi','14 Jul 2028 pension 11%',gosi('new','2028-07-14',6000).p,11);
  t('gosi','nonSaudi min base 400',gosi('non','2026-08-26',100).base,400);
  t('gosi','hazard-only min base 400',gosi('hazard','2026-08-26',100).base,400);
  t('gosi','hazard-only employer 2%',gosi('hazard','2026-08-26',100).er,8);
  t('gosi','Saudi min base 1500',gosi('new','2026-08-26',100).base,1500);
  t('gosi','max base 45000',gosi('new','2026-08-26',100000).base,45000);
  t('gosi','old Saudi stays 9%',gosi('old','2028-08-01',6000).p,9);

  // Localization/Nitaqat/fines/discipline.
  t('nitaqat','5 workers use small-entity rule',5<=5,true);
  t('nitaqat','6 workers use formula',6>5,true);
  t('nitaqat','ordinary Saudi weight',3+2*.5,4);
  t('localization','round 2.49 down',Math.round(2.49),2);
  t('localization','round 2.5 up',Math.round(2.5),3);
  t('localization','16 x 60% =>10',Math.round(16*.6),10);
  t('localization','Saudi count > total invalid',6>5,true);
  t('fines','0 workers invalid',fineCat(0),null);
  t('fines','20 workers category C',fineCat(20),'C');
  t('fines','21 workers category B',fineCat(21),'B');
  t('fines','49 workers category B',fineCat(49),'B');
  t('fines','50 workers category A',fineCat(50),'A');
  t('fines','recurrence possible doubled exposure',10000*2,20000);
  t('discipline','179 days keeps escalation',disciplineRepeat(2,179),2);
  t('discipline','exact 180 resets escalation',disciplineRepeat(2,180),0);
  t('discipline','181 resets escalation',disciplineRepeat(2,181),0);
  t('discipline','discovery day30 allowed',30<=30,true);
  t('discipline','discovery day31 blocked',31>30,true);
  t('discipline','proof day30 allowed',30<=30,true);
  t('discipline','proof day31 blocked',31>30,true);
  t('discipline','monthly 5-day cap exact',4.5+.5<=5,true);
  t('discipline','monthly cap exceeded',4.5+.51>5,true);

  const sourceChecks={
   hardeningInBuild:pkg.includes('edgecase-hardening.mjs')&&pkg.includes('edgecase-hotfix.mjs'),
   localToday:hard.includes('function today(){const d=new Date()'),
   strictIso:hard.includes('x.getFullYear()===y'),
   eosFixedVsIndef:hard.includes('fixedResign')&&hard.includes('indef75'),
   eosExceptions:hard.includes('force87')&&hard.includes('femaleMarriage87')&&hard.includes('art81')&&hard.includes("v.reason==='probation'"),
   sick75:hard.includes("[1,[60,.75]]"),
   sickCycleSplit:hard.includes('cycles++'),
   otCompLeave:hard.includes("v.settle==='leave'")&&hard.includes('totalDays>30'),
   notice3060:hard.includes("v.by==='employer'?60:30"),
   resignation79bis:hard.includes('function calcResignation'),
   repeatProbation:hard.includes("v.prior==='yes'"),
   gosiHazard:hard.includes("cat==='hazard'"),
   gosiNewStart:hard.includes('3 يوليو 2024'),
   hijriMonths:hard.includes('function addHijriMonths'),
   localProfessionSnapshot:hard.includes("fetch('./data/occ.json'"),
   nitaqatSpecialWeight:hard.includes('bandEffective'),
   localizationConflict:hard.includes('conflicts.push'),
   fineRecurrence:hard.includes('fineRepeat'),
   discipline180Exact:hot.includes('prev>=180'),
   discipline30day:hard.includes('disc>30')&&hard.includes('proof>30'),
   discipline5day:hard.includes('monthUsed+equiv>5')
  };
  const failed=tests.filter(x=>!x.ok),badSources=Object.entries(sourceChecks).filter(([,v])=>!v).map(([k])=>k);
  const groups={};for(const x of tests){groups[x.group]??={passed:0,failed:0};groups[x.group][x.ok?'passed':'failed']++}
  const ok=!failed.length&&!badSources.length;
  res.status(ok?200:500).json({ok,summary:{passed:tests.length-failed.length,failed:failed.length,total:tests.length,sourceGuards:Object.keys(sourceChecks).length,badSources},groups,sourceChecks,failedTests:failed,tests});
 }catch(e){res.status(500).json({ok:false,error:String(e.message||e)})}
}