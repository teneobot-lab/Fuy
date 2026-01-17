
import React, { useMemo } from 'react';
import { InventoryItem, Transaction } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { DollarSign, Package, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  transactions: Transaction[];
}

const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'];

// Custom Tooltip Component for Bar Chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; 
    const item: InventoryItem | undefined = data.fullItem;
    
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        <p className="text-sm text-blue-600 font-medium">
          Total Keluar: {data.quantity}
        </p>
        {item && (
           <p className="text-xs text-slate-500 mt-1 pt-1 border-t border-slate-100">
             Sisa Stok Saat Ini: {item.quantity} {item.baseUnit}
           </p>
        )}
      </div>
    );
  }

  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ items, transactions }) => {
  
  const stats = useMemo(() => {
    const totalItems = items.length;
    const lowStockCount = items.filter(i => i.minLevel > 0 && i.quantity <= i.minLevel).length;
    const totalValue = items.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
    const totalStockCount = items.reduce((acc, curr) => acc + curr.quantity, 0);

    return { totalItems, lowStockCount, totalValue, totalStockCount };
  }, [items]);

  const lowStockItems = useMemo(() => {
    return items.filter(i => i.minLevel > 0 && i.quantity <= i.minLevel)
      .sort((a, b) => (a.quantity / a.minLevel) - (b.quantity / b.minLevel));
  }, [items]);

  const categoryData = useMemo(() => {
    const counts: {[key: string]: number} = {};
    items.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + item.quantity;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [items]);

  // Logic: Top 5 Items Most Frequently Appearing in Outbound Transactions (by Quantity)
  const topItemsData = useMemo(() => {
    const counts: Record<string, number> = {};
    // Map item names to their IDs to look up full item details later
    const nameToIdMap: Record<string, string> = {}; 

    transactions
      .filter(t => t.type === 'OUT')
      .forEach(t => {
        t.items.forEach(item => {
          counts[item.itemName] = (counts[item.itemName] || 0) + item.quantityInput;
          nameToIdMap[item.itemName] = item.itemId;
        });
      });

    return Object.entries(counts)
      .map(([name, qty]) => {
         // Try to find current stock info for the tooltip
         const fullItem = items.find(i => i.name === name) || items.find(i => i.id === nameToIdMap[name]);
         return {
            name: name.length > 15 ? name.substring(0, 15) + '...' : name,
            quantity: qty,
            fullItem: fullItem
         };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [transactions, items]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-slate-500">Total Value</p>
                    <h3 className="text-2xl font-bold text-slate-900">
                        Rp {stats.totalValue.toLocaleString('id-ID')}
                    </h3>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-slate-500">Total Units</p>
                    <h3 className="text-2xl font-bold text-slate-900">{stats.totalStockCount}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg">
                    <Package className="w-6 h-6 text-emerald-600" />
                    </div>
                </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-slate-500">Low Stock Items</p>
                    <h3 className={`text-2xl font-bold ${stats.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{stats.lowStockCount}</h3>
                    </div>
                    <div className={`p-3 rounded-lg ${stats.lowStockCount > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                    <AlertTriangle className={`w-6 h-6 ${stats.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                    </div>
                </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-slate-500">Unique SKUs</p>
                    <h3 className="text-2xl font-bold text-slate-900">{stats.totalItems}</h3>
                    </div>
                    <div className="p-3 bg-violet-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-violet-600" />
                    </div>
                </div>
                </div>
            </div>

            {/* Charts & Alerts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Top Stock Levels */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Top 5 Barang Paling Banyak Keluar</h3>
                    <div className="h-[300px] w-full">
                        {topItemsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topItemsData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                                <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={30} />
                            </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 italic">
                                Belum ada data transaksi keluar.
                            </div>
                        )}
                    </div>
                </div>

                {/* Category Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Inventory by Category</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            >
                            {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Low Stock Notifications List */}
                <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Low Stock Warnings
                        </h3>
                        {stats.lowStockCount > 0 && (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                                {stats.lowStockCount} ALERTS
                            </span>
                        )}
                    </div>
                    {lowStockItems.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {lowStockItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg group hover:border-amber-300 transition-all">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                                        <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1.5 justify-end">
                                            <span className="text-sm font-bold text-amber-600">{item.quantity}</span>
                                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">/ {item.minLevel} {item.baseUnit}</span>
                                        </div>
                                        <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                            <div 
                                                className="h-full bg-amber-500 rounded-full" 
                                                style={{ width: `${Math.min(100, (item.quantity / item.minLevel) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                            <Package className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm">All stock levels are currently healthy.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;
