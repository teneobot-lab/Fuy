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
        setValidationError(`Insufficient stock. Available: ${selectedItem.quantity} ${selectedItem.baseUnit}`);
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
            alert(`Error: Total quantity (${alreadyInCart + calculatedBase}) exceeds available stock (${selectedItem.quantity}).`);
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
    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-5 relative" ref={containerRef}>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Select Item</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    ref={target === 'new' ? searchInputRef : undefined}
                    type="text" 
                    value={searchQuery} 
                    onFocus={() => setIsAutocompleteOpen(true)} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search by Name or SKU..." 
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent shadow-sm bg-white"
                    autoComplete="off" 
                />
              </div>
              {isAutocompleteOpen && filteredInventory.length > 0 && searchQuery && (
                  <div ref={listRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-[60] max-h-60 overflow-auto">
                    <div className="px-4 py-2 border-b border-slate-50 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Search Results</div>
                    {filteredInventory.map((item, idx) => (
                        <button 
                            key={item.id} 
                            onClick={() => handleSelectItem(item)} 
                            className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 transition-colors ${idx === activeIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                        >
                            <div className={`font-bold text-sm truncate ${idx === activeIndex ? 'text-indigo-700' : 'text-slate-800'}`}>{item.name}</div>
                            <div className="flex justify-between items-center mt-0.5">
                                <span className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${idx === activeIndex ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-600'}`}>Stock: {item.quantity} {item.baseUnit}</span>
                            </div>
                        </button>
                    ))}
                  </div>
              )}
          </div>
          <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Unit</label>
              <select 
                disabled={!selectedItem}
                value={selectedUnit}
                onChange={(e) => handleUnitSelect(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-600 bg-white shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
              >
                {!selectedItem && <option value="">Select Item...</option>}
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Quantity</label>
              <div className="relative">
                <input 
                  ref={target === 'new' ? qtyInputRef : undefined}
                  type="number" 
                  step="any"
                  placeholder="0" 
                  value={quantityInput ?? ''} 
                  onChange={e => setQuantityInput(e.target.value === '' ? undefined : Number(e.target.value))}
                  onKeyDown={(e) => handleQtyKeyDown(e, target)} 
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 outline-none transition-all shadow-sm ${noSpinnerClass} ${validationError ? 'border-rose-300 ring-rose-100 bg-rose-50 text-rose-700 focus:ring-rose-500' : 'border-slate-300 focus:ring-indigo-600'}`} 
                />
              </div>
          </div>
          <div className="lg:col-span-3">
            <button 
                onClick={() => handleAddToCart(target)} 
                disabled={!selectedItem || !quantityInput || !!validationError}
                className={`w-full py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${!selectedItem || !quantityInput || !!validationError ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
            >
                <PlusCircle className="w-4 h-4" /> Add to Cart
            </button>
          </div>
        </div>
        
        {selectedItem && (
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide bg-white p-3 rounded-lg border border-slate-100 shadow-sm animate-in fade-in slide-in-from-left-1">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            Conversion: 1 {selectedUnit} = {conversionRatio} {selectedItem.baseUnit} 
            {quantityInput !== undefined && (
              <span className="ml-auto text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">Total Input: {totalBaseCalc} {selectedItem.baseUnit}</span>
            )}
          </div>
        )}

        {validationError && (
            <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 p-3 rounded-xl border border-rose-100 animate-in fade-in slide-in-from-top-1">
                <AlertTriangle className="w-4 h-4" />
                {validationError}
            </div>
        )}
    </div>
  );

  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      {/* Navigation & Controls */}
      <div className="flex justify-between items-end border-b border-slate-200 pb-1">
        <div className="flex space-x-6">
          {canEdit && (
            <button 
                onClick={() => { setActiveTab('new'); setValidationError(null); setTimeout(() => searchInputRef.current?.focus(), 100); }} 
                className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'new' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                New Transaction
                {activeTab === 'new' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></span>}
            </button>
          )}
          <button 
            onClick={() => setActiveTab('history')} 
            className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            History Log
            {activeTab === 'history' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></span>}
          </button>
        </div>
        
        {activeTab === 'history' && (
          <div className="relative pb-2" ref={columnMenuRef}>
            <button onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-slate-600" title="Columns">
              <Columns className="w-4 h-4" />
            </button>
            {isColumnMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] p-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase px-3 py-2">Visible Columns</div>
                {columns.map(col => (
                  <label key={col.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer text-sm">
                    <input type="checkbox" checked={col.visible} onChange={() => onToggleColumn(col.id)} className="rounded text-indigo-600 focus:ring-indigo-600" />
                    <span className="text-slate-700 font-medium">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto pb-6 custom-scrollbar">
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" /> Transaction Details
                </h3>
                
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-600 bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide text-center">Transaction Type</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button 
                        onClick={() => { setType('IN'); setValidationError(null); requestAnimationFrame(() => searchInputRef.current?.focus()); }} 
                        className={`flex-1 flex items-center justify-center py-2 rounded-lg text-sm font-bold transition-all ${type === 'IN' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <PlusCircle className="w-4 h-4 mr-2" /> Inbound
                      </button>
                      <button 
                        onClick={() => { setType('OUT'); setValidationError(null); requestAnimationFrame(() => searchInputRef.current?.focus()); }} 
                        className={`flex-1 flex items-center justify-center py-2 rounded-lg text-sm font-bold transition-all ${type === 'OUT' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <MinusCircle className="w-4 h-4 mr-2" /> Outbound
                      </button>
                    </div>
                  </div>
                </div>

                {type === 'IN' && (
                  <div className="space-y-5 mb-8 p-6 bg-emerald-50/60 rounded-2xl border border-emerald-100 animate-in slide-in-from-top-2">
                    <div className="text-xs font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                        <Package className="w-4 h-4" /> Supplier & Documents
                    </div>
                    <input value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-emerald-300" placeholder="Supplier Name" />
                    <div className="grid grid-cols-2 gap-4">
                      <input value={poNumber} onChange={e => setPoNumber(e.target.value)} className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-emerald-300" placeholder="PO Number" />
                      <input value={riNumber} onChange={e => setRiNumber(e.target.value)} className="w-full px-4 py-2.5 border border-emerald-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-emerald-300" placeholder="Receipt / SJ Number" />
                    </div>
                  </div>
                )}

                {renderItemInput('new', searchContainerRef)}

                <div className="mt-8">
                    <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">Attachments</label>
                    <div className="flex flex-wrap gap-4">
                         {photos.map((p, i) => (
                             <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 group shadow-sm bg-slate-50">
                                 <img src={p} className="w-full h-full object-cover" />
                                 <button onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 p-1.5 bg-white/90 text-rose-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-white"><X className="w-3 h-3" /></button>
                             </div>
                         ))}
                         <label className="w-24 h-24 flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-xl hover:bg-slate-50 hover:border-indigo-400 cursor-pointer transition-all group">
                            <Camera className="w-6 h-6 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                            <span className="text-[10px] text-slate-400 mt-2 font-bold group-hover:text-indigo-600 uppercase tracking-wide">Upload</span>
                            <input type="file" multiple accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, 'new')} />
                         </label>
                    </div>
                </div>
              </div>
           </div>

           <div className="lg:col-span-1 h-full min-h-[500px]">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 flex flex-col h-full shadow-[0_2px_12px_rgba(0,0,0,0.04)] sticky top-6">
                <div className="flex items-center justify-between flex-shrink-0 border-b border-slate-100 pb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm"><Package className="w-4 h-4 text-indigo-600" /> Cart Summary</h3>
                    <span className="bg-slate-900 text-white text-[10px] px-2.5 py-1 rounded-full font-bold">{cartItems.length} ITEMS</span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[500px]">
                    {cartItems.length > 0 ? (
                        <div className="space-y-3">
                            {cartItems.map((it, i) => (
                                <div key={i} className="p-4 bg-white rounded-xl border border-slate-200 flex justify-between items-start animate-in slide-in-from-right-2 group hover:border-indigo-200 transition-colors shadow-sm">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-bold text-slate-900 truncate uppercase tracking-wide">{it.itemName}</div>
                                        <div className="flex items-center gap-2 mt-2 text-[11px] font-medium text-slate-500">
                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{it.quantityInput} {it.selectedUnit}</span>
                                            <ArrowRightLeft className="w-3 h-3 text-slate-300" />
                                            <span className="text-indigo-600 font-bold">{it.totalBaseQuantity} {inventory.find(inv => inv.id === it.itemId)?.baseUnit}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setCartItems(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                            <Package className="w-12 h-12 mb-3 opacity-20" strokeWidth={1} />
                            <p className="text-xs font-bold uppercase tracking-widest opacity-50">Cart is Empty</p>
                        </div>
                    )}
                </div>
                
                <div className="pt-5 border-t border-slate-100 space-y-4 flex-shrink-0">
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add transaction notes..." className="w-full p-3.5 border border-slate-200 rounded-xl text-sm resize-none h-24 outline-none focus:ring-2 focus:ring-indigo-600 transition-all bg-white" />
                    <button onClick={handleSubmitTransaction} disabled={cartItems.length === 0} className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm tracking-wide disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 hover:bg-slate-800 shadow-md transition-all active:scale-[0.98]">SUBMIT TRANSACTION</button>
                </div>
              </div>
           </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200 flex-1 overflow-hidden flex flex-col">
           <div className="overflow-auto flex-1 custom-scrollbar">
               <table className="w-full text-left text-sm min-w-[900px]">
                 <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm z-10 border-b border-slate-200 shadow-sm">
                   <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                     {isVisible('date') && <th className="px-6 py-4">Date</th>}
                     {isVisible('type') && <th className="px-6 py-4">Type</th>}
                     {isVisible('details') && <th className="px-6 py-4">Details</th>}
                     {isVisible('docs') && <th className="px-6 py-4">Docs</th>}
                     {isVisible('notes') && <th className="px-6 py-4">Notes</th>}
                     <th className="px-6 py-4 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                    {transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 group transition-colors">
                            {isVisible('date') && <td className="px-6 py-4 font-medium text-slate-600 tabular-nums">{tx.date}</td>}
                            {isVisible('type') && <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${tx.type === 'IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>{tx.type === 'IN' ? 'Inbound' : 'Outbound'}</span></td>}
                            {isVisible('details') && <td className="px-6 py-4 text-sm font-semibold text-slate-800">{tx.items.length} Items {tx.supplierName && <span className="text-slate-400 font-normal ml-1">— {tx.supplierName}</span>}</td>}
                            {isVisible('docs') && <td className="px-6 py-4 text-xs flex items-center gap-1.5 font-bold text-slate-500">{tx.photos?.length || 0} <ImageIcon className="w-3.5 h-3.5 text-slate-400" /></td>}
                            {isVisible('notes') && <td className="px-6 py-4 max-w-[200px] truncate text-slate-500 text-xs italic">{tx.notes || '-'}</td>}
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => openEditModal(tx)} 
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title={canEdit ? 'Edit' : 'View'}
                                >
                                  {canEdit ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                {canEdit && (
                                  <button 
                                    onClick={() => { if(window.confirm('Delete this transaction?')) onDeleteTransaction(tx.id); }} 
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
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
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
              <div className="px-8 py-6 border-b border-slate-100 bg-white flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 p-2 rounded-lg">{canEdit ? <Edit3 className="w-5 h-5 text-indigo-600" /> : <Eye className="w-5 h-5 text-indigo-600" />}</div>
                    <h3 className="font-bold text-slate-900 text-lg">{canEdit ? 'Edit Transaction' : 'Transaction Details'}</h3>
                  </div>
                  <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 block uppercase mb-2 tracking-wide">Date</label>
                            <input type="date" disabled={!canEdit} value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all bg-white" />
                        </div>
                        {editingTransaction.type === 'IN' && (
                            <div className="p-5 bg-emerald-50/50 rounded-xl space-y-4 border border-emerald-100">
                                <label className="text-xs font-bold text-emerald-700 block uppercase tracking-wide">Supplier Info</label>
                                <input disabled={!canEdit} value={editSupplierName} onChange={e => setEditSupplierName(e.target.value)} placeholder="Supplier Name" className="w-full border border-emerald-200 rounded-xl p-3 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
                                <div className="grid grid-cols-2 gap-4">
                                    <input disabled={!canEdit} value={editPoNumber} onChange={e => setEditPoNumber(e.target.value)} placeholder="PO Number" className="w-full border border-emerald-200 rounded-xl p-3 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
                                    <input disabled={!canEdit} value={editRiNumber} onChange={e => setEditRiNumber(e.target.value)} placeholder="SJ Number" className="w-full border border-emerald-200 rounded-xl p-3 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-bold text-slate-500 block uppercase mb-2 tracking-wide">Notes</label>
                            <textarea disabled={!canEdit} value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={4} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all resize-none bg-white" />
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-xl border border-slate-200 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-200 bg-slate-100/50">
                            <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">Items</label>
                        </div>
                        <div className="p-4 space-y-3 overflow-y-auto max-h-[350px] custom-scrollbar">
                           {editCartItems.map((it, i) => (
                             <div key={i} className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                               <div className="min-w-0 flex-1">
                                 <div className="font-bold text-slate-900 uppercase truncate text-xs leading-tight">{it.itemName}</div>
                                 <div className="text-[10px] text-slate-400 mt-1 font-mono">ID: {it.itemId}</div>
                               </div>
                               <div className="flex items-center gap-3">
                                  {canEdit ? (
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                step="any"
                                                className={`w-20 border border-slate-200 rounded-lg text-center py-1.5 font-bold bg-white text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600 ${noSpinnerClass} text-sm`} 
                                                value={it.quantityInput} 
                                                onChange={e => updateEditItemQty(i, Number(e.target.value))} 
                                            />
                                            <span className="font-bold text-slate-500 text-[10px] uppercase">{it.selectedUnit}</span>
                                        </div>
                                        <div className="text-[9px] font-medium text-slate-400 mt-1">System: {it.totalBaseQuantity} {inventory.find(v => v.id === it.itemId)?.baseUnit}</div>
                                    </div>
                                  ) : (
                                    <div className="text-right">
                                        <div className="font-bold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg text-xs">{it.quantityInput} {it.selectedUnit}</div>
                                        <div className="text-[9px] font-medium text-slate-400 mt-1">System: {it.totalBaseQuantity} {inventory.find(v => v.id === it.itemId)?.baseUnit}</div>
                                    </div>
                                  )}
                                  {canEdit && <button onClick={() => setEditCartItems(editCartItems.filter((_, idx) => idx !== i))} className="p-2 bg-white border border-slate-200 text-slate-400 rounded-lg hover:text-rose-600 hover:border-rose-200 transition-colors shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>}
                               </div>
                             </div>
                           ))}
                        </div>
                      </div>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                     <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">Attachments</label>
                        {canEdit && (
                            <label className="text-[10px] font-bold text-indigo-600 flex items-center gap-1.5 cursor-pointer bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors uppercase tracking-wide">
                                <Plus className="w-3.5 h-3.5" /> Add Photo
                                <input type="file" multiple accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, 'edit')} />
                            </label>
                        )}
                     </div>
                     <div className="flex gap-4 flex-wrap bg-slate-50 p-6 rounded-xl min-h-[100px] border border-dashed border-slate-300">
                        {editPhotos.map((p, i) => (
                          <div key={i} className="relative w-24 h-24 group flex-shrink-0">
                            <img src={p} className="w-full h-full object-cover rounded-xl border border-white bg-white shadow-sm transition-transform group-hover:scale-[1.02]" />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity rounded-xl backdrop-blur-[1px]">
                              <button onClick={() => setPreviewPhoto(p)} className="p-2 bg-white rounded-lg shadow-lg text-slate-900 hover:bg-indigo-50 transition-colors"><Maximize2 className="w-3.5 h-3.5" /></button>
                              {canEdit && <button onClick={() => setEditPhotos(prev => prev.filter((_, idx) => idx !== i))} className="p-2 bg-white rounded-lg shadow-lg text-rose-600 hover:bg-rose-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                            </div>
                          </div>
                        ))}
                        {editPhotos.length === 0 && <div className="flex flex-col items-center justify-center w-full text-slate-400 italic py-4">
                            <ImageIcon className="w-8 h-8 opacity-20 mb-2" strokeWidth={1.5} />
                            <span className="text-[10px] font-medium uppercase tracking-widest opacity-60">No Photos Attached</span>
                        </div>}
                     </div>
                  </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-4">
                <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-lg transition-colors text-sm">Cancel</button>
                {canEdit && <button onClick={handleSaveEdit} className="px-8 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-sm shadow-md hover:bg-slate-800 transition-all flex items-center gap-2"><Save className="w-4 h-4" /> Save Changes</button>}
              </div>
           </div>
         </div>
      )}

      {previewPhoto && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 p-8 animate-in fade-in duration-300" onClick={() => setPreviewPhoto(null)}>
           <div className="relative max-w-full max-h-full" onClick={e => e.stopPropagation()}>
               <div className="absolute -top-12 right-0 flex gap-3">
                 <button onClick={() => handleDownloadPhoto(previewPhoto)} className="text-white hover:text-indigo-400 bg-white/10 p-2 rounded-full transition-all backdrop-blur-md" title="Download"><Download className="w-6 h-6" /></button>
                 <button onClick={() => setPreviewPhoto(null)} className="text-white hover:text-rose-400 bg-white/10 p-2 rounded-full transition-all backdrop-blur-md" title="Close"><X className="w-6 h-6" /></button>
               </div>
               <img src={previewPhoto} className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/10" />
           </div>
        </div>
      )}
    </div>
  );
};

export default TransactionManager;