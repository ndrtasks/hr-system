(()=>{
  const CATEGORY_ORDER=['الحضور','الإجازات','العقود','الوثائق','دورة الموظف','الرواتب والإضافي'];
  const ICONS={'الحضور':'◷','الإجازات':'◇','العقود':'▣','الوثائق':'⌁','دورة الموظف':'◎','الرواتب والإضافي':'◈'};
  const SEV_ORDER={critical:4,high:3,medium:2,low:1};
  const sevLabel=s=>({critical:'حرجة',high:'عالية',medium:'متوسطة',low:'منخفضة'}[s]||s||'');
  const e=s=>typeof escapeHtml==='function'?escapeHtml(s):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n=v=>typeof number==='function'?number(v):String(v??0);
  const key=f=>typeof findingKey==='function'?findingKey(f):`${f.code}:${f.ref?.model||''}:${f.ref?.id||''}`;
  const isCaseOpen=f=>typeof isOpen==='function'?isOpen(f):true;

  function remainingMetric(detail){
    const text=String(detail||'');
    const m=text.match(/متبقي\s+([0-9٠-٩]+)\s*يوم/);
    if(!m)return'';
    return `<span class="cb-days"><b>${e(m[1])}</b><small>يوم متبقي</small></span>`;
  }

  function caseCard(f){
    const k=key(f),metric=remainingMetric(f.detail),trend=f.trend==='repeat'?'متكررة':'جديدة';
    return `<article class="cb-case" data-sev="${e(f.severity)}">
      <div class="cb-case-top">
        <div class="cb-badges"><span class="cb-sev ${e(f.severity)}">${e(sevLabel(f.severity))}</span><span class="cb-trend ${f.trend==='repeat'?'repeat':'new'}">${trend}</span><span class="cb-code">${e(f.code)}</span></div>
        <input class="casecheck cb-check" type="checkbox" data-select="${e(k)}" ${state?.selected?.has?.(k)?'checked':''} aria-label="تحديد الحالة">
      </div>
      <div class="cb-case-main">
        <div class="cb-copy">
          <h5>${e(f.title)}</h5>
          <button class="employeejump cb-employee" data-employee="${e(String(f.employeeRef?.id||''))}" data-employee-name="${e(f.employee)}">${e(f.employee)}</button>
          <p>${e(f.detail)}</p>
        </div>
        ${metric}
      </div>
      <div class="cb-case-foot"><span>${e(typeof caseNumber==='function'?caseNumber(f):f.code)} • ${e(f.category||'')}</span><button class="cb-open" data-open="${e(k)}">فتح الحالة ←</button></div>
    </article>`;
  }

  function groupCard(category,list){
    const people=new Set(list.map(f=>f.employeeRef?.id||f.employee)).size;
    const critical=list.filter(f=>f.severity==='critical').length,high=list.filter(f=>f.severity==='high').length;
    const sorted=[...list].sort((a,b)=>(SEV_ORDER[b.severity]||0)-(SEV_ORDER[a.severity]||0));
    return `<section class="cb-group" data-category="${e(category)}">
      <header class="cb-group-head">
        <div class="cb-group-title"><span class="cb-group-icon">${ICONS[category]||'◆'}</span><div><h4>${e(category)}</h4><p>${n(list.length)} حالة • ${n(people)} موظف</p></div></div>
        <div class="cb-group-risk">${critical?`<span class="critical">${n(critical)} حرجة</span>`:''}${high?`<span class="high">${n(high)} عالية</span>`:''}</div>
      </header>
      <div class="cb-items">${sorted.map(caseCard).join('')}</div>
    </section>`;
  }

  function bindBoard(host){
    host.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{try{openFinding(b.dataset.open)}catch{}});
    host.querySelectorAll('.cb-employee').forEach(b=>b.onclick=()=>{try{openEmployee(b.dataset.employee?Number(b.dataset.employee):null,b.dataset.employeeName)}catch{}});
    host.querySelectorAll('[data-select]').forEach(x=>x.onchange=()=>{
      try{const k=x.dataset.select;if(x.checked)state.selected.add(k);else state.selected.delete(k);if(typeof renderBulk==='function')renderBulk();}catch{}
    });
  }

  function renderBoard(){
    const host=document.getElementById('topFindings');
    if(!host||typeof state==='undefined'||!state.data)return;
    const open=(state.data.findings||[]).filter(isCaseOpen);
    const map=new Map();
    open.forEach(f=>{const c=f.category||'أخرى';if(!map.has(c))map.set(c,[]);map.get(c).push(f)});
    const cats=[...CATEGORY_ORDER.filter(c=>map.has(c)),...[...map.keys()].filter(c=>!CATEGORY_ORDER.includes(c))];
    host.className='caseboard-grid';
    host.innerHTML=cats.length?cats.map(c=>groupCard(c,map.get(c))).join(''):'<div class="cb-empty">ممتاز — لا توجد حالات مفتوحة حاليا.</div>';
    bindBoard(host);
    const section=host.closest('.section');
    if(section){
      section.classList.add('caseboard-section');
      const h=section.querySelector('.sectionhead h3'); if(h)h.textContent='الحالات المفتوحة — أمامك في شاشة واحدة';
      const p=section.querySelector('.sectionhead p'); if(p)p.textContent='مقسمة حسب المجال، والأعلى خطورة يظهر أولا. اضغط على أي حالة لفتح التفاصيل من جانب الشاشة.';
      const a=section.querySelector('.sectionaction'); if(a)a.style.display='none';
      section.id='overviewCaseBoard';
    }
  }

  const oldRender=typeof renderFindings==='function'?renderFindings:null;
  if(oldRender){
    renderFindings=function(){oldRender();renderBoard();};
  }

  function openBoard(){
    const overview=document.getElementById('overview');
    if(!overview)return;
    document.querySelectorAll('.panelpage').forEach(p=>p.classList.toggle('active',p===overview));
    document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
    const nav=document.querySelector('.nav [data-page="findingsPage"]'); if(nav)nav.classList.add('active');
    const t=document.getElementById('pageTitle'); if(t)t.textContent='الحالات والمخاطر';
    const c=document.getElementById('crumbTitle'); if(c)c.textContent='CASES';
    const g=document.getElementById('generated'); if(g&&state?.data?.generatedAt)g.textContent=`آخر تدقيق ${new Date(state.data.generatedAt).toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'})}`;
    setTimeout(()=>document.getElementById('overviewCaseBoard')?.scrollIntoView({behavior:'smooth',block:'start'}),30);
  }

  function installNavigation(){
    const nav=document.querySelector('.nav [data-page="findingsPage"]');
    if(nav){nav.onclick=e=>{e.preventDefault();openBoard();};}
    document.querySelectorAll('[data-jump="findingsPage"]').forEach(b=>b.onclick=e=>{e.preventDefault();openBoard();});
  }

  function boot(){
    installNavigation();
    if(typeof state!=='undefined'&&state.data)renderBoard();
    const target=document.getElementById('ndr-root');
    if(target){new MutationObserver(()=>{installNavigation();if(typeof state!=='undefined'&&state.data&&document.getElementById('topFindings')&&!document.querySelector('.cb-group'))renderBoard();}).observe(target,{childList:true,subtree:true});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));else setTimeout(boot,0);
})();
