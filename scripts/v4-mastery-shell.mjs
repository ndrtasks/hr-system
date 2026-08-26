import {readFile,writeFile} from 'node:fs/promises';
const p='public/ndr-hr-v2/academy.html';let s=await readFile(p,'utf8');
for(const css of ['./academy-mastery.css','./academy-judgments.css','./academy-units.css'])if(!s.includes(css))s=s.replace('</head>',`<link rel="stylesheet" href="${css}"></head>`);
const scripts=['./academy-mastery.js','./academy-unit-data-1.js','./academy-unit-data-2.js','./academy-unit-data-3.js','./academy-unit-data-4.js','./academy-units.js','./academy-mastery-routing.js','./academy-judgments.js'];
for(const src of scripts)if(!s.includes(src))s=s.replace('</body>',`<script src="${src}"></script></body>`);
await writeFile(p,s,'utf8');console.log('NDR HR Academy v4: mastery + 56 units + judicial learning linked');