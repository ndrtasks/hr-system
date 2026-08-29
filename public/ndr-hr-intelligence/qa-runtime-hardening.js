(()=>{
  'use strict';
  if(window.__ndrQaRuntimeHardening)return;window.__ndrQaRuntimeHardening=true;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  (async()=>{
    for(let i=0;i<160;i++){
      if(typeof render==='function'&&typeof updateConnectionUi==='function')break;
      await sleep(50);
    }
    if(typeof render!=='function')return;
    const baseRender=render;
    render=function(){
      if(window.__ndrAttendanceActive){
        window.__ndrDeferredAuditRender=true;
        try{updateConnectionUi()}catch{}
        return;
      }
      window.__ndrDeferredAuditRender=false;
      return baseRender.apply(this,arguments);
    };
    window.addEventListener('ndr:attendance-view',e=>{
      if(!e?.detail?.active&&window.__ndrDeferredAuditRender){
        window.__ndrDeferredAuditRender=false;
        requestAnimationFrame(()=>{try{baseRender()}catch(err){console.error('NDR deferred render',err)}});
      }
    });
  })();
})();
