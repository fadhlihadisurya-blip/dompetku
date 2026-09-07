import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LogIn, Wallet, Mail, Lock, UserPlus, ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";

export const LoginPage: React.FC = () => {
  const { signIn, signInWithEmail, signUpWithEmail, signingIn, error } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      // Error is handled in context
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bento-card p-10 flex flex-col items-center space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
            <Wallet className="w-8 h-8" />
          </div>
          
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">DompetKu</h1>
            <p className="text-slate-500 dark:text-slate-400">Kelola keuangan Anda dengan cerdas dan mudah.</p>
          </div>
        </div>

        {error && (
          <div className="w-full p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-xl font-medium border border-rose-100 dark:border-rose-900/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="nama@email.com"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-slate-900 dark:text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-slate-900 dark:text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={signingIn}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            <span>{signingIn ? "Memproses..." : (isSignUp ? "Daftar Akun" : "Masuk")}</span>
          </button>
        </form>

        <div className="w-full flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atau</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
        </div>

        <button
          onClick={signIn}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white py-4 rounded-2xl font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          <span>Masuk dengan Google</span>
        </button>

        <div className="text-center pt-2">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
          >
            {isSignUp ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar gratis"}
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          Smart Finance Tracker
        </p>
      </div>
    </div>
  );
};
