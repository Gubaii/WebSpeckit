

import React from 'react';
import { Save, Key, Cpu, AlertTriangle, RefreshCw, CheckCircle, AlertCircle, LogOut, User, ExternalLink, Lock } from 'lucide-react';
import { AppSettings } from '../types';
import { GOOGLE_API_KEY_URL } from '../constants';
import { signOut, updateUserPassword } from '../services/supabase';

interface SettingsViewProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onResetSystem: () => void;
  userEmail?: string;
  isAdmin?: boolean;
}

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSave, onResetSystem, userEmail, isAdmin }) => {
  const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);
  const [showKey, setShowKey] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Password Change State
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [pwdStatus, setPwdStatus] = React.useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleChange = (field: keyof AppSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    if (saveStatus) setSaveStatus(null);
  };

  const handleSave = () => {
    try {
      onSave(localSettings);
      setSaveStatus({ type: 'success', message: 'Configuration saved successfully!' });
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    } catch (e) {
      setSaveStatus({ type: 'error', message: 'Failed to save settings.' });
    }
  };

  const handleLogout = async () => {
      await signOut();
      window.location.reload();
  };

  const handleChangePassword = async () => {
      if (newPassword.length < 6) {
          setPwdStatus({ type: 'error', message: 'Password must be at least 6 characters.' });
          return;
      }
      if (newPassword !== confirmPassword) {
          setPwdStatus({ type: 'error', message: 'Passwords do not match.' });
          return;
      }

      setPwdStatus({ type: 'success', message: 'Updating...' });
      const { error } = await updateUserPassword(newPassword);
      
      if (error) {
          setPwdStatus({ type: 'error', message: error.message });
      } else {
          setPwdStatus({ type: 'success', message: 'Password updated successfully.' });
          setNewPassword('');
          setConfirmPassword('');
      }
  };

  return (
    <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
          <p className="text-slate-500 mt-1">Manage your account, AI keys, and preferences</p>
        </div>

        {/* User Profile */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <User className="text-indigo-600" size={20} />
                    <h2 className="font-semibold text-slate-800">User Profile</h2>
                </div>
            </div>
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="text-sm font-medium text-slate-900">Signed in as</div>
                        <div className="text-sm text-slate-500 font-mono mt-1">{userEmail}</div>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm font-medium"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
                
                {/* Change Password Section */}
                <div className="border-t border-slate-100 pt-6">
                    <h3 className="text-sm font-medium text-slate-800 mb-4 flex items-center gap-2">
                        <Lock size={14} className="text-slate-400" /> 
                        Change Password
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            autoComplete="new-password"
                        />
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                         <div>
                            {pwdStatus && (
                                <span className={`text-xs ${pwdStatus.type === 'success' ? 'text-green-600' : 'text-rose-600'}`}>
                                    {pwdStatus.message}
                                </span>
                            )}
                         </div>
                         <button 
                            onClick={handleChangePassword}
                            disabled={!newPassword || !confirmPassword}
                            className="text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Update Password
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* AI Configuration */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Cpu className="text-blue-600" size={20} />
            <h2 className="font-semibold text-slate-800">Model Configuration</h2>
          </div>
          
          <div className="p-6 space-y-6">
            {/* API Key */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-slate-700">Gemini API Key</label>
                  <a href={GOOGLE_API_KEY_URL} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      Get API Key <ExternalLink size={10} />
                  </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key size={16} className="text-slate-400" />
                </div>
                <input
                  type={showKey ? "text" : "password"}
                  value={localSettings.apiKey}
                  onChange={(e) => handleChange('apiKey', e.target.value)}
                  placeholder="AIzaSy..."
                  className="block w-full pl-10 pr-20 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors text-sm font-mono"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 px-3 text-xs text-slate-500 font-medium hover:text-slate-700"
                >
                  {showKey ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              <p className="text-xs text-slate-400">Your API key is stored securely in your private cloud storage.</p>
            </div>

            {/* Model Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Model</label>
                <select
                  value={localSettings.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm bg-white"
                >
                  <option value="gemini-3-pro-preview">Gemini 3.0 Pro (Preview)</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Standard)</option>
                  <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite (Fast)</option>
                  <option value="gemini-2.0-pro-exp">Gemini 2.0 Pro (Experimental)</option>
                </select>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="pt-4 flex items-center justify-end gap-3">
               {saveStatus && (
                 <div className={`flex items-center gap-1.5 text-sm font-medium animate-in fade-in slide-in-from-right-2 duration-300 ${
                   saveStatus.type === 'success' ? 'text-green-600' : 'text-rose-600'
                 }`}>
                   {saveStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                   {saveStatus.message}
                 </div>
               )}
               <button
                 onClick={handleSave}
                 className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all shadow-sm active:scale-95"
               >
                 <Save size={18} />
                 Save Configuration
               </button>
            </div>
          </div>
        </div>

        {/* System Management (Admin Only) */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={20} />
              <h2 className="font-semibold text-slate-800">Danger Zone (Admin Only)</h2>
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900">Reset System Data</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Restore default templates, charters, and commands. This will overwrite your custom standards.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to reset all standard files to default? This cannot be undone.')) {
                      onResetSystem();
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 font-medium transition-colors"
                >
                  <RefreshCw size={16} />
                  Reset Standards
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SettingsView;