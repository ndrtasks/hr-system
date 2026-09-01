import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { transformWithEsbuild } from 'vite';

const root=path.resolve('dist/ndr-hr-intelligence');
const gateway='/api/presentation/gateway/';
const remote='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/';

async function exists(p){try{await fs.access(p);return true}catch{return false}}
if(!(await exists(root)))process.exit(0);

const names=await fs.readdir(root);
const jsNames=names.filter(n=>n.endsWith('.js'));
const opaque=new Map(jsNames.map(name=>{
  const id=crypto.createHash('sha256').update(`ndr-presentation-20260901:${name}`).digest('hex').slice(0,16);
  return [name,`${id}.js`];
}));

function rewriteRefs(text){
  let out=String(text).split(remote).join(gateway);
  for(const [from,to] of opaque){
    out=out.split(`/ndr-hr-intelligence/${from}`).join(`/ndr-hr-intelligence/${to}`);
  }
  return out;
}

for(const name of jsNames){
  const src=path.join(root,name);
  let code=await fs.readFile(src,'utf8');
  code=rewriteRefs(code).replace(/\/\/# sourceMappingURL=.*$/gm,'');
  const result=await transformWithEsbuild(code,name,{minify:true,sourcemap:false,legalComments:'none',charset:'utf8',target:'es2020'});
  const dest=path.join(root,opaque.get(name));
  await fs.writeFile(dest,result.code,'utf8');
  if(dest!==src)await fs.unlink(src);
}

for(const name of await fs.readdir(root)){
  if(!/\.(html|part)$/i.test(name))continue;
  const p=path.join(root,name);
  let text=rewriteRefs(await fs.readFile(p,'utf8'));
  if(name==='index.html'&&!/name=["']robots["']/i.test(text)){
    text=text.replace(/<head>/i,'<head><meta name="robots" content="noindex,nofollow,noarchive">');
  }
  await fs.writeFile(p,text,'utf8');
}

async function removeMaps(dir){
  for(const ent of await fs.readdir(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory())await removeMaps(p);else if(ent.name.endsWith('.map'))await fs.unlink(p);
  }
}
await removeMaps(path.resolve('dist'));
console.log(`NDR presentation hardened: ${jsNames.length} JavaScript assets obfuscated and proxied.`);
