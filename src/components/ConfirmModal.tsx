import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { cn } from "../lib/utils";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning";
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Hapus",
  cancelText = "Batal",
  type = "danger",
  isLoading = false,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isLoading ? undefined : onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white dark:bg-slate-950 rounded-3xl shadow-2xl z-[80] overflow-hidden border border-slate-200 dark:border-slate-800 p-6"
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                  type === "danger"
                    ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                    : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                )}
              >
                {type === "danger" ? (
                  <Trash2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {message}
                </p>
              </div>
              {!isLoading && (
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-50",
                  type === "danger"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none"
                    : "bg-amber-600 hover:bg-amber-700 shadow-amber-200 dark:shadow-none"
                )}
              >
                {isLoading ? "Memproses..." : confirmText}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
