import {readFile,writeFile} from 'node:fs/promises';
const P='public/ndr-hr-v2/academy.html';let s=await readFile(P,'utf8');
if(!s.includes('./academy-learning.css'))s=s.replace('<link rel="stylesheet" href="./academy.css">','<link rel="stylesheet" href="./academy.css"><link rel="stylesheet" href="./academy-learning.css">');
s=s.replace('<button data-view="home" class="active">الأكاديمية</button>','<button data-view="home" class="active">الأكاديمية</button><button data-view="theory">المعرفة المهنية</button>');
s=s.replace('<strong>8</strong><span>مسارات تشغيل</span>','<strong>14</strong><span>مسارات تشغيل</span>');
if(!s.includes('id="view-theory"')){const theory='<section id="view-theory" class="view"><div class="theory-head"><span class="micro">HR KNOWLEDGE FOUNDATIONS</span><h1>المعرفة التي تفسر<br><em>لماذا يتصرف الناس هكذا.</em></h1><p>نظريات ونماذج يحتاجها أخصائي الموارد البشرية لفهم الدافعية والعدالة والتعلم والقيادة والتغيير والتعويضات. كل مفهوم مربوط بتطبيق عملي وسؤال حالة، وليس تعريفا للحفظ.</p></div><div id="theoryGrid" class="theory-grid"></div></section>';
s=s.replace('<section id="view-exam" class="view">',theory+'<section id="view-exam" class="view">');}
if(!s.includes('./academy-learning.js'))s=s.replace('<script src="./academy.js"></script>','<script src="./academy.js"></script><script src="./academy-learning.js"></script>');
await writeFile(P,s,'utf8');console.log('NDR HR Academy v3: detailed learning shell linked');