(()=>{
  try{
    const params=new URLSearchParams(location.search);
    const fromOdoo=params.get('source')==='odoo';
    const incoming=params.get('connector')||'';
    const stored=localStorage.getItem('ndr-connector-token')||'';
    if(!fromOdoo&&!incoming&&!stored)return;

    if(incoming){
      localStorage.setItem('ndr-connector-token',incoming);
      params.delete('connector');
      const q=params.toString();
      history.replaceState({},'',location.pathname+(q?'?'+q:'')+location.hash);
    }
    const token=incoming||localStorage.getItem('ndr-connector-token')||'';
    if(!token)return;

    const CONNECTOR='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-odoo-connector';
    const VAULT_AUDIT='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-hr-audit-live';
    const OLD_APIS=['/functions/v1/ndr-hr-audit-v4','/functions/v1/ndr-hr-audit-nav','/functions/v1/ndr-hr-audit-schedule'];
    let connectorInfo=null;

    const post=async(url,body)=>{
      const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const d=await r.json();
      if(!r.ok||(!d.ok&&url===CONNECTOR))throw new Error(d.error||d.message||'تعذر الاتصال');
      return d;
    };

    const wait=()=>new Promise(resolve=>{
      const tick=()=>{
        if(typeof state!=='undefined'&&typeof requestConnection==='function'&&typeof updateConnectionUi==='function'&&document.getElementById('appShell'))return resolve();
        setTimeout(tick,80);
      };
      tick();
    });

    const addOdooChrome=()=>{
      if(!fromOdoo||document.getElementById('ndrOdooMode'))return;
      const host=document.querySelector('.topactions');
      if(!host)return;
      const badge=document.createElement('span');
      badge.id='ndrOdooMode';badge.className='statuspill';badge.innerHTML='<i class="statusdot live"></i><span>مفتوح من Odoo</span>';
      const back=document.createElement('button');
      back.className='ghost';back.textContent='↩ العودة إلى Odoo';
      back.onclick=()=>{const base=connectorInfo?.baseUrl||localStorage.getItem('ndr-odoo-url')||'';if(base)location.href=base.replace(/\/$/,'')+'/odoo';else history.back();};
      host.prepend(back);host.prepend(badge);
    };

    const markReady=()=>{
      const mode=document.getElementById('modeText');if(mode)mode.textContent='Odoo Connected';
      const generated=document.getElementById('generated');
      if(generated&&/بانتظار|لا توجد/.test(generated.textContent||''))generated.textContent='متصل بـ Odoo • جاهز لتشغيل التدقيق';
      const risk=document.getElementById('risk');
      if(risk&&/بانتظار|الفحص/.test(risk.textContent||''))risk.textContent='متصل وجاهز للتدقيق';
      const summary=document.getElementById('summaryLine');
      if(summary&&/لا توجد بيانات|بانتظار/.test(summary.textContent||''))summary.textContent='الاتصال جاهز — اضغط تشغيل التدقيق لجلب النتائج';
      const source=document.getElementById('sourceText');if(source&&(source.textContent||'').trim()==='—')source.textContent='Odoo Live';
    };

    const syncIdentityOnce=async()=>{
      if(!fromOdoo)return;
      const key='ndr-odoo-identity-v4';
      if(localStorage.getItem(key)==='1')return;
      try{
        await post(CONNECTOR,{action:'install_app',launchToken:token});
        localStorage.setItem(key,'1');
      }catch(e){console.warn('NDR Odoo identity sync:',e);}
    };

    const enableVaultMode=()=>{
      if(window.__ndrVaultFetchEnabled)return;
      window.__ndrVaultFetchEnabled=true;
      const originalFetch=window.fetch.bind(window);
      window.fetch=async(input,init)=>{
        try{
          const url=typeof input==='string'?input:input?.url||'';
          if(OLD_APIS.some(x=>url.includes(x))){
            const u=new URL(url,location.href);
            const action=u.searchParams.get('action')||'audit';
            let body={};
            try{body=init?.body?JSON.parse(String(init.body)):{};}catch{}
            delete body.connection;
            body.launchToken=token;
            return originalFetch(`${VAULT_AUDIT}?action=${encodeURIComponent(action)}`,{...(init||{}),method:'POST',headers:{...((init&&init.headers)||{}),'Content-Type':'application/json'},body:JSON.stringify(body)});
          }
        }catch{}
        return originalFetch(input,init);
      };

      requestConnection=function(){
        const baseUrl=connectorInfo?.baseUrl||localStorage.getItem('ndr-odoo-url')||state.connection?.baseUrl||'';
        const database=connectorInfo?.database||localStorage.getItem('ndr-odoo-db')||state.connection?.database||'';
        state.connection={baseUrl,database,apiKey:''};
        return baseUrl?{baseUrl,database,apiKey:'vault-connector'}:null;
      };
    };

    (async()=>{
      await wait();
      try{
        connectorInfo=await post(CONNECTOR,{action:'probe',launchToken:token});
        state.connection={baseUrl:connectorInfo.baseUrl||'',database:connectorInfo.database||'',apiKey:''};
        if(connectorInfo.baseUrl)localStorage.setItem('ndr-odoo-url',connectorInfo.baseUrl);
        if(connectorInfo.database)localStorage.setItem('ndr-odoo-db',connectorInfo.database);else localStorage.removeItem('ndr-odoo-db');
        state.connected=true;state.demo=false;
        sessionStorage.removeItem('ndr-odoo-key');
        enableVaultMode();
        try{syncConnectionInputs();}catch{}
        const key=document.getElementById('connectionKey');
        if(key){key.value='';key.disabled=false;key.placeholder='الاتصال محفوظ ومشفر — أدخل مفتاحا جديدا فقط عند التغيير';}
        const secret=document.getElementById('secretState');if(secret){secret.textContent='الاتصال محفوظ ومشفر';secret.classList.remove('empty');}
        try{updateConnectionUi();}catch{}
        markReady();
        addOdooChrome();
        window.NDROdooVault={token,connectorInfo,active:true};
        if(fromOdoo)document.title='NDR HR Intelligence — Odoo';
        syncIdentityOnce();
      }catch(e){
        console.error('NDR Odoo Mode:',e);
        if(fromOdoo)addOdooChrome();
        window.NDROdooVault={token,active:false,error:String(e?.message||e)};
        try{toast('تعذر تفعيل اتصال Odoo المحفوظ. افتح ربط Odoo للمراجعة.');}catch{}
      }
    })();
  }catch(e){console.error('NDR Odoo Mode bootstrap:',e);}
})();