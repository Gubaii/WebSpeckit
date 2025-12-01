
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileCode, Cloud, AlertCircle, CheckCircle, Info, Library as LibraryIcon, Layout, BookOpen, Edit2, Columns, Eye, Download, Save, PanelLeft, PanelRight } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import FileExplorer from './components/FileExplorer';
import ChatInterface from './components/ChatInterface';
import Editor from './components/Editor';
import StandardsManager from './components/StandardsManager';
import SettingsView from './components/SettingsView';
import SessionSidebar from './components/SessionSidebar';
import AuthView from './components/AuthView';
import WelcomeModal from './components/WelcomeModal';
import { INITIAL_FILES, INITIAL_CHAT_MESSAGES, INITIAL_SYSTEM_FILES, SUPABASE_CONFIG, ADMIN_EMAILS } from './constants';
import { ProjectState, FileNode, ChatAction, AppView, AppSettings, ToastMessage, ChatSession, ChatMessage, Attachment } from './types';
import { handleUserMessage, handleActionClick } from './services/mockSpecKit';
import { initSupabase, saveToCloud, loadFromCloud, getCurrentUser, isConnected } from './services/supabase';

// Helper for default project state
const createDefaultProjectState = (sessionId?: string): ProjectState => ({
    sessionId,
    name: "New Project",
    logs: [],
    files: JSON.parse(JSON.stringify(INITIAL_FILES)), // Deep copy
    activeFileId: null,
    chatHistory: JSON.parse(JSON.stringify(INITIAL_CHAT_MESSAGES)),
    currentStep: 'init',
    requirementContext: '',
    clarificationRound: 0,
    completedSteps: []
});

// Helper to patch missing system files
const patchMissingSystemFiles = (currentFiles: FileNode[]): FileNode[] => {
    const patchRecursive = (current: FileNode[], baseline: FileNode[]): FileNode[] => {
        const patched = [...current];
        baseline.forEach(baseNode => {
            const existingNode = patched.find(n => n.id === baseNode.id);
            if (!existingNode) {
                patched.push(JSON.parse(JSON.stringify(baseNode)));
            } else if (baseNode.type === 'folder' && baseNode.children && existingNode.children) {
                existingNode.children = patchRecursive(existingNode.children, baseNode.children);
            }
        });
        return patched;
    };
    return patchRecursive(currentFiles, INITIAL_SYSTEM_FILES);
};

