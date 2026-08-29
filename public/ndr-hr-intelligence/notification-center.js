(()=>{
'use strict';
if(window.__ndrNotifyCenterInstalled)return;window.__ndrNotifyCenterInstalled=true;
const STORE='ndr-notification-center-v1',SNAP='ndr-notification-snapshot-v1';
let notes=[],snapshot=null,seeded=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now=()=>new Date().toISOString();
const time=t=>{try{return new Intl.DateTimeFormat('ar-SA',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit'}).format(new Date(t))}catch{return''}};
const srcAr=x=>({attendance:'الحضور',leaves:'الإجازات',planning:'جدول الدوام',employees:'الموظفون',employeeVersions:'العقود',contracts:'العقود',calendarLines:'أوقات العمل',calendarLeaves:'العطل',calendars:'التقويم',departments:'الأقسام',resources:'Planning'}[x]||x);
function load(){try{notes=JSON.parse(localStorage.getItem(STORE)||'[]')||[]}catch{notes=[]}try{snapshot=JSON.parse(sessionStorage.getItem(SNAP)||'null')}catch{snapshot=null}}
function save(){try{localStorage.setItem(STORE,JSON.stringify(notes.slice(0,50)))}catch{}renderBadge();renderList()}
function key(f){try{return typeof findingKey==='function'?findingKey(f):`${f.code}:${f.ref?.model||''}:${f.ref?.id||''}`}catch{return `${f.code}:${f.ref?.id||''}`}}
function currentMap(){const m={};try{for(const f of state?.data?.findings||[]){if(typeof isOpen==='function'&&!isOpen(f))continue;m[key(f)]={title:f.title||'حالة جديدة',employee:f.employee||'',category:f.category||'',severity:f.severity||'medium',code:f.code||''}}}catch{}return m}
function persistSnapshot(m){snapshot=m;try{sessionStorage.setItem(SNAP,JSON.stringify(m))}catch{}}
function ensure(){
  if(document.getElementById('ndrNotifyBtn'))return;
  const host=document.querySelector('.topactions');if(!host)return;
  const btn=document.createElement('button');btn.id='ndrNotifyBtn';btn.className='ndr-notify-btn';btn.type='button';btn.setAttribute('aria-label','التنبيهات الفورية');btn.innerHTML='<span class="ndr-bell">⌁</span><span class="ndr-notify-label">التنبيهات</span><b id="ndrNotifyCount">0</b>';btn.onclick=toggleDrawer;host.prepend(btn);
  const drawer=document.createElement('div');drawer.id='ndrNotifyDrawer';drawer.className='ndr-notify-drawer';drawer.innerHTML='<div class="ndr-notify-head"><div><span>LIVE CHANGES</span><h3>التنبيهات الفورية</h3></div><button id="ndrNotifyClose">×</button></div><div class="ndr-notify-tools"><button id="ndrNotifyRead">تحديد الكل كمقروء</button><button id="ndrNotifyClear">مسح السجل</button></div><div id="ndrNotifyList" class="ndr-notify-list"></div>';document.body.appendChild(drawer);
  const shade=document.createElement('div');shade.id='ndrNotifyShade';shade.className='ndr-notify-shade';shade.onclick=closeDrawer;document.body.appendChild(shade);
  const stack=document.createElement('div');stack.id='ndrNotifyStack';stack.className='ndr-notify-stack';document.body.appendChild(stack);
  document.getElementById('ndrNotifyClose').onclick=closeDrawer;
  document.getElementById('ndrNotifyRead').onclick=()=>{notes=notes.map(x=>({...x,read:true}));save()};
  document.getElementById('ndrNotifyClear').onclick=()=>{notes=[];save()};
  renderBadge();renderList();
}
function toggleDrawer(){const d=document.getElementById('ndrNotifyDrawer');if(!d)return;if(d.classList.contains('show'))closeDrawer();else{d.classList.add('show');document.getElementById('ndrNotifyShade')?.classList.add('show');notes=notes.map(x=>({...x,read:true}));save()}}
function closeDrawer(){document.getElementById('ndrNotifyDrawer')?.classList.remove('show');document.getElementById('ndrNotifyShade')?.classList.remove('show')}
function renderBadge(){ensure();const el=document.getElementById('ndrNotifyCount');if(!el)return;const unread=notes.filter(x=>!x.read).length;el.textContent=unread>99?'99+':String(unread);el.classList.toggle('empty',!unread)}
function renderList(){const host=document.getElementById('ndrNotifyList');if(!host)return;host.innerHTML=notes.length?notes.map(x=>`<button class="ndr-note ${x.read?'read':''}" data-note="${esc(x.id)}"><i class="${esc(x.kind||'info')}"></i><div><strong>${esc(x.title)}</strong><p>${esc(x.text||'')}</p><small>${esc(time(x.at))}</small></div></button>`).join(''):'<div class="ndr-notify-empty">لا توجد تغييرات مسجلة حاليا</div>';host.querySelectorAll('[data-note]').forEach(b=>b.onclick=()=>{const n=notes.find(x=>x.id===b.dataset.note);if(n?.findingKey&&typeof openFinding==='function'){closeDrawer();openFinding(n.findingKey)}})}
function add(title,text,kind='info',findingKey=''){
  const note={id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,title,text,kind,findingKey,at:now(),read:false};notes.unshift(note);notes=notes.slice(0,50);save();popup(note)
}
function popup(n){ensure();const stack=document.getElementById('ndrNotifyStack');if(!stack)return;const el=document.createElement('button');el.className=`ndr-live-pop ${n.kind}`;el.innerHTML=`<i></i><div><strong>${esc(n.title)}</strong><span>${esc(n.text||'')}</span></div>`;el.onclick=()=>{if(n.findingKey&&typeof openFinding==='function')openFinding(n.findingKey);el.remove()};stack.prepend(el);requestAnimationFrame(()=>el.classList.add('show'));setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),240)},5200)}
function process(detail={}){
  ensure();const cur=currentMap();if(!seeded){persistSnapshot(cur);seeded=true;return}
  const prev=snapshot||{},newKeys=Object.keys(cur).filter(k=>!prev[k]),cleared=Object.keys(prev).filter(k=>!cur[k]);
  if(newKeys.length){newKeys.slice(0,3).forEach(k=>{const f=cur[k];const kind=f.severity==='critical'?'critical':f.severity==='high'?'warning':'info';add(f.title,`${f.employee}${f.category?` • ${f.category}`:''}`,kind,k)});if(newKeys.length>3)add(`${newKeys.length} حالات جديدة`,`تم رصد ${newKeys.length} حالات بعد آخر تغيير في Odoo`,'info')}
  if(cleared.length)add('اختفت حالة من المصدر',cleared.length===1?(prev[cleared[0]]?.title||'تمت إزالة الحالة بعد تحديث المصدر'):`${cleared.length} حالات لم تعد موجودة بعد التحديث`,'success');
  const sources=Array.isArray(detail.changedSources)?detail.changedSources:[];
  if(detail.sourceChanged&&!newKeys.length&&!cleared.length){add('تغيير في Odoo',sources.length?`تم تحديث ${sources.map(srcAr).join('، ')} بدون ظهور حالة جديدة`:'تم رصد تغيير وتحديث البيانات','change')}
  persistSnapshot(cur)
}
function seed(){ensure();const cur=currentMap();if(Object.keys(cur).length||state?.data){persistSnapshot(cur);seeded=true}}
load();
window.addEventListener('ndr:audit-updated',e=>process(e.detail||{}));
window.addEventListener('ndr:attendance-changed',()=>{setTimeout(()=>{if(!window.NDRLiveWatch)add('تغيير في الحضور','تم تعديل سجل حضور داخل NDR','change')},500)});
(async()=>{for(let i=0;i<160;i++){ensure();if(typeof state!=='undefined'&&state.data){seed();return}await new Promise(r=>setTimeout(r,100))}ensure()})();
})();