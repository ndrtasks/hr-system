import {readFile,writeFile} from 'node:fs/promises';
const p='public/ndr-hr-v2/academy.html';let s=await readFile(p,'utf8');
for(const css of ['./academy-mastery.css','./academy-judgments.css','./academy-units.css','./academy-unit-quiz.css','./academy-plan.css','./academy-projects.css','./academy-cloud-sync.css'])if(!s.includes(css))s=s.replace('</head>',`<link rel="stylesheet" href="${css}"></head>`);
if(!s.includes('href="./coach.html"'))s=s.replace('<button data-view="ai">المساعد الذكي</button>','<button data-view="ai">المساعد الذكي</button><a href="./coach.html">لوحة المدرب</a>');
const scripts=['./academy-mastery.js','./academy-unit-data-1.js','./academy-unit-data-2.js','./academy-unit-data-3.js','./academy-unit-data-4.js','./academy-units.js','./academy-unit-quiz.js','./academy-mastery-routing.js','./academy-plan.js','./academy-projects.js','./academy-judgments.js','./academy-cloud-sync.js'];
for(const src of scripts)if(!s.includes(src))s=s.replace('</body>',`<script src="${src}"></script></body>`);
await writeFile(p,s,'utf8');console.log('NDR HR Academy v4: mastery + 56 units + quizzes + adaptive plan + level projects + judgments + coach sync linked');