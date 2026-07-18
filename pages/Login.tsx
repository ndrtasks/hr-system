import React, { useState } from 'react';
import { useTaskContext } from '../context/AppTaskContext';
import { Briefcase, Users, ShieldCheck, ArrowRight, KeyRound, CheckCircle, Wifi, Loader2, Crown } from 'lucide-react';
import { LoginPortal } from '../types';

type LoginView = 'SELECTION' | LoginPortal;

const Login = () => {
  const { loginWithCredentials, recoverPassword, isLiveMode } = useTaskContext();
  const [view, setView] = useState<LoginView>('SELECTION');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const portalFocus = view === 'SUPER_ADMIN' ? 'focus:ring-violet-500' : view === 'MANAGER' ? 'focus:ring-amber-500' : 'focus:ring-blue-500';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setIsLoading(true);
    
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
        setError('يرجى تعبئة جميع الحقول');
        setIsLoading(false);
        return;
    }

    try {
        if (view === 'SELECTION') return;
        const result = await loginWithCredentials(cleanEmail, cleanPassword, view);
        if (!result.success) {
            setError(result.message || 'حدث خطأ أثناء تسجيل الدخول');
        }
    } catch (err) {
        setError('حدث خطأ غير متوقع');
    } finally {
        setIsLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
      e.preventDefault();
      const result = await recoverPassword(recoveryEmail);
      if (result.success) setRecoveryMessage(result.message);
      else setError(result.message);
  };

  const resetState = () => {
      setEmail('');
      setPassword('');
      setError('');
      setShowRecovery(false);
      setRecoveryMessage('');
      setRecoveryEmail('');
      setIsLoading(false);
  };

  const renderSelection = () => (
    <div className="w-full max-w-6xl z-10 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in zoom-in-95 duration-300">
        <button
            onClick={() => { setView('SUPER_ADMIN'); resetState(); }}
            className="group bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-violet-500/60 p-8 rounded-2xl transition-all duration-300 flex flex-col items-center text-center shadow-2xl hover:shadow-violet-900/20"
        >
            <div className="w-20 h-20 bg-gradient-to-br from-violet-500/20 to-fuchsia-600/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Crown size={40} className="text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">بوابة المدير العام</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
                دخول حصري لمالك النظام.<br/>
                إدارة الأقسام والمديرين وكامل النظام.
            </p>
            <div className="mt-8 flex items-center gap-2 text-violet-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>الدخول الحصري</span>
                <ArrowRight size={16} className="rtl:rotate-180" />
            </div>
        </button>

        <button 
            onClick={() => { setView('MANAGER'); resetState(); }}
            className="group bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 p-8 rounded-2xl transition-all duration-300 flex flex-col items-center text-center shadow-2xl hover:shadow-amber-900/20"
        >
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck size={40} className="text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">بوابة الإدارة</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
                الدخول للمدراء ورؤساء الأقسام.<br/>
                إدارة المهام، الموظفين، والتقارير.
            </p>
            <div className="mt-8 flex items-center gap-2 text-amber-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>تسجيل الدخول</span>
                <ArrowRight size={16} className="rtl:rotate-180" />
            </div>
        </button>

        <button 
            onClick={() => { setView('EMPLOYEE'); resetState(); }}
            className="group bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 p-8 rounded-2xl transition-all duration-300 flex flex-col items-center text-center shadow-2xl hover:shadow-blue-900/20"
        >
             <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users size={40} className="text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">بوابة الموظفين</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
                الدخول لأعضاء الفريق.<br/>
                متابعة المهام المسندة وتحديث حالتها.
            </p>
             <div className="mt-8 flex items-center gap-2 text-blue-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>تسجيل الدخول</span>
                <ArrowRight size={16} className="rtl:rotate-180" />
            </div>
        </button>
    </div>
  );

  const renderLoginForm = () => (
      <div className="w-full max-w-md z-10 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative">
            
            <button 
                onClick={() => { setView('SELECTION'); resetState(); }}
                className="absolute top-6 left-6 text-slate-500 hover:text-white flex items-center gap-1 text-xs transition-colors"
            >
                <ArrowRight size={14} className="rtl:rotate-180" />
                عودة
            </button>

            <div className="text-center mb-8">
                <div className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-3 ${view === 'SUPER_ADMIN' ? 'bg-violet-500/10 text-violet-400' : view === 'MANAGER' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {view === 'SUPER_ADMIN' ? <Crown size={28} /> : view === 'MANAGER' ? <ShieldCheck size={28} /> : <Users size={28} />}
                </div>
                <h2 className="text-xl font-bold text-white">
                    {view === 'SUPER_ADMIN' ? 'دخول المدير العام' : view === 'MANAGER' ? 'تسجيل دخول مدير القسم' : 'تسجيل دخول الموظف'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">أدخل بياناتك للمتابعة</p>
            </div>

            {showRecovery ? (
                 <form onSubmit={handleRecovery} className="space-y-4">
                    {!recoveryMessage ? (
                        <>
                             <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 text-xs text-blue-300 mb-4">
                                أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">البريد الإلكتروني</label>
                                <input 
                                    type="email" 
                                    value={recoveryEmail}
                                    onChange={(e) => setRecoveryEmail(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-amber-500 outline-none text-sm dir-ltr text-right placeholder-slate-500"
                                    placeholder="your-email@example.com"
                                    required
                                />
                            </div>
                            {error && <div className="text-red-400 text-xs text-center">{error}</div>}
                            <button 
                                type="submit" 
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg mt-2 transition-all"
                            >
                                إرسال الرابط
                            </button>
                            <button 
                                type="button" 
                                onClick={() => { setShowRecovery(false); setError(''); }}
                                className="w-full text-slate-500 text-xs mt-2 hover:text-white"
                            >
                                إلغاء
                            </button>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <CheckCircle size={48} className="text-emerald-500 mx-auto mb-3" />
                            <p className="text-emerald-400 font-bold mb-2">تم الإرسال بنجاح!</p>
                            <p className="text-slate-400 text-xs mb-4">{recoveryMessage}</p>
                            <button 
                                type="button" 
                                onClick={() => { setShowRecovery(false); setRecoveryMessage(''); }}
                                className="text-slate-300 hover:text-white text-xs underline"
                            >
                                العودة لتسجيل الدخول
                            </button>
                        </div>
                    )}
                 </form>
            ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">البريد الإلكتروني</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-1 outline-none text-sm dir-ltr text-right placeholder-slate-500 ${portalFocus}`}
                            placeholder="your-email@example.com"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">كلمة المرور</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-1 outline-none text-sm dir-ltr text-right placeholder-slate-500 ${portalFocus}`}
                            placeholder="........"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg text-center flex items-center justify-center gap-2">
                           <ShieldCheck size={14} />
                           {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className={`w-full font-bold py-3 rounded-lg mt-2 transition-all shadow-lg text-white flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${view === 'SUPER_ADMIN' ? 'bg-violet-600 hover:bg-violet-700 hover:shadow-violet-500/20' : view === 'MANAGER' ? 'bg-amber-600 hover:bg-amber-700 hover:shadow-amber-500/20' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/20'}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                جاري الدخول...
                            </>
                        ) : (
                            `دخول ${view === 'SUPER_ADMIN' ? 'المدير العام' : view === 'MANAGER' ? 'مدير القسم' : 'الموظف'}`
                        )}
                    </button>

                    <div className="text-center mt-4">
                        <button 
                            type="button"
                            onClick={() => setShowRecovery(true)}
                            className="text-xs text-slate-500 hover:text-amber-400 flex items-center justify-center gap-1 mx-auto transition-colors"
                        >
                            <KeyRound size={12} />
                            نسيت كلمة المرور؟
                        </button>
                    </div>
                </form>
            )}
        </div>
        
        {view !== 'EMPLOYEE' && (
             <div className="mt-6 text-center transition-opacity">
                {isLiveMode ? (
                     <p className="text-[10px] text-emerald-500/70 flex items-center justify-center gap-1">
                        <Wifi size={10} />
                        النظام متصل بقاعدة البيانات (Live Mode)
                    </p>
                ) : (
                    <p className="text-[10px] text-amber-500/70">تعذر الاتصال بقاعدة البيانات</p>
                )}
            </div>
        )}
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-cairo">
      <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-colors duration-700 ${view === 'SUPER_ADMIN' ? 'bg-violet-600/10' : view === 'MANAGER' ? 'bg-amber-600/10' : 'bg-blue-600/10'}`}></div>
      <div className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 transition-colors duration-700 ${view === 'SUPER_ADMIN' ? 'bg-fuchsia-600/10' : view === 'MANAGER' ? 'bg-orange-600/10' : 'bg-emerald-600/10'}`}></div>

      <div className="z-10 text-center mb-10 animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Briefcase className="text-white w-6 h-6" />
            </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">نظام إدارة الموارد البشرية</h1>
        <p className="text-slate-400">منصة متكاملة لإدارة وتتبع المهام</p>
      </div>

      {view === 'SELECTION' ? renderSelection() : renderLoginForm()}

      <div className="z-10 mt-8 text-center">
        <p dir="ltr" className="text-xs font-black tracking-[0.22em] text-violet-300/80">NDR WORK</p>
        <p className="text-[10px] text-slate-500 mt-1">فكرة وتصميم وتطوير نادر</p>
        <p className="text-[9px] text-slate-700 mt-1">© 2026 جميع الحقوق محفوظة</p>
      </div>

    </div>
  );
};

export default Login;
