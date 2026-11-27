import React, { useState, useMemo } from "react";
import { Layout } from "../components/Layout";
import { useFinance } from "../context/FinanceContext";
import { cn, formatAppDate } from "../lib/utils";
import {
  ShoppingBag,
  Plus,
  CheckCircle2,
  Trash2,
  Edit2,
  Search,
  X,
  RotateCcw,
  Package,
  Calendar,
  Users
} from "lucide-react";
import { Modal } from "../components/Modal";
import { ConfirmModal } from "../components/ConfirmModal";
import { PurchaseItem } from "../types";

const PurchasesPage: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const {
    purchases,
    family,
    addPurchase,
    updatePurchase,
    togglePurchaseStatus,
    deletePurchase,
  } = useFinance();

  // Quick-add form state (hanya nama barang)
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter & Search state
  const [statusFilter, setStatusFilter] = useState<"pending" | "purchased" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [editingItem, setEditingItem] = useState<PurchaseItem | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingItem, setDeletingItem] = useState<PurchaseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const counts = useMemo(() => {
    const pendingCount = purchases.filter((p) => !p.isPurchased).length;
    const purchasedCount = purchases.filter((p) => p.isPurchased).length;
    return { pendingCount, purchasedCount };
  }, [purchases]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "pending"
          ? !p.isPurchased
          : p.isPurchased;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || p.name.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [purchases, statusFilter, searchQuery]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await addPurchase({
        name: name.trim(),
        price: 0,
        quantity: 1,
        category: "Belanja",
        notes: "",
      });
      setName("");
    } catch (err) {
      console.error("Gagal menambah daftar pembelian:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (item: PurchaseItem) => {
    setEditingItem(item);
    setEditName(item.name);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editName.trim()) return;

    try {
      await updatePurchase({
        ...editingItem,
        name: editName.trim(),
      });
      setEditingItem(null);
    } catch (err) {
      console.error("Gagal memperbarui barang:", err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      setIsDeleting(true);
      await deletePurchase(deletingItem.id);
      setDeletingItem(null);
    } catch (err) {
      console.error("Gagal menghapus barang:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDateLabel = (isoStr?: string | null) => {
    return formatAppDate(isoStr);
  };

  return (
    <Layout activeTab="purchases" setActiveTab={setActiveTab} title="Purchases">
      <div className="space-y-6">
        {/* Input Form: Hanya Nama Barang */}
        <form onSubmit={handleAddSubmit} className="bento-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Tambah Barang yang Akan Dibeli
                </h3>
                <p className="text-xs text-slate-500">
                  {family
                    ? `Menu bersama keluarga ${family.name} — seluruh anggota melihat & mengelola daftar yang sama.`
                    : "Masukkan nama barang yang ingin Anda beli."}
                </p>
              </div>
            </div>
            {family && (
              <div className="inline-flex items-center gap-1.5 self-start sm:self-center px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold shrink-0">
                <Users className="w-3.5 h-3.5" />
                <span>Menu Bersama • {family.name}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">
                Nama Barang
              </label>
              <input
                type="text"
                required
                maxLength={120}
                placeholder="Misal: Beras 5kg, Sepatu Lari..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-slate-900 dark:text-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 px-5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 dark:shadow-none transition-all cursor-pointer shrink-0 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? "Menyimpan..." : "Tambah ke Daftar Beli"}</span>
            </button>
          </div>
        </form>

        {/* Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setStatusFilter("pending")}
              className={cn(
                "flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                statusFilter === "pending"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              Akan Dibeli ({counts.pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter("purchased")}
              className={cn(
                "flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                statusFilter === "purchased"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              Sudah Dibeli ({counts.purchasedCount})
            </button>
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                statusFilter === "all"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              Semua
            </button>
          </div>

          <div className="relative sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama barang..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-8 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Purchases List */}
        <div className="space-y-3">
          {filteredPurchases.length > 0 ? (
            filteredPurchases.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "bento-card p-4 sm:p-5 transition-all border",
                  item.isPurchased
                    ? "bg-slate-50/70 dark:bg-slate-900/50 border-emerald-200/70 dark:border-emerald-900/40"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Icon & Item Name */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
                        item.isPurchased
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                          : "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                      )}
                    >
                      {item.isPurchased ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Package className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className={cn(
                            "text-base font-bold break-words",
                            item.isPurchased
                              ? "line-through text-slate-500 dark:text-slate-400"
                              : "text-slate-900 dark:text-white"
                          )}
                        >
                          {item.name}
                        </h4>
                        {item.isPurchased && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                            Sudah Dibeli
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {item.isPurchased && item.purchasedAt
                            ? `Dibeli ${formatDateLabel(item.purchasedAt)}`
                            : `Ditambahkan ${formatDateLabel(item.createdAt)}`}
                        </span>
                        {family && item.addedByName && (
                          <span>
                            • Oleh {item.addedByName}
                            {item.addedByRole ? ` (${item.addedByRole})` : ""}
                          </span>
                        )}
                        {family && item.isPurchased && item.purchasedByName && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            • Dibeli oleh {item.purchasedByName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                    {!item.isPurchased ? (
                      <button
                        onClick={() => togglePurchaseStatus(item)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-2 px-3.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Sudah Beli</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => togglePurchaseStatus(item)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        title="Kembalikan ke daftar Akan Dibeli"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Batal Beli</span>
                      </button>
                    )}

                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                      title="Edit Barang"
                      aria-label={`Edit ${item.name}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingItem(item)}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Hapus Barang"
                      aria-label={`Hapus ${item.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bento-card py-14 px-6 text-center border-dashed">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-slate-400" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {searchQuery
                  ? "Barang Tidak Ditemukan"
                  : statusFilter === "pending"
                  ? "Belum Ada Barang yang Akan Dibeli"
                  : statusFilter === "purchased"
                  ? "Belum Ada Barang yang Sudah Dibeli"
                  : "Daftar Pembelian Masih Kosong"}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {searchQuery
                  ? "Coba ubah kata kunci pencarian Anda."
                  : family
                  ? "Gunakan formulir di atas untuk menambahkan barang yang akan dibeli bersama keluarga."
                  : "Gunakan formulir di atas untuk menambahkan barang yang berencana Anda beli."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Edit Nama Barang"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
              Nama Barang
            </label>
            <input
              type="text"
              required
              maxLength={120}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm font-semibold outline-none focus:border-indigo-600"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all cursor-pointer"
          >
            Simpan Perubahan
          </button>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Barang"
        message={
          deletingItem
            ? `Apakah Anda yakin ingin menghapus "${deletingItem.name}" dari daftar pembelian?`
            : "Apakah Anda yakin ingin menghapus barang ini?"
        }
        confirmText="Hapus Barang"
        cancelText="Batal"
        type="danger"
        isLoading={isDeleting}
      />
    </Layout>
  );
};

export default PurchasesPage;
