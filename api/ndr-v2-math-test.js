const DAY=86400000;
const eq=(a,b,eps=1e-9)=>Math.abs(a-b)<=eps;
function toHijri(d){try{const f=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn',{day:'numeric',month:'numeric',year:'numeric',timeZone:'UTC'}),p=f.formatToParts(d),g=t=>parseInt((p.find(x=>x.type===t)||{}).value,10);return{d:g('day'),m:g('month'),y:g('year')}}catch{return null}}
function fromHijri(hy,hm,hd){hy=+hy;hm=+hm;hd=+hd;if(!hy||hm<1||hm>12||hd<1||hd>30)return null;let lo=Date.UTC(1900,0,1),hi=Date.UTC(2200,0,1),hit=null;for(let i=0;i<60;i++){let mid=Math.floor((lo+hi)/2/DAY)*DAY,h=toHijri(new Date(mid));if(!h)return null;let cmp=(h.y-hy)||(h.m-hm)||(h.d-hd);if(cmp===0){hit=mid;break}if(cmp<0)lo=mid+DAY;else hi=mid-DAY}let center=hit??Math.floor((lo+hi)/2/DAY)*DAY;for(let k=-4;k<=4;k++){let t=new Date(center+k*DAY),h=toHijri(t);if(h&&h.y===hy&&h.m===hm&&h.d===hd)return t}return null}
function daysBetween(a,b){return Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/DAY)}
function fromUTC(d){return new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())}
function utcDate(d){return new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()))}
function addGregorianYears(a,n){const y=a.getFullYear()+n,m=a.getMonth(),day=a.getDate(),last=new Date(y,m+1,0).getDate();return new Date(y,m,Math.min(day,last))}
function addHijriYears(a,n){const h=toHijri(utcDate(a));if(!h)return null;for(let d=h.d;d>=1;d--){const u=fromHijri(h.y+n,h.m,d);if(u)return fromUTC(u)}return null}
function legalYears(a,b,basis='hijri'){if(!a||!b||b<=a)return 0;const add=(x,n)=>basis==='hijri'?addHijriYears(x,n):addGregorianYears(x,n);let guess=0;if(basis==='hijri'){const ha=toHijri(utcDate(a)),hb=toHijri(utcDate(b));if(!ha||!hb)return 0;guess=Math.max(0,hb.y-ha.y)}else guess=Math.max(0,b.getFullYear()-a.getFullYear());let ann=add(a,guess);while(guess>0&&(!ann||ann>b)){guess--;ann=add(a,guess)}let next=add(a,guess+1);while(next&&next<=b&&guess<200){guess++;ann=next;next=add(a,guess+1)}if(!ann||!next)return guess;return guess+daysBetween(ann,b)/Math.max(1,daysBetween(ann,next))}
function addMonthsClamped(a,n){const d=new Date(a),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+Math.trunc(n));d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));return d}
function addYearsClamped(a,n){return addGregorianYears(a,Math.trunc(n))}
function gosiPension(s){const d=new Date(s+'T00:00:00');if(d>=new Date(2028,6,14))return 11;if(d>=new Date(2027,6,1))return 10.5;if(d>=new Date(2026,6,1))return 10;if(d>=new Date(2025,6,1))return 9.5;return 9}
function nonSaudi(raw){const base=Math.min(Math.max(raw,400),45000);return{base,employer:base*.02}}
function annualLeave(y){return 21*Math.min(y,5)+30*Math.max(0,y-5)}
function eos(wage,y){return .5*wage*Math.min(y,5)+wage*Math.max(0,y-5)}
function sickPay(wage,used,days){const daily=wage/30,tiers=[[30,1],[60,.75],[30,0]];let pay=0,alloc=[],start=0;for(const [len,rate] of tiers){const end=start+len,from=Math.max(used,start),to=Math.min(used+days,end),n=Math.max(0,to-from);alloc.push(n);pay+=n*daily*rate;start=end}return{pay,alloc}}
export default function handler(req,res){
  try{
    const tests=[];const t=(name,ok,actual,expected)=>tests.push({name,ok:!!ok,actual,expected});
    const jan=addMonthsClamped(new Date(2026,0,31),1);t('31 Jan + 1 month clamps to 28 Feb 2026',jan.getFullYear()===2026&&jan.getMonth()===1&&jan.getDate()===28,jan.toISOString().slice(0,10),'2026-02-28');
    const leap=addYearsClamped(new Date(2024,1,29),1);t('29 Feb 2024 + 1 year clamps to 28 Feb 2025',leap.getFullYear()===2025&&leap.getMonth()===1&&leap.getDate()===28,leap.toISOString().slice(0,10),'2025-02-28');
    t('GOSI new-system 2026-06-30',gosiPension('2026-06-30')===9.5,gosiPension('2026-06-30'),9.5);
    t('GOSI new-system 2026-07-01',gosiPension('2026-07-01')===10,gosiPension('2026-07-01'),10);
    t('GOSI new-system 2028-07-13',gosiPension('2028-07-13')===10.5,gosiPension('2028-07-13'),10.5);
    t('GOSI new-system 2028-07-14',gosiPension('2028-07-14')===11,gosiPension('2028-07-14'),11);
    const ns=nonSaudi(100);t('Non-Saudi hazard minimum base',ns.base===400,ns.base,400);t('Non-Saudi hazard employer 2%',eq(ns.employer,8),ns.employer,8);
    const gy=legalYears(new Date(2024,0,1),new Date(2025,0,1),'gregorian');t('Gregorian exact service year',eq(gy,1),gy,1);
    const h1=fromHijri(1447,2,1),h2=fromHijri(1448,2,1);if(h1&&h2){const hy=legalYears(fromUTC(h1),fromUTC(h2),'hijri');t('Hijri exact service year',eq(hy,1),hy,1)}else t('Hijri exact service year',false,'conversion failed',1);
    t('Reject nonexistent 30 Muharram 1448',fromHijri(1448,1,30)===null,fromHijri(1448,1,30)?.toISOString()||null,null);
    const y=legalYears(new Date(2024,0,1),new Date(2025,0,1),'gregorian');t('Annual leave exact first year = 21 days',eq(annualLeave(y),21),annualLeave(y),21);t('EOS exact first year wage 12000 = 6000',eq(eos(12000,y),6000),eos(12000,y),6000);
    const sk=sickPay(10000,0,45);t('Sick 45-day allocation',sk.alloc[0]===30&&sk.alloc[1]===15&&sk.alloc[2]===0,sk.alloc,[30,15,0]);t('Sick 45-day pay',eq(sk.pay,13750),sk.pay,13750);
    const passed=tests.filter(x=>x.ok).length,failed=tests.length-passed;
    res.status(failed?500:200).json({ok:failed===0,passed,failed,tests});
  }catch(e){res.status(500).json({ok:false,error:String(e&&e.message||e)})}
}