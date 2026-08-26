import {readFile,writeFile} from 'node:fs/promises';
for(const p of ['api/ndr-hr-ai.js','api/ndr-hr-quiz.js']){let s=await readFile(p,'utf8');s=s.replaceAll("model:'gemini-2.5-flash'","model:process.env.NDR_GEMINI_MODEL||'gemini-3.1-flash-lite'");await writeFile(p,s,'utf8')}
console.log('NDR HR Academy v3: Gemini default set to gemini-3.1-flash-lite with env override');