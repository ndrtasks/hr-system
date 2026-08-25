const RAW='https://raw.githubusercontent.com/ndrtasks/hr-system/ndr-hr-tools-audit-rc-20260825/public/ndr-hr-v2/';
export default async function handler(req,res){
  try{
    const [jsr,htmlr,cssr]=await Promise.all([fetch(RAW+'app.js',{cache:'no-store'}),fetch(RAW+'index.html',{cache:'no-store'}),fetch(RAW+'style.css',{cache:'no-store'})]);
    if(!jsr.ok||!htmlr.ok||!cssr.ok) throw new Error('source fetch failed');
    const [js,html,css]=await Promise.all([jsr.text(),htmlr.text(),cssr.text()]);
    let syntax=true,syntaxError='';
    try{new Function(js)}catch(e){syntax=false;syntaxError=e.message}
    const markers={
      tools:(js.match(/id:'/g)||[]).length,
      legalBasis:js.includes("function legalYears("),
      gosiNonSaudi400:js.includes("cat==='non'?400:1500"),
      gosi2028:js.includes('new Date(2028,6,14)'),
      hijriReject:js.includes('return null}\nfunction addGregorianYears'),
      monthClamp:js.includes('function addMonthsClamped'),
      profession2122:js.includes("OCC_CACHE.length"),
      rtl:html.includes('dir="rtl"'),
      cssNumericIsolation:css.includes('unicode-bidi:isolate')
    };
    res.status(syntax?200:500).json({ok:syntax,syntax,syntaxError,lengths:{js:js.length,html:html.length,css:css.length},markers});
  }catch(e){res.status(500).json({ok:false,error:String(e.message||e)})}
}