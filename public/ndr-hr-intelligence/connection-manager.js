(()=>{
  const CONNECTOR='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-odoo-connector';
  const VAULT_AUDIT='https://ecaexxjfzujoesptzurd.supabase.co/functions/v1/ndr-hr-audit-vault';
  const MAIN='https://www.ndrflow.com/ndr-hr-intelligence/';
  const $=id=>document.getElementById(id);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const token=()=>localStorage.getItem('ndr-connector-token')||'';

  async function post(url,body){
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    let d={};try{d=await r.json();}catch{}
    if(!r.ok||d?.ok===false)throw new Error(d?.error||d?.message||'تعذر تنفيذ الطلب');
    return d;
  }

  function addStyles(){
    if($('ndrConnectionManagerStyles'))return;
    const s=document.createElement('style');s.id='ndrConnectionManagerStyles';s.textContent=`
      .ndr-secure-panel{margin-top:14px;border:1px solid #1d4556;background:linear-gradient(135deg,rgba(13,38,55,.82),rgba(8,29,44,.9));border-radius:17px;padding:14px 16px;display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:center}
      .ndr-secure-item{display:flex;align-items:center;gap:10px;min-width:0}.ndr-secure-dot{width:9px;height:9px;border-radius:50%;background:#6f8190;box-shadow:0 0 0 4px rgba(111,129,144,.08);flex:0 0 auto}.ndr-secure-item.ok .ndr-secure-dot{background:#64e1b2;box-shadow:0 0 16px rgba(100,225,178,.45)}.ndr-secure-item.warn .ndr-secure-dot{background:#ffbd69}.ndr-secure-copy{min-width:0}.ndr-secure-copy span{display:block;color:#70889a;font-size:9px;margin-bottom:3px}.ndr-secure-copy b{display:block;color:#dfeaf1;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ndr-app-btn{white-space:nowrap}.connectactions .primary{min-width:190px}.ndr-rotate-note{color:#71899a;font-size:9px;margin-top:7px;line-height:1.6}
      @media(max-width:850px){.ndr-secure-panel{grid-template-columns:1fr}.ndr-app-btn{width:100%}}
    `;document.head.appendChild(s);
  }

  function commercialize(){
    const page=$('integrationPage');if(!page)return;
    const scale=$('scaleDemo');if(scale)scale.remove();
    const topTest=$('testConnection');if(topTest)topTest.textContent='اختبار الاتصال';
    const live=page.querySelector('.liveconnectcopy');
    if(live){
      const e=live.querySelector('.sectioneyebrow');if(e)e.textContent='SECURE ODOO CONNECTION';
      const h=live.querySelector('h3');if(h)h.textContent='ربط Odoo وإدارة التطبيق';
      const p=live.querySelector('p');if(p)p.textContent='أدخل رابط Odoo ومفتاح API مرة واحدة. بعد التحقق يحفظ NDR الاتصال بشكل مشفر ويستخدمه للتدقيق وللدخول من تطبيق Odoo.';
      const badge=live.querySelector('.trialbadge');if(badge)badge.textContent='اتصال مشفر • إعداد مرة واحدة';
    }
    const key=$('connectionKey');if(key&&!token())key.placeholder='الصق مفتاح Odoo API هنا';
    const primary=$('connectAndTest');if(primary)primary.textContent='حفظ الاتصال واختبار المصادر';
    const clear=$('clearConnection');if(clear)clear.textContent='إلغاء الربط';
    const note=page.querySelector('.connectnote');if(note)note.textContent='بعد الحفظ لن تحتاج لإدخال المفتاح عند كل دخول.';
    const checks=[...page.querySelectorAll('.checklist .check')];
    const checkText=['قراءة فقط من بيانات الموارد البشرية في Odoo','مفتاح Odoo محفوظ بشكل مشفر في NDR Vault','التدقيق يستخدم الاتصال المحفوظ تلقائيا','تطبيق NDR داخل Odoo يستخدم نفس الاتصال'];
    checks.forEach((el,i)=>{if(checkText[i])el.innerHTML='<i>✓</i>'+checkText[i];});
    const cards=[...page.querySelectorAll('.integrationgrid .connectioncard')];
    if(cards[1]){
      const eye=cards[1].querySelector('.sectioneyebrow');if(eye)eye.innerHTML='<i></i>CONNECTED SOURCES';
      const h=cards[1].querySelector('h3');if(h)h.textContent='مصادر Odoo التي يراقبها NDR';
      const p=cards[1].querySelector('p');if(p)p.textContent='الموظفون والعقود والحضور والإجازات هي مصادر الرقابة الأساسية، وتظهر جاهزية كل مصدر بعد اختبار الاتصال.';
    }
  }

  function ensureSecurePanel(){
    if($('ndrSecurePanel'))return;
    const form=$('connectionKey')?.closest('.connectform');if(!form)return;
    const panel=document.createElement('div');panel.id='ndrSecurePanel';panel.className='ndr-secure-panel';
    panel.innerHTML=`<div id="ndrSecureConnectionItem" class="ndr-secure-item"><i class="ndr-secure-dot"></i><div class="ndr-secure-copy"><span>حالة الاتصال</span><b id="ndrSecureConnectionText">غير محفوظ</b></div></div><div id="ndrOdooAppItem" class="ndr-secure-item"><i class="ndr-secure-dot"></i><div class="ndr-secure-copy"><span>تطبيق Odoo</span><b id="ndrOdooAppText">بانتظار حفظ الاتصال</b></div></div><button id="installNdrOdooApp" class="ghost ndr-app-btn" type="button">إضافة تطبيق NDR إلى Odoo</button>`;
    form.insertAdjacentElement('afterend',panel);
  }

  function setSecureState(text,kind=''){
    const item=$('ndrSecureConnectionItem'),label=$('ndrSecureConnectionText');if(label)label.textContent=text;if(item)item.className='ndr-secure-item '+kind;
  }
  function setAppState(text,kind=''){
    const item=$('ndrOdooAppItem'),label=$('ndrOdooAppText');if(label)label.textContent=text;if(item)item.className='ndr-secure-item '+kind;
  }
  function setBusy(btn,text,busy){if(!btn)return;if(busy){btn.dataset.ndrOld=btn.textContent;btn.textContent=text;btn.disabled=true;}else{btn.textContent=btn.dataset.ndrOld||btn.textContent;btn.disabled=false;}}

  function renderProbe(d){
    const names={employees:'الموظفون',contracts:'العقود',attendance:'الحضور',leaves:'الإجازات'};
    const box=$('probeResults');if(!box)return;
    box.innerHTML=Object.entries(d.sources||{}).map(([k,x])=>`<div class="probe ${x?.ok?'ok':'bad'}"><b>${x?.ok?'✓':'×'} ${names[k]||k}</b><span>${x?.model||''} • ${x?.ok?`${Number(x?.latencyMs||0).toLocaleString('ar-SA')} ms`:(x?.message||'تعذر الوصول')}</span></div>`).join('');
  }

  async function probeSaved(showToast=true){
    const t=token();if(!t)throw new Error('احفظ اتصال Odoo أولا');
    const r=await fetch(VAULT_AUDIT+'?action=probe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({launchToken:t})});
    const d=await r.json();if(!r.ok)throw new Error(d.message||'تعذر اختبار المصادر');
    renderProbe(d);
    const vals=Object.values(d.sources||{}),all=vals.length>0&&vals.every(x=>x&&x.ok);
    if(typeof state!=='undefined'){state.connected=all;state.demo=false;try{updateConnectionUi();}catch{}}
    setSecureState(all?'محفوظ ومشفر • جميع المصادر متصلة':'الاتصال محفوظ • راجع المصادر','ok');
    if(showToast&&typeof toast==='function')toast(all?'تم اختبار اتصال Odoo بنجاح':'الاتصال محفوظ ويوجد مصدر يحتاج مراجعة');
    return d;
  }

  async function saveSecure({reload=true}={}){
    const url=String($('connectionUrl')?.value||'').trim();
    const db=String($('connectionDb')?.value||'').trim();
    const key=String($('connectionKey')?.value||'').trim();
    if(!url)throw new Error('أدخل رابط Odoo');
    if(!key){if(token())return token();throw new Error('أدخل مفتاح Odoo API');}
    const current=token();
    const d=await post(CONNECTOR,{action:'save',odooUrl:url,apiKey:key,database:db,launchToken:current||null,displayName:'NDR HR Intelligence'});
    localStorage.setItem('ndr-connector-token',d.launchToken);
    localStorage.setItem('ndr-odoo-url',d.baseUrl||url.replace(/\/$/,''));
    if(db)localStorage.setItem('ndr-odoo-db',db);else localStorage.removeItem('ndr-odoo-db');
    sessionStorage.removeItem('ndr-odoo-key');sessionStorage.removeItem('ndr-odoo-connected');
    if($('connectionKey')){$('connectionKey').value='';$('connectionKey').placeholder='الاتصال محفوظ ومشفر — أدخل مفتاحا جديدا فقط عند التغيير';}
    setSecureState('محفوظ ومشفر في NDR Vault','ok');
    if(reload){sessionStorage.setItem('ndr-secure-flash','saved');const u=new URL(location.href);u.searchParams.set('connector',d.launchToken);u.searchParams.set('view','integration');location.replace(u.toString());}
    return d.launchToken;
  }

  async function appStatus(){
    const t=token();const btn=$('installNdrOdooApp');if(!t){setAppState('بانتظار حفظ الاتصال');if(btn)btn.textContent='إضافة تطبيق NDR إلى Odoo';return;}
    try{
      const d=await post(CONNECTOR,{action:'app_status',launchToken:t});
      if(d.installed&&!d.needsUpdate){setAppState('مثبت ومحدث','ok');if(btn)btn.textContent='تحديث تطبيق NDR في Odoo';}
      else if(d.installed){setAppState('مثبت • يحتاج تحديث','warn');if(btn)btn.textContent='تحديث تطبيق NDR في Odoo';}
      else{setAppState('غير مثبت');if(btn)btn.textContent='إضافة تطبيق NDR إلى Odoo';}
    }catch(e){setAppState('تعذر قراءة حالة التطبيق','warn');}
  }

  async function installApp(){
    const btn=$('installNdrOdooApp');setBusy(btn,'جاري إعداد التطبيق…',true);
    try{
      let t=token();if(!t)t=await saveSecure({reload:false});
      const d=await post(CONNECTOR,{action:'install_app',launchToken:t});
      setAppState('مثبت ومحدث','ok');setSecureState('محفوظ ومشفر في NDR Vault','ok');
      if(typeof toast==='function')toast(`تم ${d.installed?'تحديث':'إضافة'} تطبيق NDR داخل Odoo بنجاح`);
      await probeSaved(false);
      if(!$('connectionKey')?.value&&typeof window.NDROdooVault==='undefined'){
        sessionStorage.setItem('ndr-secure-flash','installed');const u=new URL(location.href);u.searchParams.set('connector',t);u.searchParams.set('view','integration');setTimeout(()=>location.replace(u.toString()),500);
      }
    }catch(e){if(typeof toast==='function')toast(e.message||'تعذر إعداد تطبيق Odoo');setAppState('تعذر إعداد التطبيق','warn');}
    finally{setBusy(btn,'',false);}
  }

  async function revoke(){
    const t=token();
    try{if(t)await post(CONNECTOR,{action:'revoke',launchToken:t});}catch(e){if(typeof toast==='function')toast(e.message||'تعذر إلغاء الاتصال');return;}
    localStorage.removeItem('ndr-connector-token');localStorage.removeItem('ndr-odoo-url');localStorage.removeItem('ndr-odoo-db');
    sessionStorage.removeItem('ndr-odoo-key');sessionStorage.removeItem('ndr-odoo-connected');
    if(typeof state!=='undefined'){state.connection={baseUrl:'',database:'',apiKey:''};state.connected=false;try{syncConnectionInputs();updateConnectionUi();}catch{}}
    if($('probeResults'))$('probeResults').innerHTML='';if($('connectionKey')){$('connectionKey').disabled=false;$('connectionKey').value='';$('connectionKey').placeholder='الصق مفتاح Odoo API هنا';}
    if($('secretState')){$('secretState').textContent='لم يتم حفظ اتصال';$('secretState').classList.add('empty');}
    setSecureState('غير محفوظ');setAppState('الاتصال ملغى','warn');if(typeof toast==='function')toast('تم إلغاء اتصال Odoo المحفوظ');
  }

  async function boot(){
    for(let i=0;i<100;i++){if($('integrationPage')&&$('connectAndTest')&&typeof state!=='undefined')break;await sleep(80);}
    if(!$('integrationPage'))return;
    addStyles();commercialize();ensureSecurePanel();

    const primary=$('connectAndTest'),top=$('testConnection'),clear=$('clearConnection'),install=$('installNdrOdooApp');
    if(primary)primary.onclick=async()=>{setBusy(primary,'جاري الحفظ والاختبار…',true);try{await saveSecure({reload:false});await probeSaved(false);await appStatus();if(typeof toast==='function')toast('تم حفظ اتصال Odoo بشكل مشفر واختبار المصادر');const t=token();if(t&&!window.NDROdooVault){sessionStorage.setItem('ndr-secure-flash','saved');const u=new URL(location.href);u.searchParams.set('connector',t);u.searchParams.set('view','integration');setTimeout(()=>location.replace(u.toString()),450);}}catch(e){if(typeof toast==='function')toast(e.message||'تعذر حفظ الاتصال');}finally{setBusy(primary,'',false);}};
    if(top)top.onclick=async()=>{setBusy(top,'جاري الاختبار…',true);try{if(!token()&&$('connectionKey')?.value)await saveSecure({reload:false});await probeSaved(true);await appStatus();}catch(e){if(typeof toast==='function')toast(e.message||'تعذر اختبار الاتصال');}finally{setBusy(top,'',false);}};
    if(clear)clear.onclick=revoke;
    if(install)install.onclick=installApp;

    if(token()){
      setSecureState('اتصال محفوظ ومشفر','ok');
      const key=$('connectionKey');if(key){key.disabled=false;key.value='';key.placeholder='الاتصال محفوظ ومشفر — أدخل مفتاحا جديدا فقط عند التغيير';}
      const secret=$('secretState');if(secret){secret.textContent='الاتصال محفوظ ومشفر';secret.classList.remove('empty');}
      await appStatus();
    }else{setSecureState('غير محفوظ');setAppState('بانتظار حفظ الاتصال');}

    const flash=sessionStorage.getItem('ndr-secure-flash');if(flash){sessionStorage.removeItem('ndr-secure-flash');if(typeof toast==='function')toast(flash==='installed'?'تم تحديث تطبيق NDR واتصال Odoo':'تم حفظ اتصال Odoo بشكل مشفر');}
    const u=new URL(location.href);if(u.searchParams.get('view')==='integration'){try{showPage('integrationPage');}catch{}u.searchParams.delete('view');history.replaceState({},'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash);}
  }
  boot();
})();