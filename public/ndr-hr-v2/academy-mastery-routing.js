(()=>{'use strict';
const STORE='ndrAcademyMasteryV1',UNIT_STORE='ndrAcademyUnitMasteryV1';
function state(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return{}}}
function unitState(){try{return JSON.parse(localStorage.getItem(UNIT_STORE)||'{}')}catch{return{}}}
function hasDiagnostic(){return !!state().diagnostic}
function score(track){return state().skills?.[track]?.score||0}
function unitsPassed(track){const u=unitState();return [0,1,2,3].every(i=>(u[`${track}-${i}`]?.score||0)>=80)}
function needsUnits(track){return score(track)<70&&!unitsPassed(track)}
function openRecommended(track){
  if(!hasDiagnostic()){document.querySelector('#diagnosticBtn')?.click();return}
  if(needsUnits(track)&&window.NDRUnits?.openTrack){window.NDRUnits.openTrack(track);return}
  const b=document.querySelector('.track[data-track="'+track+'"] [data-mastery]');
  if(b){b.dataset.adaptiveAllow='1';b.click();delete b.dataset.adaptiveAllow}
}
window.addEventListener('click',e=>{
  const mastery=e.target.closest?.('[data-mastery]');
  if(mastery&&!mastery.dataset.adaptiveAllow){
    e.preventDefault();e.stopImmediatePropagation();
    const t=mastery.dataset.mastery;
    if(!hasDiagnostic()){document.querySelector('#diagnosticBtn')?.click();return}
    if(needsUnits(t)&&window.NDRUnits?.openTrack){window.NDRUnits.openTrack(t);return}
    mastery.dataset.adaptiveAllow='1';mastery.click();delete mastery.dataset.adaptiveAllow;return
  }
  const card=e.target.closest?.('.track');
  if(!card||e.target.closest('button,a,input,textarea,label'))return;
  const t=card.dataset.track;if(!t)return;
  e.preventDefault();e.stopImmediatePropagation();openRecommended(t)
},true);
window.NDRAdaptive={openRecommended,score,unitsPassed,needsUnits};
})();