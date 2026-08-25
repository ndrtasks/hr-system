import { gunzipSync } from 'node:zlib';

const BASE='https://ndr-hr-tools-5okazrqhd-ndrs-projects-cfdc98d2.vercel.app';

export default async function handler(req,res){
  try{
    const share=String(req.query?.share||'').trim();
    let cookie='';
    let authStatus=null;
    if(share){
      const auth=await fetch(`${BASE}/?_vercel_share=${encodeURIComponent(share)}`,{redirect:'manual'});
      authStatus=auth.status;
      const sets=typeof auth.headers.getSetCookie==='function'?auth.headers.getSetCookie():[auth.headers.get('set-cookie')].filter(Boolean);
      cookie=sets.map(s=>String(s).split(';')[0]).filter(Boolean).join('; ');
      if(!cookie)throw new Error(`share handshake did not return auth cookie (HTTP ${auth.status})`);
    }
    const parts=await Promise.all(Array.from({length:12},(_,k)=>k+1).map(async i=>{
      const r=await fetch(`${BASE}/c${i}.txt`,{redirect:'manual',headers:cookie?{cookie}:{}});
      if(!r.ok)throw new Error(`chunk ${i}: HTTP ${r.status} ${r.headers.get('location')||''}`);
      const t=await r.text();
      if(i===1&&!t.trim().startsWith('H4sI'))throw new Error(`chunk 1 is not gzip-base64; content-type=${r.headers.get('content-type')||''}`);
      return t.replace(/\s+/g,'');
    }));
    let html=gunzipSync(Buffer.from(parts.join(''),'base64')).toString('utf8');
    const sourceLength=html.length;
    const patches=[];
    const exact=(before,after,label,required=true)=>{
      const count=html.split(before).length-1;
      patches.push({label,count,required});
      if(required&&count<1)throw new Error(`required patch not found: ${label}`);
      if(count)html=html.split(before).join(after);
    };

    exact("const years=(a,b)=>dayDiff(a,b)/365.2425;","const years=(a,b)=>ndrServiceYears(a,b);",'legal calendar anchor');
    exact("owner18  :{t:'إنتقال ملكية المنشأة (الفردية) إلى مالك جديد وفقاً للمادة 18', f:'full', n:FULL}","owner18  :{t:'إنهاء العامل لعدم موافقته كتابةً على انتقال حقوقه السابقة عند انتقال منشأة فردية وفق المادة 18', f:'full', n:'انتقال الملكية وحده لا ينهي العقد'}",'article18');
    exact("const Y = daysBetween(s,e)/365;","const Y = ndrServiceYears(s,e);",'annual leave service');
    exact("const yEnd = new Date(f.getFullYear()+1, f.getMonth(), f.getDate());","const yEnd = ndrAddLegalYears(f,1);",'sick year end');
    exact("const nEnd = new Date(st.getFullYear()+1, st.getMonth(), st.getDate());","const nEnd = ndrAddLegalYears(st,1);",'sick renewed year end');
    exact(`function gosiTierIndex(d){
  const julyYear = (d.getMonth() >= 6) ? d.getFullYear() : d.getFullYear()-1;
  return Math.max(0, Math.min(GOSI_TIERS.length-1, julyYear - 2024));
}`,`function gosiTierIndex(d){
  const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  if(x>=new Date(2028,6,14))return 4;
  if(x>=new Date(2027,6,1))return 3;
  if(x>=new Date(2026,6,1))return 2;
  if(x>=new Date(2025,6,1))return 1;
  return 0;
}`,'gosi exact dates');
    exact("const base = Math.min(Math.max(raw, GOSI_MIN), GOSI_MAX);\n  const capped = raw > GOSI_MAX, floored = raw < GOSI_MIN;","const minBase = cat==='nonsa'?400:GOSI_MIN;\n  const base = Math.min(Math.max(raw, minBase), GOSI_MAX);\n  const capped = raw > GOSI_MAX, floored = raw < minBase;",'gosi min base');
    exact("const d = mv ? new Date(mv+'-01T00:00:00') : new Date();","const d = mv ? new Date((mv.length===10?mv:mv+'-01')+'T00:00:00') : new Date();",'gosi exact date input');
    exact("  return best;\n}\nfunction fmtG(d)","  return null;\n}\nfunction fmtG(d)",'invalid hijri reject');
    exact("else if(u==='m') d.setMonth(d.getMonth()+n);\n  else d.setFullYear(d.getFullYear()+n);","else if(u==='m') ndrAddMonthsClamped(d,n);\n  else ndrAddYearsClamped(d,n);",'clamped date add');
    exact("لا تزيد فترة التجربة على 180 يوماً، ولا تُحتسب فيها إجازتا عيدي الفطر والأضحى ولا الإجازة المرضية.","لا تزيد فترة التجربة على 180 يوماً، ولا تُحتسب فيها إجازتا عيدي الفطر والأضحى، وإجازة اليوم الوطني، وإجازة يوم التأسيس، والإجازة المرضية.",'trial exclusions',false);

    const checks={
      allRequiredMatched:patches.filter(p=>p.required).every(p=>p.count>0),
      nitaqatUsesRound:html.includes('req = Math.round(a.t*st.rate);'),
      overtimeUsesTwoWages:html.includes('const otRate = hTotal + 0.5*hBasic;'),
      gosiSaned075:html.includes('SANED = 0.75'),
      gosiHazard2:html.includes('HAZARD = 2.00'),
      gosiMax45000:html.includes('GOSI_MAX = 45000'),
      sickTiersPresent:html.includes("{len:30, rate:1.00")&&html.includes("{len:60, rate:0.75")&&html.includes("{len:30, rate:0.00"),
      sscoFullMarker:html.includes('2122')
    };
    res.status(200).json({ok:true,authStatus,sourceLength,patchedLength:html.length,patches,checks});
  }catch(e){
    res.status(500).json({ok:false,error:String(e&&e.message||e)});
  }
}
