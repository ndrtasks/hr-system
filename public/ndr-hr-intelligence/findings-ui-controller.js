(()=>{
  'use strict';
  if(window.__ndrFindingsUiController)return;window.__ndrFindingsUiController=true;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const safe=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>typeof number==='function'?number(v):String(Number(v||0));
  const iconMap={'الحضور':'◷','العقود':'▣','الإجازات':'◇','الوثائق':'⌁','دورة الموظف':'◎','الرواتب والإضافي':'◈'};

  function openRows(){
    const rows=state?.data?.findings||[];
    return typeof isOpen==='function'?rows.filter(isOpen):rows;
  }
  function summary(list){
    const people=new Set(list.map(f=>f.employeeRef?.id||f.employee));
    const types=new Map();list.forEach(f=>types.set(f.title,(types.get(f.title)||0)+1));
    const breakdown=[...types.entries()].sort((a,b)=>b[1]-a[1]).slice(0,2).map(([t,c])=>`${num(c)} ${t}`).join(' • ');
    const highest=list.some(f=>f.severity==='critical')?'توجد حالة حرجة':list.some(f=>f.severity==='high')?'توجد أولوية عالية':'ملاحظات تشغيلية';
    return{people:people.size,breakdown,highest};
  }
  function bindGroupClicks(host){
    host.querySelectorAll('[data-group-open],[data-group]').forEach(el=>{
      el.onclick=e=>{
        const cat=el.dataset.groupOpen||el.dataset.group;
        if(typeof setCategory==='function')setCategory(cat);
        else{state.category=cat||'all';state.page=1;if(typeof renderFindings==='function')renderFindings();}
        e.stopPropagation();
      };
    });
  }
  function repairGroups(){
    const host=document.getElementById('caseGroups');if(!host||!state?.data)return;
    if(host.querySelector('.casegroup')){bindGroupClicks(host);return;}
    const rows=openRows(),preferred=['الحضور','العقود','الإجازات','الوثائق','دورة الموظف'];
    const cats=[...new Set(rows.map(f=>f.category).filter(Boolean))].sort((a,b)=>{
      const ai=preferred.indexOf(a),bi=preferred.indexOf(b);return (ai<0?99:ai)-(bi<0?99:bi)||String(a).localeCompare(String(b),'ar');
    });
    host.innerHTML=cats.map(cat=>{
      const list=rows.filter(f=>f.category===cat),g=summary(list);
      return `<div class="card casegroup" data-group="${safe(cat)}"><div class="casegrouphead"><div class="casegroupicon">${safe(iconMap[cat]||'◎')}</div><div class="casegroupcount"><b>${num(g.people)}</b><span>موظف متأثر</span></div></div><h4>${safe(cat)}</h4><p>${safe(g.breakdown||`${num(list.length)} حالة`)}</p><div class="casegroupfoot"><span>${safe(g.highest)}</span><button type="button" data-group-open="${safe(cat)}">عرض الحالات ←</button></div></div>`;
    }).join('')||'<div class="empty">لا توجد مجموعات حالات مفتوحة.</div>';
    bindGroupClicks(host);
  }
  function repairRows(){
    document.querySelectorAll('#findingsPage .finding').forEach(row=>{
      const sev=row.getAttribute('data-sev')||row.dataset.severity||'medium';
      row.setAttribute('data-sev',sev);
    });
  }
  function repairAll(){repairGroups();repairRows();}

  (async()=>{
    for(let i=0;i<160;i++){
      if(typeof state!=='undefined'&&document.getElementById('findingsPage')&&typeof renderFindings==='function'&&typeof renderCaseGroups==='function')break;
      await sleep(50);
    }
    if(typeof state==='undefined'||typeof renderFindings!=='function'||typeof renderCaseGroups!=='function')return;

    const baseGroups=renderCaseGroups;
    renderCaseGroups=function(){const r=baseGroups.apply(this,arguments);queueMicrotask(repairGroups);return r;};
    const baseFindings=renderFindings;
    renderFindings=function(){const r=baseFindings.apply(this,arguments);queueMicrotask(repairRows);return r;};

    if(state.data){try{renderCaseGroups();renderFindings();}catch(e){console.warn('NDR findings repair:',e)}}
    window.addEventListener('ndr:audit-updated',()=>requestAnimationFrame(repairAll));
    document.addEventListener('click',e=>{if(e.target?.closest?.('[data-page="findingsPage"]'))setTimeout(repairAll,40);});
    const host=document.getElementById('allFindings');if(host)new MutationObserver(()=>repairRows()).observe(host,{childList:true,subtree:false});
    setTimeout(repairAll,250);
  })();
})();