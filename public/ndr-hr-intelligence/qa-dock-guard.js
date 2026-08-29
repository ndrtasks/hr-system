(()=>{
  if(window.__ndrQaDockGuard)return;window.__ndrQaDockGuard=true;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const baseItems=[
    ['overview','◈','الرئيسية'],
    ['findingsPage','⌁','الحالات'],
    ['rulesPage','⬡','القواعد'],
    ['integrationPage','⇄','Odoo']
  ];
  function ensureItems(nav){
    for(const [page,icon,label] of baseItems){
      if(nav.querySelector(`button[data-page="${page}"]`))continue;
      const b=document.createElement('button');b.dataset.page=page;b.innerHTML=`<span class="navicon">${icon}</span><span class="navtext">${label}</span>`;nav.appendChild(b);
    }
  }
  function force(el,prop,val){try{el.style.setProperty(prop,val,'important')}catch{}}
  function harden(){
    const side=document.querySelector('.sidebar'),nav=side?.querySelector('.nav');if(!side||!nav)return false;
    ensureItems(nav);
    [['display','flex'],['visibility','visible'],['opacity','1'],['pointer-events','auto']].forEach(([p,v])=>force(nav,p,v));
    force(nav,'flex','1 1 auto');force(nav,'width','auto');force(nav,'min-width','0');force(nav,'height','54px');force(nav,'position','relative');force(nav,'z-index','2');
    nav.querySelectorAll('button[data-page]').forEach(b=>{
      [['display','flex'],['visibility','visible'],['opacity','1'],['pointer-events','auto'],['position','relative'],['transform','none'],['flex','0 0 auto']].forEach(([p,v])=>force(b,p,v));
      force(b,'min-width','126px');force(b,'height','52px');
    });
    return true;
  }
  (async()=>{
    for(let i=0;i<120;i++){if(harden())break;await sleep(50)}
    const root=document.getElementById('ndr-root')||document.body;
    const mo=new MutationObserver(()=>harden());mo.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
    window.addEventListener('resize',harden,{passive:true});
    window.addEventListener('ndr:attendance-view',harden);
    setTimeout(harden,800);setTimeout(harden,2000);
  })();
})();
