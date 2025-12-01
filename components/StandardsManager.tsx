
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ShieldCheck, FileCode, ChevronRight, Book, LayoutTemplate, Box, Zap, Terminal, Workflow, RefreshCw, Lock, Folder, FolderOpen, Plus, Edit, Trash2, Check, X, AlertCircle } from 'lucide-react';
import Editor from './Editor';
import { FileNode } from '../types';

interface StandardsManagerProps {
  files: FileNode[];
  onUpdateFiles: (files: FileNode[]) => void;
  onSync?: () => void;
  isSyncing?: boolean;
  readOnly?: boolean;
}

// Navigation Item Interface
interface NavItem {
    label: string;
    fileId?: string; // If file
    folderId?: string; // If folder
    desc?: string;
    icon?: React.ReactNode;
    children?: NavItem[];
    isFolder?: boolean;
    isOpen?: boolean; // UI state for local rendering
}

// --- Custom Dialog Component ---
const SimpleDialog: React.FC<{
    isOpen: boolean;
    title: string;
    onClose: () => void;
    onSubmit: (value: string) => void;
    placeholder?: string;
}> = ({ isOpen, title, onClose, onSubmit, placeholder }) => {
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setValue('');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6">
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSubmit(value);
                            if (e.key === 'Escape') onClose();
                        }}
                        placeholder={placeholder}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm"
                    />
                    <div className="flex justify-end gap-2 mt-6">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => onSubmit(value)}
                            disabled={!value.trim()}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StandardsManager: React.FC<StandardsManagerProps> = ({ files, onUpdateFiles, onSync, isSyncing, readOnly }) => {
  const [activeFileId, setActiveFileId] = useState<string | null>('ch-core');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    '部门宪章 (Charters)': true,
    '通用标准 (Standards)': true
  });
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // --- Interaction States ---
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [addDialogState, setAddDialogState] = useState<{ isOpen: boolean, folderId: string | null }>({ isOpen: false, folderId: null });

  const renameInputRef = useRef<HTMLInputElement>(null);

  // Focus input when renaming starts
  useEffect(() => {
      if (renamingId && renameInputRef.current) {
          renameInputRef.current.focus();
      }
  }, [renamingId]);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const toggleFolder = (label: string) => {
      setExpandedFolders(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // --- Tree Helpers ---
  const findFile = (nodes: FileNode[], id: string | null): FileNode | null => {
    if (!id) return null;
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findFile(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const updateFileContent = (nodes: FileNode[], id: string, newContent: string): FileNode[] => {
    return nodes.map(node => {
      if (node.id === id) return { ...node, content: newContent };
      if (node.children) return { ...node, children: updateFileContent(node.children, id, newContent) };
      return node;
    });
  };

  const addFileToFolder = (nodes: FileNode[], folderId: string, name: string, content: string = ""): FileNode[] => {
      return nodes.map(node => {
          if (node.id === folderId && node.type === 'folder') {
              return { ...node, children: [...(node.children || []), { id: `file-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, name, type: 'file', content }] };
          }
          if (node.children) {
              return { ...node, children: addFileToFolder(node.children, folderId, name, content) };
          }
          return node;
      });
  };

  const deleteNodeFromTree = (nodes: FileNode[], nodeId: string): FileNode[] => {
      return nodes.filter(node => node.id !== nodeId).map(node => ({
          ...node,
          children: node.children ? deleteNodeFromTree(node.children, nodeId) : undefined
      }));
  };

  const renameNodeInTree = (nodes: FileNode[], nodeId: string, newName: string): FileNode[] => {
      return nodes.map(node => {
          if (node.id === nodeId) return { ...node, name: newName };
          if (node.children) return { ...node, children: renameNodeInTree(node.children, nodeId, newName) };
          return node;
      });
  };

  // --- Actions ---

  // 1. ADD
  const openAddDialog = (e: React.MouseEvent, folderId: string) => {
      e.stopPropagation();
      setAddDialogState({ isOpen: true, folderId });
  };

  const submitAddFile = (name: string) => {
      if (name && name.trim() && addDialogState.folderId) {
          onUpdateFiles(addFileToFolder(files, addDialogState.folderId, name.trim(), "# New Charter\n\n"));
      }
      setAddDialogState({ isOpen: false, folderId: null });
  };

  // 2. RENAME
  const startRename = (e: React.MouseEvent, id: string, currentName: string) => {
      e.stopPropagation();
      setRenamingId(id);
      setRenameValue(currentName);
      setDeletingId(null); // Clear other states
  };

  const submitRename = () => {
      if (renamingId && renameValue.trim()) {
          onUpdateFiles(renameNodeInTree(files, renamingId, renameValue.trim()));
      }
      setRenamingId(null);
  };

  // 3. DELETE
  const startDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setDeletingId(id);
      setRenamingId(null);
  };

  const confirmDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (deletingId) {
          onUpdateFiles(deleteNodeFromTree(files, deletingId));
          if (activeFileId === deletingId) setActiveFileId(null);
      }
      setDeletingId(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      setDeletingId(null);
  };

  // --- Dynamic Navigation Building ---
  const navGroups = useMemo(() => {
    // Recursive builder to handle mixed folders/files
    const buildNavFromNodes = (nodes: FileNode[]): NavItem[] => {
        return nodes.map(node => ({
            label: node.name,
            fileId: node.type === 'file' ? node.id : undefined,
            folderId: node.type === 'folder' ? node.id : undefined,
            desc: node.type === 'file' ? 'Charter Document' : undefined,
            isFolder: node.type === 'folder',
            children: node.children ? buildNavFromNodes(node.children) : undefined
        }));
    };
    
    const sysChartersNode = findFile(files, 'sys-charters');
    const dynamicCharterItems = sysChartersNode?.children ? buildNavFromNodes(sysChartersNode.children) : [];

    return [
        { title: '部门宪章 (Charters)', icon: <ShieldCheck size={16} className="text-purple-500" />, items: dynamicCharterItems, isEditable: true },
        { title: '系统指令 (Commands)', icon: <Terminal size={16} className="text-slate-600" />, items: [
              { label: '需求生成 (Specify)', fileId: 'cmd-specify', desc: 'speckit.specify.md' },
              { label: '需求澄清 (Clarify)', fileId: 'cmd-clarify', desc: 'speckit.clarify.md' },
              { label: '质量检查 (Checklist)', fileId: 'cmd-checklist', desc: 'speckit.checklist.md' },
              { label: '技术设计 (TechDetail)', fileId: 'cmd-tech', desc: 'speckit.techdetail.md' },
              { label: '自动测试 (AutoTest)', fileId: 'cmd-autotest', desc: 'speckit.autotest.md' },
              { label: '任务分解 (Tasks)', fileId: 'cmd-tasks', desc: 'speckit.tasks.md' },
              { label: '代码执行 (Implement)', fileId: 'cmd-implement', desc: 'speckit.implement.md' },
              { label: '进度监控 (Status)', fileId: 'cmd-status', desc: 'speckit.status.md' },
              { label: '一致性分析 (Analyze)', fileId: 'cmd-analyze', desc: 'speckit.analyze.md' },
              { label: '宪章管理 (Constitution)', fileId: 'cmd-constitution', desc: 'speckit.constitution.md' },
              { label: '计划生成 (Plan)', fileId: 'cmd-plan', desc: 'speckit.plan.md' },
              { label: 'Issue转换 (ToIssues)', fileId: 'cmd-issues', desc: 'speckit.taskstoissues.md' },
        ]},
        { title: '自动化脚本 (Scripts)', icon: <Workflow size={16} className="text-orange-500" />, items: [
              { label: '通用函数库', fileId: 'sh-common', desc: 'common.sh' },
              { label: '新功能脚手架', fileId: 'sh-create', desc: 'create-new-feature.sh' },
              { label: '环境检查', fileId: 'sh-check', desc: 'check-prerequisites.sh' },
              { label: '宪章加载器', fileId: 'sh-load', desc: 'load-constitution.sh' },
              { label: '计划初始化', fileId: 'sh-setup', desc: 'setup-plan.sh' },
              { label: 'Agent上下文更新', fileId: 'sh-update', desc: 'update-agent-context.sh' },
        ]},
        { title: '通用标准 (Standards)', icon: <Book size={16} className="text-blue-500" />, items: [
            { label: '需求撰写标准', fileId: 'std-spec', desc: '需求文档编写规范' },
            { label: '知识库标准', fileId: 'std-kb', desc: '文档编写与维护' },
            { label: 'Markdown标准', fileId: 'std-md', desc: '格式与排版规范' },
            { label: '埋点设计标准', fileId: 'std-test', desc: '数据埋点与验收标准' },
            { label: '测试验收表标准', fileId: 'std-test-table', desc: '测试用例编写规范' },
        ]},
        { title: '需求模板 (Templates)', icon: <LayoutTemplate size={16} className="text-amber-500" />, items: [
            { label: '需求规格说明书', fileId: 'tpl-spec', desc: 'Spec 核心文档模板' },
        ]},
        { title: '技术文档模板 (Tech)', icon: <Box size={16} className="text-emerald-500" />, items: [
            { label: '总览模板', fileId: 'tpl-tech-ov', desc: 'Technical Overview' },
            { label: '后台模板', fileId: 'tpl-tech-be', desc: 'Backend Tech Design' },
            { label: 'WEB模板', fileId: 'tpl-tech-web', desc: 'Web Tech Design' },
            { label: 'APP模板', fileId: 'tpl-tech-app', desc: 'App Tech Design' },
            { label: 'PC模板', fileId: 'tpl-tech-pc', desc: 'PC Tech Design' },
            { label: '固件模板', fileId: 'tpl-tech-fw', desc: 'Firmware Tech Design' },
            { label: '跨端集成模板', fileId: 'tpl-tech-int', desc: 'Integration Design' },
        ]},
        { title: '自动测试模板 (AutoTest)', icon: <Zap size={16} className="text-rose-500" />, items: [
            { label: '总览模板', fileId: 'tpl-test-ov', desc: 'Testing Strategy' },
            { label: '后台模板', fileId: 'tpl-test-be', desc: 'Backend Test Cases' },
            { label: 'WEB模板', fileId: 'tpl-test-web', desc: 'Web Test Cases' },
            { label: 'APP模板', fileId: 'tpl-test-app', desc: 'App Test Cases' },
            { label: 'PC模板', fileId: 'tpl-test-pc', desc: 'PC Test Cases' },
            { label: '固件模板', fileId: 'tpl-test-fw', desc: 'Firmware Test Cases' },
            { label: '跨端集成模板', fileId: 'tpl-test-int', desc: 'Integration Tests' },
        ]}
    ];
  }, [files]);

  // Recursive Render
  const renderNavItems = (items: NavItem[], depth = 0, isGroupEditable = false) => {
      return items.map((item, idx) => {
          const isActive = item.fileId === activeFileId;
          const isFolderOpen = expandedFolders[item.label] ?? true;
          const paddingLeft = `${depth * 12 + 12}px`;
          const showActions = !readOnly && isGroupEditable;

          // IDs for state matching
          const nodeId = item.fileId || item.folderId;
          const isRenaming = nodeId === renamingId;
          const isDeleting = nodeId === deletingId;

          // --- FOLDER RENDER ---
          if (item.isFolder) {
              return (
                  <div key={`folder-${item.label}-${idx}`} className="group/folder relative">
                      <div className="flex items-center pr-2 hover:bg-slate-100 rounded-r-lg">
                          <button
                              onClick={() => toggleFolder(item.label)}
                              className="flex-1 text-left py-1.5 flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                              style={{ paddingLeft }}
                          >
                              {isFolderOpen ? <FolderOpen size={14} /> : <Folder size={14} />}
                              <span>{item.label}</span>
                          </button>
                          
                          {showActions && (
                              <div className="flex items-center opacity-0 group-hover/folder:opacity-100 transition-opacity gap-1">
                                  {item.folderId && (
                                      <>
                                          <button 
                                            onClick={(e) => openAddDialog(e, item.folderId!)}
                                            className="p-1 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded"
                                            title="Add Charter"
                                          >
                                              <Plus size={12} />
                                          </button>
                                      </>
                                  )}
                              </div>
                          )}
                      </div>
                      {isFolderOpen && item.children && (
                          <div>{renderNavItems(item.children, depth + 1, isGroupEditable)}</div>
                      )}
                  </div>
              )
          }

          // --- FILE RENDER ---
          return (
            <div key={item.fileId || `item-${idx}`} className="group/item relative">
                <button
                    onClick={() => {
                        if (!isRenaming && !isDeleting && item.fileId) setActiveFileId(item.fileId)
                    }}
                    className={`w-full text-left py-2 rounded-lg text-sm transition-all flex items-center justify-between ${
                        isActive 
                            ? 'bg-white text-purple-700 shadow-sm border border-slate-100 font-medium' 
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    style={{ paddingLeft: depth > 0 ? paddingLeft : '12px', paddingRight: '12px' }}
                >
                    {isRenaming ? (
                        <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={submitRename}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') submitRename();
                                if (e.key === 'Escape') setRenamingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-sm px-1 py-0.5 border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                        />
                    ) : (
                        <>
                            <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                                <span className="truncate">{item.label}</span>
                                {item.desc && (
                                    <span className={`text-[10px] truncate ${isActive ? 'text-purple-400' : 'text-slate-400 group-hover/item:text-slate-500'}`}>
                                        {item.desc}
                                    </span>
                                )}
                            </div>
                            {isActive && !isDeleting && <ChevronRight size={14} className="text-purple-500 flex-shrink-0" />}
                        </>
                    )}
                </button>
                
                {/* Actions Hover */}
                {showActions && item.fileId && !isRenaming && !isDeleting && (
                     <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 bg-white/50 backdrop-blur-sm rounded-lg px-1 py-0.5 shadow-sm z-10">
                         <button 
                            onClick={(e) => startRename(e, item.fileId!, item.label)}
                            className="p-1 hover:bg-slate-200 text-slate-400 hover:text-blue-600 rounded"
                            title="Rename"
                         >
                            <Edit size={12} />
                         </button>
                         <button 
                            onClick={(e) => startDelete(e, item.fileId!)}
                            className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete"
                         >
                            <Trash2 size={12} />
                         </button>
                     </div>
                )}

                {/* IN-PLACE DELETE CONFIRMATION OVERLAY */}
                {isDeleting && (
                    <div 
                        className="absolute inset-0 bg-rose-50 rounded-lg flex items-center justify-between px-3 z-20 border border-rose-100 shadow-sm animate-in fade-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                        style={{ marginLeft: depth > 0 ? paddingLeft : '12px' }} // Match indentation
                    >
                        <span className="text-xs text-rose-700 font-medium flex items-center gap-1.5">
                            <AlertCircle size={14} />
                            Confirm?
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={confirmDelete}
                                className="p-1 bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors shadow-sm"
                            >
                                <Check size={12} strokeWidth={3} />
                            </button>
                            <button
                                onClick={cancelDelete}
                                className="p-1 bg-white text-slate-500 border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                            >
                                <X size={12} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
          );
      });
  };

  const handleEditorChange = (content: string) => {
    if (readOnly) return; 
    if (activeFileId) {
        onUpdateFiles(updateFileContent(files, activeFileId, content));
    }
  };

  const activeFile = findFile(files, activeFileId);

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden">
        {/* Main Content: Split View */}
        <div className="flex-1 flex min-w-0 h-full">
            {/* Left: Friendly Navigation Sidebar */}
            <div className="w-72 border-r border-slate-200 bg-slate-50 flex flex-col h-full overflow-hidden">
                 {/* Header in Sidebar */}
                 <div className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-purple-600" />
                        <h1 className="text-sm font-bold text-slate-800">标准与宪章</h1>
                    </div>
                     {!readOnly && onSync && (
                        <button 
                            onClick={onSync}
                            disabled={isSyncing}
                            className={`p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-500 ${isSyncing ? 'animate-spin' : ''}`}
                            title="从云端同步"
                        >
                            <RefreshCw size={14} />
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {navGroups.map((group, gIdx) => {
                        const isOpen = expandedGroups[group.title];
                        // @ts-ignore
                        const isEditable = group.isEditable || false;

                        return (
                            <div key={gIdx} className="mb-2">
                                <button
                                    onClick={() => toggleGroup(group.title)}
                                    className="w-full flex items-center justify-between px-2 py-2 mb-1 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors uppercase tracking-wider select-none"
                                >
                                    <div className="flex items-center gap-2">
                                        {group.icon}
                                        <span>{group.title}</span>
                                    </div>
                                    <ChevronRight 
                                        size={14} 
                                        className={`transition-transform duration-200 text-slate-400 ${isOpen ? 'rotate-90' : ''}`}
                                    />
                                </button>
                                
                                {isOpen && (
                                    <div className="space-y-1 pl-2">
                                        {renderNavItems(group.items, 0, isEditable)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right: Editor */}
            <div className="flex-1 bg-white min-w-0 flex flex-col h-full overflow-hidden relative">
                {activeFile && activeFile.type === 'file' ? (
                    <Editor 
                        key={activeFile.id}
                        fileName={activeFile.name} 
                        content={activeFile.content || ''} 
                        onChange={handleEditorChange} 
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                        <FileCode size={48} className="opacity-20 mb-4" />
                        <p className="text-sm font-medium text-slate-500">文件未找到或未初始化</p>
                        <p className="text-xs mt-1 text-slate-400">请检查系统文件配置</p>
                    </div>
                )}
            </div>
        </div>

        {/* Add File Dialog */}
        <SimpleDialog 
            isOpen={addDialogState.isOpen}
            title="Create New Charter"
            placeholder="e.g. sub-rules.md"
            onClose={() => setAddDialogState({ isOpen: false, folderId: null })}
            onSubmit={submitAddFile}
        />
    </div>
  );
};

export default StandardsManager;
