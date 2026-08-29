(()=>{
  'use strict';
  const API='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-attendance-register';
  const LATE_GRACE=20, EARLY_GRACE=6, CACHE_TTL=90000, PAGE_ROWS=120;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let register=null, filtered=[], currentEdit=null, loadedMonth='', loadingMonth='', loadPromise=null, renderLimit=PAGE_ROWS;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const token=()=>window.NDROdooVault?.token||localStorage.getItem('ndr-connector-token')||'';
  const q=id=>document.getElementById(id);
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  function notify(msg){try{if(typeof toast==='function')return toast(msg)}catch{}const t=q('toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800)}}
  function currentMonth(){return today().slice(0,7)}
  function rangeForMonth(m){const [y,mo]=m.split('-').map(Number),last=new Date(Date.UTC(y,mo,0)).getUTCDate();return{from:`${m}-01`,to:`${m}-${String(last).padStart(2,'0')}`}}
  function cacheKey(m){return `ndr-attendance-cache-v3:${m}`}
  function readCache(m){try{const x=JSON.parse(sessionStorage.getItem(cacheKey(m))||'null');return x&&Date.now()-Number(x.ts||0)<CACHE_TTL&&x.data?.rows?x.data:null}catch{return null}}
  function writeCache(m,data){try{sessionStorage.setItem(cacheKey(m),JSON.stringify({ts:Date.now(),data}))}catch{}}
  function clearCache(m){try{sessionStorage.removeItem(cacheKey(m))}catch{}}
  function addCss(){if(document.querySelector('link[data-ndr-attendance]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='/ndr-hr-intelligence/attendance.css';l.dataset.ndrAttendance='1';document.head.appendChild(l)}
  function classification(r){
    const status=String(r.status||'');
    if(status.includes('تعارض'))return{problem:true,label:'تعارض حضور وإجازة',cls:'conflict'};
    if(status==='إجازة')return{problem:true,label:'إجازة',cls:'leave'};
    if(status.includes('معلق'))return{problem:true,label:'طلب إجازة معلق',cls:'pending'};
    if(status==='مستقبلي')return{problem:false,label:'مستقبلي',cls:'off'};
    if(r.expectedIn&&!r.checkIn&&r.date<=today())return{problem:true,label:'غياب / لا توجد بصمة',cls:'missing'};
    if(r.checkIn&&!r.checkOut&&r.date<=today())return{problem:true,label:'بصمة خروج مفقودة',cls:'missing'};
    const late=Number(r.lateMinutes||0)>LATE_GRACE,early=Number(r.earlyMinutes||0)>EARLY_GRACE;
    if(late&&early)return{problem:true,label:'تأخير + خروج مبكر',cls:'warning'};
    if(late)return{problem:true,label:'تأخير',cls:'warning'};
    if(early)return{problem:true,label:'خروج مبكر',cls:'warning'};
    if(r.checkIn)return{problem:false,label:'سليم',cls:'present'};
    return{problem:false,label:status||'راحة',cls:'off'};
  }
  function leaveText(r){if(!r.leaveType)return'—';return `${r.leaveType}${r.leaveState?` • ${r.leaveState}`:''}`}
  function punchText(r){if(!r.checkIn&&!r.checkOut)return'—';return `${r.checkIn||'—'}  ←  ${r.checkOut||'—'}`}
  function buildPage(){
    if(q('attendancePage'))return;
    const nav=document.querySelector('.nav'),integration=nav?.querySelector('[data-page="integrationPage"]');
    if(nav){const b=document.createElement('button');b.id='attendanceNavBtn';b.dataset.page='attendancePage';b.innerHTML='<span class="navicon">◫</span><span class="navtext">الحضور والانصراف</span>';integration?nav.insertBefore(b,integration):nav.appendChild(b)}
    const content=document.querySelector('.content');if(!content)return;
    const s=document.createElement('section');s.id='attendancePage';s.className='panelpage';s.innerHTML=`
      <div class="att-page">
        <div class="att-head">
          <div><span class="att-kicker">متابعة الحضور</span><h2>الحضور والانصراف</h2><p>يعرض لك افتراضيا الموظفين الذين يحتاجون مراجعة فقط، مع الإجازات. الأيام السليمة مخفية حتى لا تضيع وقتك.</p></div>
          <div class="att-actions"><button id="attReload" class="att-btn">تحديث</button><button id="attPrint" class="att-btn">طباعة الحالي</button><button id="attExport" class="att-btn primary">Excel الحالي</button></div>
        </div>
        <div class="att-toolbar">
          <div class="att-field"><label>الشهر</label><input id="attMonth" type="month"></div>
          <div class="att-field"><label>الموظف</label><input id="attSearch" type="search" placeholder="رقم الموظف أو الاسم"></div>
          <div class="att-field"><label>القسم</label><select id="attDepartment"><option value="">كل الأقسام</option></select></div>
          <div class="att-field"><label>طريقة العرض</label><select id="attMode"><option value="issues">المشكلات والإجازات فقط</option><option value="department">السجل الكامل للقسم المحدد</option></select></div>
        </div>
        <div class="att-modehint"><b id="attModeTitle">المشكلات والإجازات فقط</b><span id="attModeHint">لن تظهر البصمات السليمة. الإجازات تظهر دائما باسم نوعها وحالتها.</span></div>
        <div id="attError" class="att-error"></div>
        <div class="att-summary">
          <div class="att-stat"><span>موظفون يحتاجون مراجعة</span><b id="attEmployees">0</b></div>
          <div class="att-stat warn"><span>تأخير / خروج مبكر</span><b id="attLate">0</b></div>
          <div class="att-stat danger"><span>غياب / بصمة ناقصة</span><b id="attMissing">0</b></div>
          <div class="att-stat leave"><span>إجازات</span><b id="attLeaves">0</b></div>
          <div class="att-stat danger"><span>تعارضات</span><b id="attConflicts">0</b></div>
        </div>
        <div class="att-sheet">
          <div class="att-sheet-head"><div><b>كشف المتابعة</b><span id="attPeriodLabel">—</span></div><span id="attGenerated">—</span></div>
          <div id="attTableWrap" class="att-table-wrap"><div class="att-empty"><b>جار تجهيز الكشف</b><span>يتم دمج الحضور والإجازات من Odoo.</span></div></div>
          <div class="att-smallnote">التأخير يعتبر إشكالية بعد هامش السماح الحالي. إذا اخترت "السجل الكامل للقسم" سيظهر كل أيام العمل والبصمات والإجازات للقسم المحدد.</div>
        </div>
      </div>`;content.appendChild(s);
    const modal=document.createElement('div');modal.id='attEditBack';modal.className='att-modalback';modal.innerHTML=`<div class="att-modal"><div class="att-modal-head"><div><h3 id="attEditTitle">تعديل الحضور</h3><p id="attEditSub">—</p></div><button id="attEditClose" class="att-close">×</button></div><div class="att-modal-body"><div id="attEditNote" class="att-edit-note"></div><div class="att-edit-grid"><div class="att-edit-field"><label>الدخول</label><input id="attEditIn" type="time"></div><div class="att-edit-field"><label>الخروج</label><input id="attEditOut" type="time"></div></div><div class="att-edit-field"><label>ملاحظة (اختياري)</label><textarea id="attEditReason" placeholder="اختياري — يحفظ NDR وصفا تلقائيا إذا تركتها فارغة"></textarea></div></div><div class="att-modal-foot"><button id="attEditCancel" class="att-btn">إلغاء</button><button id="attEditSave" class="att-btn primary">حفظ في Odoo</button></div></div>`;document.body.appendChild(modal);
  }
  function setAttendanceView(on){const page=q('attendancePage'),btn=q('attendanceNavBtn');if(!page||!btn)return;if(on){document.querySelectorAll('.panelpage').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));page.classList.add('active');btn.classList.add('active');if(q('pageTitle'))q('pageTitle').textContent='الحضور والانصراف';if(q('crumbTitle'))q('crumbTitle').textContent='ATTENDANCE';if(q('generated'))q('generated').textContent='استثناءات الحضور والإجازات';if(q('runBtn'))q('runBtn').style.display='none';if(q('refreshBtn'))q('refreshBtn').style.display='none';if(!loadedMonth)loadRegister(false,false);}else{page.classList.remove('active');btn.classList.remove('active');if(q('runBtn'))q('runBtn').style.display='';if(q('refreshBtn'))q('refreshBtn').style.display=''}}
  async function post(action,body,signal){const t=token();if(!t)throw new Error('اتصال Odoo غير جاهز. افتح ربط Odoo واحفظ الاتصال أولا.');const r=await fetch(`${API}?action=${encodeURIComponent(action)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({launchToken:t,...body}),signal});let d=null;try{d=await r.json()}catch{}if(!r.ok)throw new Error(d?.message||'تعذر تنفيذ الطلب');return d}
  function setError(msg=''){const el=q('attError');if(!el)return;el.textContent=msg;el.classList.toggle('show',!!msg)}
  function setLoading(){q('attTableWrap').innerHTML='<div class="att-loading">يتم جمع الحضور والإجازات من Odoo… يمكنك الانتقال لأي قسم وسيستمر التحميل بدون تجميد الصفحة.</div>'}
  function populateDepartments(){const sel=q('attDepartment'),current=sel.value,deps=[...new Set((register?.rows||[]).map(r=>r.department).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));sel.innerHTML='<option value="">كل الأقسام</option>'+deps.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');if(deps.includes(current))sel.value=current}
  function applyFilters(){
    renderLimit=PAGE_ROWS;
    const search=(q('attSearch').value||'').trim().toLowerCase(),dep=q('attDepartment').value,mode=q('attMode').value;
    let base=(register?.rows||[]).filter(r=>(!search||String(r.employeeName).toLowerCase().includes(search)||String(r.employeeCode||'').toLowerCase().includes(search))&&(!dep||r.department===dep));
    if(mode==='department'){
      q('attModeTitle').textContent='السجل الكامل للقسم';q('attModeHint').textContent=dep?`يعرض الآن كل أيام العمل والبصمات والإجازات لقسم ${dep}.`:'اختر قسما أولا حتى لا يتحول التقرير إلى كشف ضخم لكل الموظفين.';
      if(!dep)filtered=[];else filtered=base.filter(r=>r.status!=='مستقبلي'&&(r.expectedIn||r.checkIn||r.leaveType||String(r.status).includes('إجازة')));
    }else{
      q('attModeTitle').textContent='المشكلات والإجازات فقط';q('attModeHint').textContent='البصمة السليمة مخفية. يظهر التأخير، الخروج المبكر، الغياب، البصمة الناقصة، التعارضات، وجميع الإجازات.';
      filtered=base.filter(r=>classification(r).problem);
    }
    filtered.sort((a,b)=>String(a.employeeName).localeCompare(String(b.employeeName),'ar')||String(a.date).localeCompare(String(b.date)));
    renderSummary();renderTable();
  }
  function renderSummary(){const rs=filtered,classes=rs.map(r=>classification(r));q('attEmployees').textContent=String(new Set(rs.map(r=>r.employeeId)).size);q('attLate').textContent=String(classes.filter(x=>x.label.includes('تأخير')||x.label.includes('خروج مبكر')).length);q('attMissing').textContent=String(classes.filter(x=>x.label.includes('غياب')||x.label.includes('بصمة')).length);q('attLeaves').textContent=String(rs.filter(r=>r.leaveType).length);q('attConflicts').textContent=String(classes.filter(x=>x.cls==='conflict').length)}
  function renderTable(){
    const wrap=q('attTableWrap'),mode=q('attMode').value,dep=q('attDepartment').value;
    if(!filtered.length){const msg=mode==='department'&&!dep?'اختر قسما لعرض سجله الكامل':'لا توجد حالات تحتاج مراجعة ضمن الاختيار الحالي';wrap.innerHTML=`<div class="att-empty"><b>${esc(msg)}</b><span>${mode==='issues'?'هذا يعني أن الأيام السليمة مخفية ولا توجد استثناءات مطابقة.':'اختر القسم من الأعلى ثم أعد المحاولة.'}</span></div>`;return}
    const shown=filtered.slice(0,renderLimit),remaining=Math.max(0,filtered.length-shown.length);
    wrap.innerHTML=`<table class="att-table"><thead><tr><th>رقم الموظف</th><th>اسم الموظف</th><th>التاريخ</th><th>الحضور والانصراف</th><th>التأخير</th><th>الإجازة</th><th>الحالة</th><th>تعديل</th></tr></thead><tbody>${shown.map((r,i)=>{const c=classification(r);return`<tr class="${c.problem?'needs-review':'normal-row'}"><td class="code">${esc(r.employeeCode||r.employeeId)}</td><td class="emp">${esc(r.employeeName)}</td><td><b>${esc(r.date)}</b><small>${esc(r.day)}</small></td><td class="punch">${esc(punchText(r))}</td><td class="late">${r.lateMinutes?`${esc(r.lateMinutes)} د`:'—'}</td><td class="leavecell">${esc(leaveText(r))}</td><td><span class="att-status ${c.cls}">${esc(c.label)}</span></td><td><button class="att-edit" data-att-edit="${i}" ${(!r.editable||r.status==='مستقبلي')?'disabled':''}>${r.attendanceId?'تعديل':'إضافة'}</button></td></tr>`}).join('')}</tbody></table>${remaining?`<div style="padding:14px;text-align:center"><button id="attMore" class="att-btn">عرض ${Math.min(PAGE_ROWS,remaining)} إضافية • متبقي ${remaining}</button></div>`:''}`;
    wrap.querySelectorAll('[data-att-edit]').forEach(b=>b.addEventListener('click',()=>openEditor(shown[Number(b.dataset.attEdit)])));
    q('attMore')?.addEventListener('click',()=>{renderLimit+=PAGE_ROWS;renderTable()});
  }
  function applyRegister(data,month,fromCache=false){register=data;loadedMonth=month;populateDepartments();const range=rangeForMonth(month);q('attPeriodLabel').textContent=`${range.from} — ${range.to}`;q('attGenerated').textContent=fromCache?'آخر نسخة جاهزة • جار التحقق في الخلفية':`آخر تحديث ${new Intl.DateTimeFormat('ar-SA',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit'}).format(new Date())}`;applyFilters()}
  async function loadRegister(force=false,silent=false){
    const month=q('attMonth')?.value||currentMonth();
    if(!force&&register&&loadedMonth===month){applyFilters();return register}
    if(!force){const cached=readCache(month);if(cached){applyRegister(cached,month,true);setTimeout(()=>loadRegister(true,true),80);return cached}}
    if(loadPromise&&loadingMonth===month)return loadPromise;
    setError('');if(!silent)setLoading();loadingMonth=month;
    const controller=new AbortController();
    loadPromise=(async()=>{try{const range=rangeForMonth(month),data=await post('register',range,controller.signal);writeCache(month,data);applyRegister(data,month,false);return data}catch(e){if(!register||loadedMonth!==month){register=null;filtered=[];setError(e.message||String(e));q('attTableWrap').innerHTML=`<div class="att-empty"><b>تعذر تحميل الكشف</b><span>${esc(e.message||e)}</span><br><button id="attGoConnect" class="att-btn" style="margin-top:12px">فتح ربط Odoo</button></div>`;q('attGoConnect')?.addEventListener('click',()=>document.querySelector('.nav button[data-page="integrationPage"]')?.click())}else{setError('تعذر تحديث أحدث نسخة من Odoo؛ المعروض هو آخر كشف تم تحميله بنجاح.')}throw e}finally{if(loadingMonth===month)loadingMonth='';loadPromise=null}})();
    return loadPromise
  }
  function openEditor(r){if(!r||!r.editable)return;currentEdit=r;q('attEditTitle').textContent=r.attendanceId?'تعديل البصمة':'إضافة بصمة';q('attEditSub').textContent=`${r.employeeCode||r.employeeId} • ${r.employeeName} • ${r.date}`;q('attEditIn').value=r.checkIn||r.expectedIn||'';q('attEditOut').value=r.checkOut||r.expectedOut||'';q('attEditReason').value='';const note=q('attEditNote');if(r.leaveType){note.className='att-edit-note warning';note.textContent=`يوجد ${r.leaveType} (${r.leaveState||'—'}) في هذا اليوم. إذا حفظت بصمة سيظهر تعارض للمراجعة.`}else{note.className='att-edit-note';note.textContent=r.attendanceId?'سيتم تحديث نفس سجل الحضور في Odoo مباشرة.':'سيتم إنشاء سجل حضور جديد في Odoo لهذا اليوم.'}q('attEditBack').classList.add('show')}
  function closeEditor(){q('attEditBack').classList.remove('show');currentEdit=null}
  async function saveEditor(){if(!currentEdit)return;const cin=q('attEditIn').value,cout=q('attEditOut').value,reason=q('attEditReason').value.trim()||(currentEdit.attendanceId?'تعديل حضور من NDR':'إضافة حضور من NDR');if(!cin)return notify('وقت الدخول مطلوب');if(!confirm('سيتم حفظ التعديل مباشرة في Odoo. متابعة؟'))return;const btn=q('attEditSave');btn.disabled=true;btn.textContent='جار الحفظ…';try{const d=await post('save',{employeeId:currentEdit.employeeId,attendanceId:currentEdit.attendanceId||null,checkIn:`${currentEdit.date}T${cin}`,checkOut:cout?`${currentEdit.date}T${cout}`:'',reason});notify(d.message||'تم الحفظ في Odoo');const m=q('attMonth').value||currentMonth();clearCache(m);closeEditor();await loadRegister(true,false)}catch(e){notify(e.message||String(e))}finally{btn.disabled=false;btn.textContent='حفظ في Odoo'}}
  async function exportExcel(){if(!filtered.length)return notify('لا توجد سجلات معروضة لتصديرها');const btn=q('attExport'),month=q('attMonth').value||currentMonth(),range=rangeForMonth(month),empIds=[...new Set(filtered.map(r=>r.employeeId))],visibleKeys=filtered.map(r=>`${r.employeeId}|${r.date}`),displayStatus=Object.fromEntries(filtered.map(r=>[`${r.employeeId}|${r.date}`,classification(r).label]));btn.disabled=true;btn.textContent='جار إنشاء Excel…';setError('');try{const t=token();if(!t)throw new Error('اتصال Odoo غير جاهز');const r=await fetch(`${API}?action=export`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({launchToken:t,...range,employeeIds:empIds,visibleKeys,displayStatus})});if(!r.ok){let d={};try{d=await r.json()}catch{}throw new Error(d.message||'تعذر إنشاء Excel')}const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`NDR_Attendance_${month}.xlsx`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);notify('تم تجهيز نفس الكشف الظاهر في Excel')}catch(e){setError(e.message||String(e))}finally{btn.disabled=false;btn.textContent='Excel الحالي'}}
  function bind(){q('attendanceNavBtn')?.addEventListener('click',()=>setAttendanceView(true));document.addEventListener('click',e=>{const b=e.target.closest?.('.nav button');if(b&&b.id!=='attendanceNavBtn'&&q('attendancePage')?.classList.contains('active'))setAttendanceView(false)});q('attMonth').value=currentMonth();q('attReload').addEventListener('click',()=>{const m=q('attMonth').value||currentMonth();clearCache(m);loadRegister(true,false).catch(()=>{})});q('attMonth').addEventListener('change',()=>{register=null;loadedMonth='';loadRegister(false,false).catch(()=>{})});q('attSearch').addEventListener('input',applyFilters);q('attDepartment').addEventListener('change',applyFilters);q('attMode').addEventListener('change',applyFilters);q('attPrint').addEventListener('click',()=>window.print());q('attExport').addEventListener('click',exportExcel);q('attEditClose').addEventListener('click',closeEditor);q('attEditCancel').addEventListener('click',closeEditor);q('attEditBack').addEventListener('click',e=>{if(e.target===q('attEditBack'))closeEditor()});q('attEditSave').addEventListener('click',saveEditor)}
  async function boot(){for(let i=0;i<120;i++){if(document.getElementById('appShell')&&document.querySelector('.content')&&document.querySelector('.nav'))break;await sleep(70)}if(!document.getElementById('appShell'))return;addCss();buildPage();bind()}
  boot().catch(e=>console.warn('NDR Attendance:',e));
})();