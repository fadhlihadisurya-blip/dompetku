export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  time?: string;
  createdAt?: string;
  updatedAt?: string;
  paymentMethod: string;
  notes?: string;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  spent: number;
  period: string; // e.g., "2026-08" or "recurring"
  isRecurring?: boolean;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  status: "active" | "completed" | "failed";
}

export interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  category: string;
  type: TransactionType;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  nextDate: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
  userId: string;
}

export interface UserSettings {
  name: string;
  email: string;
  currency: string;
  theme: "light" | "dark";
  notifications: boolean;
  dateFormat: string;
}

export type FinancialInsight = {
  id: string;
  type: "warning" | "success" | "info";
  message: string;
  date: string;
};
