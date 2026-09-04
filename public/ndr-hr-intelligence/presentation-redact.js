(()=>{
'use strict';
if(!location.pathname.includes('/ndr-hr-presentation/'))return;
if(window.__ndrPresentationRedact)return;window.__ndrPresentationRedact=true;
let queued=false;

function simplePreview(){
  const el=document.getElementById('attBulkPreview');
  if(!el)return;
  const text=el.textContent||'';
  if(!text.includes('قبل فحص جداول الدوام والاستثناءات'))return;
  const emp=(text.match(/تم اختيار\s*(\d+)/)||[])[1];
  const days=(text.match(/و\s*(\d+)\s*يوم/)||[])[1];
  const count=(text.match(/حتى\s*(\d+)\s*سجل/)||[])[1];
  const time=(text.match(/الدوام:\s*([^\n]+)/)||[])[1];
  if(emp&&days&&count)el.innerHTML=`تم اختيار <b>${emp}</b> موظف و<b>${days}</b> يوم = <b>${count}</b> سجل${time?`<br>الوقت: <b>${time}</b>`:''}`;
}

function redact(){
  document.querySelectorAll('.att-bulksafe,.abp-note,.abp-planning,.abp-warning,[data-ndr-method-note]').forEach(el=>el.remove());
  const p=document.querySelector('.att-bulkhead p');
  if(p&&p.textContent!=='اختر الموظفين والفترة والوقت')p.textContent='اختر الموظفين والفترة والوقت';
  simplePreview();
}
function schedule(){
  if(queued)return;queued=true;
  requestAnimationFrame(()=>{queued=false;redact()});
}

const originalConfirm=window.confirm.bind(window);
window.confirm=(msg)=>{
  let text=String(msg||'');
  if(text.includes('Planning والإجازات')||text.includes('NDR سيتحقق من جدول كل موظف')){
    const n=(text.match(/(?:إضافة|تجهيز)\s*(\d+)\s*سجل/)||[])[1];
    text=n?`سيتم إضافة ${n} سجل إلى Odoo. اعتماد؟`:'تأكيد الإضافة إلى Odoo؟';
  }
  return originalConfirm(text);
};

redact();
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
})();
