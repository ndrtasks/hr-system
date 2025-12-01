import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { useTaskContext } from '../context/AppTaskContext';

interface HeaderProps {
  onMenuClick: () => void;
}

const AppHeader: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { currentUser, notifications, markNotificationAsRead, markAllNotificationsAsRead } = useTaskContext();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const myNotifications = notifications.filter(n => n.userId === currentUser?.id);
  const unreadCount = myNotifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-20 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="md:hidden text-slate-400 hover:text-white">
          <Menu size={24} />
        </button>
        <div className="relative hidden sm:block">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="بحث في المهام..." 
            className="bg-slate-800 border border-slate-700 text-sm rounded-full py-2.5 pr-10 pl-4 w-64 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative transition-colors ${showNotifications ? 'text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold border-2 border-slate-900 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute left-0 mt-3 w-80 md:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 transform origin-top-left animate-in fade-in slide-in-from-top-2">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                <h3 className="font-bold text-white">الإشعارات</h3>
                {unreadCount > 0 && (
                    <button onClick={markAllNotificationsAsRead} className="text-xs text-blue-400 hover:text-blue-300">
                        تحديد الكل كمقروء
                    </button>
                )}
              </div>
              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                {myNotifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                        <Bell size={32} className="mb-2 opacity-20" />
                        <p>لا توجد إشعارات حالياً</p>
                    </div>
                ) : (
                    myNotifications.map((notif) => (
                    <div 
                        key={notif.id} 
                        onClick={() => markNotificationAsRead(notif.id)}
                        className={`p-4 border-b border-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer flex gap-3 ${!notif.read ? 'bg-blue-900/10' : ''}`}
                    >
                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notif.read ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                        <div className="flex-1">
                            <h4 className={`text-sm mb-1 ${!notif.read ? 'text-white font-semibold' : 'text-slate-400'}`}>
                                {notif.title}
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed">{notif.message}</p>
                            <span className="text-[10px] text-slate-600 mt-2 block">
                                {new Date(notif.timestamp).toLocaleString('ar-SA')}
                            </span>
                        </div>
                    </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-white">{currentUser?.name}</p>
            <p className="text-xs text-slate-400">{currentUser?.role === 'MANAGER' ? 'مدير النظام' : 'موظف'}</p>
          </div>
          <img 
            src={currentUser?.avatar} 
            alt={currentUser?.name} 
            className="w-10 h-10 rounded-full border-2 border-slate-700 object-cover"
          />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;