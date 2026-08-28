(()=>{
  const wait=()=>{
    if(typeof state==='undefined'||typeof openFinding!=='function'||typeof openOdooRef!=='function'){setTimeout(wait,80);return;}

    // Odoo 19 canonical record route. This opens the actual record instead of a generic employee fallback.
    recordUrl=function(ref){
      const base=state.data?.navigation?.odooBaseUrl||state.connection?.baseUrl;
      if(!base||!ref?.model||!ref?.id)return null;
      return `${String(base).replace(/\/$/,'')}/odoo/${encodeURIComponent(ref.model)}/${encodeURIComponent(ref.id)}`;
    };

    const targets={
      R001:{path:'ملف الموظف ← بيانات العقد',field:'تاريخ نهاية العقد',button:'فتح ملف الموظف في Odoo'},
      R002:{path:'ملف الموظف ← بيانات العقد',field:'العقد الساري / تواريخ العقد',button:'فتح ملف الموظف في Odoo'},
      R003:{path:'الحضور + طلب الإجازة المتقاطعين',field:'راجع السجلين وحدد أيهما يمثل الواقع',button:'فتح سجل الحضور المتعارض'},
      R004:{path:'الحضور ← سجل اليوم المحدد',field:'وقت الخروج',button:'فتح سجل الحضور'},
      R005:{path:'الحضور ← السجلان المتداخلان',field:'أوقات الدخول والخروج',button:'فتح سجل الحضور المتداخل'},
      R006:{path:'الحضور ← سجل اليوم المحدد',field:'وقت الدخول',button:'فتح سجل الحضور'},
      R007:{path:'الحضور ← سجل اليوم المحدد',field:'وقت الخروج',button:'فتح سجل الحضور'},
      R008:{path:'ملف الموظف ← بيانات العمل / التصاريح',field:'تاريخ انتهاء التأشيرة',button:'فتح ملف الموظف في Odoo'},
      R009:{path:'ملف الموظف ← بيانات العمل / التصاريح',field:'تاريخ انتهاء تصريح العمل',button:'فتح ملف الموظف في Odoo'},
      R010:{path:'ملف الموظف ← مراقبة NDR',field:'انتهاء الهوية الوطنية',button:'فتح ملف الموظف — ثم مراقبة NDR'},
      R011:{path:'ملف الموظف ← مراقبة NDR',field:'انتهاء الإقامة',button:'فتح ملف الموظف — ثم مراقبة NDR'},
      R012:{path:'ملف الموظف ← مراقبة NDR',field:'انتهاء جواز السفر',button:'فتح ملف الموظف — ثم مراقبة NDR'},
      R013:{path:'ملف الموظف ← مراقبة NDR',field:'انتهاء التأمين الطبي',button:'فتح ملف الموظف — ثم مراقبة NDR'},
      R014:{path:'ملف الموظف ← مراقبة NDR',field:'انتهاء الترخيص المهني',button:'فتح ملف الموظف — ثم مراقبة NDR'},
      R015:{path:'ملف الموظف ← العمل ← بيانات العمل / فترة التجربة',field:'نهاية فترة التجربة',button:'فتح ملف الموظف — ثم تبويب العمل'},
      R016:{path:'ملف الموظف ← بيانات العقد',field:'تاريخ نهاية العقد / حالة العقد',button:'فتح ملف الموظف في Odoo'},
      R017:{path:'الحضور ← سجلات التأخير التي كوّنت التكرار',field:'افتح سجلات التأخير المرتبطة واحدًا واحدًا',button:'فتح أول سجل تأخير'},
      R018:{path:'الإجازات ← طلب الإجازة المعلق',field:'حالة الطلب ومسار الاعتماد',button:'فتح طلب الإجازة'}
    };

    function primaryRef(f){
      if(f.code==='R017'&&Array.isArray(f.relatedRefs)&&f.relatedRefs.length)return f.relatedRefs[0];
      if(['R003','R004','R005','R006','R007'].includes(f.code)&&f.ref?.model==='hr.attendance')return f.ref;
      if(f.code==='R018'&&f.ref?.model==='hr.leave')return f.ref;
      return f.employeeRef||f.ref;
    }

    function relatedLabel(f,r,i){
      if(f.code==='R017')return r.label||`سجل التأخير ${i+1}`;
      if(f.code==='R003'&&r.model==='hr.leave')return r.label||'طلب الإجازة المتقاطع';
      if(f.code==='R005')return r.label||`سجل الحضور المرتبط ${i+1}`;
      return r.label||`${r.model} #${r.id}`;
    }

    const baseOpen=openFinding;
    openFinding=function(key){
      baseOpen(key);
      const f=state.current;if(!f)return;
      const t=targets[f.code]||{path:'افتح السجل المسبب وراجع البيانات المرتبطة بالحالة',field:f.title,button:'فتح السجل في Odoo'};
      const path=document.getElementById('ndrEditPath');
      const fld=document.getElementById('ndrEditField');
      const copy=document.getElementById('ndrCopyTarget');
      if(path)path.textContent=t.path;
      if(fld)fld.textContent=`المطلوب مراجعته: ${t.field}`;
      if(copy)copy.style.display='none';

      const hint=document.getElementById('sourceHint');
      if(hint)hint.textContent=`السجل الذي سيفتحه NDR: ${t.path}. ملاحظة: Odoo Online لا يسمح لرابط خارجي بتحديد تبويب Studio أو تظليل حقل بعينه.`;

      const ref=primaryRef(f);
      const btn=document.getElementById('openSourceBtn');
      if(btn){btn.textContent=`${t.button} ↗`;btn.onclick=()=>openOdooRef(ref,t.button);}

      const related=Array.isArray(f.relatedRefs)?f.relatedRefs:[];
      const box=document.getElementById('relatedRecords');
      if(box&&related.length){
        box.innerHTML=related.map((r,i)=>`<button class="relatedrecord" data-smart-related="${i}">${escapeHtml(relatedLabel(f,r,i))} ↗</button>`).join('');
        box.querySelectorAll('[data-smart-related]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.smartRelated);openOdooRef(related[i],relatedLabel(f,related[i],i));});
      }

      // Keep employee navigation as a separate secondary action, never as the primary fix for attendance/leave cases.
      const emp=document.getElementById('openEmployeeBtn');
      if(emp)emp.textContent='ملف الموظف في Odoo ↗';
    };
  };
  wait();
})();
