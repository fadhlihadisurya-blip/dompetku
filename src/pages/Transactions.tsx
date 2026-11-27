import React, { useState, useMemo } from "react";
import { Layout } from "../components/Layout";
import { useFinance } from "../context/FinanceContext";
import { formatAppDate, formatCurrency, getTransactionTimestamp, cn } from "../lib/utils";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter, 
  ArrowUpDown,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Modal } from "../components/Modal";
import { ConfirmModal } from "../components/ConfirmModal";
import { TransactionForm } from "../components/TransactionForm";
import { Transaction } from "../types";

const Transactions: React.FC<{ setActiveTab: (tab: string) => void; initialCategory?: string }> = ({ setActiveTab, initialCategory }) => {
  const { transactions, deleteTransaction, categories: allCategories } = useFinance();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory || "all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const formatTransactionDateTime = (t: Transaction) => {
    let dateStr = t.date || "";
    let timeStr = t.time || "";

    if (dateStr.includes("T")) {
      const parts = dateStr.split("T");
      dateStr = parts[0];
      if (!timeStr && parts[1]) {
        timeStr = parts[1].replace("Z", "").substring(0, 8);
      }
    } else if (dateStr.includes(" ")) {
      const parts = dateStr.split(" ");
      dateStr = parts[0];
      if (!timeStr && parts[1]) {
        timeStr = parts[1].substring(0, 8);
      }
    }

    if (!timeStr && t.createdAt && t.createdAt.includes("T")) {
      timeStr = t.createdAt.split("T")[1]?.substring(0, 8) || "";
    }

    let dateObj: Date;
    try {
      const dParts = dateStr.split("-");
      if (dParts.length === 3) {
        const y = parseInt(dParts[0], 10);
        const m = parseInt(dParts[1], 10) - 1;
        const d = parseInt(dParts[2], 10);
        dateObj = new Date(y, m, d);
      } else {
        dateObj = parseISO(t.date);
      }
    } catch {
      dateObj = new Date();
    }

    const rawDay = format(dateObj, "EEEE", { locale: id });
    const formattedDay = rawDay ? rawDay.charAt(0).toUpperCase() + rawDay.slice(1) : "";
    const formattedDate = formatAppDate(dateObj);
    const formattedTime = timeStr ? `${timeStr} WIB` : null;

    return { formattedDate, formattedDay, formattedTime };
  };

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase()) || 
                              t.category.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === "all" || t.type === typeFilter;
        const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
        return matchesSearch && matchesType && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === "date") {
          const timeA = getTransactionTimestamp(a);
          const timeB = getTransactionTimestamp(b);
          if (timeA !== timeB) {
            return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
          }
          // Tie-break with createdAt for transactions with same second
          if (a.createdAt && b.createdAt) {
            const cA = new Date(a.createdAt).getTime();
            const cB = new Date(b.createdAt).getTime();
            if (cA !== cB) {
              return sortOrder === "desc" ? cB - cA : cA - cB;
            }
          }
          return sortOrder === "desc" 
            ? (b.id || "").localeCompare(a.id || "") 
            : (a.id || "").localeCompare(b.id || "");
        } else {
          return sortOrder === "desc" ? b.amount - a.amount : a.amount - b.amount;
        }
      });
  }, [transactions, search, typeFilter, categoryFilter, sortBy, sortOrder]);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const currentItems = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const categories = useMemo(() => {
    const cats = new Set([...allCategories.map(c => c.name), ...transactions.map(t => t.category)]);
    return Array.from(cats);
  }, [transactions, allCategories]);

  const handleDeleteClick = (transaction: Transaction) => {
    setDeletingTransaction(transaction);
    setActiveMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTransaction) return;
    try {
      setIsDeleting(true);
      await deleteTransaction(deletingTransaction.id);
      setDeletingTransaction(null);
    } catch (error) {
      console.error("Gagal menghapus transaksi:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    setActiveMenuId(null);
  };

  return (
    <Layout activeTab="transactions" setActiveTab={setActiveTab} title="Transactions History">
      <div className="space-y-6" onClick={() => setActiveMenuId(null)}>
        {/* Actions & Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari transaksi atau kategori..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-10 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {search && (
                <button 
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white py-3 px-5 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100 dark:shadow-none transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Transaksi Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <select 
              className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-semibold outline-none focus:border-indigo-600"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Semua Tipe</option>
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
            </select>

            <select 
              className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-semibold outline-none focus:border-indigo-600 truncate"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Semua Kategori</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <button 
              onClick={() => {
                setSortOrder(sortOrder === "asc" ? "desc" : "asc");
              }}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortOrder === "desc" ? "Urutkan: Terbaru" : "Urutkan: Terlama"}</span>
            </button>
          </div>
        </div>

        {/* Mobile View: Responsive Cards List (Visible on HP screens < md) */}
        <div className="md:hidden space-y-3">
          {currentItems.length > 0 ? (
            currentItems.map((t) => {
              const { formattedDate, formattedDay, formattedTime } = formatTransactionDateTime(t);
              return (
                <div 
                  key={t.id} 
                  className="bento-card p-4 space-y-3 relative overflow-hidden transition-all border border-slate-200/80 dark:border-slate-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                        t.type === "income" 
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400" 
                          : "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                      )}>
                        {t.type === "income" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {t.description || t.category}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-300">
                            {t.category}
                          </span>
                          {t.paymentMethod && (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded-md">
                              {t.paymentMethod}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-base font-extrabold tracking-tight",
                        t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}>
                        {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                    <div className="flex flex-wrap items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                      <span>{formattedDay ? `${formattedDay}, ` : ''}{formattedDate}</span>
                      {formattedTime && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded font-mono ml-1">
                          <Clock className="w-3 h-3" />
                          {formattedTime}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(t); }}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                        title="Edit Transaksi"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(t); }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                        title="Hapus Transaksi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bento-card py-12 px-4 text-center text-slate-500">
              <p className="text-sm font-semibold">Tidak ada transaksi yang ditemukan.</p>
            </div>
          )}
        </div>

        {/* Desktop View: Transactions Table (Visible on md+) */}
        <div className="hidden md:block bento-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal & Waktu</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori & Deskripsi</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Nominal</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Metode</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {currentItems.length > 0 ? (
                  currentItems.map((t) => {
                    const { formattedDate, formattedDay, formattedTime } = formatTransactionDateTime(t);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {formattedDay ? (
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold mr-1.5">
                                {formattedDay},
                              </span>
                            ) : null}
                            {formattedDate}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {formattedTime ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-md font-mono">
                                <Clock className="w-3 h-3" />
                                {formattedTime}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-mono">
                                --:--:--
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                              t.type === "income" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30" : "bg-rose-100 text-rose-600 dark:bg-rose-900/30"
                            )}>
                              {t.type === "income" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{t.description}</p>
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-500">{t.category}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <p className={cn(
                            "text-sm font-bold",
                            t.type === "income" ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-xs text-slate-500 font-medium">{t.paymentMethod}</p>
                        </td>
                        <td className="px-6 py-4 text-right relative">
                          <div className={cn(
                            "flex items-center justify-end gap-2 transition-all duration-200",
                            activeMenuId === t.id 
                              ? "opacity-100 scale-100" 
                              : "opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto"
                          )}>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleEdit(t); }}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteClick(t); }}
                              className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors text-rose-500"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {activeMenuId === t.id && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(t.id); }}
                            className={cn(
                              "p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all",
                              activeMenuId === t.id || "group-hover:hidden"
                            )}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      Tidak ada transaksi yang ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Responsive Pagination */}
        {totalPages > 1 && (
          <div className="bento-card p-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              Menampilkan <span className="font-bold text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</span> dari <span className="font-bold text-slate-900 dark:text-white">{filteredTransactions.length}</span> transaksi
            </p>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                aria-label="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {/* Desktop / Tablet Page Numbers */}
              <div className="hidden sm:flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                      currentPage === i + 1 
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              {/* Mobile HP Page Indicator */}
              <span className="sm:hidden text-xs font-bold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>

              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                aria-label="Halaman Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title="Tambah Transaksi Baru"
      >
        <TransactionForm onClose={() => setIsAddModalOpen(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal 
        isOpen={!!editingTransaction} 
        onClose={() => setEditingTransaction(null)} 
        title="Edit Transaksi"
      >
        <TransactionForm 
          onClose={() => setEditingTransaction(null)} 
          initialData={editingTransaction} 
        />
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Transaksi"
        message={
          deletingTransaction
            ? `Apakah Anda yakin ingin menghapus transaksi "${deletingTransaction.description || deletingTransaction.category}" sebesar ${formatCurrency(deletingTransaction.amount)}? Tindakan ini tidak dapat dibatalkan.`
            : "Apakah Anda yakin ingin menghapus transaksi ini?"
        }
        confirmText="Hapus Transaksi"
        cancelText="Batal"
        type="danger"
        isLoading={isDeleting}
      />
    </Layout>
  );
};

export default Transactions;
