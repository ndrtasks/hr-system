(()=>{
  const CONNECTOR='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-odoo-connector';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const $=id=>document.getElementById(id);

  async function post(body){
    const r=await fetch(CONNECTOR,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    let d={};try{d=await r.json();}catch{}
    if(!r.ok||d?.ok===false)throw new Error(d?.error||d?.message||'تعذر تنفيذ الطلب');
    return d;
  }

  function toastSafe(msg){try{if(typeof toast==='function')toast(msg);else alert(msg);}catch{alert(msg);}}

  async function boot(){
    for(let i=0;i<120;i++){
      if($('ndrSecurePanel')&&$('installNdrOdooApp'))break;
      await sleep(80);
    }
    const panel=$('ndrSecurePanel');
    const install=$('installNdrOdooApp');
    if(!panel||!install)return;
    if($('deleteNdrOdooApp'))return;

    const style=document.createElement('style');
    style.textContent='.ndr-delete-app{border:1px solid rgba(255,111,126,.35)!important;color:#ff9ba7!important;background:rgba(255,111,126,.06)!important;white-space:nowrap}.ndr-delete-app:hover{background:rgba(255,111,126,.12)!important}';
    document.head.appendChild(style);

    const btn=document.createElement('button');
    btn.id='deleteNdrOdooApp';
    btn.type='button';
    btn.className='ghost ndr-delete-app';
    btn.textContent='حذف تطبيق NDR من Odoo';
    panel.appendChild(btn);

    btn.onclick=async()=>{
      const token=localStorage.getItem('ndr-connector-token')||'';
      if(!token){toastSafe('لا يوجد اتصال Odoo محفوظ حاليا');return;}
      const ok=window.confirm('سيتم حذف أيقونة NDR HR Intelligence وإجراء الفتح الخاص بها من Odoo فقط. اتصال Odoo وبيانات الموظفين لن تتأثر. هل تريد المتابعة؟');
      if(!ok)return;
      const old=btn.textContent;btn.disabled=true;btn.textContent='جاري حذف التطبيق…';
      try{
        const d=await post({action:'delete_app',launchToken:token});
        const stateText=$('ndrOdooAppText');
        const stateItem=$('ndrOdooAppItem');
        if(stateText)stateText.textContent=d.deleted?'غير مثبت':'التطبيق غير موجود';
        if(stateItem)stateItem.className='ndr-secure-item';
        install.textContent='إضافة تطبيق NDR إلى Odoo';
        toastSafe(d.deleted?'تم حذف تطبيق NDR من Odoo. اتصال NDR بقي محفوظا.':'تطبيق NDR غير موجود في Odoo حاليا');
      }catch(e){toastSafe(e?.message||'تعذر حذف تطبيق NDR من Odoo');}
      finally{btn.disabled=false;btn.textContent=old;}
    };
  }
  boot();
})();