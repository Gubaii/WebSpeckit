
import React from 'react';
import { Key, Settings, ArrowRight, X } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onGoToSettings: () => void;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onGoToSettings, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 relative">
        <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
            <X size={20} />
        </button>

        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key size={32} />
          </div>

          <h2 className="text-xl font-bold text-slate-800 mb-2">Welcome to SpecKit!</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            To start generating specifications and designs with AI, you need to configure your <strong>Google Gemini API Key</strong> first.
          </p>

          <button
            onClick={onGoToSettings}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 group"
          >
            <Settings size={18} />
            <span>Go to Settings</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
