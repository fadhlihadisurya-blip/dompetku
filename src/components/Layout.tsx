import React from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Search, User } from "lucide-react";
import { useFinance } from "../context/FinanceContext";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  title: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, title }) => {
  const { settings } = useFinance();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 lg:pl-64 pb-20 lg:pb-0 transition-all duration-300">
        <header className="sticky top-0 z-40 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-transparent">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Selamat datang kembali, {settings.name}</p>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 rounded-xl transition-colors hidden md:flex">
              <Search className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setActiveTab("notifications")}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 rounded-xl transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-50 dark:border-slate-950"></span>
            </button>
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{settings.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Personal Account</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <User className="w-5 h-5" />
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};
