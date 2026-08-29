(()=>{
  'use strict';
  if(window.__ndrQaDockGuard)return;window.__ndrQaDockGuard=true;
  const baseItems=[
    ['overview','◈','الرئيسية'],
    ['findingsPage','⌁','الحالات'],
    ['rulesPage','⬡','القواعد'],
    ['integrationPage','⇄','Odoo']
  ];
  let raf=0;
  function bindFallback(b,page){
    if(!b||b.dataset.ndrQaBound==='1')return;
    b.dataset.ndrQaBound='1';
    b.addEventListener('click',()=>{
      // app23 owns normal navigation. This listener is only a recovery path for a recreated/unbound item.
      if(typeof b.onclick==='function')return;
      try{if(typeof showPage==='function')showPage(page)}catch{}
    });
  }
  function ensureItems(nav){
    for(const [page,icon,label] of baseItems){
      let b=nav.querySelector(`button[data-page="${page}"]`);
      if(!b){
        b=document.createElement('button');
        b.dataset.page=page;
        b.innerHTML=`<span class="navicon">${icon}</span><span class="navtext">${label}</span>`;
        nav.appendChild(b);
      }
      bindFallback(b,page);
    }
  }
  function harden(){
    raf=0;
    const side=document.querySelector('.sidebar'),nav=side?.querySelector('.nav');
    if(!side||!nav)return false;
    ensureItems(nav);
    side.classList.add('ndr-dock-ready');
    nav.classList.add('ndr-dock-nav-ready');
    return true;
  }
  function schedule(){if(raf)return;raf=requestAnimationFrame(harden)}
  function clearAttendanceCaches(){
    try{
      for(let i=sessionStorage.length-1;i>=0;i--){
        const k=sessionStorage.key(i)||'';
        if(k.startsWith('ndr-attendance-cache-v3:')||k.startsWith('ndr-attendance-cache-v4:'))sessionStorage.removeItem(k);
      }
    }catch{}
  }
  (async()=>{
    for(let i=0;i<120;i++){
      if(harden())break;
      await new Promise(r=>setTimeout(r,50));
    }
    const root=document.getElementById('ndr-root')||document.body;
    // Child-list only: observing style/class attributes here can cause a self-triggering loop.
    const mo=new MutationObserver(schedule);
    mo.observe(root,{subtree:true,childList:true});
    window.addEventListener('ndr:attendance-view',schedule);
    window.addEventListener('ndr:attendance-changed',clearAttendanceCaches);
    window.addEventListener('ndr:audit-updated',e=>{
      const changed=Array.isArray(e?.detail?.changedSources)?e.detail.changedSources:[];
      if(changed.some(x=>['attendance','leaves','leaveTypes','planning','resources','employees','departments','calendarLines','calendarLeaves','calendars','companies','employeeVersions','contracts'].includes(x)))clearAttendanceCaches();
    });
    setTimeout(schedule,500);setTimeout(schedule,1600);
  })();
})();
