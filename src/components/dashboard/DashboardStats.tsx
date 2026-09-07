import React from "react";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { formatCurrency, cn } from "../../lib/utils";
import { useFinance } from "../../context/FinanceContext";
import { isSameMonth, parseISO } from "date-fns";

export const StatsGrid: React.FC = () => {
  const { transactions, budgets } = useFinance();
  const now = new Date();
  const currentMonthTransactions = transactions.filter(t => isSameMonth(parseISO(t.date), now));
  
  const totalIncome = currentMonthTransactions
    .filter(t => t.type === "income")
    .reduce((acc, t) => acc + t.amount, 0);
    
  const totalExpense = currentMonthTransactions
    .filter(t => t.type === "expense")
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = transactions.reduce((acc, t) => 
    t.type === "income" ? acc + t.amount : acc - t.amount, 0
  );

  const currentMonthStr = now.toISOString().substring(0, 7);

  const activeBudgetsThisMonth = budgets.filter(
    b => b.period === currentMonthStr || b.isRecurring === true || b.period === "recurring"
  );

  const totalBudget = activeBudgetsThisMonth.reduce((acc, b) => acc + b.amount, 0);
  const spentFromBudget = activeBudgetsThisMonth.reduce((acc, b) => acc + b.spent, 0);

  const stats = [
    {
      label: "Total Saldo",
      value: balance,
      icon: Wallet,
      color: "text-indigo-600",
      bg: "bg-indigo-100 dark:bg-indigo-900/30",
      trend: "+2.5% vs bln lalu"
    },
    {
      label: "Pemasukan Bln Ini",
      value: totalIncome,
      icon: ArrowUpRight,
      color: "text-emerald-600",
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      trend: "+12%"
    },
    {
      label: "Pengeluaran Bln Ini",
      value: totalExpense,
      icon: ArrowDownRight,
      color: "text-rose-600",
      bg: "bg-rose-100 dark:bg-rose-900/30",
      trend: "-5%"
    },
    {
      label: "Sisa Budget",
      value: Math.max(0, totalBudget - spentFromBudget),
      icon: TrendingUp,
      color: "text-amber-600",
      bg: "bg-amber-100 dark:bg-amber-900/30",
      trend: `${totalBudget > 0 ? ((spentFromBudget/totalBudget)*100).toFixed(0) : 0}% terpakai`
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, i) => (
        <div key={i} className="bento-card p-6 hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-4">
            <div className={cn("p-2.5 rounded-xl", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.trend}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(stat.value)}</h3>
          </div>
        </div>
      ))}
    </div>
  );
};

export const Insights: React.FC = () => {
  const { insights } = useFinance();

  if (insights.length === 0) return null;

  return (
    <div className="bento-card p-6 mb-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-indigo-600" />
        Financial Insights
      </h3>
      <div className="space-y-3">
        {insights.map((insight) => (
          <div 
            key={insight.id} 
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl border",
              insight.type === "warning" ? "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20 text-amber-800 dark:text-amber-400" :
              insight.type === "success" ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 text-emerald-800 dark:text-emerald-400" :
              "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 text-blue-800 dark:text-blue-400"
            )}
          >
            {insight.type === "warning" ? <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" /> :
             insight.type === "success" ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> :
             <Info className="w-5 h-5 mt-0.5 shrink-0" />}
            <p className="text-sm font-medium">{insight.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
