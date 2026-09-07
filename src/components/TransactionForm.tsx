import React, { useState } from "react";
import { useFinance } from "../context/FinanceContext";
import { PAYMENT_METHODS } from "../lib/constants";
import { TransactionType } from "../types";
import { cn } from "../lib/utils";
import { Clock } from "lucide-react";

interface TransactionFormProps {
  onClose: () => void;
  initialData?: any;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onClose, initialData }) => {
  const { addTransaction, updateTransaction, categories } = useFinance();
  const [type, setType] = useState<TransactionType>(initialData?.type || "expense");

  const filteredCategories = categories.filter(c => c.type === type);

  const getInitialDateTime = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const currentLocalDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const currentLocalTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    let initialDate = currentLocalDate;
    let initialTime = currentLocalTime;

    if (initialData?.time) {
      initialTime = initialData.time.length === 5 ? `${initialData.time}:00` : initialData.time;
    }

    if (initialData?.date) {
      if (initialData.date.includes("T")) {
        const parts = initialData.date.split("T");
        initialDate = parts[0];
        if (!initialData.time && parts[1]) {
          const rawTime = parts[1].replace("Z", "").substring(0, 8);
          initialTime = rawTime.length === 5 ? `${rawTime}:00` : rawTime;
        }
      } else if (initialData.date.includes(" ")) {
        const parts = initialData.date.split(" ");
        initialDate = parts[0];
        if (!initialData.time && parts[1]) {
          const rawTime = parts[1].substring(0, 8);
          initialTime = rawTime.length === 5 ? `${rawTime}:00` : rawTime;
        }
      } else {
        initialDate = initialData.date.substring(0, 10);
      }
    } else if (initialData?.createdAt) {
      const parts = initialData.createdAt.split("T");
      if (parts[1]) {
        initialTime = parts[1].substring(0, 8);
      }
    }

    return { initialDate, initialTime };
  };

  const { initialDate, initialTime } = getInitialDateTime();

  const [formData, setFormData] = useState({
    amount: initialData?.amount ? String(initialData.amount) : "",
    category: initialData?.category || "",
    description: initialData?.description || (initialData?.category ? `Pengeluaran ${initialData.category}` : ""),
    date: initialDate,
    time: initialTime,
    paymentMethod: initialData?.paymentMethod || "Tunai",
    notes: initialData?.notes || ""
  });

  const handleSetCurrentTime = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setFormData(prev => ({
      ...prev,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    }));
  };

  // Ensure category from initialData exists in the options
  const hasCategoryOption = filteredCategories.some(c => c.name === formData.category);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.category || !formData.description) return;

    const timeFormatted = formData.time.length === 5 ? `${formData.time}:00` : formData.time;
    const fullDate = `${formData.date}T${timeFormatted}`;
    const nowIso = new Date().toISOString();

    const data = {
      ...formData,
      amount: Number(formData.amount),
      type,
      time: timeFormatted,
      date: fullDate,
      createdAt: initialData?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    if (initialData && initialData.id) {
      updateTransaction({ ...data, id: initialData.id } as any);
    } else {
      addTransaction(data as any);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
        <button
          type="button"
          onClick={() => setType("expense")}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
            type === "expense" ? "bg-white dark:bg-slate-800 text-rose-600 shadow-sm" : "text-slate-500"
          )}
        >
          Pengeluaran
        </button>
        <button
          type="button"
          onClick={() => setType("income")}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
            type === "income" ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm" : "text-slate-500"
          )}
        >
          Pemasukan
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nominal</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
          <input
            type="number"
            required
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 font-bold text-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Kategori</label>
        <select
          required
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-slate-900 dark:text-white"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        >
          <option value="">Pilih Kategori</option>
          {formData.category && !hasCategoryOption && (
            <option value={formData.category}>{formData.category}</option>
          )}
          {filteredCategories.map((cat) => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tanggal</label>
          <input
            type="date"
            required
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Waktu (Jam : Menit : Detik)</label>
            <button
              type="button"
              onClick={handleSetCurrentTime}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Sekarang
            </button>
          </div>
          <div className="relative">
            <input
              type="time"
              step="1"
              required
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-4 pr-10 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-mono"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            />
            <Clock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Deskripsi</label>
        <input
          type="text"
          required
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Misal: Makan Siang"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Metode Pembayaran</label>
        <select
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
          value={formData.paymentMethod}
          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all mt-4"
      >
        Simpan Transaksi
      </button>
    </form>
  );
};
