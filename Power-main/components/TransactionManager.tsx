
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryItem, Transaction, TransactionItemDetail, TransactionType, UserRole, Supplier, TableColumn, UnitDefinition } from '../types';
import { generateId } from '../utils/storageUtils';
import { Calendar, Plus, Save, Trash2, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Search, Package, Check, X, Edit3, AlertCircle, ShieldAlert, FileText, Camera, ImageIcon, Columns, Maximize2, AlertTriangle, Download, PlusCircle, MinusCircle, Eye, Layers } from 'lucide-react';
import useDebounce from '../hooks/useDebounce';

interface TransactionManagerProps {
  inventory: InventoryItem[];
  transactions: Transaction[];
  onProcessTransaction: (transaction: Transaction) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  userRole: UserRole;
  suppliers?: Supplier[];
  columns: TableColumn[];
  onToggleColumn: (id: string) => void;
}

const TransactionManager: React.FC<TransactionManagerProps> = ({ 
  inventory, transactions, onProcessTransaction, onUpdateTransaction, onDeleteTransaction, userRole, suppliers = [], columns, onToggleColumn 
}) => {
  const canEdit = userRole === 'admin' || userRole === 'staff';
  const isVisible = (id: string) => columns.find(c => c.id === id)?.visible;
  
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => { if (!canEdit) setActiveTab('history'); }, [canEdit]);
  
  // Utility class untuk menyembunyikan spinner pada input number
  const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  // --- New Transaction Form State ---
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>('IN');
  const [notes, setNotes] = useState('');
  const [cartItems, setCartItems] = useState<TransactionItemDetail[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [riNumber, setRiNumber] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // --- Item Selection State ---
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 150); 
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [conversionRatio, setConversionRatio] = useState<number>(1);
  const [quantityInput, setQuantityInput] = useState<number | undefined>(undefined);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  
  // --- Navigation State ---
  const [activeIndex, setActiveIndex] = useState(0); 
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // --- Validation State ---
  const [validationError, setValidationError] = useState<string | null>(null);

  // --- Edit Modal State ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<TransactionType>('IN');
  const [editNotes, setEditNotes] = useState('');
  const [editCartItems, setEditCartItems] = useState<TransactionItemDetail[]>([]);
  const [editSupplierName, setEditSupplierName] = useState('');
  const [editPoNumber, setEditPoNumber] = useState('');
  const [editRiNumber, setEditRiNumber] = useState('');
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const editSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) setIsAutocompleteOpen(false);
      if (editSearchRef.current && !editSearchRef.current.contains(event.target as Node)) setIsAutocompleteOpen(false);
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) setIsColumnMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update total base quantity when quantity or unit changes
  const totalBaseCalc = useMemo(() => {
    if (quantityInput === undefined) return 0;
    return quantityInput * conversionRatio;
  }, [quantityInput, conversionRatio]);

  useEffect(() => {
    if (type === 'OUT' && selectedItem && quantityInput) {
      const alreadyInCart = cartItems
        .filter(it => it.itemId === selectedItem.id)
        .reduce((sum, current) => sum + current.totalBaseQuantity, 0);
      
      const totalRequested = alreadyInCart + totalBaseCalc;

      if (totalRequested > selectedItem.quantity) {
        setValidationError(`Stok tidak mencukupi. Tersedia: ${selectedItem.quantity} ${selectedItem.baseUnit}`);
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError(null);
    }
  }, [quantityInput, selectedItem, type, cartItems, totalBaseCalc]);

  const filteredInventory = useMemo(() => {
    if (!debouncedSearchQuery) return [];
    
    const query = debouncedSearchQuery.toLowerCase().trim();
    const tokens = query.split(/\s+/).filter(t => t.length > 0);

    return inventory
      .filter(item => {
        const searchString = `${item.name} ${item.sku} ${item.category}`.toLowerCase();
        return tokens.every(token => searchString.includes(token));
      })
      .sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (nameA === query) return -1;
        if (nameB === query) return 1;
        const aStarts = nameA.startsWith(query);
        const bStarts = nameB.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      })
      .slice(0, 10); 
  }, [debouncedSearchQuery, inventory]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
         activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);


  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setSelectedUnit(item.baseUnit);
    setConversionRatio(1);
    setIsAutocompleteOpen(false);
    setValidationError(null);
    setActiveIndex(-1);

    requestAnimationFrame(() => {
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select(); 
    });
  };

  const handleUnitSelect = (unitName: string) => {
    if (!selectedItem) return;
    setSelectedUnit(unitName);
    if (unitName === selectedItem.baseUnit) {
      setConversionRatio(1);
    } else {
      const alt = selectedItem.alternativeUnits?.find(u => u.name === unitName);
      setConversionRatio(alt?.ratio || 1);
    }
  };

  const handleAddToCart = (targetCart: 'new' | 'edit') => {
    if (!selectedItem || !quantityInput) return;
    
    const calculatedBase = quantityInput * conversionRatio;

    if (type === 'OUT') {
        const alreadyInCart = (targetCart === 'new' ? cartItems : editCartItems)
            .filter(it => it.itemId === selectedItem.id)
            .reduce((sum, current) => sum + current.totalBaseQuantity, 0);
        
        if (alreadyInCart + calculatedBase > selectedItem.quantity) {
            alert(`Gagal: Total pengambilan (${alreadyInCart + calculatedBase}) melebihi stok yang ada (${selectedItem.quantity}).`);
            return;
        }
    }

    const newItem: TransactionItemDetail = {
      itemId: selectedItem.id, 
      itemName: selectedItem.name, 
      quantityInput, 
      selectedUnit, 
      conversionRatio, 
      totalBaseQuantity: calculatedBase
    };

    if (targetCart === 'new') setCartItems([...cartItems, newItem]);
    else setEditCartItems([...editCartItems, newItem]);
    
    setSelectedItem(null); 
    setSearchQuery(''); 
    setQuantityInput(undefined); 
    setValidationError(null);
    
    if (targetCart === 'new') {
        requestAnimationFrame(() => {
            searchInputRef.current?.focus();
        });
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredInventory.length > 0) {
       e.preventDefault();
       const indexToSelect = activeIndex >= 0 ? activeIndex : 0;
       handleSelectItem(filteredInventory[indexToSelect]);
       return;
    }

    if (!isAutocompleteOpen || filteredInventory.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredInventory.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Escape') {
      setIsAutocompleteOpen(false);
    }
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent, target: 'new' | 'edit') => {
      if (e.key === 'Enter') {
          e.preventDefault();
          if (selectedItem && quantityInput && !validationError) {
              handleAddToCart(target);
          }
      }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'new' | 'edit') => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const newBase64s = await Promise.all(files.map((file: File) => {
        return new Promise<string>(resolve => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
      }));
      if (target === 'new') setPhotos(prev => [...prev, ...newBase64s]);
      else setEditPhotos(prev => [...prev, ...newBase64s]);
    }
  };

  const handleSubmitTransaction = () => {
    if (cartItems.length === 0) return;
    onProcessTransaction({
      id: generateId(), date, type, items: cartItems, notes, timestamp: new Date().toISOString(),
      ...(type === 'IN' ? { supplierName, poNumber, riNumber, photos } : {})
    });
    setCartItems([]); setNotes(''); setPhotos([]); setSupplierName(''); setPoNumber(''); setRiNumber('');
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditDate(tx.date); setEditType(tx.type); setEditNotes(tx.notes || '');
    setEditCartItems([...tx.items]);
    setEditSupplierName(tx.supplierName || '');
    setEditPoNumber(tx.poNumber || '');
    setEditRiNumber(tx.riNumber || '');
    setEditPhotos(tx.photos || []);
    setIsEditModalOpen(true);
  };

  const updateEditItemQty = (index: number, newQty: number) => {
    const updated = [...editCartItems];
    updated[index] = { ...updated[index], quantityInput: newQty, totalBaseQuantity: newQty * (updated[index].conversionRatio || 1) };
    setEditCartItems(updated);
  };

  const handleSaveEdit = () => {
    if (!editingTransaction) return;
    const updatedTx: Transaction = {
      ...editingTransaction,
      date: editDate,
      type: editType,
      items: editCartItems,
      notes: editNotes,
      supplierName: editSupplierName,
      poNumber: editPoNumber,
      riNumber: editRiNumber,
      photos: editPhotos,
    };
    onUpdateTransaction(updatedTx);
    setIsEditModalOpen(false);
  };

  const handleDownloadPhoto = (base64Data: string) => {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = `photo-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderItemInput = (target: 'new' | 'edit', containerRef: React.RefObject<HTMLDivElement | null>) => (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-5 relative" ref={containerRef}>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-tight">Cari Barang</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    ref={target === 'new' ? searchInputRef : undefined}
                    type="text" 
                    value={searchQuery} 
                    onFocus={() => setIsAutocompleteOpen(true)} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Nama / SKU..." 
                    className="w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    autoComplete="off" 
                />
              </div>
              {isAutocompleteOpen && filteredInventory.length > 0 && searchQuery && (
                  <div ref={listRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-[60] max-h-60 overflow-auto">
                    <div className="p-2 border-b bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hasil Pencarian</div>
                    {filteredInventory.map((item, idx) => (
                        <button 
                            key={item.id} 
                            onClick={() => handleSelectItem(item)} 
                            className={`w-full text-left px-4 py-3 border-b last:border-0 transition-colors ${idx === activeIndex ? 'bg-blue-600 text-white' : 'hover:bg-slate-50'}`}
                        >
                            <div className="font-bold text-sm truncate">{item.name}</div>
                            <div className="flex justify-between items-center mt-0.5">
                                <span className={`text-[10px] font-mono ${idx === activeIndex ? 'text-blue-100' : 'text-slate-400'}`}>SKU: {item.sku}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${idx === activeIndex ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600'}`}>Stok: {item.quantity} {item.baseUnit}</span>
                            </div>
                        </button>
                    ))}
                  </div>
              )}
          </div>
          <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-tight">Unit (Satuan)</label>
              <select 
                disabled={!selectedItem}
                value={selectedUnit}
                onChange={(e) => handleUnitSelect(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
              >
                {!selectedItem && <option value="">Pilih Barang...</option>}
                {selectedItem && (
                  <>
                    <option value={selectedItem.baseUnit}>{selectedItem.baseUnit} (Base)</option>
                    {selectedItem.alternativeUnits?.map((alt, i) => (
                      <option key={i} value={alt.name}>{alt.name} (x{alt.ratio})</option>
                    ))}
                  </>
                )}
              </select>
          </div>
          <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-tight">Jumlah</label>
              <div className="relative">
                <input 
                  ref={target === 'new' ? qtyInputRef : undefined}
                  type="number" 
                  step="any"
                  placeholder="0" 
                  value={quantityInput ?? ''} 
                  onChange={e => setQuantityInput(e.target.value === '' ? undefined : Number(e.target.value))}
                  onKeyDown={(e) => handleQtyKeyDown(e, target)} 
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 outline-none transition-all shadow-sm ${noSpinnerClass} ${validationError ? 'border-rose-300 ring-rose-100 bg-rose-50 text-rose-700 focus:ring-rose-500' : 'focus:ring-blue-500'}`} 
                />
              </div>
          </div>
          <div className="lg:col-span-3">
            <button 
                onClick={() => handleAddToCart(target)} 
                disabled={!selectedItem || !quantityInput || !!validationError}
                className={`w-full py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${!selectedItem || !quantityInput || !!validationError ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
                <PlusCircle className="w-4 h-4" /> Tambah
            </button>
          </div>
        </div>
        
        {selectedItem && (
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-white p-2 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-left-1">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            Konversi: 1 {selectedUnit} = {conversionRatio} {selectedItem.baseUnit} 
            {quantityInput !== undefined && (
              <span className="ml-auto text-blue-600">Total Input ke Sistem: {totalBaseCalc} {selectedItem.baseUnit}</span>
            )}
          </div>
        )}

        {validationError && (
            <div className="flex items-center gap-2 text-rose-600 text-[11px] font-bold bg-rose-100/50 p-2.5 rounded-xl border border-rose-100 animate-in fade-in slide-in-from-top-1">
                <AlertTriangle className="w-4 h-4" />
                {validationError}
            </div>
        )}
    </div>
  );

  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-end border-b border-slate-200">
        <div className="flex space-x-4">
          {canEdit && <button onClick={() => { setActiveTab('new'); setValidationError(null); setTimeout(() => searchInputRef.current?.focus(), 100); }} className={`pb-3 px-2 text-sm font-bold transition-all ${activeTab === 'new' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Input Transaksi</button>}
          <button onClick={() => setActiveTab('history')} className={`pb-3 px-2 text-sm font-bold transition-all ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Riwayat Log</button>
        </div>
        
        {activeTab === 'history' && (
          <div className="relative pb-3" ref={columnMenuRef}>
            <button onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm" title="Kolom">
              <Columns className="w-4 h-4 text-slate-600" />
            </button>
            {isColumnMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] p-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 mb-1">Kolom Tabel</div>
                {columns.map(col => (
                  <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-sm">
                    <input type="checkbox" checked={col.visible} onChange={() => onToggleColumn(col.id)} className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-slate-700">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto pb-4 custom-scrollbar">
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tanggal</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase text-center">Jenis Transaksi</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl h-[46px] gap-1">
                      <button 
                        onClick={() => { setType('IN'); setValidationError(null); requestAnimationFrame(() => searchInputRef.current?.focus()); }} 
                        className={`flex-1 flex items-center justify-center rounded-lg transition-all ${type === 'IN' ? 'bg-white text-emerald-600 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        <PlusCircle className="w-5 h-5 mr-2" /> Masuk
                      </button>
                      <button 
                        onClick={() => { setType('OUT'); setValidationError(null); requestAnimationFrame(() => searchInputRef.current?.focus()); }} 
                        className={`flex-1 flex items-center justify-center rounded-lg transition-all ${type === 'OUT' ? 'bg-white text-rose-600 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        <MinusCircle className="w-5 h-5 mr-2" /> Keluar
                      </button>
                    </div>
                  </div>
                </div>
                {type === 'IN' && (
                  <div className="space-y-4 mb-6 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 animate-in slide-in-from-top-2">
                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Informasi Supplier & Dokumen</div>
                    <input value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nama Supplier / Pemasok" />
                    <div className="grid grid-cols-2 gap-4">
                      <input value={poNumber} onChange={e => setPoNumber(e.target.value)} className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="No. Purchase Order (PO)" />
                      <input value={riNumber} onChange={e => setRiNumber(e.target.value)} className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="No. Surat Jalan (SJ)" />
                    </div>
                  </div>
                )}
                {renderItemInput('new', searchContainerRef)}
                <div className="mt-6">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tight">Lampiran Foto (Opsional)</label>
                    <div className="flex flex-wrap gap-3">
                         {photos.map((p, i) => (
                             <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group shadow-sm">
                                 <img src={p} className="w-full h-full object-cover" />
                                 <button onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 p-1.5 bg-rose-500 text-white rounded-bl-xl opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                             </div>
                         ))}
                         <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-400 cursor-pointer transition-all group shadow-sm">
                            <Camera className="w-6 h-6 text-slate-300 group-hover:text-blue-500 transition-colors" />
                            <span className="text-[10px] text-slate-400 mt-1 font-bold group-hover:text-blue-500 uppercase tracking-tighter">Upload</span>
                            <input type="file" multiple accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, 'new')} />
                         </label>
                    </div>
                </div>
              </div>
           </div>
           <div className="lg:col-span-1 h-full min-h-[500px]">
              <div className="bg-white rounded-2xl border p-5 space-y-4 flex flex-col h-full shadow-sm">
                <div className="flex items-center justify-between flex-shrink-0">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm"><Package className="w-4 h-4 text-blue-600" /> Ringkasan Transaksi</h3>
                    <span className="bg-blue-600 text-white text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest">{cartItems.length} ITEMS</span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[450px]">
                    {cartItems.length > 0 ? (
                        <div className="space-y-3">
                            {cartItems.map((it, i) => (
                                <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center animate-in slide-in-from-right-2 group">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[11px] font-black text-slate-900 truncate uppercase leading-tight">{it.itemName}</div>
                                        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-slate-500">
                                            <span>Input: {it.quantityInput} {it.selectedUnit}</span>
                                            <ArrowRightLeft className="w-3 h-3 text-slate-300" />
                                            <span className="text-blue-600">{it.totalBaseQuantity} {inventory.find(inv => inv.id === it.itemId)?.baseUnit}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setCartItems(prev => prev.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                            <Package className="w-12 h-12 mb-3 opacity-20" strokeWidth={1} />
                            <p className="text-xs italic font-bold uppercase tracking-widest opacity-40">Keranjang Kosong</p>
                        </div>
                    )}
                </div>
                
                <div className="pt-4 border-t border-slate-100 space-y-4 flex-shrink-0">
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan transaksi..." className="w-full p-3.5 border rounded-xl text-xs resize-none h-24 outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50/50" />
                    <button onClick={handleSubmitTransaction} disabled={cartItems.length === 0} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-black text-sm tracking-widest disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-[0.98]">SUBMIT DATA</button>
                </div>
              </div>
           </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
           <div className="overflow-auto flex-1 custom-scrollbar">
               <table className="w-full text-left text-sm min-w-[600px]">
                 <thead className="sticky top-0 bg-slate-50 z-10 border-b shadow-sm">
                   <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     {isVisible('date') && <th className="px-6 py-4">Tanggal</th>}
                     {isVisible('type') && <th className="px-6 py-4">Tipe</th>}
                     {isVisible('details') && <th className="px-6 py-4">Rincian</th>}
                     {isVisible('docs') && <th className="px-6 py-4">Dokumen</th>}
                     {isVisible('notes') && <th className="px-6 py-4">Catatan</th>}
                     <th className="px-6 py-4 text-right">Aksi</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 group transition-colors">
                            {isVisible('date') && <td className="px-6 py-4 font-bold text-slate-600">{tx.date}</td>}
                            {isVisible('type') && <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${tx.type === 'IN' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>{tx.type === 'IN' ? 'Masuk' : 'Keluar'}</span></td>}
                            {isVisible('details') && <td className="px-6 py-4 text-xs font-bold text-slate-700">{tx.items.length} Barang {tx.supplierName && <span className="text-slate-400 font-normal">({tx.supplierName})</span>}</td>}
                            {isVisible('docs') && <td className="px-6 py-4 text-xs flex items-center gap-1.5 font-black text-slate-500">{tx.photos?.length || 0} <ImageIcon className="w-4 h-4 text-slate-300" /></td>}
                            {isVisible('notes') && <td className="px-6 py-4 max-w-[150px] truncate italic text-slate-400 text-xs">{tx.notes || '-'}</td>}
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => openEditModal(tx)} 
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                  title={canEdit ? 'Edit Transaksi' : 'Detail Transaksi'}
                                >
                                  {canEdit ? <Edit3 className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                                {canEdit && (
                                  <button 
                                    onClick={() => { if(window.confirm('Hapus transaksi ini dari riwayat?')) onDeleteTransaction(tx.id); }} 
                                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                    title="Hapus Transaksi"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                            </td>
                        </tr>
                    ))}
                 </tbody>
               </table>
           </div>
        </div>
      )}

      {isEditModalOpen && editingTransaction && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-8 py-6 border-b bg-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-xl">{canEdit ? <Edit3 className="w-6 h-6 text-blue-600" /> : <Eye className="w-6 h-6 text-blue-600" />}</div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tight">{canEdit ? 'Ubah Transaksi' : 'Detail Transaksi'}</h3>
                  </div>
                  <button onClick={() => setIsEditModalOpen(false)} className="p-2.5 hover:bg-white rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              <div className="p-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 block uppercase mb-2 tracking-widest">Tanggal Transaksi</label>
                            <input type="date" disabled={!canEdit} value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white" />
                        </div>
                        {editingTransaction.type === 'IN' && (
                            <div className="p-5 bg-emerald-50 rounded-2xl space-y-4 border border-emerald-100">
                                <label className="text-[10px] font-black text-emerald-600 block uppercase tracking-widest">Informasi Kedatangan</label>
                                <input disabled={!canEdit} value={editSupplierName} onChange={e => setEditSupplierName(e.target.value)} placeholder="Nama Supplier" className="w-full border border-emerald-200 rounded-xl p-3 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
                                <div className="grid grid-cols-2 gap-3">
                                    <input disabled={!canEdit} value={editPoNumber} onChange={e => setEditPoNumber(e.target.value)} placeholder="Nomor PO" className="w-full border border-emerald-200 rounded-xl p-3 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
                                    <input disabled={!canEdit} value={editRiNumber} onChange={e => setEditRiNumber(e.target.value)} placeholder="Nomor SJ" className="w-full border border-emerald-200 rounded-xl p-3 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 block uppercase mb-2 tracking-widest">Catatan Tambahan</label>
                            <textarea disabled={!canEdit} value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none bg-white" />
                        </div>
                      </div>
                      <div className="p-5 bg-slate-50 rounded-2xl flex flex-col border border-slate-200">
                        <label className="text-[10px] font-black text-slate-400 block uppercase mb-4 tracking-widest">Daftar Barang Transaksi</label>
                        <div className="space-y-3 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                           {editCartItems.map((it, i) => (
                             <div key={i} className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-blue-200">
                               <div className="min-w-0 flex-1">
                                 <div className="font-black text-slate-800 uppercase truncate text-xs leading-tight">{it.itemName}</div>
                                 <div className="text-[9px] text-slate-400 mt-1 font-mono">ID: {it.itemId}</div>
                               </div>
                               <div className="flex items-center gap-3">
                                  {canEdit ? (
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                step="any"
                                                className={`w-20 border border-blue-200 rounded-lg text-center py-2 font-black bg-blue-50 text-blue-700 outline-none focus:ring-2 focus:ring-blue-500 ${noSpinnerClass} text-sm`} 
                                                value={it.quantityInput} 
                                                onChange={e => updateEditItemQty(i, Number(e.target.value))} 
                                            />
                                            <span className="font-black text-slate-500 text-[10px] uppercase tracking-tighter">{it.selectedUnit}</span>
                                        </div>
                                        <div className="text-[9px] font-bold text-slate-400 mt-1">Sistem: {it.totalBaseQuantity} {inventory.find(v => v.id === it.itemId)?.baseUnit}</div>
                                    </div>
                                  ) : (
                                    <div className="text-right">
                                        <div className="font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg text-xs tracking-tight">{it.quantityInput} {it.selectedUnit}</div>
                                        <div className="text-[9px] font-bold text-slate-400 mt-1">Sistem: {it.totalBaseQuantity} {inventory.find(v => v.id === it.itemId)?.baseUnit}</div>
                                    </div>
                                  )}
                                  {canEdit && <button onClick={() => setEditCartItems(editCartItems.filter((_, idx) => idx !== i))} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                               </div>
                             </div>
                           ))}
                        </div>
                      </div>
                  </div>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 block uppercase tracking-widest">Lampiran & Preview Foto</label>
                        {canEdit && (
                            <label className="text-[10px] font-black text-blue-600 flex items-center gap-1.5 cursor-pointer bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all active:scale-95 uppercase tracking-tighter">
                                <Plus className="w-3.5 h-3.5" /> Tambah Foto
                                <input type="file" multiple accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, 'edit')} />
                            </label>
                        )}
                     </div>
                     <div className="flex gap-3 flex-wrap bg-slate-50 p-5 rounded-2xl min-h-[120px] border border-slate-200 border-dashed">
                        {editPhotos.map((p, i) => (
                          <div key={i} className="relative w-24 h-24 group flex-shrink-0">
                            <img src={p} className="w-full h-full object-cover rounded-xl border border-white bg-white shadow-md transition-transform group-hover:scale-[1.02]" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity rounded-xl backdrop-blur-[2px]">
                              <button onClick={() => setPreviewPhoto(p)} className="p-2 bg-white rounded-xl shadow-lg text-slate-800 hover:scale-110 transition-transform"><Maximize2 className="w-4 h-4" /></button>
                              {canEdit && <button onClick={() => setEditPhotos(prev => prev.filter((_, idx) => idx !== i))} className="p-2 bg-rose-600 rounded-xl shadow-lg text-white hover:scale-110 transition-transform"><Trash2 className="w-4 h-4" /></button>}
                            </div>
                          </div>
                        ))}
                        {editPhotos.length === 0 && <div className="flex flex-col items-center justify-center w-full text-slate-300 italic py-6">
                            <ImageIcon className="w-10 h-10 opacity-10 mb-2" strokeWidth={1} />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Belum Ada Lampiran Foto</span>
                        </div>}
                     </div>
                  </div>
              </div>
              <div className="p-6 border-t bg-slate-50 flex justify-end gap-4 px-8">
                <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 text-slate-500 font-black text-sm tracking-widest hover:bg-slate-200 rounded-2xl transition-all">BATAL</button>
                {canEdit && <button onClick={handleSaveEdit} className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all">SIMPAN DATA</button>}
              </div>
           </div>
         </div>
      )}

      {previewPhoto && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-300" onClick={() => setPreviewPhoto(null)}>
           <div className="relative max-w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
               <div className="absolute -top-14 right-0 flex gap-3">
                 <button onClick={() => handleDownloadPhoto(previewPhoto)} className="text-white hover:text-blue-400 bg-white/10 p-2.5 rounded-full transition-all backdrop-blur-md" title="Download"><Download className="w-7 h-7" /></button>
                 <button onClick={() => setPreviewPhoto(null)} className="text-white hover:text-rose-400 bg-white/10 p-2.5 rounded-full transition-all backdrop-blur-md" title="Close"><X className="w-7 h-7" /></button>
               </div>
               <img src={previewPhoto} className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10" />
           </div>
        </div>
      )}
    </div>
  );
};

export default TransactionManager;
