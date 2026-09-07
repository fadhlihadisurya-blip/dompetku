import React from "react";
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Wallet, 
  Target, 
  BarChart3, 
  Repeat, 
  Bell, 
  Settings,
  PlusCircle,
  Menu,
  X
} from "lucide-react";
import { cn } from "../lib/utils";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
    { id: "budget", label: "Budget", icon: Wallet },
    { id: "goals", label: "Goals", icon: Target },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "recurring", label: "Recurring", icon: Repeat },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 fixed left-0 top-0 z-50">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200 dark:shadow-none">
          D
        </div>
        <div>
          <h1 className="font-bold text-slate-900 dark:text-white leading-tight">DompetKu</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Smart Finance Tracker</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group",
              activeTab === item.id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
              activeTab === item.id ? "text-white" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
            )} />
            <span className="font-bold text-sm tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <button 
          onClick={() => setActiveTab("add_transaction")}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-[1.5rem] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Transaksi Baru</span>
        </button>
      </div>
    </aside>
  );
};
