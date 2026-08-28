  const q=d.quality||{};$('qualityScore').textContent=q.score!=null?`${number(q.score)}%`:'—';$('qualityLabel').textContent=q.label||'جاهزية البيانات';
  const order=['employees','contracts','attendance','leaves'];$('qualitySources').innerHTML=order.map(k=>{const x=q.sources?.[k];if(!x)return'';return `<div class="qualitysource"><div class="qtop"><div><b>${escapeHtml(x.name)}</b><strong>${number(x.count)}</strong></div><span class="qdot ${escapeHtml(x.status||'')}"></span></div><p>اكتمال ${number(x.completeness)}% • ${escapeHtml(x.note||'')}</p></div>`;}).join('');
  $('qualityIssues').innerHTML=(q.issues||[]).length?(q.issues||[]).map(x=>`<div class="qualityissue ${escapeHtml(x.severity)}"><b>${escapeHtml(x.title)}</b>${escapeHtml(x.detail)}</div>`).join(''):'<div class="qualityissue"><b>جاهزية جيدة</b>لم يكتشف المحرك مشكلة تمنع الاعتماد على مصادر التدقيق الحالية.</div>';
}

$('scaleDemo').onclick=()=>toast('اختبار الضغط سيكون من بيئة الاختبار المنفصلة؛ الرئيسي مخصص للبيانات الحية.');

