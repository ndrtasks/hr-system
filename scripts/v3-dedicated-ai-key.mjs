import {readFile,writeFile} from 'node:fs/promises';
const files=['api/ndr-hr-ai.js','api/ndr-hr-quiz.js','api/ndr-hr-workshop.js','api/ndr-hr-ai-health.js'];
for(const p of files){
 let s=await readFile(p,'utf8');
 s=s.replaceAll('process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY','process.env.NDR_ACADEMY_GEMINI_API_KEY');
 await writeFile(p,s,'utf8');
}
console.log('NDR HR Academy v3: dedicated AI key required; generic project keys disabled');