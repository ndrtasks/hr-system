import React from 'react';
import { LayoutDashboard, CheckSquare, Users, Settings, LogOut, Briefcase } from 'lucide-react';
import { useTaskContext } from '../context/AppTaskContext';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  const { logout, currentUser } = useTaskContext();

  const navItems = [
    { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/' },
    { icon: CheckSquare, label: 'المهام', path: '/tasks' },
  ];

  if (currentUser?.role === 'MANAGER') {
    navItems.push({ icon: Users, label: 'الموظفين', path: '/team' });
  }

  return (
    <div className="fixed inset-y-0 right-0 w-64 bg-slate-900 border-l border-slate-800 text-slate-300 flex flex-col z-20 hidden md:flex transition-all duration-300">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Briefcase className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">نظام المهام</h1>
          <p className="text-xs text-slate-500">إدارة الموارد البشرية</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
              ${isActive 
                ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                : 'hover:bg-slate-800 hover:text-white'}
            `}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-2">
        {currentUser?.role === 'MANAGER' && (
            <NavLink 
            to="/settings"
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors
              ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
            `}
            >
            <Settings size={20} />
            <span>الإعدادات</span>
            </NavLink>
        )}
        <button 
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={20} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;