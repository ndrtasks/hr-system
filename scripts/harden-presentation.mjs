import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { transformWithEsbuild } from 'vite';

const root=path.resolve('dist/ndr-hr-intelligence');
const gateway='/api/presentation/gateway/';
const serviceRe=/https:\/\/ecaexxjfzujoesptzurd\.supabase\.co\/functions\/v1\/([a-z0-9-]+)/gi;
const serviceCode=(s)=>crypto.createHash('sha256').update(`ndr-presentation-gateway:${s}`).digest('hex').slice(0,12);

async function exists(p){try{await fs.access(p);return true}catch{return false}}
if(!(await exists(root)))process.exit(0);

const indexPath=path.join(root,'index.html');
const loaderPath=path.join(root,'loader.js');
const indexText=await fs.readFile(indexPath,'utf8');
const loaderText=await fs.readFile(loaderPath,'utf8');
const refRe=/\/ndr-hr-intelligence\/([^?"'`\s]+\.js)/g;
const active=new Set(['loader.js']);
for(const text of [indexText,loaderText]){
  let m;while((m=refRe.exec(text)))active.add(m[1]);
}

const names=await fs.readdir(root);
const jsNames=names.filter(n=>n.endsWith('.js'));
const activeNames=[...active].filter(n=>jsNames.includes(n));
const opaque=new Map(activeNames.map(name=>{
  const id=crypto.createHash('sha256').update(`ndr-presentation-20260901:${name}`).digest('hex').slice(0,16);
  return [name,`${id}.js`];
}));

function rewriteRefs(text){
  let out=String(text).replace(serviceRe,(_,slug)=>`${gateway}${serviceCode(String(slug).toLowerCase())}`);
  for(const [from,to] of opaque)out=out.split(`/ndr-hr-intelligence/${from}`).join(`/ndr-hr-intelligence/${to}`);
  return out;
}

function stripTechnicalMarkup(name,text){
  let out=String(text);
  if(name==='layout1.part')out=out.replace(/<button[^>]*data-page=["']integrationPage["'][\s\S]*?<\/button>/g,'');
  if(name==='layout4.part'){
    const i=out.indexOf('<section id="integrationPage"');
    if(i>=0)out=out.slice(0,i);
  }
  if(name==='layout5.part')out=out.replace(/^[\s\S]*?<\/section>(?=\s*<\/div>\s*<\/main>)/,'');
  return out;
}

for(const name of activeNames){
  const src=path.join(root,name);
  let code=await fs.readFile(src,'utf8');
  code=rewriteRefs(code).replace(/\/\/# sourceMappingURL=.*$/gm,'');
  const result=await transformWithEsbuild(code,name,{minify:true,sourcemap:false,legalComments:'none',charset:'utf8',target:'es2020'});
  await fs.writeFile(path.join(root,opaque.get(name)),result.code,'utf8');
}

for(const name of jsNames)await fs.unlink(path.join(root,name));

for(const name of await fs.readdir(root)){
  if(!/\.(html|part)$/i.test(name))continue;
  const p=path.join(root,name);
  let text=stripTechnicalMarkup(name,await fs.readFile(p,'utf8'));
  text=rewriteRefs(text);
  if(name==='index.html'&&!/name=["']robots["']/i.test(text))text=text.replace(/<head>/i,'<head><meta name="robots" content="noindex,nofollow,noarchive">');
  await fs.writeFile(p,text,'utf8');
}

async function removeMaps(dir){
  for(const ent of await fs.readdir(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory())await removeMaps(p);else if(ent.name.endsWith('.map'))await fs.unlink(p);
  }
}
await removeMaps(path.resolve('dist'));
console.log(`NDR presentation hardened: ${activeNames.length} active JavaScript assets kept, renamed and proxied; technical integration markup removed.`);
