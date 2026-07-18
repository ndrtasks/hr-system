import React, { useState } from 'react';
import { Bot, Loader2, Send, Sparkles, X } from 'lucide-react';
import { useTaskContext } from '../context/AppTaskContext';
import { isSuperAdminUser } from '../types';

const AIAssistant = () => {
  const { currentUser, tasks, users, departments } = useTaskContext();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  if (!currentUser) return null;
  const superAdmin = isSuperAdminUser(currentUser);

  const superAdminPrompts = ['حلل أداء جميع الأقسام', 'حدد المخاطر والمهام المتأخرة', 'اقترح قراراً إدارياً', 'اكتب تعميماً لمدراء الأقسام'];
  const managerPrompts = ['لخص حالة العمل اليوم', 'اقترح رسالة تحفيزية للفريق', 'حدد المهام التي تحتاج متابعة', 'اكتب رسالة لتحسين الأداء'];
  const employeePrompts = ['رتب أولوياتي اليوم', 'ضع خطة تنفيذ لمهامي', 'اكتب تحديثاً احترافياً للمدير', 'اقترح الخطوة التالية'];
  const prompts = superAdmin ? superAdminPrompts : currentUser.role === 'MANAGER' ? managerPrompts : employeePrompts;

  const cleanAssistantText = (text: string) => text
    .replace(/\*\*/g, '')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const ask = async (text = question) => {
    if (!text.trim()) return;
    setLoading(true); setAnswer(''); setQuestion(text);
    try {
      const res = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessLevel: currentUser.accessLevel, role: currentUser.role, userName: currentUser.name, question: text, tasks: tasks.map(task => ({ title: task.title, description: task.description, status: task.status, dueDate: task.dueDate, priority: task.priority, department: task.department })), departments: superAdmin ? departments.map(department => ({ name: department.name, employeeCount: users.filter(user => user.role === 'EMPLOYEE' && user.department === department.name).length, taskCount: tasks.filter(task => task.department === department.name).length })) : [] }) });
      const data = await res.json();
      const safeErrors: Record<string, string> = {
        AI_NOT_CONFIGURED: 'يلزم إضافة GEMINI_API_KEY في إعدادات Vercel لتشغيل المساعد.',
        AI_KEY_OR_REQUEST_INVALID: 'رفض Gemini المفتاح أو الطلب. تأكد أن المفتاح أُنشئ من Google AI Studio لمشروع مفعّل.',
        AI_KEY_NOT_AUTHORIZED: 'المفتاح غير مخوّل لاستخدام Gemini API. راجع صلاحيات المفتاح والمشروع في Google AI Studio.',
        AI_MODEL_UNAVAILABLE: 'نموذج Gemini المحدد غير متاح لهذا المشروع حالياً.',
        AI_QUOTA_EXCEEDED: 'تم بلوغ حصة Gemini الحالية. حاول لاحقاً أو راجع الحصة والفوترة في Google AI Studio.',
        AI_PROVIDER_UNAVAILABLE: 'خدمة Gemini غير متاحة حالياً. حاول مرة أخرى بعد قليل.',
      };
      setAnswer(cleanAssistantText(data.answer || safeErrors[data.error] || 'تعذر الاتصال بالمساعد حالياً.'));
    } catch (_) { setAnswer('تعذر الاتصال بالمساعد حالياً.'); }
    finally { setLoading(false); }
  };

  return <>
    <div className="fixed bottom-6 left-4 md:left-6 z-40 flex flex-col items-center gap-2">
      <button onClick={() => setOpen(true)} className="px-3 py-1.5 rounded-xl bg-slate-900/95 border border-purple-500/30 text-[11px] md:text-xs font-bold text-white shadow-xl backdrop-blur-md hover:border-purple-400 hover:text-purple-200 transition-colors whitespace-nowrap">
        اسأل <span dir="ltr" className="inline-block text-purple-300">NDR AI</span>
      </button>
      <button onClick={() => setOpen(true)} className="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-2xl shadow-purple-900/30 flex items-center justify-center hover:scale-105 transition-transform" title="NDR AI" aria-label="فتح NDR AI">
        <span className="absolute inset-0 rounded-full bg-purple-400/20 animate-ping pointer-events-none" />
        <Sparkles size={24} className="relative"/>
      </button>
    </div>
    {open && <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-3">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center"><div className="flex gap-2.5 items-center"><div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center"><Bot className="text-purple-400" size={22}/></div><div><div className="flex items-center gap-2"><h3 dir="ltr" className="text-white font-black tracking-wide">NDR AI</h3><span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">خاص</span></div><p className="text-[11px] text-slate-500">{superAdmin ? 'مساعد المدير العام التنفيذي' : `مساعد ${currentUser.role === 'MANAGER' ? 'المدير' : 'الموظف'} الذكي`} — ابتكار وتطوير نادر</p></div></div><button onClick={() => setOpen(false)} aria-label="إغلاق"><X className="text-slate-400"/></button></div>
        <div className="p-4 space-y-3 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">{prompts.map(prompt => <button key={prompt} onClick={() => ask(prompt)} className="text-xs text-right p-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-blue-600/20 border border-slate-700">{prompt}</button>)}</div>
          {loading && <div className="p-5 flex justify-center"><Loader2 className="animate-spin text-purple-400"/></div>}
          {answer && <div dir="rtl" className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-right text-slate-200 whitespace-pre-wrap leading-8">{answer}</div>}
        </div>
        <form onSubmit={event => { event.preventDefault(); ask(); }} className="p-3 border-t border-slate-700 flex gap-2"><input value={question} onChange={e => setQuestion(e.target.value)} placeholder="اسأل NDR AI..." className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 text-white outline-none"/><button disabled={loading || !question.trim()} className="bg-blue-600 text-white p-3 rounded-lg disabled:opacity-50"><Send size={18}/></button></form>
      </div>
    </div>}
  </>;
};

export default AIAssistant;
