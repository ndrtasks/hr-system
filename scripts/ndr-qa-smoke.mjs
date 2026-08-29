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
const dock=read('qa-dock-fix.css');
const guard=read('qa-dock-guard.js');
const hardening=read('qa-runtime-hardening.js');
const polish=read('neon-space-premium-polish.css');

ok(index.includes('qa-dock-fix.css'),'QA dock stylesheet is loaded last');
ok(index.includes('qa-dock-guard.js'),'QA dock guard is loaded');
ok(index.includes('qa-runtime-hardening.js'),'QA runtime hardening is loaded');
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
ok(hardening.includes('window.__ndrAttendanceActive'),'Audit render hardening recognizes attendance mode');
ok(hardening.includes('ndrDeferredAuditRender'),'Heavy audit DOM render is deferred while attendance is open');

ok(dock.includes('bottom:16px!important'),'Navigation is explicitly anchored as a bottom dock');
ok(dock.includes('.sidebar>.nav>button[data-page]'),'Dock buttons have an explicit visibility rule');
ok(dock.includes('#findingsPage>.pagehero>div:first-child'),'Duplicate findings page heading is suppressed');
ok(dock.includes('#rulesPage>.pagehero>div:first-child'),'Duplicate rules page heading is suppressed');
ok(dock.includes('#integrationPage>.pagehero>div:first-child'),'Duplicate Odoo page heading is suppressed');
ok(dock.includes('.att-modal{border:1px solid #16506d!important'),'Attendance edit modal is forced into the neon theme');
ok(polish.includes('#integrationPage .connectfield input'),'Odoo inputs have explicit dark theme styling');
ok(polish.includes('#attendancePage .att-table tbody td'),'Attendance rows have explicit dark theme styling');

ok(!guard.includes('attributes:true'),'Dock MutationObserver does not watch its own style/class writes');
ok(guard.includes("mo.observe(root,{subtree:true,childList:true})"),'Dock guard only observes child-list mutations');

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
