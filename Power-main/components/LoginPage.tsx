
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-100">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 relative z-10 animate-in fade-in zoom-in duration-500">
        <button 
            onClick={() => setIsConfigOpen(true)}
            className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-full transition-all"
        >
            <Settings className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4 transform rotate-3 hover:rotate-6 transition-transform">
                <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Power Inventory</h1>
            <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
                <Database className="w-3.5 h-3.5" /> 
                Gunakan <b>admin</b> / <b>admin22</b>
            </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Username</label>
                <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                    placeholder="Masukkan username"
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Password</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                        placeholder="••••••••"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-xs flex items-center gap-2 animate-pulse">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <button 
                type="submit" 
                disabled={isAnimating}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
                {isAnimating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5" /> Masuk Aplikasi</>}
            </button>
        </form>

        <div className="mt-8 pt-4 border-t border-white/5 text-center flex flex-col items-center gap-3">
             <div className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <Cloud className="w-3 h-3 text-emerald-500" />
                 Bypass: <b>powerinventory2024</b>
             </div>
        </div>
      </div>

      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                    <h3 className="font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5 text-blue-500" /> Server Config</h3>
                    <button onClick={() => setIsConfigOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">VPS API URL</label>
                        <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono" value={tempVpsUrl} onChange={(e) => setTempVpsUrl(e.target.value)} />
                    </div>
                    <button onClick={async () => {
                        setConnectionStatus('checking');
                        const r = await checkServerConnection(tempVpsUrl);
                        setConnectionStatus(r.online ? 'success' : 'failed');
                        setConnectionMsg(r.message);
                    }} className="w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 flex items-center justify-center gap-2 border border-slate-700">
                        {connectionStatus === 'checking' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                        Tes Koneksi
                    </button>
                    <div className="pt-4 flex justify-end gap-3">
                        <button onClick={() => {
                            if (onUpdateSettings && settings) onUpdateSettings({ ...settings, vpsApiUrl: tempVpsUrl });
                            setIsConfigOpen(false);
                        }} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-2">
                            <Save className="w-3 h-3" /> Simpan & Restart
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
