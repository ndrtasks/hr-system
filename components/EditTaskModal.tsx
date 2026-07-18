import React, { useRef, useState } from 'react';
import { Check, FileText, Image as ImageIcon, Paperclip, Trash2, X } from 'lucide-react';
import { Attachment, Priority, Task, getTaskAssigneeIds, isSuperAdminUser } from '../types';
import { useTaskContext } from '../context/AppTaskContext';

const EditTaskModal: React.FC<{ task: Task; onClose: () => void }> = ({ task, onClose }) => {
  const { users, currentUser, updateTaskDetails } = useTaskContext();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [dueDate, setDueDate] = useState(task.dueDate);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [assigneeIds, setAssigneeIds] = useState(getTaskAssigneeIds(task));
  const [attachments, setAttachments] = useState<Attachment[]>(task.attachments || []);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const employees = users.filter(user => user.role === 'EMPLOYEE' && (isSuperAdminUser(currentUser) || user.department === currentUser?.department));

  const addFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter(file => file.size < 1024 * 1024);
    const next = await Promise.all(files.map(file => new Promise<Attachment>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ id: `att_${Date.now()}_${Math.random()}`, name: file.name, url: reader.result as string, type: file.type.startsWith('image/') ? 'IMAGE' : 'FILE', size: `${(file.size / 1024).toFixed(1)} KB` });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
    setAttachments(previous => [...previous, ...next]);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !dueDate || assigneeIds.length === 0) return;
    setSaving(true);
    await updateTaskDetails(task.id, { title: title.trim(), description, dueDate, priority, assigneeIds, attachments });
    setSaving(false);
    onClose();
  };

  return <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <form onSubmit={save} className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
      <div className="flex justify-between"><h2 className="text-xl font-bold text-white">تعديل المهمة</h2><button type="button" onClick={onClose}><X className="text-slate-400" /></button></div>
      <div><label className="text-xs text-slate-400">العنوان</label><input value={title} onChange={e => setTitle(e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white" /></div>
      <div><label className="text-xs text-slate-400">الوصف</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-slate-400">الموعد</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white [color-scheme:dark]" /></div>
        <div><label className="text-xs text-slate-400">الأولوية</label><select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"><option value="LOW">منخفضة</option><option value="MEDIUM">متوسطة</option><option value="HIGH">عالية</option></select></div>
      </div>
      <div><label className="text-xs text-slate-400">المشاركون</label><div className="mt-1 grid sm:grid-cols-2 gap-2 bg-slate-800 p-2 rounded-lg">
        {employees.map(user => { const selected = assigneeIds.includes(user.id); return <button type="button" key={user.id} onClick={() => setAssigneeIds(previous => selected ? previous.filter(id => id !== user.id) : [...previous, user.id])} className={`flex justify-between p-2 rounded text-sm ${selected ? 'bg-blue-600/20 text-blue-300' : 'text-slate-300 bg-slate-900/40'}`}><span>{user.name}</span>{selected && <Check size={15}/>}</button>; })}
      </div></div>
      <div><label className="text-xs text-slate-400">المرفقات</label><input ref={fileRef} type="file" multiple className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={addFiles}/><button type="button" onClick={() => fileRef.current?.click()} className="w-full mt-1 border border-dashed border-slate-600 rounded-lg p-3 text-slate-300 flex justify-center gap-2"><Paperclip size={16}/>إضافة مرفقات</button>
        <div className="space-y-2 mt-2">{attachments.map(item => <div key={item.id} className="flex justify-between bg-slate-800 rounded p-2 text-xs text-slate-300"><span className="flex gap-2">{item.type === 'IMAGE' ? <ImageIcon size={14}/> : <FileText size={14}/>} {item.name}</span><button type="button" onClick={() => setAttachments(previous => previous.filter(file => file.id !== item.id))}><Trash2 size={14} className="text-red-400"/></button></div>)}</div>
      </div>
      <div className="flex gap-3"><button disabled={saving || assigneeIds.length === 0} className="flex-1 bg-blue-600 text-white rounded-lg py-3 disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</button><button type="button" onClick={onClose} className="px-6 bg-slate-700 text-white rounded-lg">إلغاء</button></div>
    </form>
  </div>;
};

export default EditTaskModal;
