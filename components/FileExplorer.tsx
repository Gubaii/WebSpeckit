
import React, { useState, useRef, useEffect } from 'react';
import { Folder, FolderOpen, FileText, FileCode, FileCheck, Trash2, Edit, Check, X, AlertCircle } from 'lucide-react';
import { FileNode } from '../types';

interface FileExplorerProps {
  files: FileNode[];
  activeFileId: string | null;
  onFileClick: (fileId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onRenameFile?: (fileId: string, newName: string) => void;
  onDeleteFile?: (fileId: string) => void;
  title?: string;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ 
  files, 
  activeFileId, 
  onFileClick, 
  onToggleFolder, 
  onRenameFile, 
  onDeleteFile, 
  title = "Project Files" 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
        inputRef.current.focus();
    }
  }, [editingId]);

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

  const startRenaming = (node: FileNode, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setDeleteConfirmId(null);
      if (onRenameFile) {
          setEditingId(node.id);
          setEditValue(node.name);
      }
  };

  const handleRenameSubmit = () => {
      if (editingId && editValue.trim() && onRenameFile) {
          onRenameFile(editingId, editValue.trim());
      }
      setEditingId(null);
  };

  const handleDeleteClick = (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingId(null);
      setDeleteConfirmId(nodeId);
  };

  const confirmDelete = (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (onDeleteFile) {
          onDeleteFile(nodeId);
      }
      setDeleteConfirmId(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      setDeleteConfirmId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          handleRenameSubmit();
      } else if (e.key === 'Escape') {
          setEditingId(null);
      }
  };

  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      const isFolder = node.type === 'folder';
      const isActive = node.id === activeFileId;
      const isRenaming = node.id === editingId;
      const isDeleting = node.id === deleteConfirmId;
      const paddingLeft = `${depth * 12 + 12}px`;

      return (
        <div key={node.id} className="relative">
          <div
            className={`
              flex items-center gap-2 py-1.5 pr-2 cursor-pointer text-sm select-none truncate relative group/file-row
              ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-slate-100 text-slate-700'}
            `}
            style={{ paddingLeft }}
            onClick={() => {
              if (!isRenaming && !isDeleting) {
                  if (isFolder) {
                    onToggleFolder(node.id);
                  } else {
                    onFileClick(node.id);
                  }
              }
            }}
            onDoubleClick={(e) => {
                if (!isFolder && onRenameFile && !isDeleting) {
                     startRenaming(node, e);
                }
            }}
          >
            <div className="flex-shrink-0">
                {isFolder ? (
                node.isOpen ? <FolderOpen size={16} className="text-blue-500 fill-blue-500/20" /> : <Folder size={16} className="text-slate-400 fill-slate-400/20" />
                ) : (
                getFileIcon(node.name)
                )}
            </div>
            
            {isRenaming ? (
                <input 
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-w-0 px-1 py-0.5 border border-blue-400 rounded bg-white text-slate-900 text-sm focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <span className="truncate flex-1">{node.name}</span>
            )}
            
            {/* Actions (Edit / Delete) - Appear on Hover */}
            {!isRenaming && !isDeleting && (onRenameFile || onDeleteFile) && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/file-row:opacity-100 bg-white/50 backdrop-blur-sm rounded-lg px-1 py-0.5 transition-opacity z-10">
                     {onRenameFile && (
                         <button 
                            onClick={(e) => startRenaming(node, e)}
                            className="p-1 hover:bg-slate-200 text-slate-400 hover:text-blue-600 rounded transition-colors"
                            title="Rename"
                         >
                             <Edit size={12} />
                         </button>
                     )}
                     {onDeleteFile && (
                         <button 
                            onClick={(e) => handleDeleteClick(node.id, e)}
                            className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Delete"
                         >
                             <Trash2 size={12} />
                         </button>
                     )}
                </div>
            )}

             {/* IN-PLACE DELETE CONFIRMATION OVERLAY */}
             {isDeleting && (
                <div 
                    className="absolute inset-0 bg-rose-50 rounded-r-lg flex items-center justify-between px-2 z-20 border-y border-r border-rose-100 shadow-sm animate-in fade-in duration-200"
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginLeft: paddingLeft }} // Overlay starts from indentation
                >
                    <span className="text-xs text-rose-700 font-medium flex items-center gap-1.5 truncate">
                        <AlertCircle size={12} />
                        Confirm?
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            onClick={(e) => confirmDelete(node.id, e)}
                            className="p-1 bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors shadow-sm"
                        >
                            <Check size={10} strokeWidth={3} />
                        </button>
                        <button
                            onClick={cancelDelete}
                            className="p-1 bg-white text-slate-500 border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                        >
                            <X size={10} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            )}
          </div>
          {isFolder && node.isOpen && node.children && (
            <div>{renderTree(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  const getFileIcon = (name: string) => {
    if (name.endsWith('.md')) return <FileText size={16} className="text-emerald-600" />;
    if (name.endsWith('.ts') || name.endsWith('.json') || name.endsWith('.vue')) return <FileCode size={16} className="text-amber-600" />;
    return <FileCheck size={16} className="text-slate-400" />;
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200">
      <div className="p-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="flex-1 overflow-y-auto py-2" onClick={() => setEditingId(null)}>
        {files.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-400 italic">
                Empty directory.
            </div>
        ) : (
            renderTree(files)
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
