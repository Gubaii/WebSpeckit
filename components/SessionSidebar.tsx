import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, Trash2, Clock, Check, X, AlertCircle } from 'lucide-react';
import { ChatSession } from '../types';

interface SessionSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
}

const SessionSidebar: React.FC<SessionSidebarProps> = ({ 
  sessions, 
  currentSessionId, 
  onSelectSession, 
  onCreateSession,
  onDeleteSession
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Sort by date desc
  const sortedSessions = [...sessions].sort((a, b) => b.lastModified - a.lastModified);

  const formatDate = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday ? date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : date.toLocaleDateString();
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteConfirmId(id);
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    onDeleteSession(id);
    setDeleteConfirmId(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteConfirmId(null);
  };

  // Click outside to cancel deletion state
  useEffect(() => {
    const handleClickOutside = () => {
      if (deleteConfirmId) {
        setDeleteConfirmId(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [deleteConfirmId]);

  return (
    <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0 h-full overflow-hidden relative">
      <div className="p-3 border-b border-slate-200 bg-white flex-shrink-0 relative z-10">
        <button
          onClick={onCreateSession}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} />
          <span>新对话 (New Chat)</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1 relative z-0">
        {sortedSessions.length === 0 && (
            <div className="text-center text-slate-400 text-xs mt-8">
                暂无历史记录<br/>点击上方按钮开始
            </div>
        )}
        
        {sortedSessions.map((session) => (
          <div
            key={session.id}
            className={`group relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
              session.id === currentSessionId
                ? 'bg-white border border-slate-200 shadow-sm'
                : 'hover:bg-slate-100 border border-transparent'
            }`}
            onClick={() => onSelectSession(session.id)}
          >
            <MessageSquare 
                size={16} 
                className={`mt-0.5 flex-shrink-0 ${session.id === currentSessionId ? 'text-blue-500' : 'text-slate-400'}`} 
            />
            <div className="flex-1 min-w-0 pr-6">
              <h4 className={`text-sm font-medium truncate ${session.id === currentSessionId ? 'text-slate-800' : 'text-slate-600'}`}>
                {session.title}
              </h4>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                <Clock size={10} />
                <span>{formatDate(session.lastModified)}</span>
              </div>
            </div>
            
            {/* Delete Button (Trash Icon) - Only visible when not confirming */}
            {deleteConfirmId !== session.id && (
                <button
                    type="button"
                    onClick={(e) => handleDeleteClick(e, session.id)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 p-1.5 bg-white/80 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md border border-transparent hover:border-rose-100 shadow-sm transition-all z-20"
                    title="删除会话"
                >
                    <Trash2 size={14} className="pointer-events-none" />
                </button>
            )}

            {/* In-place Confirmation Overlay */}
            {deleteConfirmId === session.id && (
                <div 
                    className="absolute inset-0 bg-rose-50 rounded-lg flex items-center justify-between px-3 z-30 animate-in fade-in zoom-in-95 duration-200 border border-rose-100 shadow-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                    <span className="text-xs text-rose-700 font-medium flex items-center gap-1.5">
                        <AlertCircle size={14} />
                        确认删除?
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={(e) => confirmDelete(e, session.id)}
                            className="p-1.5 bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors shadow-sm"
                            title="确认删除"
                        >
                            <Check size={12} strokeWidth={3} />
                        </button>
                        <button
                            onClick={cancelDelete}
                            className="p-1.5 bg-white text-slate-500 border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                            title="取消"
                        >
                            <X size={12} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionSidebar;