import React, { useState, useMemo } from "react";
import { Layout } from "../components/Layout";
import { StatsGrid, Insights } from "../components/dashboard/DashboardStats";
import { MainChart } from "../components/dashboard/DashboardCharts";
import { useFinance } from "../context/FinanceContext";
import { formatCurrency, cn } from "../lib/utils";
import { ChevronRight, Wallet, Plus, ArrowUpRight, Search, X } from "lucide-react";
import { Modal } from "../components/Modal";
import { TransactionForm } from "../components/TransactionForm";
import { Budget } from "../types";

const Dashboard: React.FC<{ setActiveTab: (tab: string) => void; children?: React.ReactNode }> = ({ setActiveTab, children }) => {
  const { budgets } = useFinance();
  const [selectedBudgetForTransaction, setSelectedBudgetForTransaction] = useState<Budget | null>(null);
  const [budgetSearch, setBudgetSearch] = useState("");

  const handleBudgetClick = (b: Budget) => {
    setSelectedBudgetForTransaction(b);
  };

  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const activeBudgets = useMemo(() => {
    return budgets.filter(b => b.period === currentMonthStr || b.isRecurring || b.period === "recurring");
  }, [budgets, currentMonthStr]);

  const filteredBudgets = useMemo(() => {
    if (!budgetSearch.trim()) return activeBudgets;
    const query = budgetSearch.toLowerCase();
    return activeBudgets.filter(b => b.category.toLowerCase().includes(query));
  }, [activeBudgets, budgetSearch]);

  return (
    <Layout activeTab="dashboard" setActiveTab={setActiveTab} title="Dashboard Overview">
      <div className="space-y-8">
        {/* Top Section: Status Budget */}
        <div className="bento-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Status Budget</h3>
              <p className="text-xs text-slate-500">Pantau penggunaan anggaran bulanan Anda</p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Search Box for Budget Status */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari status budget..."
                  value={budgetSearch}
                  onChange={(e) => setBudgetSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-8 text-xs font-semibold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                />
                {budgetSearch && (
                  <button 
                    onClick={() => setBudgetSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    aria-label="Bersihkan pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button 
                onClick={() => setActiveTab("budget")}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
              >
                Atur Anggaran <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {filteredBudgets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredBudgets.map((b) => {
                  const percent = b.amount > 0 ? Math.min(100, (b.spent / b.amount) * 100) : 0;
                  const rawPercent = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
                  return (
                    <div 
                      key={b.id} 
                      onClick={() => handleBudgetClick(b)}
                      className="group p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-slate-800/50 hover:shadow-md cursor-pointer transition-all duration-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {b.category}
                            </p>
                            <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded transition-opacity flex items-center gap-0.5">
                              + Catat <ArrowUpRight className="w-3 h-3" />
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">Terpakai {formatCurrency(b.spent)} dari {formatCurrency(b.amount)}</p>
                        </div>
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-lg shrink-0",
                          rawPercent >= 100 ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" : 
                          rawPercent >= 70 ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : 
                          "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                        )}>
                          {rawPercent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
                        <div 
                          className={cn(
                            "h-full transition-all duration-1000 rounded-full",
                            rawPercent >= 100 ? "bg-rose-500" : 
                            rawPercent >= 70 ? "bg-amber-500" : 
                            "bg-indigo-600"
                          )}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Sisa: {formatCurrency(Math.max(0, b.amount - b.spent))}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : budgetSearch ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  Tidak ada status budget yang cocok dengan "{budgetSearch}"
                </p>
                <button 
                  onClick={() => setBudgetSearch("")}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Bersihkan pencarian
                </button>
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">Belum ada budget</p>
                <p className="text-xs text-slate-400">Buat budget bulanan untuk mengontrol pengeluaran.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Catat Pengeluaran langsung dari Status Budget */}
        {selectedBudgetForTransaction && (
          <Modal 
            isOpen={true} 
            onClose={() => setSelectedBudgetForTransaction(null)} 
            title={`Catat Pengeluaran: ${selectedBudgetForTransaction.category}`}
          >
            <TransactionForm 
              initialData={{
                type: "expense",
                category: selectedBudgetForTransaction.category,
                description: `Pengeluaran ${selectedBudgetForTransaction.category}`,
              }}
              onClose={() => {
                setSelectedBudgetForTransaction(null);
              }} 
            />
          </Modal>
        )}

        {/* Insights */}
        <Insights />
        
        {children}

        {/* Stats Grid */}
        <StatsGrid />

        {/* Charts Section */}
        <MainChart />
      </div>
    </Layout>
  );
};

export default Dashboard;
