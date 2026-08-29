(()=>{
'use strict';
const q=id=>document.getElementById(id);
function addStyle(){
  if(q('ndrAttendanceClarityStyle'))return;
  const s=document.createElement('style');
  s.id='ndrAttendanceClarityStyle';
  s.textContent=`
  .ndr-att-clarity{margin:9px 0 14px;padding:10px 13px;border:1px solid rgba(111,194,157,.14);border-radius:10px;background:rgba(111,194,157,.045);color:#a9c2c8;font-size:9px;line-height:1.8}
  .ndr-att-clarity b{color:#c9e4dd}.ndr-missing-note{display:block!important;color:#c7ac72!important;font-size:7px!important;margin-top:3px!important;font-weight:700!important}
  `;
  document.head.appendChild(s);
}
function installNote(){
  const hint=document.querySelector('#attendancePage .att-modehint');
  if(!hint||q('ndrAttendanceClarity'))return;
  const n=document.createElement('div');
  n.id='ndrAttendanceClarity';
  n.className='ndr-att-clarity';
  n.innerHTML='<b>كيف يقرأ NDR الغياب؟</b> شاشة الحضور في Odoo تعرض السجلات الموجودة فقط. إذا كان اليوم يوم عمل ولا توجد له بصمة في Odoo، فلن يظهر كسطر داخل قائمة Odoo، بينما NDR يظهره هنا كحالة <b>«لا توجد بصمة في Odoo»</b> حتى تتم مراجعته.';
  hint.insertAdjacentElement('afterend',n);
}
function clarifyRows(){
  document.querySelectorAll('#attendancePage .att-status').forEach(el=>{
    const t=(el.textContent||'').trim();
    if(t==='غياب / لا توجد بصمة'||t==='لا توجد بصمة'){
      el.textContent='لا توجد بصمة في Odoo';
      const tr=el.closest('tr');
      const dateCell=tr?.querySelector('td:nth-child(3)');
      if(dateCell&&!dateCell.querySelector('.ndr-missing-note')){
        const x=document.createElement('small');
        x.className='ndr-missing-note';
        x.textContent='يوم عمل بدون سجل حضور';
        dateCell.appendChild(x);
      }
    }
  });
  const modeHint=q('attModeHint');
  if(modeHint&&q('attMode')?.value==='issues')modeHint.textContent='تظهر هنا الاستثناءات فقط. اليوم الذي يعتبر يوم عمل ولا يوجد له سجل في Odoo يظهر كـ «لا توجد بصمة في Odoo»؛ وهذا لا يعني أن Odoo أنشأ صف غياب.';
}
function run(){addStyle();installNote();clarifyRows()}
async function boot(){
  for(let i=0;i<120;i++){if(q('attendancePage'))break;await new Promise(r=>setTimeout(r,80))}
  if(!q('attendancePage'))return;
  run();
  const root=q('attendancePage');
  new MutationObserver(()=>run()).observe(root,{childList:true,subtree:true,characterData:true});
  q('attMode')?.addEventListener('change',()=>setTimeout(run,0));
}
boot();
})();