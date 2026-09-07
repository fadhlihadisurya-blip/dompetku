import React, { useState, useMemo } from "react";
import { Layout } from "../components/Layout";
import { useFinance } from "../context/FinanceContext";
import { formatCurrency, cn } from "../lib/utils";
import { 
  Plus, 
  Wallet, 
  AlertTriangle, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  TrendingDown, 
  Calendar,
  Repeat,
  Search
} from "lucide-react";
import { Modal } from "../components/Modal";
import { ConfirmModal } from "../components/ConfirmModal";
import { BudgetForm } from "../components/BudgetForm";
import { TransactionForm } from "../components/TransactionForm";
import { Budget } from "../types";

const BudgetPage: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const { budgets, deleteBudget } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);
  const [transactionBudget, setTransactionBudget] = useState<Budget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Get unique monthly periods from non-recurring budgets
  const monthlyPeriods = useMemo(() => {
    const set = new Set<string>();
    budgets.forEach(b => {
      if (b.period && b.period !== "recurring" && !b.isRecurring) {
        set.add(b.period);
      }
    });
    return Array.from(set).sort().reverse();
  }, [budgets]);

  const recurringCount = useMemo(() => {
    return budgets.filter(b => b.isRecurring || b.period === "recurring").length;
  }, [budgets]);

  // Filtered budgets
  const filteredBudgets = useMemo(() => {
    return budgets.filter(b => {
      let matchPeriod = true;
      if (selectedPeriod === "recurring") {
        matchPeriod = b.isRecurring === true || b.period === "recurring";
      } else if (selectedPeriod !== "all") {
        matchPeriod = b.period === selectedPeriod && !b.isRecurring;
      }
      const matchSearch = b.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchPeriod && matchSearch;
    });
  }, [budgets, selectedPeriod, searchQuery]);

  // Summary calculations for filtered budgets
  const summary = useMemo(() => {
    const totalLimit = filteredBudgets.reduce((acc, b) => acc + (b.amount || 0), 0);
    const totalSpent = filteredBudgets.reduce((acc, b) => acc + (b.spent || 0), 0);
    const remaining = totalLimit - totalSpent;
    const overBudgetCount = filteredBudgets.filter(b => b.spent > b.amount).length;
    return { totalLimit, totalSpent, remaining, overBudgetCount };
  }, [filteredBudgets]);

  const handleDelete = (budget: Budget) => {
    setDeletingBudget(budget);
  };

  const handleConfirmDelete = async () => {
    if (!deletingBudget) return;
    try {
      setIsDeleting(true);
      await deleteBudget(deletingBudget.id);
      setDeletingBudget(null);
    } catch (err) {
      console.error("Gagal menghapus anggaran:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
  };

  return (
    <Layout activeTab="budget" setActiveTab={setActiveTab} title="Monthly Budgets">
      <div className="space-y-8">
        {/* Header & New Budget Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Anggaran Bulanan</h3>
            <p className="text-sm text-slate-500">Kelola dan pantau batas pengeluaran per kategori secara real-time.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-3 px-5 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100 dark:shadow-none transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Anggaran</span>
          </button>
        </div>

        {/* Overview Stats Cards */}
        {budgets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bento-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Anggaran</span>
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                {formatCurrency(summary.totalLimit)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">{filteredBudgets.length} kategori dialokasikan</p>
            </div>

            <div className="bento-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Terpakai</span>
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                {formatCurrency(summary.totalSpent)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {summary.totalLimit > 0 ? `${((summary.totalSpent / summary.totalLimit) * 100).toFixed(0)}% dari limit` : "0%"}
              </p>
            </div>

            <div className="bento-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sisa Saldo Anggaran</span>
                <div className={cn(
                  "p-2 rounded-xl",
                  summary.remaining >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                )}>
                  {summary.remaining >= 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                </div>
              </div>
              <p className={cn(
                "text-xl font-bold mt-2",
                summary.remaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}>
                {formatCurrency(summary.remaining)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {summary.remaining >= 0 ? "Masih dalam batas aman" : "Melebihi alokasi"}
              </p>
            </div>

            <div className="bento-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Over Budget</span>
                <div className={cn(
                  "p-2 rounded-xl",
                  summary.overBudgetCount === 0 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" : "bg-amber-50 dark:bg-amber-900/20 text-amber-600"
                )}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                {summary.overBudgetCount} Kategori
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {summary.overBudgetCount === 0 ? "Semua kategori terkendali" : "Perlu perhatian"}
              </p>
            </div>
          </div>
        )}

        {/* Filters & Search Toolbar */}
        {budgets.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kategori anggaran..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none text-slate-900 dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {budgets.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-2.5 px-4 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none w-full sm:w-auto"
                >
                  <option value="all">Semua Anggaran ({budgets.length})</option>
                  {recurringCount > 0 && (
                    <option value="recurring">Anggaran Berulang ({recurringCount})</option>
                  )}
                  {monthlyPeriods.map(p => (
                    <option key={p} value={p}>Periode: {p}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Budget Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBudgets.length > 0 ? (
            filteredBudgets.map((b) => {
              const percent = b.amount > 0 ? Math.min(100, (b.spent / b.amount) * 100) : 0;
              const rawPercent = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
              const remaining = b.amount - b.spent;
              const isExceeded = remaining < 0;
              const isRecurringBudget = b.isRecurring || b.period === "recurring";

              return (
                <div 
                  key={b.id} 
                  className="bento-card p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div>
                    {/* Card Top: Category, Period, and Quick Action Buttons */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white leading-snug">{b.category}</h4>
                          {isRecurringBudget ? (
                            <span className="inline-flex items-center gap-1 mt-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 px-2 py-0.5 rounded-md">
                              <Repeat className="w-3 h-3" />
                              Berulang Tiap Bulan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 mt-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 px-2 py-0.5 rounded-md">
                              <Calendar className="w-3 h-3" />
                              {b.period}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Edit & Delete Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                        <button 
                          onClick={() => handleEdit(b)} 
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all"
                          title="Edit Anggaran"
                          aria-label={`Edit anggaran ${b.category}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(b)} 
                          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all"
                          title="Hapus Anggaran"
                          aria-label={`Hapus anggaran ${b.category}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Percent */}
                    <div className="space-y-3 mt-4">
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-semibold text-slate-500">Progress Pengeluaran</span>
                          <span className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-md",
                            rawPercent >= 100 ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" : 
                            rawPercent >= 80 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : 
                            "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          )}>
                            {rawPercent.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-500 rounded-full",
                              rawPercent >= 100 ? "bg-rose-500" : 
                              rawPercent >= 80 ? "bg-amber-500" : 
                              "bg-indigo-600"
                            )}
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Limit & Spent Grid */}
                      <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 dark:border-slate-800/80">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batas Limit</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(b.amount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Terpakai</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(b.spent)}</p>
                        </div>
                      </div>

                      {/* Remaining / Exceeded Status Badge */}
                      <div className={cn(
                        "flex items-center gap-2 p-3 rounded-2xl text-xs font-bold",
                        isExceeded ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30" : 
                        percent >= 90 ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30" : 
                        "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30"
                      )}>
                        {isExceeded || percent >= 90 ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                        <span className="truncate">
                          {isExceeded 
                            ? `Over Budget ${formatCurrency(Math.abs(remaining))}` 
                            : `Sisa Anggaran: ${formatCurrency(remaining)}`
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Quick Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setTransactionBudget(b)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-bold text-indigo-600 dark:text-indigo-400 transition-colors"
                      title="Catat Pengeluaran"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Catat Pengeluaran</span>
                    </button>
                    <button
                      onClick={() => handleEdit(b)}
                      className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                      title="Edit Anggaran"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(b)}
                      className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 text-xs font-bold text-slate-500 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-16 text-center bento-card border-dashed">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-slate-400" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                {searchQuery ? "Tidak Ada Anggaran yang Cocok" : "Belum Ada Anggaran Bulanan"}
              </h4>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
                {searchQuery 
                  ? "Coba ubah kata kunci pencarian atau filter periode Anda." 
                  : "Buat anggaran untuk membatasi pengeluaran per kategori setiap bulannya."
                }
              </p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-6 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-6 rounded-2xl font-bold shadow-md shadow-indigo-100 dark:shadow-none transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Anggaran Sekarang</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Catat Pengeluaran dari Budget */}
      {transactionBudget && (
        <Modal
          isOpen={true}
          onClose={() => setTransactionBudget(null)}
          title={`Catat Pengeluaran: ${transactionBudget.category}`}
        >
          <TransactionForm
            initialData={{
              type: "expense",
              category: transactionBudget.category,
              description: `Pengeluaran ${transactionBudget.category}`,
            }}
            onClose={() => setTransactionBudget(null)}
          />
        </Modal>
      )}

      {/* Modal Buat Anggaran */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Anggaran Bulanan">
        <BudgetForm onClose={() => setIsModalOpen(false)} />
      </Modal>

      {/* Modal Edit Anggaran */}
      <Modal isOpen={!!editingBudget} onClose={() => setEditingBudget(null)} title="Edit Anggaran Bulanan">
        <BudgetForm onClose={() => setEditingBudget(null)} initialData={editingBudget} />
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deletingBudget}
        onClose={() => setDeletingBudget(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Anggaran Bulanan"
        message={
          deletingBudget
            ? `Apakah Anda yakin ingin menghapus anggaran untuk kategori "${deletingBudget.category}" (Periode ${deletingBudget.period}) dengan batas ${formatCurrency(deletingBudget.amount)}? Data transaksi Anda tidak akan terhapus.`
            : "Apakah Anda yakin ingin menghapus anggaran ini?"
        }
        confirmText="Hapus Anggaran"
        cancelText="Batal"
        type="danger"
        isLoading={isDeleting}
      />
    </Layout>
  );
};

export default BudgetPage;

