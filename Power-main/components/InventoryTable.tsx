
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
      category: formData.category || 'Lainnya', 
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

  // Logic navigasi antar field menggunakan panah
  const handleArrowNavigation = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    
    const form = modalFormRef.current;
    if (!form) return;

    // Ambil semua elemen input/select yang bisa difokuskan
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

  // Utility class untuk menyembunyikan spinner pada input number
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
            category: String(getVal(['KATEGORI', 'CATEGORY']) || 'Umum'),
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
      } catch (error) { alert("Gagal membaca file Excel."); }
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
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 w-full sm:w-auto shadow-sm">
          <Search className="w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Cari barang atau SKU..." className="bg-transparent outline-none text-sm w-full sm:w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap justify-end items-center">
          <select className="bg-white border border-slate-200 text-slate-700 py-2 px-3 rounded-lg shadow-sm text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="All">Semua Kategori</option>
            {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="relative" ref={columnMenuRef}>
            <button onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"><Columns className="w-5 h-5 text-slate-600" /></button>
            {isColumnMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] p-2">
                {columns.map(col => (
                  <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-sm">
                    <input type="checkbox" checked={col.visible} onChange={() => onToggleColumn(col.id)} />
                    <span className="text-slate-700">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {canEdit && (
            <>
               <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
               <div className="flex bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden h-[38px]">
                  <button onClick={handleDownloadTemplate} className="px-3 py-2 text-slate-600 hover:bg-slate-50 border-r border-slate-200 flex items-center gap-2 text-sm"><Download className="w-4 h-4 text-blue-600" /> <span className="hidden sm:inline">Template</span></button>
                  <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 text-slate-600 hover:bg-slate-50 flex items-center gap-2 text-sm"><FileSpreadsheet className="w-4 h-4 text-emerald-600" /> <span className="hidden sm:inline">Import</span></button>
               </div>
               <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm h-[38px]"><Plus className="w-4 h-4" /> Barang</button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                {isVisible('name') && <th className="px-6 py-4">Nama Barang</th>}
                {isVisible('category') && <th className="px-6 py-4">Kategori</th>}
                {isVisible('quantity') && <th className="px-6 py-4 text-center">Stok</th>}
                {isVisible('price') && <th className="px-6 py-4 text-right">Harga</th>}
                {isVisible('location') && <th className="px-6 py-4 text-center">Lokasi</th>}
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length > 0 ? filteredItems.map(item => {
                const isAlertItem = (item.minLevel || 0) > 0 && item.quantity <= item.minLevel;
                const isInactive = item.status === 'inactive';
                return (
                  <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isInactive ? 'opacity-60 grayscale' : ''} ${isAlertItem && !isInactive ? 'bg-amber-50' : ''}`}>
                    {isVisible('name') && (
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2"><span className="font-medium">{item.name}</span> {isAlertItem && !isInactive && <AlertTriangle className="w-4 h-4 text-amber-500" />}</div>
                            <span className="text-xs text-slate-400 font-mono">ID: {item.sku}</span>
                          </div>
                        </td>
                    )}
                    {isVisible('category') && (<td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{item.category}</span></td>)}
                    {isVisible('quantity') && (<td className="px-6 py-4 text-center font-semibold">{item.quantity} {item.baseUnit}</td>)}
                    {isVisible('price') && (<td className="px-6 py-4 text-right font-medium text-slate-600">{formatCurrency(item.unitPrice)}</td>)}
                    {isVisible('location') && <td className="px-6 py-4 text-center text-sm text-slate-500">{item.location || '-'}</td>}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        {canEdit ? (
                            <>
                                <button onClick={() => onUpdateItem({ ...item, status: item.status === 'inactive' ? 'active' : 'inactive' })} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full"><Power className="w-4 h-4" /></button>
                                <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => window.confirm('Hapus?') && onDeleteItem(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"><Trash2 className="w-4 h-4" /></button>
                            </>
                        ) : <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"><Eye className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              }) : <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-400">Data kosong.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 uppercase">{editingItem ? 'Edit Barang' : 'Barang Baru'}</h3>
                      <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  <form ref={modalFormRef} onSubmit={handleSubmit} onKeyDown={handleArrowNavigation} className="p-6 overflow-y-auto space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">NAMA BARANG</label>
                              <input required className="w-full px-3 py-2 border rounded-lg outline-none text-sm" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">SKU</label>
                              <input required className="w-full px-3 py-2 border rounded-lg outline-none text-sm" value={formData.sku || ''} onChange={e => setFormData({...formData, sku: e.target.value})} />
                          </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
                          <h4 className="text-xs font-bold text-blue-700 uppercase flex items-center gap-2"><Box className="w-4 h-4" /> Satuan & Stok</h4>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-bold text-blue-600 mb-1">SATUAN DASAR</label>
                                  <input required className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white" value={formData.baseUnit || ''} onChange={e => setFormData({...formData, baseUnit: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-bold text-blue-600 mb-1">STOK FISIK</label>
                                  <input required type="number" step="any" className={`w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white outline-none ${noSpinnerClass}`} value={formData.quantity ?? ''} onChange={e => setFormData({...formData, quantity: e.target.value === '' ? undefined : Number(e.target.value)})} />
                              </div>
                          </div>
                          <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Unit Alternatif</label>
                                  <button type="button" onClick={addAltUnit} className="text-[10px] font-bold text-blue-600 bg-white border border-blue-200 px-2 py-1 rounded">+ Unit</button>
                              </div>
                              {alternativeUnits.map((u, i) => (
                                  <div key={i} className="flex gap-2 items-end">
                                      <input className="flex-1 px-3 py-1.5 border rounded-lg text-xs" placeholder="Unit (Box)" value={u.name} onChange={e => updateAltUnit(i, 'name', e.target.value)} />
                                      <input type="number" step="any" className={`w-24 px-3 py-1.5 border rounded-lg text-xs outline-none ${noSpinnerClass}`} placeholder="Konversi" value={u.ratio || ''} onChange={e => updateAltUnit(i, 'ratio', e.target.value === '' ? 0 : Number(e.target.value))} />
                                      <button type="button" onClick={() => removeAltUnit(i)} className="p-1.5 text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Kategori</label>
                              <input className="w-full px-3 py-2 border rounded-lg text-sm" list="categories" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} />
                              <datalist id="categories">{dynamicCategories.map(c => <option key={c} value={c} />)}</datalist>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Lokasi Rak</label>
                              <input className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Harga Satuan</label>
                              <input type="number" step="any" className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${noSpinnerClass}`} value={formData.unitPrice ?? ''} onChange={e => setFormData({...formData, unitPrice: e.target.value === '' ? undefined : Number(e.target.value)})} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Batas Reorder</label>
                              <input type="number" step="any" className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${noSpinnerClass}`} value={formData.minLevel ?? ''} onChange={e => setFormData({...formData, minLevel: e.target.value === '' ? undefined : Number(e.target.value)})} />
                          </div>
                      </div>

                      <div className="pt-6 border-t flex justify-end gap-3">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium">Batal</button>
                          <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg">Simpan</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default InventoryTable;
