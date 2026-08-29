(()=>{
'use strict';
if(window.__ndrAttendanceV2)return;window.__ndrAttendanceV2=true;
const API='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-attendance-register';
const PAGE_ROWS=40,CACHE_TTL=120000,LATE_GRACE=20,EARLY_GRACE=6;
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const token=()=>window.NDROdooVault?.token||localStorage.getItem('ndr-connector-token')||'';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const currentMonth=()=>today().slice(0,7);
const rangeForMonth=m=>{const [y,mo]=m.split('-').map(Number),last=new Date(Date.UTC(y,mo,0)).getUTCDate();return{from:`${m}-01`,to:`${m}-${String(last).padStart(2,'0')}`}};
let register=null,filtered=[],loadedMonth='',renderLimit=PAGE_ROWS,controller=null,loadId=0,currentEdit=null,searchTimer=null;
const cacheKey=m=>`ndr-attendance-cache-v4:${m}`;
function readCache(m){try{const x=JSON.parse(sessionStorage.getItem(cacheKey(m))||'null');return x&&Date.now()-Number(x.ts||0)<CACHE_TTL&&Array.isArray(x.data?.rows)?x.data:null}catch{return null}}
function writeCache(m,d){try{sessionStorage.setItem(cacheKey(m),JSON.stringify({ts:Date.now(),data:d}))}catch{}}
function clearCache(m){try{sessionStorage.removeItem(cacheKey(m))}catch{}}
function notify(msg){try{if(typeof toast==='function')return toast(msg)}catch{}console.log(msg)}
function classification(r){
  if(r.__ndrClass)return r.__ndrClass;
  const status=String(r.status||'');let x;
  if(status.includes('تعارض'))x={problem:true,label:'تعارض حضور وإجازة',cls:'conflict'};
  else if(status==='إجازة')x={problem:true,label:'إجازة',cls:'leave'};
  else if(status.includes('معلق'))x={problem:true,label:'طلب إجازة معلق',cls:'pending'};
  else if(status==='مستقبلي')x={problem:false,label:'مستقبلي',cls:'off'};
  else if(r.expectedIn&&!r.checkIn&&r.date<=today())x={problem:true,label:'غياب / لا توجد بصمة',cls:'missing'};
  else if(r.checkIn&&!r.checkOut&&r.date<=today())x={problem:true,label:'بصمة خروج مفقودة',cls:'missing'};
  else{const late=Number(r.lateMinutes||0)>LATE_GRACE,early=Number(r.earlyMinutes||0)>EARLY_GRACE;if(late&&early)x={problem:true,label:'تأخير + خروج مبكر',cls:'warning'};else if(late)x={problem:true,label:'تأخير',cls:'warning'};else if(early)x={problem:true,label:'خروج مبكر',cls:'warning'};else if(r.checkIn)x={problem:false,label:'سليم',cls:'present'};else x={problem:false,label:status||'راحة',cls:'off'}}
  try{Object.defineProperty(r,'__ndrClass',{value:x,writable:true,configurable:true})}catch{}
  return x;
}
function addCss(){if(document.querySelector('link[data-ndr-attendance]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='/ndr-hr-intelligence/attendance.css?v=20260829-10';l.dataset.ndrAttendance='1';document.head.appendChild(l)}
function build(){
  if($('attendancePage'))return;
  const nav=document.querySelector('.nav'),integration=nav?.querySelector('[data-page="integrationPage"]');
  if(nav){const b=document.createElement('button');b.id='attendanceNavBtn';b.dataset.page='attendancePage';b.innerHTML='<span class="navicon">◫</span><span class="navtext">الحضور والانصراف</span>';integration?nav.insertBefore(b,integration):nav.appendChild(b)}
  const content=document.querySelector('.content');if(!content)return;
  const s=document.createElement('section');s.id='attendancePage';s.className='panelpage';s.innerHTML=`<div class="att-page"><div class="att-head"><div><span class="att-kicker">متابعة الحضور</span><h2>الحضور والانصراف</h2></div><div class="att-actions"><button id="attReload" class="att-btn">تحديث</button><button id="attPrint" class="att-btn">طباعة</button><button id="attExport" class="att-btn primary">Excel</button></div></div><div class="att-toolbar"><div class="att-field"><label>الشهر</label><input id="attMonth" type="month"></div><div class="att-field"><label>الموظف</label><input id="attSearch" type="search" placeholder="رقم الموظف أو الاسم"></div><div class="att-field"><label>القسم</label><select id="attDepartment"><option value="">كل الأقسام</option></select></div><div class="att-field"><label>العرض</label><select id="attMode"><option value="issues">المشكلات والإجازات</option><option value="department">السجل الكامل للقسم</option></select></div></div><div id="attError" class="att-error"></div><div class="att-summary"><div class="att-stat"><span>موظفون للمراجعة</span><b id="attEmployees">0</b></div><div class="att-stat warn"><span>تأخير / خروج مبكر</span><b id="attLate">0</b></div><div class="att-stat danger"><span>غياب / بصمة ناقصة</span><b id="attMissing">0</b></div><div class="att-stat leave"><span>إجازات</span><b id="attLeaves">0</b></div><div class="att-stat danger"><span>تعارضات</span><b id="attConflicts">0</b></div></div><div class="att-sheet"><div class="att-sheet-head"><div><b>كشف المتابعة</b><span id="attPeriodLabel">—</span></div><span id="attGenerated">—</span></div><div id="attTableWrap" class="att-table-wrap"><div class="att-empty"><b>اختر الحضور والانصراف</b><span>سيتم تحميل البيانات بدون تجميد الصفحة.</span></div></div></div></div>`;content.appendChild(s);
  const m=document.createElement('div');m.id='attEditBack';m.className='att-modalback';m.innerHTML=`<div class="att-modal"><div class="att-modal-head"><div><h3 id="attEditTitle">تعديل الحضور</h3><p id="attEditSub">—</p></div><button id="attEditClose" class="att-close">×</button></div><div class="att-modal-body"><div id="attEditNote" class="att-edit-note"></div><div class="att-edit-grid"><div class="att-edit-field"><label>الدخول</label><input id="attEditIn" type="time"></div><div class="att-edit-field"><label>الخروج</label><input id="attEditOut" type="time"></div></div><div class="att-edit-field"><label>ملاحظة</label><textarea id="attEditReason"></textarea></div></div><div class="att-modal-foot"><button id="attEditCancel" class="att-btn">إلغاء</button><button id="attEditSave" class="att-btn primary">حفظ في Odoo</button></div></div>`;document.body.appendChild(m);
}
function active(){return $('attendancePage')?.classList.contains('active')}
function setView(on){
  window.__ndrAttendanceActive=!!on;window.dispatchEvent(new CustomEvent('ndr:attendance-view',{detail:{active:!!on}}));
  const page=$('attendancePage'),btn=$('attendanceNavBtn');if(!page||!btn)return;
  if(on){document.querySelectorAll('.panelpage').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));page.classList.add('active');btn.classList.add('active');if($('pageTitle'))$('pageTitle').textContent='الحضور والانصراف';if($('generated'))$('generated').textContent='استثناءات الحضور والإجازات';if($('runBtn'))$('runBtn').style.display='none';if($('refreshBtn'))$('refreshBtn').style.display='none';requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!loadedMonth)scheduleLoad(false)}));}
  else{page.classList.remove('active');btn.classList.remove('active');if($('runBtn'))$('runBtn').style.display='';if($('refreshBtn'))$('refreshBtn').style.display='';if(controller){controller.abort();controller=null}}
}
function setError(t=''){const e=$('attError');if(!e)return;e.textContent=t;e.classList.toggle('show',!!t)}
function setLoading(){const w=$('attTableWrap');if(w)w.innerHTML='<div class="att-loading">جاري تحميل بيانات الحضور…</div>'}
async function post(action,body,signal){const t=token();if(!t)throw new Error('اتصال Odoo غير جاهز');const r=await fetch(`${API}?action=${encodeURIComponent(action)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({launchToken:t,...body}),signal});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.message||'تعذر تحميل البيانات');return d}
function applyRegister(data,month,fromCache=false){
  register=data;loadedMonth=month;const rows=Array.isArray(data?.rows)?data.rows:[];
  for(const r of rows){if(r.__ndrClass)try{delete r.__ndrClass}catch{}}
  const deps=[...new Set(rows.map(r=>r.department).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));const sel=$('attDepartment'),cur=sel.value;sel.innerHTML='<option value="">كل الأقسام</option>'+deps.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');if(deps.includes(cur))sel.value=cur;
  const rg=rangeForMonth(month);$('attPeriodLabel').textContent=`${rg.from} — ${rg.to}`;$('attGenerated').textContent=fromCache?'نسخة جاهزة':`محدث ${new Intl.DateTimeFormat('ar-SA',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit'}).format(new Date())}`;
  requestAnimationFrame(applyFilters);
}
function scheduleLoad(force=false){setTimeout(()=>loadRegister(force).catch(()=>{}),160)}
async function loadRegister(force=false){
  const month=$('attMonth')?.value||currentMonth();
  if(!force&&register&&loadedMonth===month){applyFilters();return}
  if(!force){const c=readCache(month);if(c){applyRegister(c,month,true);return}}
  if(controller)controller.abort();controller=new AbortController();const id=++loadId;setError('');setLoading();
  try{const data=await post('register',rangeForMonth(month),controller.signal);if(id!==loadId)return;writeCache(month,data);await new Promise(r=>requestAnimationFrame(r));applyRegister(data,month,false)}
  catch(e){if(e.name==='AbortError')return;setError(e.message||String(e));const w=$('attTableWrap');if(w)w.innerHTML=`<div class="att-empty"><b>تعذر تحميل الكشف</b><span>${esc(e.message||e)}</span></div>`}
  finally{if(id===loadId)controller=null}
}
function applyFilters(){
  if(!register||!active())return;renderLimit=PAGE_ROWS;const rows=register.rows||[],search=($('attSearch').value||'').trim().toLowerCase(),dep=$('attDepartment').value,mode=$('attMode').value;
  const out=[];for(const r of rows){if(search&&!String(r.employeeName||'').toLowerCase().includes(search)&&!String(r.employeeCode||'').toLowerCase().includes(search))continue;if(dep&&r.department!==dep)continue;if(mode==='department'){if(!dep)continue;if(r.status==='مستقبلي')continue;if(!(r.expectedIn||r.checkIn||r.leaveType||String(r.status).includes('إجازة')))continue}else if(!classification(r).problem)continue;out.push(r)}
  out.sort((a,b)=>String(a.employeeName||'').localeCompare(String(b.employeeName||''),'ar')||String(a.date||'').localeCompare(String(b.date||'')));filtered=out;renderSummary();requestAnimationFrame(renderTable);
}
function renderSummary(){const cs=filtered.map(classification);$('attEmployees').textContent=String(new Set(filtered.map(r=>r.employeeId)).size);$('attLate').textContent=String(cs.filter(x=>x.label.includes('تأخير')||x.label.includes('خروج مبكر')).length);$('attMissing').textContent=String(cs.filter(x=>x.label.includes('غياب')||x.label.includes('بصمة')).length);$('attLeaves').textContent=String(filtered.filter(r=>r.leaveType).length);$('attConflicts').textContent=String(cs.filter(x=>x.cls==='conflict').length)}
function punch(r){return(!r.checkIn&&!r.checkOut)?'—':`${r.checkIn||'—'} ← ${r.checkOut||'—'}`}
function renderTable(){
  const wrap=$('attTableWrap');if(!wrap||!active())return;const mode=$('attMode').value,dep=$('attDepartment').value;if(!filtered.length){const msg=mode==='department'&&!dep?'اختر قسما لعرض السجل الكامل':'لا توجد حالات تحتاج مراجعة';wrap.innerHTML=`<div class="att-empty"><b>${msg}</b></div>`;return}
  const shown=filtered.slice(0,renderLimit),remaining=filtered.length-shown.length;const rows=shown.map((r,i)=>{const c=classification(r),leave=r.leaveType?`${r.leaveType}${r.leaveState?` • ${r.leaveState}`:''}`:'—';return`<tr class="${c.problem?'needs-review':'normal-row'}"><td class="code">${esc(r.employeeCode||r.employeeId)}</td><td class="emp">${esc(r.employeeName)}</td><td><b>${esc(r.date)}</b><small>${esc(r.day||'')}</small></td><td class="punch">${esc(punch(r))}</td><td class="late">${r.lateMinutes?`${esc(r.lateMinutes)} د`:'—'}</td><td class="leavecell">${esc(leave)}</td><td><span class="att-status ${c.cls}">${esc(c.label)}</span></td><td><button class="att-edit" data-edit="${i}" ${(!r.editable||r.status==='مستقبلي')?'disabled':''}>${r.attendanceId?'تعديل':'إضافة'}</button></td></tr>`}).join('');
  wrap.innerHTML=`<table class="att-table"><thead><tr><th>رقم الموظف</th><th>اسم الموظف</th><th>التاريخ</th><th>الحضور والانصراف</th><th>التأخير</th><th>الإجازة</th><th>الحالة</th><th>تعديل</th></tr></thead><tbody>${rows}</tbody></table>${remaining>0?`<div style="padding:12px;text-align:center"><button id="attMore" class="att-btn">عرض ${Math.min(PAGE_ROWS,remaining)} إضافية</button></div>`:''}`;
  wrap.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEditor(shown[Number(b.dataset.edit)]));$('attMore')?.addEventListener('click',()=>{renderLimit+=PAGE_ROWS;requestAnimationFrame(renderTable)});
}
function openEditor(r){if(!r||!r.editable)return;currentEdit=r;$('attEditTitle').textContent=r.attendanceId?'تعديل البصمة':'إضافة بصمة';$('attEditSub').textContent=`${r.employeeCode||r.employeeId} • ${r.employeeName} • ${r.date}`;$('attEditIn').value=r.checkIn||r.expectedIn||'';$('attEditOut').value=r.checkOut||r.expectedOut||'';$('attEditReason').value='';$('attEditNote').textContent=r.leaveType?`يوجد ${r.leaveType} (${r.leaveState||'—'}) في هذا اليوم.`:(r.attendanceId?'سيتم تحديث نفس سجل الحضور في Odoo.':'سيتم إنشاء سجل حضور جديد في Odoo.');$('attEditBack').classList.add('show')}
function closeEditor(){$('attEditBack').classList.remove('show');currentEdit=null}
async function saveEditor(){if(!currentEdit)return;const cin=$('attEditIn').value,cout=$('attEditOut').value;if(!cin)return notify('وقت الدخول مطلوب');const b=$('attEditSave');b.disabled=true;b.textContent='جار الحفظ…';try{await post('save',{employeeId:currentEdit.employeeId,attendanceId:currentEdit.attendanceId||null,checkIn:`${currentEdit.date}T${cin}`,checkOut:cout?`${currentEdit.date}T${cout}`:'',reason:$('attEditReason').value.trim()||(currentEdit.attendanceId?'تعديل حضور من NDR':'إضافة حضور من NDR')});notify('تم الحفظ في Odoo');clearCache($('attMonth').value||currentMonth());closeEditor();await loadRegister(true);window.dispatchEvent(new CustomEvent('ndr:attendance-changed',{detail:{source:'attendance-v2'}}))}catch(e){notify(e.message)}finally{b.disabled=false;b.textContent='حفظ في Odoo'}}
async function exportExcel(){if(!filtered.length)return notify('لا توجد سجلات للتصدير');const b=$('attExport'),month=$('attMonth').value||currentMonth(),rg=rangeForMonth(month),employeeIds=[...new Set(filtered.map(r=>r.employeeId))],visibleKeys=filtered.map(r=>`${r.employeeId}|${r.date}`),displayStatus=Object.fromEntries(filtered.map(r=>[`${r.employeeId}|${r.date}`,classification(r).label]));b.disabled=true;try{const t=token(),r=await fetch(`${API}?action=export`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({launchToken:t,...rg,employeeIds,visibleKeys,displayStatus})});if(!r.ok)throw new Error('تعذر إنشاء Excel');const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`NDR_Attendance_${month}.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){notify(e.message)}finally{b.disabled=false}}
function bind(){
  $('attMonth').value=currentMonth();$('attendanceNavBtn').addEventListener('click',()=>setView(true));
  document.addEventListener('click',e=>{const b=e.target.closest?.('.nav button');if(b&&b.id!=='attendanceNavBtn'&&active())setView(false)});
  $('attReload').onclick=()=>{const m=$('attMonth').value||currentMonth();clearCache(m);scheduleLoad(true)};$('attMonth').onchange=()=>{register=null;loadedMonth='';scheduleLoad(false)};$('attSearch').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(applyFilters,120)};$('attDepartment').onchange=applyFilters;$('attMode').onchange=applyFilters;$('attPrint').onclick=()=>window.print();$('attExport').onclick=exportExcel;$('attEditClose').onclick=closeEditor;$('attEditCancel').onclick=closeEditor;$('attEditBack').onclick=e=>{if(e.target===$('attEditBack'))closeEditor()};$('attEditSave').onclick=saveEditor;
  window.addEventListener('ndr:attendance-changed',e=>{if(e?.detail?.source==='attendance-v2')return;clearCache($('attMonth')?.value||currentMonth());if(active())scheduleLoad(true);else{register=null;loadedMonth=''}});
}
(async function boot(){for(let i=0;i<120;i++){if(document.querySelector('.content')&&document.querySelector('.nav'))break;await sleep(70)}if(!document.querySelector('.content'))return;addCss();build();bind()})();
})();