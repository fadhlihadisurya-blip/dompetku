import * as XLSX from "xlsx";
import {
  Budget,
  Category,
  FinancialGoal,
  PurchaseItem,
  Transaction,
  TransactionType,
} from "../types";

export interface ExportDataPayload {
  transactions: Transaction[];
  budgets: Budget[];
  goals: FinancialGoal[];
  purchases: PurchaseItem[];
  categories: Category[];
}

export interface ImportedBackupData {
  transactions: Omit<Transaction, "id">[];
  budgets: Omit<Budget, "id">[];
  goals: Omit<FinancialGoal, "id">[];
  purchases: Array<{
    name: string;
    price: number;
    quantity: number;
    category: string;
    notes: string;
    isPurchased: boolean;
    createdAt: string;
    purchasedAt: string | null;
  }>;
  categories: Array<Omit<Category, "id" | "userId">>;
}

const SHEET_NAMES = {
  transactions: "Transaksi",
  budgets: "Budget",
  goals: "Target",
  purchases: "Purchases",
  categories: "Kategori",
} as const;

const formatTypeLabel = (type: TransactionType) =>
  type === "income" ? "Pemasukan" : "Pengeluaran";

const formatGoalStatusLabel = (status: FinancialGoal["status"]) => {
  if (status === "completed") return "Tercapai";
  if (status === "failed") return "Gagal";
  return "Aktif";
};

const autoFitColumns = (rows: Record<string, any>[], minWidth = 12, maxWidth = 42) => {
  if (!rows.length) return [];
  const headers = Object.keys(rows[0]);
  return headers.map((header) => {
    const longest = rows.reduce((max, row) => {
      const val = row[header] !== undefined && row[header] !== null ? String(row[header]) : "";
      return Math.max(max, val.length);
    }, header.length);
    return { wch: Math.min(maxWidth, Math.max(minWidth, longest + 3)) };
  });
};

const appendTypedSheet = (
  workbook: XLSX.WorkBook,
  sheetName: string,
  rows: Record<string, any>[],
  emptyHeaders: string[]
) => {
  const sheet =
    rows.length > 0
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.aoa_to_sheet([emptyHeaders]);
  sheet["!cols"] =
    rows.length > 0
      ? autoFitColumns(rows)
      : emptyHeaders.map((h) => ({ wch: Math.max(14, h.length + 4) }));
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
};

