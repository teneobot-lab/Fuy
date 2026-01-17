import React, { useState, useRef, useEffect } from 'react';
import { Supplier, UserRole, TableColumn } from '../types';
import { generateId } from '../utils/storageUtils';
import { Search, Plus, Edit2, Trash2, MapPin, Phone, Mail, Building, X, Save, Columns } from 'lucide-react';
import useDebounce from '../hooks/useDebounce';

interface SupplierManagerProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Supplier) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  userRole: UserRole;
  columns: TableColumn[];
  onToggleColumn: (id: string) => void;
}

const SupplierManager: React.FC<SupplierManagerProps> = ({ 
  suppliers, onAddSupplier, onUpdateSupplier, onDeleteSupplier, userRole, columns, onToggleColumn 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const canEdit = userRole === 'admin' || userRole === 'staff';
  const columnMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isVisible = (id: string) => columns.find(c => c.id === id)?.visible;

  // Form State
  const initialFormState: Omit<Supplier, 'id'> = {
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
    s.contactPerson.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address
      });
    } else {
      setEditingSupplier(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!formData.name) return;

    const supplierData: Supplier = {
      id: editingSupplier ? editingSupplier.id : generateId(),
      ...formData
    };

    if (editingSupplier) {
      onUpdateSupplier(supplierData);
    } else {
      onAddSupplier(supplierData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 w-full sm:w-auto shadow-sm">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search suppliers..." 
            className="bg-transparent outline-none text-sm w-full sm:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto justify-end">
            {/* Column Toggle */}
            <div className="relative" ref={columnMenuRef}>
                <button
                onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg shadow-sm hover:bg-slate-50 text-sm h-full"
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

            {canEdit && (
                <button 
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors whitespace-nowrap justify-center"
                >
                <Plus className="w-4 h-4" />
                Add Supplier
                </button>
            )}
        </div>
      </div>

      {/* Suppliers Grid/List with Freeze Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col min-h-0">
         <div className="overflow-auto flex-1 custom-scrollbar">
           <table className="w-full text-left border-collapse min-w-[800px]">
             <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
               <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                 {isVisible('company') && <th className="px-6 py-4 bg-slate-50">Company Name</th>}
                 {isVisible('contact') && <th className="px-6 py-4 bg-slate-50">Contact Person</th>}
                 {isVisible('info') && <th className="px-6 py-4 bg-slate-50">Contact Info</th>}
                 {isVisible('address') && <th className="px-6 py-4 bg-slate-50">Address</th>}
                 <th className="px-6 py-4 text-right bg-slate-50">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-200">
               {filteredSuppliers.length > 0 ? (
                 filteredSuppliers.map(supplier => (
                   <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                     {isVisible('company') && (
                        <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <Building className="w-4 h-4" />
                            </div>
                            <span className="font-medium text-slate-900">{supplier.name}</span>
                        </div>
                        </td>
                     )}
                     {isVisible('contact') && (
                        <td className="px-6 py-4 text-slate-600">
                        {supplier.contactPerson || '-'}
                        </td>
                     )}
                     {isVisible('info') && (
                        <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-sm">
                            {supplier.email && (
                                <div className="flex items-center gap-2 text-slate-500">
                                <Mail className="w-3.5 h-3.5" />
                                {supplier.email}
                                </div>
                            )}
                            {supplier.phone && (
                                <div className="flex items-center gap-2 text-slate-500">
                                <Phone className="w-3.5 h-3.5" />
                                {supplier.phone}
                                </div>
                            )}
                        </div>
                        </td>
                     )}
                     {isVisible('address') && (
                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {supplier.address || '-'}
                        </div>
                        </td>
                     )}
                     <td className="px-6 py-4">
                       <div className="flex justify-end gap-2">
                         {canEdit ? (
                            <>
                                <button 
                                onClick={() => handleOpenModal(supplier)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                onClick={() => {
                                    if(window.confirm(`Are you sure you want to delete ${supplier.name}?`)) {
                                    onDeleteSupplier(supplier.id);
                                    }
                                }}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                         ) : (
                             <span className="text-xs text-slate-400 italic">Read-only</span>
                         )}
                       </div>
                     </td>
                   </tr>
                 ))
               ) : (
                 <tr>
                   <td colSpan={columns.filter(c => c.visible).length + 1} className="px-6 py-12 text-center text-slate-400">
                     No suppliers found matching your search.
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                <h3 className="text-lg font-bold text-slate-800">
                   {editingSupplier ? (canEdit ? 'Edit Supplier' : 'Supplier Details') : 'Add New Supplier'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                   <X className="w-6 h-6" />
                </button>
             </div>

             <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <fieldset disabled={!canEdit} className="space-y-4">
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                    <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                        required
                        type="text"
                        className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100"
                        placeholder="e.g. Tech Distributors Inc."
                        value={formData.name}
                        onChange={e => setFormData({...formData,name: e.target.value})}
                        />
                    </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                        <input 
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100"
                        placeholder="e.g. John Doe"
                        value={formData.contactPerson}
                        onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <input 
                        type="tel"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100"
                        placeholder="+1 234..."
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                    </div>
                    </div>

                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input 
                        type="email"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100"
                        placeholder="contact@company.com"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                    </div>

                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <textarea 
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none disabled:bg-slate-100"
                        placeholder="Office address..."
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                    </div>
                </fieldset>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-4">
                   <button 
                     type="button" 
                     onClick={() => setIsModalOpen(false)}
                     className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                   >
                     Close
                   </button>
                   {canEdit && (
                        <button 
                            type="submit"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {editingSupplier ? 'Save Changes' : 'Create Supplier'}
                        </button>
                   )}
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManager;