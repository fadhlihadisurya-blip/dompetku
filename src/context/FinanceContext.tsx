import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  Transaction, 
  Budget, 
  FinancialGoal, 
  RecurringTransaction, 
  UserSettings, 
  FinancialInsight,
  Category
} from "../types";
import { DUMMY_TRANSACTIONS, DUMMY_BUDGETS, DUMMY_GOALS, CATEGORIES } from "../lib/constants";
import { isSameMonth, parseISO, subMonths } from "date-fns";
import { useAuth } from "./AuthContext";
import { db } from "../lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  orderBy, 
  writeBatch 
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrors";

interface FinanceContextType {
  transactions: Transaction[];
  budgets: Budget[];
  goals: FinancialGoal[];
  recurring: RecurringTransaction[];
  categories: Category[];
  settings: UserSettings;
  insights: FinancialInsight[];
  addTransaction: (t: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (t: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addBudget: (b: Omit<Budget, "id">) => Promise<void>;
  updateBudget: (b: Budget) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addGoal: (g: Omit<FinancialGoal, "id">) => Promise<void>;
  updateGoal: (g: FinancialGoal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addCategory: (c: Omit<Category, "id" | "userId">) => Promise<void>;
  updateCategory: (c: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  setTheme: (theme: "light" | "dark") => void;
  resetData: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rawBudgets, setRawBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    name: "User",
    email: "user@example.com",
    currency: "IDR",
    theme: "light",
    notifications: true,
    dateFormat: "DD/MM/YYYY"
  });
  const [insights, setInsights] = useState<FinancialInsight[]>([]);

  // Dynamically calculate accurate spent for every budget (both recurring and monthly) based on transactions
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const budgets = React.useMemo(() => {
    return rawBudgets.map(b => {
      const isRecurring = b.isRecurring === true || b.period === "recurring" || !b.period;
      const targetMonth = isRecurring ? currentMonthStr : b.period;
      
      const calculatedSpent = transactions
        .filter(t => t.type === "expense" && t.category === b.category && t.date.substring(0, 7) === targetMonth)
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        ...b,
        period: isRecurring ? "recurring" : b.period,
        isRecurring,
        spent: calculatedSpent,
      };
    });
  }, [rawBudgets, transactions, currentMonthStr]);

  // Load Data from Firestore
  useEffect(() => {
    if (!user) return;

    const qTransactions = query(
      collection(db, "transactions"), 
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );
    const unsubTransactions = onSnapshot(
      qTransactions,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
        setTransactions(data);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "transactions");
      }
    );

    const qBudgets = query(collection(db, "budgets"), where("userId", "==", user.uid));
    const unsubBudgets = onSnapshot(
      qBudgets,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Budget));
        setRawBudgets(data);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "budgets");
      }
    );

    const qGoals = query(collection(db, "goals"), where("userId", "==", user.uid));
    const unsubGoals = onSnapshot(
      qGoals,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as FinancialGoal));
        setGoals(data);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "goals");
      }
    );

    const qRecurring = query(collection(db, "recurring"), where("userId", "==", user.uid));
    const unsubRecurring = onSnapshot(
      qRecurring,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as RecurringTransaction));
        setRecurring(data);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "recurring");
      }
    );

    const qCategories = query(collection(db, "categories"), where("userId", "==", user.uid));
    const unsubCategories = onSnapshot(
      qCategories,
      (snapshot) => {
        if (snapshot.empty) {
          // Seed default categories if none exist
          seedDefaultCategories(user.uid);
        } else {
          const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category));
          setCategories(data);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "categories");
      }
    );

    const unsubSettings = onSnapshot(
      doc(db, "settings", user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setSettings(snapshot.data() as UserSettings);
        } else {
          // Create default settings if not exist
          const defaultSettings = {
            name: user.displayName || "User",
            email: user.email || "",
            currency: "IDR",
            theme: "light" as const,
            notifications: true,
            dateFormat: "DD/MM/YYYY",
            userId: user.uid
          };
          setDoc(doc(db, "settings", user.uid), defaultSettings).catch((err) => {
            handleFirestoreError(err, OperationType.WRITE, `settings/${user.uid}`);
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `settings/${user.uid}`);
      }
    );

    return () => {
      unsubTransactions();
      unsubBudgets();
      unsubGoals();
      unsubRecurring();
      unsubCategories();
      unsubSettings();
    };
  }, [user]);

  const seedDefaultCategories = async (uid: string) => {
    try {
      const batch = writeBatch(db);
      CATEGORIES.expense.forEach(name => {
        const ref = doc(collection(db, "categories"));
        batch.set(ref, { name, type: "expense", userId: uid });
      });
      CATEGORIES.income.forEach(name => {
        const ref = doc(collection(db, "categories"));
        batch.set(ref, { name, type: "income", userId: uid });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "categories");
    }
  };

  useEffect(() => {
    generateInsights();
  }, [transactions, budgets]);

  const generateInsights = () => {
    const newInsights: FinancialInsight[] = [];
    const now = new Date();
    const currentMonthTransactions = transactions.filter(t => isSameMonth(parseISO(t.date), now));
    const lastMonthTransactions = transactions.filter(t => isSameMonth(parseISO(t.date), subMonths(now, 1)));

    const currentExpense = currentMonthTransactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
    const lastExpense = lastMonthTransactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);

    if (lastExpense > 0) {
      const diff = ((currentExpense - lastExpense) / lastExpense) * 100;
      if (diff > 0) {
        newInsights.push({
          id: "exp-up",
          type: "warning",
          message: `Pengeluaran bulan ini naik ${diff.toFixed(1)}% dibanding bulan lalu.`,
          date: now.toISOString()
        });
      } else if (diff < 0) {
        newInsights.push({
          id: "exp-down",
          type: "success",
          message: `Pengeluaran turun ${Math.abs(diff).toFixed(1)}% dibanding bulan lalu. Bagus!`,
          date: now.toISOString()
        });
      }
    }

    budgets.forEach(b => {
      const percent = (b.spent / b.amount) * 100;
      if (percent >= 90) {
        newInsights.push({
          id: `budget-${b.id}`,
          type: "warning",
          message: `Kategori ${b.category} sudah menggunakan ${percent.toFixed(0)}% dari budget.`,
          date: now.toISOString()
        });
      }
    });

    setInsights(newInsights);
  };

  const addTransaction = async (t: Omit<Transaction, "id">) => {
    if (!user) return;
    try {
      const nowIso = new Date().toISOString();
      const payload: any = {
        ...t,
        userId: user.uid,
        createdAt: t.createdAt || nowIso,
        updatedAt: nowIso,
      };
      if (!payload.time && payload.date && payload.date.includes("T")) {
        payload.time = payload.date.split("T")[1]?.substring(0, 8);
      }
      await addDoc(collection(db, "transactions"), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "transactions");
    }
  };

  const updateTransaction = async (t: Transaction) => {
    if (!user) return;
    try {
      const { id, ...data } = t;
      const payload: any = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      if (!payload.time && payload.date && payload.date.includes("T")) {
        payload.time = payload.date.split("T")[1]?.substring(0, 8);
      }
      await updateDoc(doc(db, "transactions", id), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `transactions/${t.id}`);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "transactions", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  const addBudget = async (b: Omit<Budget, "id">) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "budgets"), { ...b, userId: user.uid });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "budgets");
    }
  };

  const updateBudget = async (b: Budget) => {
    if (!user) return;
    try {
      const { id, ...data } = b;
      await updateDoc(doc(db, "budgets", id), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `budgets/${b.id}`);
    }
  };

  const deleteBudget = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "budgets", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `budgets/${id}`);
    }
  };

  const addGoal = async (g: Omit<FinancialGoal, "id">) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "goals"), { ...g, userId: user.uid });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "goals");
    }
  };

  const updateGoal = async (g: FinancialGoal) => {
    if (!user) return;
    try {
      const { id, ...data } = g;
      await updateDoc(doc(db, "goals", id), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `goals/${g.id}`);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "goals", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `goals/${id}`);
    }
  };

  const addCategory = async (c: Omit<Category, "id" | "userId">) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "categories"), { ...c, userId: user.uid });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "categories");
    }
  };

  const updateCategory = async (c: Category) => {
    if (!user) return;
    try {
      const { id, ...data } = c;
      await updateDoc(doc(db, "categories", id), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `categories/${c.id}`);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "categories", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
    }
  };

  const setTheme = (theme: "light" | "dark") => {
    if (!user) return;
    try {
      setDoc(doc(db, "settings", user.uid), { ...settings, theme }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `settings/${user.uid}`);
    }
  };

  const resetData = async () => {
    if (!user) return;
    try {
      // Seeding with dummy data
      for (const t of DUMMY_TRANSACTIONS) {
        await addDoc(collection(db, "transactions"), { ...t, userId: user.uid });
      }
      for (const b of DUMMY_BUDGETS) {
        await addDoc(collection(db, "budgets"), { ...b, userId: user.uid });
      }
      for (const g of DUMMY_GOALS) {
        await addDoc(collection(db, "goals"), { ...g, userId: user.uid });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "resetData");
    }
  };

  return (
    <FinanceContext.Provider value={{
      transactions, budgets, goals, recurring, categories, settings, insights,
      addTransaction, updateTransaction, deleteTransaction,
      addBudget, updateBudget, deleteBudget,
      addGoal, updateGoal, deleteGoal,
      addCategory, updateCategory, deleteCategory,
      setTheme, resetData
    }}>
      <div className={settings.theme}>
        <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-300">
          {children}
        </div>
      </div>
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance must be used within FinanceProvider");
  return context;
};
