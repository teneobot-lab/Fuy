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

// Enterprise Palette: Slate, Indigo, Emerald, Amber, Rose, Cyan
const COLORS = ['#0F172A', '#4F46E5', '#10B981', '#F59E0B', '#F43F5E', '#06B6D4'];

// Custom Tooltip Component for Bar Chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; 
    const item: InventoryItem | undefined = data.fullItem;
    
    return (
      <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-lg">
        <p className="font-bold text-slate-800 mb-1 text-sm">{label}</p>
        <p className="text-sm text-indigo-600 font-bold">
          Total Out: {data.quantity}
        </p>
        {item && (
           <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
             Current Stock: {item.quantity} {item.baseUnit}
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

  const topItemsData = useMemo(() => {
    const counts: Record<string, number> = {};
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

  const KPICard = ({ title, value, icon: Icon, colorClass, subText }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 flex items-start justify-between hover:shadow-md transition-shadow">
        <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
            <h3 className={`text-2xl font-bold ${colorClass || 'text-slate-900'}`}>{value}</h3>
            {subText && <p className="text-[10px] text-slate-400 mt-1">{subText}</p>}
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Icon className="w-6 h-6 text-slate-700" strokeWidth={1.5} />
        </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard 
                    title="Total Valuation" 
                    value={`Rp ${stats.totalValue.toLocaleString('id-ID')}`} 
                    icon={DollarSign} 
                    colorClass="text-slate-900"
                />
                <KPICard 
                    title="Total Units" 
                    value={stats.totalStockCount.toLocaleString()} 
                    icon={Package} 
                    subText="Physical count"
                />
                <KPICard 
                    title="Low Stock Alerts" 
                    value={stats.lowStockCount} 
                    icon={AlertTriangle} 
                    colorClass={stats.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}
                />
                <KPICard 
                    title="Unique SKUs" 
                    value={stats.totalItems} 
                    icon={TrendingUp} 
                />
            </div>

            {/* Charts & Alerts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Top Stock Levels */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100">
                    <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                        Top 5 High Velocity Items
                        <span className="text-[10px] font-normal text-slate-400 px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">OUTBOUND</span>
                    </h3>
                    <div className="h-[300px] w-full">
                        {topItemsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topItemsData} layout="vertical" margin={{ left: 10, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                                <Bar dataKey="quantity" fill="#0F172A" radius={[0, 4, 4, 0]} barSize={24} />
                            </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                                No transaction data available.
                            </div>
                        )}
                    </div>
                </div>

                {/* Category Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100">
                    <h3 className="text-base font-bold text-slate-900 mb-6">Inventory Mix</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            >
                            {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                            ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#0f172a', fontSize: '12px', fontWeight: 600 }} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-xs text-slate-500 font-medium ml-1">{value}</span>} />
                        </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Low Stock Notifications List */}
                <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Critical Stock Levels
                        </h3>
                        {stats.lowStockCount > 0 && (
                            <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100">
                                {stats.lowStockCount} ITEMS PENDING REORDER
                            </span>
                        )}
                    </div>
                    {lowStockItems.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {lowStockItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-lg hover:border-amber-200 transition-colors">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                                        <p className="text-xs text-slate-500 font-mono mt-0.5">{item.sku}</p>
                                    </div>
                                    <div className="text-right pl-4">
                                        <div className="flex items-center gap-1.5 justify-end">
                                            <span className="text-sm font-bold text-amber-600">{item.quantity}</span>
                                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">/ {item.minLevel} {item.baseUnit}</span>
                                        </div>
                                        <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
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
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                            <Package className="w-10 h-10 mb-3 text-slate-300" strokeWidth={1.5} />
                            <p className="text-sm font-medium">All stock levels are healthy.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;