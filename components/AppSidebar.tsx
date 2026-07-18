import React from 'react';
import { LayoutDashboard, CheckSquare, Users, Settings, LogOut, Briefcase, X, Crown, MessageCircle } from 'lucide-react';
import { useTaskContext } from '../context/AppTaskContext';
import { NavLink } from 'react-router-dom';
import { isSuperAdminUser } from '../types';

interface AppSidebarProps {
  onClose?: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ onClose }) => {
  const { logout, currentUser, communicationMessages } = useTaskContext();
  const superAdmin = isSuperAdminUser(currentUser);
  const unreadCommunications = communicationMessages.filter(message => !message.readBy?.includes(currentUser?.id || '')).length;

  const navItems = [
    ...(superAdmin ? [{ icon: Crown, label: 'مركز القيادة', path: '/command-center' }] : []),
    { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/' },
    { icon: CheckSquare, label: 'المهام', path: '/tasks' },
    { icon: MessageCircle, label: 'التواصل', path: '/communications', badge: unreadCommunications },
  ];

  if (currentUser?.role === 'MANAGER') {
    navItems.push({ icon: Users, label: 'الموظفين', path: '/team' });
  }

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  return (
    <div className="h-full w-full bg-slate-900 border-l border-slate-800 text-slate-300 flex flex-col shadow-2xl md:shadow-none">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Briefcase className="text-white w-6 h-6" />
            </div>
            <div>
            <h1 className="text-lg font-bold text-white leading-tight">نظام المهام</h1>
            <p className="text-xs text-slate-500">إدارة الموارد البشرية</p>
            </div>
        </div>
        <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white p-1">
            <X size={24} />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={handleLinkClick}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
              ${isActive 
                ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                : 'hover:bg-slate-800 hover:text-white'}
            `}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
            {'badge' in item && Number(item.badge) > 0 && <span className="mr-auto min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{item.badge}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-2">
            <NavLink 
            to="/settings"
            onClick={handleLinkClick}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors
              ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
            `}
            >
            <Settings size={20} />
            <span>الإعدادات</span>
            </NavLink>
        <button 
          onClick={() => {
              logout();
              handleLinkClick();
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={20} />
          <span>تسجيل الخروج</span>
        </button>
        <div className="pt-3 mt-2 border-t border-slate-800 text-center">
          <p dir="ltr" className="text-xs font-black tracking-widest text-violet-300">NDR WORK</p>
          <p className="text-[10px] text-slate-500 mt-1">فكرة وتصميم وتطوير نادر</p>
          <p className="text-[9px] text-slate-600 mt-0.5">© 2026 جميع الحقوق محفوظة</p>
        </div>
      </div>
    </div>
  );
};

export default AppSidebar;
