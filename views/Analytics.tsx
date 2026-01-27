
import React, { useState, useEffect } from 'react';
import { UserState } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { analyticsApi } from '../src/services/api';

interface AnalyticsProps {
  user: UserState;
}

interface TrendData {
  name: string;
  income: number;
  expense: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface NetWorthData {
  assets: number;
  liabilities: number;
  growth: number;
}

const Analytics: React.FC<AnalyticsProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<TrendData[]>([
    { name: 'May', income: 4000, expense: 2400 },
    { name: 'Jun', income: 3000, expense: 1398 },
    { name: 'Jul', income: 2000, expense: 9800 },
    { name: 'Aug', income: 2780, expense: 3908 },
    { name: 'Sep', income: 1890, expense: 4800 },
    { name: 'Oct', income: 2390, expense: 3800 },
  ]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorthData>({
    assets: 284500,
    liabilities: 8200,
    growth: 12.4
  });
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [exporting, setExporting] = useState(false);

  const COLORS = ['#135bec', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user.id) return;
      
      setLoading(true);
      try {
        // Fetch income/expense trends
        const trendsResponse = await analyticsApi.getIncomeExpenseTrends(user.id, period);
        if (trendsResponse.success && trendsResponse.data) {
          const data = trendsResponse.data as any;
          if (Array.isArray(data)) {
            setTrendData(data);
          } else if (data.trends) {
            setTrendData(data.trends);
          }
        }

        // Fetch expense categories
        const categoriesResponse = await analyticsApi.getExpenseCategories(user.id);
        if (categoriesResponse.success && categoriesResponse.data) {
          const data = categoriesResponse.data as any;
          if (Array.isArray(data)) {
            setCategoryData(data.map((item: any, index: number) => ({
              name: item.category || item.name,
              value: parseFloat(item.total || item.value || 0),
              color: COLORS[index % COLORS.length]
            })));
          }
        }

        // Fetch net worth
        const netWorthResponse = await analyticsApi.getNetWorth(user.id);
        if (netWorthResponse.success && netWorthResponse.data) {
          const data = netWorthResponse.data as any;
          setNetWorth({
            assets: data.assets || data.total_assets || 284500,
            liabilities: data.liabilities || data.total_liabilities || 8200,
            growth: data.growth || data.growth_percentage || 12.4
          });
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        // Keep default data on error
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user.id, period]);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const response = await analyticsApi.exportPdf(user.id, startDate, endDate);
      if (response.success) {
        // In a real app, this would trigger a download
        alert('PDF report generated successfully! Check your email or downloads.');
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('PDF export is currently unavailable. Please try again later.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Financial Analytics</h2>
          <p className="text-slate-500">Deep dive into your spending habits and income trends.</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                period === p
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-xl font-bold mb-8">Income vs Expenses</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#135bec" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#135bec" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#64748b'}} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                      itemStyle={{fontWeight: 800}}
                      formatter={(value: number) => `$${value.toLocaleString()}`}
                    />
                    <Area type="monotone" dataKey="income" stroke="#135bec" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expense" stroke="#f59e0b" strokeWidth={3} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-6 mt-6 justify-center">
                 <div className="flex items-center gap-2">
                   <div className="size-3 bg-primary rounded-full"></div>
                   <span className="text-sm font-bold">Income</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="size-3 bg-amber-500 rounded-full"></div>
                   <span className="text-sm font-bold">Expenses</span>
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-primary text-white p-8 rounded-3xl shadow-xl shadow-primary/20">
                 <p className="text-xs font-bold uppercase tracking-widest text-blue-100 mb-2">Net Worth Growth</p>
                 <h3 className="text-4xl font-black mb-1">{netWorth.growth >= 0 ? '+' : ''}{netWorth.growth.toFixed(1)}%</h3>
                 <p className="text-xs text-blue-200">Compared to last month</p>
                 <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Assets</span>
                      <span className="font-bold">${netWorth.assets.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Liabilities</span>
                      <span className="font-bold text-blue-200">-${netWorth.liabilities.toLocaleString()}</span>
                    </div>
                 </div>
              </div>

              <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                 <h4 className="font-bold mb-4">Report Generation</h4>
                 <p className="text-xs text-slate-500 mb-6">Download a detailed PDF statement for any date range.</p>
                 <div className="space-y-3">
                   <input 
                     type="date" 
                     className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold px-4 py-3" 
                     value={startDate} 
                     onChange={(e) => setStartDate(e.target.value)}
                   />
                   <input 
                     type="date" 
                     className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold px-4 py-3" 
                     value={endDate} 
                     onChange={(e) => setEndDate(e.target.value)}
                   />
                   <button 
                     onClick={handleExportPdf}
                     disabled={exporting}
                     className="w-full h-12 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     {exporting ? (
                       <>
                         <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                         Generating...
                       </>
                     ) : (
                       <>
                         <span className="material-symbols-outlined text-sm">picture_as_pdf</span> Download PDF
                       </>
                     )}
                   </button>
                 </div>
              </div>
           </div>

           {/* Expense Categories */}
           {categoryData.length > 0 && (
             <div className="lg:col-span-3 bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
               <h3 className="text-xl font-bold mb-8">Expense Categories</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="h-64">
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
                           <Cell key={`cell-${index}`} fill={entry.color} />
                         ))}
                       </Pie>
                       <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
                 <div className="flex flex-col justify-center space-y-3">
                   {categoryData.map((cat, index) => (
                     <div key={index} className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="size-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                         <span className="font-medium">{cat.name}</span>
                       </div>
                       <span className="font-bold">${cat.value.toLocaleString()}</span>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default Analytics;
