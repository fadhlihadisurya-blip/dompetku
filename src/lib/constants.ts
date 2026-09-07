import { Transaction, Budget, FinancialGoal, RecurringTransaction } from "../types";

export const CATEGORIES = {
  expense: [
    "Makanan",
    "Transportasi",
    "Belanja",
    "Tagihan",
    "Hiburan",
    "Kesehatan",
    "Pendidikan",
    "Rumah",
    "Langganan",
    "Lainnya",
  ],
  income: ["Gaji", "Freelance", "Bonus", "Investasi", "Bisnis", "Lainnya"],
};

export const PAYMENT_METHODS = [
  "Tunai",
  "Transfer Bank",
  "Kartu Kredit",
  "E-Wallet",
  "Debit",
];

export const DUMMY_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    type: "income",
    amount: 8500000,
    category: "Gaji",
    description: "Gaji Utama Agustus",
    date: "2026-08-25T08:30:00",
    time: "08:30:00",
    paymentMethod: "Transfer Bank",
  },
  {
    id: "2",
    type: "expense",
    amount: 45000,
    category: "Makanan",
    description: "Makan Siang Nasi Padang",
    date: "2026-08-26T12:15:30",
    time: "12:15:30",
    paymentMethod: "Tunai",
  },
  {
    id: "3",
    type: "expense",
    amount: 25000,
    category: "Transportasi",
    description: "Ojek Online",
    date: "2026-08-26T14:45:50",
    time: "14:45:50",
    paymentMethod: "E-Wallet",
  },
  {
    id: "4",
    type: "expense",
    amount: 350000,
    category: "Belanja",
    description: "Belanja Bulanan",
    date: "2026-08-24T17:05:12",
    time: "17:05:12",
    paymentMethod: "Debit",
  },
  {
    id: "5",
    type: "expense",
    amount: 300000,
    category: "Tagihan",
    description: "Internet & TV Kabel",
    date: "2026-08-20T10:00:00",
    time: "10:00:00",
    paymentMethod: "Transfer Bank",
  },
  {
    id: "6",
    type: "income",
    amount: 2000000,
    category: "Freelance",
    description: "Projek Landing Page",
    date: "2026-08-15T19:22:45",
    time: "19:22:45",
    paymentMethod: "Transfer Bank",
  },
];

export const DUMMY_BUDGETS: Budget[] = [
  { id: "b1", category: "Makanan", amount: 2000000, spent: 1800000, period: "2026-08" },
  { id: "b2", category: "Transportasi", amount: 1000000, spent: 450000, period: "2026-08" },
  { id: "b3", category: "Hiburan", amount: 500000, spent: 480000, period: "2026-08" },
];

export const DUMMY_GOALS: FinancialGoal[] = [
  {
    id: "g1",
    name: "Dana Darurat",
    targetAmount: 50000000,
    currentAmount: 15000000,
    deadline: "2027-12-31",
    status: "active",
  },
  {
    id: "g2",
    name: "Liburan Jepang",
    targetAmount: 20000000,
    currentAmount: 8500000,
    deadline: "2026-11-20",
    status: "active",
  },
];
