import React, { useRef, useState } from "react";
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
  Edit2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Calendar,
  Check
} from "lucide-react";
import {
  cn,
  CURRENCY_OPTIONS,
  DATE_FORMAT_OPTIONS,
  formatAppDate,
  formatCurrency,
  getCurrencyLabel,
} from "../lib/utils";
import { CategoryManager } from "../components/CategoryManager";
import { ConfirmModal } from "../components/ConfirmModal";
import { Modal } from "../components/Modal";
import type { ImportedBackupData } from "../lib/excelBackup";

const Settings: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const {
    transactions,
    budgets,
    goals,
    purchases,
    categories,
    settings,
    setTheme,
    updateProfileSettings,
    updateAppPreferences,
    importAllData,
    resetData,
  } = useFinance();
  const {
    user,
    hasPasswordProvider,
    updateUserProfile,
    updateUserEmail,
    changePassword,
    resetPassword,
    logout,
  } = useAuth();

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Edit modals state
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [isEditEmailOpen, setIsEditEmailOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isDateFormatModalOpen, setIsDateFormatModalOpen] = useState(false);

  // Form states
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Excel Import states
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImportData, setPendingImportData] = useState<ImportedBackupData | null>(null);
  const [pendingImportFileName, setPendingImportFileName] = useState("");
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [isImporting, setIsImporting] = useState(false);

  // Feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const displayName = user?.displayName || settings.name || "User";
  const displayEmail = user?.email || settings.email || "";

  const showSuccess = (message: string) => {
    setFeedbackBanner({ type: "success", message });
    setTimeout(() => {
      setFeedbackBanner((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  const showError = (message: string) => {
    setFeedbackBanner({ type: "error", message });
    setTimeout(() => {
      setFeedbackBanner((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  const getFirebaseAuthErrorMessage = (err: any, fallback: string) => {
    const code = err?.code || "";
    switch (code) {
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Password saat ini salah.";
      case "auth/missing-password":
        return "Masukkan password saat ini untuk verifikasi.";
      case "auth/weak-password":
        return "Password baru terlalu lemah (minimal 6 karakter).";
      case "auth/invalid-email":
        return "Format alamat email tidak valid.";
      case "auth/email-already-in-use":
        return "Alamat email tersebut sudah digunakan oleh akun lain.";
      case "auth/requires-recent-login":
        return "Demi keamanan, silakan keluar dan masuk kembali lalu coba lagi.";
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return "Verifikasi Google dibatalkan.";
      case "auth/too-many-requests":
        return "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
      default:
        return err?.message || fallback;
    }
  };

  const openEditNameModal = () => {
    setNameInput(displayName);
    setModalError(null);
    setIsEditNameOpen(true);
  };

  const openEditEmailModal = () => {
    setEmailInput(displayEmail);
    setEmailCurrentPassword("");
    setModalError(null);
    setIsEditEmailOpen(true);
  };

  const openChangePasswordModal = () => {
    setCurrentPasswordInput("");
    setNewPasswordInput("");
    setConfirmPasswordInput("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setModalError(null);
    setIsChangePasswordOpen(true);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setModalError("Nama lengkap tidak boleh kosong.");
      return;
    }

    try {
      setIsSaving(true);
      setModalError(null);
      await updateUserProfile(trimmed);
      await updateProfileSettings({ name: trimmed });
      setIsEditNameOpen(false);
      showSuccess("Nama lengkap berhasil diperbarui.");
    } catch (err: any) {
      setModalError(getFirebaseAuthErrorMessage(err, "Gagal memperbarui nama lengkap."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = emailInput.trim();
    if (!trimmed) {
      setModalError("Alamat email tidak boleh kosong.");
      return;
    }
    if (trimmed === displayEmail) {
      setIsEditEmailOpen(false);
      return;
    }

    try {
      setIsSaving(true);
      setModalError(null);
      const result = await updateUserEmail(trimmed, emailCurrentPassword || undefined);
      if (result.verificationSent) {
        setIsEditEmailOpen(false);
        showSuccess(`Tautan verifikasi telah dikirim ke ${trimmed}. Email akan diperbarui setelah Anda mengklik tautan tersebut.`);
      } else {
        await updateProfileSettings({ email: trimmed });
        setIsEditEmailOpen(false);
        showSuccess("Alamat email berhasil diperbarui.");
      }
    } catch (err: any) {
      setModalError(getFirebaseAuthErrorMessage(err, "Gagal memperbarui alamat email."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasPasswordProvider && !currentPasswordInput) {
      setModalError("Masukkan password saat ini.");
      return;
    }
    if (newPasswordInput.length < 6) {
      setModalError("Password baru minimal 6 karakter.");
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setModalError("Konfirmasi password baru tidak cocok.");
      return;
    }

    try {
      setIsSaving(true);
      setModalError(null);
      await changePassword(currentPasswordInput, newPasswordInput);
      setIsChangePasswordOpen(false);
      showSuccess(hasPasswordProvider ? "Password berhasil diubah." : "Password akun berhasil ditambahkan.");
    } catch (err: any) {
      setModalError(getFirebaseAuthErrorMessage(err, "Gagal mengubah password."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!displayEmail) return;
    try {
      setIsSaving(true);
      setModalError(null);
      await resetPassword(displayEmail);
      setIsChangePasswordOpen(false);
      showSuccess(`Tautan reset password telah dikirim ke ${displayEmail}.`);
    } catch (err: any) {
      setModalError(getFirebaseAuthErrorMessage(err, "Gagal mengirim email reset password."));
    } finally {
      setIsSaving(false);
    }
  };

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

  const handleExportExcel = async () => {
    try {
      const { exportDataToExcel } = await import("../lib/excelBackup");
      exportDataToExcel({
        transactions,
        budgets,
        goals,
        purchases,
        categories,
      });
      showSuccess("Data berhasil diekspor ke file Excel (.xlsx).");
    } catch (err: any) {
      showError(err?.message || "Gagal mengekspor data ke Excel.");
    }
  };

  const handleTriggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { parseExcelBackupFile } = await import("../lib/excelBackup");
      const parsed = await parseExcelBackupFile(file);
      setPendingImportData(parsed);
      setPendingImportFileName(file.name);
      setImportMode("merge");
      setModalError(null);
    } catch (err: any) {
      showError(err?.message || "File Excel tidak valid atau gagal dibaca.");
    } finally {
      e.target.value = "";
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImportData) return;
    try {
      setIsImporting(true);
      setModalError(null);
      const count = await importAllData(pendingImportData, importMode);
      setPendingImportData(null);
      setPendingImportFileName("");
      showSuccess(`${count} data dari file Excel berhasil diimpor.`);
    } catch (err: any) {
      setModalError(err?.message || "Gagal mengimpor data ke database.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleToggleTheme = async () => {
    const nextTheme = settings.theme === "light" ? "dark" : "light";
    try {
      await setTheme(nextTheme);
      showSuccess(`Tema tampilan diubah ke mode ${nextTheme === "dark" ? "Gelap" : "Terang"}.`);
    } catch {
      showError("Gagal menyimpan preferensi tema tampilan.");
    }
  };

  const handleSelectCurrency = async (currencyCode: string) => {
    try {
      setIsSaving(true);
      await updateAppPreferences({ currency: currencyCode });
      setIsCurrencyModalOpen(false);
      showSuccess(`Mata uang default diubah menjadi ${getCurrencyLabel(currencyCode)}.`);
    } catch {
      showError("Gagal menyimpan mata uang default.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectDateFormat = async (dateFormat: string) => {
    try {
      setIsSaving(true);
      await updateAppPreferences({ dateFormat });
      setIsDateFormatModalOpen(false);
      showSuccess(`Format tanggal diubah menjadi ${dateFormat}.`);
    } catch {
      showError("Gagal menyimpan format tanggal.");
    } finally {
      setIsSaving(false);
    }
  };

  interface SettingItem {
    label: string;
    value?: string;
    icon: React.ComponentType<{ className?: string }>;
    action?: () => void;
    isAction?: boolean;
    isLink?: boolean;
    isEditable?: boolean;
    isToggle?: boolean;
    toggleValue?: boolean;
    color?: string;
  }

  const sections: { title: string; items: SettingItem[] }[] = [
    {
      title: "Profil & Akun",
      items: [
        {
          label: "Nama Lengkap",
          value: displayName,
          icon: User,
          action: openEditNameModal,
          isAction: true,
          isEditable: true,
        },
        {
          label: "Alamat Email",
          value: displayEmail,
          icon: Mail,
          action: openEditEmailModal,
          isAction: true,
          isEditable: true,
        },
        {
          label: "Keamanan",
          value: "Ubah Password",
          icon: Lock,
          action: openChangePasswordModal,
          isAction: true,
          isLink: true,
        },
      ]
    },
    {
      title: "Preferensi Aplikasi",
      items: [
        { 
          label: "Tema Tampilan", 
          value: settings.theme === "light" ? "Terang" : "Gelap", 
          icon: settings.theme === "light" ? Sun : Moon,
          action: handleToggleTheme,
          isAction: true,
          isToggle: true,
          toggleValue: settings.theme === "dark",
        },
        {
          label: "Mata Uang Default",
          value: getCurrencyLabel(settings.currency),
          icon: Globe,
          action: () => setIsCurrencyModalOpen(true),
          isAction: true,
          isEditable: true,
        },
        {
          label: "Format Tanggal",
          value: settings.dateFormat || "DD/MM/YYYY",
          icon: Calendar,
          action: () => setIsDateFormatModalOpen(true),
          isAction: true,
          isEditable: true,
        },
      ]
    },
    {
      title: "Manajemen Data",
      items: [
        {
          label: "Ekspor Data (Excel)",
          value: "Unduh cadangan data format .xlsx",
          icon: Download,
          action: handleExportExcel,
          isAction: true,
        },
        {
          label: "Impor Data (Excel)",
          value: "Muat data dari file .xlsx atau .xls",
          icon: Upload,
          action: handleTriggerImport,
          isAction: true,
        },
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
        {/* Status Banner */}
        {feedbackBanner && (
          <div
            className={cn(
              "p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold border",
              feedbackBanner.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50"
            )}
          >
            {feedbackBanner.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span className="flex-1">{feedbackBanner.message}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="bento-card p-6 sm:p-8 flex items-center gap-4 sm:gap-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-100 dark:bg-indigo-900/40 rounded-3xl overflow-hidden flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 sm:w-10 sm:h-10" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">{displayName}</h3>
            <p className="text-xs sm:text-sm text-slate-500 truncate">{displayEmail}</p>
            <div className="mt-2 inline-flex bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Akun Premium
            </div>
          </div>
          <button
            onClick={openEditNameModal}
            className="ml-auto bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 p-3 rounded-xl transition-all cursor-pointer shrink-0"
            title="Edit Profil"
            aria-label="Edit Profil"
          >
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
                    type="button"
                    onClick={item.action}
                    className={cn(
                      "w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border-b border-slate-100 dark:border-slate-800 last:border-0",
                      item.isAction ? "cursor-pointer" : "cursor-default"
                    )}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn(
                        "p-2 rounded-xl bg-slate-50 dark:bg-slate-800 shrink-0",
                        item.color || "text-slate-600 dark:text-slate-400"
                      )}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</p>
                        {item.value && <p className="text-xs text-slate-500 truncate">{item.value}</p>}
                      </div>
                    </div>
                    {item.isToggle ? (
                      <div
                        className={cn(
                          "w-12 h-7 rounded-full p-1 transition-colors shrink-0 ml-3 flex items-center",
                          item.toggleValue ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                            item.toggleValue ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </div>
                    ) : item.isEditable ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0 ml-3">
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </div>
                    ) : (item.isLink || item.isAction) ? (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-3" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* About App */}
        <div className="text-center py-8">
          <p className="text-xs text-slate-400 font-medium">Dompet Disiplin v1.0.0 Build 2026</p>
          <p className="text-[10px] text-slate-500 mt-1">Dibuat dengan ❤️ untuk masa depan finansial Anda</p>
        </div>
      </div>

      {/* Modal Edit Nama Lengkap */}
      <Modal
        isOpen={isEditNameOpen}
        onClose={() => setIsEditNameOpen(false)}
        title="Ubah Nama Lengkap"
      >
        <form onSubmit={handleSaveName} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200 dark:border-rose-900/50">
              {modalError}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nama Lengkap</label>
            <input
              type="text"
              required
              maxLength={80}
              placeholder="Masukkan nama lengkap"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditNameOpen(false)}
              className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Alamat Email */}
      <Modal
        isOpen={isEditEmailOpen}
        onClose={() => setIsEditEmailOpen(false)}
        title="Ubah Alamat Email"
      >
        <form onSubmit={handleSaveEmail} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200 dark:border-rose-900/50">
              {modalError}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Alamat Email Baru</label>
            <input
              type="email"
              required
              placeholder="nama@email.com"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
          </div>

          {hasPasswordProvider && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password Saat Ini (Verifikasi)</label>
              <input
                type="password"
                placeholder="Masukkan password saat ini"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
                value={emailCurrentPassword}
                onChange={(e) => setEmailCurrentPassword(e.target.value)}
              />
            </div>
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Demi keamanan, sistem mungkin meminta verifikasi ulang atau mengirimkan tautan konfirmasi ke alamat email baru Anda.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditEmailOpen(false)}
              className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? "Menyimpan..." : "Simpan Email"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Ubah Password */}
      <Modal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        title="Keamanan — Ubah Password"
      >
        <form onSubmit={handleSavePassword} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200 dark:border-rose-900/50">
              {modalError}
            </div>
          )}

          {hasPasswordProvider ? (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password Saat Ini</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-4 pr-11 text-sm font-semibold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium border border-indigo-200/70 dark:border-indigo-900/50">
              Akun Anda saat ini masuk menggunakan Google. Anda dapat menambahkan password baru di bawah ini agar juga bisa masuk menggunakan email & password.
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password Baru</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-4 pr-11 text-sm font-semibold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Konfirmasi Password Baru</label>
            <input
              type={showNewPassword ? "text" : "password"}
              required
              minLength={6}
              placeholder="Ulangi password baru"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
              value={confirmPasswordInput}
              onChange={(e) => setConfirmPasswordInput(e.target.value)}
            />
          </div>

          {displayEmail && (
            <div className="text-right">
              <button
                type="button"
                onClick={handleSendResetEmail}
                disabled={isSaving}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Lupa password? Kirim link reset ke email
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsChangePasswordOpen(false)}
              className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? "Menyimpan..." : "Simpan Password"}
            </button>
          </div>
        </form>
      </Modal>

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

      {/* Hidden Excel File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Modal Konfirmasi Impor Excel */}
      <Modal
        isOpen={Boolean(pendingImportData)}
        onClose={() => !isImporting && setPendingImportData(null)}
        title="Impor Data dari Excel"
      >
        {pendingImportData && (
          <div className="space-y-4">
            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200 dark:border-rose-900/50">
                {modalError}
              </div>
            )}

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {pendingImportFileName}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                  File Excel berhasil dibaca dan siap diimpor
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Transaksi</span>
                <span className="font-bold text-slate-900 dark:text-white">{pendingImportData.transactions.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Budget</span>
                <span className="font-bold text-slate-900 dark:text-white">{pendingImportData.budgets.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Target</span>
                <span className="font-bold text-slate-900 dark:text-white">{pendingImportData.goals.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Purchases</span>
                <span className="font-bold text-slate-900 dark:text-white">{pendingImportData.purchases.length}</span>
              </div>
              <div className="col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Kategori</span>
                <span className="font-bold text-slate-900 dark:text-white">{pendingImportData.categories.length}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Metode Impor</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setImportMode("merge")}
                  className={cn(
                    "w-full text-left p-3 rounded-2xl border transition-all cursor-pointer",
                    importMode === "merge"
                      ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/30"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                  )}
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Tambahkan ke data saat ini</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Data lama tetap dipertahankan, data baru dari Excel akan ditambahkan.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode("replace")}
                  className={cn(
                    "w-full text-left p-3 rounded-2xl border transition-all cursor-pointer",
                    importMode === "replace"
                      ? "border-rose-500 bg-rose-50/70 dark:bg-rose-950/30"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                  )}
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Ganti semua data saat ini</p>
                  <p className="text-[11px] text-rose-500 mt-0.5">Menghapus seluruh transaksi, budget, target, dan daftar belanja saat ini lalu menggantinya dengan isi file Excel.</p>
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => setPendingImportData(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={handleConfirmImport}
                className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50 cursor-pointer"
              >
                {isImporting ? "Mengimpor..." : "Impor Sekarang"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Mata Uang Default */}
      <Modal
        isOpen={isCurrencyModalOpen}
        onClose={() => !isSaving && setIsCurrencyModalOpen(false)}
        title="Pilih Mata Uang Default"
      >
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {CURRENCY_OPTIONS.map((opt) => {
            const isSelected = (settings.currency || "IDR").toUpperCase() === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                disabled={isSaving}
                onClick={() => handleSelectCurrency(opt.code)}
                className={cn(
                  "w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer",
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/30"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                )}
              >
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Contoh: {formatCurrency(1500000, opt.code)}
                  </p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Modal Format Tanggal */}
      <Modal
        isOpen={isDateFormatModalOpen}
        onClose={() => !isSaving && setIsDateFormatModalOpen(false)}
        title="Pilih Format Tanggal"
      >
        <div className="space-y-2">
          {DATE_FORMAT_OPTIONS.map((opt) => {
            const isSelected = (settings.dateFormat || "DD/MM/YYYY") === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={isSaving}
                onClick={() => handleSelectDateFormat(opt.value)}
                className={cn(
                  "w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer",
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/30"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                )}
              >
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Contoh: {formatAppDate(new Date(), opt.value)}
                  </p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Modal>
    </Layout>
  );
};

export default Settings;
