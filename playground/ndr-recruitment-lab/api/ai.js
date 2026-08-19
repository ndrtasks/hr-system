const GEMINI_KEY=process.env.GEMINI_API_KEY;
const MODEL='gemini-3.6-flash';
const GEMINI=`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const SB='https://riqcnplmywivsmotuoak.supabase.co';
const SB_KEY='sb_publishable_h-AARawqdGALjh3PZnOnjA_gYort_ge';

async function fetchStoredFile(path){
  const r=await fetch(`${SB}/storage/v1/object/lab-candidate-files/${encodeURI(path)}`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`}});
  if(!r.ok) throw new Error('تعذر قراءة الملف من التخزين');
  const ab=await r.arrayBuffer();
  return Buffer.from(ab).toString('base64');
}
function outText(data){return (data?.candidates?.[0]?.content?.parts||[]).map(x=>x.text||'').join('\n').trim()}
async function gemini(parts,opts={}){
  const r=await fetch(GEMINI,{method:'POST',headers:{'x-goog-api-key':GEMINI_KEY,'Content-Type':'application/json'},body:JSON.stringify({
    contents:[{role:'user',parts}],
    generationConfig:{temperature:opts.temperature??0.2,maxOutputTokens:opts.maxOutputTokens??1800,responseMimeType:opts.json?'application/json':undefined}
  })});
  const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{data={raw}}
  if(!r.ok) throw new Error(data?.error?.message||raw||`Gemini ${r.status}`);
  return {data,text:outText(data)};
}
function cleanJson(s){try{return JSON.parse(String(s||'').trim())}catch{const m=String(s||'').match(/\{[\s\S]*\}/);if(!m)return null;try{return JSON.parse(m[0])}catch{return null}}}

export default async function handler(req,res){
  if(req.method==='GET'){
    try{
      if(!GEMINI_KEY) return res.status(500).json({ok:false,error:'GEMINI_API_KEY غير موجود'});
      const {text}=await gemini([{text:'أجب بكلمة OK فقط'}],{maxOutputTokens:20,temperature:0});
      return res.status(200).json({ok:true,provider:'Gemini',model:MODEL,reply:text});
    }catch(e){console.error(e);return res.status(500).json({ok:false,error:e.message||'Gemini error'})}
  }
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  try{
    const {action}=req.body||{};
    if(action==='extract'||action==='extract_stored'){
      let {filename,mime,file_data,path}=req.body||{};
      if(action==='extract_stored'){if(!path)return res.status(400).json({error:'Missing path'});file_data=await fetchStoredFile(path)}
      if(!file_data)return res.status(400).json({error:'Missing file'});
      const prompt=`أنت محلل ملفات توظيف دقيق. اقرأ الملف المرفق واستخرج فقط المعلومات الموجودة فعلا دون تخمين. أعد JSON فقط بهذه المفاتيح: name, phone, email, city, nationality, current_title, current_employer, education, years_experience, skills, certifications, languages, summary, searchable_text. اجعل education وskills وcertifications وlanguages مصفوفات. years_experience رقم فقط إذا أمكن استنتاجه بوضوح وإلا null. searchable_text يجمع أهم الكلمات والبيانات للبحث عن المرشح. أي معلومة غير موجودة = null أو [].`;
      const {text}=await gemini([{text:prompt},{inlineData:{mimeType:mime||'application/pdf',data:file_data}}],{json:true,maxOutputTokens:1800,temperature:0});
      const profile=cleanJson(text);if(!profile)return res.status(502).json({error:'تعذر قراءة بيانات الملف'});
      return res.status(200).json({profile});
    }
    if(action==='chat'){
      const {question,context}=req.body||{};
      const system=`أنت NDR AI، مساعد توظيف ذكي لفريق الموارد البشرية. تعتمد حصرا على بيانات النظام المرفقة ولا تخترع معلومات. طابق المرشح بذكاء حتى لو كان إدخال المستخدم غير مطابق حرفيا: افهم الاسم الجزئي، اختلاف الهمزات والألف والياء والتاء المربوطة، المسافات، الأخطاء الإملائية البسيطة، الاسم الأول أو الأخير فقط، والكتابة العربية/الإنجليزية المتقاربة. في أرقام الجوال والبريد اقبل الجزء المميز أو آخر الأرقام إذا كان كافيا للتمييز. ابحث أيضا في searchable_text وبقية المعلومات المستخرجة من السيرة وطلب التوظيف. إذا وجدت أكثر من تطابق محتمل، اذكر الأقرب واطلب توضيحا قصيرا فقط عند الحاجة. إذا سئلت عن مرشح اذكر: هويته إن أمكن، الوظيفة، المرحلة الحالية، ما تم معه من السجل، آخر ملاحظة وتحديث، ثم اقترح الخطوة التالية. في التقارير حلل الإنجاز، الشواغر، خط المرشحين، الاختناقات، المتأخرين، المخاطر والأولويات. اكتب بالعربية المهنية الواضحة والمختصرة.`;
      const payload=JSON.stringify(context||{});
      const {text}=await gemini([{text:`${system}\n\nسؤال المستخدم:\n${question||''}\n\nبيانات النظام:\n${payload}`}],{maxOutputTokens:2200,temperature:0.25});
      return res.status(200).json({answer:text});
    }
    if(action==='health'){const {text}=await gemini([{text:'أجب بكلمة OK فقط'}],{maxOutputTokens:20,temperature:0});return res.status(200).json({ok:true,model:MODEL,reply:text})}
    return res.status(400).json({error:'Unknown action'});
  }catch(e){console.error(e);return res.status(500).json({error:e.message||'AI error'})}
}
