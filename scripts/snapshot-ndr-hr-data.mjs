import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const BASE='https://ndr-ref-audit.vercel.app/api/data?name=';
const OUT=join(process.cwd(),'public','ndr-hr-v2','data');
const specs=[
  {name:'OCC',file:'occ.json',count:2122,kind:'Saudi Standard Classification of Occupations mapping'},
  {name:'NQ_DATA',file:'localization.json',count:15,kind:'Occupational localization decision map'},
  {name:'FINE_DATA',file:'fines.json',count:57,kind:'Labor violations and fines table'},
  {name:'VI_DATA',file:'discipline.json',count:50,kind:'Work-regulation disciplinary table'}
];

await mkdir(OUT,{recursive:true});
const manifest={generatedAt:new Date().toISOString(),source:'ndr-ref-audit snapshot adapter',datasets:{}};
for(const s of specs){
  const r=await fetch(BASE+encodeURIComponent(s.name),{headers:{accept:'application/json'}});
  if(!r.ok) throw new Error(`${s.name}: HTTP ${r.status}`);
  const j=await r.json();
  if(!Array.isArray(j.data)) throw new Error(`${s.name}: data is not an array`);
  if(j.data.length!==s.count) throw new Error(`${s.name}: expected ${s.count}, got ${j.data.length}`);
  const payload={name:s.name,kind:s.kind,count:j.data.length,snapshotAt:manifest.generatedAt,data:j.data};
  await writeFile(join(OUT,s.file),JSON.stringify(payload),'utf8');
  manifest.datasets[s.name]={file:s.file,count:j.data.length};
  console.log(`snapshot ${s.name}: ${j.data.length}`);
}
await writeFile(join(OUT,'manifest.json'),JSON.stringify(manifest,null,2),'utf8');
console.log('NDR HR data snapshot complete');