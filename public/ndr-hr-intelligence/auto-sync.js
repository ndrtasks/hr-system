(()=>{
'use strict';
if(window.__ndrAutoSyncInstalled)return;window.__ndrAutoSyncInstalled=true;
const ATT_KEYS=['attendance','leaves','leaveTypes','planning','resources','employees','departments','calendarLines','calendarLeaves','calendars','companies','employeeVersions','contracts'];
const clearAttendanceCache=()=>{try{for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i)||'';if(k.startsWith('ndr-attendance-cache-v3:')||k.startsWith('ndr-attendance-cache-v4:'))sessionStorage.removeItem(k)}}catch{}};
let reloadTimer=null;
function attendanceActive(){return document.getElementById('attendancePage')?.classList.contains('active')}
function refreshAttendance(delay=250){clearAttendanceCache();if(!attendanceActive())return;clearTimeout(reloadTimer);reloadTimer=setTimeout(()=>{const b=document.getElementById('attReload');if(b&&!b.disabled)b.click()},delay)}

// Attendance writers already emit ndr:attendance-changed and attendance-v2 owns the immediate
// reload after a save. Do not monkey-patch fetch here: that used to create duplicate reloads.
window.addEventListener('ndr:attendance-changed',()=>{
  clearAttendanceCache();
});
window.addEventListener('ndr:audit-updated',e=>{
  const d=e?.detail||{};
  if(!d.sourceChanged)return;
  const changed=Array.isArray(d.changedSources)?d.changedSources:[];
  if(changed.some(x=>ATT_KEYS.includes(x)))refreshAttendance(300)
});
})();