import React, { useState } from "react";
import { useFinance } from "../context/FinanceContext";
import { CATEGORIES } from "../lib/constants";
import { formatCurrency, cn } from "../lib/utils";
import { Check, Calendar, Repeat } from "lucide-react";

interface BudgetFormProps {
  onClose: () => void;
  initialData?: any;
}

export const BudgetForm: React.FC<BudgetFormProps> = ({ onClose, initialData }) => {
  const { addBudget, updateBudget, categories } = useFinance();

  const now = new Date();
  const currentMonth = now.toISOString().substring(0, 7); // "YYYY-MM"
  const currentMonthLabel = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const expenseCategories = categories.filter(c => c.type === "expense");
  const categoryList = expenseCategories.length > 0
    ? expenseCategories.map(c => c.name)
    : CATEGORIES.expense;

  const [formData, setFormData] = useState({
    category: initialData?.category || "",
    amount: initialData?.amount ? String(initialData.amount) : "",
  });

  // Determine initial state: if editing and period is specific month (not recurring), set true
  const [isThisMonthOnly, setIsThisMonthOnly] = useState<boolean>(() => {
    if (!initialData) return false; // Default: recurring
    if (initialData.isRecurring === true || initialData.period === "recurring") return false;
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.amount) return;

    const numAmount = Number(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const period = isThisMonthOnly ? currentMonth : "recurring";
    const isRecurring = !isThisMonthOnly;

    if (initialData) {
      updateBudget({
        ...initialData,
        category: formData.category,
        amount: numAmount,
        period,
        isRecurring,
      });
    } else {
      addBudget({
        category: formData.category,
        amount: numAmount,
        period,
        isRecurring,
        spent: 0,
      });
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Kategori</label>
        <select
          required
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none text-slate-900 dark:text-white"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        >
          <option value="">Pilih Kategori</option>
          {categoryList.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Limit Anggaran Bulanan</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
          <input
            type="number"
            required
            min="1"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 font-bold text-lg focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none text-slate-900 dark:text-white"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0"
          />
        </div>
        {formData.amount && Number(formData.amount) > 0 && (
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold ml-1">
            {formatCurrency(Number(formData.amount))}
          </p>
        )}
      </div>

      {/* Checkbox "Bulan ini saja" */}
      <div className="space-y-2">
        <div 
          onClick={() => setIsThisMonthOnly(!isThisMonthOnly)}
          className={cn(
            "flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all select-none",
            isThisMonthOnly
              ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/80"
              : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded-lg border flex items-center justify-center transition-all mt-0.5 shrink-0",
            isThisMonthOnly 
              ? "bg-indigo-600 border-indigo-600 text-white" 
              : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
          )}>
            {isThisMonthOnly && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer">
                Bulan ini saja
              </label>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                {currentMonthLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {isThisMonthOnly ? (
                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  Anggaran hanya berlaku untuk bulan {currentMonthLabel}.
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Repeat className="w-3.5 h-3.5" />
                  Anggaran berulang otomatis setiap bulannya.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-[0.98] cursor-pointer"
        >
          {initialData ? "Simpan Perubahan" : "Simpan Anggaran"}
        </button>
      </div>
    </form>
  );
};

