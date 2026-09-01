(()=>{
'use strict';
if(window.__ndrPresentationMode)return;window.__ndrPresentationMode=true;
try{localStorage.removeItem('ndr-odoo-key');sessionStorage.removeItem('ndr-odoo-key');}catch{}
function apply(){
  document.documentElement.dataset.ndrPresentation='1';
  const nav=document.querySelector('[data-page="integrationPage"]');if(nav)nav.style.display='none';
  const page=document.getElementById('integrationPage');if(page){page.style.display='none';page.classList.remove('active')}
  ['connectAndTest','clearConnection','testConnection','installNdrOdooApp','connectionKey','connectionUrl','connectionDb'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none'});
  const ws=document.querySelector('.workspace b');if(ws)ws.textContent='بيئة العرض';
  if(document.getElementById('integrationPage')?.classList.contains('active'))document.querySelector('[data-page="overview"]')?.click();
}
apply();
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();
