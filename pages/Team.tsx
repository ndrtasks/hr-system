
import React, { useState } from 'react';
import { useTaskContext } from '../context/AppTaskContext';
import { Mail, Briefcase, Plus, X, Edit2, Trash2, User as UserIcon, ShieldCheck, CheckCircle, AlertCircle, Clock, KeyRound, Send, ExternalLink, FileText, ArrowRightLeft, Calendar } from 'lucide-react';
import { User, Role, Task, Department, getTaskAssigneeIds, getParticipantStatus, isSuperAdminUser } from '../types';
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS } from '../constants';

const Team = () => {
  const { users, departments, currentUser, addUser, updateUser, deleteUser, tasks, recoverPassword } = useTaskContext();
  const isSuperAdmin = isSuperAdminUser(currentUser);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [historyUser, setHistoryUser] = useState<User | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const visibleUsers = [...users]
    .filter(user => departmentFilter === 'ALL' || user.department === departmentFilter)
    .sort((a, b) => a.department.localeCompare(b.department, 'ar') || (a.role === b.role ? a.name.localeCompare(b.name, 'ar') : a.role === 'MANAGER' ? -1 : 1));

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleHistoryClick = (user: User) => {
      setHistoryUser(user);
      setIsHistoryOpen(true);
  };

  const handleDeleteClick = (userId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء.')) {
        deleteUser(userId);
    }
  };

  const handleAddNew = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (u: User) => {
    if (editingUser) {
      const result = await updateUser(u);
      if (!result.success) {
        alert(result.message);
        return;
      }
    } else {
      const result = await addUser(u);
      if (!result.success) {
        alert(result.message || 'تعذر إنشاء حساب الموظف');
        return;
      }
    }

    setIsModalOpen(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleResetPassword = async (email: string) => {
      if (window.confirm(`سيتم إرسال رابط رسمي من Google إلى ${email} لتعيين كلمة مرور جديدة.\n\nهل تريد المتابعة؟`)) {
          const result = await recoverPassword(email);
          alert(result.message);
      }
  };

  const getUserStats = (userId: string) => {
    const userTasks = tasks.filter(t => getTaskAssigneeIds(t).includes(userId));
    const total = userTasks.length;
    
    // Calculate completed based on system status OR transfer history
    const completedTasksList = tasks.filter(t => {
        const isCurrentOwnerCompleted = getTaskAssigneeIds(t).includes(userId) && getParticipantStatus(t, userId) === 'COMPLETED';
        const isTransferredFromMe = t.previousAssignees?.includes(userId) && t.assigneeId !== userId;
        return isCurrentOwnerCompleted || isTransferredFromMe;
    });

    const completed = completedTasksList.length;
    const late = userTasks.filter(t => t.status === 'LATE').length;
    const inProgress = userTasks.filter(t => ['IN_PROGRESS', 'PENDING_REVIEW'].includes(t.status)).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, late, inProgress, rate };
  };

  return (
    <div className="p-8 max-w-7xl mx-auto relative">
      {showSuccessToast && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50">
              <CheckCircle size={20} />
              <span className="font-bold">تم حفظ بيانات الموظف بنجاح</span>
          </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-2xl font-bold text-white mb-2">فريق العمل</h1>
            <p className="text-slate-400 text-sm">إدارة أعضاء الفريق ومتابعة الأداء</p>
        </div>
        {currentUser?.role === 'MANAGER' && (
            <button 
                onClick={handleAddNew}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
            >
                <Plus size={18} />
                <span>{isSuperAdmin ? 'إضافة مدير أو موظف' : 'إضافة موظف'}</span>
            </button>
        )}
      </div>

      {isSuperAdmin && <div className="mb-6 bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3"><span className="text-xs text-slate-400">عرض الهيكل حسب القسم</span><select value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none"><option value="ALL">جميع الأقسام</option>{departments.map(department => <option key={department.id} value={department.name}>{department.name}</option>)}</select><span className="text-[11px] text-slate-500 sm:mr-auto">يظهر مدير كل قسم أولًا ثم موظفوه</span></div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleUsers.map((user) => {
          const stats = getUserStats(user.id);
          return (
            <div key={user.id} className="bg-slate-800 rounded-xl p-0 border border-slate-700 group relative hover:border-slate-500 transition-all overflow-hidden flex flex-col">
                <div className="p-6 pb-4 flex flex-col items-center text-center relative">
                    {currentUser?.role === 'MANAGER' && (
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            {user.role === 'EMPLOYEE' && (
                                <button 
                                    onClick={() => handleHistoryClick(user)} 
                                    className="p-1.5 bg-slate-700 text-emerald-400 rounded-lg hover:bg-slate-600"
                                    title="سجل المهام المنجزة"
                                >
                                    <FileText size={14} />
                                </button>
                            )}
                            <button onClick={() => handleEditClick(user)} className="p-1.5 bg-slate-700 text-blue-400 rounded-lg hover:bg-slate-600" title="تعديل">
                                <Edit2 size={14} />
                            </button>
                            {user.id !== currentUser.id && (
                                <button onClick={() => handleDeleteClick(user.id)} className="p-1.5 bg-slate-700 text-red-400 rounded-lg hover:bg-slate-600" title="حذف">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    )}

                    <div className="w-20 h-20 rounded-full border-4 border-slate-700 mb-3 overflow-hidden bg-slate-900 shadow-xl">
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    </div>
                    
                    <h3 className="text-lg font-bold text-white mb-1">{user.name}</h3>
                    <p className="text-xs text-slate-400 mb-2">{user.jobTitle || (user.role === 'MANAGER' ? `مدير ${user.department}` : 'موظف')}</p>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-blue-400 font-medium bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                            {user.department}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${user.role === 'MANAGER' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-slate-700/50 text-slate-400 border-slate-600'}`}>
                            {isSuperAdminUser(user) ? 'المدير العام' : user.role === 'MANAGER' ? 'مدير قسم' : 'موظف'}
                        </span>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center justify-center gap-1 bg-slate-900/50 px-3 py-1 rounded-full w-full max-w-[200px]">
                        <Mail size={12} />
                        <span className="truncate">{user.email}</span>
                    </div>
                </div>

                {user.role === 'EMPLOYEE' && (
                    <div className="px-6 py-4 bg-slate-900/30 border-t border-slate-700/50 flex-1">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs text-slate-400 font-medium">نسبة الإنجاز</span>
                            <span className={`text-sm font-bold ${stats.rate >= 80 ? 'text-emerald-400' : stats.rate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {stats.rate}%
                            </span>
                        </div>
                        <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mb-4">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${stats.rate >= 80 ? 'bg-emerald-500' : stats.rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                style={{ width: `${stats.rate}%` }}
                            ></div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-800/80 p-2 rounded-lg text-center border border-slate-700/50">
                                <CheckCircle size={14} className="text-emerald-500 mx-auto mb-1" />
                                <span className="block text-white font-bold text-sm">{stats.completed}</span>
                                <span className="text-[10px] text-slate-500">مكتملة</span>
                            </div>
                            <div className="bg-slate-800/80 p-2 rounded-lg text-center border border-slate-700/50">
                                <Clock size={14} className="text-blue-500 mx-auto mb-1" />
                                <span className="block text-white font-bold text-sm">{stats.inProgress}</span>
                                <span className="text-[10px] text-slate-500">جارية</span>
                            </div>
                            <div className="bg-slate-800/80 p-2 rounded-lg text-center border border-slate-700/50">
                                <AlertCircle size={14} className="text-red-500 mx-auto mb-1" />
                                <span className="block text-white font-bold text-sm">{stats.late}</span>
                                <span className="text-[10px] text-slate-500">متأخرة</span>
                            </div>
                        </div>
                    </div>
                )}
                
                {user.role === 'MANAGER' && (
                    <div className="px-6 py-4 bg-slate-900/30 border-t border-slate-700/50 flex-1 flex items-center justify-center text-slate-500 text-xs italic">
                        {isSuperAdminUser(user) ? 'المدير العام - جميع الأقسام' : `مدير قسم ${user.department}`}
                    </div>
                )}

            </div>
          );
        })}
      </div>

      {isModalOpen && (
          <UserFormModal 
            user={editingUser} 
            onClose={() => setIsModalOpen(false)} 
            onSave={handleSaveUser} 
            onResetPassword={handleResetPassword}
            currentUser={currentUser!}
            departments={departments}
          />
      )}

      {isHistoryOpen && historyUser && (
          <UserHistoryModal 
            user={historyUser} 
            tasks={tasks}
            onClose={() => setIsHistoryOpen(false)}
          />
      )}
    </div>
  );
};

interface UserFormModalProps {
    user: User | null;
    onClose: () => void;
    onSave: (user: User) => Promise<void>;
    onResetPassword?: (email: string) => void;
    currentUser: User;
    departments: Department[];
}

const UserFormModal: React.FC<UserFormModalProps> = ({ user, onClose, onSave, onResetPassword, currentUser, departments }) => {
    const isSuperAdmin = isSuperAdminUser(currentUser);
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [department, setDepartment] = useState(user?.department || (isSuperAdmin ? departments[0]?.name || '' : currentUser.department));
    const [role, setRole] = useState<Role>(isSuperAdmin ? user?.role || 'EMPLOYEE' : 'EMPLOYEE');
    const [avatar, setAvatar] = useState(user?.avatar || `https://i.pravatar.cc/150?u=${Date.now()}`);
    const [password, setPassword] = useState('');
    const [jobTitle, setJobTitle] = useState(user?.jobTitle || (role === 'MANAGER' ? `مدير ${department}` : ''));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const userData: User = {
            id: user?.id || `u_${Date.now()}`,
            name,
            email,
            department,
            role: isSuperAdmin ? role : 'EMPLOYEE',
            accessLevel: isSuperAdmin && role === 'MANAGER' ? 'DEPARTMENT_MANAGER' : undefined,
            avatar,
            jobTitle: jobTitle.trim(),
            departmentId: isSuperAdmin ? departments.find(item => item.name === department)?.id || user?.departmentId : currentUser.departmentId,
            // Only include password if it's a new user
            ...(password ? { password } : {})
        };
        await onSave(userData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-800 overflow-hidden animate-fade-in">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white">
                        {user ? 'تعديل بيانات الحساب' : isSuperAdmin ? 'إضافة مدير قسم أو موظف' : 'إضافة موظف جديد'}
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">الاسم الكامل</label>
                        <input 
                            type="text" required value={name} onChange={e => setName(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="مثال: محمد علي"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">البريد الإلكتروني</label>
                        <input 
                            type="email" required value={email} onChange={e => setEmail(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="employee@company.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">المسمى الوظيفي</label>
                        <input type="text" required value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder={role === 'MANAGER' ? 'مثال: مدير إدارة الموارد البشرية' : 'مثال: أخصائي موارد بشرية'} />
                    </div>

                    {!user ? (
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">كلمة المرور (للدخول الأول)</label>
                            <input 
                                type="text" 
                                required
                                value={password} onChange={e => setPassword(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                placeholder="مثال: 123456"
                            />
                        </div>
                    ) : (
                        onResetPassword && (
                            <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                                        <KeyRound size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-white mb-1">إعادة تعيين كلمة المرور</h4>
                                        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                                            لأسباب أمنية، لا يمكن تغيير كلمة المرور مباشرة من هنا.
                                            <br/>
                                            <span className="text-amber-400">• الخيار 1:</span> إرسال رابط رسمي للموظف ليغيرها بنفسه.
                                            <br/>
                                            <span className="text-amber-400">• الخيار 2:</span> تغييرها يدوياً (إجبارياً) من لوحة تحكم Firebase.
                                        </p>
                                        
                                        <button 
                                            type="button"
                                            onClick={() => onResetPassword(user.email)}
                                            className="w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors mb-2"
                                        >
                                            <Send size={14} />
                                            إرسال رابط التعيين (الخيار 1)
                                        </button>
                                        
                                        <a 
                                            href="https://console.firebase.google.com/" 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <ExternalLink size={14} />
                                            الذهاب لـ Firebase (الخيار 2)
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">القسم / الإدارة</label>
                            <select required value={department} onChange={e => setDepartment(e.target.value)} disabled={!isSuperAdmin}
                                className="w-full bg-slate-800 disabled:opacity-70 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none">
                                {!departments.length && <option value="">أنشئ قسمًا من الإعدادات أولًا</option>}
                                {departments.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
                            </select>
                            {!isSuperAdmin && <p className="text-[10px] text-emerald-400 mt-1.5">سيُربط الموظف تلقائيًا بقسمك</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">الصلاحية</label>
                            <select disabled={!isSuperAdmin}
                                value={role} onChange={e => setRole(e.target.value as Role)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            >
                                <option value="EMPLOYEE">موظف</option>
                                {isSuperAdmin && <option value="MANAGER">مدير قسم</option>}
                            </select>
                        </div>
                    </div>

                     <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">رابط الصورة الرمزية</label>
                        <div className="flex gap-2">
                             <input 
                                type="text" value={avatar} onChange={e => setAvatar(e.target.value)}
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none text-xs"
                            />
                            <img src={avatar} alt="preview" className="w-10 h-10 rounded-lg bg-slate-700 object-cover" onError={(e) => (e.currentTarget.src = 'https://i.pravatar.cc/150')} />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg mt-4 transition-all"
                    >
                        {user ? 'حفظ التغييرات' : 'إضافة للفريق'}
                    </button>
                </form>
            </div>
        </div>
    );
};

interface UserHistoryModalProps {
    user: User;
    tasks: Task[];
    onClose: () => void;
}

const UserHistoryModal: React.FC<UserHistoryModalProps> = ({ user, tasks, onClose }) => {
    // Filter tasks that are COMPLETED by this user OR Transferred FROM this user
    const historyTasks = tasks.filter(t => {
        const isCurrentOwnerCompleted = getTaskAssigneeIds(t).includes(user.id) && getParticipantStatus(t, user.id) === 'COMPLETED';
        const isTransferredFromMe = t.previousAssignees?.includes(user.id) && t.assigneeId !== user.id;
        return isCurrentOwnerCompleted || isTransferredFromMe;
    }).sort((a, b) => new Date(b.lastUpdated || b.dueDate).getTime() - new Date(a.lastUpdated || a.dueDate).getTime());

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-800 overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-slate-700" alt={user.name} />
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                سجل إنجازات: {user.name}
                            </h2>
                            <p className="text-xs text-slate-400">عدد المهام المنجزة: {historyTasks.length}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {historyTasks.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <FileText size={40} className="mx-auto mb-3 opacity-20" />
                            <p>لا يوجد سجل مهام منجزة لهذا الموظف حتى الآن</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {historyTasks.map(task => {
                                const isTransferred = Boolean(task.previousAssignees?.includes(user.id) && !getTaskAssigneeIds(task).includes(user.id));
                                return (
                                    <div key={task.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-start gap-4 hover:border-slate-600 transition-colors">
                                        <div className={`mt-1 p-2 rounded-lg ${isTransferred ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {isTransferred ? <ArrowRightLeft size={18} /> : <CheckCircle size={18} />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="text-sm font-bold text-white">{task.title}</h4>
                                                <span className={`text-[10px] px-2 py-0.5 rounded border ${isTransferred ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-blue-900/30 text-blue-400 border-blue-800'}`}>
                                                    {isTransferred ? 'تم النقل (محتسبة)' : 'إنجاز مكتمل'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 line-clamp-1 mb-2">{task.description}</p>
                                            <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={10} />
                                                    تاريخ الاستحقاق: {task.dueDate}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[task.priority]}`}>
                                                    {task.priority}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t border-slate-800 bg-slate-900 text-center">
                    <button onClick={onClose} className="text-sm text-slate-400 hover:text-white transition-colors">
                        إغلاق السجل
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Team;
