(()=>{const originalFetch=window.fetch.bind(window);const oldApi='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-hr-audit-v4';const liveApi='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-hr-audit-live';window.fetch=(input,init)=>{try{const url=typeof input==='string'?input:input?.url;if(url&&url.startsWith(oldApi)){const next=url.replace(oldApi,liveApi);return originalFetch(next,init)}}catch{}return originalFetch(input,init)};})();
(async()=>{
  const root=document.getElementById('ndr-root');
  const assetVersion='20260830-qa3';
  try{
    const urls=[1,2,3,4,5,6].map(n=>`/ndr-hr-intelligence/layout${n}.part?v=${assetVersion}`);
    const parts=await Promise.all(urls.map(async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(`layout ${r.status}`);return r.text()}));
    root.innerHTML=parts.join('');
    const scripts=['/ndr-hr-intelligence/app1.js','/ndr-hr-intelligence/app23.js','/ndr-hr-intelligence/ux-fixes.js','/ndr-hr-intelligence/workflow-polish.js','/ndr-hr-intelligence/navigation-fix.js','/ndr-hr-intelligence/odoo-mode.js','/ndr-hr-intelligence/connection-manager.js','/ndr-hr-intelligence/odoo-delete.js','/ndr-hr-intelligence/attendance-v2.js','/ndr-hr-intelligence/attendance-bulk.js','/ndr-hr-intelligence/attendance-bulk-preview.js','/ndr-hr-intelligence/attendance-leave-guard.js','/ndr-hr-intelligence/attendance-clarity.js','/ndr-hr-intelligence/live-watch-lite.js','/ndr-hr-intelligence/auto-sync.js','/ndr-hr-intelligence/notification-center.js'];
    for(const src of scripts){
      await new Promise((ok,fail)=>{const s=document.createElement('script');s.src=src+`?v=${assetVersion}`;s.onload=ok;s.onerror=()=>fail(new Error(`asset ${src}`));document.body.appendChild(s)});
    }
  }catch(e){
    console.error('NDR startup failed',e);
    root.innerHTML='<div style="min-height:100vh;display:grid;place-items:center;padding:32px;background:#020814;color:#eafaff;font-family:Segoe UI,Tahoma,Arial,sans-serif;text-align:center"><div><b style="display:block;font-size:18px;margin-bottom:8px">تعذر تحميل واجهة NDR</b><span style="display:block;color:#7fa7b8;font-size:12px;margin-bottom:16px">لم يتم تشغيل أي عملية على Odoo. أعد المحاولة لتحميل الواجهة.</span><button type="button" onclick="location.reload()" style="border:1px solid #16506d;border-radius:9px;background:#071b2b;color:#dff8ff;padding:10px 16px;cursor:pointer">إعادة المحاولة</button></div></div>';
  }
})();