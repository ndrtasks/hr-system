
import React, { useState } from 'react';
import { useTaskContext } from '../context/AppTaskContext';
import { Settings as SettingsIcon, Bell, Mail, Shield, Building, Save, Users, Eye, CheckCircle, KeyRound, EyeOff, Loader2, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { isSuperAdminUser, User } from '../types';
import type { CleanupCounts } from '../context/AppTaskContext';

const SettingsPage = () => {
  const { currentUser, departments, users, simulateEmail, showLeaderboard, toggleLeaderboardVisibility, changePassword, cleanupTestData, addDepartment, updateDepartment, deleteDepartment, addUser } = useTaskContext();
  const isSuperAdmin = isSuperAdminUser(currentUser);
  
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
  const [departmentName, setDepartmentName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerJobTitle, setManagerJobTitle] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [departmentMessage, setDepartmentMessage] = useState('');
  const [departmentLoading, setDepartmentLoading] = useState(false);
  const [cleanupCounts, setCleanupCounts] = useState<CleanupCounts | null>(null);
  const [cleanupConfirmation, setCleanupConfirmation] = useState('');
  const [cleanupAcknowledged, setCleanupAcknowledged] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState('');

  const handleCleanupPreview = async () => {
      setCleanupLoading(true);
      setCleanupMessage('');
      const result = await cleanupTestData('preview');
      setCleanupLoading(false);
      if (result.success && result.counts) setCleanupCounts(result.counts);
      else setCleanupMessage(result.message || 'تعذرت معاينة البيانات.');
  };

  const handleCleanupExecute = async () => {
      if (!cleanupAcknowledged || cleanupConfirmation !== 'حذف بيانات التجربة') return;
      setCleanupLoading(true);
      setCleanupMessage('');
      const result = await cleanupTestData('execute', cleanupConfirmation);
      setCleanupLoading(false);
      setCleanupMessage(result.message || (result.success ? 'تم التنظيف بنجاح.' : 'تعذر التنظيف.'));
      if (result.success) {
          setCleanupCounts(null);
          setCleanupConfirmation('');
          setCleanupAcknowledged(false);
      }
  };

  const handleAddDepartment = async () => {
      if (![departmentName, managerName, managerJobTitle, managerEmail, managerPassword].every(value => value.trim())) {
          setDepartmentMessage('أكمل بيانات القسم ومديره أولًا.');
          return;
      }
      setDepartmentLoading(true);
      const result = await addDepartment(departmentName);
      if (!result.success || !result.departmentId) {
          setDepartmentLoading(false);
          setDepartmentMessage(result.message);
          return;
      }
      const manager: User = {
          id: `manager_${Date.now()}`,
          name: managerName.trim(),
          email: managerEmail.trim(),
          password: managerPassword,
          role: 'MANAGER',
          accessLevel: 'DEPARTMENT_MANAGER',
          avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(managerEmail.trim())}`,
          department: departmentName.trim(),
          departmentId: result.departmentId,
          jobTitle: managerJobTitle.trim()
      };
      const managerResult = await addUser(manager);
      setDepartmentLoading(false);
      if (!managerResult.success) {
          setDepartmentMessage(`تم إنشاء القسم، لكن تعذر إنشاء حساب المدير: ${managerResult.message}`);
          return;
      }
      setDepartmentMessage('تم إنشاء القسم وربط مدير القسم به بنجاح.');
      setDepartmentName('');
      setManagerName('');
      setManagerJobTitle('');
      setManagerEmail('');
      setManagerPassword('');
  };

  const handleRenameDepartment = async (id: string, oldName: string) => {
      const name = window.prompt('اكتب الاسم الجديد للقسم', oldName);
      if (!name || name.trim() === oldName) return;
      const result = await updateDepartment(id, name);
      setDepartmentMessage(result.message);
  };

  const handleDeleteDepartment = async (id: string, name: string) => {
      if (!window.confirm(`هل تريد حذف قسم «${name}»؟`)) return;
      const result = await deleteDepartment(id);
      setDepartmentMessage(result.message);
  };

  const handleSave = () => {
      toggleLeaderboardVisibility(localShowLeaderboard);
      if (currentUser) simulateEmail(currentUser.email, 'تم تحديث إعدادات النظام');
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

          {isSuperAdmin && <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Building size={20} className="text-emerald-500" />
                  الأقسام
              </h2>
              <p className="text-sm text-slate-400 mb-4">أنشئ القسم وحساب مديره في خطوة واحدة. كل موظف يضيفه مدير القسم سيُربط تلقائيًا بهذا القسم.</p>
              <div className="grid md:grid-cols-2 gap-3 mb-4 bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                  <div><label className="block text-xs text-slate-400 mb-1.5">اسم القسم</label><input value={departmentName} onChange={event => setDepartmentName(event.target.value)} placeholder="مثال: إدارة التسويق" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 outline-none" /></div>
                  <div><label className="block text-xs text-slate-400 mb-1.5">اسم مدير القسم</label><input value={managerName} onChange={event => setManagerName(event.target.value)} placeholder="الاسم الكامل" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 outline-none" /></div>
                  <div><label className="block text-xs text-slate-400 mb-1.5">مسمى مدير القسم</label><input value={managerJobTitle} onChange={event => setManagerJobTitle(event.target.value)} placeholder="مثال: مدير إدارة التسويق" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 outline-none" /></div>
                  <div><label className="block text-xs text-slate-400 mb-1.5">بريد مدير القسم</label><input type="email" value={managerEmail} onChange={event => setManagerEmail(event.target.value)} placeholder="manager@company.com" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 outline-none" /></div>
                  <div className="md:col-span-2"><label className="block text-xs text-slate-400 mb-1.5">كلمة المرور للدخول الأول</label><input type="text" minLength={6} value={managerPassword} onChange={event => setManagerPassword(event.target.value)} placeholder="6 أحرف أو أرقام على الأقل" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 outline-none" /></div>
                  <button onClick={handleAddDepartment} disabled={departmentLoading} className="md:col-span-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-bold">
                      {departmentLoading ? <Loader2 size={18} className="animate-spin"/> : <Plus size={18}/>} إنشاء القسم وحساب مديره
                  </button>
              </div>
              <div className="space-y-2">
                  {!departments.length && <div className="text-center py-6 rounded-lg border border-dashed border-slate-700 text-sm text-slate-500">لا توجد أقسام مسجلة بعد</div>}
                  {departments.map(department => {
                      const manager = users.find(user => user.id === department.managerId) || users.find(user => user.role === 'MANAGER' && user.department === department.name && !isSuperAdminUser(user));
                      return (
                      <div key={department.id} className="flex items-center justify-between bg-slate-900/70 border border-slate-700 px-4 py-3 rounded-lg">
                          <div><span className="text-sm text-white font-medium">{department.name}</span><p className="text-xs text-slate-500 mt-1">{manager?.name || department.managerName || 'دون مدير'}{(manager?.jobTitle || department.managerJobTitle) ? ` • ${manager?.jobTitle || department.managerJobTitle}` : ''}</p></div>
                          <div className="flex gap-2">
                              <button onClick={() => handleRenameDepartment(department.id, department.name)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg" title="تعديل"><Pencil size={16}/></button>
                              <button onClick={() => handleDeleteDepartment(department.id, department.name)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg" title="حذف"><Trash2 size={16}/></button>
                          </div>
                      </div>
                  )})}
              </div>
              {departmentMessage && <p className="text-sm text-slate-300 mt-3">{departmentMessage}</p>}
          </div>}

          {isSuperAdmin && <div className="bg-red-950/20 rounded-xl p-6 border border-red-900/60">
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2"><AlertTriangle size={20} className="text-red-400" />تنظيف بيانات التجربة</h2>
              <p className="text-sm text-slate-400 mb-4">يحذف جميع الحسابات عدا المدير العام، وكل المهام والإشعارات والمحادثات التجريبية. تبقى الأقسام وإعدادات النظام، وتُفرغ خانات مديري الأقسام لتعيين المديرين الحقيقيين لاحقًا.</p>
              {!cleanupCounts ? (
                  <button onClick={handleCleanupPreview} disabled={cleanupLoading} className="border border-red-700 text-red-300 hover:bg-red-500/10 disabled:opacity-50 px-5 py-2.5 rounded-lg font-bold flex items-center gap-2">
                      {cleanupLoading ? <Loader2 size={18} className="animate-spin"/> : <Eye size={18}/>} معاينة ما سيُحذف
                  </button>
              ) : <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-center">
                      {[
                          ['الحسابات', cleanupCounts.users], ['المهام', cleanupCounts.tasks], ['الإشعارات', cleanupCounts.notifications],
                          ['المحادثات', cleanupCounts.conversations], ['الرسائل', cleanupCounts.messages], ['الأقسام الباقية', cleanupCounts.departmentsRetained]
                      ].map(([label, count]) => <div key={String(label)} className="bg-slate-900/70 border border-slate-700 rounded-lg p-3"><div className="text-xl font-bold text-white">{count}</div><div className="text-xs text-slate-400">{label}</div></div>)}
                  </div>
                  <label className="flex items-start gap-2 text-sm text-slate-300"><input type="checkbox" checked={cleanupAcknowledged} onChange={event => setCleanupAcknowledged(event.target.checked)} className="mt-1"/><span>أفهم أن هذا الإجراء نهائي ولا يمكن استرجاع البيانات المحذوفة.</span></label>
                  <div><label className="block text-xs text-slate-400 mb-1.5">للتأكيد اكتب: <span className="text-red-300 font-bold">حذف بيانات التجربة</span></label><input value={cleanupConfirmation} onChange={event => setCleanupConfirmation(event.target.value)} className="w-full bg-slate-900 border border-red-900 rounded-lg px-4 py-2.5 text-white outline-none focus:border-red-500" /></div>
                  <div className="flex flex-wrap gap-2">
                      <button onClick={handleCleanupExecute} disabled={cleanupLoading || !cleanupAcknowledged || cleanupConfirmation !== 'حذف بيانات التجربة'} className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2">{cleanupLoading ? <Loader2 size={18} className="animate-spin"/> : <Trash2 size={18}/>} حذف بيانات التجربة نهائيًا</button>
                      <button onClick={() => { setCleanupCounts(null); setCleanupConfirmation(''); setCleanupAcknowledged(false); }} disabled={cleanupLoading} className="px-5 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700">إلغاء</button>
                  </div>
              </div>}
              {cleanupMessage && <p className="text-sm text-slate-300 mt-3">{cleanupMessage}</p>}
          </div>}

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