async function testLiveConnection(){
  const connection=requestConnection();
  const buttons=[$('testConnection'),$('connectAndTest')].filter(Boolean);buttons.forEach(b=>{b.disabled=true;b.dataset.old=b.textContent;b.textContent='جاري اختبار المصادر…';});$('probeResults').innerHTML='';
  try{
    if(!connection)throw new Error('أدخل رابط Odoo ومفتاح API أولًا');
    const r=await fetch(LIVE_API+'?action=probe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({connection})});
    const d=await r.json();if(!r.ok)throw new Error(d.message||'تعذر اختبار الربط');
    const names={employees:'الموظفون',contracts:'العقود',attendance:'الحضور',leaves:'الإجازات'};
    $('probeResults').innerHTML=Object.entries(d.sources||{}).map(([k,x])=>`<div class="probe ${x.ok?'ok':'bad'}"><b>${x.ok?'✓':'×'} ${names[k]||k}</b><span>${escapeHtml(x.model||'')} • ${x.ok?`${number(x.latencyMs)} ms`:`${escapeHtml(x.message||'تعذر الوصول')}`}</span></div>`).join('');
    const allOk=Object.values(d.sources||{}).every(x=>x&&x.ok);
    if(allOk){state.connected=true;state.demo=false;updateConnectionUi();toast('تم الاتصال بقاعدة Odoo الحقيقية. شغّل التدقيق الآن.');}
    else{state.connected=false;updateConnectionUi();toast('يوجد مصدر لم ينجح اختباره. راجع التفاصيل.');}
  }catch(e){state.connected=false;updateConnectionUi();toast(e.message||'تعذر اختبار الربط');}
  finally{buttons.forEach(b=>{b.disabled=false;b.textContent=b.dataset.old||'اختبار الربط';});}
}
$('testConnection').onclick=testLiveConnection;
if($('connectAndTest'))$('connectAndTest').onclick=testLiveConnection;
if($('connectionKey'))$('connectionKey').addEventListener('input',updateSecretState);
if($('connectionUrl'))$('connectionUrl').addEventListener('change',()=>requestConnection());
if($('connectionDb'))$('connectionDb').addEventListener('change',()=>requestConnection());
if($('clearConnection'))$('clearConnection').onclick=()=>{state.connection={baseUrl:'https://hrhrh1.odoo.com',database:'',apiKey:''};localStorage.removeItem('ndr-odoo-url');localStorage.removeItem('ndr-odoo-db');state.connected=false;syncConnectionInputs();updateConnectionUi();$('probeResults').innerHTML='';toast('تم مسح بيانات الربط من هذه الجلسة.');};

function sourceName(ref){return ref?`${sourceAr[ref.model]||ref.model} #${ref.id}`:'غير متاح';}
function recordUrl(ref){const base=state.data?.navigation?.odooBaseUrl;if(!base||!ref?.model||!ref?.id)return null;return `${base}/web#id=${encodeURIComponent(ref.id)}&model=${encodeURIComponent(ref.model)}&view_type=form`;}
function openOdooRef(ref,label){const url=recordUrl(ref);if(url){window.open(url,'_blank','noopener,noreferrer');return;}toast(`في الربط الحي سيفتح ${label||sourceName(ref)} مباشرة داخل Odoo`);}
function openFinding(key){
  const f=state.data.findings.find(x=>findingKey(x)===key);if(!f)return;state.current=f;
  $('modalCode').textContent=`${caseNumber(f)} • ${f.code} RULE MATCH`;$('modalTitle').textContent=f.title;$('modalWho').textContent=`${f.employee} • ${f.category}`;$('modalDetail').textContent=f.detail;$('modalAction').textContent=f.action;$('modalSeverity').textContent=sevAr[f.severity]||f.severity;$('modalCategory').textContent=f.category;$('modalState').textContent=isException(f)?'استثناء معتمد':isResolved(f)?'مغلقة':'مفتوحة';$('modalSource').textContent=sourceName(f.ref);$('modalConfidence').textContent=confAr[f.confidence]||'مرتفعة';$('modalOccurrence').textContent=f.trend==='repeat'?`${number(currentOccurrence(f))} مرات`:'أول ظهور';$('modalImpact').textContent=f.impact||impactFor(f);
  $('modalFacts').innerHTML=(f.facts||[]).map(x=>`<div class="fact"><span>${escapeHtml(x.label)}</span><b>${escapeHtml(x.value)}</b></div>`).join('')||'<div class="fact"><span>المصدر</span><b>بيانات السجل الأصلي</b></div>';
  $('sourceHint').textContent=state.data?.navigation?.odooBaseUrl?'الأزرار أدناه تفتح السجل الحقيقي في Odoo':'وضع العرض: تتحول الأزرار إلى روابط حقيقية بعد ربط Odoo';
  $('relatedRecords').innerHTML=(f.relatedRefs||[]).map((r,i)=>`<button class="relatedrecord" data-related="${i}">${escapeHtml(r.label||sourceName(r))} ↗</button>`).join('');document.querySelectorAll('[data-related]').forEach(b=>b.onclick=()=>openOdooRef(f.relatedRefs[Number(b.dataset.related)],f.relatedRefs[Number(b.dataset.related)]?.label));
  $('openSourceBtn').onclick=()=>openOdooRef(f.ref,'السجل المسبب');$('openEmployeeBtn').onclick=()=>openOdooRef(f.employeeRef,'ملف الموظف');$('openNdrEmployeeBtn').onclick=()=>{closeCase();openEmployee(f.employeeRef?.id,f.employee);};$('exceptionForm').classList.remove('show');$('exceptionReason').value=state.exceptions[findingKey(f)]?.reason||'';$('modalBack').classList.add('show');
}
function impactFor(f){if(f.severity==='critical')return'مرتفعة الأولوية وقد تؤثر على الالتزام أو القرار الإداري إذا لم تتم مراجعتها فورًا.';if(f.severity==='high')return'تحتاج معالجة قريبة حتى لا يتحول الاستثناء إلى خطأ في السجل أو قرار لاحق مبني على بيانات غير مكتملة.';return'أثر تشغيلي محدود، لكن إغلاقها يحافظ على سلامة السجلات ويمنع تراكم الاستثناءات.';}
function closeCase(){$('modalBack').classList.remove('show');}
$('exceptionBtn').onclick=()=>{$('exceptionForm').classList.add('show');$('exceptionReason').focus();};$('cancelException').onclick=()=>{$('exceptionForm').classList.remove('show');};$('saveException').onclick=()=>{if(!state.current)return;const reason=$('exceptionReason').value.trim();if(reason.length<4){toast('اكتب سببًا واضحًا لاعتماد الاستثناء');return;}const k=findingKey(state.current);state.exceptions[k]={reason,createdAt:new Date().toISOString()};delete state.resolutions[k];localStorage.setItem('ndr-exception-map',JSON.stringify(state.exceptions));closeCase();renderAllCaseViews();toast('تم اعتماد الحالة كاستثناء موثق ولن تعود كحالة مفتوحة.');};
$('closeModal').onclick=closeCase;$('laterBtn').onclick=closeCase;$('modalBack').onclick=e=>{if(e.target===$('modalBack'))closeCase();};$('assignBtn').onclick=()=>toast('الإسناد سيحفظ على سجل الحالة عند تفعيل قاعدة البيانات متعددة المستخدمين');$('noteBtn').onclick=()=>toast('الملاحظات ستصبح جزءًا من سجل الحالة الدائم في النسخة المتصلة');
$('resolveBtn').onclick=()=>{if(!state.current)return;const k=findingKey(state.current);state.resolutions[k]=state.data.runId;delete state.exceptions[k];localStorage.setItem('ndr-exception-map',JSON.stringify(state.exceptions));saveResolutions();closeCase();renderAllCaseViews();toast('تم إغلاق الحالة. إذا بقي الخطأ في المصدر ستعاد فتحها تلقائيًا في التدقيق القادم.');};

function openEmployee(id,name){
  const list=(state.data?.findings||[]).filter(f=>(id&&f.employeeRef?.id===id)||(!id&&f.employee===name));if(!list.length){toast('لا توجد حالات للموظف في آخر تدقيق');return;}state.currentEmployee={id:id||list[0].employeeRef?.id,name:name||list[0].employee,ref:list[0].employeeRef};const open=list.filter(isOpen).length,resolved=list.length-open,highest=[...list].sort((a,b)=>sevRank[b.severity]-sevRank[a.severity])[0]?.severity||'low';$('employeeName').textContent=state.currentEmployee.name;$('employeeAvatar').textContent=String(state.currentEmployee.name||'N').trim().charAt(0);$('employeeSummary').textContent=`${number(list.length)} حالة مرتبطة في آخر تدقيق • ${number(new Set(list.map(f=>f.category)).size)} فئات`;$('employeeOpen').textContent=number(open);$('employeeResolved').textContent=number(resolved);$('employeeRisk').textContent=sevAr[highest]||'منخفضة';$('employeeCases').innerHTML=list.map(f=>`<div class="empcase"><div><b>${escapeHtml(f.title)} ${isResolved(f)?'✓':isException(f)?'• استثناء':''}</b><span>${escapeHtml(f.category)} • ${escapeHtml(caseNumber(f))} • ${escapeHtml(sevAr[f.severity])}</span></div><button data-emp-case="${escapeHtml(findingKey(f))}">فتح الحالة ←</button></div>`).join('');document.querySelectorAll('[data-emp-case]').forEach(b=>b.onclick=()=>{$('employeeBack').classList.remove('show');openFinding(b.dataset.empCase);});$('employeeOdooBtn').onclick=()=>openOdooRef(state.currentEmployee.ref,'ملف الموظف');$('employeeBack').classList.add('show');
}
$('closeEmployee').onclick=()=>$('employeeBack').classList.remove('show');$('employeeBack').onclick=e=>{if(e.target===$('employeeBack'))$('employeeBack').classList.remove('show');};

document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>showPage(b.dataset.page));document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>showPage(b.dataset.jump));
function showPage(id){document.querySelectorAll('.panelpage').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));const t=pageTitles[id]||['NDR HR Audit',''];$('pageTitle').textContent=t[0];$('crumbTitle').textContent=t[1];window.scrollTo({top:0,behavior:'smooth'});}
window.addEventListener('pointermove',e=>{if(innerWidth<1000)return;document.documentElement.style.setProperty('--px',`${e.clientX}px`);document.documentElement.style.setProperty('--py',`${e.clientY}px`);});
syncConnectionInputs();
session();
