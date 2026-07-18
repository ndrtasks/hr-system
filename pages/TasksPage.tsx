
import React, { useState } from 'react';
import { useTaskContext } from '../context/AppTaskContext';
import { Task, getTaskAssigneeIds, getParticipantStatus } from '../types';
import { PRIORITY_COLORS, STATUS_LABELS, STATUS_COLORS } from '../constants';
import { Plus, Clock, Filter, ChevronRight, Search, Hourglass, MessageSquare, Bell, Trash2, Loader2, ArrowRightLeft, History } from 'lucide-react';
import TaskModal from '../components/TaskModal';
import NewTaskModal from '../components/NewTaskModal';

const TasksPage = () => {
  const { tasks, currentUser, users } = useTaskContext();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const relevantTasks = tasks.filter(task => {
    if (currentUser?.role === 'MANAGER') return true;
    return getTaskAssigneeIds(task).includes(currentUser?.id || '') || task.previousAssignees?.includes(currentUser?.id || '');
  });

  const filteredTasks = relevantTasks.filter(t => {
      // ✅ CORE LOGIC: If I am a previous assignee, this task is conceptually "COMPLETED" for me
      const isTransferredFromMe = currentUser?.role === 'EMPLOYEE' && t.assigneeId !== currentUser.id && t.previousAssignees?.includes(currentUser.id);
      
      // We fake the status for the filter only
      const effectiveStatus = isTransferredFromMe ? 'COMPLETED' : currentUser?.role === 'EMPLOYEE' ? getParticipantStatus(t, currentUser.id) : t.status;

      const matchesStatus = statusFilter === 'ALL' || effectiveStatus === statusFilter;
      const matchesSearch = t.title.includes(searchQuery) || t.description.includes(searchQuery);
      return matchesStatus && matchesSearch;
  }).sort((a, b) => {
      // آخر رسالة أو تغيير أو مرفق يرفع المهمة للأعلى عند المدير والموظف.
      const latestA = new Date(a.lastUpdated || 0).getTime();
      const latestB = new Date(b.lastUpdated || 0).getTime();
      return latestB - latestA;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">إدارة المهام</h1>
          <p className="text-slate-400 text-sm">جدولة، متابعة، وتنفيذ المهام اليومية</p>
        </div>
        
        {currentUser?.role === 'MANAGER' && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-lg shadow-blue-900/20 transition-all"
          >
            <Plus size={20} />
            <span>إنشاء مهمة جديدة</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث عن مهمة..."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg py-2 pr-10 pl-4 focus:ring-1 focus:ring-blue-500 outline-none"
              />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={18} className="text-slate-500" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none w-full sm:w-auto"
            >
                <option value="ALL">جميع الحالات</option>
                <option value="NEW">جديدة</option>
                <option value="IN_PROGRESS">قيد التنفيذ</option>
                <option value="PENDING_REVIEW">بانتظار الاعتماد</option>
                <option value="COMPLETED">مكتملة</option>
                <option value="LATE">متأخرة</option>
            </select>
          </div>
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                <p className="text-slate-500 mb-2">لا توجد مهام تطابق البحث</p>
            </div>
        ) : (
            filteredTasks.map((task) => (
            <TaskRow 
                key={task.id} 
                task={task} 
                assignee={users.find(u => u.id === task.assigneeId)}
                onClick={() => setSelectedTaskId(task.id)} 
                currentUser={currentUser}
            />
            ))
        )}
      </div>

      {selectedTaskId && (
        <TaskModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      )}
      {isCreateModalOpen && (
        <NewTaskModal onClose={() => setIsCreateModalOpen(false)} />
      )}
    </div>
  );
};

