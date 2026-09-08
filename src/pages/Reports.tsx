import React, { useState, useMemo, useRef } from "react";
import { Layout } from "../components/Layout";
import { useFinance } from "../context/FinanceContext";
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
  PieChart,
  Pie,
  LineChart,
  Line
} from "recharts";
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  PieChart as PieChartIcon,
  Download,
  ChevronDown
} from "lucide-react";
import { 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  parseISO, 
  format,
  eachMonthOfInterval,
  subYears,
  isSameMonth
} from "date-fns";
import { id } from "date-fns/locale";

const Reports: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const { transactions } = useFinance();
  const [timeRange, setTimeRange] = useState("this_month");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

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

    return transactions.filter(t => 
      isWithinInterval(parseISO(t.date), { start, end })
    );
  }, [transactions, timeRange, selectedMonth]);

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
      const monthTransactions = transactions.filter(t => isSameMonth(parseISO(t.date), month));
      const income = monthTransactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
      const expense = monthTransactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
      return {
        name: format(month, "MMM", { locale: id }),
        income,
        expense
      };
    });
  }, [transactions, timeRange, selectedMonth]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <Layout activeTab="reports" setActiveTab={setActiveTab} title="Reports & Analytics">
      <div className="space-y-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
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
              className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all", timeRange === "last_3_months" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")}
            >
              3 Bulan
            </button>
            <button 
              onClick={() => setTimeRange("this_year")}
              className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all", timeRange === "this_year" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")}
            >
              Tahun Ini
            </button>
          </div>
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-4 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className={cn("w-4 h-4", isExporting && "animate-bounce")} />
            {isExporting ? "Memproses..." : "Ekspor PDF"}
          </button>
        </div>

        <div ref={reportRef} className="space-y-8 p-8 bg-white dark:bg-slate-900 rounded-3xl">
          {/* PDF Header - Only visible in export structure or styled nicely */}
          <div className="flex justify-between items-end pb-6 border-b-2 border-slate-100 dark:border-slate-800">
            <div>
              <h1 className="text-3xl font-black text-orange-600 tracking-tight">DOMPET DISIPLIN</h1>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Personal Finance Report</p>
            </div>
            <div className="text-right">
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

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

          {/* Expense Breakdown */}
          <div className="bento-card p-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-8">Proporsi Pengeluaran</h3>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/2 h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-4">
                {categoryData.slice(0, 4).map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{((item.value / stats.expense) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${(item.value / stats.expense) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
