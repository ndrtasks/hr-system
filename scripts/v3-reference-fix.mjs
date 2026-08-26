import {readFile,writeFile} from 'node:fs/promises';
const CURRENT='https://www.hrsd.gov.sa/knowledge-centre/decisions-and-regulations/regulation-and-procedures/%D9%86%D8%B8%D8%A7%D9%85-%D8%A7%D9%84%D8%B9%D9%85%D9%84';
const OLD='https://www.hrsd.gov.sa/knowledge-centre/articles/64407';
for(const p of ['public/ndr-hr-v2/app.js','public/ndr-hr-v2/knowledge.js']){
 let s=await readFile(p,'utf8');
 const before=(s.match(new RegExp(OLD.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
 s=s.split(OLD).join(CURRENT);
 if(before<1)console.warn('v3 ref fix: old HRSD link not found in '+p);
 await writeFile(p,s,'utf8');
}
console.log('NDR HR v3 reference URLs updated to current HRSD Labor Law page');