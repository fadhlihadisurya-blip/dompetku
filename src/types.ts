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

export interface PurchaseItem {
  id: string;
  userId?: string;
  familyId?: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  notes?: string;
  isPurchased: boolean;
  createdAt: string;
  updatedAt?: string;
  purchasedAt?: string | null;
  linkedTransactionCreated?: boolean;
  addedByName?: string;
  addedByRole?: string;
  purchasedByName?: string;
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
  avatarUrl?: string;
}

export type FinancialInsight = {
  id: string;
  type: "warning" | "success" | "info";
  message: string;
  date: string;
};

export type FamilyRole = "Husband" | "Wife" | "Son" | "Daughter";

export const FAMILY_ROLES: FamilyRole[] = ["Husband", "Wife", "Son", "Daughter"];

export interface FamilyMember {
  userId: string;
  name: string;
  email: string;
  role: FamilyRole;
  joinedAt: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  memberUids: string[];
  members: FamilyMember[];
  createdAt: string;
  updatedAt: string;
}

export interface UserFamilyLink {
  userId: string;
  familyId: string;
  role: FamilyRole;
  updatedAt: string;
}

export interface FamilyEmailInvite {
  id: string;
  familyId: string;
  familyName: string;
  inviteCode: string;
  invitedByUid: string;
  invitedByName: string;
  targetEmail: string;
  suggestedRole: FamilyRole;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

export interface FamilyMemberReport {
  userId: string;
  familyId: string;
  name: string;
  role: FamilyRole;
  transactions: Array<{
    id: string;
    type: TransactionType;
    amount: number;
    category: string;
    description: string;
    date: string;
    time?: string;
    paymentMethod: string;
  }>;
  updatedAt: string;
}

