import React from "react";
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Wallet, 
  Target, 
  BarChart3,
  ShoppingBag,
  Users,
  Settings
} from "lucide-react";
import { cn } from "../lib/utils";

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "purchases", label: "Purchases", icon: ShoppingBag },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "transactions", label: "Trans", icon: ArrowLeftRight },
    { id: "budget", label: "Budget", icon: Wallet },
    { id: "goals", label: "Goals", icon: Target },
    { id: "family", label: "Family", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-4 left-3 right-3 bg-white/85 dark:bg-slate-900/85 backdrop-blur-lg border border-slate-200 dark:border-slate-800 px-2 py-2.5 z-50 flex justify-between items-center gap-0.5 overflow-x-auto rounded-[2rem] shadow-2xl">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 py-1.5 px-1.5 rounded-2xl transition-all duration-300 shrink-0 min-w-[44px] sm:flex-1",
            activeTab === item.id
              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 scale-105 px-2"
              : "text-slate-500 dark:text-slate-500"
          )}
        >
          <item.icon className={cn(
            "w-4 h-4 sm:w-5 sm:h-5",
            activeTab === item.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
          )} />
          <span className="text-[9px] sm:text-[10px] font-bold tracking-tight truncate max-w-full">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};
