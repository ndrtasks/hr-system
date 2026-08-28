(()=>{
  const wait=()=>{
    if(typeof state==='undefined'||typeof requestConnection!=='function'||typeof openFinding!=='function'||!document.getElementById('appShell')){setTimeout(wait,80);return;}

    // Keep the API key for page refreshes in the same browser tab/session only.
    const keyInput=document.getElementById('connectionKey');
    const existingKey=sessionStorage.getItem('ndr-odoo-key')||'';
    if(existingKey){state.connection.apiKey=existingKey;if(keyInput)keyInput.value=existingKey;}
    if(sessionStorage.getItem('ndr-odoo-connected')==='1'&&existingKey){state.connected=true;try{updateConnectionUi();}catch{}}
    try{syncConnectionInputs();}catch{}

    const baseRequestConnection=requestConnection;
    requestConnection=function(){
      const c=baseRequestConnection();
      const k=String(document.getElementById('connectionKey')?.value||state.connection.apiKey||'').trim();
      if(k)sessionStorage.setItem('ndr-odoo-key',k);else sessionStorage.removeItem('ndr-odoo-key');
      return c;
    };

    // Rebind live actions so successful connection survives reload within this browser session.
    if(typeof runAudit==='function'){
      const originalRun=runAudit;
      runAudit=async function(initial=false){const r=await originalRun(initial);if(state.connected)sessionStorage.setItem('ndr-odoo-connected','1');return r;};
      const rb=document.getElementById('runBtn'),rf=document.getElementById('refreshBtn');
      if(rb)rb.onclick=()=>runAudit(false);if(rf)rf.onclick=()=>runAudit(false);
    }
    if(typeof testLiveConnection==='function'){
      const originalTest=testLiveConnection;
      testLiveConnection=async function(){const r=await originalTest();if(state.connected)sessionStorage.setItem('ndr-odoo-connected','1');return r;};
      const a=document.getElementById('testConnection'),b=document.getElementById('connectAndTest');
      if(a)a.onclick=testLiveConnection;if(b)b.onclick=testLiveConnection;
    }
    const clear=document.getElementById('clearConnection');
    if(clear){
      const oldClear=clear.onclick;
      clear.onclick=(e)=>{sessionStorage.removeItem('ndr-odoo-key');sessionStorage.removeItem('ndr-odoo-connected');if(oldClear)oldClear.call(clear,e);};
    }

    const targetMap={
      R001:{where:'ملف الموظف ← بيانات العقد ← تاريخ نهاية العقد',field:'تاريخ نهاية العقد',technical:'contract_date_end'},
      R002:{where:'ملف الموظف ← بيانات العقد',field:'العقد الساري',technical:'contract_date_start / contract_date_end'},
      R003:{where:'سجل الحضور المتعارض + طلب الإجازة المرتبط',field:'الحضور / فترة الإجازة',technical:'hr.attendance + hr.leave'},
      R004:{where:'الحضور ← سجل الموظف في اليوم المحدد',field:'وقت الخروج',technical:'check_out'},
      R005:{where:'الحضور ← السجلان المتداخلان',field:'وقت الدخول والخروج',technical:'check_in / check_out'},
      R006:{where:'الحضور ← سجل الموظف في اليوم المحدد',field:'وقت الدخول',technical:'check_in'},
      R007:{where:'الحضور ← سجل الموظف في اليوم المحدد',field:'وقت الخروج',technical:'check_out'},
      R008:{where:'ملف الموظف ← بيانات التأشيرة',field:'انتهاء التأشيرة',technical:'visa_expire'},
      R009:{where:'ملف الموظف ← بيانات تصريح العمل',field:'انتهاء تصريح العمل',technical:'work_permit_expiration_date'},
      R010:{where:'ملف الموظف ← تبويب مراقبة NDR',field:'انتهاء الهوية الوطنية',technical:'x_studio_datetime_1_1'},
      R011:{where:'ملف الموظف ← تبويب مراقبة NDR',field:'انتهاء الإقامة',technical:'x_studio_datetime_3_1'},
      R012:{where:'ملف الموظف ← تبويب مراقبة NDR',field:'انتهاء جواز السفر',technical:'x_studio_datetime_4_1'},
      R013:{where:'ملف الموظف ← تبويب مراقبة NDR',field:'انتهاء التأمين الطبي',technical:'x_studio_datetime_2_1'},
      R014:{where:'ملف الموظف ← تبويب مراقبة NDR',field:'انتهاء الترخيص المهني',technical:'x_studio_datetime_5_1'},
      R015:{where:'ملف الموظف ← بيانات العمل / فترة التجربة',field:'نهاية فترة التجربة',technical:'trial_date_end'},
      R016:{where:'ملف الموظف ← بيانات العقد',field:'تاريخ نهاية العقد / حالة الموظف',technical:'contract_date_end'},
      R017:{where:'الحضور ← سجلات التأخير المرتبطة',field:'أوقات الدخول مقارنة بالشفت',technical:'check_in'},
      R018:{where:'الإجازات ← طلب الإجازة المعلق',field:'حالة الطلب ومسار الاعتماد',technical:'state'}
    };

    function ensureTargetCard(){
      let box=document.getElementById('ndrEditTarget');
      if(box)return box;
      const sourcebar=document.querySelector('.sourcebar');if(!sourcebar)return null;
      box=document.createElement('div');box.id='ndrEditTarget';box.className='ndr-edit-target';
      box.innerHTML='<div class="ndr-edit-icon">↗</div><div class="ndr-edit-copy"><span>مكان التعديل</span><b id="ndrEditPath">—</b><p id="ndrEditField">—</p></div><button id="ndrCopyTarget" type="button">نسخ المسار</button>';
      sourcebar.parentNode.insertBefore(box,sourcebar);
      return box;
    }

    const originalOpenFinding=openFinding;
    openFinding=function(key){
      originalOpenFinding(key);
      const f=state.current;if(!f)return;
      const occ=currentOccurrence(f);
      const occurrence=document.getElementById('modalOccurrence');
      if(occurrence)occurrence.textContent=occ>1?`ظهرت في ${number(occ)} تدقيقات متتالية`:'أول ظهور';
      const target=targetMap[f.code]||{where:'افتح السجل المسبب في Odoo وراجع الحقل المرتبط بالحالة',field:f.title,technical:''};
      const box=ensureTargetCard();
      if(box){
        const p=document.getElementById('ndrEditPath'),fld=document.getElementById('ndrEditField');
        if(p)p.textContent=target.where;
        if(fld)fld.textContent=`الحقل المطلوب: ${target.field}${target.technical?` • ${target.technical}`:''}`;
        const copy=document.getElementById('ndrCopyTarget');
        if(copy)copy.onclick=async()=>{try{await navigator.clipboard.writeText(`${target.where} — ${target.field}`);toast('تم نسخ مكان التعديل');}catch{toast(`${target.where} — ${target.field}`);}};
      }
      const hint=document.getElementById('sourceHint');if(hint)hint.textContent=`مكان التعديل: ${target.where}`;
      const open=document.getElementById('openSourceBtn');if(open)open.textContent='فتح مكان التعديل في Odoo ↗';
    };

    // Clear wording around recurring findings.
    if(typeof findingRow==='function'){
      const originalFindingRow=findingRow;
      findingRow=function(f){
        let html=originalFindingRow(f);const occ=currentOccurrence(f);
        if(f.trend==='repeat')html=html.replace(`متكررة ${number(occ)}×`,`مستمرة منذ ${number(occ)} تدقيقات`);
        return html;
      };
    }
    if(typeof renderPriorities==='function'){
      const originalRenderPriorities=renderPriorities;
      renderPriorities=function(d){originalRenderPriorities(d);document.querySelectorAll('.decision small').forEach(el=>{el.textContent=el.textContent.replace('• متكررة','• مستمرة من تدقيق سابق');});};
    }

    // Refresh visible rows using the clearer recurring wording if audit data already exists.
    try{if(state.data){renderFindings();renderPriorities(state.data);}}catch{}
  };
  wait();
})();