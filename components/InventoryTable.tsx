import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryItem, UnitDefinition, UserRole, TableColumn } from '../types';
import { generateId } from '../utils/storageUtils';
import { Search, Plus, Filter, Edit2, Trash2, X, Eye, Columns, Download, FileSpreadsheet, Box, Power, AlertTriangle } from 'lucide-react';
import useDebounce from '../hooks/useDebounce';
import * as XLSX from 'xlsx';

interface InventoryTableProps {
  items: InventoryItem[];
  onAddItem: (item: InventoryItem) => void;
  onBatchAdd?: (items: InventoryItem[]) => void; 
  onUpdateItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  userRole: UserRole;
  columns: TableColumn[];
  onToggleColumn: (id: string) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ 
  items, onAddItem, onBatchAdd, onUpdateItem, onDeleteItem, userRole, columns, onToggleColumn 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [formData, setFormData] = useState<Partial<InventoryItem>>({});
  const [alternativeUnits, setAlternativeUnits] = useState<UnitDefinition[]>([]);

  const canEdit = userRole === 'admin' || userRole === 'staff';
  const isVisible = (id: string) => columns.find(c => c.id === id)?.visible;

  const dynamicCategories = useMemo(() => {
    const cats = items.map(item => item.category).filter(c => c && c.trim() !== '');
    return Array.from(new Set(cats)).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
        const term = debouncedSearchTerm.toLowerCase();
        const matchesSearch = item.name.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term);
        const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
      });
  }, [items, debouncedSearchTerm, categoryFilter]);

  const formatCurrency = (val: number) => {
    if (val === 0) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
      setAlternativeUnits(item.alternativeUnits || []);
    } else {
      setEditingItem(null);
      setFormData({ 
        category: '', location: '', name: '', sku: '', baseUnit: 'Pcs', status: 'active',
        quantity: undefined, unitPrice: undefined, minLevel: undefined
      });
      setAlternativeUnits([]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    const newItem: InventoryItem = {
      id: editingItem ? editingItem.id : generateId(),
      name: formData.name || '',
      sku: formData.sku || '',
      category: formData.category || 'General', 
      quantity: formData.quantity !== undefined ? Number(formData.quantity) : 0,
      baseUnit: formData.baseUnit || 'Pcs',
      alternativeUnits: alternativeUnits.map(u => ({ ...u, ratio: Number(u.ratio) || 0 })),
      minLevel: formData.minLevel !== undefined ? Number(formData.minLevel) : 0,
      unitPrice: formData.unitPrice !== undefined ? Number(formData.unitPrice) : 0,
      location: formData.location || '',
      lastUpdated: new Date().toISOString(),
      status: formData.status || 'active'
    };
    if (editingItem) onUpdateItem(newItem);
    else onAddItem(newItem);
    setIsModalOpen(false);
  };

  const handleArrowNavigation = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const form = modalFormRef.current;
    if (!form) return;
    const elements = Array.from(form.querySelectorAll('input:not([type="hidden"]), select, textarea')) as HTMLElement[];
    const currentIndex = elements.indexOf(document.activeElement as HTMLElement);
    if (currentIndex > -1) {
      e.preventDefault();
      if (e.key === 'ArrowDown') {
        const nextElement = elements[currentIndex + 1];
        if (nextElement) nextElement.focus();
      } else {
        const prevElement = elements[currentIndex - 1];
        if (prevElement) prevElement.focus();
      }
    }
  };

  const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  const handleDownloadTemplate = () => {
    const data = [
      ['ID BARANG (SKU)', 'NAMA BARANG', 'KATEGORI', 'SATUAN DASAR', 'STOK AWAL', 'HARGA BELI', 'LOKASI RAK', 'MINIMUM STOK', 'SATUAN ALT 1', 'KONVERSI ALT 1', 'SATUAN ALT 2', 'KONVERSI ALT 2'],
      ['ITEM-001', 'Contoh Barang A', 'Elektronik', 'Pcs', 100, 50000, 'A-01', 10, 'Box', 12, 'Karton', 144]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Inventory');
    XLSX.writeFile(wb, 'Template_Master_Inventory.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];
        
        const newItems: InventoryItem[] = rawData.map((row: any) => {
          const getVal = (patterns: string[]) => {
            const key = Object.keys(row).find(k => patterns.some(p => k.toUpperCase().includes(p.toUpperCase())));
            return key ? row[key] : undefined;
          };
          const altUnits: UnitDefinition[] = [];
          const u1 = getVal(['SATUAN ALT 1', 'UNIT ALT 1']);
          const r1 = getVal(['KONVERSI ALT 1', 'RASIO 1']);
          if (u1 && r1) altUnits.push({ name: String(u1), ratio: Number(r1) });
          const u2 = getVal(['SATUAN ALT 2', 'UNIT ALT 2']);
          const r2 = getVal(['KONVERSI ALT 2', 'RASIO 2']);
          if (u2 && r2) altUnits.push({ name: String(u2), ratio: Number(r2) });

          return {
            id: generateId(),
            sku: String(getVal(['SKU', 'ID BARANG', 'KODE']) || `SKU-${Math.random().toString(36).substr(2, 5).toUpperCase()}`),
            name: String(getVal(['NAMA', 'NAMA BARANG']) || 'Item Baru'),
            category: String(getVal(['KATEGORI', 'CATEGORY']) || 'General'),
            baseUnit: String(getVal(['SATUAN DASAR', 'BASE UNIT']) || 'Pcs'),
            quantity: Number(getVal(['STOK', 'JUMLAH', 'QUANTITY']) || 0),
            unitPrice: Number(getVal(['HARGA', 'PRICE', 'BELI']) || 0),
            location: String(getVal(['LOKASI', 'LOCATION', 'RAK']) || ''),
            minLevel: Number(getVal(['MINIMUM', 'BATAS', 'MIN STOK']) || 0),
            alternativeUnits: altUnits,
            lastUpdated: new Date().toISOString(),
            status: 'active'
          };
        });
        if (onBatchAdd && newItems.length > 0) onBatchAdd(newItems);
      } catch (error) { alert("Import failed."); }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const addAltUnit = () => setAlternativeUnits([...alternativeUnits, { name: '', ratio: 0 }]);
  const removeAltUnit = (idx: number) => setAlternativeUnits(alternativeUnits.filter((_, i) => i !== idx));
  const updateAltUnit = (idx: number, field: keyof UnitDefinition, val: string | number) => {
    const updated = [...alternativeUnits];
    // @ts-ignore
    updated[idx] = { ...updated[idx], [field]: val };
    setAlternativeUnits(updated);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* TOOLBAR */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 w-full sm:w-auto shadow-sm focus-within:ring-2 focus-within:ring-slate-900 focus-within:border-transparent transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search items or SKU..." 
            className="bg-transparent outline-none text-sm w-full sm:w-64 placeholder:text-slate-400 text-slate-900" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto flex-wrap justify-end items-center">
          <select className="bg-white border border-slate-200 text-slate-700 py-2.5 px-4 rounded-xl shadow-sm text-sm outline-none focus:ring-2 focus:ring-slate-900" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="All">All Categories</option>
            {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="relative" ref={columnMenuRef}>
            <button onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors text-slate-600"><Columns className="w-4 h-4" /></button>
            {isColumnMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] p-2">
                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Visible Columns</div>
                {columns.map(col => (
                  <label key={col.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer text-sm">
                    <input type="checkbox" checked={col.visible} onChange={() => onToggleColumn(col.id)} className="rounded text-slate-900 focus:ring-slate-900" />
                    <span className="text-slate-700 font-medium">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {canEdit && (
            <>
               <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
               <div className="flex bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[42px]">
                  <button onClick={handleDownloadTemplate} className="px-4 py-2 text-slate-600 hover:bg-slate-50 border-r border-slate-200 flex items-center gap-2 text-sm font-medium"><Download className="w-4 h-4" /> <span className="hidden sm:inline">Template</span></button>
                  <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 text-slate-600 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium"><FileSpreadsheet className="w-4 h-4" /> <span className="hidden sm:inline">Import</span></button>
               </div>
               <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition-all h-[42px]"><Plus className="w-4 h-4" /> New Item</button>
            </>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 shadow-sm">
              <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isVisible('name') && <th className="px-6 py-4">Item Name</th>}
                {isVisible('category') && <th className="px-6 py-4">Category</th>}
                {isVisible('quantity') && <th className="px-6 py-4 text-center">Stock Level</th>}
                {isVisible('price') && <th className="px-6 py-4 text-right">Unit Price</th>}
                {isVisible('location') && <th className="px-6 py-4 text-center">Location</th>}
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredItems.length > 0 ? filteredItems.map(item => {
                const isAlertItem = (item.minLevel || 0) > 0 && item.quantity <= item.minLevel;
                const isInactive = item.status === 'inactive';
                return (
                  <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors group ${isInactive ? 'opacity-50 grayscale' : ''}`}>
                    {isVisible('name') && (
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900">{item.name}</span> 
                                {isAlertItem && !isInactive && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                            </div>
                            <span className="text-xs text-slate-400 font-mono mt-0.5">SKU: {item.sku}</span>
                          </div>
                        </td>
                    )}
                    {isVisible('category') && (<td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">{item.category}</span></td>)}
                    {isVisible('quantity') && (
                        <td className="px-6 py-4 text-center">
                            <div className="inline-flex flex-col items-center">
                                <span className={`font-bold ${isAlertItem ? 'text-amber-600' : 'text-slate-900'}`}>{item.quantity}</span>
                                <span className="text-[10px] text-slate-400 font-medium uppercase">{item.baseUnit}</span>
                            </div>
                        </td>
                    )}
                    {isVisible('price') && (<td className="px-6 py-4 text-right font-medium text-slate-600 tabular-nums">{formatCurrency(item.unitPrice)}</td>)}
                    {isVisible('location') && <td className="px-6 py-4 text-center text-sm text-slate-500 font-medium">{item.location || '-'}</td>}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit ? (
                            <>
                                <button onClick={() => onUpdateItem({ ...item, status: item.status === 'inactive' ? 'active' : 'inactive' })} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Toggle Status"><Power className="w-4 h-4" /></button>
                                <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => window.confirm('Delete item?') && onDeleteItem(item.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </>
                        ) : <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              }) : <tr><td colSpan={10} className="px-6 py-16 text-center text-slate-400 text-sm italic">No inventory items found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 transition-all">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 animate-in zoom-in-95 duration-200">
                  <div className="px-8 py-6 border-b border-slate-100 bg-white flex justify-between items-center">
                      <h3 className="font-bold text-slate-900 text-lg">{editingItem ? 'Edit Item' : 'New Item'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                  <form ref={modalFormRef} onSubmit={handleSubmit} onKeyDown={handleArrowNavigation} className="p-8 overflow-y-auto space-y-6 custom-scrollbar">
                      <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Item Name</label>
                              <input required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm transition-all" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Wireless Mouse" />
                          </div>
                          <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">SKU</label>
                              <input required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm transition-all font-mono" value={formData.sku || ''} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="SKU-000" />
                          </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-5">
                          <h4 className="text-xs font-bold text-indigo-600 uppercase flex items-center gap-2 tracking-wide"><Box className="w-4 h-4" /> Stock & Units</h4>
                          <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-1.5">
                                  <label className="block text-xs font-semibold text-slate-600">Base Unit</label>
                                  <input required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.baseUnit || ''} onChange={e => setFormData({...formData, baseUnit: e.target.value})} placeholder="Pcs" />
                              </div>
                              <div className="space-y-1.5">
                                  <label className="block text-xs font-semibold text-slate-600">Current Stock</label>
                                  <input required type="number" step="any" className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none ${noSpinnerClass}`} value={formData.quantity ?? ''} onChange={e => setFormData({...formData, quantity: e.target.value === '' ? undefined : Number(e.target.value)})} />
                              </div>
                          </div>
                          <div className="space-y-3 pt-2 border-t border-slate-200">
                              <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alternative Units</label>
                                  <button type="button" onClick={addAltUnit} className="text-[10px] font-bold text-indigo-600 bg-white border border-indigo-100 hover:bg-indigo-50 px-3 py-1.5 rounded-md transition-colors">+ Add Unit</button>
                              </div>
                              {alternativeUnits.map((u, i) => (
                                  <div key={i} className="flex gap-3 items-end">
                                      <input className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Unit Name (e.g. Box)" value={u.name} onChange={e => updateAltUnit(i, 'name', e.target.value)} />
                                      <div className="relative w-32">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">x</span>
                                          <input type="number" step="any" className={`w-full pl-6 pr-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 ${noSpinnerClass}`} placeholder="Ratio" value={u.ratio || ''} onChange={e => updateAltUnit(i, 'ratio', e.target.value === '' ? 0 : Number(e.target.value))} />
                                      </div>
                                      <button type="button" onClick={() => removeAltUnit(i)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Category</label>
                              <input className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 text-sm" list="categories" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} />
                              <datalist id="categories">{dynamicCategories.map(c => <option key={c} value={c} />)}</datalist>
                          </div>
                          <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Rack Location</label>
                              <input className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 text-sm" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="A-01" />
                          </div>
                          <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Unit Price</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                                <input type="number" step="any" className={`w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 text-sm ${noSpinnerClass}`} value={formData.unitPrice ?? ''} onChange={e => setFormData({...formData, unitPrice: e.target.value === '' ? undefined : Number(e.target.value)})} />
                              </div>
                          </div>
                          <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Min Level</label>
                              <input type="number" step="any" className={`w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 text-sm ${noSpinnerClass}`} value={formData.minLevel ?? ''} onChange={e => setFormData({...formData, minLevel: e.target.value === '' ? undefined : Number(e.target.value)})} />
                          </div>
                      </div>

                      <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-lg transition-colors text-sm">Cancel</button>
                          <button type="submit" className="px-8 py-2.5 bg-slate-900 text-white rounded-lg font-bold shadow-md hover:bg-slate-800 transition-all text-sm">Save Item</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default InventoryTable;