import {readFile,writeFile} from 'node:fs/promises';
const [html,learning,learnCss,contrast,ai,quiz,workshop]=await Promise.all(['public/ndr-hr-v2/academy.html','public/ndr-hr-v2/academy-learning.js','public/ndr-hr-v2/academy-learning.css','public/ndr-hr-v2/v3-contrast.css','api/ndr-hr-ai.js','api/ndr-hr-quiz.js','api/ndr-hr-workshop.js'].map(p=>readFile(p,'utf8')));
let syntax=true,syntaxError='';try{new Function(learning)}catch(e){syntax=false;syntaxError=e.message}
const theories=['ماسلو','هيرزبرغ','فروم','العدالة','ماكغريغور','العقد النفسي','الكفاءات','9-Box','كيركباتريك','ADDIE','SMART','بلوم'];
const checks={
 syntax,
 theoryView:html.includes('view-theory')&&html.includes('المعرفة المهنية'),
 theoryDepth:theories.filter(x=>learning.includes(x)).length>=10,
 lessonScript:html.includes('./academy-learning.js'),lessonStyle:html.includes('./academy-learning.css'),contrastLinked:html.includes('./v3-contrast.css'),academyPalette:html.includes('academy-page'),
 detailedFlow:learning.includes('وش الموضوع؟')&&learning.includes('وش يقول النظام أو السياسة؟')&&learning.includes('وش الأوراق أو البيانات اللي تحتاجها؟')&&learning.includes('انتبه من هذي الأخطاء')&&learning.includes('شوف الفرق بين مثال غلط ومثال صحيح')&&learning.includes('جرب بنفسك')&&learning.includes('اختبار الوحدة'),
 clearSelfCheck:learning.includes('علّم فقط على الأشياء اللي فعلا سويتها')&&learning.includes('الأشياء اللي سويتها'),
 completionGate:learning.includes("correct>=2")&&learning.includes("trim().length>=80")&&learning.includes("s.passed=true"),
 jobAdExample:learning.includes('إعلان وظيفي دقيق')&&learning.includes('المسمى: أخصائي موارد بشرية')&&learning.includes('اكتب إعلان وظيفي كامل كأنك بتنشره اليوم'),
 aiWorkshop:learning.includes('/api/ndr-hr-workshop')&&workshop.includes('gemini-3.1-flash-lite'),
 piiRedaction:workshop.includes('هوية محجوبة')&&workshop.includes('جوال محجوب')&&workshop.includes('بريد محجوب'),
 freeModel:ai.includes("gemini-3.1-flash-lite")&&quiz.includes("gemini-3.1-flash-lite"),
 modelOverride:ai.includes('NDR_GEMINI_MODEL')&&quiz.includes('NDR_GEMINI_MODEL')&&workshop.includes('NDR_GEMINI_MODEL'),
 contrast:contrast.includes('academy-page')&&contrast.includes('float-card')&&learnCss.includes('--learnMuted:#c5d3df'),
 tracksCoverage:(learning.match(/n:'(?:01|02|03|04|05|06|07|08|09|10|11|12|13|14)'/g)||[]).length===14
};
const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);const report={ok:!failed.length,generatedAt:new Date().toISOString(),checks,failed,syntaxError,metrics:{tracks:14,theories:theories.filter(x=>learning.includes(x)).length,moduleCompletion:'write answer + self-check + >=2/3 quiz',aiDefault:'gemini-3.1-flash-lite',piiRedaction:true,language:'plain Arabic'}};await writeFile('public/ndr-hr-v2/academy-v3-learning-audit.json',JSON.stringify(report,null,2),'utf8');console.log(`NDR HR detailed learning gate: ${Object.keys(checks).length-failed.length}/${Object.keys(checks).length}; failures=${failed.length}`);if(failed.length)throw new Error('Detailed learning gate failed: '+failed.join(', ')+' '+syntaxError);