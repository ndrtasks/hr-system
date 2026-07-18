
import React, { useState } from 'react';
import { useTaskContext } from '../context/AppTaskContext';
import { Settings as SettingsIcon, Bell, Mail, Shield, Building, Save, Users, Eye, CheckCircle, KeyRound, EyeOff, Loader2 } from 'lucide-react';

const SettingsPage = () => {
  const { currentUser, simulateEmail, showLeaderboard, toggleLeaderboardVisibility, changePassword } = useTaskContext();
  
  const [systemName, setSystemName] = useState('نظام إدارة المهام');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [soundNotifs, setSoundNotifs] = useState(true);
  const [autoDeadline, setAutoDeadline] = useState(3);
  const [localShowLeaderboard, setLocalShowLeaderboard] = useState(showLeaderboard);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = () => {
      toggleLeaderboardVisibility(localShowLeaderboard);
      simulateEmail(currentUser.email, 'تم تحديث إعدادات النظام');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleChangePassword = async (event: React.FormEvent) => {
      event.preventDefault();
      setPasswordMessage(null);
      if (newPassword !== confirmPassword) {
          setPasswordMessage({ type: 'error', text: 'تأكيد كلمة المرور الجديدة غير مطابق.' });
          return;
      }
      setPasswordLoading(true);
      const result = await changePassword(currentPassword, newPassword);
      setPasswordLoading(false);
      setPasswordMessage({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
      }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 relative">
      {showSuccessToast && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50">
              <CheckCircle size={20} />
              <span className="font-bold">تم حفظ التغييرات بنجاح</span>
          </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white mb-2">{currentUser?.role === 'MANAGER' ? 'إعدادات النظام والحساب' : 'إعدادات الحساب'}</h1>
        <p className="text-slate-400 text-sm">إدارة أمان حسابك{currentUser?.role === 'MANAGER' ? ' وخيارات النظام' : ''}</p>
      </div>

      <div className="grid gap-8">
          <form onSubmit={handleChangePassword} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2"><KeyRound size={20} className="text-emerald-400" />تغيير كلمة المرور</h2>
                  <button type="button" onClick={() => setShowPasswords(value => !value)} className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5">{showPasswords ? <EyeOff size={16}/> : <Eye size={16}/>} {showPasswords ? 'إخفاء' : 'إظهار'}</button>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                  <div><label className="block text-sm text-slate-400 mb-2">كلمة المرور الحالية</label><input required type={showPasswords ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 outline-none" /></div>
                  <div><label className="block text-sm text-slate-400 mb-2">كلمة المرور الجديدة</label><input required minLength={8} type={showPasswords ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 outline-none" /></div>
                  <div><label className="block text-sm text-slate-400 mb-2">تأكيد كلمة المرور</label><input required minLength={8} type={showPasswords ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 outline-none" /></div>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className={`text-sm ${passwordMessage?.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{passwordMessage?.text || 'استخدم 8 أحرف على الأقل، ويفضل الجمع بين الحروف والأرقام.'}</p>
                  <button disabled={passwordLoading} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2">{passwordLoading ? <Loader2 size={18} className="animate-spin"/> : <KeyRound size={18}/>} تحديث كلمة المرور</button>
              </div>
          </form>

          {currentUser?.role === 'MANAGER' && <>
          
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Shield size={20} className="text-blue-500" />
                  إعدادات عامة
              </h2>
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm text-slate-400 mb-2">اسم النظام</label>
                      <input 
                        type="text" 
                        value={systemName}
                        onChange={(e) => setSystemName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none transition-colors" 
                      />
                  </div>
                   <div>
                      <label className="block text-sm text-slate-400 mb-2">المدة الافتراضية للمهام (أيام)</label>
                      <input 
                        type="number" 
                        value={autoDeadline}
                        onChange={(e) => setAutoDeadline(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none transition-colors" 
                      />
                  </div>
              </div>
          </div>
          
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Eye size={20} className="text-purple-500" />
                   إعدادات العرض
              </h2>
              <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                      <div className="flex items-center gap-3">
                          <Users size={18} className="text-slate-400" />
                          <div>
                              <p className="text-white text-sm">إظهار لوحة أفضل المنجزين</p>
                              <p className="text-xs text-slate-500">السماح للموظفين برؤية إحصائيات زملائهم</p>
                          </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={localShowLeaderboard} 
                            onChange={(e) => setLocalShowLeaderboard(e.target.checked)} 
                            className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                  </div>
              </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Bell size={20} className="text-orange-500" />
                  التنبيهات
              </h2>
              <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                      <div className="flex items-center gap-3">
                          <Mail size={18} className="text-slate-400" />
                          <div>
                              <p className="text-white text-sm">إشعارات البريد الإلكتروني</p>
                              <p className="text-xs text-slate-500">إرسال بريد عند إنشاء مهمة جديدة</p>
                          </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={emailNotifs} onChange={(e) => setEmailNotifs(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                      <div className="flex items-center gap-3">
                          <SettingsIcon size={18} className="text-slate-400" />
                          <div>
                              <p className="text-white text-sm">الأصوات</p>
                              <p className="text-xs text-slate-500">تشغيل صوت عند وصول إشعار جديد</p>
                          </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={soundNotifs} onChange={(e) => setSoundNotifs(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                  </div>
              </div>
          </div>

           <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Building size={20} className="text-emerald-500" />
                  الأقسام
              </h2>
              <div className="flex flex-wrap gap-2">
                  {['الموارد البشرية', 'التصميم', 'التطوير', 'المبيعات', 'الإدارة العامة'].map(dept => (
                      <span key={dept} className="bg-slate-900 border border-slate-600 px-3 py-1 rounded-full text-sm text-slate-300 cursor-default hover:border-slate-500 transition-colors">
                          {dept}
                      </span>
                  ))}
                  <button className="px-3 py-1 rounded-full text-sm text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 transition-colors">
                      + إضافة قسم
                  </button>
              </div>
          </div>

          <div className="flex justify-end pt-4">
              <button 
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95"
              >
                  <Save size={20} />
                  حفظ التغييرات
              </button>
          </div>
          </>}
      </div>
    </div>
  );
};

export default SettingsPage;
