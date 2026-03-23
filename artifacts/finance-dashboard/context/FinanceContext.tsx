import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type CardRewards = {
  type: "cashback" | "points" | "both";
  cashbackRate?: number;
  cashbackTotal?: number;
  pointsRate?: number;
  pointsTotal?: number;
  description: string;
};

export type Card = {
  id: string;
  name: string;
  lastFour: string;
  balance: number;
  color: [string, string];
  type: "visa" | "mastercard" | "amex";
  limit: number;
  rewards: CardRewards;
};

export type ScheduledPayment = {
  id: string;
  cardIds: string[];
  date: string;
  amounts: Record<string, number>;
  note: string;
  status: "pending" | "completed";
};

export type Transaction = {
  id: string;
  cardId: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  type: "debit" | "credit";
  icon: string;
};

export type BankAccount = {
  id: string;
  bankName: string;
  accountType: "checking" | "savings";
  lastFour: string;
  nickname?: string;
};

export type PendingPayment = {
  cardIds: string[];
  amounts: Record<string, number>;
  date: string;
  note: string;
};

type FinanceContextType = {
  cards: Card[];
  transactions: Transaction[];
  scheduledPayments: ScheduledPayment[];
  bankAccounts: BankAccount[];
  pendingPayment: PendingPayment | null;
  totalBalance: number;
  addScheduledPayment: (payment: Omit<ScheduledPayment, "id" | "status">) => void;
  addBankAccount: (bank: Omit<BankAccount, "id">) => void;
  setPendingPayment: (p: PendingPayment | null) => void;
};

const FinanceContext = createContext<FinanceContextType | null>(null);

const INITIAL_CARDS: Card[] = [
  {
    id: "card-1",
    name: "Platinum Rewards",
    lastFour: "4821",
    balance: 8420.50,
    color: ["#6C3DB8", "#9B5CF5"],
    type: "visa",
    limit: 15000,
    rewards: {
      type: "both",
      cashbackRate: 1.5,
      cashbackTotal: 218.40,
      pointsRate: 3,
      pointsTotal: 42850,
      description: "3x points on dining & travel, 1.5% cash back on everything else",
    },
  },
  {
    id: "card-2",
    name: "Travel Elite",
    lastFour: "7293",
    balance: 3150.75,
    color: ["#1E5FAD", "#3E8EDD"],
    type: "mastercard",
    limit: 10000,
    rewards: {
      type: "points",
      pointsRate: 5,
      pointsTotal: 87320,
      description: "5x points on flights & hotels, 2x on restaurants",
    },
  },
  {
    id: "card-3",
    name: "Cash Back Gold",
    lastFour: "5561",
    balance: 1927.25,
    color: ["#2A7A5B", "#3EC48A"],
    type: "amex",
    limit: 8000,
    rewards: {
      type: "cashback",
      cashbackRate: 2,
      cashbackTotal: 94.60,
      description: "2% unlimited cash back on all purchases",
    },
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: "t1", cardId: "card-1", title: "Netflix", category: "Entertainment", amount: -15.99, date: "2026-03-23", type: "debit", icon: "film" },
  { id: "t2", cardId: "card-1", title: "Salary Deposit", category: "Income", amount: 4500.00, date: "2026-03-22", type: "credit", icon: "trending-up" },
  { id: "t3", cardId: "card-1", title: "Whole Foods", category: "Groceries", amount: -87.43, date: "2026-03-21", type: "debit", icon: "shopping-bag" },
  { id: "t4", cardId: "card-1", title: "Starbucks", category: "Food & Drink", amount: -6.50, date: "2026-03-20", type: "debit", icon: "coffee" },
  { id: "t5", cardId: "card-2", title: "Delta Airlines", category: "Travel", amount: -342.00, date: "2026-03-23", type: "debit", icon: "navigation" },
  { id: "t6", cardId: "card-2", title: "Hotel Marriott", category: "Travel", amount: -215.00, date: "2026-03-19", type: "debit", icon: "home" },
  { id: "t7", cardId: "card-2", title: "Travel Refund", category: "Income", amount: 180.00, date: "2026-03-18", type: "credit", icon: "refresh-cw" },
  { id: "t8", cardId: "card-2", title: "Uber", category: "Transport", amount: -22.50, date: "2026-03-17", type: "debit", icon: "map-pin" },
  { id: "t9", cardId: "card-3", title: "Amazon", category: "Shopping", amount: -134.99, date: "2026-03-22", type: "debit", icon: "package" },
  { id: "t10", cardId: "card-3", title: "Cash Back Reward", category: "Income", amount: 45.20, date: "2026-03-20", type: "credit", icon: "gift" },
  { id: "t11", cardId: "card-3", title: "Apple Store", category: "Electronics", amount: -29.99, date: "2026-03-16", type: "debit", icon: "smartphone" },
  { id: "t12", cardId: "card-3", title: "Spotify", category: "Entertainment", amount: -9.99, date: "2026-03-15", type: "debit", icon: "music" },
];

const INITIAL_SCHEDULED: ScheduledPayment[] = [
  {
    id: "sp-1",
    cardIds: ["card-1", "card-2"],
    date: "2026-04-01",
    amounts: { "card-1": 500, "card-2": 250 },
    note: "Monthly auto-pay",
    status: "pending",
  },
];

const INITIAL_BANKS: BankAccount[] = [
  {
    id: "bank-1",
    bankName: "Chase Bank",
    accountType: "checking",
    lastFour: "8842",
    nickname: "Primary Checking",
  },
  {
    id: "bank-2",
    bankName: "Bank of America",
    accountType: "savings",
    lastFour: "3317",
    nickname: "Savings Account",
  },
];

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [cards] = useState<Card[]>(INITIAL_CARDS);
  const [transactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>(INITIAL_SCHEDULED);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(INITIAL_BANKS);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);

  const totalBalance = cards.reduce((sum, c) => sum + c.balance, 0);

  const addScheduledPayment = useCallback(
    (payment: Omit<ScheduledPayment, "id" | "status">) => {
      const newPayment: ScheduledPayment = {
        ...payment,
        id: `sp-${Date.now()}`,
        status: "pending",
      };
      setScheduledPayments((prev) => [...prev, newPayment]);
    },
    []
  );

  const addBankAccount = useCallback(
    (bank: Omit<BankAccount, "id">) => {
      const newBank: BankAccount = { ...bank, id: `bank-${Date.now()}` };
      setBankAccounts((prev) => [...prev, newBank]);
    },
    []
  );

  return (
    <FinanceContext.Provider
      value={{
        cards,
        transactions,
        scheduledPayments,
        bankAccounts,
        pendingPayment,
        totalBalance,
        addScheduledPayment,
        addBankAccount,
        setPendingPayment,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}
