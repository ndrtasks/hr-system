(()=>{
'use strict';
if(window.__ndrAutoSyncInstalled)return;window.__ndrAutoSyncInstalled=true;
const ATT_SAVE='/functions/v1/ndr-attendance-register?action=save';
const ATT_KEYS=['attendance','leaves','leaveTypes','planning','resources','employees','departments','calendarLines','calendarLeaves','calendars','companies','employeeVersions','contracts'];
const clearAttendanceCache=()=>{try{for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i);if(k&&k.startsWith('ndr-attendance-cache-v3:'))sessionStorage.removeItem(k)}}catch{}};
let reloadTimer=null;
function attendanceActive(){return document.getElementById('attendancePage')?.classList.contains('active')}
function refreshAttendance(delay=250){clearAttendanceCache();if(!attendanceActive())return;clearTimeout(reloadTimer);reloadTimer=setTimeout(()=>{const b=document.getElementById('attReload');if(b&&!b.disabled)b.click()},delay)}
const previousFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{
  const url=typeof input==='string'?input:(input?.url||'');
  const isAttendanceSave=url.includes(ATT_SAVE);
  const response=await previousFetch(input,init);
  if(isAttendanceSave&&response.ok){setTimeout(()=>window.dispatchEvent(new CustomEvent('ndr:attendance-changed',{detail:{source:'single-save'}})),0)}
  return response
};
window.addEventListener('ndr:attendance-changed',e=>{
  clearAttendanceCache();
  if(e?.detail?.source!=='single-save')refreshAttendance(350)
});
window.addEventListener('ndr:audit-updated',e=>{
  const d=e?.detail||{};
  if(!d.sourceChanged)return;
  const changed=Array.isArray(d.changedSources)?d.changedSources:[];
  if(changed.some(x=>ATT_KEYS.includes(x)))refreshAttendance(300)
});
})();