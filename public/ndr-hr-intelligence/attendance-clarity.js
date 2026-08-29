(()=>{
'use strict';
const q=id=>document.getElementById(id);
let raf=0;
function addStyle(){
  if(q('ndrAttendanceClarityStyle'))return;
  const s=document.createElement('style');
  s.id='ndrAttendanceClarityStyle';
  s.textContent='.ndr-missing-note{display:block!important;color:#d7b45e!important;font-size:8px!important;margin-top:3px!important;font-weight:700!important}';
  document.head.appendChild(s);
}
function clarifyRows(){
  raf=0;
  document.querySelectorAll('#attendancePage .att-status').forEach(el=>{
    const t=(el.textContent||'').trim();
    if(t==='غياب / لا توجد بصمة'||t==='لا توجد بصمة'){
      el.textContent='لا توجد بصمة في Odoo';
      const tr=el.closest('tr');
      const dateCell=tr?.querySelector('td:nth-child(3)');
      if(dateCell&&!dateCell.querySelector('.ndr-missing-note')){
        const x=document.createElement('small');x.className='ndr-missing-note';x.textContent='يوم عمل بدون سجل حضور';dateCell.appendChild(x);
      }
    }
  });
}
function schedule(){if(raf)return;raf=requestAnimationFrame(clarifyRows)}
async function boot(){
  for(let i=0;i<120;i++){if(q('attendancePage'))break;await new Promise(r=>setTimeout(r,80))}
  if(!q('attendancePage'))return;
  addStyle();clarifyRows();
  new MutationObserver(schedule).observe(q('attendancePage'),{childList:true,subtree:true});
}
boot();
})();