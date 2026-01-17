import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InventoryItem, AppView, Transaction, Supplier, User, AppSettings, ToastMessage, ToastType, TablePreferences, RejectLog, RejectItem } from './types';
import { INITIAL_INVENTORY, INITIAL_SUPPLIERS, INITIAL_USERS, DEFAULT_SETTINGS, DEFAULT_TABLE_PREFS } from './constants';
import { loadFromStorage, saveToStorage, clearStorage } from './utils/storageUtils';
import { fetchBackendData, syncBackendData, checkServerConnection } from './services/api';
import useDebounce from './hooks/useDebounce';
import Dashboard from './components/Dashboard';
import InventoryTable from './components/InventoryTable';
import AIAssistant from './components/AIAssistant';
import TransactionManager from './components/TransactionManager';
import RejectManager from './components/RejectManager';
import ItemHistory from './components/ItemHistory';
import SupplierManager from './components/SupplierManager';
import AdminPanel from './components/AdminPanel';
import LoginPage from './components/LoginPage';
import ToastContainer from './components/Toast';
import { LayoutDashboard, Package, Bot, Eye, EyeOff, ArrowRightLeft, History, RefreshCw, Save as SaveIcon, Cloud, CloudOff, Users, ShieldCheck, AlertCircle, Menu, X, PanelLeftClose, PanelLeftOpen, Database, LogOut } from 'lucide-react';

