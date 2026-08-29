(()=>{
  'use strict';
  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine=window.matchMedia&&window.matchMedia('(pointer:fine)').matches;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function makeAmbient(){
    if(document.querySelector('.p5-ambient'))return;
    const ambient=document.createElement('div');
    ambient.className='p5-ambient';
    ambient.innerHTML='<i class="p5-light a"></i><i class="p5-light b"></i><i class="p5-light c"></i>';
    document.body.prepend(ambient);
    const pointer=document.createElement('div');
    pointer.className='p5-pointer-light';
    document.body.appendChild(pointer);
    if(!fine||reduce)return;
    let tx=innerWidth*.5,ty=innerHeight*.25,cx=tx,cy=ty,raf=0;
    const lights=[...ambient.querySelectorAll('.p5-light')];
    const frame=()=>{
      cx+=(tx-cx)*.09;cy+=(ty-cy)*.09;
      pointer.style.left=cx+'px';pointer.style.top=cy+'px';
      const nx=(cx/Math.max(innerWidth,1)-.5),ny=(cy/Math.max(innerHeight,1)-.5);
      if(lights[0])lights[0].style.transform=`translate3d(${nx*-20}px,${ny*-15}px,0)`;
      if(lights[1])lights[1].style.transform=`translate3d(${nx*16}px,${ny*13}px,0)`;
      if(lights[2])lights[2].style.transform=`translate3d(${nx*-8}px,${ny*9}px,0)`;
      raf=requestAnimationFrame(frame);
    };
    document.addEventListener('pointermove',e=>{tx=e.clientX;ty=e.clientY;document.body.classList.add('p5-pointer-active')},{passive:true});
    document.addEventListener('pointerleave',()=>document.body.classList.remove('p5-pointer-active'),{passive:true});
    raf=requestAnimationFrame(frame);
    addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});
  }

  function enhanceCard(card){
    if(!card||card.dataset.p5Tilt)return;
    card.dataset.p5Tilt='1';
    const sheen=document.createElement('span');
    sheen.className='p5-live-sheen';
    card.appendChild(sheen);
    if(!fine||reduce)return;
    let raf=0,px=.5,py=.5;
    const paint=()=>{
      raf=0;
      const rx=((.5-py)*1.5).toFixed(3)+'deg';
      const ry=((px-.5)*1.8).toFixed(3)+'deg';
      card.style.setProperty('--p5-x',(px*100).toFixed(1)+'%');
      card.style.setProperty('--p5-y',(py*100).toFixed(1)+'%');
      card.style.setProperty('--p5-rx',rx);
      card.style.setProperty('--p5-ry',ry);
    };
    card.addEventListener('pointermove',e=>{
      const r=card.getBoundingClientRect();
      if(!r.width||!r.height)return;
      px=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
      py=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));
      if(!raf)raf=requestAnimationFrame(paint);
    },{passive:true});
    card.addEventListener('pointerleave',()=>{
      card.style.setProperty('--p5-x','50%');card.style.setProperty('--p5-y','50%');
      card.style.setProperty('--p5-rx','0deg');card.style.setProperty('--p5-ry','0deg');
    },{passive:true});
  }

  function enhanceMagnetic(el){
    if(!el||el.dataset.p5Magnetic)return;
    el.dataset.p5Magnetic='1';
    el.classList.add('p5-magnetic');
    if(!fine||reduce)return;
    el.addEventListener('pointermove',e=>{
      const r=el.getBoundingClientRect();
      const x=((e.clientX-r.left)/Math.max(r.width,1)-.5)*5;
      const y=((e.clientY-r.top)/Math.max(r.height,1)-.5)*4;
      el.style.translate=`${x.toFixed(1)}px ${y.toFixed(1)}px`;
    },{passive:true});
    el.addEventListener('pointerleave',()=>{el.style.translate='0 0'},{passive:true});
  }

  function enhanceRipple(el){
    if(!el||el.dataset.p5Ripple)return;
    el.dataset.p5Ripple='1';
    el.addEventListener('click',e=>{
      if(reduce)return;
      const r=el.getBoundingClientRect();
      const s=document.createElement('span');
      s.className='p5-ripple';
      const size=Math.max(r.width,r.height)*.45;
      s.style.width=size+'px';s.style.height=size+'px';
      s.style.left=(e.clientX-r.left)+'px';s.style.top=(e.clientY-r.top)+'px';
      el.appendChild(s);setTimeout(()=>s.remove(),700);
    });
  }

  let io=null;
  function revealElements(scope=document){
    const page=scope.matches?.('.panelpage.active')?scope:scope.querySelector?.('.panelpage.active')||document.querySelector('.panelpage.active');
    if(!page)return;
    const nodes=[...page.querySelectorAll(':scope > .card,:scope > .dashboardHero > .card,:scope > .dashboardHero .card,:scope > .pagehero,:scope > .metrics > *,:scope > .overviewstats > *,:scope > .statgrid > *,:scope > .riskgrid > *,:scope > .integrationgrid > *,:scope > .rulemanager > *,:scope > .findingsgrid > *')];
    nodes.forEach((el,i)=>{
      if(el.dataset.p5Reveal)return;
      el.dataset.p5Reveal='1';el.classList.add('p5-reveal');
      el.style.transitionDelay=Math.min(i*34,220)+'ms';
      if(io)io.observe(el);else requestAnimationFrame(()=>el.classList.add('p5-in'));
    });
  }

  function scan(){
    document.querySelectorAll('.card').forEach(enhanceCard);
    document.querySelectorAll('button,.primary,.ghost,.iconbtn').forEach(el=>{enhanceMagnetic(el);enhanceRipple(el)});
    revealElements(document);
  }

  function watchPages(){
    const pages=[...document.querySelectorAll('.panelpage')];
    if(!pages.length)return;
    const mo=new MutationObserver(muts=>{
      if(muts.some(m=>m.attributeName==='class')){
        requestAnimationFrame(()=>{scan();revealElements(document)});
      }
    });
    pages.forEach(p=>mo.observe(p,{attributes:true,attributeFilter:['class']}));
  }

  async function boot(){
    for(let i=0;i<120;i++){
      if(document.getElementById('appShell')&&document.querySelector('.card'))break;
      await sleep(70);
    }
    if(!document.getElementById('appShell'))return;
    document.documentElement.classList.add('p5-ready');
    makeAmbient();
    if('IntersectionObserver'in window&&!reduce){
      io=new IntersectionObserver(entries=>entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add('p5-in');io.unobserve(entry.target)}
      }),{threshold:.06,rootMargin:'0px 0px -4% 0px'});
    }
    scan();watchPages();
    const root=document.getElementById('ndr-root');
    if(root){
      const mo=new MutationObserver(()=>requestAnimationFrame(scan));
      mo.observe(root,{childList:true,subtree:true});
    }
    setTimeout(()=>document.querySelectorAll('.p5-reveal').forEach(el=>el.classList.add('p5-in')),1100);
  }
  boot().catch(e=>console.warn('NDR Premium 5D:',e));
})();
