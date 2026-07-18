
import React, { useState, useRef, useEffect } from 'react';
import { X, Calendar, User as UserIcon, Send, MessageSquare, Clock, CheckCircle, AlertTriangle, TimerReset, Check, XCircle, RotateCcw, Paperclip, FileText, Image as ImageIcon, Download, Hourglass, Loader2, Trash2, Edit, UserCog, Save, Copy, Mail, ArrowRightLeft, History } from 'lucide-react';
import { Task, Status, Attachment, getTaskAssigneeIds, getParticipantStatus } from '../types';
import { useTaskContext } from '../context/AppTaskContext';
import { STATUS_LABELS, STATUS_COLORS } from '../constants';

interface TaskModalProps {
  taskId: string;
  onClose: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ taskId, onClose }) => {
  const { getTaskById, users, addComment, updateTaskStatus, deleteTask, updateTaskAssignee, currentUser, requestTaskExtension, resolveExtensionRequest, calculateTimeRemaining, markTaskAsRead } = useTaskContext();
  const [newComment, setNewComment] = useState('');
  const [commentAttachments, setCommentAttachments] = useState<Attachment[]>([]);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [extensionDate, setExtensionDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [editApprovedDate, setEditApprovedDate] = useState('');
  
  // Reassign State
  const [isReassigning, setIsReassigning] = useState(false);
  const [selectedNewAssignee, setSelectedNewAssignee] = useState('');
  const [isReassigningLoading, setIsReassigningLoading] = useState(false);

  // Delete State
  const [isDeleting, setIsDeleting] = useState(false);
  
  const commentFileInputRef = useRef<HTMLInputElement>(null);

  const task = getTaskById(taskId);
  const assignee = users.find(u => u.id === task?.assigneeId);
  const assignees = task ? getTaskAssigneeIds(task).map(id => users.find(u => u.id === id)).filter(Boolean) : [];

  // Mark task as read when modal opens
  useEffect(() => {
      if (task) {
          markTaskAsRead(task.id);
      }
  }, [taskId]);

  // Wrapper for onClose to ensure we mark as read when closing
  const handleClose = () => {
      if (task) {
          markTaskAsRead(task.id);
      }
      onClose();
  };

  if (!task) return null;

  const timeInfo = calculateTimeRemaining(task.dueDate);

  // Get list of previous assignees names
  const previousAssigneeNames = task.previousAssignees && task.previousAssignees.length > 0 
      ? task.previousAssignees.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join('، ')
      : null;

  const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
      });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const files: File[] = Array.from(e.target.files);
          const validFiles = files.filter(f => f.size < 1024 * 1024); 
          if(files.length !== validFiles.length) {
              alert("تم تجاوز الحد المسموح لبعض الملفات (الحد الأقصى 1 ميجابايت للملف)");
          }

          const processedAttachments: Attachment[] = await Promise.all(validFiles.map(async (file) => {
              const base64 = await fileToBase64(file);
              return {
                  id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name: file.name,
                  url: base64,
                  type: file.type.startsWith('image/') ? 'IMAGE' : 'FILE',
                  size: (file.size / 1024).toFixed(1) + ' KB'
              };
          }));
          
          setCommentAttachments(prev => [...prev, ...processedAttachments]);
      }
  };

  const removeCommentAttachment = (id: string) => {
      setCommentAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() && commentAttachments.length === 0) return;
    addComment(task.id, newComment, commentAttachments);
    // Mark as read immediately for the sender so they don't see unread dot
    markTaskAsRead(task.id);
    setNewComment('');
    setCommentAttachments([]);
  };

  const handleDeleteTask = async () => {
      if (window.confirm('تحذير هام:\nهل أنت متأكد من حذف هذه المهمة نهائياً؟\nلا يمكن التراجع عن هذا الإجراء.')) {
          setIsDeleting(true);
          try {
              await deleteTask(task.id);
              onClose();
          } catch(e) {
              alert("حدث خطأ أثناء الحذف");
              setIsDeleting(false);
          }
      }
  };

  const handleConfirmReassign = async () => {
      if (!selectedNewAssignee) {
          alert("الرجاء اختيار الموظف الجديد من القائمة أولاً.");
          return;
      }
      
      setIsReassigningLoading(true);
      try {
          await updateTaskAssignee(task.id, selectedNewAssignee);
          markTaskAsRead(task.id);
          
          alert("✅ تم نقل المهمة بنجاح.");
          setIsReassigning(false);
          setSelectedNewAssignee('');
          onClose(); // Close modal immediately
      } catch (e) {
          console.error("Reassign error", e);
          alert("❌ حدث خطأ أثناء النقل. يرجى المحاولة مرة أخرى.");
      } finally {
          setIsReassigningLoading(false);
      }
  };

  const handleRequestExtension = (e: React.FormEvent) => {
      e.preventDefault();
      if (!extensionDate || !extensionReason) return;
      requestTaskExtension(task.id, extensionDate, extensionReason);
      setShowExtensionForm(false);
  };

  // Helper to force download of Base64 files
  const downloadAttachment = (att: Attachment) => {
      fetch(att.url)
        .then(res => res.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = att.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch(() => alert('فشل تحميل الملف.'));
  };

  const getAvailableActions = () => {
    if (!currentUser) return [];

    const actions: { label: string, status: Status, color: string, icon?: React.ElementType }[] = [];

    if (currentUser.role === 'EMPLOYEE') {
      const myStatus = getParticipantStatus(task, currentUser.id);
      if (myStatus !== 'COMPLETED' && task.status !== 'COMPLETED') {
        actions.push({ label: 'إكمال دوري في المهمة', status: 'COMPLETED', color: 'bg-emerald-600 hover:bg-emerald-700', icon: CheckCircle });
      } else if (myStatus === 'COMPLETED' && task.status !== 'COMPLETED') {
        actions.push({ label: 'إعادة فتح دوري', status: 'IN_PROGRESS', color: 'bg-slate-600 hover:bg-slate-700', icon: RotateCcw });
      }
    } else if (currentUser.role === 'MANAGER') {
      if (task.status === 'PENDING_REVIEW') {
        actions.push({ label: 'اعتماد وإغلاق', status: 'COMPLETED', color: 'bg-emerald-600 hover:bg-emerald-700', icon: CheckCircle });
        actions.push({ label: 'رفض (إعادة للعمل)', status: 'IN_PROGRESS', color: 'bg-red-600 hover:bg-red-700', icon: XCircle });
      } else if (task.status !== 'COMPLETED') {
         actions.push({ label: 'وضع كمكتمل', status: 'COMPLETED', color: 'bg-emerald-600 hover:bg-emerald-700', icon: CheckCircle });
      } else if (task.status === 'COMPLETED') {
         actions.push({ label: 'إعادة فتح المهمة', status: 'IN_PROGRESS', color: 'bg-slate-600 hover:bg-slate-700', icon: RotateCcw });
      }
    }
    return actions;
  };

  const handleStatusChange = (newStatus: Status) => {
      updateTaskStatus(task.id, newStatus);
      markTaskAsRead(task.id);
  };

  const isExtensionPending = task.extensionRequest?.status === 'PENDING';

  const renderAttachments = (attachments: Attachment[]) => (
    <div className="flex flex-wrap gap-2 mt-2">
        {attachments.map(att => (
            <button
                key={att.id} 
                onClick={() => downloadAttachment(att)}
                className="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-300 transition-colors group cursor-pointer"
            >
                {att.type === 'IMAGE' ? (
                    <div className="relative group/img">
                         <ImageIcon size={14} className="text-purple-400" />
                         <img src={att.url} className="w-32 h-32 object-cover rounded-lg absolute bottom-full left-0 mb-2 opacity-0 group-hover/img:opacity-100 transition-opacity border border-slate-500 z-50 shadow-2xl pointer-events-none bg-slate-800" alt="preview" />
                    </div>
                ) : <FileText size={14} className="text-blue-400" />}
                <span className="truncate max-w-[120px]">{att.name}</span>
                <Download size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
        ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${task.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' : task.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {task.priority === 'HIGH' ? 'عالية' : task.priority === 'MEDIUM' ? 'متوسطة' : 'منخفضة'}
              </span>
              
              {task.status !== 'COMPLETED' && (
                  <span className={`text-xs flex items-center gap-1.5 px-2 py-0.5 rounded border ${
                      timeInfo.severity === 'LATE' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                      timeInfo.severity === 'CRITICAL' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                      'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    <Hourglass size={12} />
                    <span className="font-mono">{timeInfo.label}</span>
                  </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white mb-1">{task.title}</h2>
            <p className="text-slate-400 text-sm">تم الإنشاء بواسطة {users.find(u => u.id === task.createdBy)?.name}</p>
          </div>
          <button onClick={handleClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {currentUser?.role === 'MANAGER' && isExtensionPending && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 animate-fade-in">
                  <h3 className="text-orange-400 font-bold text-sm flex items-center gap-2 mb-2">
                      <TimerReset size={16} />
                      طلب تمديد مهلة
                  </h3>
                  <div className="text-sm text-slate-300 mb-3 space-y-1">
                      <p><span className="text-slate-500">التاريخ المطلوب:</span> {task.extensionRequest?.requestedDate}</p>
                      <p><span className="text-slate-500">السبب:</span> {task.extensionRequest?.reason}</p>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                      <label className="text-xs text-slate-400">اعتماد التاريخ:</label>
                      <input 
                        type="date" 
                        defaultValue={task.extensionRequest?.requestedDate}
                        onChange={(e) => setEditApprovedDate(e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-white text-xs rounded px-2 py-1 outline-none focus:border-blue-500"
                      />
                      <div className="flex gap-2 mr-auto">
                        <button 
                            onClick={() => resolveExtensionRequest(task.id, true, editApprovedDate || task.extensionRequest?.requestedDate)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                        >
                            <Check size={12} /> موافقة
                        </button>
                        <button 
                             onClick={() => resolveExtensionRequest(task.id, false)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                        >
                            <X size={12} /> رفض
                        </button>
                      </div>
                  </div>
              </div>
          )}

           {currentUser?.role === 'EMPLOYEE' && isExtensionPending && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-3">
                  <TimerReset size={20} className="text-blue-400" />
                  <div>
                      <h4 className="text-blue-400 font-bold text-sm">طلب التمديد قيد المراجعة</h4>
                      <p className="text-xs text-slate-400">بانتظار موافقة المدير على التاريخ الجديد: {task.extensionRequest?.requestedDate}</p>
                  </div>
              </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800 relative group">
              <span className="text-xs text-slate-500 block mb-2">المشاركون في المهمة ({assignees.length})</span>
              
              {/* Reassign UI */}
              {isReassigning ? (
                  <div className="animate-in fade-in space-y-2">
                      <select 
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded p-2 outline-none focus:border-blue-500"
                        value={selectedNewAssignee}
                        onChange={(e) => setSelectedNewAssignee(e.target.value)}
                      >
                          <option value="" disabled>اختر الموظف الجديد...</option>
                          {users.filter(u => u.role === 'EMPLOYEE' && u.id !== task.assigneeId).map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                      </select>
                      <div className="flex gap-2">
                        <button 
                            type="button"
                            onClick={handleConfirmReassign} 
                            disabled={isReassigningLoading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                            {isReassigningLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            {isReassigningLoading ? 'جاري النقل...' : 'تأكيد'}
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setIsReassigning(false); setSelectedNewAssignee(''); }} 
                            className="px-3 bg-slate-700 hover:bg-slate-600 text-white text-xs py-1.5 rounded"
                        >
                            إلغاء
                        </button>
                      </div>
                  </div>
              ) : (
                <div className="flex flex-col gap-2">
                    <div className="space-y-2">
                      {assignees.map((participant: any) => {
                        const completed = getParticipantStatus(task, participant.id) === 'COMPLETED';
                        return <div key={participant.id} className="flex items-center justify-between bg-slate-900/40 rounded-lg p-2">
                          <div className="flex items-center gap-2">
                            <img src={participant.avatar} alt={participant.name} className="w-8 h-8 rounded-full object-cover" />
                            <div><p className="text-xs text-white">{participant.name}</p><p className="text-[10px] text-slate-500">{participant.department}</p></div>
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded ${completed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}`}>{completed ? 'أكمل دوره' : 'قيد التنفيذ'}</span>
                        </div>;
                      })}
                      {currentUser?.role === 'MANAGER' && assignees.length === 1 && (
                        <button onClick={() => setIsReassigning(true)} className="w-full flex items-center justify-center gap-1 text-xs bg-blue-600/10 text-blue-400 px-2 py-1.5 rounded hover:bg-blue-600 hover:text-white transition-colors">
                          <ArrowRightLeft size={14} /><span>نقل المهمة لموظف آخر</span>
                        </button>
                      )}
                    </div>
                    {/* Previous Assignees List */}
                    {previousAssigneeNames && (
                        <div className="mt-2 text-[10px] text-amber-500/80 bg-amber-500/5 p-2 rounded border border-amber-500/10 flex items-start gap-1.5">
                            <History size={12} className="mt-0.5 flex-shrink-0" />
                            <span>عمل عليها سابقاً: {previousAssigneeNames}</span>
                        </div>
                    )}
                </div>
              )}
            </div>

            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-500 block mb-2">الحالة الحالية</span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[task.status]}`}></div>
                    <span className="text-sm font-medium text-slate-200">{STATUS_LABELS[task.status]}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-3">
                <h3 className="text-sm font-semibold text-slate-300">الوصف والمرفقات</h3>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
              {task.description}
            </p>
            {task.attachments && task.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800/50">
                    <h4 className="text-xs text-slate-500 mb-2">مرفقات المهمة:</h4>
                    {renderAttachments(task.attachments)}
                </div>
            )}
          </div>

           {showExtensionForm && (
               <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 animate-in slide-in-from-top-2">
                   <div className="flex justify-between items-center mb-3">
                       <h3 className="text-sm font-bold text-white flex items-center gap-2">
                           <TimerReset size={16} />
                           طلب تمديد مهلة
                       </h3>
                       <button onClick={() => setShowExtensionForm(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
                   </div>
                   <form onSubmit={handleRequestExtension} className="space-y-3">
                       <div>
                           <label className="text-xs text-slate-400 block mb-1">التاريخ الجديد المقترح</label>
                           <input 
                            type="date" 
                            required
                            value={extensionDate}
                            onChange={(e) => setExtensionDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm outline-none focus:border-blue-500"
                           />
                       </div>
                       <div>
                           <label className="text-xs text-slate-400 block mb-1">سبب التأخير</label>
                           <textarea 
                            required
                            value={extensionReason}
                            onChange={(e) => setExtensionReason(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm outline-none focus:border-blue-500 resize-none h-20"
                            placeholder="اشرح سبب الحاجة للوقت الإضافي..."
                           />
                       </div>
                       <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium">
                           إرسال الطلب للمدير
                       </button>
                   </form>
               </div>
           )}

          <div className="border-t border-slate-800 pt-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <MessageSquare size={16} />
              التعليقات والنشاط
            </h3>
            
            <div className="space-y-4 mb-6 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {task.comments.length === 0 && (
                <p className="text-center text-slate-600 text-sm py-4">لا يوجد تعليقات حتى الآن</p>
              )}
              {task.comments.map((comment) => (
                <div key={comment.id} className={`flex gap-3 ${comment.isSystem ? 'justify-center' : ''}`}>
                  {!comment.isSystem && (
                    <img src={comment.userAvatar} alt="" className="w-8 h-8 rounded-full mt-1" />
                  )}
                  <div className={`${comment.isSystem ? 'bg-slate-800/30 text-slate-500 text-xs px-3 py-1 rounded-full' : 'bg-slate-800 p-3 rounded-2xl rounded-tr-none flex-1'}`}>
                    {!comment.isSystem && (
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-blue-400">{comment.userName}</span>
                        <span className="text-[10px] text-slate-600">{new Date(comment.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute:'2-digit' })}</span>
                      </div>
                    )}
                    <p className={`text-sm whitespace-pre-wrap ${comment.isSystem ? '' : 'text-slate-300'}`}>{comment.content}</p>
                    {comment.attachments && comment.attachments.length > 0 && (
                        <div className="mt-2">
                            {renderAttachments(comment.attachments)}
                        </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-800 rounded-lg p-2 border border-slate-700">
                {commentAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-900/50 rounded">
                        {commentAttachments.map(att => (
                            <div key={att.id} className="bg-slate-800 text-xs flex items-center gap-1 px-2 py-1 rounded border border-slate-600 text-slate-300">
                                <span className="max-w-[100px] truncate">{att.name}</span>
                                <button onClick={() => removeCommentAttachment(att.id)} className="text-red-400 hover:text-red-300"><X size={12} /></button>
                            </div>
                        ))}
                    </div>
                )}
                <form onSubmit={handleSendComment} className="flex gap-2 items-center">
                    <button 
                        type="button" 
                        onClick={() => commentFileInputRef.current?.click()}
                        className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        title="إرفاق ملف"
                    >
                        <Paperclip size={18} />
                    </button>
                    <input 
                        type="file" 
                        ref={commentFileInputRef} 
                        multiple 
                        onChange={handleFileSelect} 
                        className="hidden" 
                        accept="image/*,.pdf,.doc,.docx"
                    />
                    
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="أضف تعليقاً..."
                        className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none placeholder-slate-500"
                    />
                    <button 
                        type="submit" 
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!newComment.trim() && commentAttachments.length === 0}
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
            <div className="flex items-center gap-4">
                 {currentUser?.role === 'MANAGER' && (
                     <button 
                        type="button"
                        onClick={handleDeleteTask}
                        disabled={isDeleting}
                        className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                     >
                         {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                         {isDeleting ? 'جاري الحذف...' : 'حذف المهمة'}
                     </button>
                 )}
                
                {currentUser?.role === 'EMPLOYEE' && !isExtensionPending && !showExtensionForm && task.status !== 'COMPLETED' && (
                    <button 
                        onClick={() => setShowExtensionForm(true)}
                        className="text-xs text-orange-400 hover:text-orange-300 underline flex items-center gap-1"
                    >
                        <TimerReset size={12} />
                        طلب تمديد مهلة
                    </button>
                )}
            </div>
           
            <div className="flex gap-3">
                {getAvailableActions().map((action, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleStatusChange(action.status)}
                        className={`${action.color} text-white px-6 py-2 rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl flex items-center gap-2`}
                    >
                        {action.icon && <action.icon size={16} />}
                        {action.label}
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
