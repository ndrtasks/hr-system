import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const dir=path.join(root,'public','ndr-hr-intelligence');
const read=f=>fs.readFileSync(path.join(dir,f),'utf8');
const ok=(cond,msg)=>{if(!cond)throw new Error(msg);console.log('✓',msg)};

const index=read('index.html');
const loader=read('loader.js');
const layout1=read('layout1.part');
const att=read('attendance-v2.js');
const auto=read('auto-sync.js');
const live=read('live-watch-lite.js');
const dock=read('qa-dock-fix.css');
const overlay=read('qa-overlay-order.css');
const finalTune=read('qa-final-tune.css');
const guard=read('qa-dock-guard.js');
const hardening=read('qa-runtime-hardening.js');
const polish=read('neon-space-premium-polish.css');
const odooMode=read('odoo-mode.js');

ok(index.includes('qa-dock-fix.css'),'QA dock stylesheet is loaded');
ok(index.includes('qa-overlay-order.css'),'QA overlay order stylesheet is loaded');
ok(index.includes('qa-final-tune.css'),'Final QA polish stylesheet is loaded last');
ok(index.indexOf('qa-overlay-order.css')>index.indexOf('qa-dock-fix.css'),'Overlay order loads after dock styling');
ok(index.indexOf('qa-final-tune.css')>index.indexOf('qa-overlay-order.css'),'Final polish loads after overlay rules');
ok(index.includes('qa-dock-guard.js'),'QA dock guard is loaded');
ok(index.includes('qa-runtime-hardening.js'),'QA runtime hardening is loaded');
ok(loader.includes("Promise.all(urls.map"),'Layout fragments are fetched in parallel');
ok(loader.includes("'/ndr-hr-intelligence/attendance-v2.js'"),'Attendance v2 is the active attendance client');
ok(!loader.includes("'/ndr-hr-intelligence/attendance.js'"),'Legacy heavy attendance client is not loaded');
ok(loader.includes("'/ndr-hr-intelligence/live-watch-lite.js'"),'Light live watcher is loaded');
ok(!loader.includes("'/ndr-hr-intelligence/live-watch.js'"),'Legacy heavy live watcher is not loaded');
ok(!loader.includes('custom-rule-builder.js'),'Custom rule builder remains isolated from production runtime until QA is complete');

for(const page of ['overview','findingsPage','rulesPage','integrationPage']){
  ok(layout1.includes(`data-page=\"${page}\"`),`Base navigation contains ${page}`);
}
ok(att.includes("b.id!=='attendanceNavBtn'&&window.__ndrAttendanceActive"),'Leaving attendance clears the global attendance-active state');
ok(att.includes("},true);"),'Attendance exit listener runs in capture phase before base navigation');
ok(att.includes("$('crumbTitle').textContent='ATTENDANCE'"),'Attendance updates the breadcrumb');
ok(att.includes('ndr-attendance-cache-v4:'),'Attendance uses cache v4');
ok(auto.includes("ndr-attendance-cache-v4:"),'Live sync invalidates attendance cache v4');
ok(auto.includes("ndr-attendance-cache-v3:"),'Live sync also clears legacy attendance cache');
ok(!auto.includes('window.fetch='),'Attendance auto-sync no longer monkey-patches fetch');
ok(live.includes("const beforeRun=state?.data?.runId||''"),'Live watcher verifies that an audit actually produced a new result');
ok(live.includes("await audit('core-change',sources);\n      coreFp=fp"),'Core fingerprint is committed only after successful audit');
ok(live.includes("await audit('secondary-change',sources);\n          secondaryFp=sfp"),'Secondary fingerprint is committed only after successful audit');
ok(live.includes("await audit('periodic-refresh',[])"),'Five-minute fallback performs a real audit instead of only moving a timestamp');
ok(hardening.includes('window.__ndrAttendanceActive'),'Audit render hardening recognizes attendance mode');
ok(hardening.includes('ndrDeferredAuditRender'),'Heavy audit DOM render is deferred while attendance is open');

ok(dock.includes('bottom:16px!important'),'Navigation is explicitly anchored as a bottom dock');
ok(dock.includes('.sidebar>.nav>button[data-page]'),'Dock buttons have an explicit visibility rule');
ok(dock.includes('#findingsPage>.pagehero>div:first-child'),'Duplicate findings page heading is suppressed');
ok(dock.includes('#rulesPage>.pagehero>div:first-child'),'Duplicate rules page heading is suppressed');
ok(dock.includes('.att-modal{border:1px solid #16506d!important'),'Attendance edit modal is forced into the neon theme');
ok(dock.includes('backdrop-filter:none!important'),'Heavy modal backdrop blur is disabled');
ok(dock.includes('font-family:"Segoe UI",Tahoma,Arial,sans-serif!important'),'Bulk attendance uses the same readable UI font');
ok(dock.includes('.ndr-notify-drawer{z-index:1500!important'),'Notification drawer is dark-themed and layered above dock');
ok(dock.includes('.ndr-live-pop{background:linear-gradient'),'Live notification popups use the dark neon theme');
ok(overlay.includes('z-index:1350!important'),'Case and attendance overlays stay above bottom navigation');
ok(overlay.includes('bottom:104px!important'),'Generic toast does not collide with the bottom dock');
ok(finalTune.includes('#integrationPage>.pagehero{display:none!important}'),'Redundant Odoo pagehero/action row is removed');
ok(finalTune.includes('env(safe-area-inset-bottom)'),'Compact dock respects mobile safe area');
ok(polish.includes('#integrationPage .connectfield input'),'Odoo inputs have explicit dark theme styling');
ok(polish.includes('#attendancePage .att-table tbody td'),'Attendance rows have explicit dark theme styling');

ok(!guard.includes('attributes:true'),'Dock MutationObserver does not watch its own style/class writes');
ok(guard.includes("mo.observe(root,{subtree:true,childList:true})"),'Dock guard only observes child-list mutations');
ok(guard.includes("if(typeof b.onclick==='function')return"),'Dock fallback does not duplicate normal navigation handlers');
ok(!odooMode.includes("action:'install_app'"),'Opening NDR from Odoo never silently writes/updates the Odoo app');
ok(odooMode.includes("action:'probe'"),'Opening NDR from Odoo performs a read-only connection probe');

const jsFiles=[
  'loader.js','app1.js','app23.js','ux-fixes.js','workflow-polish.js','navigation-fix.js','odoo-mode.js','connection-manager.js','odoo-delete.js',
  'attendance-v2.js','attendance-bulk.js','attendance-bulk-preview.js','attendance-leave-guard.js','attendance-clarity.js','live-watch-lite.js','auto-sync.js','notification-center.js',
  'case-guide.js','qa-dock-guard.js','qa-runtime-hardening.js'
];
for(const f of jsFiles){
  execFileSync(process.execPath,['--check',path.join(dir,f)],{stdio:'pipe'});
}
console.log(`✓ Syntax check passed for ${jsFiles.length} runtime JavaScript files`);
console.log('NDR QA smoke: PASS');
