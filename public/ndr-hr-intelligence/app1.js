const LIVE_API='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-hr-audit-v4';
const $ = id => document.getElementById(id);

const loadJson=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??fallback}catch{return fallback}};
const legacyResolved=loadJson('ndr-resolved',[]);
let state={
  data:null,filter:'all',category:'all',issue:'all',status:'open',search:'',page:1,pageSize:25,current:null,currentEmployee:null,
  demo:false,connected:false,selected:new Set(),
  resolutions:loadJson('ndr-resolution-map',Object.fromEntries(Array.isArray(legacyResolved)?legacyResolved.map(k=>[k,'legacy']):[])),
  exceptions:loadJson('ndr-exception-map',{}),
  seen:loadJson('ndr-case-seen',{}),delta:{fresh:0,repeat:0,cleared:0},hasPrevious:false,
  policyOverrides:loadJson('ndr-policy-overrides',null),ruleConfig:loadJson('ndr-rule-config',{}),scenario:'standard',
  connection:{baseUrl:localStorage.getItem('ndr-odoo-url')||'https://hrhrh1.odoo.com',database:localStorage.getItem('ndr-odoo-db')||'',apiKey:''}
};

const sevAr={critical:'حرجة',high:'عالية',medium:'متوسطة',low:'منخفضة'};
const confAr={high:'مرتفعة',medium:'متوسطة',low:'منخفضة'};
const sevRank={critical:4,high:3,medium:2,low:1};
const pageTitles={overview:['مركز الرقابة','OVERVIEW'],findingsPage:['الحالات والمخاطر','FINDINGS'],rulesPage:['محرك القواعد','RULES ENGINE'],integrationPage:['ربط Odoo','ODOO CONNECTION']};
const categoryIcon={'الحضور':'◷','العقود':'▣','الإجازات':'◇','الوثائق':'⌁','دورة الموظف':'◎','الرواتب والإضافي':'◈'};
const sourceAr={'hr.attendance':'سجل حضور','hr.contract':'عقد','hr.leave':'إجازة','hr.employee':'ملف موظف'};

function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600);}
function number(v){return new Intl.NumberFormat('ar-SA').format(Number(v||0));}
function findingKey(f){return `${f.code}:${f.ref?.model||''}:${f.ref?.id||''}`;}
function caseNumber(f){return `NDR-${f.code}-${String(f.ref?.id||0).padStart(4,'0')}`;}
function isResolved(f){return !!state.resolutions[findingKey(f)];}
function isException(f){return !!state.exceptions[findingKey(f)];}
function isOpen(f){return !isResolved(f)&&!isException(f);}
function currentOccurrence(f){return state.seen[findingKey(f)]?.count||1;}

function syncConnectionInputs(){
  if($('connectionUrl'))$('connectionUrl').value=state.connection.baseUrl||'';
  if($('connectionDb'))$('connectionDb').value=state.connection.database||'';
  if($('connectionKey'))$('connectionKey').value=state.connection.apiKey||'';
  updateSecretState();
}
function updateSecretState(){
  const el=$('secretState');if(!el)return;
  const has=!!String($('connectionKey')?.value||state.connection.apiKey||'').trim();
  el.textContent=has?'مفتاح تجريبي جاهز للاستخدام':'لم يتم إدخال مفتاح';el.classList.toggle('empty',!has);
}
function requestConnection(){
  const baseUrl=String($('connectionUrl')?.value||state.connection.baseUrl||'').trim().replace(/\/$/,'');
  const database=String($('connectionDb')?.value||state.connection.database||'').trim();
  const apiKey=String($('connectionKey')?.value||state.connection.apiKey||'').trim();
  state.connection={baseUrl,database,apiKey};
  if(baseUrl)localStorage.setItem('ndr-odoo-url',baseUrl);else localStorage.removeItem('ndr-odoo-url');
  if(database)localStorage.setItem('ndr-odoo-db',database);else localStorage.removeItem('ndr-odoo-db');
  return apiKey&&baseUrl?{baseUrl,database,apiKey}:null;
}

async function session(){
  state.demo=false;state.connected=false;
  $('loginView').classList.add('hidden');$('appShell').classList.remove('hidden');
  updateConnectionUi();syncConnectionInputs();
}
function updateConnectionUi(){
  const live=state.connected;
  $('statusDot').classList.toggle('live',live);$('sideStatus').classList.toggle('live',live);
  $('modeText').textContent=live?'Odoo Live':state.demo?'Demo Mode':'غير متصل';
  $('odooState').textContent=live?'الاتصال مهيأ للقراءة من Odoo. استخدم اختبار الربط للتأكد من كل مصدر قبل التدقيق.':state.demo?'نسخة العرض نشطة. اختبار الربط يحاكي المصادر الأربعة قبل تجربة Odoo الحقيقي.':'لم يتم إعداد اتصال Odoo بعد.';
}
$('loginBtn').onclick=()=>session();

