(()=>{
  'use strict';
  if(window.__ndrFreshLeaf5d)return;
  window.__ndrFreshLeaf5d=true;
  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function addLeaves(){
    if(document.querySelector('.fl-leaf-layer'))return;
    const layer=document.createElement('div');
    layer.className='fl-leaf-layer';
    layer.setAttribute('aria-hidden','true');
    layer.innerHTML='<i class="fl-leaf a"></i><i class="fl-leaf b"></i><i class="fl-leaf c"></i><i class="fl-leaf d"></i>';
    document.body.prepend(layer);
  }
  function markTheme(){
    document.documentElement.dataset.ndrTheme='fresh-leaf-5d';
    document.body.classList.add('ndr-fresh-leaf');
  }
  function boot(){markTheme();addLeaves();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  if(!reduce){
    window.addEventListener('focus',addLeaves);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')addLeaves()});
  }
})();
