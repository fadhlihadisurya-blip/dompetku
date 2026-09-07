import React from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useFinance } from "../../context/FinanceContext";
import { formatCurrency } from "../../lib/utils";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO, isSameDay, isSameMonth } from "date-fns";

export const MainChart: React.FC = () => {
  const { transactions } = useFinance();
  const now = new Date();
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(now),
    end: endOfMonth(now),
  });

  const data = daysInMonth.map(day => {
    const dayTransactions = transactions.filter(t => isSameDay(parseISO(t.date), day));
    const income = dayTransactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
    const expense = dayTransactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
    
    return {
      name: format(day, "dd"),
      income,
      expense,
    };
  });

  return (
    <div className="bento-card p-6 h-[400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Arus Kas</h3>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
            <span className="text-xs font-medium text-slate-500">Pemasukan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
            <span className="text-xs font-medium text-slate-500">Pengeluaran</span>
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
          <defs>
            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#94a3b8' }} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={(value) => `${value / 1000}k`}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: 'none', 
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              backgroundColor: '#fff' 
            }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Area type="monotone" dataKey="income" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
          <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CategoryChart: React.FC = () => {
  const { transactions } = useFinance();
  const now = new Date();
  const currentMonthExpenses = transactions.filter(t => 
    t.type === "expense" && isSameMonth(parseISO(t.date), now)
  );

  const categoryData: Record<string, number> = {};
  currentMonthExpenses.forEach(t => {
    categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
  });

  const data = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="bento-card p-6 h-[400px]">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Pengeluaran Kategori</h3>
      
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
               contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 space-y-2 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
        {data.slice(0, 5).map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{item.name}</span>
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