function requestPolicy(){
  return {...(state.policyOverrides||{}),rules:state.ruleConfig||{}};
}
async function runAudit(initial=false){
  const btn=$('runBtn');btn.disabled=true;btn.querySelector('span').textContent='جاري التحليل…';
  try{
    const connection=requestConnection();if(!connection){showPage('integrationPage');throw new Error('أدخل رابط Odoo ومفتاح API أولًا');}
    const r=await fetch(LIVE_API+'?action=audit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({policy:requestPolicy(),scenario:state.scenario,connection})});
    const d=await r.json();if(!r.ok)throw new Error(d.message||'تعذر التدقيق');
    trackRun(d);state.data=d;state.demo=d.mode==='demo';state.connected=d.mode==='live';state.selected.clear();state.page=1;render();
    if(!initial)toast(state.demo?'اكتمل التدقيق التجريبي بكل الحالات':'اكتمل تدقيق Odoo بنجاح');
  }catch(e){toast(e.message||'حدث خطأ أثناء التدقيق');}
  finally{btn.disabled=false;btn.querySelector('span').textContent='تشغيل التدقيق';}
}
$('runBtn').onclick=()=>runAudit(false);$('refreshBtn').onclick=()=>runAudit(false);

function trackRun(d){
  const current=(d.findings||[]).map(f=>findingKey(f));
  const prev=loadJson('ndr-last-findings',[]);const prevSet=new Set(prev),curSet=new Set(current);
  state.hasPrevious=prev.length>0;
  state.delta={fresh:current.filter(k=>!prevSet.has(k)).length,repeat:current.filter(k=>prevSet.has(k)).length,cleared:prev.filter(k=>!curSet.has(k)).length};
  const now=d.generatedAt||new Date().toISOString();
  for(const f of d.findings||[]){
    const k=findingKey(f),old=state.seen[k]||{count:0,firstSeen:now};
    state.seen[k]={count:old.count+1,firstSeen:old.firstSeen,lastSeen:now};
    if(state.resolutions[k]&&state.resolutions[k]!==d.runId){delete state.resolutions[k];f.reopened=true;}
    f.trend=prevSet.has(k)?'repeat':'new';
  }
  const keep=new Set([...current,...prev]);
  const entries=Object.entries(state.seen).filter(([k])=>keep.has(k)).slice(-5000);
  state.seen=Object.fromEntries(entries);
  localStorage.setItem('ndr-last-findings',JSON.stringify(current.slice(0,10000)));
  localStorage.setItem('ndr-case-seen',JSON.stringify(state.seen));
  localStorage.setItem('ndr-resolution-map',JSON.stringify(state.resolutions));
}

function riskLabel(score){if(score>=88)return['مستقر جدًا','#69d9a7'];if(score>=75)return['مستقر مع ملاحظات','#62dfbf'];if(score>=60)return['يحتاج متابعة','#ffbd69'];return['مرتفع المخاطر','#ff6f7e'];}
function render(){
  const d=state.data;if(!d)return;const s=d.summary,[rl]=riskLabel(s.score);
  $('score').textContent=number(s.score);$('risk').textContent=rl;$('scoreBar').style.width=`${Math.max(0,Math.min(100,s.score))}%`;
  const activeRules=(d.rules||[]).filter(r=>r.enabled&&!r.locked).length;$('summaryLine').textContent=s.total?`${number(s.total)} حالة لدى ${number(s.employeesAffected||0)} موظف • ${number(activeRules)} قاعدة فعالة`:'لا توجد ملاحظات ضمن القواعد الفعالة';
  $('sourceText').textContent=d.mode==='demo'?'بيانات عرض • Demo':'Odoo • Read only';
  $('critical').textContent=number(s.counts.critical||0);$('high').textContent=number(s.counts.high||0);$('medium').textContent=number(s.counts.medium||0);$('total').textContent=number(s.total||0);$('ringTotal').textContent=number(s.total||0);
  $('briefHeadline').textContent=d.brief.headline;$('briefMessage').textContent=executiveMessage(d);$('generated').textContent=`آخر تدقيق ${new Date(d.generatedAt).toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'})}`;$('execStamp').textContent=d.mode==='demo'?'Demo intelligence':'Live intelligence';
  $('covEmployees').textContent=number(d.coverage.employees);$('covContracts').textContent=number(d.coverage.contracts);$('covAttendance').textContent=number(d.coverage.attendance);$('covLeaves').textContent=number(d.coverage.leaves);
  $('ruleCount').textContent=number(activeRules);$('dataPoints').textContent=number(Object.values(d.coverage).reduce((a,b)=>a+Number(b||0),0));$('resolvedRate').textContent=resolvedRate(d);$('managementLine').textContent=managementLine(d);
  $('newCases').textContent=number(state.hasPrevious?state.delta.fresh:s.total);$('repeatCases').textContent=number(state.hasPrevious?state.delta.repeat:0);$('clearedCases').textContent=number(state.hasPrevious?state.delta.cleared:0);$('affectedEmployees').textContent=number(s.employeesAffected||0);
  renderPriorities(d);renderCaseGroups();populateIssueFilter();renderFindings();renderActivity();renderRules();renderRisk(d);renderQuality(d);renderPolicy(d);updateConnectionUi();
}
function executiveMessage(d){const s=d.summary;if(s.counts.critical)return `يوجد ${number(s.counts.critical)} خطر حرج يحتاج تدخلك أولًا، ثم ${number(s.counts.high||0)} حالات عالية. ${state.hasPrevious?`ظهر ${number(state.delta.fresh)} جديد واختفى ${number(state.delta.cleared)} من المصدر منذ الفحص السابق.`:''}`;if(s.counts.high)return `لا توجد مخاطر حرجة، لكن لديك ${number(s.counts.high)} حالات عالية الأولوية. ${state.hasPrevious?`${number(state.delta.repeat)} منها مستمر من فحص سابق.`:''}`;if(s.total)return `الوضع العام مستقر. ${number(s.total)} حالات تشغيلية متاحة بالكامل للتفصيل والمتابعة.`;return'القواعد الحالية لم تكتشف تعارضات.';}
function managementLine(d){const s=d.summary;if(s.counts.critical)return `الإدارة تحتاج قرارًا اليوم: ${number(s.counts.critical)} حرجة و${number(s.counts.high||0)} عالية. جودة البيانات ${number(d.quality?.score||0)}%.`;if(s.counts.high)return `لا يوجد خطر حرج؛ أغلق ${number(s.counts.high)} حالات عالية مع إعطاء الأولوية للحالات المتكررة.`;return s.total?'المخاطر الحالية تشغيلية ويمكن احتواؤها عبر المتابعة المعتادة.':'الوضع مستقر ضمن نطاق القواعد الحالية.';}
function resolvedRate(d){const total=d.findings.length;if(!total)return'100%';const processed=d.findings.filter(f=>isResolved(f)||isException(f)).length;return`${Math.round(processed/total*100)}%`;}
function renderRisk(d){const c=d.summary.counts||{},total=Math.max(1,d.summary.total||0),pc=(c.critical||0)/total*100,ph=(c.high||0)/total*100;$('riskDonut').style.background=`conic-gradient(var(--red) 0 ${pc}%,var(--amber) ${pc}% ${pc+ph}%,var(--blue) ${pc+ph}% 100%)`;$('donutTotal').textContent=number(d.summary.total||0);$('legendCritical').textContent=number(c.critical||0);$('legendHigh').textContent=number(c.high||0);$('legendMedium').textContent=number(c.medium||0);}

function renderPriorities(d){const arr=d.findings.filter(f=>['critical','high'].includes(f.severity)&&isOpen(f)).slice(0,3);$('priorities').innerHTML=arr.length?arr.map((f,i)=>`<div class="decision" data-priority="${escapeHtml(findingKey(f))}"><span class="decisionrank">0${i+1}</span><div><b>${escapeHtml(f.title)}</b><small>${escapeHtml(f.employee)} • ${escapeHtml(f.category)} ${f.trend==='repeat'?'• متكررة':''}</small></div><span class="arrow">←</span></div>`).join(''):`<div class="decision"><span class="decisionrank">✓</span><div><b>لا توجد أولوية مرتفعة مفتوحة</b><small>راجع الحالات التشغيلية أو شغّل تدقيقًا جديدًا</small></div><span class="arrow">←</span></div>`;document.querySelectorAll('[data-priority]').forEach(x=>x.onclick=()=>openFinding(x.dataset.priority));}
function groupSummary(list){const people=new Set(list.map(f=>f.employeeRef?.id||f.employee)),types=new Map();list.forEach(f=>types.set(f.title,(types.get(f.title)||0)+1));const breakdown=[...types.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([t,c])=>`${number(c)} ${t}`).join(' • ');const highest=list.some(f=>f.severity==='critical')?'توجد حالة حرجة':list.some(f=>f.severity==='high')?'توجد أولوية عالية':'ملاحظات تشغيلية';return{people:people.size,breakdown,highest};}
function renderCaseGroups(){
  const findings=(state.data?.findings||[]).filter(isOpen),order=['الحضور','العقود','الإجازات'];
  const cats=[...new Set(findings.map(f=>f.category))].sort((a,b)=>(order.indexOf(a)<0?99:order.indexOf(a))-(order.indexOf(b)<0?99:order.indexOf(b)));
  $('caseGroups').innerHTML=cats.map(cat=>{const list=findings.filter(f=>f.category===cat),g=groupSummary(list);return `<div class="card casegroup" data-group="${escapeHtml(cat)}"><div class="casegrouphead"><div class="casegroupicon">${categoryIcon[cat]||'◎'}</div><div class="casegroupcount"><b>${number(g.people)}</b><span>موظف متأثر</span></div></div><h4>${escapeHtml(cat)} — ${number(list.length)} حالات</h4><p>${escapeHtml(g.breakdown||g.highest)}</p><div class="casegroupfoot"><span>${escapeHtml(g.highest)}</span><button data-group-open="${escapeHtml(cat)}">عرض جميع الحالات ←</button></div></div>`;}).join('')||'<div class="empty">لا توجد مجموعات حالات مفتوحة.</div>';
  document.querySelectorAll('[data-group-open],[data-group]').forEach(el=>el.onclick=e=>{setCategory(el.dataset.groupOpen||el.dataset.group);e.stopPropagation();});
}
function setCategory(cat){state.category=cat||'all';state.page=1;$('clearCategory').classList.toggle('show',state.category!=='all');$('caseListTitle').textContent=state.category==='all'?'كل الحالات الفردية':`حالات ${state.category}`;renderFindings();document.querySelector('.findingpage')?.scrollIntoView({behavior:'smooth',block:'start'});}
$('clearCategory').onclick=()=>setCategory('all');

function populateIssueFilter(){const select=$('issueFilter'),current=state.issue,titles=[...new Set((state.data?.findings||[]).map(f=>f.title))].sort((a,b)=>a.localeCompare(b,'ar'));select.innerHTML='<option value="all">كل أنواع المشاكل</option>'+titles.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');select.value=titles.includes(current)?current:'all';state.issue=select.value;}
function filteredFindings(){
  const q=state.search.trim().toLowerCase();
  return (state.data?.findings||[]).filter(f=>{
    const resolved=isResolved(f),exception=isException(f);
    if(state.filter!=='all'&&f.severity!==state.filter)return false;
    if(state.category!=='all'&&f.category!==state.category)return false;
    if(state.issue!=='all'&&f.title!==state.issue)return false;
    if(state.status==='open'&&!isOpen(f))return false;if(state.status==='resolved'&&!resolved)return false;if(state.status==='exception'&&!exception)return false;
    if(q){const hay=[f.employee,f.title,f.category,f.code,caseNumber(f),f.detail,...(f.tags||[])].join(' ').toLowerCase();if(!hay.includes(q))return false;}
    return true;
  });
}
function sevSymbol(s){return s==='critical'?'!':s==='high'?'△':'◇';}
function findingRow(f){
  const resolved=isResolved(f),exception=isException(f),k=findingKey(f),occ=currentOccurrence(f),trend=f.trend==='repeat'?`<span class="trendbadge repeat">متكررة ${number(occ)}×</span>`:`<span class="trendbadge new">جديدة</span>`;
  return `<div class="finding ${resolved?'resolved':''}" data-sev="${escapeHtml(f.severity)}"><input class="casecheck" type="checkbox" data-select="${escapeHtml(k)}" ${state.selected.has(k)?'checked':''}><div class="findingsev"><span style="opacity:.2">${sevSymbol(f.severity)}</span></div><div class="findingbody"><h4>${escapeHtml(f.title)} ${resolved?'<span class="on">تمت المعالجة</span>':''} ${exception?'<span class="exceptionbadge">استثناء معتمد</span>':''} ${trend}</h4><div class="findingmeta"><span class="chip">${escapeHtml(sevAr[f.severity]||f.severity)}</span><span>${escapeHtml(f.category)}</span><span>•</span><button class="employeejump" data-employee="${escapeHtml(String(f.employeeRef?.id||''))}" data-employee-name="${escapeHtml(f.employee)}">${escapeHtml(f.employee)}</button><span class="chip">${escapeHtml(f.code)}</span><span class="confidence">ثقة ${escapeHtml(confAr[f.confidence]||'مرتفعة')}</span></div><div class="findingdesc">${escapeHtml(f.detail)}</div><div class="caseid">${escapeHtml(caseNumber(f))} • ${escapeHtml(sourceAr[f.ref?.model]||f.ref?.model||'')}</div></div><button class="openbtn" data-open="${escapeHtml(k)}">تفاصيل الحالة ←</button></div>`;
}
function renderFindings(){
  const list=state.data?.findings||[],top=list.filter(isOpen).slice(0,5);$('topFindings').innerHTML=top.length?top.map(findingRow).join(''):'<div class="empty">ممتاز — لا توجد ملاحظات مفتوحة ضمن الأولويات الحالية.</div>';
  const filtered=filteredFindings(),pages=Math.max(1,Math.ceil(filtered.length/state.pageSize));if(state.page>pages)state.page=pages;const from=(state.page-1)*state.pageSize,pageRows=filtered.slice(from,from+state.pageSize);
  $('allFindings').innerHTML=pageRows.length?pageRows.map(findingRow).join(''):'<div class="empty">لا توجد حالات ضمن البحث أو الفلتر الحالي.</div>';
  $('resultMeta').textContent=filtered.length?`عرض ${number(from+1)}–${number(Math.min(from+state.pageSize,filtered.length))} من ${number(filtered.length)} حالة`:'0 حالة';$('caseListSub').textContent=state.category==='all'?`${number(filtered.length)} حالة مطابقة للفلاتر الحالية`:`${number(filtered.length)} حالة في ${state.category}`;
  renderPagination(pages);bindRows();$('resolvedRate').textContent=resolvedRate(state.data);renderBulk();
}
function renderPagination(pages){
  const el=$('pagination');if(pages<=1){el.innerHTML='';return;}let nums=[];for(let i=1;i<=pages;i++)if(i===1||i===pages||Math.abs(i-state.page)<=2)nums.push(i);nums=[...new Set(nums)];let html=`<button class="pagebtn" data-page="${state.page-1}" ${state.page===1?'disabled':''}>السابق</button>`;let prev=0;for(const n of nums){if(prev&&n-prev>1)html+='<span style="color:#60778d">…</span>';html+=`<button class="pagebtn ${n===state.page?'active':''}" data-page="${n}">${number(n)}</button>`;prev=n;}html+=`<button class="pagebtn" data-page="${state.page+1}" ${state.page===pages?'disabled':''}>التالي</button>`;el.innerHTML=html;el.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{const p=Number(b.dataset.page);if(p>=1&&p<=pages){state.page=p;renderFindings();document.querySelector('.findingpage')?.scrollIntoView({behavior:'smooth',block:'start'});}});}
function bindRows(){
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openFinding(b.dataset.open));
  document.querySelectorAll('[data-employee]').forEach(b=>b.onclick=e=>{e.stopPropagation();openEmployee(Number(b.dataset.employee)||null,b.dataset.employeeName);});
  document.querySelectorAll('[data-select]').forEach(c=>c.onchange=()=>{if(c.checked)state.selected.add(c.dataset.select);else state.selected.delete(c.dataset.select);renderBulk();});
}
function renderBulk(){$('selectedCount').textContent=number(state.selected.size);$('bulkBar').classList.toggle('show',state.selected.size>0);}
$('selectPage').onclick=()=>{const rows=filteredFindings().slice((state.page-1)*state.pageSize,state.page*state.pageSize);rows.forEach(f=>state.selected.add(findingKey(f)));renderFindings();};
$('clearSelection').onclick=()=>{state.selected.clear();renderFindings();};
$('bulkResolve').onclick=()=>{for(const k of state.selected)state.resolutions[k]=state.data.runId;state.selected.clear();saveResolutions();renderAllCaseViews();toast('تمت معالجة الحالات المحددة في بيئة العرض');};
function saveResolutions(){localStorage.setItem('ndr-resolution-map',JSON.stringify(state.resolutions));}
function renderAllCaseViews(){renderCaseGroups();renderFindings();renderPriorities(state.data);$('managementLine').textContent=managementLine(state.data);}
