
import React from 'react';
import { useTaskContext } from '../context/AppTaskContext';
import { CheckCircle, Clock, AlertCircle, TrendingUp, Users, Activity, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { STATUS_COLORS, PRIORITY_COLORS } from '../constants';
import { getTaskAssigneeIds, getParticipantStatus } from '../types';

const Dashboard = () => {
  const { tasks, currentUser, users, showLeaderboard } = useTaskContext();

  const relevantTasks = tasks.filter(task => {
    if (currentUser?.role === 'MANAGER') return true;
    return getTaskAssigneeIds(task).includes(currentUser?.id || '') || task.previousAssignees?.includes(currentUser?.id || '');
  });

  // ✅ تصحيح منطق الحساب للبطاقات العلوية
  const calculateStats = () => {
      let completedCount = 0;
      let inProgressCount = 0;
      let pendingCount = 0;
      let lateCount = 0;

      relevantTasks.forEach(t => {
          // للمدير: احسب الحالة الفعلية فقط
          if (currentUser?.role === 'MANAGER') {
              if (t.status === 'COMPLETED') completedCount++;
              else if (t.status === 'IN_PROGRESS') inProgressCount++;
              else if (t.status === 'PENDING_REVIEW') pendingCount++;
              else if (t.status === 'LATE') lateCount++;
          } 
          // للموظف: احسب المهام المنقولة منه كمكتملة
          else {
              const isTransferredFromMe = t.previousAssignees?.includes(currentUser?.id || '') && t.assigneeId !== currentUser?.id;
              const myStatus = getParticipantStatus(t, currentUser?.id || '');

              if (myStatus === 'COMPLETED' || isTransferredFromMe) {
                  completedCount++;
              } else if (myStatus === 'PENDING_APPROVAL') {
                  pendingCount++;
              } else if (t.status === 'IN_PROGRESS') {
                  inProgressCount++;
              } else if (t.status === 'PENDING_REVIEW') {
                  pendingCount++;
              } else if (t.status === 'LATE') {
                  lateCount++;
              }
          }
      });

      return {
          total: relevantTasks.length,
          completed: completedCount,
          inProgress: inProgressCount,
          pending: pendingCount,
          late: lateCount
      };
  };

  const stats = calculateStats();

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const chartData = [
    { name: 'مكتملة', value: stats.completed, color: '#10b981' },
    { name: 'جارية', value: stats.inProgress, color: '#6366f1' },
    { name: 'مراجعة', value: stats.pending, color: '#f97316' },
    { name: 'متأخرة', value: stats.late, color: '#ef4444' },
  ];

  const employeeStats = users
    .filter(u => u.role === 'EMPLOYEE')
    .map(user => {
        const userTasks = tasks.filter(t => getTaskAssigneeIds(t).includes(user.id) || t.previousAssignees?.includes(user.id));
        
        const userCompleted = userTasks.filter(t => {
            const isCompletedSystem = getParticipantStatus(t, user.id) === 'COMPLETED';
            const isTransferredFromMe = t.previousAssignees?.includes(user.id) && t.assigneeId !== user.id;
            return isCompletedSystem || isTransferredFromMe;
        }).length;
        
        const userLate = userTasks.filter(t => t.status === 'LATE' && getTaskAssigneeIds(t).includes(user.id)).length;
        
        const userTotal = userTasks.length;
        const rate = userTotal > 0 ? Math.round((userCompleted / userTotal) * 100) : 0;
        
        return { ...user, totalTasks: userTotal, completedTasks: userCompleted, lateTasks: userLate, rate };
    })
    .sort((a, b) => b.rate - a.rate);

  const recentTasks = [...relevantTasks].sort((a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()).slice(0, 5);
  const shouldShowLeaderboard = currentUser?.role === 'MANAGER' || showLeaderboard;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">
          {currentUser?.role === 'MANAGER' ? 'نظرة عامة على النظام' : 'لوحة المعلومات'}
        </h1>
        <p className="text-slate-400 text-sm">مرحباً {currentUser?.name}، إليك ملخص الأداء اليوم.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي المهام" value={stats.total} icon={Clock} color="text-blue-500" bg="bg-blue-500/10" />
        <StatCard title="نسبة الإنجاز العام" value={`${completionRate}%`} icon={TrendingUp} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard title="بانتظار الاعتماد" value={stats.pending} icon={AlertCircle} color="text-orange-400" bg="bg-orange-500/10" />
        <StatCard title="المهام المكتملة" value={stats.completed} icon={CheckCircle} color="text-indigo-400" bg="bg-indigo-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`${shouldShowLeaderboard ? 'lg:col-span-2' : 'lg:col-span-3'} bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm transition-all duration-300`}>
            <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                <BarChart2 size={20} className="text-blue-400" />
                تحليل حالة المهام
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
        </div>

        {shouldShowLeaderboard && (
            <div className="bg-slate-800 p-0 rounded-2xl border border-slate-700 shadow-sm overflow-hidden flex flex-col animate-fade-in">
                 <div className="p-6 border-b border-slate-700">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Users size={20} className="text-purple-400" />
                        أفضل المنجزين
                    </h3>
                 </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-right text-slate-500 text-xs">
                                <th className="pb-2 pr-4 font-normal">الموظف</th>
                                <th className="pb-2 font-normal text-center">المهام</th>
                                <th className="pb-2 font-normal text-center">النسبة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {employeeStats.map((emp, idx) => (
                                <tr key={emp.id} className="hover:bg-slate-700/20 transition-colors">
                                    <td className="py-3 pr-4 flex items-center gap-3">
                                        <div className="relative">
                                            <img src={emp.avatar} className="w-8 h-8 rounded-full border border-slate-600" alt={emp.name} />
                                            {idx === 0 && <span className="absolute -top-1 -right-1 text-[10px]">👑</span>}
                                        </div>
                                        <span className="text-slate-200 font-medium truncate max-w-[100px]">{emp.name}</span>
                                    </td>
                                    <td className="py-3 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-white font-bold">{emp.completedTasks}</span>
                                            <span className="text-[10px] text-slate-500">من {emp.totalTasks}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${emp.rate >= 80 ? 'bg-emerald-500/10 text-emerald-400' : emp.rate >= 50 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {emp.rate}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-700 flex justify-between items-center">
             <h3 className="font-bold text-white flex items-center gap-2">
                <Activity size={20} className="text-slate-400" />
                آخر النشاطات
             </h3>
         </div>
         <div className="divide-y divide-slate-700">
             {recentTasks.length === 0 ? (
                 <p className="p-6 text-center text-slate-500">لا توجد مهام حديثة</p>
             ) : recentTasks.map(task => {
                 // Check if this task is transferred from current user
                 const isTransferredFromMe = currentUser?.role === 'EMPLOYEE' && task.assigneeId !== currentUser.id && task.previousAssignees?.includes(currentUser.id);
                 
                 return (
                 <div key={task.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-700/30 transition-colors gap-3">
                     <div className="flex items-center gap-4">
                         <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isTransferredFromMe ? 'bg-emerald-500' : STATUS_COLORS[task.status]}`}></div>
                         <div>
                             <h4 className="text-sm font-medium text-white">{task.title}</h4>
                             <p className="text-xs text-slate-400 mt-0.5">
                                 {getTaskAssigneeIds(task).map(id => users.find(u => u.id === id)?.name).filter(Boolean).join('، ')} • {task.dueDate}
                             </p>
                         </div>
                     </div>
                     <span className={`text-[10px] px-2 py-1 rounded border self-start sm:self-center ${PRIORITY_COLORS[task.priority]}`}>
                         {task.priority === 'HIGH' ? 'عالية' : task.priority === 'MEDIUM' ? 'متوسطة' : 'منخفضة'}
                     </span>
                 </div>
             )})}
         </div>
      </div>

    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, bg }: any) => (
  <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm flex items-center justify-between hover:border-slate-600 transition-colors">
    <div>
      <p className="text-slate-400 text-xs font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
    </div>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${color}`}>
      <Icon size={20} />
    </div>
  </div>
);

export default Dashboard;
