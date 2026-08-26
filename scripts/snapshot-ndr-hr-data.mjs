import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import {join} from 'node:path';

const BASE='https://ndr-ref-audit.vercel.app/api/data?name=';
const REF='https://hr-tools.monef.workers.dev/';
const OUT=join(process.cwd(),'public','ndr-hr-v2','data');
const VENDOR=join(process.cwd(),'public','ndr-hr-v2','vendor');
const specs=[
  {name:'OCC',file:'occ.json',count:2122,kind:'Saudi Standard Classification of Occupations mapping'},
  {name:'NQ_DATA',file:'localization.json',count:15,kind:'Occupational localization decision map'},
  {name:'FINE_DATA',file:'fines.json',count:57,kind:'Labor violations and fines table'},
  {name:'VI_DATA',file:'discipline.json',count:50,kind:'Work-regulation disciplinary table'}
];

await mkdir(OUT,{recursive:true});
await mkdir(VENDOR,{recursive:true});
await copyFile(join(process.cwd(),'node_modules','xlsx','dist','xlsx.full.min.js'),join(VENDOR,'xlsx.full.min.js'));
console.log('vendor XLSX: local copy ready');

const manifest={generatedAt:new Date().toISOString(),source:'validated build-time snapshots',datasets:{}};
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

/* Nitaqat activity constants are embedded in the reference implementation.
   Runtime does not call the reference: this is a build-time snapshot, validated
   against the official 41-activity annex in the 2026 Nitaqat Developer guide. */
const rr=await fetch(REF,{headers:{accept:'text/html'}});
if(!rr.ok) throw new Error(`NITAQAT source: HTTP ${rr.status}`);
const html=await rr.text();
const marker='const NB_DATA=';
const start=html.indexOf(marker);
if(start<0) throw new Error('NITAQAT: NB_DATA marker not found');
const arrStart=html.indexOf('[',start+marker.length);
let depth=0,inStr=false,esc=false,arrEnd=-1;
for(let i=arrStart;i<html.length;i++){
  const c=html[i];
  if(inStr){if(esc){esc=false;continue}if(c==='\\'){esc=true;continue}if(c==='"')inStr=false;continue}
  if(c==='"'){inStr=true;continue}
  if(c==='[')depth++;
  else if(c===']'){depth--;if(depth===0){arrEnd=i+1;break}}
}
if(arrStart<0||arrEnd<0) throw new Error('NITAQAT: array boundary not found');
const nitaqat=JSON.parse(html.slice(arrStart,arrEnd));
if(!Array.isArray(nitaqat)||nitaqat.length!==41) throw new Error(`NITAQAT: expected 41 activities, got ${nitaqat?.length}`);
for(const a of nitaqat){
  if(!a||typeof a.n!=='string'||!Array.isArray(a.b)||a.b.length!==4) throw new Error('NITAQAT: invalid activity shape');
  for(const row of a.b) if(!Array.isArray(row)||row.length!==4||row.some(x=>!Number.isFinite(x))) throw new Error(`NITAQAT: invalid row in ${a.n}`);
}
const np={name:'NB_DATA',kind:'Nitaqat Developer 2026-2028 activity constants',count:nitaqat.length,snapshotAt:manifest.generatedAt,data:nitaqat};
await writeFile(join(OUT,'nitaqat.json'),JSON.stringify(np),'utf8');
manifest.datasets.NB_DATA={file:'nitaqat.json',count:nitaqat.length};
console.log(`snapshot NB_DATA: ${nitaqat.length}`);

await writeFile(join(OUT,'manifest.json'),JSON.stringify(manifest,null,2),'utf8');
console.log('NDR HR data snapshot complete');