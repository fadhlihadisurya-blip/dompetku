import React, { useState } from "react";
import { useFinance } from "../context/FinanceContext";
import { cn } from "../lib/utils";

interface GoalFormProps {
  onClose: () => void;
  initialData?: any;
}

export const GoalForm: React.FC<GoalFormProps> = ({ onClose, initialData }) => {
  const { addGoal, updateGoal } = useFinance();
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    targetAmount: initialData?.targetAmount || "",
    currentAmount: initialData?.currentAmount || "",
    deadline: initialData?.deadline || new Date().toISOString().substring(0, 10),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.targetAmount) return;

    const data = {
      ...formData,
      targetAmount: Number(formData.targetAmount),
      currentAmount: Number(formData.currentAmount || 0),
      status: "active" as const
    };

    if (initialData) {
      updateGoal({ ...initialData, ...data });
    } else {
      addGoal(data);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nama Target</label>
        <input
          type="text"
          required
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Misal: Dana Darurat, Laptop Baru"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Target Nominal</label>
          <input
            type="number"
            required
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none"
            value={formData.targetAmount}
            onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Sudah Terkumpul</label>
          <input
            type="number"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none"
            value={formData.currentAmount}
            onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Deadline</label>
        <input
          type="date"
          required
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none"
          value={formData.deadline}
          onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
        />
      </div>

      <button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all mt-4"
      >
        Simpan Target
      </button>
    </form>
  );
};
