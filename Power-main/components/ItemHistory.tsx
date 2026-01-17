
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Transaction, TransactionType, InventoryItem, TableColumn } from '../types';
import { Search, Calendar, Filter, ArrowDownLeft, ArrowUpRight, FileText, Check, Search as SearchIcon, Columns } from 'lucide-react';
import useDebounce from '../hooks/useDebounce';

interface ItemHistoryProps {
  transactions: Transaction[];
  items: InventoryItem[]; // Added inventory source for autocomplete
  columns: TableColumn[];
  onToggleColumn: (id: string) => void;
}

interface HistoryRow {
  transactionId: string;
  date: string;
  type: TransactionType;
  itemId: string;
  itemName: string;
  qtyInput: number;
  unit: string;
  totalBaseQty: number;
  notes: string;
}

const ItemHistory: React.FC<ItemHistoryProps> = ({ transactions, items, columns, onToggleColumn }) => {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);

  // Autocomplete States
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  // Close autocomplete and column menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsAutocompleteOpen(false);
      }
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isVisible = (id: string) => columns.find(c => c.id === id)?.visible;

  // Enhanced Autocomplete Suggestions (Fuzzy / MeiliSearch-like)
  const autocompleteSuggestions = useMemo(() => {
    if (!debouncedSearchTerm) return [];
    
    const query = debouncedSearchTerm.toLowerCase().trim();
    const tokens = query.split(/\s+/).filter(t => t.length > 0);

    return items
      .filter(item => {
        const searchString = `${item.name} ${item.sku} ${item.category}`.toLowerCase();
        return tokens.every(token => searchString.includes(token));
      })
      .sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (nameA === query) return -1;
        if (nameB === query) return 1;
        if (nameA.startsWith(query) && !nameB.startsWith(query)) return -1;
        if (!nameA.startsWith(query) && nameB.startsWith(query)) return 1;
        return 0;
      })
      .slice(0, 5);
  }, [debouncedSearchTerm, items]);

  // Reset navigation index when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedSearchTerm]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
         activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  // Handle Autocomplete Selection
  const handleSelectSuggestion = (itemName: string) => {
    setSearchTerm(itemName);
    setIsAutocompleteOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isAutocompleteOpen || autocompleteSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < autocompleteSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < autocompleteSuggestions.length) {
        handleSelectSuggestion(autocompleteSuggestions[activeIndex].name);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsAutocompleteOpen(false);
    }
  };


  // Flatten transactions into a linear history of item movements
  const historyData = useMemo(() => {
    const flattened: HistoryRow[] = [];
    
    transactions.forEach(tx => {
      tx.items.forEach(item => {
        flattened.push({
          transactionId: tx.id,
          date: tx.date,
          type: tx.type,
          itemId: item.itemId,
          itemName: item.itemName,
          qtyInput: item.quantityInput,
          unit: item.selectedUnit,
          totalBaseQty: item.totalBaseQuantity,
          notes: tx.notes || ''
        });
      });
    });

    // Sort by date descending (newest first)
    return flattened.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  // Apply filters to the table using Debounced Search (Using Multi-word logic too)
  const filteredHistory = useMemo(() => {
    const query = debouncedSearchTerm.toLowerCase().trim();
    const tokens = query.split(/\s+/).filter(t => t.length > 0);

    return historyData.filter(item => {
      // Search Term (Name) - matches multi-word token
      const itemName = item.itemName.toLowerCase();
      const matchesSearch = tokens.every(token => itemName.includes(token));

      // Date Range
      const itemDate = new Date(item.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      const matchesStart = start ? itemDate >= start : true;
      const matchesEnd = end ? itemDate <= end : true;

      // Type Filter
      const matchesType = typeFilter === 'ALL' || item.type === typeFilter;

      return matchesSearch && matchesStart && matchesEnd && matchesType;
    });
  }, [historyData, debouncedSearchTerm, startDate, endDate, typeFilter]);

  // Calculations for summary based on filtered view
  const summary = useMemo(() => {
    const totalIn = filteredHistory
      .filter(h => h.type === 'IN')
      .reduce((acc, curr) => acc + curr.totalBaseQty, 0);
    
    const totalOut = filteredHistory
      .filter(h => h.type === 'OUT')
      .reduce((acc, curr) => acc + curr.totalBaseQty, 0);

    return { totalIn, totalOut, count: filteredHistory.length };
  }, [filteredHistory]);

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full">
      {/* Filters Card */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <Filter className="w-5 h-5 text-blue-600" />
                <h3>Filter History</h3>
            </div>
             {/* Column Toggle */}
            <div className="relative" ref={columnMenuRef}>
                <button
                onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 text-sm"
                title="Customize Columns"
                >
                <Columns className="w-4 h-4" />
                </button>
                {isColumnMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-20 p-2 animate-in fade-in zoom-in-95 duration-100">
                        <div className="text-xs font-semibold text-slate-500 uppercase px-2 py-1 mb-1">Visible Columns</div>
                        {columns.map(col => (
                            <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm">
                            <input 
                                type="checkbox"
                                checked={col.visible}
                                onChange={() => onToggleColumn(col.id)}
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            {col.label}
                            </label>
                        ))}
                    </div>
                )}
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Enhanced Autocomplete Search */}
          <div className="relative" ref={searchRef}>
            <label className="block text-xs font-medium text-slate-500 mb-1">Item Name</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search item..."
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsAutocompleteOpen(true);
                }}
                onFocus={() => setIsAutocompleteOpen(true)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                autoComplete="off"
              />
            </div>
            
            {/* Dropdown Suggestions */}
            {isAutocompleteOpen && autocompleteSuggestions.length > 0 && (
                <div ref={listRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                    {autocompleteSuggestions.map((item, index) => (
                        <button
                            key={item.id}
                            onClick={() => handleSelectSuggestion(item.name)}
                            className={`w-full text-left px-4 py-3 border-b border-slate-100 last:border-0 flex justify-between items-center group transition-colors ${index === activeIndex ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                        >
                            <div>
                                <div className={`font-medium text-sm ${index === activeIndex ? 'text-blue-700' : 'text-slate-800'}`}>{item.name}</div>
                                <div className="text-xs text-slate-500">SKU: {item.sku}</div>
                            </div>
                            {index === activeIndex ? (
                                <Check className="w-4 h-4 text-blue-600" />
                            ) : (
                                <SearchIcon className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                            )}
                        </button>
                    ))}
                </div>
            )}
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Transaction Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="ALL">All Transactions</option>
              <option value="IN">Inbound (Masuk)</option>
              <option value="OUT">Outbound (Keluar)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats for Filtered Data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-xs text-slate-500 font-medium">Filtered Movements</p>
             <h4 className="text-xl font-bold text-slate-800">{summary.count} Records</h4>
           </div>
           <div className="bg-slate-100 p-2 rounded-lg">
             <FileText className="w-5 h-5 text-slate-600" />
           </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-xs text-slate-500 font-medium">Total Inbound (Base)</p>
             <h4 className="text-xl font-bold text-emerald-600">+{summary.totalIn}</h4>
           </div>
           <div className="bg-emerald-50 p-2 rounded-lg">
             <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
           </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-xs text-slate-500 font-medium">Total Outbound (Base)</p>
             <h4 className="text-xl font-bold text-rose-600">-{summary.totalOut}</h4>
           </div>
           <div className="bg-rose-50 p-2 rounded-lg">
             <ArrowUpRight className="w-5 h-5 text-rose-600" />
           </div>
        </div>
      </div>

      {/* History Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {isVisible('date') && <th className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50">Date</th>}
                {isVisible('name') && <th className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50">Item Name</th>}
                {isVisible('type') && <th className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50">Type</th>}
                {isVisible('qty') && <th className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50">Qty</th>}
                {isVisible('total') && <th className="px-6 py-4 bg-slate-50">Total Base</th>}
                {isVisible('notes') && <th className="px-6 py-4 bg-slate-50">Notes</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((row, idx) => (
                  <tr key={`${row.transactionId}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    {isVisible('date') && (
                        <td className="px-4 py-3 sm:px-6 sm:py-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {row.date}
                        </div>
                        </td>
                    )}
                    {isVisible('name') && (
                        <td className="px-4 py-3 sm:px-6 sm:py-4 font-medium text-slate-800">
                        {row.itemName}
                        </td>
                    )}
                    {isVisible('type') && (
                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${row.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {row.type === 'IN' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {row.type}
                        </span>
                        </td>
                    )}
                    {isVisible('qty') && (
                        <td className="px-4 py-3 sm:px-6 sm:py-4 text-slate-700">
                        {row.qtyInput} <span className="text-slate-500 text-xs">{row.unit}</span>
                        </td>
                    )}
                    {isVisible('total') && (
                        <td className="px-6 py-4 font-mono text-slate-600">
                        {row.totalBaseQty}
                        </td>
                    )}
                    {isVisible('notes') && (
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                        {row.notes || '-'}
                        </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.filter(c => c.visible).length} className="px-6 py-12 text-center text-slate-400">
                    No history found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ItemHistory;
    