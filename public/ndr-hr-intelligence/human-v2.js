(()=>{
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function localizeLabels(){
    const map={
      'EXECUTIVE BRIEF':'الملخص التنفيذي',
      'HR HEALTH INDEX':'مؤشر صحة الموارد البشرية',
      'CONNECTED SOURCES':'مصادر Odoo المتصلة',
      'SECURE ODOO CONNECTION':'اتصال Odoo الآمن',
      'CONTROL CENTER':'مركز الرقابة'
    };
    document.querySelectorAll('.sectioneyebrow,.navlabel').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(map[t]) el.textContent=map[t];
    });
  }
  function buildCaseDock(){
    const ws=document.querySelector('#modalBack .caseworkspace');
    const body=ws?.querySelector('.casebody');
    const source=ws?.querySelector('.sourcebar');
    const footer=ws?.querySelector('.casefooter');
    if(!ws||!body||!source||!footer||ws.dataset.humanDock==='1')return;
    ws.dataset.humanDock='1';
    source.classList.add('human-source-dock');
    footer.classList.add('human-case-footer');
    ws.appendChild(source);
    ws.appendChild(footer);
    const open=document.getElementById('openSourceBtn');
    if(open)open.textContent='فتح مكان التعديل في Odoo ↗';
    const emp=document.getElementById('openEmployeeBtn');
    if(emp)emp.textContent='ملف الموظف في Odoo ↗';
    const summary=document.getElementById('openNdrEmployeeBtn');
    if(summary)summary.textContent='ملخص الموظف';
    const hint=document.getElementById('sourceHint');
    if(hint&&!hint.dataset.humanHint){hint.dataset.humanHint='1';hint.textContent='انتقل مباشرة إلى السجل الأصلي الذي أنشأ التنبيه.';}
  }
  function stripGimmicks(){
    document.querySelectorAll('.p5-live-sheen').forEach(x=>x.remove());
    document.querySelectorAll('.card').forEach(card=>{
      if(!card.matches('.healthcard,.executive,.connectioncard')){
        card.style.setProperty('--p5-rx','0deg');
        card.style.setProperty('--p5-ry','0deg');
      }
    });
  }
  async function boot(){
    for(let i=0;i<120;i++){
      if(document.getElementById('appShell')&&document.getElementById('modalBack'))break;
      await sleep(70);
    }
    if(!document.getElementById('appShell'))return;
    document.documentElement.classList.add('human-product-ui');
    localizeLabels();buildCaseDock();stripGimmicks();
    const root=document.getElementById('ndr-root');
    if(root){
      const mo=new MutationObserver(()=>requestAnimationFrame(()=>{localizeLabels();buildCaseDock();stripGimmicks();}));
      mo.observe(root,{childList:true,subtree:true});
    }
  }
  boot().catch(e=>console.warn('NDR Human UI:',e));
})();
