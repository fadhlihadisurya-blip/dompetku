import React from "react";
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Wallet, 
  Target, 
  BarChart3,
  Settings
} from "lucide-react";
import { cn } from "../lib/utils";

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    { id: "transactions", label: "Trans", icon: ArrowLeftRight },
    { id: "budget", label: "Budget", icon: Wallet },
    { id: "goals", label: "Goals", icon: Target },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "settings", label: "More", icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-4 left-4 right-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border border-slate-200 dark:border-slate-800 px-4 py-3 z-50 flex justify-between items-center rounded-[2rem] shadow-2xl">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 p-2 rounded-2xl transition-all duration-300",
            activeTab === item.id
              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 scale-110 px-4"
              : "text-slate-500 dark:text-slate-500"
          )}
        >
          <item.icon className={cn(
            "w-5 h-5",
            activeTab === item.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
          )} />
          <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};
