
import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, CheckSquare, Square, Info } from 'lucide-react';
import { signInWithEmail, signUpWithEmail } from '../services/supabase';

interface AuthViewProps {
    onLoginSuccess: (user: any) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rememberMe, setRememberMe] = useState(true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = isLogin 
                ? await signInWithEmail(email, password)
                : await signUpWithEmail(email, password);

            if (error) {
                if (error.message.includes("Email not confirmed")) {
                    setError("Email not confirmed. Please check your inbox OR disable 'Confirm email' in your Supabase Dashboard.");
                } else {
                    setError(error.message);
                }
            } else if (data.user && data.session) {
                // SUCCESS: Only log in if we have a valid session token
                onLoginSuccess(data.user);
            } else if (data.user && !data.session) {
                // User created but waiting for confirmation
                setError("Account created! Please verify your email to log in (or disable Email Confirmation in Supabase Settings).");
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-slate-800">Welcome to SpecKit</h1>
                        <p className="text-slate-500 mt-2">Intelligent Specification Studio</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-lg flex flex-col gap-2 text-sm text-rose-600">
                            <div className="flex items-start gap-2">
                                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                            {error.includes("Supabase") && (
                                <div className="mt-2 text-xs bg-rose-100/50 p-2 rounded text-rose-700">
                                    <strong>Dev Hint:</strong> Go to Supabase Dashboard &rarr; Authentication &rarr; Providers &rarr; Email &rarr; Disable <em>"Confirm email"</em> to allow immediate login.
                                </div>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="email" 
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="name@company.com"
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="password" 
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••"
                                    minLength={6}
                                    autoComplete={isLogin ? "current-password" : "new-password"}
                                />
                            </div>
                        </div>

                        {isLogin && (
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                                {rememberMe ? (
                                    <CheckSquare size={16} className="text-blue-600" />
                                ) : (
                                    <Square size={16} className="text-slate-400" />
                                )}
                                <span className="text-sm text-slate-600 select-none">Remember password</span>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                            ) : (
                                isLogin ? <><LogIn size={18} /> Sign In</> : <><UserPlus size={18} /> Create Account</>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-slate-500">
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                        </span>
                        <button 
                            onClick={() => { setIsLogin(!isLogin); setError(null); }}
                            className="text-blue-600 font-medium hover:underline"
                        >
                            {isLogin ? "Sign Up" : "Sign In"}
                        </button>
                    </div>
                </div>
                <div className="bg-slate-50 p-4 text-center text-xs text-slate-400 border-t border-slate-100 flex items-center justify-center gap-1">
                    <Info size={12} />
                    Protected by Supabase Authentication
                </div>
            </div>
        </div>
    );
};

export default AuthView;
