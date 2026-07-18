import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TaskProvider, useTaskContext } from './context/AppTaskContext';
import AppSidebar from './components/AppSidebar';
import AppHeader from './components/AppHeader';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Team from './pages/Team';
import TasksPage from './pages/TasksPage';
import SettingsPage from './pages/Settings';
import AIAssistant from './components/AIAssistant';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row font-cairo">
      {/* Mobile Overlay with High Z-Index */}
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      
      {/* Sidebar Container with High Z-Index for Mobile */}
      <div className={`
        fixed inset-y-0 right-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-auto
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
         <AppSidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 md:mr-0">
        <AppHeader onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950">
          {children}
        </main>
        <AIAssistant />
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useTaskContext();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const AppRoutes = () => {
  const { currentUser } = useTaskContext();

  return (
    <Routes>
       <Route path="/login" element={currentUser ? <Navigate to="/" replace /> : <Login />} />
       <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
       <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
       <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
       <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
       <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <TaskProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </TaskProvider>
  );
};

export default App;
