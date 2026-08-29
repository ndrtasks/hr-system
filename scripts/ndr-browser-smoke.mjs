import { chromium } from 'playwright';
import fs from 'node:fs';

const base=process.env.NDR_QA_URL||'https://ndr-tasks-dev-git-ndr-ui-qa-ndrs-projects-cfdc98d2.vercel.app/ndr-hr-intelligence/';
const outDir='qa-artifacts';fs.mkdirSync(outDir,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ok=(cond,msg)=>{if(!cond)throw new Error(msg);console.log('✓',msg)};

async function waitForPreview(){
  let last='';
  for(let i=0;i<72;i++){
    try{
      const r=await fetch(base,{redirect:'follow'});last=`${r.status} ${r.url}`;
      if(r.ok)return;
    }catch(e){last=String(e?.message||e)}
    console.log(`Preview not ready (${last}); retry ${i+1}/72`);
    await sleep(5000);
  }
  throw new Error(`QA preview never became reachable: ${last}`);
}

await waitForPreview();
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1680,height:950},locale:'ar-SA'});
const pageErrors=[];const consoleErrors=[];
page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});

const t0=Date.now();
const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
ok(response&&response.status()<400,`QA page responds successfully (${response?.status()})`);
await page.waitForSelector('#appShell:not(.hidden)',{timeout:30000});
await page.waitForSelector('.sidebar .nav',{timeout:30000});
await page.waitForTimeout(1000);
const readyMs=Date.now()-t0;
console.log(`Initial UI ready in ${readyMs}ms`);
ok(readyMs<5000,`Initial UI becomes usable within QA budget (${readyMs}ms)`);

const dock=page.locator('.sidebar');
ok(await dock.isVisible(),'Bottom command dock is visible');
const dockBox=await dock.boundingBox();
ok(dockBox&&dockBox.y>650,'Dock is positioned near the bottom, not as a left sidebar');

const buttons=page.locator('.sidebar .nav button[data-page]');
const labels=await buttons.locator('.navtext').allTextContents();
for(const wanted of ['الرئيسية','الحالات','القواعد','الحضور والانصراف','Odoo'])ok(labels.includes(wanted),`Dock contains ${wanted}`);

async function noPageOverflow(label){
  const x=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,body:document.body.scrollWidth}));
  ok(x.scroll<=x.client+2&&x.body<=x.client+2,`${label} has no page-level horizontal overflow (${x.scroll}/${x.client})`);
}
async function clickPage(pageId,label,selector=`#${pageId}`){
  const b=page.locator(`.sidebar .nav button[data-page="${pageId}"]`);
  ok(await b.count()===1,`${label} has one navigation button`);
  const start=Date.now();await b.click();
  await page.waitForSelector(`${selector}.active`,{timeout:4000});
  const elapsed=Date.now()-start;
  ok(elapsed<1200,`${label} navigation responds quickly (${elapsed}ms)`);
  await noPageOverflow(label);
}

await clickPage('overview','الرئيسية');
await page.screenshot({path:`${outDir}/ndr-qa-overview.png`,fullPage:true});
await clickPage('findingsPage','الحالات');
await clickPage('rulesPage','القواعد');
await clickPage('attendancePage','الحضور والانصراف');
// The QA browser intentionally has no saved Odoo token. This checks navigation/render responsiveness without writing data.
await page.waitForTimeout(500);
ok(await page.locator('#attendancePage').isVisible(),'Attendance workspace remains responsive after opening');
await page.screenshot({path:`${outDir}/ndr-qa-attendance.png`,fullPage:true});
await clickPage('integrationPage','Odoo');

const topTitle=await page.locator('#pageTitle').textContent();
ok((topTitle||'').includes('Odoo'),'Topbar owns the Odoo page title');
const legacyHero=page.locator('#integrationPage>.pagehero');
ok(await legacyHero.count()===1,'Legacy Odoo pagehero remains structurally available');
const heroDisplay=await legacyHero.evaluate(el=>getComputedStyle(el).display);
ok(heroDisplay==='none','Redundant Odoo pagehero/action row is fully suppressed');
const inputBg=await page.locator('#connectionUrl').evaluate(el=>getComputedStyle(el).backgroundColor);
ok(!['rgb(255, 255, 255)','rgba(255, 255, 255, 1)'].includes(inputBg),'Odoo input is not white');
await page.screenshot({path:`${outDir}/ndr-qa-odoo.png`,fullPage:true});

const notify=page.locator('.ndr-notify-btn');
ok(await notify.isVisible(),'Notification button is visible');
await notify.click();
await page.waitForSelector('.ndr-notify-drawer.show',{timeout:2500});
const drawer=page.locator('.ndr-notify-drawer');
const drawerBg=await drawer.evaluate(el=>getComputedStyle(el).backgroundColor);
ok(!['rgb(255, 255, 255)','rgba(255, 255, 255, 1)'].includes(drawerBg),'Notification drawer is not white');
const dockZ=Number(await dock.evaluate(el=>getComputedStyle(el).zIndex)||0);
const drawerZ=Number(await drawer.evaluate(el=>getComputedStyle(el).zIndex)||0);
ok(drawerZ>dockZ,`Notification drawer overlays dock (${drawerZ} > ${dockZ})`);
await page.screenshot({path:`${outDir}/ndr-qa-notifications.png`,fullPage:true});
await page.locator('.ndr-notify-head button').click();
await page.waitForTimeout(300);
ok(!(await drawer.evaluate(el=>el.classList.contains('show'))),'Notification drawer closes cleanly');

// Compact viewport regression: no page-level sideways scroll and the command dock remains usable.
await page.setViewportSize({width:390,height:844});
await page.waitForTimeout(250);
await clickPage('overview','الرئيسية - جوال');
ok(await dock.isVisible(),'Bottom dock remains visible on compact viewport');
await noPageOverflow('الجوال');
const mobileDockBox=await dock.boundingBox();
ok(mobileDockBox&&mobileDockBox.y>700,'Mobile dock remains anchored near bottom');
await page.screenshot({path:`${outDir}/ndr-qa-mobile.png`,fullPage:true});

// Ignore expected connection/auth messages because this browser run deliberately carries no Odoo connector token.
ok(pageErrors.length===0,`No uncaught page errors (${pageErrors.length})`);
const seriousConsole=consoleErrors.filter(x=>!/Odoo|اتصال|401|403|attendance/i.test(x));
ok(seriousConsole.length===0,`No unexpected console errors (${seriousConsole.length})`);

fs.writeFileSync(`${outDir}/browser-report.json`,JSON.stringify({base,readyMs,labels,inputBg,drawerBg,dockZ,drawerZ,pageErrors,consoleErrors},null,2));
await browser.close();
console.log('NDR browser QA: PASS');