interface TaskRowProps {
  task: Task;
  assignee: any;
  onClick: () => void;
  currentUser: any;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, assignee, onClick, currentUser }) => {
  const { calculateTimeRemaining, sendTaskReminder, deleteTask, taskReadStatus, users } = useTaskContext();
  const [isReminderSent, setIsReminderSent] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const timeInfo = calculateTimeRemaining(task.dueDate);
  const taskAssignees = getTaskAssigneeIds(task).map(id => users.find(u => u.id === id)).filter(Boolean);
  const completedCount = getTaskAssigneeIds(task).filter(id => getParticipantStatus(task, id) === 'COMPLETED').length;

  // Check if transferred FROM me
  const isTransferredFromMe = currentUser?.role === 'EMPLOYEE' && task.assigneeId !== currentUser.id && task.previousAssignees?.includes(currentUser.id);
  
  // Check if task has transfer history
  const previousAssigneesIds = task.previousAssignees || [];
  const hasTransferHistory = previousAssigneesIds.length > 0;
  
  // Get names of previous assignees
  const previousAssigneesNames = previousAssigneesIds
      .map(id => users.find(u => u.id === id)?.name)
      .filter(Boolean)
      .join('، ');

  const realCommentsCount = task.comments.filter(c => !c.isSystem).length;

  // Unread Logic: Compare Task Last Updated vs My Last Read Time
  const lastReadTime = taskReadStatus[task.id] || "0";
  const hasUnreadActivity = new Date(task.lastUpdated || 0).getTime() > new Date(lastReadTime).getTime();

  const handleReminder = (e: React.MouseEvent) => {
      e.stopPropagation();
      sendTaskReminder(task.id);
      setIsReminderSent(true);
      setTimeout(() => setIsReminderSent(false), 3000);
  };

  const handleDelete = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if(window.confirm("هل أنت متأكد من حذف هذه المهمة نهائياً؟")) {
          setIsDeleting(true);
          try { await deleteTask(task.id); } 
          catch (e) { setIsDeleting(false); }
      }
  };

  const getStatusBadge = () => {
      if (isTransferredFromMe) {
          return (
            <span className="text-xs px-3 py-1.5 rounded-lg font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm flex items-center gap-1">
                <ArrowRightLeft size={14} />
                تم النقل (مكتملة)
            </span>
          );
      }
      return (
        <span className={`text-xs px-3 py-1.5 rounded-lg font-medium ${STATUS_COLORS[task.status]} text-white shadow-sm`}>
            {STATUS_LABELS[task.status]}
        </span>
      );
  };

  return (
    <div 
        onClick={onClick}
        className={`group bg-slate-800 hover:bg-slate-750 border rounded-xl p-5 cursor-pointer transition-all duration-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative ${hasUnreadActivity ? 'border-blue-500/30' : 'border-slate-700'}`}
    >
        {hasUnreadActivity && (
            <span className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/50 animate-pulse border-2 border-slate-800 z-10" title="نشاط جديد لم تقم بفتحه"></span>
        )}

        <div className="flex items-start gap-4 w-full">
            {currentUser?.role === 'MANAGER' && (
                <button onClick={handleDelete} disabled={isDeleting} className="absolute top-4 left-4 p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all z-20">
                    {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
            )}

            <div className={`w-1.5 h-12 rounded-full mt-1 flex-shrink-0 ${task.priority === 'HIGH' ? 'bg-red-500' : task.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-emerald-500'}`}></div>
            
            <div className="flex-1">
                <h4 className={`text-lg font-bold transition-colors pr-2 ${hasUnreadActivity ? 'text-blue-100' : 'text-white'}`}>{task.title}</h4>
                <p className="text-slate-400 text-sm mt-1 line-clamp-1 pr-2">{task.description}</p>
                
                {/* Previous Assignees Note */}
                {hasTransferHistory && !isTransferredFromMe && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-500/90 bg-amber-500/5 p-1.5 rounded w-fit border border-amber-500/10">
                        <History size={12} className="flex-shrink-0" />
                        <span className="font-medium">عمل عليها سابقاً: <span className="text-amber-400/80">{previousAssigneesNames}</span></span>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3 mt-3 pr-2">
                    <span className={`text-xs flex items-center gap-1.5 px-2.5 py-1 rounded border ${(task.status === 'COMPLETED' || isTransferredFromMe) ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : timeInfo.severity === 'LATE' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                        {(task.status === 'COMPLETED' || isTransferredFromMe) ? <Clock size={12} /> : <Hourglass size={12} />}
                        <span className="font-medium">{(task.status === 'COMPLETED' || isTransferredFromMe) ? task.dueDate : timeInfo.label}</span>
                    </span>
                    <span className={`text-[10px] px-2 py-1 rounded border ${PRIORITY_COLORS[task.priority]}`}>{task.priority === 'HIGH' ? 'أولوية عالية' : task.priority === 'MEDIUM' ? 'متوسطة' : 'منخفضة'}</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end pl-2 pt-4 md:pt-0 border-t md:border-t-0 border-slate-700 md:pl-12">
            <div className="flex items-center gap-3">
                <div className="text-left hidden md:block">
                    <p className="text-xs text-slate-300">{taskAssignees.length} مشاركين</p>
                    <p className="text-[10px] text-slate-500">أنجز {completedCount} من {taskAssignees.length}</p>
                </div>
                <div className="flex -space-x-2 space-x-reverse">
                  {taskAssignees.slice(0, 4).map((u: any) => <img key={u.id} src={u.avatar} title={u.name} className="w-9 h-9 rounded-full border-2 border-slate-800" alt={u.name} />)}
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                {realCommentsCount > 0 && (
                    <div className="flex items-center gap-1 text-slate-400 text-xs bg-slate-900 px-2 py-1 rounded-md border border-slate-700">
                        <MessageSquare size={12} /> <span>{realCommentsCount}</span>
                    </div>
                )}
                
                {getStatusBadge()}

                {currentUser?.role === 'MANAGER' && !isTransferredFromMe && task.status !== 'COMPLETED' && (
                    <button onClick={handleReminder} className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${isReminderSent ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white'}`}>
                        <Bell size={16} /> {isReminderSent && <span className="text-[10px] font-bold">تم</span>}
                    </button>
                )}
                <ChevronRight size={18} className="text-slate-600 group-hover:text-white transition-colors rotate-180" />
            </div>
        </div>
    </div>
  );
};

export default TasksPage;
