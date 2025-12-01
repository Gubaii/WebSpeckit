
import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Send, Bot, User, Sparkles, ChevronRight, Image as ImageIcon, X, Paperclip, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, ChatAction, Attachment } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, attachments?: Attachment[]) => void;
  onActionClick: (action: ChatAction) => void;
  isProcessing: boolean;
  processingStatus?: string;
  onStop?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, onActionClick, isProcessing, processingStatus, onStop }) => {
  const [input, setInput] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useLayoutEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      // Set height based on scrollHeight, capped at 160px
      const newHeight = Math.min(textareaRef.current.scrollHeight, 160);
      // Ensure minimum height matches the CSS (approx 48px for py-3)
      textareaRef.current.style.height = `${Math.max(48, newHeight)}px`;
    }
  }, [input]);

  // Use scrollTop to scroll safely without affecting parent layout (unlike scrollIntoView)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isProcessing, processingStatus, pendingAttachments]);

  const handleSend = () => {
    if ((!input.trim() && pendingAttachments.length === 0) || isProcessing) return;
    onSendMessage(input, pendingAttachments);
    setInput('');
    setPendingAttachments([]);
    // Reset height explicitly
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl + Enter or Cmd + Enter to send
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const processFiles = async (files: File[]) => {
    const newAttachments: Attachment[] = [];

    for (const file of files) {
      // Simple validation for images
      if (!file.type.startsWith('image/')) continue;

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = (event) => {
          if (event.target?.result) {
            resolve(event.target.result as string);
          }
        };
      });
      reader.readAsDataURL(file);
      
      const base64 = await base64Promise;
      newAttachments.push({
        id: `att-${Date.now()}-${Math.random()}`,
        type: 'image',
        mimeType: file.type,
        data: base64,
        name: file.name || 'image.png'
      });
    }

    if (newAttachments.length > 0) {
      setPendingAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
      // Reset input value so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
                files.push(file);
                // Prevent default to avoid pasting binary data or filename text if browser attempts to
                e.preventDefault(); 
            }
        }
    }
    
    if (files.length > 0) {
        await processFiles(files);
    }
  };

  const removeAttachment = (id: string) => {
    setPendingAttachments(prev => prev.filter(att => att.id !== id));
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full bg-slate-50 relative">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
        accept="image/png, image/jpeg, image/gif, image/webp" 
        multiple 
      />

      {/* Messages Area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.type === 'user' ? 'bg-slate-200' : 'bg-blue-600'
            }`}>
              {msg.type === 'user' ? <User size={16} className="text-slate-600" /> : <Bot size={16} className="text-white" />}
            </div>

            {/* Bubble */}
            <div className={`flex flex-col max-w-[85%] min-w-0 ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
              
              {/* Attachments rendering in bubble */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className={`flex flex-wrap gap-2 mb-2 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.attachments.map(att => (
                    <div key={att.id} className="relative rounded-lg overflow-hidden border border-slate-200 shadow-sm max-w-full">
                      <img 
                        src={att.data} 
                        alt={att.name} 
                        className="max-h-64 object-contain bg-slate-100" 
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm break-words overflow-hidden w-full ${
                msg.type === 'user' 
                  ? 'bg-white text-slate-800 rounded-tr-none border border-slate-100' 
                  : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
              }`}>
                {msg.type === 'user' ? (
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                ) : (
                    <div className="chat-markdown break-words">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                )}
              </div>

              {/* Actions */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {msg.actions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => onActionClick(action)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        action.type === 'primary' 
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Sparkles size={12} />
                      {action.label}
                      <ChevronRight size={12} className="opacity-50"/>
                    </button>
                  ))}
                </div>
              )}
              
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        
        {isProcessing && (
           <div className="flex gap-3 animate-in fade-in duration-300">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-white" />
              </div>
              <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex flex-col justify-center min-w-[120px]">
                 <div className="flex items-center gap-2 mb-1">
                     <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                     <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                     <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                 </div>
                 {processingStatus && (
                     <span className="text-xs text-slate-500 font-medium animate-pulse">{processingStatus}</span>
                 )}
              </div>
           </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        
        {/* Attachment Preview */}
        {pendingAttachments.length > 0 && (
          <div className="flex gap-3 mb-3 overflow-x-auto pb-2">
            {pendingAttachments.map(att => (
              <div key={att.id} className="relative group inline-block">
                <div className="h-16 w-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  <img src={att.data} alt={att.name} className="h-full w-full object-cover" />
                </div>
                <button 
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-600 transition-colors"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-2 max-w-3xl mx-auto w-full">
          
          <button
            onClick={triggerFileUpload}
            className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors mb-0.5"
            title="Upload Image"
          >
            <ImageIcon size={20} />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={pendingAttachments.length > 0 ? "请添加图片描述... (Ctrl+Enter 发送)" : "例如: 为销售团队 (角色) 开发一个 Web端 (平台) 的CRM仪表盘... (Ctrl+Enter 发送)"}
            className="flex-1 bg-slate-50 text-slate-900 text-sm rounded-xl border border-slate-200 p-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none overflow-hidden min-h-[48px]"
            rows={1}
            style={{ height: 'auto' }}
          />
          <button
            onClick={isProcessing ? onStop : handleSend}
            disabled={!isProcessing && (!input.trim() && pendingAttachments.length === 0)}
            className={`absolute right-2 bottom-2 p-1.5 rounded-lg transition-colors ${
                isProcessing 
                ? 'bg-rose-500 text-white hover:bg-rose-600' 
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600'
            }`}
            title={isProcessing ? "停止生成" : "发送 (Ctrl+Enter)"}
          >
            {isProcessing ? <Square size={16} fill="currentColor" /> : <Send size={16} />}
          </button>
        </div>
        <div className="text-center mt-2">
            <span className="text-[10px] text-slate-400">SpecKit AI can make mistakes. Please review generated documents.</span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
