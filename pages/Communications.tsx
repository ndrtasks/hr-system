import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Plus, Send, Users, Megaphone, Search, CheckCheck, X } from 'lucide-react';
import { useTaskContext } from '../context/AppTaskContext';
import { ConversationType, isSuperAdminUser } from '../types';

const timestamp = (value: any) => value?.toMillis?.() ?? (value?.seconds ? value.seconds * 1000 : new Date(value || 0).getTime());

const Communications = () => {
  const { currentUser, users, departments, conversations, communicationMessages, createConversation, sendCommunicationMessage, markConversationRead } = useTaskContext();
  const superAdmin = isSuperAdminUser(currentUser);
  const [selectedId, setSelectedId] = useState('');
  const [reply, setReply] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [openingMessage, setOpeningMessage] = useState('');
  const [type, setType] = useState<ConversationType>('DIRECT');
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');

  const visibleConversations = useMemo(() => conversations.filter(item => item.title.toLowerCase().includes(search.toLowerCase())), [conversations, search]);
  const selected = conversations.find(item => item.id === selectedId) || visibleConversations[0];
  const messages = communicationMessages.filter(message => message.conversationId === selected?.id).sort((a, b) => timestamp(a.timestamp) - timestamp(b.timestamp));

  useEffect(() => {
    if (selected?.id) markConversationRead(selected.id);
  }, [selected?.id, communicationMessages.length]);

  const toggleRecipient = (id: string) => setRecipientIds(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);
  const selectDepartment = (name: string) => setRecipientIds(previous => Array.from(new Set([...previous, ...users.filter(user => user.department === name && user.id !== currentUser?.id).map(user => user.id)])));

  const handleCreate = async () => {
    const result = await createConversation(title, recipientIds, type, openingMessage);
    setFeedback(result.message);
    if (result.success) { setCreating(false); setTitle(''); setOpeningMessage(''); setRecipientIds([]); }
  };

  const handleReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    const result = await sendCommunicationMessage(selected.id, reply);
    if (result.success) setReply(''); else setFeedback(result.message);
  };

  return <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div><h1 className="text-2xl font-black text-white flex items-center gap-2"><MessageCircle className="text-violet-400"/> مركز التواصل</h1><p className="text-sm text-slate-400 mt-1">محادثات خاصة وجماعية بتحديث مباشر وحالة قراءة.</p></div>
      {superAdmin && <button onClick={() => setCreating(true)} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold"><Plus size={18}/> محادثة أو تعميم جديد</button>}
    </div>

    <div className="grid lg:grid-cols-[340px_1fr] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden min-h-[650px]">
      <aside className="border-l border-slate-700 bg-slate-900/80">
        <div className="p-4 border-b border-slate-700"><div className="relative"><Search size={17} className="absolute right-3 top-3 text-slate-500"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في المحادثات..." className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-white outline-none"/></div></div>
        <div className="divide-y divide-slate-800 max-h-[590px] overflow-y-auto">
          {!visibleConversations.length && <p className="p-8 text-center text-slate-500 text-sm">لا توجد محادثات بعد</p>}
          {visibleConversations.map(conversation => {
            const unread = communicationMessages.filter(message => message.conversationId === conversation.id && !message.readBy?.includes(currentUser!.id)).length;
            return <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`w-full p-4 text-right hover:bg-slate-800 transition-colors ${selected?.id === conversation.id ? 'bg-violet-500/10 border-r-2 border-violet-500' : ''}`}>
              <div className="flex justify-between gap-2"><span className="font-bold text-white truncate">{conversation.title}</span>{unread > 0 && <span className="bg-red-500 text-white text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center">{unread}</span>}</div>
              <p className="text-xs text-slate-500 truncate mt-1">{conversation.lastMessage}</p>
              <span className="text-[10px] text-violet-400 mt-2 block">{conversation.type === 'DIRECT' ? 'خاصة' : conversation.type === 'GROUP' ? 'مجموعة' : 'تعميم'}</span>
            </button>;
          })}
        </div>
      </aside>

      <section className="flex flex-col min-w-0">
        {!selected ? <div className="flex-1 flex flex-col items-center justify-center text-slate-500"><MessageCircle size={56} className="opacity-20 mb-3"/><p>اختر محادثة لعرض الرسائل</p></div> : <>
          <header className="p-4 border-b border-slate-700 flex items-center justify-between"><div><h2 className="font-bold text-white">{selected.title}</h2><p className="text-xs text-slate-500 mt-1">{selected.participantIds.length} مشاركين</p></div>{selected.type === 'ANNOUNCEMENT' ? <Megaphone className="text-amber-400"/> : <Users className="text-violet-400"/>}</header>
          <div className="flex-1 p-4 md:p-6 space-y-3 overflow-y-auto max-h-[510px] bg-slate-950/40">
            {messages.map(message => {
              const mine = message.senderId === currentUser?.id;
              return <div key={message.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 ${mine ? 'bg-violet-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-200'}`}><p className={`text-xs font-bold mb-1 ${mine ? 'text-violet-100' : 'text-blue-400'}`}>{message.senderName}</p><p className="text-sm whitespace-pre-wrap leading-6">{message.content}</p><div className="flex items-center gap-1 mt-2 opacity-60 text-[10px]">{mine && <CheckCheck size={12}/>} {new Date(timestamp(message.timestamp)).toLocaleString('ar-SA')}</div></div></div>;
            })}
          </div>
          <form onSubmit={handleReply} className="p-3 border-t border-slate-700 flex gap-2"><input value={reply} onChange={e => setReply(e.target.value)} placeholder="اكتب ردك..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 text-white outline-none"/><button disabled={!reply.trim()} className="p-3 rounded-xl bg-blue-600 text-white disabled:opacity-40"><Send size={19}/></button></form>
        </>}
      </section>
    </div>

    {creating && <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="p-5 border-b border-slate-700 flex justify-between"><div><h2 className="text-lg font-bold text-white">إنشاء تواصل جديد</h2><p className="text-xs text-slate-500 mt-1">اختر شخصًا أو مجموعة أو قسمًا كاملًا</p></div><button onClick={() => setCreating(false)}><X className="text-slate-400"/></button></div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-2">{(['DIRECT','GROUP','ANNOUNCEMENT'] as ConversationType[]).map(item => <button key={item} onClick={() => setType(item)} className={`p-2.5 rounded-lg border text-sm ${type === item ? 'bg-violet-600/20 border-violet-500 text-violet-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>{item === 'DIRECT' ? 'خاصة' : item === 'GROUP' ? 'مجموعة' : 'تعميم'}</button>)}</div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان المحادثة أو التعميم" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"/>
        <div><p className="text-xs text-slate-400 mb-2">اختيار سريع حسب القسم</p><div className="flex flex-wrap gap-2">{departments.map(department => <button key={department.id} onClick={() => selectDepartment(department.name)} className="text-xs px-3 py-1.5 rounded-full border border-blue-500/30 text-blue-300 hover:bg-blue-500/10">{department.name}</button>)}</div></div>
        <div className="border border-slate-700 rounded-xl max-h-52 overflow-y-auto divide-y divide-slate-800">{users.filter(user => user.id !== currentUser?.id).map(user => <label key={user.id} className="flex items-center justify-between p-3 hover:bg-slate-800 cursor-pointer"><div className="flex items-center gap-3"><img src={user.avatar} className="w-8 h-8 rounded-full"/><div><p className="text-sm text-white">{user.name}</p><p className="text-[10px] text-slate-500">{user.role === 'MANAGER' ? 'مدير قسم' : 'موظف'} • {user.department}</p></div></div><input type="checkbox" checked={recipientIds.includes(user.id)} onChange={() => toggleRecipient(user.id)} className="accent-violet-500"/></label>)}</div>
        <textarea value={openingMessage} onChange={e => setOpeningMessage(e.target.value)} placeholder="اكتب الرسالة الأولى..." rows={4} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none resize-none"/>
        {feedback && <p className="text-sm text-amber-300">{feedback}</p>}
        <button onClick={handleCreate} className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Send size={18}/> إرسال إلى {recipientIds.length} مستلم</button>
      </div>
    </div></div>}
  </div>;
};

export default Communications;
