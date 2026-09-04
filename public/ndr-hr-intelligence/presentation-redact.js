(()=>{
'use strict';
if(!location.pathname.includes('/ndr-hr-presentation/'))return;
if(window.__ndrPresentationRedact)return;window.__ndrPresentationRedact=true;

const simplePreview=()=>{
  const el=document.getElementById('attBulkPreview');
  if(!el)return;
  const text=el.textContent||'';
  const emp=(text.match(/تم اختيار\s*(\d+)/)||[])[1];
  const days=(text.match(/و\s*(\d+)\s*يوم/)||[])[1];
  const count=(text.match(/حتى\s*(\d+)\s*سجل/)||[])[1];
  const time=(text.match(/الدوام:\s*([^\n]+)/)||[])[1];
  if(emp&&days&&count)el.innerHTML=`تم اختيار <b>${emp}</b> موظف و<b>${days}</b> يوم = <b>${count}</b> سجل${time?`<br>الوقت: <b>${time}</b>`:''}`;
};

function redact(){
  document.querySelectorAll('.att-bulksafe,.abp-note,.abp-planning,.abp-warning').forEach(el=>el.remove());
  const p=document.querySelector('.att-bulkhead p');
  if(p)p.textContent='اختر الموظفين والفترة والوقت';
  simplePreview();
  document.querySelectorAll('[data-ndr-method-note]').forEach(el=>el.remove());
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
new MutationObserver(redact).observe(document.body,{childList:true,subtree:true,characterData:true});
})();
