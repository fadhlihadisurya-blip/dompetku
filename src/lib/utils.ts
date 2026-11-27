import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Transaction } from "../types";

export interface CurrencyOption {
  code: string;
  label: string;
  locale: string;
  symbol: string;
  decimals: number;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "IDR", label: "Rupiah (IDR)", locale: "id-ID", symbol: "Rp", decimals: 0 },
  { code: "USD", label: "US Dollar (USD)", locale: "en-US", symbol: "$", decimals: 2 },
  { code: "SGD", label: "Singapore Dollar (SGD)", locale: "en-SG", symbol: "S$", decimals: 2 },
  { code: "MYR", label: "Malaysian Ringgit (MYR)", locale: "ms-MY", symbol: "RM", decimals: 2 },
  { code: "EUR", label: "Euro (EUR)", locale: "de-DE", symbol: "€", decimals: 2 },
  { code: "JPY", label: "Japanese Yen (JPY)", locale: "ja-JP", symbol: "¥", decimals: 0 },
  { code: "GBP", label: "British Pound (GBP)", locale: "en-GB", symbol: "£", decimals: 2 },
  { code: "AUD", label: "Australian Dollar (AUD)", locale: "en-AU", symbol: "A$", decimals: 2 },
];

export interface DateFormatOption {
  value: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" | "DD MMM YYYY";
  label: string;
  dateFnsPattern: string;
  example: string;
}

export const DATE_FORMAT_OPTIONS: DateFormatOption[] = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY", dateFnsPattern: "dd/MM/yyyy", example: "27/11/2026" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY", dateFnsPattern: "MM/dd/yyyy", example: "11/27/2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD", dateFnsPattern: "yyyy-MM-dd", example: "2026-11-27" },
  { value: "DD MMM YYYY", label: "DD MMM YYYY", dateFnsPattern: "dd MMM yyyy", example: "27 Nov 2026" },
];

let activeCurrencyCode = "IDR";
let activeDateFormat = "DD/MM/YYYY";

export function setAppFormattingPreferences(prefs: {
  currency?: string;
  dateFormat?: string;
}) {
  if (prefs.currency) {
    activeCurrencyCode = prefs.currency;
  }
  if (prefs.dateFormat) {
    activeDateFormat = prefs.dateFormat;
  }
}

export function getCurrencyMeta(code?: string): CurrencyOption {
  const target = (code || activeCurrencyCode || "IDR").toUpperCase();
  return CURRENCY_OPTIONS.find((c) => c.code === target) || CURRENCY_OPTIONS[0];
}

export function getCurrencySymbol(code?: string): string {
  return getCurrencyMeta(code).symbol;
}

export function getCurrencyLabel(code?: string): string {
  return getCurrencyMeta(code).label;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currencyOverride?: string): string {
  const meta = getCurrencyMeta(currencyOverride);
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.code,
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(amount);
}

export function formatNumber(amount: number): string {
  const meta = getCurrencyMeta();
  return new Intl.NumberFormat(meta.locale).format(amount);
}

export function formatAppDate(
  dateInput: Date | string | null | undefined,
  formatOverride?: string
): string {
  if (!dateInput) return "";

  let dateObj: Date;
  if (dateInput instanceof Date) {
    dateObj = dateInput;
  } else {
    const str = String(dateInput).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split("-").map(Number);
      dateObj = new Date(y, m - 1, d);
    } else {
      try {
        dateObj = parseISO(str);
      } catch {
        dateObj = new Date(str);
      }
    }
  }

  if (Number.isNaN(dateObj.getTime())) return "";

  const targetFormat = formatOverride || activeDateFormat || "DD/MM/YYYY";
  const matched =
    DATE_FORMAT_OPTIONS.find((opt) => opt.value === targetFormat) ||
    DATE_FORMAT_OPTIONS[0];

  return format(dateObj, matched.dateFnsPattern, { locale: idLocale });
}

export function getTransactionTimestamp(t: Transaction): number {
  if (!t) return 0;

  let datePart = t.date || "";
  let timePart = t.time || "";

  if (datePart.includes("T")) {
    const parts = datePart.split("T");
    datePart = parts[0];
    if (!timePart && parts[1]) {
      timePart = parts[1].replace("Z", "").substring(0, 8);
    }
  } else if (datePart.includes(" ")) {
    const parts = datePart.split(" ");
    datePart = parts[0];
    if (!timePart && parts[1]) {
      timePart = parts[1].substring(0, 8);
    }
  }

  // If timePart is still missing, check createdAt
  if (!timePart && t.createdAt && t.createdAt.includes("T")) {
    timePart = t.createdAt.split("T")[1]?.substring(0, 8) || "";
  }

  let hour = 0;
  let minute = 0;
  let second = 0;

  if (timePart) {
    const timeSegs = timePart.split(":");
    hour = parseInt(timeSegs[0] || "0", 10);
    minute = parseInt(timeSegs[1] || "0", 10);
    second = parseInt(timeSegs[2] || "0", 10);
  }

  if (datePart) {
    const dSegs = datePart.split("-");
    if (dSegs.length === 3) {
      const year = parseInt(dSegs[0], 10);
      const month = parseInt(dSegs[1], 10) - 1;
      const day = parseInt(dSegs[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day, hour, minute, second).getTime();
      }
    }
    const fallbackParsed = new Date(t.date).getTime();
    if (!isNaN(fallbackParsed)) return fallbackParsed;
  }

  if (t.createdAt) {
    const createdParsed = new Date(t.createdAt).getTime();
    if (!isNaN(createdParsed)) return createdParsed;
  }

  return 0;
}
