import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  Transaction, 
  Budget, 
  FinancialGoal, 
  PurchaseItem,
  UserSettings, 
  FinancialInsight,
  Category,
  FamilyRole,
  FamilyGroup,
  UserFamilyLink,
  FamilyEmailInvite,
  FamilyMemberReport
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
  getDoc,
  getDocs,
  setDoc, 
  orderBy, 
  writeBatch,
  arrayUnion
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrors";
import { ImportedBackupData } from "../lib/excelBackup";
import { setAppFormattingPreferences } from "../lib/utils";

interface FinanceContextType {
  transactions: Transaction[];
  budgets: Budget[];
  goals: FinancialGoal[];
  purchases: PurchaseItem[];
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
  addPurchase: (p: Omit<PurchaseItem, "id" | "createdAt" | "isPurchased" | "purchasedAt"> & { isPurchased?: boolean }) => Promise<void>;
  updatePurchase: (p: PurchaseItem) => Promise<void>;
  togglePurchaseStatus: (p: PurchaseItem) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  addCategory: (c: Omit<Category, "id" | "userId">) => Promise<void>;
  updateCategory: (c: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  setTheme: (theme: "light" | "dark") => Promise<void>;
  updateProfileSettings: (updates: Partial<Pick<UserSettings, "name" | "email">>) => Promise<void>;
  updateAppPreferences: (updates: Partial<Pick<UserSettings, "theme" | "currency" | "dateFormat">>) => Promise<void>;
  importAllData: (data: ImportedBackupData, mode: "merge" | "replace") => Promise<number>;
  resetData: () => void;
  familyLink: UserFamilyLink | null;
  family: FamilyGroup | null;
  pendingFamilyInvites: FamilyEmailInvite[];
  sentFamilyInvites: FamilyEmailInvite[];
  createFamily: (familyName: string, role: FamilyRole) => Promise<void>;
  joinFamilyByCode: (inviteCode: string, role: FamilyRole) => Promise<void>;
  sendFamilyEmailInvite: (targetEmail: string, suggestedRole: FamilyRole) => Promise<void>;
  acceptFamilyEmailInvite: (invite: FamilyEmailInvite, chosenRole?: FamilyRole) => Promise<void>;
  declineFamilyEmailInvite: (inviteId: string) => Promise<void>;
  cancelSentFamilyInvite: (inviteId: string) => Promise<void>;
  updateFamilyMemberRole: (memberUid: string, newRole: FamilyRole) => Promise<void>;
  removeFamilyMember: (memberUid: string) => Promise<void>;
  leaveFamily: () => Promise<void>;
  subscribeMemberReport: (memberUid: string, onData: (report: FamilyMemberReport | null) => void) => () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rawBudgets, setRawBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [personalPurchases, setPersonalPurchases] = useState<PurchaseItem[]>([]);
  const [familyPurchases, setFamilyPurchases] = useState<PurchaseItem[]>([]);
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
  const [familyLink, setFamilyLink] = useState<UserFamilyLink | null>(null);
  const [family, setFamily] = useState<FamilyGroup | null>(null);
  const [pendingFamilyInvites, setPendingFamilyInvites] = useState<FamilyEmailInvite[]>([]);
  const [sentFamilyInvites, setSentFamilyInvites] = useState<FamilyEmailInvite[]>([]);
  const lastReportSyncRef = React.useRef<string>("");

  // Keep global formatting utilities synchronized with current user settings
  setAppFormattingPreferences({
    currency: settings.currency,
    dateFormat: settings.dateFormat,
  });

  // Sync Tailwind class-based dark mode on <html> so portals/modals/body respect theme
  useEffect(() => {
    const isDark = settings.theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
  }, [settings.theme]);

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

    const qPurchases = query(collection(db, "purchases"), where("userId", "==", user.uid));
    const unsubPurchases = onSnapshot(
      qPurchases,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PurchaseItem));
        data.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setPersonalPurchases(data);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "purchases");
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

    const unsubFamilyLink = onSnapshot(
      doc(db, "userFamilyLinks", user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setFamilyLink(snapshot.data() as UserFamilyLink);
        } else {
          setFamilyLink(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `userFamilyLinks/${user.uid}`);
      }
    );

    // Authoritative real-time family discovery by membership UID (self-heals missing userFamilyLinks)
    const qFamilies = query(
      collection(db, "families"),
      where("memberUids", "array-contains", user.uid)
    );
    const unsubFamiliesQuery = onSnapshot(
      qFamilies,
      (snapshot) => {
        if (!snapshot.empty) {
          const matchedDoc = snapshot.docs[0];
          const famData = { ...matchedDoc.data(), id: matchedDoc.id } as FamilyGroup;
          setFamily(famData);
          const myMember = famData.members?.find((m) => m.userId === user.uid);
          const myRole = myMember?.role || "Wife";
          setFamilyLink((prev) => {
            if (!prev || prev.familyId !== famData.id || prev.role !== myRole) {
              const repairedLink: UserFamilyLink = {
                userId: user.uid,
                familyId: famData.id,
                role: myRole,
                updatedAt: new Date().toISOString(),
              };
              setDoc(doc(db, "userFamilyLinks", user.uid), repairedLink).catch(() => {});
              return repairedLink;
            }
            return prev;
          });
        } else {
          setFamily(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "families");
      }
    );

    const userEmailLower = (user.email || "").trim().toLowerCase();
    let unsubPendingInvites = () => {};
    if (userEmailLower) {
      const qPending = query(
        collection(db, "familyEmailInvites"),
        where("targetEmail", "==", userEmailLower)
      );
      unsubPendingInvites = onSnapshot(
        qPending,
        (snapshot) => {
          const invites = snapshot.docs
            .map((d) => ({ ...d.data(), id: d.id } as FamilyEmailInvite))
            .filter((inv) => inv.status === "pending");
          setPendingFamilyInvites(invites);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, "familyEmailInvites");
        }
      );
    } else {
      setPendingFamilyInvites([]);
    }

    const qSentInvites = query(
      collection(db, "familyEmailInvites"),
      where("invitedByUid", "==", user.uid)
    );
    const unsubSentInvites = onSnapshot(
      qSentInvites,
      (snapshot) => {
        const invites = snapshot.docs
          .map((d) => ({ ...d.data(), id: d.id } as FamilyEmailInvite))
          .filter((inv) => inv.status === "pending");
        setSentFamilyInvites(invites);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "familyEmailInvites");
      }
    );

    return () => {
      unsubTransactions();
      unsubBudgets();
      unsubGoals();
      unsubPurchases();
      unsubCategories();
      unsubSettings();
      unsubFamilyLink();
      unsubFamiliesQuery();
      unsubPendingInvites();
      unsubSentInvites();
    };
  }, [user]);

  // Keep stale userFamilyLinks cleaned up if user is no longer in that family
  useEffect(() => {
    if (!user || !familyLink?.familyId) {
      return;
    }

    const unsubFamily = onSnapshot(
      doc(db, "families", familyLink.familyId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = { ...snapshot.data(), id: snapshot.id } as FamilyGroup;
          if (!data.memberUids?.includes(user.uid)) {
            deleteDoc(doc(db, "userFamilyLinks", user.uid)).catch(() => {});
            setFamily(null);
            setFamilyLink(null);
          } else {
            setFamily(data);
          }
        } else {
          deleteDoc(doc(db, "userFamilyLinks", user.uid)).catch(() => {});
          setFamily(null);
          setFamilyLink(null);
        }
      },
      (error: any) => {
        if (error?.code === "permission-denied") {
          deleteDoc(doc(db, "userFamilyLinks", user.uid)).catch(() => {});
          setFamilyLink(null);
          setFamily((prev) => (prev?.id === familyLink.familyId ? null : prev));
        }
      }
    );

    return () => unsubFamily();
  }, [user, familyLink?.familyId]);

  // Subscribe to shared Family Purchases when user is in a family
  useEffect(() => {
    if (!user || !family?.id || !family.memberUids.includes(user.uid)) {
      setFamilyPurchases([]);
      return;
    }

    const unsubFamilyPurchases = onSnapshot(
      collection(db, "families", family.id, "purchases"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as PurchaseItem));
        data.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setFamilyPurchases(data);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `families/${family.id}/purchases`);
      }
    );

    return () => unsubFamilyPurchases();
  }, [user, family?.id, family?.memberUids]);

  // Automatically migrate personal purchases into the shared family purchases list when in a family
  useEffect(() => {
    if (!user || !family?.id || !family.memberUids.includes(user.uid)) return;
    if (personalPurchases.length === 0) return;

    const myMember = family.members.find((m) => m.userId === user.uid);
    const myName = (settings.name || user.displayName || "Anggota").trim().slice(0, 80);
    const myRole = (myMember?.role || familyLink?.role || "").slice(0, 30);

    const migrate = async () => {
      try {
        const batch = writeBatch(db);
        personalPurchases.slice(0, 200).forEach((item) => {
          const targetRef = doc(db, "families", family.id, "purchases", item.id);
          batch.set(targetRef, {
            userId: user.uid,
            familyId: family.id,
            name: (item.name || "").trim().slice(0, 120) || "Barang",
            price: Math.max(0, Number(item.price) || 0),
            quantity: Math.min(9999, Math.max(1, Math.round(Number(item.quantity) || 1))),
            category: (item.category || "Belanja").trim().slice(0, 80),
            notes: (item.notes || "").trim().slice(0, 500),
            isPurchased: Boolean(item.isPurchased),
            createdAt: (item.createdAt || new Date().toISOString()).slice(0, 50),
            updatedAt: new Date().toISOString().slice(0, 50),
            purchasedAt: item.isPurchased ? (item.purchasedAt || new Date().toISOString()).slice(0, 50) : null,
            linkedTransactionCreated: Boolean(item.linkedTransactionCreated),
            addedByName: myName,
            addedByRole: myRole,
            purchasedByName: item.isPurchased ? myName : "",
          });
          batch.delete(doc(db, "purchases", item.id));
        });
        await batch.commit();
      } catch (err) {
        console.warn("Gagal memindahkan daftar belanja pribadi ke keluarga:", err);
      }
    };

    migrate();
  }, [user, family?.id, family?.memberUids, personalPurchases, settings.name, familyLink?.role]);

  const purchases = family?.id ? familyPurchases : personalPurchases;

  const buildCompactTransactions = (list: Transaction[]) => {
    return list.slice(0, 2000).map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount) || 0,
      category: String(t.category || ""),
      description: String(t.description || ""),
      date: String(t.date || ""),
      ...(t.time ? { time: String(t.time) } : {}),
      paymentMethod: String(t.paymentMethod || "Tunai"),
    }));
  };

  // Sync current user's transactions into family memberReports so linked family members can view reports
  useEffect(() => {
    if (!user || !family?.id || !family.memberUids?.includes(user.uid)) return;

    const memberEntry = family.members.find((m) => m.userId === user.uid);
    const activeRole = memberEntry?.role || familyLink?.role || "Wife";
    const activeName = (settings.name || user.displayName || "User").trim().slice(0, 80);
    const compactTx = buildCompactTransactions(transactions);

    const signature = JSON.stringify({
      f: family.id,
      r: activeRole,
      n: activeName,
      t: compactTx,
    });
    if (lastReportSyncRef.current === signature) return;
    lastReportSyncRef.current = signature;

    setDoc(doc(db, "families", family.id, "memberReports", user.uid), {
      userId: user.uid,
      familyId: family.id,
      name: activeName,
      role: activeRole,
      transactions: compactTx,
      updatedAt: new Date().toISOString(),
    }).catch((err) => {
      console.warn("Gagal sinkronisasi laporan keluarga:", err);
    });
  }, [user, familyLink, family, settings.name, transactions]);

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

  const addPurchase = async (p: Omit<PurchaseItem, "id" | "createdAt" | "isPurchased" | "purchasedAt"> & { isPurchased?: boolean }) => {
    if (!user) return;
    try {
      const nowIso = new Date().toISOString();
      const trimmedName = (p.name || "").trim().slice(0, 120);
      if (!trimmedName) return;
      const safePrice = Math.max(0, Number(p.price) || 0);
      const safeQty = Math.min(9999, Math.max(1, Math.round(Number(p.quantity) || 1)));
      const safeCategory = (p.category || "Belanja").trim().slice(0, 80);
      const safeNotes = (p.notes || "").trim().slice(0, 500);
      const isPurchased = Boolean(p.isPurchased);

      if (family?.id && family.memberUids.includes(user.uid)) {
        const myMember = family.members.find((m) => m.userId === user.uid);
        const myName = (settings.name || user.displayName || "Anggota").trim().slice(0, 80);
        const myRole = (myMember?.role || familyLink?.role || "").slice(0, 30);

        await addDoc(collection(db, "families", family.id, "purchases"), {
          userId: user.uid,
          familyId: family.id,
          name: trimmedName,
          price: safePrice,
          quantity: safeQty,
          category: safeCategory,
          notes: safeNotes,
          isPurchased,
          createdAt: nowIso,
          updatedAt: nowIso,
          purchasedAt: isPurchased ? nowIso : null,
          linkedTransactionCreated: false,
          addedByName: myName,
          addedByRole: myRole,
          purchasedByName: isPurchased ? myName : "",
        });
      } else {
        const payload: Record<string, any> = {
          userId: user.uid,
          name: trimmedName,
          price: safePrice,
          quantity: safeQty,
          category: safeCategory,
          notes: safeNotes,
          isPurchased,
          createdAt: nowIso,
          updatedAt: nowIso,
          purchasedAt: isPurchased ? nowIso : null,
          linkedTransactionCreated: false,
        };
        await addDoc(collection(db, "purchases"), payload);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, family?.id ? `families/${family.id}/purchases` : "purchases");
    }
  };

  const updatePurchase = async (p: PurchaseItem) => {
    if (!user) return;
    try {
      const nowIso = new Date().toISOString();
      const trimmedName = (p.name || "").trim().slice(0, 120);
      if (!trimmedName) return;
      const safePrice = Math.max(0, Number(p.price) || 0);
      const safeQty = Math.min(9999, Math.max(1, Math.round(Number(p.quantity) || 1)));
      const safeCategory = (p.category || "Belanja").trim().slice(0, 80);
      const safeNotes = (p.notes || "").trim().slice(0, 500);

      if (family?.id && family.memberUids.includes(user.uid)) {
        const myName = (settings.name || user.displayName || "Anggota").trim().slice(0, 80);
        const payload: Record<string, any> = {
          userId: p.userId || user.uid,
          familyId: family.id,
          name: trimmedName,
          price: safePrice,
          quantity: safeQty,
          category: safeCategory,
          notes: safeNotes,
          isPurchased: Boolean(p.isPurchased),
          createdAt: p.createdAt || nowIso,
          updatedAt: nowIso,
          purchasedAt: p.isPurchased ? (p.purchasedAt || nowIso) : null,
          linkedTransactionCreated: Boolean(p.linkedTransactionCreated),
          addedByName: (p.addedByName || myName).slice(0, 80),
          addedByRole: (p.addedByRole || "").slice(0, 30),
          purchasedByName: p.isPurchased ? (p.purchasedByName || myName).slice(0, 80) : "",
        };
        await updateDoc(doc(db, "families", family.id, "purchases", p.id), payload);
      } else {
        const payload: Record<string, any> = {
          userId: p.userId || user.uid,
          name: trimmedName,
          price: safePrice,
          quantity: safeQty,
          category: safeCategory,
          notes: safeNotes,
          isPurchased: Boolean(p.isPurchased),
          createdAt: p.createdAt || nowIso,
          updatedAt: nowIso,
          purchasedAt: p.isPurchased ? (p.purchasedAt || nowIso) : null,
          linkedTransactionCreated: Boolean(p.linkedTransactionCreated),
        };
        await updateDoc(doc(db, "purchases", p.id), payload);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, family?.id ? `families/${family.id}/purchases/${p.id}` : `purchases/${p.id}`);
    }
  };

  const togglePurchaseStatus = async (p: PurchaseItem) => {
    if (!user) return;
    const nextStatus = !p.isPurchased;
    const myName = (settings.name || user.displayName || "Anggota").trim().slice(0, 80);
    await updatePurchase({
      ...p,
      isPurchased: nextStatus,
      purchasedAt: nextStatus ? new Date().toISOString() : null,
      purchasedByName: nextStatus ? myName : "",
    });
  };

  const deletePurchase = async (id: string) => {
    if (!user) return;
    try {
      if (family?.id && family.memberUids.includes(user.uid)) {
        await deleteDoc(doc(db, "families", family.id, "purchases", id));
      } else {
        await deleteDoc(doc(db, "purchases", id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, family?.id ? `families/${family.id}/purchases/${id}` : `purchases/${id}`);
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

  const updateAppPreferences = async (
    updates: Partial<Pick<UserSettings, "theme" | "currency" | "dateFormat">>
  ) => {
    const nextSettings: UserSettings = {
      ...settings,
      ...updates,
    };
    setSettings(nextSettings);
    setAppFormattingPreferences({
      currency: nextSettings.currency,
      dateFormat: nextSettings.dateFormat,
    });
    document.documentElement.classList.toggle("dark", nextSettings.theme === "dark");

    if (!user) return;
    try {
      await setDoc(
        doc(db, "settings", user.uid),
        { ...nextSettings, userId: user.uid },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `settings/${user.uid}`);
      throw err;
    }
  };

  const setTheme = async (theme: "light" | "dark") => {
    await updateAppPreferences({ theme });
  };

  const updateProfileSettings = async (updates: Partial<Pick<UserSettings, "name" | "email" | "avatarUrl">>) => {
    if (!user) return;
    try {
      const nextSettings = { ...settings, ...updates };
      setSettings(nextSettings);
      await setDoc(
        doc(db, "settings", user.uid),
        { ...nextSettings, userId: user.uid },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `settings/${user.uid}`);
      throw err;
    }
  };

  const importAllData = async (data: ImportedBackupData, mode: "merge" | "replace"): Promise<number> => {
    if (!user) return 0;

    type BatchOp =
      | { kind: "delete"; collectionName: string; id: string }
      | { kind: "set"; collectionName: string; payload: Record<string, any> };

    const ops: BatchOp[] = [];
    const nowIso = new Date().toISOString();

    const inFamily = Boolean(family?.id && family.memberUids.includes(user.uid));
    const myRole = family?.members.find((m) => m.userId === user.uid)?.role || "";
    const myName = (settings.name || user.displayName || "Anggota").trim().slice(0, 80);

    if (mode === "replace") {
      transactions.forEach((t) => ops.push({ kind: "delete", collectionName: "transactions", id: t.id }));
      rawBudgets.forEach((b) => ops.push({ kind: "delete", collectionName: "budgets", id: b.id }));
      goals.forEach((g) => ops.push({ kind: "delete", collectionName: "goals", id: g.id }));
      personalPurchases.forEach((p) => ops.push({ kind: "delete", collectionName: "purchases", id: p.id }));
      if (inFamily && family?.id) {
        familyPurchases.forEach((p) =>
          ops.push({ kind: "delete", collectionName: `families/${family.id}/purchases`, id: p.id })
        );
      }
      if (data.categories.length > 0) {
        categories.forEach((c) => ops.push({ kind: "delete", collectionName: "categories", id: c.id }));
      }
    }

    let importedCount = 0;

    data.transactions.forEach((t) => {
      const payload: Record<string, any> = {
        ...t,
        userId: user.uid,
        createdAt: t.createdAt || nowIso,
        updatedAt: nowIso,
      };
      if (!payload.time && payload.date && payload.date.includes("T")) {
        payload.time = payload.date.split("T")[1]?.substring(0, 8);
      }
      ops.push({ kind: "set", collectionName: "transactions", payload });
      importedCount += 1;
    });

    data.budgets.forEach((b) => {
      ops.push({
        kind: "set",
        collectionName: "budgets",
        payload: {
          ...b,
          userId: user.uid,
        },
      });
      importedCount += 1;
    });

    data.goals.forEach((g) => {
      ops.push({
        kind: "set",
        collectionName: "goals",
        payload: {
          ...g,
          userId: user.uid,
        },
      });
      importedCount += 1;
    });

    data.purchases.forEach((p) => {
      if (inFamily && family?.id) {
        ops.push({
          kind: "set",
          collectionName: `families/${family.id}/purchases`,
          payload: {
            familyId: family.id,
            userId: user.uid,
            name: p.name.slice(0, 120),
            price: Math.max(0, Number(p.price) || 0),
            quantity: Math.min(9999, Math.max(1, Math.round(Number(p.quantity) || 1))),
            category: (p.category || "Belanja").slice(0, 80),
            notes: (p.notes || "").slice(0, 500),
            isPurchased: Boolean(p.isPurchased),
            createdAt: (p.createdAt || nowIso).slice(0, 50),
            updatedAt: nowIso.slice(0, 50),
            purchasedAt: p.isPurchased ? (p.purchasedAt || nowIso).slice(0, 50) : null,
            linkedTransactionCreated: false,
            addedByName: myName,
            addedByRole: myRole.slice(0, 30),
            purchasedByName: p.isPurchased ? myName : "",
          },
        });
      } else {
        ops.push({
          kind: "set",
          collectionName: "purchases",
          payload: {
            userId: user.uid,
            name: p.name.slice(0, 120),
            price: Math.max(0, Number(p.price) || 0),
            quantity: Math.min(9999, Math.max(1, Math.round(Number(p.quantity) || 1))),
            category: (p.category || "Belanja").slice(0, 80),
            notes: (p.notes || "").slice(0, 500),
            isPurchased: Boolean(p.isPurchased),
            createdAt: (p.createdAt || nowIso).slice(0, 50),
            updatedAt: nowIso.slice(0, 50),
            purchasedAt: p.isPurchased ? (p.purchasedAt || nowIso).slice(0, 50) : null,
            linkedTransactionCreated: false,
          },
        });
      }
      importedCount += 1;
    });

    const existingCategoryKeys = new Set(
      mode === "replace" && data.categories.length > 0
        ? []
        : categories.map((c) => `${c.type}:${c.name.trim().toLowerCase()}`)
    );

    data.categories.forEach((c) => {
      const key = `${c.type}:${c.name.trim().toLowerCase()}`;
      if (existingCategoryKeys.has(key)) return;
      existingCategoryKeys.add(key);
      ops.push({
        kind: "set",
        collectionName: "categories",
        payload: {
          name: c.name,
          type: c.type,
          userId: user.uid,
        },
      });
      importedCount += 1;
    });

    try {
      const CHUNK_SIZE = 400;
      for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
        const chunk = ops.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((op) => {
          if (op.kind === "delete") {
            batch.delete(doc(db, op.collectionName, op.id));
          } else {
            batch.set(doc(collection(db, op.collectionName)), op.payload);
          }
        });
        await batch.commit();
      }
      return importedCount;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "importAllData");
      throw err;
    }
  };

  const generateInviteCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let suffix = "";
    for (let i = 0; i < 6; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `FAM${suffix}`;
  };

  const ensureNotActivelyInAnotherFamily = async () => {
    if (!user) return;
    try {
      const activeFamiliesSnap = await getDocs(
        query(collection(db, "families"), where("memberUids", "array-contains", user.uid))
      );
      if (!activeFamiliesSnap.empty) {
        throw new Error("Akun Anda sudah terhubung dengan keluarga lain. Lepas tautan terlebih dahulu jika ingin berpindah.");
      }
    } catch (err: any) {
      if (err?.message?.includes("sudah terhubung dengan keluarga lain")) {
        throw err;
      }
    }
    if (familyLink?.familyId) {
      await deleteDoc(doc(db, "userFamilyLinks", user.uid)).catch(() => {});
      setFamilyLink(null);
      setFamily(null);
    }
  };

  const createFamily = async (familyName: string, role: FamilyRole) => {
    if (!user) throw new Error("Anda harus login terlebih dahulu.");
    await ensureNotActivelyInAnotherFamily();

    const trimmedName = familyName.trim().slice(0, 80);
    if (!trimmedName) throw new Error("Nama keluarga tidak boleh kosong.");

    const nowIso = new Date().toISOString();
    const inviteCode = generateInviteCode();
    const memberName = (settings.name || user.displayName || "User").trim().slice(0, 80);
    const memberEmail = (user.email || settings.email || "").trim().slice(0, 120);
    const familyRef = doc(collection(db, "families"));

    try {
      const batch = writeBatch(db);
      batch.set(familyRef, {
        name: trimmedName,
        ownerId: user.uid,
        inviteCode,
        memberUids: [user.uid],
        members: [
          {
            userId: user.uid,
            name: memberName,
            email: memberEmail,
            role,
            joinedAt: nowIso,
          },
        ],
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      batch.set(doc(db, "familyInvites", inviteCode), {
        familyId: familyRef.id,
        familyName: trimmedName,
        ownerId: user.uid,
        inviteCode,
        createdAt: nowIso,
      });
      batch.set(doc(db, "userFamilyLinks", user.uid), {
        userId: user.uid,
        familyId: familyRef.id,
        role,
        updatedAt: nowIso,
      });
      batch.set(doc(db, "families", familyRef.id, "memberReports", user.uid), {
        userId: user.uid,
        familyId: familyRef.id,
        name: memberName,
        role,
        transactions: buildCompactTransactions(transactions),
        updatedAt: nowIso,
      });
      await batch.commit();
      lastReportSyncRef.current = "";
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "families");
      throw err;
    }
  };

  const joinFamilyByIdInternal = async (familyId: string, role: FamilyRole, inviteIdToAccept?: string) => {
    if (!user) throw new Error("Anda harus login terlebih dahulu.");
    await ensureNotActivelyInAnotherFamily();

    const nowIso = new Date().toISOString();
    const memberName = (settings.name || user.displayName || "User").trim().slice(0, 80);
    const memberEmail = (user.email || settings.email || "").trim().slice(0, 120);

    const batch = writeBatch(db);
    batch.update(doc(db, "families", familyId), {
      memberUids: arrayUnion(user.uid),
      members: arrayUnion({
        userId: user.uid,
        name: memberName,
        email: memberEmail,
        role,
        joinedAt: nowIso,
      }),
      updatedAt: nowIso,
    });
    batch.set(doc(db, "userFamilyLinks", user.uid), {
      userId: user.uid,
      familyId,
      role,
      updatedAt: nowIso,
    });
    batch.set(doc(db, "families", familyId, "memberReports", user.uid), {
      userId: user.uid,
      familyId,
      name: memberName,
      role,
      transactions: buildCompactTransactions(transactions),
      updatedAt: nowIso,
    });
    if (inviteIdToAccept) {
      batch.update(doc(db, "familyEmailInvites", inviteIdToAccept), {
        status: "accepted",
      });
    }
    await batch.commit();
  };

  const joinFamilyByCode = async (rawCode: string, role: FamilyRole) => {
    if (!user) throw new Error("Anda harus login terlebih dahulu.");
    const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!code || code.length < 6) {
      throw new Error("Kode undangan tidak valid.");
    }

    try {
      const inviteSnap = await getDoc(doc(db, "familyInvites", code));
      if (!inviteSnap.exists()) {
        throw new Error("Kode undangan keluarga tidak ditemukan.");
      }
      const { familyId } = inviteSnap.data() as { familyId: string };
      await joinFamilyByIdInternal(familyId, role);
    } catch (err: any) {
      if (err?.message?.includes("Kode undangan") || err?.message?.includes("sudah terhubung")) {
        throw err;
      }
      handleFirestoreError(err, OperationType.WRITE, `familyInvites/${code}`);
      throw err;
    }
  };

  const sendFamilyEmailInvite = async (targetEmail: string, suggestedRole: FamilyRole) => {
    if (!user || !family) throw new Error("Anda belum tergabung dalam keluarga.");
    const cleanedEmail = targetEmail.trim().toLowerCase();
    if (!cleanedEmail || !cleanedEmail.includes("@")) {
      throw new Error("Masukkan alamat email yang valid.");
    }
    if (cleanedEmail === (user.email || "").trim().toLowerCase()) {
      throw new Error("Anda tidak dapat mengundang email akun Anda sendiri.");
    }

    const alreadyMember = family.members.some(
      (m) => (m.email || "").trim().toLowerCase() === cleanedEmail
    );
    if (alreadyMember) {
      throw new Error("Akun dengan email tersebut sudah menjadi anggota keluarga.");
    }

    try {
      await addDoc(collection(db, "familyEmailInvites"), {
        familyId: family.id,
        familyName: family.name,
        inviteCode: family.inviteCode,
        invitedByUid: user.uid,
        invitedByName: (settings.name || user.displayName || "Anggota Keluarga").trim().slice(0, 80),
        targetEmail: cleanedEmail,
        suggestedRole,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "familyEmailInvites");
      throw err;
    }
  };

  const acceptFamilyEmailInvite = async (invite: FamilyEmailInvite, chosenRole?: FamilyRole) => {
    try {
      await joinFamilyByIdInternal(invite.familyId, chosenRole || invite.suggestedRole, invite.id);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `familyEmailInvites/${invite.id}`);
      throw err;
    }
  };

  const declineFamilyEmailInvite = async (inviteId: string) => {
    try {
      await updateDoc(doc(db, "familyEmailInvites", inviteId), { status: "declined" });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `familyEmailInvites/${inviteId}`);
      throw err;
    }
  };

  const cancelSentFamilyInvite = async (inviteId: string) => {
    try {
      await deleteDoc(doc(db, "familyEmailInvites", inviteId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `familyEmailInvites/${inviteId}`);
      throw err;
    }
  };

  const updateFamilyMemberRole = async (memberUid: string, newRole: FamilyRole) => {
    if (!user || !family) return;
    const nowIso = new Date().toISOString();
    const updatedMembers = family.members.map((m) =>
      m.userId === memberUid ? { ...m, role: newRole } : m
    );

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "families", family.id), {
        members: updatedMembers,
        updatedAt: nowIso,
      });
      if (memberUid === user.uid) {
        batch.set(
          doc(db, "userFamilyLinks", user.uid),
          {
            userId: user.uid,
            familyId: family.id,
            role: newRole,
            updatedAt: nowIso,
          },
          { merge: true }
        );
      }
      await batch.commit();

      const reportRef = doc(db, "families", family.id, "memberReports", memberUid);
      const reportSnap = await getDoc(reportRef);
      if (reportSnap.exists()) {
        await updateDoc(reportRef, { role: newRole, updatedAt: nowIso });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `families/${family.id}`);
      throw err;
    }
  };

  const removeFamilyMember = async (memberUid: string) => {
    if (!user || !family) return;
    if (family.ownerId !== user.uid) {
      throw new Error("Hanya pembuat keluarga yang dapat mengeluarkan anggota lain.");
    }
    if (memberUid === user.uid) return;

    const nowIso = new Date().toISOString();
    const remainingMembers = family.members.filter((m) => m.userId !== memberUid);
    const remainingUids = family.memberUids.filter((id) => id !== memberUid);

    try {
      const linkRef = doc(db, "userFamilyLinks", memberUid);
      const linkSnap = await getDoc(linkRef).catch(() => null);

      const batch = writeBatch(db);
      batch.update(doc(db, "families", family.id), {
        members: remainingMembers,
        memberUids: remainingUids,
        updatedAt: nowIso,
      });
      batch.delete(doc(db, "families", family.id, "memberReports", memberUid));
      if (linkSnap?.exists() && linkSnap.data()?.familyId === family.id) {
        batch.delete(linkRef);
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `families/${family.id}`);
      throw err;
    }
  };

  const leaveFamily = async () => {
    if (!user || !family) return;
    const nowIso = new Date().toISOString();
    const remainingMembers = family.members.filter((m) => m.userId !== user.uid);
    const remainingUids = family.memberUids.filter((id) => id !== user.uid);

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "families", family.id, "memberReports", user.uid));
      batch.delete(doc(db, "userFamilyLinks", user.uid));

      if (remainingMembers.length === 0 || remainingUids.length === 0) {
        familyPurchases.slice(0, 200).forEach((item) => {
          batch.set(doc(db, "purchases", item.id), {
            userId: user.uid,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            category: item.category,
            notes: item.notes || "",
            isPurchased: Boolean(item.isPurchased),
            createdAt: item.createdAt || nowIso,
            updatedAt: nowIso,
            purchasedAt: item.isPurchased ? (item.purchasedAt || nowIso) : null,
            linkedTransactionCreated: Boolean(item.linkedTransactionCreated),
          });
          batch.delete(doc(db, "families", family.id, "purchases", item.id));
        });
        batch.delete(doc(db, "familyInvites", family.inviteCode));
        batch.delete(doc(db, "families", family.id));
      } else {
        const nextOwnerId =
          family.ownerId === user.uid ? remainingMembers[0].userId : family.ownerId;
        batch.update(doc(db, "families", family.id), {
          ownerId: nextOwnerId,
          members: remainingMembers,
          memberUids: remainingUids,
          updatedAt: nowIso,
        });
      }
      await batch.commit();
      lastReportSyncRef.current = "";
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `families/${family.id}`);
      throw err;
    }
  };

  const subscribeMemberReport = (
    memberUid: string,
    onData: (report: FamilyMemberReport | null) => void
  ) => {
    if (!family?.id || !memberUid) {
      onData(null);
      return () => {};
    }
    return onSnapshot(
      doc(db, "families", family.id, "memberReports", memberUid),
      (snap) => {
        if (snap.exists()) {
          onData(snap.data() as FamilyMemberReport);
        } else {
          onData(null);
        }
      },
      () => {
        onData(null);
      }
    );
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
      transactions, budgets, goals, purchases, categories, settings, insights,
      addTransaction, updateTransaction, deleteTransaction,
      addBudget, updateBudget, deleteBudget,
      addGoal, updateGoal, deleteGoal,
      addPurchase, updatePurchase, togglePurchaseStatus, deletePurchase,
      addCategory, updateCategory, deleteCategory,
      setTheme, updateProfileSettings, updateAppPreferences, importAllData, resetData,
      familyLink, family, pendingFamilyInvites, sentFamilyInvites,
      createFamily, joinFamilyByCode, sendFamilyEmailInvite,
      acceptFamilyEmailInvite, declineFamilyEmailInvite, cancelSentFamilyInvite,
      updateFamilyMemberRole, removeFamilyMember, leaveFamily, subscribeMemberReport
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
