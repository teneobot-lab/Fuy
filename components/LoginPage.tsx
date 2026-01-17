import React, { useState } from 'react';
import { User, AppSettings } from '../types';
import { Eye, EyeOff, LogIn, AlertCircle, ShieldCheck, Settings, X, Wifi, Save, CheckCircle2, Loader2, Database, Cloud } from 'lucide-react';
import { verifyPassword } from '../utils/security';
import { checkServerConnection, loginUser } from '../services/api';

interface LoginPageProps {
  users: User[];
  onLogin: (user: User) => void;
  isLoadingData: boolean;
  settings?: AppSettings;
  onUpdateSettings?: (settings: AppSettings) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ users, onLogin, isLoadingData, settings, onUpdateSettings }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempVpsUrl, setTempVpsUrl] = useState(settings?.vpsApiUrl || '/');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');
  const [connectionMsg, setConnectionMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsAnimating(true);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    try {
        if (!cleanUsername || !cleanPassword) throw new Error('Username & Password wajib diisi');

        const vpsUrl = settings?.vpsApiUrl || '/';
        
        // Coba login via server
        try {
            const result = await loginUser(vpsUrl, cleanUsername, cleanPassword);
            if (result.success && result.user) {
                onLogin(result.user);
                return;
            } else if (result.message && !result.message.includes('Network Error')) {
                throw new Error(result.message);
            }
        } catch (serverErr: any) {
            console.warn("Server unreachable, checking local...");
        }

        // Fallback lokal
        const foundUser = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
        if (foundUser) {
            const isValid = await verifyPassword(cleanPassword, foundUser.password || '');
            if (isValid) {
                onLogin(foundUser);
            } else {
                throw new Error('Password salah (Pastikan server aktif)');
            }
        } else {
            throw new Error('User tidak ditemukan.');
        }
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsAnimating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-50/50 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-slate-100/80 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-10 relative z-10 animate-in fade-in zoom-in duration-500">
        <button 
            onClick={() => setIsConfigOpen(true)}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
        >
            <Settings className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-900 rounded-xl mx-auto flex items-center justify-center shadow-lg mb-6 transform rotate-3">
                <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-slate-500 text-sm">Sign in to Power Inventory System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Username</label>
                <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-400 text-sm"
                    placeholder="Enter your username"
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-400 text-sm"
                        placeholder="••••••••"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-lg text-xs flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <button 
                type="submit" 
                disabled={isAnimating}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-lg shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-70 transition-all flex items-center justify-center gap-2 text-sm tracking-wide"
            >
                {isAnimating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LogIn className="w-4 h-4" /> Sign In</>}
            </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
                 <Database className="w-3 h-3 text-indigo-500" /> 
                 <span className="text-[10px] font-medium text-slate-500">Default: <b>admin</b> / <b>admin22</b></span>
             </div>
        </div>
      </div>

      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wide"><Settings className="w-4 h-4 text-slate-500" /> System Configuration</h3>
                    <button onClick={() => setIsConfigOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Backend API URL</label>
                        <input className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 font-mono" value={tempVpsUrl} onChange={(e) => setTempVpsUrl(e.target.value)} />
                    </div>
                    <button onClick={async () => {
                        setConnectionStatus('checking');
                        const r = await checkServerConnection(tempVpsUrl);
                        setConnectionStatus(r.online ? 'success' : 'failed');
                        setConnectionMsg(r.message);
                    }} className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors">
                        {connectionStatus === 'checking' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                        Check Connection
                    </button>
                    
                    {connectionMsg && (
                        <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 font-medium ${connectionStatus === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {connectionStatus === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {connectionMsg}
                        </div>
                    )}

                    <div className="pt-2 flex justify-end gap-3">
                        <button onClick={() => {
                            if (onUpdateSettings && settings) onUpdateSettings({ ...settings, vpsApiUrl: tempVpsUrl });
                            setIsConfigOpen(false);
                        }} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm">
                            <Save className="w-3 h-3" /> Save & Restart
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;