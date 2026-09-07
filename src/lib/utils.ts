import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Transaction } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("id-ID").format(amount);
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
