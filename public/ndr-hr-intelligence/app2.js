$('caseSearch').oninput=e=>{state.search=e.target.value;state.page=1;renderFindings();};$('statusFilter').onchange=e=>{state.status=e.target.value;state.page=1;renderFindings();};$('issueFilter').onchange=e=>{state.issue=e.target.value;state.page=1;renderFindings();};$('pageSize').onchange=e=>{state.pageSize=Number(e.target.value)||25;state.page=1;renderFindings();};
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;state.page=1;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderFindings();});

function renderActivity(){const arr=state.data?.activity||[];$('activity').innerHTML=arr.length?arr.slice(0,5).map(a=>`<div class="event"><div class="eventtime">${escapeHtml(a.time)}</div><div><b>${escapeHtml(a.type)}</b><p>${escapeHtml(a.text)}</p></div></div>`).join(''):'<div class="empty">سيظهر النشاط بعد الربط الحي.</div>';}
function syncRuleConfig(rules){
  let changed=false;
  for(const r of rules||[]){
    const existing=state.ruleConfig[r.code]||{};
    if(!state.ruleConfig[r.code]){state.ruleConfig[r.code]={enabled:!!r.enabled};changed=true;}
    const cfg=r.config||{};
    for(const k of ['thresholdDays','criticalDays','repeatCount','pendingDays']){
      if(cfg[k]!=null&&existing[k]==null&&state.ruleConfig[r.code][k]==null){state.ruleConfig[r.code][k]=cfg[k];changed=true;}
    }
    if(r.locked&&state.ruleConfig[r.code].enabled){state.ruleConfig[r.code].enabled=false;changed=true;}
  }
  if(changed)localStorage.setItem('ndr-rule-config',JSON.stringify(state.ruleConfig));
}
function availabilityLabel(r){
  if(r.availability==='missing_field')return['الحقل غير موجود في Odoo','locked'];
  if(r.availability==='missing_source')return['المصدر غير متاح','locked'];
  if(r.locked)return['بانتظار مصدر','locked'];
  if(r.availability==='mapped')return['حقل قابل للربط','mapped'];
  if(r.availability==='standard')return['Odoo قياسي','ready'];
  if(r.availability==='ready')return['جاهز','ready'];
  return['قابل للتخصيص','mapped'];
}
function ruleCfgHtml(r,cfg){
  const items=[];
  if(r.setting){const k=r.setting.key,v=cfg[k]??r.setting.default;items.push(`<div class="rulecfg"><label>${escapeHtml(r.setting.label)}</label><div class="rulecfgbox"><input type="number" data-rule-setting="${escapeHtml(r.code)}" data-setting-key="${escapeHtml(k)}" min="${r.setting.min}" max="${r.setting.max}" value="${escapeHtml(v)}"><span>${escapeHtml(r.setting.unit||'')}</span></div></div>`);}
  if(r.criticalSetting){const k=r.criticalSetting.key,v=cfg[k]??r.criticalSetting.default;items.push(`<div class="rulecfg"><label>${escapeHtml(r.criticalSetting.label)}</label><div class="rulecfgbox"><input type="number" data-rule-setting="${escapeHtml(r.code)}" data-setting-key="${escapeHtml(k)}" min="${r.criticalSetting.min}" max="${r.criticalSetting.max}" value="${escapeHtml(v)}"><span>${escapeHtml(r.criticalSetting.unit||'')}</span></div></div>`);}
  return items.join('');
}
function renderRules(){
  const rules=state.data?.rules||[];syncRuleConfig(rules);
  const groups=[];const by=new Map();for(const r of rules){if(!by.has(r.category)){by.set(r.category,[]);groups.push(r.category);}by.get(r.category).push(r);}
  const active=rules.filter(r=>!r.locked&&(state.ruleConfig[r.code]?.enabled??r.enabled)).length;
  $('enabledRuleCount').textContent=number(active);$('totalRuleCount').textContent=number(rules.filter(r=>!r.locked).length);
  $('ruleControlHint').textContent=`${number(rules.filter(r=>r.availability==='standard'||r.availability==='ready').length)} قواعد تعمل على مصادر Odoo القياسية، والبقية تتفعل عند ربط الحقول المخصصة.`;
  $('rulesGrid').innerHTML=groups.map(cat=>{
    const rows=by.get(cat)||[];const on=rows.filter(r=>!r.locked&&(state.ruleConfig[r.code]?.enabled??r.enabled)).length;
    return `<section class="rulegroup"><div class="rulegrouphead"><h3>${escapeHtml(cat)}</h3><span>${number(on)} فعالة من ${number(rows.filter(r=>!r.locked).length)}</span></div><div class="rulecontrolgrid">${rows.map(r=>{
      const cfg={...(r.config||{}),...(state.ruleConfig[r.code]||{})};const checked=!r.locked&&(cfg.enabled??r.enabled);const [av,avClass]=availabilityLabel(r);
      return `<div class="rulecontrol card ${checked?'':'disabled'} ${r.locked?'locked':''}" data-rule-card="${escapeHtml(r.code)}"><div class="ruleinfo"><div class="ruleline"><code>${escapeHtml(r.code)}</code><span class="ruleavailability ${avClass}">${escapeHtml(av)}</span></div><h4>${escapeHtml(r.name)}</h4><p>${escapeHtml(r.explain)}</p><div class="rulesource">${escapeHtml(r.scope||'')}</div></div><div class="ruletools"><label class="switch"><input type="checkbox" data-rule-toggle="${escapeHtml(r.code)}" ${checked?'checked':''} ${r.locked?'disabled':''}><span class="slider"></span></label>${r.locked?`<div class="rulelockednote">يتفعل بعد ربط المصدر المطلوب حتى لا يعطي إنذارًا غير دقيق.</div>`:`<div class="ruleconfigs">${ruleCfgHtml(r,cfg)}</div>`}</div></div>`;
    }).join('')}</div></section>`;
  }).join('')||'<div class="ruleempty">لم يتم تحميل كتالوج القواعد.</div>';
  document.querySelectorAll('[data-rule-toggle]').forEach(x=>x.onchange=()=>{const code=x.dataset.ruleToggle;state.ruleConfig[code]={...(state.ruleConfig[code]||{}),enabled:x.checked};localStorage.setItem('ndr-rule-config',JSON.stringify(state.ruleConfig));const card=document.querySelector(`[data-rule-card="${code}"]`);card?.classList.toggle('disabled',!x.checked);renderRuleCountOnly();});
  document.querySelectorAll('[data-rule-setting]').forEach(x=>x.onchange=()=>{const code=x.dataset.ruleSetting,key=x.dataset.settingKey;const min=Number(x.min||0),max=Number(x.max||9999);const v=Math.max(min,Math.min(max,Number(x.value||0)));x.value=v;state.ruleConfig[code]={...(state.ruleConfig[code]||{}),[key]:v};localStorage.setItem('ndr-rule-config',JSON.stringify(state.ruleConfig));});
}
function renderRuleCountOnly(){const rules=state.data?.rules||[];const active=rules.filter(r=>!r.locked&&(state.ruleConfig[r.code]?.enabled??r.enabled)).length;$('enabledRuleCount').textContent=number(active);}
function renderPolicy(d){const p=state.policyOverrides||d.policy||{};if(document.activeElement?.tagName!=='INPUT'){$('shiftStart').value=p.shiftStart||'07:30';$('shiftEnd').value=p.shiftEnd||'15:30';$('lateGrace').value=p.lateGraceMinutes??20;$('earlyGrace').value=p.earlyGraceMinutes??6;}$('policyTimezone').textContent=d.policy?.timezone||'Asia/Riyadh';}
$('applyPolicy').onclick=()=>{state.policyOverrides={shiftStart:$('shiftStart').value,shiftEnd:$('shiftEnd').value,lateGraceMinutes:Number($('lateGrace').value||0),earlyGraceMinutes:Number($('earlyGrace').value||0)};localStorage.setItem('ndr-policy-overrides',JSON.stringify(state.policyOverrides));toast('تم حفظ سياسة الحضور. اضغط حفظ وتشغيل التدقيق لتطبيق جميع التغييرات.');};
$('applyRules').onclick=()=>{localStorage.setItem('ndr-rule-config',JSON.stringify(state.ruleConfig));runAudit(false);};
$('enableAllRules').onclick=()=>{for(const r of state.data?.rules||[])if(!r.locked)state.ruleConfig[r.code]={...(state.ruleConfig[r.code]||{}),enabled:true};localStorage.setItem('ndr-rule-config',JSON.stringify(state.ruleConfig));renderRules();toast('تم تفعيل جميع القواعد المتاحة.');};
$('recommendedRules').onclick=()=>{for(const r of state.data?.rules||[])state.ruleConfig[r.code]={...(state.ruleConfig[r.code]||{}),enabled:!r.locked&&r.defaultEnabled!==false};localStorage.setItem('ndr-rule-config',JSON.stringify(state.ruleConfig));renderRules();toast('تم تطبيق الإعداد الموصى به للموارد البشرية.');};
$('resetRules').onclick=()=>{state.ruleConfig={};localStorage.removeItem('ndr-rule-config');syncRuleConfig(state.data?.rules||[]);renderRules();toast('عادت القواعد إلى الإعداد الافتراضي.');};

function renderQuality(d){
