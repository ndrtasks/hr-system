import React, { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Building2, CheckCircle2, Crown, ListChecks, MessageCircle, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useTaskContext } from '../context/AppTaskContext';
import { getTaskAssigneeIds, isSuperAdminUser } from '../types';

const SuperAdminCenter = () => {
  const { currentUser, users, departments, tasks, communicationMessages } = useTaskContext();
  const superAdmin = isSuperAdminUser(currentUser);

  const insights = useMemo(() => {
    const completed = tasks.filter(task => task.status === 'COMPLETED').length;
    const late = tasks.filter(task => task.status === 'LATE' || (task.status !== 'COMPLETED' && new Date(task.dueDate).getTime() < Date.now())).length;
    const pending = tasks.filter(task => task.status === 'PENDING_REVIEW').length;
    const managers = users.filter(user => user.role === 'MANAGER' && !isSuperAdminUser(user));
    const employees = users.filter(user => user.role === 'EMPLOYEE');
    const unreadMessages = communicationMessages.filter(message => !message.readBy?.includes(currentUser?.id || '')).length;
    return { completed, late, pending, managers, employees, unreadMessages, completion: tasks.length ? Math.round((completed / tasks.length) * 100) : 0 };
  }, [tasks, users, communicationMessages, currentUser?.id]);

  const departmentStats = useMemo(() => departments.map(department => {
    const departmentTasks = tasks.filter(task => task.department === department.name);
    const done = departmentTasks.filter(task => task.status === 'COMPLETED').length;
    const late = departmentTasks.filter(task => task.status === 'LATE' || (task.status !== 'COMPLETED' && new Date(task.dueDate).getTime() < Date.now())).length;
    const manager = users.find(user => user.id === department.managerId) || users.find(user => user.role === 'MANAGER' && user.department === department.name);
    return {
      ...department,
      manager,
      employees: users.filter(user => user.role === 'EMPLOYEE' && user.department === department.name).length,
      total: departmentTasks.length,
      late,
      completion: departmentTasks.length ? Math.round((done / departmentTasks.length) * 100) : 0,
    };
  }), [departments, tasks, users]);

  const priorityTasks = useMemo(() => [...tasks]
    .filter(task => task.status !== 'COMPLETED')
    .sort((a, b) => {
      const aLate = a.status === 'LATE' || new Date(a.dueDate).getTime() < Date.now();
      const bLate = b.status === 'LATE' || new Date(b.dueDate).getTime() < Date.now();
      if (aLate !== bLate) return aLate ? -1 : 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }).slice(0, 6), [tasks]);

  if (!superAdmin) return <Navigate to="/" replace />;

  const cards = [
    { label: 'الأقسام', value: departments.length, icon: Building2, color: 'text-blue-400' },
    { label: 'مدراء الأقسام', value: insights.managers.length, icon: ShieldCheck, color: 'text-violet-400' },
    { label: 'الموظفون', value: insights.employees.length, icon: Users, color: 'text-cyan-400' },
    { label: 'إجمالي المهام', value: tasks.length, icon: ListChecks, color: 'text-indigo-400' },
    { label: 'مهام تحتاج تدخل', value: insights.late + insights.pending, icon: AlertTriangle, color: 'text-amber-400' },
    { label: 'الإنجاز العام', value: `${insights.completion}%`, icon: CheckCircle2, color: 'text-emerald-400' },
  ];

  return <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-7">
    <section className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-l from-slate-900 via-slate-900 to-violet-950/40 p-6 md:p-8">
      <div className="absolute -left-20 -top-20 w-64 h-64 rounded-full bg-violet-600/10 blur-3xl" />
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4"><div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-violet-600 flex items-center justify-center shadow-xl shadow-violet-950/40"><Crown className="text-white" size={28}/></div><div><p className="text-xs font-bold text-violet-300 mb-1">الصلاحية العليا للنظام</p><h1 className="text-2xl md:text-3xl font-black text-white">غرفة قيادة المدير العام</h1><p className="text-slate-400 mt-2 max-w-2xl">نظرة موحدة على جميع الأقسام والمهام والأداء، مع القدرة على المتابعة والتواصل واتخاذ القرار.</p></div></div>
        <div className="flex flex-wrap gap-2"><Link to="/communications" className="px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold flex items-center gap-2"><MessageCircle size={18}/> مركز التواصل {insights.unreadMessages > 0 && <span className="bg-red-500 px-2 py-0.5 rounded-full text-xs">{insights.unreadMessages}</span>}</Link><Link to="/tasks" className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center gap-2"><ListChecks size={18}/> جميع المهام</Link></div>
      </div>
    </section>

    <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      {cards.map(card => <div key={card.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4"><card.icon className={`${card.color} mb-4`} size={22}/><p className="text-2xl font-black text-white">{card.value}</p><p className="text-xs text-slate-500 mt-1">{card.label}</p></div>)}
    </section>

    <section className="grid xl:grid-cols-[1.45fr_1fr] gap-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between"><div><h2 className="font-black text-white flex items-center gap-2"><Building2 className="text-blue-400" size={20}/> أداء الأقسام</h2><p className="text-xs text-slate-500 mt-1">مقارنة حية لحجم الفريق والإنجاز والتعثر</p></div><Link to="/team" className="text-xs text-blue-400 hover:text-blue-300">إدارة الهيكل</Link></div>
        <div className="divide-y divide-slate-800">
          {!departmentStats.length && <p className="p-8 text-center text-slate-500">أنشئ أول قسم من صفحة الموظفين</p>}
          {departmentStats.map(department => <div key={department.id} className="p-4 hover:bg-slate-800/40 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h3 className="font-bold text-white">{department.name}</h3><p className="text-xs text-slate-500 mt-1">المدير: {department.manager?.name || 'لم يُعيّن'} • {department.employees} موظف • {department.total} مهمة</p></div><div className="flex items-center gap-4"><div className="text-left"><p className="text-lg font-black text-white">{department.completion}%</p><p className="text-[10px] text-slate-500">نسبة الإنجاز</p></div>{department.late > 0 && <span className="text-xs bg-red-500/10 border border-red-500/20 text-red-300 px-2.5 py-1.5 rounded-lg">{department.late} متعثرة</span>}</div></div>
            <div className="h-2 bg-slate-800 rounded-full mt-4 overflow-hidden"><div className="h-full bg-gradient-to-l from-blue-500 to-emerald-400 rounded-full" style={{ width: `${department.completion}%` }}/></div>
          </div>)}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800"><h2 className="font-black text-white flex items-center gap-2"><AlertTriangle className="text-amber-400" size={20}/> أولويات التدخل</h2><p className="text-xs text-slate-500 mt-1">المهام الأقرب للتأخر أو المتأخرة</p></div>
        <div className="divide-y divide-slate-800">
          {!priorityTasks.length && <div className="p-10 text-center"><CheckCircle2 className="mx-auto text-emerald-400 mb-2"/><p className="text-slate-400">لا توجد مهام حرجة</p></div>}
          {priorityTasks.map(task => <Link to="/tasks" key={task.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-800/50"><div className="min-w-0"><p className="text-sm font-bold text-white truncate">{task.title}</p><p className="text-[11px] text-slate-500 mt-1">{task.department} • {getTaskAssigneeIds(task).length} مشاركين</p></div><ArrowLeft size={16} className="text-slate-600 shrink-0"/></Link>)}
        </div>
      </div>
    </section>

    <section className="grid md:grid-cols-3 gap-4">
      <Link to="/communications" className="group bg-gradient-to-br from-violet-600/20 to-slate-900 border border-violet-500/20 rounded-2xl p-5"><MessageCircle className="text-violet-400 mb-4"/><h3 className="font-bold text-white">خاطب أي شخص أو مجموعة</h3><p className="text-xs leading-6 text-slate-400 mt-2">رسائل خاصة، مجموعات مخصصة أو تعميم لجميع العاملين.</p></Link>
      <Link to="/tasks" className="group bg-gradient-to-br from-blue-600/20 to-slate-900 border border-blue-500/20 rounded-2xl p-5"><ListChecks className="text-blue-400 mb-4"/><h3 className="font-bold text-white">ادخل في أي مهمة</h3><p className="text-xs leading-6 text-slate-400 mt-2">متابعة وتعليق وتعديل كامل للمهام في جميع الأقسام.</p></Link>
      <button onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="فتح NDR AI"]')?.click()} className="text-right bg-gradient-to-br from-fuchsia-600/20 to-slate-900 border border-fuchsia-500/20 rounded-2xl p-5"><Sparkles className="text-fuchsia-400 mb-4"/><h3 className="font-bold text-white">تحليل NDR AI التنفيذي</h3><p className="text-xs leading-6 text-slate-400 mt-2">تحليل شامل للأقسام والمخاطر واقتراح القرارات الإدارية.</p></button>
    </section>
  </div>;
};

export default SuperAdminCenter;
