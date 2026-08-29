(()=>{
  'use strict';
  const API='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-attendance-register';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let register=null, filtered=[], currentEdit=null, loadedMonth='';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const token=()=>window.NDROdooVault?.token||localStorage.getItem('ndr-connector-token')||'';
  const q=id=>document.getElementById(id);
  function notify(msg){try{if(typeof toast==='function')return toast(msg)}catch{}const t=q('toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800)}}
  function currentMonth(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7)}
  function rangeForMonth(m){const [y,mo]=m.split('-').map(Number),last=new Date(Date.UTC(y,mo,0)).getUTCDate();return{from:`${m}-01`,to:`${m}-${String(last).padStart(2,'0')}`}}
  function statusClass(s){s=String(s||'');if(s.includes('تعارض'))return'conflict';if(s==='إجازة')return'leave';if(s==='حضور')return'present';if(s.includes('معلق'))return'pending';if(s.includes('بصمة'))return'missing';if(s.includes('مستقبلي'))return'future';return'off'}
  function addCss(){if(document.querySelector('link[data-ndr-attendance]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='/ndr-hr-intelligence/attendance.css';l.dataset.ndrAttendance='1';document.head.appendChild(l)}
  function buildPage(){
    if(q('attendancePage'))return;
    const nav=document.querySelector('.nav'),integration=nav?.querySelector('[data-page="integrationPage"]');
    if(nav){const b=document.createElement('button');b.id='attendanceNavBtn';b.dataset.page='attendancePage';b.innerHTML='<span class="navicon">◫</span><span class="navtext">الحضور والانصراف</span>';integration?nav.insertBefore(b,integration):nav.appendChild(b)}
    const content=document.querySelector('.content');if(!content)return;
    const s=document.createElement('section');s.id='attendancePage';s.className='panelpage';s.innerHTML=`
      <div class="att-page">
        <div class="att-head"><div><span class="att-kicker">تشغيل الموارد البشرية</span><h2>الحضور والانصراف</h2><p>كشف يومي موحد يدمج الحضور الفعلي مع جدول الموظف والإجازات من Odoo. أي تعديل معتمد هنا يكتب على سجل الحضور في Odoo مباشرة.</p></div><div class="att-actions"><button id="attReload" class="att-btn">تحديث الكشف</button><button id="attPrint" class="att-btn">طباعة</button><button id="attExport" class="att-btn primary">تصدير Excel للمحاسبة</button></div></div>
        <div class="att-toolbar">
          <div class="att-field"><label>شهر الكشف</label><input id="attMonth" type="month"></div>
          <div class="att-field"><label>بحث بالموظف</label><input id="attSearch" type="search" placeholder="اكتب اسم الموظف أو رقمه"></div>
          <div class="att-field"><label>القسم</label><select id="attDepartment"><option value="">كل الأقسام</option></select></div>
          <div class="att-field"><label>حالة اليوم</label><select id="attStatus"><option value="">كل الحالات</option><option>حضور</option><option>إجازة</option><option>تعارض: حضور + إجازة</option><option>لا توجد بصمة</option><option>طلب إجازة معلق</option><option>راحة / لا يوجد دوام</option></select></div>
        </div>
        <div id="attError" class="att-error"></div>
        <div class="att-summary">
          <div class="att-stat"><span>الموظفون</span><b id="attEmployees">0</b></div>
          <div class="att-stat good"><span>أيام حضور</span><b id="attPresent">0</b></div>
          <div class="att-stat leave"><span>أيام إجازة</span><b id="attLeaves">0</b></div>
          <div class="att-stat danger"><span>تعارضات</span><b id="attConflicts">0</b></div>
          <div class="att-stat warn"><span>بدون بصمة</span><b id="attMissing">0</b></div>
          <div class="att-stat"><span>سجلات معروضة</span><b id="attRows">0</b></div>
        </div>
        <div class="att-sheet">
          <div class="att-sheet-head"><div><b>كشف الحضور والانصراف</b><span id="attPeriodLabel">—</span></div><span id="attGenerated">—</span></div>
          <div id="attTableWrap" class="att-table-wrap"><div class="att-empty"><b>اختر الشهر لعرض الكشف</b><span>يتم جلب الحضور والإجازات مباشرة من Odoo.</span></div></div>
          <div class="att-smallnote">نوع الإجازة يظهر من طلب الإجازة نفسه. وجود حضور وإجازة معتمدة في اليوم نفسه يظهر كتعارض حتى تتم مراجعته قبل إرسال الملف للمحاسبة.</div>
        </div>
      </div>`;content.appendChild(s);
    const modal=document.createElement('div');modal.id='attEditBack';modal.className='att-modalback';modal.innerHTML=`<div class="att-modal"><div class="att-modal-head"><div><h3 id="attEditTitle">تعديل الحضور</h3><p id="attEditSub">—</p></div><button id="attEditClose" class="att-close">×</button></div><div class="att-modal-body"><div id="attEditNote" class="att-edit-note"></div><div class="att-edit-grid"><div class="att-edit-field"><label>الدخول</label><input id="attEditIn" type="time"></div><div class="att-edit-field"><label>الخروج</label><input id="attEditOut" type="time"></div></div><div class="att-edit-field"><label>سبب التعديل — يحفظ في سجل تدقيق NDR</label><textarea id="attEditReason" placeholder="مثال: تصحيح بصمة بناء على اعتماد المشرف"></textarea></div></div><div class="att-modal-foot"><button id="attEditCancel" class="att-btn">إلغاء</button><button id="attEditSave" class="att-btn primary">حفظ في Odoo</button></div></div>`;document.body.appendChild(modal);
  }
  function setAttendanceView(on){
    const page=q('attendancePage'),btn=q('attendanceNavBtn');if(!page||!btn)return;
    if(on){document.querySelectorAll('.panelpage').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));page.classList.add('active');btn.classList.add('active');if(q('pageTitle'))q('pageTitle').textContent='الحضور والانصراف';if(q('crumbTitle'))q('crumbTitle').textContent='ATTENDANCE';if(q('generated'))q('generated').textContent='كشف مباشر من Odoo';if(q('runBtn'))q('runBtn').style.display='none';if(q('refreshBtn'))q('refreshBtn').style.display='none';if(!loadedMonth)loadRegister();}
    else{page.classList.remove('active');btn.classList.remove('active');if(q('runBtn'))q('runBtn').style.display='';if(q('refreshBtn'))q('refreshBtn').style.display=''}
  }
  async function post(action,body){const t=token();if(!t)throw new Error('اتصال Odoo غير جاهز. افتح ربط Odoo واحفظ الاتصال أولا.');const r=await fetch(`${API}?action=${encodeURIComponent(action)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({launchToken:t,...body})});let d=null;try{d=await r.json()}catch{}if(!r.ok)throw new Error(d?.message||'تعذر تنفيذ الطلب');return d}
  function setError(msg=''){const el=q('attError');if(!el)return;el.textContent=msg;el.classList.toggle('show',!!msg)}
  function setLoading(){q('attTableWrap').innerHTML='<div class="att-loading">يتم جمع الحضور والإجازات وجدول العمل من Odoo…</div>'}
  function populateDepartments(){const sel=q('attDepartment'),current=sel.value,deps=[...new Set((register?.rows||[]).map(r=>r.department).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));sel.innerHTML='<option value="">كل الأقسام</option>'+deps.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');if(deps.includes(current))sel.value=current}
  function applyFilters(){
    const search=(q('attSearch').value||'').trim().toLowerCase(),dep=q('attDepartment').value,status=q('attStatus').value;
    filtered=(register?.rows||[]).filter(r=>(!search||String(r.employeeName).toLowerCase().includes(search)||String(r.employeeCode||'').toLowerCase().includes(search))&&(!dep||r.department===dep)&&(!status||r.status===status));
    renderSummary();renderTable();
  }
  function renderSummary(){const rs=filtered,emps=new Set(rs.map(r=>r.employeeId));q('attEmployees').textContent=String(emps.size);q('attPresent').textContent=String(rs.filter(r=>r.status==='حضور').length);q('attLeaves').textContent=String(rs.filter(r=>r.status==='إجازة').length);q('attConflicts').textContent=String(rs.filter(r=>String(r.status).includes('تعارض')).length);q('attMissing').textContent=String(rs.filter(r=>r.status==='لا توجد بصمة').length);q('attRows').textContent=String(rs.length)}
  function renderTable(){
    const wrap=q('attTableWrap');if(!filtered.length){wrap.innerHTML='<div class="att-empty"><b>لا توجد نتائج مطابقة</b><span>غير المرشحات أو اختر فترة أخرى.</span></div>';return}
    wrap.innerHTML=`<table class="att-table"><thead><tr><th>الموظف</th><th>القسم</th><th>التاريخ</th><th>اليوم</th><th>الدوام المفترض</th><th>الدخول</th><th>الخروج</th><th>ساعات العمل</th><th>التأخير</th><th>الخروج المبكر</th><th>حالة اليوم</th><th>نوع الإجازة</th><th>حالة الإجازة</th><th>إجراء</th></tr></thead><tbody>${filtered.map((r,i)=>`<tr>
      <td class="emp">${esc(r.employeeName)}${r.employeeCode?`<div style="font-size:7px;color:#6f838f;margin-top:2px">${esc(r.employeeCode)}</div>`:''}</td><td>${esc(r.department||'—')}</td><td>${esc(r.date)}</td><td class="muted">${esc(r.day)}</td><td class="num">${esc(r.expectedIn||'—')} – ${esc(r.expectedOut||'—')}</td><td class="num">${esc(r.checkIn||'—')}</td><td class="num">${esc(r.checkOut||'—')}</td><td class="num">${Number(r.workedHours||0).toFixed(2)}</td><td class="num">${r.lateMinutes?esc(r.lateMinutes+' د'):'—'}</td><td class="num">${r.earlyMinutes?esc(r.earlyMinutes+' د'):'—'}</td><td><span class="att-status ${statusClass(r.status)}">${esc(r.status)}</span></td><td>${esc(r.leaveType||'—')}</td><td class="muted">${esc(r.leaveState||'—')}</td><td><button class="att-edit" data-att-edit="${i}" ${(!r.editable||r.status==='مستقبلي')?'disabled':''} title="${esc(r.editReason||'')}">${r.attendanceId?'تعديل':'إضافة حضور'}</button></td>
    </tr>`).join('')}</tbody></table>`;
    wrap.querySelectorAll('[data-att-edit]').forEach(b=>b.addEventListener('click',()=>openEditor(filtered[Number(b.dataset.attEdit)])));
  }
  async function loadRegister(force=false){
    const month=q('attMonth')?.value||currentMonth();if(!force&&register&&loadedMonth===month){applyFilters();return}setError('');setLoading();
    try{const range=rangeForMonth(month);register=await post('register',range);loadedMonth=month;populateDepartments();q('attPeriodLabel').textContent=`${range.from} — ${range.to}`;q('attGenerated').textContent=`آخر تحديث ${new Intl.DateTimeFormat('ar-SA',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit'}).format(new Date())}`;applyFilters()}
    catch(e){register=null;filtered=[];setError(e.message||String(e));q('attTableWrap').innerHTML=`<div class="att-empty"><b>تعذر تحميل الكشف</b><span>${esc(e.message||e)}</span><br><button id="attGoConnect" class="att-btn" style="margin-top:12px">فتح ربط Odoo</button></div>`;q('attGoConnect')?.addEventListener('click',()=>document.querySelector('.nav button[data-page="integrationPage"]')?.click())}
  }
  function openEditor(r){if(!r||!r.editable)return;currentEdit=r;q('attEditTitle').textContent=r.attendanceId?'تعديل سجل الحضور':'إضافة سجل حضور';q('attEditSub').textContent=`${r.employeeName} • ${r.date} • ${r.day}`;q('attEditIn').value=r.checkIn||r.expectedIn||'';q('attEditOut').value=r.checkOut||r.expectedOut||'';q('attEditReason').value='';const note=q('attEditNote');if(String(r.status).includes('إجازة')){note.className='att-edit-note warning';note.textContent=`هذا اليوم مرتبط بـ ${r.leaveType||'إجازة'} (${r.leaveState||'—'}). إضافة أو تعديل حضور قد ينتج تعارضا وسيظهر في الكشف.`}else{note.className='att-edit-note';note.textContent=r.attendanceId?'سيتم تحديث نفس سجل الحضور في Odoo، ولن يتم إنشاء سجل مكرر.':'لا يوجد سجل حضور لهذا اليوم. عند الحفظ سيتم إنشاء سجل جديد في Odoo.'}q('attEditBack').classList.add('show')}
  function closeEditor(){q('attEditBack').classList.remove('show');currentEdit=null}
  async function saveEditor(){if(!currentEdit)return;const cin=q('attEditIn').value,cout=q('attEditOut').value,reason=q('attEditReason').value.trim();if(!cin)return notify('وقت الدخول مطلوب');if(!reason)return notify('اكتب سبب التعديل قبل الحفظ');const conflict=String(currentEdit.status).includes('إجازة');const msg=conflict?'اليوم مرتبط بإجازة. هل تريد حفظ الحضور في Odoo رغم ذلك؟':'سيتم حفظ التعديل مباشرة في Odoo. متابعة؟';if(!confirm(msg))return;const btn=q('attEditSave');btn.disabled=true;btn.textContent='جار الحفظ…';try{const d=await post('save',{employeeId:currentEdit.employeeId,attendanceId:currentEdit.attendanceId||null,checkIn:`${currentEdit.date}T${cin}`,checkOut:cout?`${currentEdit.date}T${cout}`:'',reason});notify(d.message||'تم الحفظ في Odoo');closeEditor();await loadRegister(true)}catch(e){notify(e.message||String(e))}finally{btn.disabled=false;btn.textContent='حفظ في Odoo'}}
  async function exportExcel(){const btn=q('attExport'),month=q('attMonth').value||currentMonth(),range=rangeForMonth(month),search=(q('attSearch').value||'').trim().toLowerCase(),dep=q('attDepartment').value;const empIds=[...new Set((register?.rows||[]).filter(r=>(!search||String(r.employeeName).toLowerCase().includes(search)||String(r.employeeCode||'').toLowerCase().includes(search))&&(!dep||r.department===dep)).map(r=>r.employeeId))];btn.disabled=true;btn.textContent='جار إنشاء Excel…';setError('');try{const t=token();if(!t)throw new Error('اتصال Odoo غير جاهز');const r=await fetch(`${API}?action=export`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({launchToken:t,...range,employeeIds:empIds.length?empIds:undefined})});if(!r.ok){let d={};try{d=await r.json()}catch{}throw new Error(d.message||'تعذر إنشاء ملف Excel')}const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`NDR_Attendance_${month}.xlsx`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);notify('تم تجهيز ملف Excel للمحاسبة')}catch(e){setError(e.message||String(e))}finally{btn.disabled=false;btn.textContent='تصدير Excel للمحاسبة'}}
  function bind(){
    q('attendanceNavBtn')?.addEventListener('click',()=>setAttendanceView(true));
    document.addEventListener('click',e=>{const b=e.target.closest?.('.nav button');if(b&&b.id!=='attendanceNavBtn'&&q('attendancePage')?.classList.contains('active'))setAttendanceView(false)});
    q('attMonth').value=currentMonth();q('attReload').addEventListener('click',()=>loadRegister(true));q('attMonth').addEventListener('change',()=>loadRegister(true));q('attSearch').addEventListener('input',applyFilters);q('attDepartment').addEventListener('change',applyFilters);q('attStatus').addEventListener('change',applyFilters);q('attPrint').addEventListener('click',()=>window.print());q('attExport').addEventListener('click',exportExcel);q('attEditClose').addEventListener('click',closeEditor);q('attEditCancel').addEventListener('click',closeEditor);q('attEditBack').addEventListener('click',e=>{if(e.target===q('attEditBack'))closeEditor()});q('attEditSave').addEventListener('click',saveEditor);
  }
  async function boot(){for(let i=0;i<120;i++){if(document.getElementById('appShell')&&document.querySelector('.content')&&document.querySelector('.nav'))break;await sleep(70)}if(!document.getElementById('appShell'))return;addCss();buildPage();bind()}
  boot().catch(e=>console.warn('NDR Attendance:',e));
})();
