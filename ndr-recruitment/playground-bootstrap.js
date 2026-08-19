const NDR_PLAY=true;
const nativeFetch=window.fetch.bind(window);
window.fetch=(input,init)=>{
  let url=typeof input==='string'?input:(input&&input.url?input.url:String(input));
  url=url
    .replace('/rest/v1/jobs','/rest/v1/play_jobs')
    .replace('/rest/v1/candidates','/rest/v1/play_candidates')
    .replace('/storage/v1/object/candidate-files/','/storage/v1/object/candidate-files-playground/');
  return nativeFetch(url,init);
};
const s=document.createElement('script');
s.src='https://cdn.jsdelivr.net/gh/ndrtasks/hr-system@b74015e73c4effda81e47cbec6d6defdb552d186/ndr-recruitment/app-supabase.js';
s.onload=()=>{const el=document.getElementById('syncText');if(el)el.textContent='نسخة تجريبية منفصلة'};
document.body.appendChild(s);