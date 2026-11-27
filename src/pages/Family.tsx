import React, { useState } from "react";
import { Layout } from "../components/Layout";
import { useFinance } from "../context/FinanceContext";
import { useAuth } from "../context/AuthContext";
import { FAMILY_ROLES, FamilyEmailInvite, FamilyMember, FamilyRole } from "../types";
import { cn } from "../lib/utils";
import {
  Users,
  UserPlus,
  Copy,
  Check,
  Mail,
  KeyRound,
  BarChart3,
  LogOut,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Clock,
  X,
} from "lucide-react";
import { ConfirmModal } from "../components/ConfirmModal";

interface FamilyPageProps {
  setActiveTab: (tab: string) => void;
  onOpenRoleReport?: (role: FamilyRole) => void;
}

const ROLE_BADGE_STYLES: Record<FamilyRole, string> = {
  Husband: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
  Wife: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
  Son: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  Daughter: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
};

const FamilyPage: React.FC<FamilyPageProps> = ({ setActiveTab, onOpenRoleReport }) => {
  const { user } = useAuth();
  const {
    family,
    familyLink,
    pendingFamilyInvites,
    sentFamilyInvites,
    createFamily,
    joinFamilyByCode,
    sendFamilyEmailInvite,
    acceptFamilyEmailInvite,
    declineFamilyEmailInvite,
    cancelSentFamilyInvite,
    updateFamilyMemberRole,
    removeFamilyMember,
    leaveFamily,
  } = useFinance();

  // Create family state
  const [familyNameInput, setFamilyNameInput] = useState("");
  const [createRole, setCreateRole] = useState<FamilyRole>("Husband");

  // Join by code state
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinRole, setJoinRole] = useState<FamilyRole>("Wife");

  // Invite by email state
  const [inviteEmailInput, setInviteEmailInput] = useState("");
  const [inviteRole, setInviteRole] = useState<FamilyRole>("Wife");

  // Invite acceptance role overrides
  const [inviteRoleOverrides, setInviteRoleOverrides] = useState<Record<string, FamilyRole>>({});

  // UI feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<FamilyMember | null>(null);

  const showSuccess = (message: string) => {
    setBanner({ type: "success", message });
    setTimeout(() => {
      setBanner((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  const showError = (message: string) => {
    setBanner({ type: "error", message });
    setTimeout(() => {
      setBanner((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyNameInput.trim()) return;
    try {
      setIsSubmitting(true);
      await createFamily(familyNameInput, createRole);
      setFamilyNameInput("");
      showSuccess("Keluarga berhasil dibuat! Bagikan kode undangan atau kirim undangan email untuk menautkan akun lain.");
    } catch (err: any) {
      showError(err?.message || "Gagal membuat keluarga.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    try {
      setIsSubmitting(true);
      await joinFamilyByCode(joinCodeInput, joinRole);
      setJoinCodeInput("");
      showSuccess("Berhasil menautkan akun ke keluarga!");
    } catch (err: any) {
      showError(err?.message || "Gagal menautkan akun. Periksa kembali kode undangan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmailInput.trim()) return;
    try {
      setIsSubmitting(true);
      await sendFamilyEmailInvite(inviteEmailInput, inviteRole);
      setInviteEmailInput("");
      showSuccess("Undangan keluarga berhasil dikirim.");
    } catch (err: any) {
      showError(err?.message || "Gagal mengirim undangan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptInvite = async (invite: FamilyEmailInvite) => {
    const chosenRole = inviteRoleOverrides[invite.id] || invite.suggestedRole;
    try {
      setIsSubmitting(true);
      await acceptFamilyEmailInvite(invite, chosenRole);
      showSuccess(`Akun berhasil ditautkan ke keluarga "${invite.familyName}".`);
    } catch (err: any) {
      showError(err?.message || "Gagal menerima undangan keluarga.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      setIsSubmitting(true);
      await declineFamilyEmailInvite(inviteId);
      showSuccess("Undangan ditolak.");
    } catch (err: any) {
      showError(err?.message || "Gagal menolak undangan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    if (!family?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(family.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      showError("Gagal menyalin kode undangan.");
    }
  };

  const handleChangeMemberRole = async (memberUid: string, newRole: FamilyRole) => {
    try {
      await updateFamilyMemberRole(memberUid, newRole);
      showSuccess(`Role berhasil diperbarui menjadi ${newRole}.`);
    } catch (err: any) {
      showError(err?.message || "Gagal memperbarui role.");
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!removingMember) return;
    try {
      setIsSubmitting(true);
      await removeFamilyMember(removingMember.userId);
      setRemovingMember(null);
      showSuccess("Anggota berhasil dikeluarkan dari keluarga.");
    } catch (err: any) {
      showError(err?.message || "Gagal mengeluarkan anggota.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmLeaveFamily = async () => {
    try {
      setIsSubmitting(true);
      await leaveFamily();
      setIsLeaveModalOpen(false);
      showSuccess("Anda telah keluar dari keluarga.");
    } catch (err: any) {
      showError(err?.message || "Gagal keluar dari keluarga.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOwner = Boolean(family && user && family.ownerId === user.uid);

  return (
    <Layout activeTab="family" setActiveTab={setActiveTab} title="Family">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Status Banner */}
        {banner && (
          <div
            className={cn(
              "p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold border",
              banner.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50"
            )}
          >
            {banner.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span className="flex-1">{banner.message}</span>
          </div>
        )}

        {/* Pending Invitations Received */}
        {pendingFamilyInvites.length > 0 && (
          <div className="bento-card p-5 sm:p-6 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Undangan Keluarga Masuk</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Terima undangan untuk menautkan akun dan melihat laporan keuangan keluarga.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {pendingFamilyInvites.map((inv) => {
                const chosenRole = inviteRoleOverrides[inv.id] || inv.suggestedRole;
                return (
                  <div
                    key={inv.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{inv.familyName}</p>
                      <p className="text-xs text-slate-500">
                        Diundang oleh <span className="font-semibold text-slate-700 dark:text-slate-300">{inv.invitedByName}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={chosenRole}
                        onChange={(e) =>
                          setInviteRoleOverrides((prev) => ({
                            ...prev,
                            [inv.id]: e.target.value as FamilyRole,
                          }))
                        }
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none"
                      >
                        {FAMILY_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={isSubmitting || Boolean(familyLink)}
                        onClick={() => handleAcceptInvite(inv)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Terima & Tautkan
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleDeclineInvite(inv.id)}
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Tolak
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Not Linked State: Create or Join Family */}
        {!family ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Family */}
            <form onSubmit={handleCreateFamily} className="bento-card p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Buat Keluarga Baru</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Buat grup keluarga lalu undang akun pasangan atau anak.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nama Keluarga</label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  placeholder="Contoh: Keluarga Surya"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
                  value={familyNameInput}
                  onChange={(e) => setFamilyNameInput(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Role Anda di Keluarga</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as FamilyRole)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
                >
                  {FAMILY_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !familyNameInput.trim()}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Memproses..." : "Buat Keluarga"}
              </button>
            </form>

            {/* Join Existing Family by Code */}
            <form onSubmit={handleJoinByCode} className="bento-card p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Tautkan dengan Kode</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Masukkan kode undangan dari akun anggota keluarga lain.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Kode Undangan</label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  placeholder="Contoh: FAM8K2P9A"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Role Anda di Keluarga</label>
                <select
                  value={joinRole}
                  onChange={(e) => setJoinRole(e.target.value as FamilyRole)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
                >
                  {FAMILY_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !joinCodeInput.trim()}
                className="w-full py-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Menautkan..." : "Tautkan Akun"}
              </button>
            </form>
          </div>
        ) : (
          /* Linked Family Dashboard */
          <div className="space-y-6">
            {/* Family Header Summary Card */}
            <div className="bento-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-3xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{family.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                      {family.members.length} Anggota Terhubung
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Semua anggota dalam keluarga dapat melihat Reports & Analytics satu sama lain berdasarkan role.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Kode Undangan</p>
                    <p className="text-sm font-black tracking-wider text-indigo-600 dark:text-indigo-400">
                      {family.inviteCode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="Salin kode undangan"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs font-bold transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar</span>
                </button>
              </div>
            </div>

            {/* Invite Member via Email */}
            <form onSubmit={handleSendEmailInvite} className="bento-card p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Tautkan Akun Anggota Lain</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Kirim undangan lewat email akun atau bagikan kode undangan <span className="font-bold">{family.inviteCode}</span>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <input
                  type="email"
                  required
                  placeholder="Email akun anggota keluarga..."
                  className="sm:col-span-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
                  value={inviteEmailInput}
                  onChange={(e) => setInviteEmailInput(e.target.value)}
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as FamilyRole)}
                  className="sm:col-span-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
                >
                  {FAMILY_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={isSubmitting || !inviteEmailInput.trim()}
                  className="sm:col-span-3 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Mengirim..." : "Kirim Undangan"}
                </button>
              </div>

              {sentFamilyInvites.length > 0 && (
                <div className="pt-2 space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Menunggu Konfirmasi</p>
                  <div className="flex flex-wrap gap-2">
                    {sentFamilyInvites.map((inv) => (
                      <div
                        key={inv.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{inv.targetEmail}</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">({inv.suggestedRole})</span>
                        <button
                          type="button"
                          onClick={() => cancelSentFamilyInvite(inv.id)}
                          className="p-0.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                          title="Batalkan undangan"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>

            {/* Family Members List */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-2">
                Anggota Keluarga ({family.members.length})
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {family.members.map((member) => {
                  const isSelf = user?.uid === member.userId;
                  const canEditRole = isSelf || isOwner;
                  return (
                    <div
                      key={member.userId}
                      className="bento-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-black text-base shrink-0">
                          {(member.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {member.name}
                            </p>
                            {isSelf && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                Anda
                              </span>
                            )}
                            {family.ownerId === member.userId && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                                <ShieldCheck className="w-3 h-3" />
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">{member.email || "Akun tertaut"}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        {canEditRole ? (
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleChangeMemberRole(member.userId, e.target.value as FamilyRole)
                            }
                            aria-label={`Role untuk ${member.name}`}
                            className={cn(
                              "rounded-xl px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 outline-none cursor-pointer",
                              ROLE_BADGE_STYLES[member.role] || "bg-slate-100 text-slate-700"
                            )}
                          >
                            {FAMILY_ROLES.map((role) => (
                              <option key={role} value={role} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                {role}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={cn("px-3 py-1.5 rounded-xl text-xs font-bold", ROLE_BADGE_STYLES[member.role])}>
                            {member.role}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenRoleReport) {
                              onOpenRoleReport(member.role);
                            } else {
                              setActiveTab("reports");
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Lihat Reports</span>
                        </button>

                        {isOwner && !isSelf && (
                          <button
                            type="button"
                            onClick={() => setRemovingMember(member)}
                            className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
                            title={`Keluarkan ${member.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Leave Family Modal */}
      <ConfirmModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onConfirm={handleConfirmLeaveFamily}
        title="Keluar dari Keluarga"
        message="Apakah Anda yakin ingin keluar dari keluarga ini? Anda tidak lagi dapat melihat laporan anggota keluarga lain."
        confirmText="Keluar"
        cancelText="Batal"
        type="danger"
        isLoading={isSubmitting}
      />

      {/* Confirm Remove Member Modal */}
      <ConfirmModal
        isOpen={Boolean(removingMember)}
        onClose={() => setRemovingMember(null)}
        onConfirm={handleConfirmRemoveMember}
        title="Keluarkan Anggota"
        message={
          removingMember
            ? `Apakah Anda yakin ingin mengeluarkan "${removingMember.name}" dari keluarga?`
            : "Keluarkan anggota dari keluarga?"
        }
        confirmText="Keluarkan"
        cancelText="Batal"
        type="danger"
        isLoading={isSubmitting}
      />
    </Layout>
  );
};

export default FamilyPage;
