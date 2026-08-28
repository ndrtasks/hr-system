(()=>{
  const wait=()=>{
    if(typeof state==='undefined'||typeof openFinding!=='function'||typeof openOdooRef!=='function'){setTimeout(wait,80);return;}

    // Make recurrence language operationally clear everywhere.
    document.querySelectorAll('.changeitem.repeat span').forEach(el=>{
      if((el.textContent||'').includes('متكررة')) el.textContent='مستمرة من تدقيق سابق';
    });

    if(typeof updateSecretState==='function'){
      const baseUpdateSecret=updateSecretState;
      updateSecretState=function(){
        baseUpdateSecret();
        const el=document.getElementById('secretState');
        const has=!!String(document.getElementById('connectionKey')?.value||state.connection?.apiKey||'').trim();
        if(el&&has)el.textContent='محفوظ لهذه الجلسة — يبقى بعد تحديث الصفحة';
      };
      try{updateSecretState();}catch{}
    }

    const baseOpen=openFinding;
    openFinding=function(key){
      baseOpen(key);
      const f=state.current;if(!f)return;
      const occurrence=document.getElementById('modalOccurrence');
      const n=typeof currentOccurrence==='function'?currentOccurrence(f):1;
      if(occurrence){
        occurrence.textContent=n>1?`مستمرة عبر ${number(n)} تدقيقات`:'أول ظهور';
        occurrence.title=n>1?'لا يعني وجود سجلات مكررة؛ يعني أن نفس المشكلة بقيت موجودة في المصدر عبر عدة عمليات تدقيق.':'هذه أول مرة يكتشف فيها NDR هذه الحالة.';
      }

      const btn=document.getElementById('openSourceBtn');
      if(btn){
        btn.textContent='فتح مكان التعديل في Odoo ↗';
        btn.onclick=async()=>{
          const path=document.getElementById('ndrEditPath')?.textContent||'';
          const field=document.getElementById('ndrEditField')?.textContent||'';
          const guide=[path,field].filter(Boolean).join(' — ');
          if(guide){try{await navigator.clipboard.writeText(guide);}catch{}}
          openOdooRef(f.ref,'مكان التعديل');
          if(typeof toast==='function')toast(guide?'تم فتح السجل ونسخ مكان التعديل':'تم فتح السجل المسبب في Odoo');
        };
      }
    };
  };
  wait();
})();
