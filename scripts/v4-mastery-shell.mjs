import {readFile,writeFile} from 'node:fs/promises';
const p='public/ndr-hr-v2/academy.html';let s=await readFile(p,'utf8');
if(!s.includes('./academy-mastery.css'))s=s.replace('</head>','<link rel="stylesheet" href="./academy-mastery.css"></head>');
if(!s.includes('./academy-judgments.css'))s=s.replace('</head>','<link rel="stylesheet" href="./academy-judgments.css"></head>');
if(!s.includes('./academy-mastery.js'))s=s.replace('</body>','<script src="./academy-mastery.js"></script></body>');
if(!s.includes('./academy-mastery-routing.js'))s=s.replace('</body>','<script src="./academy-mastery-routing.js"></script></body>');
if(!s.includes('./academy-judgments.js'))s=s.replace('</body>','<script src="./academy-judgments.js"></script></body>');
await writeFile(p,s,'utf8');console.log('NDR HR Academy v4: mastery + judicial learning linked');