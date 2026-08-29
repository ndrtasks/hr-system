(()=>{
'use strict';
function apply(){const wrap=document.getElementById('attTableWrap');if(!wrap)return;for(const tr of wrap.querySelectorAll('tbody tr')){const tds=tr.querySelectorAll('td');if(tds.length<8)continue;const leave=(tds[5]?.textContent||'').trim(),btn=tds[7]?.querySelector('.att-edit');if(!btn)continue;const isAdd=(btn.textContent||'').includes('إضافة');if(isAdd&&leave&&leave!=='—'){btn.disabled=true;btn.title='هذا اليوم عليه إجازة؛ لن ينشئ NDR بصمة جديدة حتى لا يسبب تعارضا.';btn.textContent='إجازة — لا يضاف'}}}
async function boot(){for(let i=0;i<120;i++){if(document.getElementById('attTableWrap'))break;await new Promise(r=>setTimeout(r,80))}const wrap=document.getElementById('attTableWrap');if(!wrap)return;apply();new MutationObserver(()=>requestAnimationFrame(apply)).observe(wrap,{childList:true,subtree:true})}
boot();
})();