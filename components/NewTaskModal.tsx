
import React, { useState, useRef } from 'react';
import { X, Calendar, User, Flag, Mail, Paperclip, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useTaskContext } from '../context/AppTaskContext';
import { Task, Priority, Attachment } from '../types';

interface NewTaskModalProps {
  onClose: () => void;
}

const NewTaskModal: React.FC<NewTaskModalProps> = ({ onClose }) => {
  const { users, addTask, currentUser } = useTaskContext();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const employees = users.filter(u => u.role === 'EMPLOYEE');

  const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
      });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const files: File[] = Array.from(e.target.files);
          const validFiles = files.filter(f => f.size < 1024 * 1024);
          if(files.length !== validFiles.length) {
              alert("بعض الملفات كبيرة جداً (الحد الأقصى 1 ميجابايت).");
          }

          const newAttachments: Attachment[] = await Promise.all(validFiles.map(async (file) => {
              const base64 = await fileToBase64(file);
              return {
                  id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name: file.name,
                  url: base64,
                  type: file.type.startsWith('image/') ? 'IMAGE' : 'FILE',
                  size: (file.size / 1024).toFixed(1) + ' KB'
              };
          }));
          setAttachments(prev => [...prev, ...newAttachments]);
      }
  };

  const removeAttachment = (id: string) => {
      setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !assigneeId || !dueDate) return;

    const newTask: Task = {
      id: `t_${Date.now()}`,
      title,
      description,
      priority,
      status: 'IN_PROGRESS',
      dueDate,
      assigneeId,
      createdBy: currentUser?.id || '',
      department: users.find(u => u.id === assigneeId)?.department || 'General',
      isRecurring,
      lastUpdated: new Date().toISOString(), // Set initial lastUpdated for sorting
      comments: [
        {
            id: `sys_start_${Date.now()}`,
            userId: 'system',
            userName: 'النظام',
            userAvatar: '',
            content: 'تم بدء المهمة وتفعيل العداد تلقائياً فور الإسناد.',
            timestamp: new Date().toISOString(),
            isSystem: true
        }
      ],
      attachments: attachments
    };

    // addTask will handle email sending if configured
    addTask(newTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-800 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">إنشاء مهمة جديدة</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">عنوان المهمة</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-600"
              placeholder="مثال: إعداد تقرير المبيعات..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">الوصف</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-600 resize-none"
              placeholder="تفاصيل المهمة..."
            />
          </div>

           <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">المرفقات</label>
              <input 
                  type="file" 
                  ref={fileInputRef} 
                  multiple 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*,.pdf,.doc,.docx"
              />
              <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border border-dashed border-slate-700 rounded-lg p-3 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-sm"
              >
                  <Paperclip size={16} />
                  <span>إرفاق ملفات (صور، PDF، Word)</span>
              </button>

              {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                      {attachments.map(att => (
                          <div key={att.id} className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded p-2 text-xs">
                              <div className="flex items-center gap-2 text-slate-300">
                                  {att.type === 'IMAGE' ? <ImageIcon size={14} className="text-purple-400" /> : <FileText size={14} className="text-blue-400" />}
                                  <span className="truncate max-w-[200px]">{att.name}</span>
                                  <span className="text-slate-600">({att.size})</span>
                              </div>
                              <button type="button" onClick={() => removeAttachment(att.id)} className="text-slate-500 hover:text-red-400">
                                  <Trash2 size={14} />
                              </button>
                          </div>
                      ))}
                  </div>
              )}
           </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">إسناد إلى</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <select 
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-10 pl-4 py-2.5 text-white appearance-none focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">اختر موظف</option>
                  {employees.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

             <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">تاريخ الإنجاز المطلوب</label>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="date" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-10 pl-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none [color-scheme:dark]"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">الأولوية</label>
              <div className="flex gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
                {(['LOW', 'MEDIUM', 'HIGH'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                      priority === p 
                      ? (p === 'HIGH' ? 'bg-red-500 text-white' : p === 'MEDIUM' ? 'bg-yellow-500 text-black' : 'bg-emerald-500 text-white')
                      : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p === 'HIGH' ? 'عالية' : p === 'MEDIUM' ? 'متوسطة' : 'منخفضة'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col justify-end gap-2 pb-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500/50"
                />
                <span className="text-xs text-slate-400 group-hover:text-white transition-colors">مهمة متكررة؟</span>
              </label>

               <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500/50"
                />
                <div className="flex items-center gap-1.5 text-xs text-slate-400 group-hover:text-white transition-colors">
                    <Mail size={12} />
                    <span>إرسال بريد إلكتروني</span>
                </div>
              </label>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mt-4 transition-all shadow-lg hover:shadow-blue-500/20"
          >
            إنشاء المهمة وبدء العداد
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewTaskModal;
