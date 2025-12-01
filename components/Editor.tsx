
import React, { useState, useEffect, useRef } from 'react';
import { Save, Eye, Edit2, Download, Library, FileText, Columns, Maximize2, Minimize2, PanelLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createPortal } from 'react-dom';

interface EditorProps {
  fileName: string;
  content: string;
  onChange: (newContent: string) => void;
  onSaveToLibrary?: (name: string, content: string) => void;
}

interface SourceEditorProps {
    content: string;
    onChange: (val: string) => void;
    editorRef: React.RefObject<HTMLTextAreaElement | null>;
}

const SourceEditor: React.FC<SourceEditorProps> = ({ content, onChange, editorRef }) => (
    <div className="w-full h-full bg-white relative flex flex-col">
        <textarea
            ref={editorRef}
            className="flex-1 w-full h-full p-4 lg:p-6 resize-none outline-none font-mono text-sm text-slate-700 leading-relaxed bg-white"
            value={content}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            placeholder="Type markdown here..."
        />
    </div>
);

const MarkdownPreview: React.FC<{ content: string }> = ({ content }) => (
    <div className="w-full h-full p-4 lg:p-8 overflow-y-auto overflow-x-hidden bg-slate-50/50 markdown-preview">
        <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
                // Enhanced Table rendering with resizable columns
                table: ({node, ...props}) => (
                    <div className="overflow-x-auto w-full my-4 border border-slate-200 rounded-lg bg-white shadow-sm">
                        <table className="w-full text-left border-collapse min-w-full table-fixed" {...props} />
                    </div>
                ),
                thead: ({node, ...props}) => <thead className="bg-slate-50" {...props} />,
                th: ({node, ...props}) => (
                    <th 
                        className="px-4 py-2 border-b border-r border-slate-200 font-semibold text-slate-700 whitespace-nowrap resize-x overflow-hidden relative select-none" 
                        style={{ minWidth: '100px' }} // Ensure handle is grabbable
                        {...props} 
                    />
                ),
                td: ({node, ...props}) => <td className="px-4 py-2 border-b border-r border-slate-100 text-slate-600 break-words" {...props} />,
                // Custom Link rendering
                a: ({node, ...props}) => <a className="text-blue-600 hover:underline break-all" target="_blank" rel="noopener noreferrer" {...props} />,
                // Custom Code block rendering
                code: ({node, ...props}) => {
                    // @ts-ignore
                    const inline = props.inline || !String(props.className).includes('language-');
                    return (
                        <code 
                            className={`${inline ? 'bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-sm' : ''} break-words`} 
                            {...props} 
                        />
                    );
                }
            }}
        >
            {content}
        </ReactMarkdown>
    </div>
);

const Editor: React.FC<EditorProps> = ({ fileName, content, onChange, onSaveToLibrary }) => {
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Handle Fullscreen ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isFullscreen) {
            setIsFullscreen(false);
        }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderEditorUI = () => (
    <div className={`flex flex-col bg-white overflow-hidden min-w-0 transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-[9999]' : 'h-full w-full'
    }`}>
      {/* Toolbar Header */}
      <div className="h-12 border-b border-slate-200 flex items-center px-4 bg-white justify-between flex-shrink-0 select-none z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        
        {/* Left: File Info */}
        <div className="flex items-center gap-2 text-slate-600 min-w-0">
            <div className="p-1 bg-blue-50 text-blue-600 rounded">
                <FileText size={14} />
            </div>
            <span className="text-sm font-bold font-mono truncate">{fileName}</span>
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
           
           {/* View Toggle (Tab Style) */}
           <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
               <button 
                  onClick={() => setViewMode('edit')}
                  className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
                      viewMode === 'edit' 
                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                  title="Source Code"
               >
                   <Edit2 size={12} /> <span className="hidden sm:inline">源码</span>
               </button>
               <button 
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
                      viewMode === 'split' 
                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                  title="Split View"
               >
                   <Columns size={12} /> <span className="hidden sm:inline">分屏</span>
               </button>
               <button 
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
                      viewMode === 'preview' 
                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                  title="Preview Mode"
               >
                   <Eye size={12} /> <span className="hidden sm:inline">预览</span>
               </button>
           </div>

           <div className="h-4 w-px bg-slate-200 mx-1"></div>

           {/* Fullscreen Toggle */}
           <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={`p-1.5 rounded-md transition-colors flex items-center gap-1.5 ${isFullscreen ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
           >
               {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
               {isFullscreen && <span className="text-xs font-medium whitespace-nowrap">退出全屏</span>}
           </button>

           <div className="h-4 w-px bg-slate-200 mx-1"></div>

           {/* Helper Actions */}
           <div className="flex items-center gap-1">
               <button 
                    onClick={handleDownload}
                    className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors" 
                    title="Download File"
               >
                   <Download size={16} />
               </button>
               
               {onSaveToLibrary && (
                 <button 
                      onClick={() => onSaveToLibrary(fileName, content)}
                      className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors" 
                      title="Save to Library"
                 >
                     <Library size={16} />
                 </button>
               )}
           </div>
        </div>
      </div>
      
      {/* Editor Content Body */}
      <div className="flex-1 min-h-0 relative w-full flex">
        {viewMode === 'edit' && <SourceEditor content={content} onChange={onChange} editorRef={editorRef} />}
        {viewMode === 'preview' && <MarkdownPreview content={content} />}
        {viewMode === 'split' && (
            <>
                <div className="flex-1 min-w-0 border-r border-slate-200 h-full">
                    <SourceEditor content={content} onChange={onChange} editorRef={editorRef} />
                </div>
                <div className="flex-1 min-w-0 h-full bg-slate-50/30">
                    <MarkdownPreview content={content} />
                </div>
            </>
        )}
      </div>
    </div>
  );

  // Use Portal to break out of stacking context for robust fullscreen
  if (isFullscreen) {
      return createPortal(renderEditorUI(), document.body);
  }

  return renderEditorUI();
};

export default Editor;