// Component to show when no file is selected
const EmptyEditorState = () => (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden">
        <div className="h-12 border-b border-slate-200 flex items-center px-4 bg-slate-50/50 justify-between flex-shrink-0 select-none text-slate-400">
             <div className="flex items-center gap-2">
                 <div className="p-1 bg-slate-200/50 rounded text-slate-400">
                     <FileCode size={14} />
                 </div>
                 <span className="text-sm font-bold font-mono text-slate-400">No File Selected</span>
             </div>
             <div className="flex items-center gap-3 opacity-40 cursor-not-allowed select-none">
                 <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <div className="px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5"><Edit2 size={12}/> 源码</div>
                      <div className="px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5"><Columns size={12}/> 分屏</div>
                      <div className="px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5"><Eye size={12}/> 预览</div>
                 </div>
                 <div className="h-4 w-px bg-slate-200 mx-1"></div>
                 <div className="p-1.5"><Download size={16}/></div>
             </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50/30">
             <FileCode size={64} className="mb-4 opacity-20" />
             <p>Select a file to view content</p>
        </div>
    </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  
  // --- STATE ---
  const [currentView, setCurrentView] = useState<AppView>('workspace');
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [projectState, setProjectState] = useState<ProjectState>(() => createDefaultProjectState());

  const [systemFiles, setSystemFiles] = useState<FileNode[]>(INITIAL_SYSTEM_FILES);
  
  const [settings, setSettings] = useState<AppSettings>({
      apiKey: '',
      model: 'gemini-3-pro-preview', // DEFAULT MODEL CHANGED
      useMock: true,
      supabaseUrl: SUPABASE_CONFIG.url,
      supabaseKey: SUPABASE_CONFIG.key
  });

  const [libraryFiles, setLibraryFiles] = useState<FileNode[]>([{ id: 'lib-root', name: 'My Library', type: 'folder', isOpen: true, children: [] }]);
  const [libraryActiveId, setLibraryActiveId] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(''); 
  const abortControllerRef = useRef<AbortController | null>(null);

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saved' | 'error'>('idle');
  const [isCloudReady, setIsCloudReady] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Layout State
  const [chatWidth, setChatWidth] = useState(450);
  const [explorerWidth, setExplorerWidth] = useState(256);
  const chatResizingRef = useRef(false);
  const explorerResizingRef = useRef(false);
  const [isSessionSidebarOpen, setIsSessionSidebarOpen] = useState(true);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(true);

  // --- Auth & Init ---
  useEffect(() => {
      // 1. Init Supabase
      if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.key) {
          initSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
      }
      
      // 2. Check User
      const checkUser = async () => {
          const u = await getCurrentUser();
          setUser(u);
          setLoadingUser(false);
      };
      checkUser();
  }, []);

  const isAdmin = user && user.email && ADMIN_EMAILS.includes(user.email);

  // --- Data Loading after Auth ---
  useEffect(() => {
      if (!user) return;

      const loadUserData = async () => {
          setIsCloudReady(false);
          setSyncStatus('syncing');

          try {
              // 1. Settings (User Specific)
              const { data: remoteSettings } = await loadFromCloud(`u_${user.id}_settings`);
              if (remoteSettings) {
                  setSettings(prev => ({ ...prev, ...remoteSettings }));
                  // Check if key is missing for existing user
                  if (!remoteSettings.apiKey) {
                      setShowApiKeyModal(true);
                  }
              } else {
                  // New user or no settings saved yet
                  setShowApiKeyModal(true);
              }

              // 2. System Files (Global)
              // Only admins can save, but everyone loads global
              const { data: remoteSystemFiles } = await loadFromCloud('specKit_systemFiles');
              if (remoteSystemFiles) {
                  setSystemFiles(patchMissingSystemFiles(remoteSystemFiles));
              }

              // 3. Sessions (User Specific)
              const { data: remoteSessions } = await loadFromCloud(`u_${user.id}_sessions`);
              let loadedSessions: ChatSession[] = [];
              if (remoteSessions) {
                  loadedSessions = remoteSessions;
                  setSessions(loadedSessions);
              } else {
                  // If no cloud sessions, maybe create default
                  if (loadedSessions.length === 0) {
                       const newId = `sess-${Date.now()}`;
                       const newState = createDefaultProjectState(newId);
                       loadedSessions = [{ id: newId, title: '新对话 (New Chat)', lastModified: Date.now(), data: newState }];
                       setSessions(loadedSessions);
                  }
              }
              
              // 4. Library (User Specific)
              const { data: remoteLibrary } = await loadFromCloud(`u_${user.id}_library`);
              if (remoteLibrary) {
                  setLibraryFiles(remoteLibrary);
              }

              // Restore active session
              if (loadedSessions.length > 0) {
                  const savedId = localStorage.getItem(`specKit_${user.id}_currentSessionId`);
                  const targetSession = loadedSessions.find(s => s.id === savedId) || loadedSessions[0];
                  setCurrentSessionId(targetSession.id);
                  setProjectState({
                      ...targetSession.data,
                      sessionId: targetSession.id,
                      completedSteps: targetSession.data.completedSteps || []
                  });
              }

              setSyncStatus('saved');
          } catch (e) {
              console.error("Data load failed", e);
              setSyncStatus('error');
          } finally {
              setIsCloudReady(true);
          }
      };

      loadUserData();
  }, [user]);

  // --- Persistence Handlers ---

  // 1. Auto-save State to current session memory
  useEffect(() => {
     if (currentSessionId && projectState && user) {
         if (projectState.sessionId && projectState.sessionId !== currentSessionId) return;

         setSessions(prev => {
             const sessionIndex = prev.findIndex(s => s.id === currentSessionId);
             if (sessionIndex === -1) return prev;
             const currentSession = prev[sessionIndex];
             if (JSON.stringify(currentSession.data) === JSON.stringify(projectState)) return prev;

             let title = currentSession.title;
             if (currentSession.title === '新对话 (New Chat)' && projectState.chatHistory.length > 2) {
                 const firstUserMsg = projectState.chatHistory.find(m => m.type === 'user');
                 if (firstUserMsg) {
                     title = firstUserMsg.content.slice(0, 15) + (firstUserMsg.content.length > 15 ? '...' : '');
                 }
             }
             
             const newSessions = [...prev];
             newSessions[sessionIndex] = { ...currentSession, title, lastModified: Date.now(), data: projectState };
             return newSessions;
         });
     }
  }, [projectState, currentSessionId, user]);

  // 2. Sync Sessions
  useEffect(() => {
      if (!user || !isCloudReady || sessions.length === 0) return;
      
      const timeoutId = setTimeout(() => {
          setSyncStatus('syncing');
          saveToCloud(`u_${user.id}_sessions`, sessions).then(({ error }) => {
              setSyncStatus(error ? 'error' : 'saved');
          });
          // Local storage backup
          localStorage.setItem(`specKit_${user.id}_currentSessionId`, currentSessionId || '');
      }, 3000);
      return () => clearTimeout(timeoutId);
  }, [sessions, currentSessionId, user, isCloudReady]);

  // 3. Sync Settings
  useEffect(() => {
      if (!user || !isCloudReady) return;
      const timeoutId = setTimeout(() => {
          saveToCloud(`u_${user.id}_settings`, settings);
      }, 2000);
      return () => clearTimeout(timeoutId);
  }, [settings, user, isCloudReady]);

  // 4. Sync Library
  useEffect(() => {
      if (!user || !isCloudReady) return;
      const timeoutId = setTimeout(() => {
          saveToCloud(`u_${user.id}_library`, libraryFiles);
      }, 3000);
      return () => clearTimeout(timeoutId);
  }, [libraryFiles, user, isCloudReady]);

  // 5. Sync System Files (ADMIN ONLY)
  useEffect(() => {
      if (!user || !isCloudReady || !isAdmin) return;
      const timeoutId = setTimeout(() => {
           setSyncStatus('syncing');
           saveToCloud('specKit_systemFiles', systemFiles).then(({ error }) => {
               setSyncStatus(error ? 'error' : 'saved');
           });
      }, 3000);
      return () => clearTimeout(timeoutId);
  }, [systemFiles, user, isCloudReady, isAdmin]);

  // --- Handlers ---
  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
      const id = Date.now().toString();
      setToasts(prev => [...prev, { id, type, message }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const createNewSession = () => {
      const newId = `sess-${Date.now()}`;
      const newState = createDefaultProjectState(newId);
      const newSession: ChatSession = { id: newId, title: '新对话 (New Chat)', lastModified: Date.now(), data: newState };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newId);
      setProjectState(newState);
      addToast('success', '已创建新对话');
  };

  const loadSession = (id: string) => {
      const session = sessions.find(s => s.id === id);
      if (session) {
          setCurrentSessionId(id);
          setProjectState({ ...session.data, sessionId: id, completedSteps: session.data.completedSteps || [] });
      }
  };

  const deleteSession = (id: string) => {
      const isDeletingActive = id === currentSessionId;
      const newSessions = sessions.filter(s => s.id !== id);
      if (newSessions.length === 0) {
          createNewSession();
      } else {
          setSessions(newSessions);
          if (isDeletingActive) {
             const nextSession = newSessions[0];
             setCurrentSessionId(nextSession.id);
             setProjectState({ ...nextSession.data, sessionId: nextSession.id, completedSteps: nextSession.data.completedSteps || [] });
          }
      }
      addToast('info', '会话已删除');
  };

  const handleManualSync = async () => {
      if (!user) return;
      setSyncStatus('syncing');
      try {
          const { data: sys } = await loadFromCloud('specKit_systemFiles');
          if (sys) setSystemFiles(patchMissingSystemFiles(sys));
          const { data: sess } = await loadFromCloud(`u_${user.id}_sessions`);
          if (sess) setSessions(sess); // Simplified overwrite for manual sync
          setSyncStatus('saved');
          addToast('success', 'Manual sync completed');
      } catch (e) {
          setSyncStatus('error');
          addToast('error', 'Sync failed');
      }
  };

  // ... (Other handlers like rename, delete file, chat logic are largely same but use state) ...
  // Re-implementing simplified versions for brevity as they depend on state variables defined above

  const handleChatMouseDown = (e: React.MouseEvent) => { e.preventDefault(); chatResizingRef.current = true; document.addEventListener('mousemove', handleChatMouseMove); document.addEventListener('mouseup', handleChatMouseUp); };
  const handleChatMouseMove = useCallback((e: MouseEvent) => { if (chatResizingRef.current) setChatWidth(prev => Math.max(300, Math.min(800, prev + e.movementX))); }, []);
  const handleChatMouseUp = useCallback(() => { chatResizingRef.current = false; document.removeEventListener('mousemove', handleChatMouseMove); document.removeEventListener('mouseup', handleChatMouseUp); }, [handleChatMouseMove]);
  const handleExplorerMouseDown = (e: React.MouseEvent) => { e.preventDefault(); explorerResizingRef.current = true; document.addEventListener('mousemove', handleExplorerMouseMove); document.addEventListener('mouseup', handleExplorerMouseUp); };
  const handleExplorerMouseMove = useCallback((e: MouseEvent) => { if (explorerResizingRef.current) setExplorerWidth(prev => Math.max(150, Math.min(600, prev + e.movementX))); }, []);
  const handleExplorerMouseUp = useCallback(() => { explorerResizingRef.current = false; document.removeEventListener('mousemove', handleExplorerMouseMove); document.removeEventListener('mouseup', handleExplorerMouseUp); }, [handleExplorerMouseMove]);

  const handleSendMessage = async (text: string, attachments: Attachment[] = []) => {
      if (!text.trim() && attachments.length === 0) return;
      const newUserMsg: ChatMessage = { id: `user-${Date.now()}`, type: 'user', content: text, timestamp: Date.now(), attachments };
      setProjectState(prev => ({ ...prev, chatHistory: [...prev.chatHistory, newUserMsg] }));
      
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsProcessing(true);
      setProcessingStatus("Thinking...");

      try {
          const result = await handleUserMessage(text, projectState.files, projectState.currentStep, systemFiles, settings, projectState, (s) => setProcessingStatus(s), attachments, controller.signal);
          setProjectState(prev => ({ ...prev, files: result.files, chatHistory: [...prev.chatHistory, ...result.messages], currentStep: result.nextStep, activeFileId: result.activeFileId || prev.activeFileId, requirementContext: result.updatedContext || prev.requirementContext, clarificationRound: result.updatedRound !== undefined ? result.updatedRound : prev.clarificationRound }));
      } catch (error: any) { if (error.name !== 'AbortError') { console.error(error); addToast('error', 'Failed'); } } 
      finally { setIsProcessing(false); setProcessingStatus(""); }
  };

  const handleChatAction = async (action: ChatAction) => {
      // VISUAL FEEDBACK: Insert user message with selection
      const feedbackMsg: ChatMessage = {
          id: `user-act-${Date.now()}`,
          type: 'user',
          content: `✅ ${action.label}`, 
          timestamp: Date.now()
      };
      setProjectState(prev => ({
          ...prev,
          chatHistory: [...prev.chatHistory, feedbackMsg]
      }));

      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsProcessing(true); setProcessingStatus("Executing...");
      try {
           const result = await handleActionClick(action.handlerId, projectState.files, systemFiles, settings, action.label, projectState, (s) => setProcessingStatus(s), controller.signal);
           setProjectState(prev => ({ ...prev, files: result.files, chatHistory: [...prev.chatHistory, ...result.messages], currentStep: result.nextStep, activeFileId: result.activeFileId || prev.activeFileId, requirementContext: result.updatedContext || prev.requirementContext, clarificationRound: result.updatedRound !== undefined ? result.updatedRound : prev.clarificationRound, completedSteps: result.completedSteps || prev.completedSteps }));
      } catch (error: any) { if (error.name !== 'AbortError') { console.error(error); addToast('error', 'Failed'); } }
      finally { setIsProcessing(false); setProcessingStatus(""); }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Helper Wrappers for Explorer
  const toggleProjectFolder = (id: string) => {
      const toggle = (nodes: FileNode[]): FileNode[] => nodes.map(n => n.id === id ? { ...n, isOpen: !n.isOpen } : { ...n, children: n.children ? toggle(n.children) : undefined });
      setProjectState(p => ({ ...p, files: toggle(p.files) }));
  };
  const renameProjectFile = (id: string, name: string) => {
      const ren = (nodes: FileNode[]): FileNode[] => nodes.map(n => n.id === id ? { ...n, name } : { ...n, children: n.children ? ren(n.children) : undefined });
      setProjectState(p => ({ ...p, files: ren(p.files) }));
  };
  const deleteProjectFile = (id: string) => {
      const del = (nodes: FileNode[]): FileNode[] => nodes.filter(n => { if (n.id === id) return false; if (n.children) n.children = del(n.children); return true; });
      setProjectState(p => ({ ...p, files: del(p.files), activeFileId: p.activeFileId === id ? null : p.activeFileId }));
  };
  const updateProjectFile = (content: string) => {
      if (!projectState.activeFileId) return;
      const upd = (nodes: FileNode[]): FileNode[] => nodes.map(n => n.id === projectState.activeFileId ? { ...n, content } : { ...n, children: n.children ? upd(n.children) : undefined });
      setProjectState(p => ({ ...p, files: upd(p.files) }));
  };
  
  // Library Helpers
  const toggleLibFolder = (id: string) => { setLibraryFiles(prev => { const t = (nodes: FileNode[]): FileNode[] => nodes.map(n => n.id === id ? { ...n, isOpen: !n.isOpen } : { ...n, children: n.children ? t(n.children) : undefined }); return t(prev); }); };
  const renameLibFile = (id: string, name: string) => { setLibraryFiles(prev => { const r = (nodes: FileNode[]): FileNode[] => nodes.map(n => n.id === id ? { ...n, name } : { ...n, children: n.children ? r(n.children) : undefined }); return r(prev); }); };
  const deleteLibFile = (id: string) => { setLibraryFiles(prev => { const d = (nodes: FileNode[]): FileNode[] => nodes.filter(n => { if (n.id === id) return false; if (n.children) n.children = d(n.children); return true; }); return d(prev); }); if (libraryActiveId === id) setLibraryActiveId(null); };
  const saveToLibrary = (name: string, content: string) => { setLibraryFiles(prev => { const updated = [...prev]; const newFile = { id: `lib-${Date.now()}`, name, type: 'file' as const, content }; if (updated[0].children) updated[0].children.push(newFile); else updated.push(newFile); return updated; }); addToast('success', 'Saved to Library'); };
  const updateLibFile = (content: string) => { if (!libraryActiveId) return; setLibraryFiles(prev => { const u = (nodes: FileNode[]): FileNode[] => nodes.map(n => n.id === libraryActiveId ? { ...n, content } : { ...n, children: n.children ? u(n.children) : undefined }); return u(prev); }); };

  // Render Logic
  if (loadingUser) {
      return <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-slate-400">Loading...</div>;
  }

  if (!user) {
      return <AuthView onLoginSuccess={setUser} />;
  }

  const getActiveFile = (nodes: FileNode[], id: string | null) => { if (!id) return null; for (const n of nodes) { if (n.id === id) return n; if (n.children) { const f = getActiveFile(n.children, id); if (f) return f; } } return null; };
  const activeFile = getActiveFile(projectState.files, projectState.activeFileId);
  const activeLibFile = getActiveFile(libraryFiles, libraryActiveId);

  const WORKFLOW_STEPS = [{id:'specify',label:'1. Specify'},{id:'checklist',label:'2. Check'},{id:'techdetail',label:'3. Tech'},{id:'autotest',label:'4. Test'},{id:'tasks',label:'5. Tasks'},{id:'implement',label:'6. Code'},{id:'analyze',label:'7. Analyze'}];

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} user={user} />

      <main className="flex-1 flex min-w-0 relative">
        <WelcomeModal 
            isOpen={showApiKeyModal}
            onGoToSettings={() => {
                setShowApiKeyModal(false);
                setCurrentView('settings');
            }}
            onClose={() => setShowApiKeyModal(false)}
        />
        <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => (
                <div key={toast.id} className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-top-2 fade-in duration-300 ${toast.type === 'success' ? 'bg-green-600 text-white' : toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle size={16} /> : toast.type === 'error' ? <AlertCircle size={16} /> : <Info size={16} />}
                    {toast.message}
                </div>
            ))}
        </div>

        {currentView === 'standards' && (
            <StandardsManager 
                files={systemFiles}
                onUpdateFiles={setSystemFiles}
                onSync={handleManualSync}
                isSyncing={syncStatus === 'syncing'}
                readOnly={!isAdmin} // Lock for non-admins
            />
        )}

        {currentView === 'library' && (
            <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-50">
                <div className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between flex-shrink-0 relative z-20">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><BookOpen size={20} /></div>
                        <div><h1 className="text-sm font-bold text-slate-800">文档库 Library</h1></div>
                    </div>
                </div>
                <div className="flex-1 flex bg-white min-w-0 overflow-hidden">
                    <div className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
                        <FileExplorer files={libraryFiles} activeFileId={libraryActiveId} onFileClick={setLibraryActiveId} onToggleFolder={toggleLibFolder} onRenameFile={renameLibFile} onDeleteFile={deleteLibFile} title="Document Library" />
                    </div>
                    <div className="flex-1 min-w-0 bg-white flex flex-col h-full overflow-hidden relative">
                        {activeLibFile ? <Editor key={libraryActiveId} fileName={activeLibFile.name} content={activeLibFile.content || ''} onChange={updateLibFile} /> : <EmptyEditorState />}
                    </div>
                </div>
            </div>
        )}

        {currentView === 'workspace' && (
            <div className="h-full w-full flex flex-col bg-slate-50 min-w-0">
                <div className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between flex-shrink-0 z-30">
                    <div className="flex items-center gap-3">
                         <button onClick={() => setIsSessionSidebarOpen(!isSessionSidebarOpen)} className={`p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors ${!isSessionSidebarOpen && 'text-blue-600 bg-blue-50'}`}><PanelLeft size={18} /></button>
                         <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Layout size={20} /></div>
                         <div className="hidden sm:block"><h1 className="text-sm font-bold text-slate-800">工作台 Workspace</h1></div>
                    </div>
                    <div className="flex items-center gap-2">
                            <button onClick={() => setIsFileExplorerOpen(!isFileExplorerOpen)} className={`p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors mr-2 ${!isFileExplorerOpen && 'text-blue-600 bg-blue-50'}`}><PanelRight size={18} /></button>
                            {syncStatus !== 'idle' && (<div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${syncStatus === 'error' ? 'bg-red-50 text-red-600 border-red-200' : syncStatus === 'syncing' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}><Cloud size={10} />{syncStatus === 'syncing' ? 'Sync...' : syncStatus === 'error' ? 'Err' : 'Cloud'}</div>)}
                            <div className={`text-[10px] px-2 py-0.5 rounded border ${settings.apiKey ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{settings.apiKey ? 'AI Online' : 'Mock'}</div>
                    </div>
                </div>
                <div className="flex-1 flex min-h-0 overflow-hidden relative z-0">
                    {isSessionSidebarOpen && <SessionSidebar sessions={sessions} currentSessionId={currentSessionId} onSelectSession={loadSession} onCreateSession={createNewSession} onDeleteSession={deleteSession} />}
                    <div className="flex flex-col border-r border-slate-200 shadow-md z-10 bg-white relative flex-shrink-0 h-full" style={{ width: chatWidth }}>
                        <div className="h-14 border-b border-slate-200 bg-white flex items-center px-4 justify-between flex-shrink-0"><span className="font-bold text-slate-700 truncate">{sessions.find(s => s.id === currentSessionId)?.title || 'SpecKit'}</span></div>
                        <div className="h-8 bg-slate-50 flex border-b border-slate-200 flex-shrink-0">
                            {WORKFLOW_STEPS.map((step, idx) => {
                                const steps = projectState.completedSteps || [];
                                const isCompleted = steps.includes(step.id);
                                const isActive = !isCompleted && (idx === 0 || steps.includes(WORKFLOW_STEPS[idx-1].id));
                                return <div key={step.id} className={`flex-1 flex items-center justify-center text-[10px] font-medium border-r border-slate-100 ${isCompleted ? 'bg-green-50 text-green-600' : isActive ? 'bg-blue-50 text-blue-600 animate-pulse' : 'text-slate-400'}`}>{step.label}</div>;
                            })}
                        </div>
                        <ChatInterface messages={projectState.chatHistory} onSendMessage={handleSendMessage} onActionClick={handleChatAction} isProcessing={isProcessing} processingStatus={processingStatus} onStop={handleStopGeneration} />
                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 hover:w-1.5 transition-all z-20" onMouseDown={handleChatMouseDown} />
                    </div>
                    <div className="flex-1 flex min-w-0 bg-white h-full overflow-hidden relative">
                        {isFileExplorerOpen && (
                            <div className="flex-shrink-0 bg-slate-50 border-r border-slate-200 h-full flex flex-col relative" style={{ width: explorerWidth }}>
                                <FileExplorer files={projectState.files} activeFileId={projectState.activeFileId} onFileClick={(id) => setProjectState(p => ({ ...p, activeFileId: id }))} onToggleFolder={toggleProjectFolder} onRenameFile={renameProjectFile} onDeleteFile={deleteProjectFile} />
                                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 hover:w-1.5 transition-all z-20 translate-x-1/2" onMouseDown={handleExplorerMouseDown} />
                            </div>
                        )}
                        <div className="flex-1 min-w-0 bg-white flex flex-col h-full overflow-hidden relative">
                            {activeFile ? <Editor key={activeFile.id} fileName={activeFile.name} content={activeFile.content || ''} onChange={updateProjectFile} onSaveToLibrary={saveToLibrary} /> : <EmptyEditorState />}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {currentView === 'settings' && (
            <SettingsView 
                settings={settings} 
                onSave={(newSettings) => { setSettings(newSettings); /* Trigger auto-save effect */ }}
                onResetSystem={() => { setSystemFiles(INITIAL_SYSTEM_FILES); addToast('info', 'System reset'); }}
                userEmail={user.email}
                isAdmin={isAdmin} // Pass admin status
            />
        )}
      </main>
    </div>
  );
}