export const exportDataToExcel = (data: ExportDataPayload) => {
  const workbook = XLSX.utils.book_new();

  const transactionRows = data.transactions.map((t) => ({
    Tanggal: t.date || "",
    Waktu: t.time || "",
    Tipe: formatTypeLabel(t.type),
    Kategori: t.category || "",
    Deskripsi: t.description || "",
    Jumlah: Number(t.amount) || 0,
    "Metode Pembayaran": t.paymentMethod || "Tunai",
    Catatan: t.notes || "",
  }));

  const budgetRows = data.budgets.map((b) => ({
    Kategori: b.category || "",
    "Batas Budget": Number(b.amount) || 0,
    Terpakai: Number(b.spent) || 0,
    Periode: b.isRecurring || b.period === "recurring" ? "recurring" : b.period || "",
    Berulang: b.isRecurring || b.period === "recurring" ? "Ya" : "Tidak",
  }));

  const goalRows = data.goals.map((g) => ({
    "Nama Target": g.name || "",
    "Target Dana": Number(g.targetAmount) || 0,
    "Dana Terkumpul": Number(g.currentAmount) || 0,
    Tenggat: g.deadline || "",
    Status: formatGoalStatusLabel(g.status),
  }));

  const purchaseRows = data.purchases.map((p) => ({
    "Nama Barang": p.name || "",
    Status: p.isPurchased ? "Sudah Dibeli" : "Akan Dibeli",
    "Tanggal Dibuat": p.createdAt || "",
    "Tanggal Dibeli": p.purchasedAt || "",
  }));

  const categoryRows = data.categories.map((c) => ({
    "Nama Kategori": c.name || "",
    Tipe: formatTypeLabel(c.type),
  }));

  appendTypedSheet(workbook, SHEET_NAMES.transactions, transactionRows, [
    "Tanggal",
    "Waktu",
    "Tipe",
    "Kategori",
    "Deskripsi",
    "Jumlah",
    "Metode Pembayaran",
    "Catatan",
  ]);
  appendTypedSheet(workbook, SHEET_NAMES.budgets, budgetRows, [
    "Kategori",
    "Batas Budget",
    "Terpakai",
    "Periode",
    "Berulang",
  ]);
  appendTypedSheet(workbook, SHEET_NAMES.goals, goalRows, [
    "Nama Target",
    "Target Dana",
    "Dana Terkumpul",
    "Tenggat",
    "Status",
  ]);
  appendTypedSheet(workbook, SHEET_NAMES.purchases, purchaseRows, [
    "Nama Barang",
    "Status",
    "Tanggal Dibuat",
    "Tanggal Dibeli",
  ]);
  appendTypedSheet(workbook, SHEET_NAMES.categories, categoryRows, [
    "Nama Kategori",
    "Tipe",
  ]);

  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Dompet_Disiplin_Data_${dateStamp}.xlsx`);
};

// Normalization helpers for importing Excel rows
const normalizeKeyMap = (row: Record<string, any>) => {
  const map: Record<string, any> = {};
  Object.entries(row).forEach(([k, v]) => {
    map[k.trim().toLowerCase()] = v;
  });
  return map;
};

const pickValue = (map: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    const val = map[key.toLowerCase()];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return val;
    }
  }
  return undefined;
};

const parseExcelNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.,-]/g, "");
    if (!cleaned) return fallback;
    // Handle Indonesian formatting like 1.500.000 or 1,500,000
    const normalized =
      cleaned.includes(".") && cleaned.includes(",")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/\./g, "").replace(/,/g, "");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const parseExcelDateString = (value: unknown, fallbackIsoDate: string): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const y = String(parsed.y).padStart(4, "0");
      const m = String(parsed.m).padStart(2, "0");
      const d = String(parsed.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) {
      const d = dmy[1].padStart(2, "0");
      const m = dmy[2].padStart(2, "0");
      const y = dmy[3];
      return `${y}-${m}-${d}`;
    }
    const parsedDate = new Date(trimmed);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().slice(0, 10);
    }
  }
  return fallbackIsoDate;
};

const parseIsoTimestamp = (value: unknown, fallback: string): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 50);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const dt = new Date(
        Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0)
      );
      return dt.toISOString().slice(0, 50);
    }
  }
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim().slice(0, 50);
    const dt = new Date(trimmed);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString().slice(0, 50);
    }
    return trimmed;
  }
  return fallback;
};

const parseTransactionType = (value: unknown): TransactionType | null => {
  const str = String(value || "").trim().toLowerCase();
  if (["income", "pemasukan", "masuk", "pendapatan"].includes(str)) return "income";
  if (["expense", "pengeluaran", "keluar", "belanja"].includes(str)) return "expense";
  return null;
};

const parseGoalStatus = (value: unknown): FinancialGoal["status"] => {
  const str = String(value || "").trim().toLowerCase();
  if (["completed", "tercapai", "selesai"].includes(str)) return "completed";
  if (["failed", "gagal"].includes(str)) return "failed";
  return "active";
};

const parseBooleanFlag = (value: unknown, truthyWords: string[]): boolean => {
  if (typeof value === "boolean") return value;
  const str = String(value || "").trim().toLowerCase();
  return truthyWords.includes(str);
};

const findSheetRows = (workbook: XLSX.WorkBook, candidates: string[]): Record<string, any>[] => {
  const matchedName = workbook.SheetNames.find((name) =>
    candidates.some((c) => name.trim().toLowerCase() === c.toLowerCase())
  );
  if (!matchedName) return [];
  const sheet = workbook.Sheets[matchedName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
};

export const parseExcelBackupFile = async (file: File): Promise<ImportedBackupData> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  if (!workbook.SheetNames.length) {
    throw new Error("File Excel tidak memiliki lembar kerja (sheet).");
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  // 1. Transactions (also fallback to first sheet if it's a single-sheet transactions export)
  let rawTransactions = findSheetRows(workbook, ["Transaksi", "Transactions", "Transaction"]);
  if (!rawTransactions.length && workbook.SheetNames.length === 1) {
    const firstSheet = XLSX.utils.sheet_to_json<Record<string, any>>(
      workbook.Sheets[workbook.SheetNames[0]],
      { defval: "" }
    );
    if (firstSheet.length > 0) {
      const sampleMap = normalizeKeyMap(firstSheet[0]);
      if (
        pickValue(sampleMap, ["jumlah", "amount", "nominal"]) !== undefined ||
        pickValue(sampleMap, ["deskripsi", "description"]) !== undefined
      ) {
        rawTransactions = firstSheet;
      }
    }
  }

  const transactions: Omit<Transaction, "id">[] = [];
  rawTransactions.forEach((row) => {
    const map = normalizeKeyMap(row);
    const amount = parseExcelNumber(pickValue(map, ["jumlah", "amount", "nominal"]), NaN);
    const description = String(
      pickValue(map, ["deskripsi", "description", "keterangan"]) || ""
    ).trim();
    const category = String(pickValue(map, ["kategori", "category"]) || "").trim();
    const type = parseTransactionType(pickValue(map, ["tipe", "type", "jenis"])) || "expense";

    if (!Number.isFinite(amount) || amount <= 0 || (!description && !category)) {
      return;
    }

    const date = parseExcelDateString(pickValue(map, ["tanggal", "date"]), todayStr);
    const timeVal = pickValue(map, ["waktu", "time"]);
    const time = timeVal ? String(timeVal).trim().slice(0, 12) : undefined;
    const paymentMethod = String(
      pickValue(map, ["metode pembayaran", "paymentmethod", "payment method", "metode"]) || "Tunai"
    ).trim();
    const notesVal = pickValue(map, ["catatan", "notes", "note"]);
    const notes = notesVal ? String(notesVal).trim() : undefined;

    transactions.push({
      type,
      amount,
      category: category || "Lainnya",
      description: description || category || "Transaksi",
      date,
      ...(time ? { time } : {}),
      paymentMethod,
      ...(notes ? { notes } : {}),
    });
  });

  // 2. Budgets
  const rawBudgets = findSheetRows(workbook, ["Budget", "Budgets", "Anggaran"]);
  const budgets: Omit<Budget, "id">[] = [];
  rawBudgets.forEach((row) => {
    const map = normalizeKeyMap(row);
    const category = String(pickValue(map, ["kategori", "category"]) || "").trim();
    const amount = parseExcelNumber(
      pickValue(map, ["batas budget", "amount", "budget", "batas", "nominal"]),
      NaN
    );
    if (!category || !Number.isFinite(amount) || amount < 0) return;

    const spent = Math.max(
      0,
      parseExcelNumber(pickValue(map, ["terpakai", "spent"]), 0)
    );
    const rawPeriod = String(pickValue(map, ["periode", "period"]) || "").trim();
    const recurringFlag = parseBooleanFlag(
      pickValue(map, ["berulang", "isrecurring", "recurring"]),
      ["ya", "yes", "true", "1", "recurring"]
    );
    const isRecurring =
      recurringFlag || rawPeriod.toLowerCase() === "recurring" || !rawPeriod;

    budgets.push({
      category,
      amount,
      spent,
      period: isRecurring ? "recurring" : rawPeriod,
      isRecurring,
    });
  });

  // 3. Goals
  const rawGoals = findSheetRows(workbook, ["Target", "Goals", "Financial Goals", "Target Keuangan"]);
  const goals: Omit<FinancialGoal, "id">[] = [];
  rawGoals.forEach((row) => {
    const map = normalizeKeyMap(row);
    const name = String(pickValue(map, ["nama target", "name", "target"]) || "").trim();
    const targetAmount = parseExcelNumber(
      pickValue(map, ["target dana", "targetamount", "target amount"]),
      NaN
    );
    if (!name || !Number.isFinite(targetAmount) || targetAmount <= 0) return;

    const currentAmount = Math.max(
      0,
      parseExcelNumber(
        pickValue(map, ["dana terkumpul", "currentamount", "current amount"]),
        0
      )
    );
    const deadline = parseExcelDateString(
      pickValue(map, ["tenggat", "deadline", "batas waktu"]),
      todayStr
    );
    const status = parseGoalStatus(pickValue(map, ["status"]));

    goals.push({
      name,
      targetAmount,
      currentAmount,
      deadline,
      status,
    });
  });

  // 4. Purchases
  const rawPurchases = findSheetRows(workbook, [
    "Purchases",
    "Purchase",
    "Belanja",
    "Daftar Belanja",
  ]);
  const purchases: ImportedBackupData["purchases"] = [];
  rawPurchases.forEach((row) => {
    const map = normalizeKeyMap(row);
    const name = String(
      pickValue(map, ["nama barang", "name", "barang", "item"]) || ""
    )
      .trim()
      .slice(0, 120);
    if (!name) return;

    const isPurchased = parseBooleanFlag(
      pickValue(map, ["status", "ispurchased", "sudah dibeli"]),
      ["sudah dibeli", "sudah", "ya", "yes", "true", "1", "purchased"]
    );
    const createdAt = parseIsoTimestamp(
      pickValue(map, ["tanggal dibuat", "createdat", "created at"]),
      nowIso
    );
    const rawPurchasedAt = pickValue(map, ["tanggal dibeli", "purchasedat", "purchased at"]);
    const purchasedAt = isPurchased
      ? parseIsoTimestamp(rawPurchasedAt, nowIso)
      : null;

    purchases.push({
      name,
      price: 0,
      quantity: 1,
      category: "Belanja",
      notes: "",
      isPurchased,
      createdAt,
      purchasedAt,
    });
  });

  // 5. Categories
  const rawCategories = findSheetRows(workbook, ["Kategori", "Categories", "Category"]);
  const categories: ImportedBackupData["categories"] = [];
  rawCategories.forEach((row) => {
    const map = normalizeKeyMap(row);
    const name = String(pickValue(map, ["nama kategori", "name", "kategori"]) || "").trim();
    const type = parseTransactionType(pickValue(map, ["tipe", "type", "jenis"]));
    if (!name || !type) return;
    categories.push({ name, type });
  });

  const totalFound =
    transactions.length +
    budgets.length +
    goals.length +
    purchases.length +
    categories.length;

  if (totalFound === 0) {
    throw new Error(
      "Tidak ada data valid yang ditemukan di file Excel. Pastikan menggunakan format hasil Ekspor Data (Excel)."
    );
  }

  return {
    transactions,
    budgets,
    goals,
    purchases,
    categories,
  };
};