const App: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rejectItems, setRejectItems] = useState<RejectItem[]>([]);
  const [rejectLogs, setRejectLogs] = useState<RejectLog[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [tablePrefs, setTablePrefs] = useState<TablePreferences>(DEFAULT_TABLE_PREFS);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [dbStatus, setDbStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN'>('UNKNOWN');
  const [isSaving, setIsSaving] = useState(false);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
      const nextBlink = Math.random() * 4000 + 2000;
      setTimeout(triggerBlink, nextBlink);
    };
    const initialTimer = setTimeout(triggerBlink, 3000);
    return () => clearTimeout(initialTimer);
  }, []);

  const debouncedItems = useDebounce(items, 1500);
  const debouncedTransactions = useDebounce(transactions, 1500);
  const debouncedRejectItems = useDebounce(rejectItems, 1500);
  const debouncedRejectLogs = useDebounce(rejectLogs, 1500);
  const debouncedSuppliers = useDebounce(suppliers, 1500);
  const debouncedUsers = useDebounce(users, 1500);
  const debouncedSettings = useDebounce(settings, 1500);
  const debouncedTablePrefs = useDebounce(tablePrefs, 1500);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const loadData = useCallback(async (customSettings?: AppSettings) => {
    setIsLoading(true);
    const activeSettings = customSettings || loadFromStorage('smartstock_settings', DEFAULT_SETTINGS);
    const vpsUrl = activeSettings.vpsApiUrl;
    
    // 1. Selalu load data lokal terlebih dahulu sebagai fallback
    if (!customSettings) {
        setItems(loadFromStorage('smartstock_inventory', INITIAL_INVENTORY));
        setTransactions(loadFromStorage('smartstock_transactions', []));
        setRejectItems(loadFromStorage('smartstock_reject_inventory', []));
        setRejectLogs(loadFromStorage('smartstock_rejects', []));
        setSuppliers(loadFromStorage('smartstock_suppliers', INITIAL_SUPPLIERS));
        setUsers(loadFromStorage('smartstock_users', INITIAL_USERS));
        setSettings(activeSettings);
    }

    // 2. Cek koneksi ke VPS
    if (vpsUrl && vpsUrl !== '') {
      try {
        const conn = await checkServerConnection(vpsUrl);
        setDbStatus(conn.dbStatus || 'UNKNOWN');
        setIsCloudConnected(conn.online);

        if (conn.online && conn.dbStatus === 'CONNECTED') {
          const cloudData = await fetchBackendData(vpsUrl);
          if (cloudData) {
            if (cloudData.inventory) setItems(cloudData.inventory);
            if (cloudData.transactions) setTransactions(cloudData.transactions);
            if (cloudData.users && cloudData.users.length > 0) setUsers(cloudData.users);
            if (cloudData.reject_inventory) setRejectItems(cloudData.reject_inventory);
            if (cloudData.rejects) setRejectLogs(cloudData.rejects);
            if (cloudData.suppliers) setSuppliers(cloudData.suppliers);
          }
        }
      } catch (error) {
        console.error("Connection check failed:", error);
        setIsCloudConnected(false);
      }
    } else {
      setIsCloudConnected(false);
    }
    setIsLoading(false);
  }, [showToast]);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const savedSession = sessionStorage.getItem('smartstock_session_user');
    if (savedSession) {
        try {
            setCurrentUser(JSON.parse(savedSession));
        } catch (e) {}
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('smartstock_session_user', JSON.stringify(user));
    showToast(`Selamat datang, ${user.name}`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('smartstock_session_user');
    showToast('Berhasil keluar', 'info');
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
      loadData(newSettings);
  };

  const isMounted = useRef(false);
  useEffect(() => { if (!isLoading) isMounted.current = true; }, [isLoading]);

  const syncToCloud = async (type: string, data: any) => {
    // FIX: Izinkan sync jika vpsApiUrl adalah '/' (Proxy)
    if (isMounted.current && isCloudConnected && settings.vpsApiUrl && dbStatus === 'CONNECTED') {
      setIsSaving(true);
      await syncBackendData(settings.vpsApiUrl, type as any, data);
      setIsSaving(false);
    }
  };

  const handleFullSync = async () => {
    if (!settings.viteGasUrl || !settings.viteGasUrl.includes('script.google.com')) {
        showToast('URL Google Apps Script belum dikonfigurasi!', 'warning');
        return false;
    }
    
    setIsSaving(true);
    try {
        const fullData = {
            inventory: items,
            transactions: transactions,
            rejectItems: rejectItems,
            rejectLogs: rejectLogs,
            suppliers: suppliers,
            users: users,
            settings: settings
        };
        
        const result = await syncBackendData(settings.viteGasUrl, 'full_sync' as any, fullData);
        
        if (result.success) {
            showToast('Sync Google Sheets Berhasil!', 'success');
            const now = new Date().toISOString();
            setSettings(prev => ({ ...prev, lastSheetSync: now }));
            saveToStorage('smartstock_settings', { ...settings, lastSheetSync: now });
            return true;
        } else {
            showToast('Gagal Sync ke Spreadsheet: ' + (result.message || 'Unknown error'), 'error');
            return false;
        }
    } catch (e: any) {
        showToast('Kesalahan Jaringan: ' + e.message, 'error');
        return false;
    } finally {
        setIsSaving(false);
    }
  };

  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_inventory', debouncedItems); syncToCloud('inventory', debouncedItems); } }, [debouncedItems]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_transactions', debouncedTransactions); syncToCloud('transactions', debouncedTransactions); } }, [debouncedTransactions]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_reject_inventory', debouncedRejectItems); syncToCloud('reject_inventory', debouncedRejectItems); } }, [debouncedRejectItems]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_rejects', debouncedRejectLogs); syncToCloud('rejects', debouncedRejectLogs); } }, [debouncedRejectLogs]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_suppliers', debouncedSuppliers); syncToCloud('suppliers', debouncedSuppliers); } }, [debouncedSuppliers]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_users', debouncedUsers); syncToCloud('users', debouncedUsers); } }, [debouncedUsers]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_settings', debouncedSettings); if (isCloudConnected) syncToCloud('settings', debouncedSettings); } }, [debouncedSettings]);
  useEffect(() => { if (isMounted.current) { saveToStorage('smartstock_table_prefs', debouncedTablePrefs); } }, [debouncedTablePrefs]);

  const toggleColumn = (module: keyof TablePreferences, columnId: string) => {
    setTablePrefs(prev => ({
      ...prev,
      [module]: prev[module].map(col => col.id === columnId ? { ...col, visible: !col.visible } : col)
    }));
  };

  const addItem = (item: InventoryItem) => { setItems(prev => [...prev, item]); showToast(`${item.name} ditambahkan`, 'success'); };
  const addBatchItems = (newItems: InventoryItem[]) => { setItems(prev => [...prev, ...newItems]); showToast(`Berhasil impor ${newItems.length} barang`, 'success'); };
  const updateItem = (updatedItem: InventoryItem) => { setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item)); showToast(`${updatedItem.name} diperbarui`, 'success'); };
  const deleteItem = (id: string) => { setItems(prev => prev.filter(item => item.id !== id)); showToast('Barang dihapus', 'warning'); };

  const processTransaction = (transaction: Transaction) => {
    const updatedInventory = calculateStockChange(items, transaction);
    setTransactions(prev => [transaction, ...prev]);
    setItems(updatedInventory);
    showToast(`Transaksi ${transaction.type} diproses`, 'success');
  };

  const updateTransaction = (updatedTx: Transaction) => {
    setTransactions(prev => prev.map(tx => tx.id === updatedTx.id ? updatedTx : tx));
    showToast('Transaksi diperbarui', 'success');
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
    showToast('Transaksi dihapus', 'warning');
  };

  const calculateStockChange = (currentItems: InventoryItem[], tx: Transaction): InventoryItem[] => {
    const newItems = [...currentItems];
    tx.items.forEach(txItem => {
      const index = newItems.findIndex(i => i.id === txItem.itemId);
      if (index !== -1) {
        const currentQty = newItems[index].quantity;
        const change = txItem.totalBaseQuantity;
        const finalChange = tx.type === 'IN' ? change : -change; 
        newItems[index] = { ...newItems[index], quantity: Math.max(0, currentQty + finalChange), lastUpdated: new Date().toISOString() };
      }
    });
    return newItems;
  };

  if (!currentUser) {
      return (
          <>
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            <LoginPage 
                users={users} 
                onLogin={handleLogin} 
                isLoadingData={isLoading}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
            />
          </>
      );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <aside className={`fixed inset-y-0 left-0 z-50 bg-slate-900 text-slate-300 flex flex-col shadow-xl transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        ${isSidebarCollapsed ? 'md:w-0 md:opacity-0 md:overflow-hidden' : 'md:w-64 md:opacity-100'}
        w-64`}
      >
        <div className="h-32 flex items-center justify-center relative border-b border-emerald-900/30 overflow-hidden flex-shrink-0">
          <div className="absolute w-16 h-16 border border-emerald-500/20 rotate-45 transform bg-emerald-900/10 backdrop-blur-sm" />
          <div className="absolute z-10 p-2">
            {isBlinking ? <EyeOff className="w-12 h-12 text-emerald-500/80 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-100" /> : <Eye className="w-12 h-12 text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)] transition-all duration-100" strokeWidth={1.5} />}
          </div>
          <button className="md:hidden absolute right-4 top-4 p-1 hover:bg-slate-800 rounded-lg text-slate-400" onClick={() => setIsMobileMenuOpen(false)}><X className="w-5 h-5" /></button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto flex flex-col custom-scrollbar">
          <button onClick={() => { setCurrentView(AppView.DASHBOARD); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap ${currentView === AppView.DASHBOARD ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><LayoutDashboard className="w-5 h-5 shrink-0" /><span className="font-medium">Dashboard</span></button>
          <button onClick={() => { setCurrentView(AppView.INVENTORY); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap ${currentView === AppView.INVENTORY ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><Package className="w-5 h-5 shrink-0" /><span className="font-medium">Inventory</span></button>
          <button onClick={() => { setCurrentView(AppView.TRANSACTIONS); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap ${currentView === AppView.TRANSACTIONS ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><ArrowRightLeft className="w-5 h-5 shrink-0" /><span className="font-medium">Transaksi</span></button>
          <button onClick={() => { setCurrentView(AppView.REJECT); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap ${currentView === AppView.REJECT ? 'bg-rose-600 text-white shadow-lg' : 'hover:bg-slate-800 text-rose-400'}`}><AlertCircle className="w-5 h-5 shrink-0" /><span className="font-medium">Reject Modul</span></button>
          <button onClick={() => { setCurrentView(AppView.HISTORY); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap ${currentView === AppView.HISTORY ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><History className="w-5 h-5 shrink-0" /><span className="font-medium">Riwayat</span></button>
          <button onClick={() => { setCurrentView(AppView.SUPPLIERS); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap ${currentView === AppView.SUPPLIERS ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><Users className="w-5 h-5 shrink-0" /><span className="font-medium">Suppliers</span></button>
          <button onClick={() => { setCurrentView(AppView.AI_ASSISTANT); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap ${currentView === AppView.AI_ASSISTANT ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><Bot className="w-5 h-5 shrink-0" /><span className="font-medium">AI Agent</span></button>
          
          <div className="pt-4 mt-4 border-t border-slate-800">
            {currentUser.role === 'admin' && (
                <button onClick={() => { setCurrentView(AppView.ADMIN); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap ${currentView === AppView.ADMIN ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}><ShieldCheck className="w-5 h-5 shrink-0" /><span className="font-medium">Admin Panel</span></button>
            )}
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap hover:bg-rose-900/30 text-rose-400 mt-2"><LogOut className="w-5 h-5 shrink-0" /><span className="font-medium">Keluar</span></button>
          </div>
        </nav>
        
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                {currentUser.name.charAt(0)}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 uppercase">{currentUser.role}</p>
            </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        <header className="flex justify-between items-center p-4 md:p-8 pb-4 shrink-0 bg-slate-50 z-20">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Menu className="w-6 h-6" /></button>
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:flex p-2 text-slate-500 hover:bg-white rounded-lg transition-all">{isSidebarCollapsed ? <PanelLeftOpen className="w-6 h-6" /> : <PanelLeftClose className="w-6 h-6" />}</button>
                <div><h1 className="text-xl md:text-2xl font-bold text-slate-900">POWER INVENTORY</h1><p className="text-slate-500 text-xs md:text-sm">Warehouse Management System</p></div>
            </div>
            <div className="flex items-center gap-3">
                <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isCloudConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {isCloudConnected ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
                    {isCloudConnected ? 'Cloud Active' : 'Local Mode'}
                </div>
                {isSaving && <div className="text-[10px] text-slate-400 animate-pulse flex items-center gap-1"><SaveIcon className="w-3 h-3" /> Saving...</div>}
                <button onClick={() => loadData()} className="p-2 text-slate-500 hover:text-blue-600 rounded-full transition-transform active:rotate-180 duration-500"><RefreshCw className="w-5 h-5" /></button>
            </div>
        </header>
        <div className="flex-1 overflow-hidden px-4 md:px-8 pb-4">
            {currentView === AppView.DASHBOARD && <Dashboard items={items} transactions={transactions} />}
            {currentView === AppView.INVENTORY && <InventoryTable items={items} onAddItem={addItem} onBatchAdd={addBatchItems} onUpdateItem={updateItem} onDeleteItem={deleteItem} userRole={currentUser.role} columns={tablePrefs.inventory} onToggleColumn={(id) => toggleColumn('inventory', id)} />}
            {currentView === AppView.TRANSACTIONS && <TransactionManager inventory={items} transactions={transactions} onProcessTransaction={processTransaction} onUpdateTransaction={updateTransaction} onDeleteTransaction={deleteTransaction} userRole={currentUser.role} columns={tablePrefs.transactions} onToggleColumn={(id) => toggleColumn('transactions', id)} />}
            {currentView === AppView.REJECT && <RejectManager rejectMasterData={rejectItems} rejectLogs={rejectLogs} onProcessReject={(log) => { setRejectLogs(prev => [log, ...prev]); }} onUpdateRejectLog={(log) => { setRejectLogs(prev => prev.map(l => l.id === log.id ? log : l)); }} onDeleteRejectLog={(id) => { setRejectLogs(prev => prev.filter(l => l.id !== id)); }} onUpdateRejectMaster={setRejectItems} userRole={currentUser.role} columns={tablePrefs.rejects} onToggleColumn={(id) => toggleColumn('rejects', id)} />}
            {currentView === AppView.HISTORY && <ItemHistory transactions={transactions} items={items} columns={tablePrefs.history} onToggleColumn={(id) => toggleColumn('history', id)} />}
            {currentView === AppView.SUPPLIERS && <SupplierManager suppliers={suppliers} onAddSupplier={(s) => setSuppliers([...suppliers, s])} onUpdateSupplier={() => {}} onDeleteSupplier={() => {}} userRole={currentUser.role} columns={tablePrefs.suppliers} onToggleColumn={(id) => toggleColumn('suppliers', id)} />}
            {currentView === AppView.AI_ASSISTANT && <AIAssistant items={items} />}
            {currentView === AppView.ADMIN && currentUser.role === 'admin' && (
                <AdminPanel 
                    settings={settings} 
                    onUpdateSettings={handleUpdateSettings} 
                    users={users} 
                    onAddUser={(u) => setUsers(prev => [...prev, u])} 
                    onUpdateUser={(u) => setUsers(prev => prev.map(usr => usr.id === u.id ? u : usr))} 
                    onDeleteUser={(id) => setUsers(prev => prev.filter(u => u.id !== id))} 
                    onFullSyncToSheets={handleFullSync}
                />
            )}
        </div>
      </div>
    </div>
  );
};

export default App;