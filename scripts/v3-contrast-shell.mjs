import {readFile,writeFile} from 'node:fs/promises';
for(const p of ['public/ndr-hr-v2/index.html','public/ndr-hr-v2/academy.html']){
 let s=await readFile(p,'utf8');
 if(p.endsWith('academy.html')&&!s.includes('class="academy-page"'))s=s.replace('<body>','<body class="academy-page">');
 if(!s.includes('./v3-contrast.css'))s=s.replace('</head>','<link rel="stylesheet" href="./v3-contrast.css"></head>');
 await writeFile(p,s,'utf8');
}
console.log('NDR HR Academy v3: independent main/academy contrast palettes linked');