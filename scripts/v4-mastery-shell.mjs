import {readFile,writeFile} from 'node:fs/promises';
const p='public/ndr-hr-v2/academy.html';let s=await readFile(p,'utf8');
if(!s.includes('./academy-mastery.css'))s=s.replace('</head>','<link rel="stylesheet" href="./academy-mastery.css"></head>');
if(!s.includes('./academy-mastery.js'))s=s.replace('</body>','<script src="./academy-mastery.js"></script></body>');
await writeFile(p,s,'utf8');console.log('NDR HR Academy v4: mastery engine linked');