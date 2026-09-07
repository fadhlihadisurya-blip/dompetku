import React, { useState } from "react";
import { Layout } from "../components/Layout";
import { useFinance } from "../context/FinanceContext";
import { formatCurrency, cn } from "../lib/utils";
import { Plus, Target, Calendar, Edit2, Trash2, CheckCircle2 } from "lucide-react";
import { Modal } from "../components/Modal";
import { ConfirmModal } from "../components/ConfirmModal";
import { GoalForm } from "../components/GoalForm";
import { format, parseISO, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";
import { FinancialGoal } from "../types";

const GoalsPage: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const { goals, deleteGoal } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [deletingGoal, setDeletingGoal] = useState<FinancialGoal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (goal: FinancialGoal) => {
    setDeletingGoal(goal);
  };

  const handleConfirmDelete = async () => {
    if (!deletingGoal) return;
    try {
      setIsDeleting(true);
      await deleteGoal(deletingGoal.id);
      setDeletingGoal(null);
    } catch (err) {
      console.error("Gagal menghapus target:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout activeTab="goals" setActiveTab={setActiveTab} title="Financial Goals">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Target Masa Depan</h3>
            <p className="text-sm text-slate-500">Pantau progres impian dan kebutuhan jangka panjang Anda.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 dark:shadow-none transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Target Baru</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {goals.length > 0 ? (
            goals.map((g) => {
              const percent = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
              const remaining = g.targetAmount - g.currentAmount;
              const daysLeft = differenceInDays(parseISO(g.deadline), new Date());

              return (
                <div key={g.id} className="bento-card p-8 group relative overflow-hidden hover:scale-[1.02]">
                  {percent === 100 && (
                    <div className="absolute top-0 right-0 p-2">
                      <div className="bg-emerald-500 text-white p-1 rounded-bl-xl shadow-lg">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Target className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-slate-900 dark:text-white">{g.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          <span>Deadline: {format(parseISO(g.deadline), "dd MMMM yyyy", { locale: id })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingGoal(g)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(g)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Terkumpul</p>
                        <p className="text-lg font-bold text-emerald-600">{formatCurrency(g.currentAmount)}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(g.targetAmount)}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-slate-500">{percent.toFixed(1)}% Terpenuhi</span>
                        <span className="font-bold text-slate-900 dark:text-white">{daysLeft > 0 ? `${daysLeft} hari lagi` : "Waktu Habis"}</span>
                      </div>
                      <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 relative overflow-hidden transition-all duration-1000"
                          style={{ width: `${percent}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                        <p className="text-xs text-slate-500">
                          Sisa <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(remaining)}</span>
                        </p>
                      </div>
                      {percent < 100 && (
                        <button className="text-xs font-bold text-indigo-600 hover:underline">Tambah Saldo</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-20 text-center bento-card border-dashed">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-10 h-10 text-slate-300" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Belum Ada Target</h4>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">Tentukan impian finansial Anda dan mulai menabung sekarang.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-6 inline-flex items-center gap-2 bg-indigo-600 text-white py-2.5 px-6 rounded-xl font-bold transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Target</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Target Keuangan Baru">
        <GoalForm onClose={() => setIsModalOpen(false)} />
      </Modal>

      <Modal isOpen={!!editingGoal} onClose={() => setEditingGoal(null)} title="Edit Target Keuangan">
        <GoalForm onClose={() => setEditingGoal(null)} initialData={editingGoal} />
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deletingGoal}
        onClose={() => setDeletingGoal(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Target Keuangan"
        message={
          deletingGoal
            ? `Apakah Anda yakin ingin menghapus target keuangan "${deletingGoal.name}" (${formatCurrency(deletingGoal.targetAmount)})?`
            : "Apakah Anda yakin ingin menghapus target ini?"
        }
        confirmText="Hapus Target"
        cancelText="Batal"
        type="danger"
        isLoading={isDeleting}
      />
    </Layout>
  );
};

export default GoalsPage;
