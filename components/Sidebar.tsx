
import React, { useState } from 'react';
import { Box, Settings, Layout, BookOpen, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppView } from '../types';
import { User } from '@supabase/supabase-js';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  user?: User | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, user }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Extract username from email
  const username = user?.email ? user.email.split('@')[0] : 'Developer';

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 flex-shrink-0 transition-all duration-300 relative`}>
      <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'justify-start px-6'} border-b border-slate-800 transition-all`}>
        <div className="flex items-center gap-2 text-white overflow-hidden whitespace-nowrap">
          <div className="bg-blue-600 p-1.5 rounded-lg flex-shrink-0">
            <Box size={20} className="text-white" />
          </div>
          {!isCollapsed && <span className="font-bold text-lg animate-in fade-in duration-200">SpecKit</span>}
        </div>
      </div>

      <nav className={`flex-1 py-6 flex flex-col gap-2 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        <SidebarItem 
          icon={<Layout size={20} />} 
          label="工作台 Workspace" 
          active={currentView === 'workspace'} 
          onClick={() => onChangeView('workspace')}
          collapsed={isCollapsed}
        />
        <SidebarItem 
          icon={<ShieldCheck size={20} />} 
          label="标准 Standards" 
          active={currentView === 'standards'} 
          onClick={() => onChangeView('standards')}
          collapsed={isCollapsed}
        />
        <SidebarItem 
          icon={<BookOpen size={20} />} 
          label="文档库 Library" 
          active={currentView === 'library'}
          onClick={() => onChangeView('library')}
          collapsed={isCollapsed} 
        />
        <div className="flex-1" />
        <SidebarItem 
          icon={<Settings size={20} />} 
          label="设置 Settings" 
          active={currentView === 'settings'} 
          onClick={() => onChangeView('settings')}
          collapsed={isCollapsed}
        />
      </nav>

      <div className={`p-4 border-t border-slate-800 ${isCollapsed ? 'hidden' : 'block'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs text-white font-bold flex-shrink-0 uppercase">
            {username.charAt(0)}
          </div>
          <div className="text-sm overflow-hidden">
            <div className="text-white font-medium truncate" title={user?.email}>{username}</div>
            <div className="text-xs text-slate-500 truncate">{user ? 'Standard Plan' : 'Guest'}</div>
          </div>
        </div>
      </div>
      
      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 bottom-8 bg-slate-800 text-slate-400 border border-slate-700 rounded-full p-1 hover:text-white hover:bg-blue-600 transition-colors shadow-md z-50"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  );
};

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick, collapsed }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 p-3 rounded-lg w-full transition-colors relative group ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
        : 'hover:bg-slate-800 hover:text-white'
    } ${collapsed ? 'justify-center' : ''}`}
    title={collapsed ? label : undefined}
  >
    {icon}
    {!collapsed && <span className="font-medium text-sm truncate animate-in fade-in duration-200">{label}</span>}
    
    {/* Tooltip for collapsed state */}
    {collapsed && (
      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50">
        {label}
      </div>
    )}
  </button>
);

export default Sidebar;
