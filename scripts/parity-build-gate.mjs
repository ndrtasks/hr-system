import {readFile,writeFile} from 'node:fs/promises';

const REF='https://hr-tools.monef.workers.dev/';
const app=await readFile('public/ndr-hr-v2/app.js','utf8');
const adv=await readFile('public/ndr-hr-v2/advanced.js','utf8');
const know=await readFile('public/ndr-hr-v2/knowledge.js','utf8');

function extract(src,marker,open,close){const s=src.indexOf(marker);if(s<0)return null;const st=src.indexOf(open,s+marker.length);if(st<0)return null;let dep=0,str=null,esc=false;for(let i=st;i<src.length;i++){const c=src[i];if(str){if(esc){esc=false;continue}if(c==='\\'){esc=true;continue}if(c===str)str=null;continue}if(c==='"'||c==="'"||c==='`'){str=c;continue}if(c===open)dep++;else if(c===close){dep--;if(dep===0)return src.slice(st,i+1)}}return null}
const evaluate=txt=>Function('"use strict";return ('+txt+')')();
const rr=await fetch(REF,{cache:'no-store'});if(!rr.ok)throw new Error('Parity reference fetch failed: '+rr.status);
const src=await rr.text();
const calcs=evaluate(extract(src,'const CALCS','[',']'));
const groups=evaluate(extract(src,'const GROUPS','[',']'));
const refs=evaluate(extract(src,'const REFS','[',']'));
const quiz=evaluate(extract(src,'const QUIZ_BANK','{','}'));

const files={app,advanced:adv,knowledge:know};
const map={
 eos:['app',"id:'eos'"],leave:['app',"id:'leave'"],ot:['app',"id:'ot'"],notice:['app',"id:'art77'"],sick:['app',"id:'sick'"],fine:['advanced','calcFine'],viol:['advanced','calcViol'],gosi:['app',"id:'gosi'"],band:['advanced','calcBand'],hijri:['app',"id:'hijri'"],span:['app',"id:'service'"],add:['app',"id:'add'"],prof:['app',"id:'profession'"],nitaqat:['advanced','analyzeFile']
};
const groupMap={end:['app',"id:'eos'"],pay:['app',"id:'ot'"],pen:['advanced','calcFine'],nq:['advanced','calcBand'],time:['app',"id:'hijri'"],quiz:['knowledge','const Q='],ref:['knowledge','const REFS=']};
const calcItems=calcs.map(x=>{const m=map[x.id],ok=!!m&&files[m[0]].includes(m[1]);return{id:x.id,name:x.name,ok}});
const groupItems=groups.map(x=>{const m=groupMap[x.g],ok=!!m&&files[m[0]].includes(m[1]);return{id:x.g,name:x.title,ok}});
const refCount=(know.match(/\{t:'/g)||[]).length;
const quizCount=(know.match(/\{g:'/g)||[]).length;
const refQuiz=Object.values(quiz).reduce((n,x)=>n+(Array.isArray(x)?x.length:0),0);
const checks={
 calculators:calcItems.every(x=>x.ok)&&calcItems.length===calcs.length,
 groups:groupItems.every(x=>x.ok)&&groupItems.length===groups.length,
 references:refCount>=refs.length,
 quiz:quizCount>=refQuiz
};
const ok=Object.values(checks).every(Boolean);
const report={ok,generatedAt:new Date().toISOString(),checks,calculators:{reference:calcs.length,covered:calcItems.filter(x=>x.ok).length,items:calcItems},groups:{reference:groups.length,covered:groupItems.filter(x=>x.ok).length,items:groupItems},references:{reference:refs.length,v2:refCount},quiz:{reference:refQuiz,v2:quizCount,referenceCategories:Object.fromEntries(Object.entries(quiz).map(([k,v])=>[k,Array.isArray(v)?v.length:0]))}};
await writeFile('public/ndr-hr-v2/release-parity.json',JSON.stringify(report,null,2),'utf8');
console.log(`NDR HR build parity: ${report.calculators.covered}/${report.calculators.reference} tools; ${report.groups.covered}/${report.groups.reference} groups; ok=${ok}`);
if(!ok)throw new Error('Build parity gate failed');
