import React, { useState, useEffect, useRef } from 'react';
import { User, AppSettings, UserRole } from '../types';
import { generateId, saveToStorage, loadFromStorage } from '../utils/storageUtils';
import { checkServerConnection } from '../services/api';
import { hashPassword } from '../utils/security';
import { Save, Shield, X, Globe, Loader2, Wifi, CheckCircle2, AlertCircle, FileSpreadsheet, RefreshCw, Clock, Database, Trash2, Edit2, Wrench, Download, Upload, RotateCcw, XCircle } from 'lucide-react';

interface AdminPanelProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onFullSyncToSheets?: () => Promise<boolean>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  settings, onUpdateSettings, 
  users, onAddUser, onUpdateUser, onDeleteUser, onFullSyncToSheets
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'cloud' | 'migration'>('settings');
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({});
  
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');
  const [connectionMsg, setConnectionMsg] = useState('');

  const importFileRef = useRef<HTMLInputElement>(null);

  // Sinkronisasi ulang jika props settings berubah
  useEffect(() => { 
    setTempSettings(prev => ({
        ...prev,
        ...settings,
        viteGasUrl: settings.viteGasUrl || '' // Pastikan tidak undefined
    })); 
  }, [settings]);

  // Reset status saat tab berubah
  useEffect(() => {
    setConnectionStatus('idle');
    setConnectionMsg('');
  }, [activeTab]);

  const handleSaveSettings = () => {
    onUpdateSettings(tempSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestConnection = async (type: 'vps' | 'gas') => {
      const url = type === 'vps' ? tempSettings.vpsApiUrl : tempSettings.viteGasUrl;
      if (!url || url === '/') {
          setConnectionStatus('failed');
          setConnectionMsg('URL tidak boleh kosong untuk tes.');
          return;
      }
      setConnectionStatus('checking');
      setConnectionMsg('Sedang menghubungi server...');
      
      const result = await checkServerConnection(url);
      setConnectionStatus(result.online ? 'success' : 'failed');
      setConnectionMsg(result.message);
  };

  const handleManualSync = async () => {
      if (!onFullSyncToSheets) return;
      setIsSyncing(true);
      try {
          const success = await onFullSyncToSheets();
          if (success) {
            // Update local timestamp after successful sync
            setTempSettings(prev => ({ ...prev, lastSheetSync: new Date().toISOString() }));
          }
      } catch (e) {
          console.error("Sync error:", e);
      } finally {
          setIsSyncing(false);
      }
  };

  const exportAllData = () => {
    const data = {
      inventory: loadFromStorage('smartstock_inventory', []),
      transactions: loadFromStorage('smartstock_transactions', []),
      reject_inventory: loadFromStorage('smartstock_reject_inventory', []),
      rejects: loadFromStorage('smartstock_rejects', []),
      suppliers: loadFromStorage('smartstock_suppliers', []),
      users: loadFromStorage('smartstock_users', []),
      settings: loadFromStorage('smartstock_settings', {})
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PowerInventory_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (confirm("Import data akan menimpa data lokal saat ini. Lanjutkan?")) {
            if (data.inventory) saveToStorage('smartstock_inventory', data.inventory);
            if (data.transactions) saveToStorage('smartstock_transactions', data.transactions);
            if (data.settings) saveToStorage('smartstock_settings', data.settings);
            alert("Data berhasil diimpor. Silakan refresh halaman.");
            window.location.reload();
        }
      } catch (err) {
        alert("Gagal membaca file backup.");
      }
    };
    reader.readAsText(file);
  };

  const resetLocalCache = () => {
    if (confirm("Hapus seluruh cache data lokal di browser? Anda akan keluar otomatis.")) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    }
  };

  // Helper aman untuk cek includes pada URL yang mungkin undefined
  const isGasUrlValid = (url?: string) => (url || '').includes('script.google.com');

  const getButtonStyles = (status: string) => {
    if (status === 'success') return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200';
    if (status === 'failed') return 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200';
    if (status === 'checking') return 'bg-slate-700 text-slate-300 cursor-wait';
    return 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200';
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full overflow-hidden">
      <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-2 flex-shrink-0">
          <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <Globe className="w-4 h-4" /> 
            <span>Pengaturan Server</span>
          </button>
          <button onClick={() => setActiveTab('cloud')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'cloud' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <FileSpreadsheet className="w-4 h-4" /> 
            <span>Integrasi Sheets</span>
          </button>
          <button onClick={() => setActiveTab('migration')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'migration' ? 'bg-amber-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <Wrench className="w-4 h-4" /> 
            <span>Setup & Migrasi</span>
          </button>
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <Shield className="w-4 h-4" /> 
            <span>Manajemen Akses</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-6">
          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
               <h2 className="text-xl font-extrabold text-slate-800 mb-2 flex items-center gap-3">
                 <Database className="w-6 h-6 text-blue-500" /> 
                 VPS Configuration
               </h2>
               <p className="text-slate-500 text-sm mb-8 italic">Konfigurasi alamat server backend (Node.js/Express).</p>
               <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Backend API URL</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input 
                            type="text" 
                            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono bg-slate-50" 
                            placeholder="http://178.128.106.33:3000" 
                            value={tempSettings.vpsApiUrl || ''} 
                            onChange={(e) => setTempSettings({...tempSettings, vpsApiUrl: e.target.value})} 
                        />
                        <button 
                            onClick={() => handleTestConnection('vps')} 
                            disabled={connectionStatus === 'checking'}
                            className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-all ${getButtonStyles(connectionStatus)}`}
                        >
                           {connectionStatus === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                            connectionStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> : 
                            connectionStatus === 'failed' ? <XCircle className="w-4 h-4" /> : 
                            <Wifi className="w-4 h-4" />}
                           {connectionStatus === 'checking' ? 'Mengecek...' : 'Tes Koneksi'}
                        </button>
                    </div>
                    {connectionMsg && (
                      <div className={`mt-3 p-3 rounded-xl text-xs font-bold border flex items-center gap-2 animate-in slide-in-from-top-2 ${connectionStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : connectionStatus === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {connectionStatus === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : connectionStatus === 'failed' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Loader2 className="w-4 h-4 shrink-0 animate-spin" />}
                          {connectionMsg}
                      </div>
                    )}
                  </div>
                  <div className="pt-6 border-t flex items-center gap-4">
                     <button onClick={handleSaveSettings} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95">
                        <Save className="w-4 h-4" /> Simpan Pengaturan
                     </button>
                     {isSaved && <span className="text-emerald-600 text-sm font-bold animate-pulse"><CheckCircle2 className="inline w-4 h-4 mr-1" /> Tersimpan</span>}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
               <h2 className="text-xl font-extrabold text-slate-800 mb-2 flex items-center gap-3">
                 <FileSpreadsheet className="w-7 h-7 text-emerald-600" /> 
                 Integrasi Google Sheets
               </h2>
               <p className="text-slate-500 text-sm mb-8">Gunakan Google Apps Script untuk sinkronisasi database ke Spreadsheet secara berkala.</p>
               <div className="space-y-8">
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Google Apps Script (GAS) Web App URL</label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input 
                                type="url" 
                                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono" 
                                placeholder="https://script.google.com/macros/s/.../exec" 
                                value={tempSettings.viteGasUrl || ''} 
                                onChange={(e) => setTempSettings({...tempSettings, viteGasUrl: e.target.value})} 
                            />
                            <button 
                                onClick={() => handleTestConnection('gas')} 
                                disabled={connectionStatus === 'checking'}
                                className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-all ${getButtonStyles(connectionStatus)}`}
                            >
                                {connectionStatus === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                                 connectionStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> : 
                                 connectionStatus === 'failed' ? <XCircle className="w-4 h-4" /> : 
                                 <Wifi className="w-4 h-4" />}
                                {connectionStatus === 'checking' ? 'Mengecek...' : 'Tes GAS'}
                            </button>
                        </div>
                    </div>
                    {connectionMsg && (
                        <div className={`p-3 rounded-xl text-xs font-bold border flex items-center gap-2 animate-in slide-in-from-top-2 ${connectionStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : connectionStatus === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                            {connectionStatus === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : connectionStatus === 'failed' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Loader2 className="w-4 h-4 shrink-0 animate-spin" />}
                            {connectionMsg}
                        </div>
                    )}
                    <button onClick={handleSaveSettings} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">
                        Simpan URL Sheets
                    </button>
                  </div>

                  <div className="p-8 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                        <h4 className="font-bold text-emerald-800 text-lg flex items-center gap-2">
                            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} /> 
                            Sinkronisasi Database
                        </h4>
                        <p className="text-sm text-emerald-600 mt-1 italic">Kirim seluruh data lokal (Inventory, Transaksi, Users) ke Google Sheets sekarang.</p>
                        {tempSettings.lastSheetSync && (
                            <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-emerald-700/60 uppercase">
                                <Clock className="w-3 h-3" />
                                Terakhir Sync: {new Date(tempSettings.lastSheetSync).toLocaleString('id-ID')}
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={handleManualSync}
                        disabled={isSyncing || !isGasUrlValid(tempSettings.viteGasUrl)}
                        className="w-full md:w-auto px-10 py-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-2xl text-sm font-black shadow-xl shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
                        SYNC KE SPREADSHEETS
                    </button>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'migration' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
               <h2 className="text-xl font-extrabold text-slate-800 mb-2 flex items-center gap-3">
                 <Wrench className="w-6 h-6 text-amber-500" /> 
                 Setup & Migrasi Data
               </h2>
               <p className="text-slate-500 text-sm mb-8 italic">Kelola backup database lokal dan pembersihan data browser.</p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-slate-50 border rounded-2xl flex flex-col items-center text-center space-y-4">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                          <Download className="w-6 h-6" />
                      </div>
                      <div>
                          <h4 className="font-bold text-slate-800">Ekspor Backup JSON</h4>
                          <p className="text-xs text-slate-500 mt-1">Unduh seluruh data lokal untuk dipindahkan ke komputer lain.</p>
                      </div>
                      <button onClick={exportAllData} className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700">Unduh JSON</button>
                  </div>

                  <div className="p-6 bg-slate-50 border rounded-2xl flex flex-col items-center text-center space-y-4">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                          <Upload className="w-6 h-6" />
                      </div>
                      <div>
                          <h4 className="font-bold text-slate-800">Impor Backup JSON</h4>
                          <p className="text-xs text-slate-500 mt-1">Pulihkan data dari file JSON backup sebelumnya.</p>
                      </div>
                      <input type="file" ref={importFileRef} className="hidden" accept=".json" onChange={handleImport} />
                      <button onClick={() => importFileRef.current?.click()} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700">Pilih File</button>
                  </div>

                  <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col items-center text-center space-y-4 md:col-span-2">
                      <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                          <RotateCcw className="w-6 h-6" />
                      </div>
                      <div>
                          <h4 className="font-bold text-rose-800">Hapus Seluruh Cache Browser</h4>
                          <p className="text-xs text-rose-600 mt-1">Hati-hati! Ini akan menghapus semua data lokal dan memaksa Anda keluar.</p>
                      </div>
                      <button onClick={resetLocalCache} className="px-8 py-3 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 shadow-lg shadow-rose-100">Reset & Logout</button>
                  </div>
               </div>
            </div>
          )}
          
          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
               <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2"><Shield className="w-6 h-6 text-indigo-500" /> Manajemen Akses</h2>
                   <button onClick={() => { setEditingUser(null); setUserFormData({}); setIsUserModalOpen(true); }} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700">Tambah User</button>
               </div>
               <div className="overflow-hidden border border-slate-100 rounded-xl">
                   <table className="w-full text-left">
                     <thead className="bg-slate-50 border-b">
                       <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         <th className="px-6 py-4">User</th>
                         <th className="px-6 py-4">Role</th>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4 text-right">Aksi</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-sm">
                       {users.map(user => (
                         <tr key={user.id} className="hover:bg-slate-50">
                           <td className="px-6 py-4"><div className="font-bold text-slate-900">{user.name}</div><div className="text-[11px] text-slate-500">@{user.username}</div></td>
                           <td className="px-6 py-4"><span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold uppercase">{user.role}</span></td>
                           <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{user.status}</span></td>
                           <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-2">
                               <button onClick={() => { setEditingUser(user); setUserFormData({ ...user, password: '' }); setIsUserModalOpen(true); }} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                               <button onClick={() => onDeleteUser(user.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
               </div>
            </div>
          )}
        </div>
      </div>
      
      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
               <h3 className="font-black text-slate-800 uppercase tracking-tight">{editingUser ? 'Edit User' : 'Tambah User'}</h3>
               <button onClick={() => setIsUserModalOpen(false)} className="p-2 hover:bg-white rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={async (e) => {
                 e.preventDefault();
                 let finalPassword = userFormData.password;
                 if (userFormData.password && userFormData.password.trim() !== '') {
                    finalPassword = await hashPassword(userFormData.password);
                 } else if (editingUser) {
                    finalPassword = editingUser.password;
                 } else {
                    finalPassword = await hashPassword('123456');
                 }

                 const newUser: User = { 
                     id: editingUser ? editingUser.id : generateId(), 
                     name: userFormData.name || '', 
                     username: userFormData.username || '', 
                     role: (userFormData.role as UserRole) || 'staff', 
                     status: (userFormData.status as 'active' | 'inactive') || 'active', 
                     password: finalPassword
                 };
                 if (editingUser) onUpdateUser(newUser); else onAddUser(newUser);
                 setIsUserModalOpen(false);
            }} className="p-8 space-y-5">
               <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama</label><input required className="w-full px-4 py-2 border rounded-xl text-sm" value={userFormData.name || ''} onChange={e => setUserFormData({...userFormData, name: e.target.value})} /></div>
               <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Username</label><input required className="w-full px-4 py-2 border rounded-xl text-sm" value={userFormData.username || ''} onChange={e => setUserFormData({...userFormData, username: e.target.value})} /></div>
               <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Password {editingUser ? '(Kosongkan jika tidak diubah)' : ''}</label>
                   <input type="password" className="w-full px-4 py-2 border rounded-xl text-sm" placeholder={editingUser ? "••••••••" : "Wajib diisi"} value={userFormData.password || ''} onChange={e => setUserFormData({...userFormData, password: e.target.value})} required={!editingUser} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Role</label><select className="w-full px-4 py-2 border rounded-xl text-sm" value={userFormData.role || 'staff'} onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})}><option value="staff">Staff</option><option value="admin">Admin</option></select></div>
                  <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label><select className="w-full px-4 py-2 border rounded-xl text-sm" value={userFormData.status || 'active'} onChange={e => setUserFormData({...userFormData, status: e.target.value as any})}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
               </div>
               <div className="pt-6 flex justify-end gap-3"><button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">Batal</button><button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all">Simpan</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;