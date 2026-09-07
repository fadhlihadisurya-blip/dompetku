import React, { useState } from "react";
import { Layout } from "../components/Layout";
import { useFinance } from "../context/FinanceContext";
import { useAuth } from "../context/AuthContext";
import { 
  User, 
  Mail, 
  Globe, 
  Moon, 
  Sun, 
  Bell, 
  Download, 
  Upload, 
  Trash2,
  Lock,
  ChevronRight,
  LogOut,
  Tag,
  Edit2
} from "lucide-react";
import { cn } from "../lib/utils";
import { CategoryManager } from "../components/CategoryManager";
import { ConfirmModal } from "../components/ConfirmModal";

const Settings: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const { settings, setTheme, resetData } = useFinance();
  const { user, logout } = useAuth();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetConfirm = async () => {
    try {
      setIsResetting(true);
      await resetData();
      setIsResetModalOpen(false);
    } catch (err) {
      console.error("Gagal reset data:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const sections = [
    {
      title: "Profil & Akun",
      items: [
        { label: "Nama Lengkap", value: user?.displayName || settings.name, icon: User },
        { label: "Alamat Email", value: user?.email || settings.email, icon: Mail },
        { label: "Keamanan", value: "Ubah Password", icon: Lock, isLink: true },
      ]
    },
    {
      title: "Preferensi Aplikasi",
      items: [
        { 
          label: "Tema Tampilan", 
          value: settings.theme === "light" ? "Terang" : "Gelap", 
          icon: settings.theme === "light" ? Sun : Moon,
          action: () => setTheme(settings.theme === "light" ? "dark" : "light")
        },
        { label: "Mata Uang Default", value: "Rupiah (IDR)", icon: Globe },
        { label: "Format Tanggal", value: "DD/MM/YYYY", icon: Bell },
      ]
    },
    {
      title: "Manajemen Data",
      items: [
        { label: "Ekspor Data (JSON)", icon: Download, isAction: true },
        { label: "Impor Data", icon: Upload, isAction: true },
        { label: "Reset Semua Data", icon: Trash2, color: "text-rose-500", action: () => setIsResetModalOpen(true), isAction: true },
      ]
    },
    {
      title: "Sesi",
      items: [
        { label: "Keluar dari Akun", icon: LogOut, color: "text-rose-500", action: logout, isAction: true },
      ]
    }
  ];

  return (
    <Layout activeTab="settings" setActiveTab={setActiveTab} title="Pengaturan">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Profile Card */}
        <div className="bento-card p-8 flex items-center gap-6">
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/40 rounded-3xl overflow-hidden flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user?.displayName || settings.name}</h3>
            <p className="text-slate-500">{user?.email || settings.email}</p>
            <div className="mt-2 inline-flex bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Akun Premium
            </div>
          </div>
          <button className="ml-auto bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-3 rounded-xl transition-all">
            <Edit2 className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Settings List */}
        <div className="space-y-6">
          {/* Category Management Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-4">Manajemen Kategori</h4>
            <div className="bento-card p-6">
              <CategoryManager />
            </div>
          </div>

          {sections.map((section, idx) => (
            <div key={idx} className="space-y-4">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-4">{section.title}</h4>
              <div className="bento-card overflow-hidden">
                {section.items.map((item, i) => (
                  <button
                    key={i}
                    onClick={item.action}
                    className={cn(
                      "w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border-b border-slate-100 dark:border-slate-800 last:border-0",
                      item.isAction ? "cursor-pointer" : "cursor-default"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2 rounded-xl bg-slate-50 dark:bg-slate-800",
                        item.color || "text-slate-600 dark:text-slate-400"
                      )}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</p>
                        {item.value && <p className="text-xs text-slate-500">{item.value}</p>}
                      </div>
                    </div>
                    {(item.isLink || item.isAction) && (
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* About App */}
        <div className="text-center py-8">
          <p className="text-xs text-slate-400 font-medium">DompetKu v1.0.0 Build 2026</p>
          <p className="text-[10px] text-slate-500 mt-1">Dibuat dengan ❤️ untuk masa depan finansial Anda</p>
        </div>
      </div>

      {/* Confirm Reset Modal */}
      <ConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetConfirm}
        title="Reset Semua Data"
        message="Apakah Anda yakin ingin mengatur ulang semua data transaksi, anggaran, dan target ke pengaturan awal? Tindakan ini akan menghapus data saat ini dan mengisi ulang dengan data contoh."
        confirmText="Reset Data"
        cancelText="Batal"
        type="danger"
        isLoading={isResetting}
      />
    </Layout>
  );
};

export default Settings;
