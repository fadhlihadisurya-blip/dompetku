import React from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { motion, AnimatePresence } from "motion/react";
import { Users, Settings, User } from "lucide-react";
import { useFinance } from "../context/FinanceContext";
import { PWAInstallButton } from "./PWAInstallButton";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  title: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, title }) => {
  const { settings, pendingFamilyInvites, updateProfileSettings } = useFinance();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("Ukuran file maksimal 3MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        await updateProfileSettings({ avatarUrl: base64 });
      } catch (err) {
        console.error("Gagal mengunggah foto profil:", err);
      }
    };
    reader.readAsDataURL(file);
  };

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
            <PWAInstallButton />
            <button 
              onClick={() => setActiveTab("family")}
              title="Family"
              aria-label="Family"
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 rounded-xl transition-colors relative cursor-pointer"
            >
              <Users className="w-5 h-5" />
              {pendingFamilyInvites.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-50 dark:border-slate-950"></span>
              )}
            </button>
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{settings.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Personal Account</p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button 
                onClick={handleAvatarClick}
                title="Unggah Foto Profil dari Galeri"
                aria-label="Unggah Foto Profil dari Galeri"
                className="w-10 h-10 rounded-xl overflow-hidden bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:opacity-90 transition-opacity cursor-pointer shadow-sm border border-indigo-200/50 dark:border-indigo-800/50 relative group"
              >
                {settings.avatarUrl ? (
                  <img src={settings.avatarUrl} alt={settings.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-bold">
                  Edit
                </div>
              </button>
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

        <footer className="py-8 px-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1 border-t border-slate-200/60 dark:border-slate-800/60 mt-12">
          <p className="font-semibold">copyright © FHS Dompet Disiplin V.3.15 2026</p>
          <p>Dibuat dengan ❤️ untuk masa depan finansial Anda</p>
        </footer>
      </main>

      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};
