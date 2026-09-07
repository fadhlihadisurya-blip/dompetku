import React from "react";
import { useAuth } from "../context/AuthContext";
import { LogIn, Wallet } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { signIn, signingIn, error } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bento-card p-10 flex flex-col items-center text-center space-y-8">
        <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20">
          <Wallet className="w-10 h-10" />
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">DompetKu</h1>
          <p className="text-slate-500 dark:text-slate-400">Kelola keuangan Anda dengan cerdas dan mudah.</p>
        </div>

        {error && (
          <div className="w-full p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-xl font-medium border border-rose-100 dark:border-rose-900/30">
            {error}
          </div>
        )}

        <div className="space-y-4 w-full">
          <button
            onClick={signIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white py-4 rounded-2xl font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            <span>{signingIn ? "Menghubungkan..." : "Masuk dengan Google"}</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          Smart Finance Tracker
        </p>
      </div>
    </div>
  );
};
