import React, { useState } from "react";
import { useFinance } from "../context/FinanceContext";
import { Category, TransactionType } from "../types";
import { Plus, Trash2, Edit2, X, Check, Tag } from "lucide-react";
import { cn } from "../lib/utils";
import { ConfirmModal } from "./ConfirmModal";

export const CategoryManager: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useFinance();
  const [type, setType] = useState<TransactionType>("expense");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredCategories = categories.filter(c => c.type === type);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addCategory({ name: newName.trim(), type });
    setNewName("");
    setIsAdding(false);
  };

  const handleUpdate = async (cat: Category) => {
    if (!newName.trim()) return;
    await updateCategory({ ...cat, name: newName.trim() });
    setEditingId(null);
    setNewName("");
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setNewName(cat.name);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    try {
      setIsDeleting(true);
      await deleteCategory(deletingCategory.id);
      setDeletingCategory(null);
    } catch (err) {
      console.error("Gagal menghapus kategori:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl w-full max-w-xs">
        <button
          onClick={() => setType("expense")}
          className={cn(
            "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
            type === "expense" ? "bg-white dark:bg-slate-800 text-rose-600 shadow-sm" : "text-slate-500"
          )}
        >
          Pengeluaran
        </button>
        <button
          onClick={() => setType("income")}
          className={cn(
            "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
            type === "income" ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm" : "text-slate-500"
          )}
        >
          Pemasukan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredCategories.map((cat) => (
          <div 
            key={cat.id} 
            className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl group hover:border-indigo-500/50 transition-all"
          >
            {editingId === cat.id ? (
              <div className="flex items-center gap-2 flex-1 mr-2">
                <input
                  type="text"
                  autoFocus
                  className="flex-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-indigo-500/50 rounded-xl px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-600/20 outline-none"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdate(cat);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <button 
                  onClick={() => handleUpdate(cat)} 
                  className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-xl transition-all shadow-sm"
                  title="Simpan Perubahan"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setEditingId(null)} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  title="Batal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "p-2 rounded-xl shrink-0",
                    type === "expense" ? "bg-rose-50 dark:bg-rose-900/20 text-rose-500" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500"
                  )}>
                    <Tag className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{cat.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button 
                    onClick={() => startEdit(cat)} 
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
                    title={`Edit kategori ${cat.name}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button 
                    onClick={() => setDeletingCategory(cat)} 
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-all"
                    title={`Hapus kategori ${cat.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Hapus</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {isAdding ? (
          <div className="flex items-center gap-2 p-3 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-900/30 rounded-2xl">
            <input
              type="text"
              autoFocus
              placeholder="Nama Kategori..."
              className="flex-1 bg-transparent border-none rounded-lg px-3 py-1 text-sm focus:ring-0"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button onClick={handleAdd} className="bg-indigo-600 text-white p-2 rounded-xl shadow-sm">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-indigo-500 hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">Tambah Kategori</span>
          </button>
        )}
      </div>

      {/* Confirm Delete Category Modal */}
      <ConfirmModal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Kategori"
        message={
          deletingCategory
            ? `Apakah Anda yakin ingin menghapus kategori "${deletingCategory.name}"? Transaksi yang sudah dibuat dengan kategori ini tetap aman.`
            : "Apakah Anda yakin ingin menghapus kategori ini?"
        }
        confirmText="Hapus Kategori"
        cancelText="Batal"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
