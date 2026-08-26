import {readFile,writeFile} from 'node:fs/promises';
const patches={
'public/ndr-hr-v2/academy-unit-data-1.js':[
['صمم جدول أول يوم من 9:00 إلى 3:00.','صمم جدول اليوم الأول من 9:00 إلى 3:00، وحدد في كل فترة من يستقبل الموظف، وش الهدف من النشاط، وش الدليل اللي يثبت أن الموظف فهم المطلوب وصار يعرف وش يسوي بعدها.']
],
'public/ndr-hr-v2/academy-unit-data-2.js':[
['اكتب PIP واقعي لهذه الحالة.','اكتب خطة تحسين أداء PIP كاملة لهذه الحالة: الهدف الواقعي، مدة الخطة، الدعم اللي بتوفره، مواعيد المراجعة، وكيف تتصرف إذا تحسن الموظف أو ما تحسن بدون افتراض فصل تلقائي.']
],
'public/ndr-hr-v2/academy-unit-data-3.js':[
['ابن خريطة لـ6 منصات المذكورة.','ابن خريطة تشغيل للمنصات الست المذكورة، وحدد لكل منصة الإجراء، المسؤول، البديل، الصلاحية، الموعد أو التكرار، والدليل اللي تحتفظ فيه بعد التنفيذ.'],
['صمم هيكل ملف موظف وفئات الصلاحية.','صمم هيكل ملف موظف عملي، وقسم المستندات حسب حساسيتها، وحدد من يطلع على كل فئة، سبب الاحتفاظ بها، ومتى تراجع أو تتلف إذا انتهى الغرض النظامي.']
],
'public/ndr-hr-v2/academy-unit-data-4.js':[
['لا يوجد بسط أو مقام.','لا يوجد تعريف للبسط أو المقام، لذلك النسبة لا يمكن تدقيقها أو إعادة احتسابها من شخص آخر.']
]
};
let count=0;
for(const [file,list] of Object.entries(patches)){
 let s=await readFile(file,'utf8');
 for(const [from,to] of list){
  const n=s.split(from).length-1;
  if(n!==1)throw new Error(`Depth patch expected exactly 1 match in ${file}: ${from}; found ${n}`);
  s=s.replace(from,to);count++;
 }
 await writeFile(file,s,'utf8');
}
console.log(`NDR HR v4: deepened ${count} remaining unit content items`);