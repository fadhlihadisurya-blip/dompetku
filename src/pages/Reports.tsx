import React, { useState, useMemo, useRef, useEffect } from "react";
import { Layout } from "../components/Layout";
import { useFinance } from "../context/FinanceContext";
import { useAuth } from "../context/AuthContext";
import { FAMILY_ROLES, FamilyMemberReport, FamilyRole } from "../types";
import { formatCurrency, cn } from "../lib/utils";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line
} from "recharts";
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Download,
  Users
} from "lucide-react";
import { 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  parseISO, 
  format,
  eachMonthOfInterval,
  isSameMonth
} from "date-fns";
import { id } from "date-fns/locale";

export type ReportRoleFilter = "self" | FamilyRole;

interface ReportsProps {
  setActiveTab: (tab: string) => void;
  selectedRole?: ReportRoleFilter;
  onSelectedRoleChange?: (role: ReportRoleFilter) => void;
}

const Reports: React.FC<ReportsProps> = ({
  setActiveTab,
  selectedRole: controlledRole,
  onSelectedRoleChange,
}) => {
  const { user } = useAuth();
  const { transactions, settings, family, familyLink, subscribeMemberReport } = useFinance();
  const [timeRange, setTimeRange] = useState("this_month");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [internalRole, setInternalRole] = useState<ReportRoleFilter>("self");
  const [memberReportsMap, setMemberReportsMap] = useState<Record<string, FamilyMemberReport | null>>({});
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const selectedRole = controlledRole ?? internalRole;
  const setSelectedRole = (next: ReportRoleFilter) => {
    setInternalRole(next);
    onSelectedRoleChange?.(next);
  };

  const matchingMembers = useMemo(() => {
    if (selectedRole === "self" || !family) return [];
    return family.members.filter((m) => m.role === selectedRole);
  }, [selectedRole, family]);

  useEffect(() => {
    if (selectedRole === "self" || !family || matchingMembers.length === 0) {
      setMemberReportsMap({});
      return;
    }

    const unsubscribers = matchingMembers.map((member) => {
      if (member.userId === user?.uid) {
        return () => {};
      }
      return subscribeMemberReport(member.userId, (report) => {
        setMemberReportsMap((prev) => ({
          ...prev,
          [member.userId]: report,
        }));
      });
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [selectedRole, family?.id, matchingMembers, user?.uid, subscribeMemberReport]);

  const activeTransactions = useMemo(() => {
    if (selectedRole === "self") {
      return transactions;
    }
    if (!family || matchingMembers.length === 0) {
      return [];
    }

    return matchingMembers.flatMap((member) => {
      if (member.userId === user?.uid) {
        return transactions;
      }
      return memberReportsMap[member.userId]?.transactions || [];
    });
  }, [selectedRole, family, matchingMembers, user?.uid, transactions, memberReportsMap]);

  const activeAccountLabel = useMemo(() => {
    const myName = user?.displayName || settings.name || "Akun Saya";
    if (selectedRole === "self") {
      return familyLink?.role ? `${myName} (${familyLink.role})` : myName;
    }
    if (!family || matchingMembers.length === 0) {
      return `${selectedRole} (Belum ditautkan)`;
    }
    const names = matchingMembers.map((m) => m.name).join(", ");
    return `${names} (${selectedRole})`;
  }, [selectedRole, user?.displayName, settings.name, familyLink?.role, family, matchingMembers]);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    try {
      const element = reportRef.current;
      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 3,
        backgroundColor: "#ffffff",
      });
      
      // F4 size in mm: 210 x 330
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [210, 330]
      });
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = 190; // 210 - 20 (margins)
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Add Page Border
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.rect(5, 5, 200, 320); // 5mm margin from edges
      
      pdf.addImage(dataUrl, "PNG", 10, 15, pdfWidth, pdfHeight);
      pdf.save(`Laporan-Dompet-Disiplin-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    } catch (error) {
      console.error("Export PDF failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let start = startOfMonth(now);
    let end = endOfMonth(now);

    if (timeRange === "this_month") {
      const [year, month] = selectedMonth.split("-").map(Number);
      start = new Date(year, month - 1, 1);
      end = endOfMonth(start);
    } else if (timeRange === "last_3_months") {
      start = startOfMonth(subMonths(now, 2));
      end = endOfMonth(now);
    } else if (timeRange === "this_year") {
      start = new Date(now.getFullYear(), 0, 1);
      end = endOfMonth(now);
    }

    return activeTransactions.filter(t => 
      isWithinInterval(parseISO(t.date), { start, end })
    );
  }, [activeTransactions, timeRange, selectedMonth]);

  const stats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
    const savings = income - expense;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    return { income, expense, savings, savingsRate };
  }, [filteredTransactions]);

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === "expense").forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + t.amount;
    });
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const monthlyTrend = useMemo(() => {
    const referenceDate = timeRange === "this_month" 
      ? endOfMonth(parseISO(`${selectedMonth}-01`)) 
      : new Date();
      
    const months = eachMonthOfInterval({
      start: subMonths(referenceDate, 5),
      end: referenceDate
    });

    return months.map(month => {
      const monthTransactions = activeTransactions.filter(t => isSameMonth(parseISO(t.date), month));
      const income = monthTransactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
      const expense = monthTransactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
      return {
        name: format(month, "MMM", { locale: id }),
        income,
        expense
      };
    });
  }, [activeTransactions, timeRange, selectedMonth]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <Layout activeTab="reports" setActiveTab={setActiveTab} title="Reports & Analytics">
      <div className="space-y-8">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="relative flex items-center">
                <Calendar className={cn("absolute left-3 w-3 h-3 z-10 pointer-events-none", timeRange === "this_month" ? "text-white" : "text-slate-400")} />
                <input 
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setTimeRange("this_month");
                  }}
                  className={cn(
                    "pl-8 pr-4 py-2 rounded-xl text-xs font-bold transition-all appearance-none bg-transparent border-none focus:ring-0 cursor-pointer",
                    timeRange === "this_month" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                />
              </div>
              <button 
                onClick={() => setTimeRange("last_3_months")}
                className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer", timeRange === "last_3_months" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")}
              >
                3 Bulan
              </button>
              <button 
                onClick={() => setTimeRange("this_year")}
                className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer", timeRange === "this_year" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")}
              >
                Tahun Ini
              </button>
            </div>

            {/* Family Role Dropdown */}
            <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-1.5">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mr-2 shrink-0" />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as ReportRoleFilter)}
                aria-label="Pilih Role Keluarga"
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-white pr-2 py-1 outline-none cursor-pointer"
              >
                <option value="self" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  Akun Saya{familyLink?.role ? ` (${familyLink.role})` : ""}
                </option>
                {FAMILY_ROLES.map((role) => {
                  const roleMembers = family?.members.filter((m) => m.role === role) || [];
                  const suffix =
                    roleMembers.length === 1
                      ? ` — ${roleMembers[0].name}`
                      : roleMembers.length > 1
                      ? ` (${roleMembers.length} akun)`
                      : "";
                  return (
                    <option
                      key={role}
                      value={role}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      {role}{suffix}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-4 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className={cn("w-4 h-4", isExporting && "animate-bounce")} />
            {isExporting ? "Memproses..." : "Ekspor PDF"}
          </button>
        </div>

        {/* Unlinked Role Prompt */}
        {selectedRole !== "self" && matchingMembers.length === 0 && (
          <div className="bento-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Belum ada akun keluarga dengan role {selectedRole}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {family
                  ? `Tautkan akun lain dan tetapkan role ${selectedRole} di menu Family agar laporannya muncul di sini.`
                  : "Buat atau gabung ke dalam keluarga di menu Family terlebih dahulu untuk melihat laporan anggota keluarga."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("family")}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
            >
              Buka Menu Family
            </button>
          </div>
        )}

        <div ref={reportRef} className="space-y-8 p-8 bg-white dark:bg-slate-900 rounded-3xl">
          {/* PDF Header - Only visible in export structure or styled nicely */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 pb-6 border-b-2 border-slate-100 dark:border-slate-800">
            <div>
              <h1 className="text-3xl font-black text-orange-600 tracking-tight">DOMPET DISIPLIN</h1>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Personal Finance Report</p>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                Akun: {activeAccountLabel}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-bold text-slate-400 uppercase">Periode Laporan</p>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                {timeRange === "this_month" 
                  ? format(parseISO(`${selectedMonth}-01`), "MMMM yyyy", { locale: id })
                  : timeRange === "last_3_months" ? "3 Bulan Terakhir" : "Tahun Ini"}
              </p>
            </div>
          </div>

          {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bento-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pemasukan</p>
            </div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.income)}</h4>
          </div>
          <div className="bento-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-rose-100 dark:bg-rose-900/30 rounded-lg flex items-center justify-center text-rose-600">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pengeluaran</p>
            </div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.expense)}</h4>
          </div>
          <div className="bento-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600">
                <BarChart3 className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Cash Flow</p>
            </div>
            <h4 className={cn("text-xl font-bold", stats.savings >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {formatCurrency(stats.savings)}
            </h4>
          </div>
          <div className="bento-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600">
                <Calendar className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Savings Rate</p>
            </div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white">{stats.savingsRate.toFixed(1)}%</h4>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bento-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tren 6 Bulan Terakhir</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value) => `${value/1000}k`} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => formatCurrency(value)} />
                <Line type="monotone" dataKey="income" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Bar Chart */}
        <div className="bento-card p-8">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-8">Detail Pengeluaran per Kategori</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `${v/1000}k`} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }} width={80} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} formatter={(v: number) => formatCurrency(v)} cursor={{ fill: '#f1f5f9', opacity: 0.5 }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;
