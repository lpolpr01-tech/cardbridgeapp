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

export type PlaidLinkedAccount = {
  accountId: string;
  name: string;
  officialName: string | null;
  mask: string | null;
  type: string;
  subtype: string | null;
  balanceCurrent: number | null;
  balanceAvailable: number | null;
  balanceLimit: number | null;
  institutionName: string;
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
  plaidAccounts: PlaidLinkedAccount[];
  pendingPayment: PendingPayment | null;
  totalBalance: number;
  addScheduledPayment: (payment: Omit<ScheduledPayment, "id" | "status">) => void;
  cancelScheduledPayment: (id: string) => void;
  addBankAccount: (bank: Omit<BankAccount, "id">) => void;
  addPlaidAccounts: (accounts: PlaidLinkedAccount[]) => void;
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
  // ── Mar 2026 ──────────────────────────────────────────────────────────────
  { id: "t1",  cardId: "card-1", title: "Netflix",           category: "Entertainment", amount: -15.99,  date: "2026-03-23", type: "debit",  icon: "film" },
  { id: "t2",  cardId: "card-1", title: "Salary Deposit",    category: "Income",        amount: 4500.00, date: "2026-03-22", type: "credit", icon: "trending-up" },
  { id: "t3",  cardId: "card-1", title: "Whole Foods",       category: "Groceries",     amount: -87.43,  date: "2026-03-21", type: "debit",  icon: "shopping-bag" },
  { id: "t4",  cardId: "card-1", title: "Starbucks",         category: "Food & Drink",  amount: -6.50,   date: "2026-03-20", type: "debit",  icon: "coffee" },
  { id: "t5",  cardId: "card-2", title: "Delta Airlines",    category: "Travel",        amount: -342.00, date: "2026-03-23", type: "debit",  icon: "navigation" },
  { id: "t6",  cardId: "card-2", title: "Hotel Marriott",    category: "Travel",        amount: -215.00, date: "2026-03-19", type: "debit",  icon: "home" },
  { id: "t7",  cardId: "card-2", title: "Travel Refund",     category: "Income",        amount: 180.00,  date: "2026-03-18", type: "credit", icon: "refresh-cw" },
  { id: "t8",  cardId: "card-2", title: "Uber",              category: "Transport",     amount: -22.50,  date: "2026-03-17", type: "debit",  icon: "map-pin" },
  { id: "t9",  cardId: "card-3", title: "Amazon",            category: "Shopping",      amount: -134.99, date: "2026-03-22", type: "debit",  icon: "package" },
  { id: "t10", cardId: "card-3", title: "Cash Back Reward",  category: "Income",        amount: 45.20,   date: "2026-03-20", type: "credit", icon: "gift" },
  { id: "t11", cardId: "card-3", title: "Apple Store",       category: "Electronics",   amount: -29.99,  date: "2026-03-16", type: "debit",  icon: "smartphone" },
  { id: "t12", cardId: "card-3", title: "Spotify",           category: "Entertainment", amount: -9.99,   date: "2026-03-15", type: "debit",  icon: "music" },

  // ── Feb 2026 ──────────────────────────────────────────────────────────────
  { id: "t20", cardId: "card-1", title: "Salary Deposit",    category: "Income",        amount: 4500.00, date: "2026-02-22", type: "credit", icon: "trending-up" },
  { id: "t21", cardId: "card-1", title: "Valentine Dinner",  category: "Food & Drink",  amount: -120.00, date: "2026-02-14", type: "debit",  icon: "heart" },
  { id: "t22", cardId: "card-1", title: "Trader Joe's",      category: "Groceries",     amount: -84.50,  date: "2026-02-10", type: "debit",  icon: "shopping-bag" },
  { id: "t23", cardId: "card-1", title: "Amazon",            category: "Shopping",      amount: -95.20,  date: "2026-02-05", type: "debit",  icon: "package" },
  { id: "t24", cardId: "card-1", title: "Gym Membership",    category: "Health",        amount: -50.00,  date: "2026-02-01", type: "debit",  icon: "activity" },
  { id: "t25", cardId: "card-2", title: "Hilton Hotels",     category: "Travel",        amount: -340.00, date: "2026-02-20", type: "debit",  icon: "home" },
  { id: "t26", cardId: "card-2", title: "United Airlines",   category: "Travel",        amount: -280.00, date: "2026-02-14", type: "debit",  icon: "navigation" },
  { id: "t27", cardId: "card-2", title: "Fine Dining",       category: "Food & Drink",  amount: -120.00, date: "2026-02-14", type: "debit",  icon: "coffee" },
  { id: "t28", cardId: "card-2", title: "Lyft",              category: "Transport",     amount: -55.00,  date: "2026-02-06", type: "debit",  icon: "map-pin" },
  { id: "t29", cardId: "card-2", title: "Miles Refund",      category: "Income",        amount: 95.00,   date: "2026-02-03", type: "credit", icon: "refresh-cw" },
  { id: "t30", cardId: "card-3", title: "Amazon",            category: "Shopping",      amount: -109.99, date: "2026-02-18", type: "debit",  icon: "package" },
  { id: "t31", cardId: "card-3", title: "Valentine Gifts",   category: "Shopping",      amount: -149.50, date: "2026-02-12", type: "debit",  icon: "gift" },
  { id: "t32", cardId: "card-3", title: "Cash Back Reward",  category: "Income",        amount: 38.00,   date: "2026-02-08", type: "credit", icon: "gift" },
  { id: "t33", cardId: "card-3", title: "Target",            category: "Shopping",      amount: -84.99,  date: "2026-02-03", type: "debit",  icon: "shopping-bag" },
  { id: "t34", cardId: "card-3", title: "Spotify",           category: "Entertainment", amount: -9.99,   date: "2026-02-01", type: "debit",  icon: "music" },

  // ── Jan 2026 ──────────────────────────────────────────────────────────────
  { id: "t40", cardId: "card-1", title: "Salary Deposit",    category: "Income",        amount: 4500.00, date: "2026-01-22", type: "credit", icon: "trending-up" },
  { id: "t41", cardId: "card-1", title: "New Year Dinner",   category: "Food & Drink",  amount: -180.00, date: "2026-01-01", type: "debit",  icon: "coffee" },
  { id: "t42", cardId: "card-1", title: "Groceries",         category: "Groceries",     amount: -94.80,  date: "2026-01-10", type: "debit",  icon: "shopping-bag" },
  { id: "t43", cardId: "card-1", title: "Netflix",           category: "Entertainment", amount: -15.99,  date: "2026-01-15", type: "debit",  icon: "film" },
  { id: "t44", cardId: "card-1", title: "Amazon",            category: "Shopping",      amount: -74.99,  date: "2026-01-18", type: "debit",  icon: "package" },
  { id: "t45", cardId: "card-2", title: "Cruise Deposit",    category: "Travel",        amount: -1200.00,date: "2026-01-15", type: "debit",  icon: "navigation" },
  { id: "t46", cardId: "card-2", title: "Holiday Inn",       category: "Travel",        amount: -150.00, date: "2026-01-08", type: "debit",  icon: "home" },
  { id: "t47", cardId: "card-2", title: "TGI Fridays",       category: "Food & Drink",  amount: -60.00,  date: "2026-01-04", type: "debit",  icon: "coffee" },
  { id: "t48", cardId: "card-2", title: "Uber",              category: "Transport",     amount: -40.00,  date: "2026-01-02", type: "debit",  icon: "map-pin" },
  { id: "t49", cardId: "card-3", title: "Amazon",            category: "Shopping",      amount: -95.00,  date: "2026-01-20", type: "debit",  icon: "package" },
  { id: "t50", cardId: "card-3", title: "Spotify",           category: "Entertainment", amount: -9.99,   date: "2026-01-01", type: "debit",  icon: "music" },
  { id: "t51", cardId: "card-3", title: "Target",            category: "Shopping",      amount: -130.00, date: "2026-01-12", type: "debit",  icon: "shopping-bag" },
  { id: "t52", cardId: "card-3", title: "Gas Station",       category: "Transport",     amount: -50.00,  date: "2026-01-07", type: "debit",  icon: "map-pin" },
  { id: "t53", cardId: "card-3", title: "New Year Gift CB",  category: "Income",        amount: 65.00,   date: "2026-01-05", type: "credit", icon: "gift" },

  // ── Dec 2025 ──────────────────────────────────────────────────────────────
  { id: "t60", cardId: "card-1", title: "Salary Deposit",    category: "Income",        amount: 4500.00, date: "2025-12-22", type: "credit", icon: "trending-up" },
  { id: "t61", cardId: "card-1", title: "Christmas Gifts",   category: "Shopping",      amount: -849.99, date: "2025-12-20", type: "debit",  icon: "gift" },
  { id: "t62", cardId: "card-1", title: "Holiday Dinner",    category: "Food & Drink",  amount: -130.00, date: "2025-12-25", type: "debit",  icon: "coffee" },
  { id: "t63", cardId: "card-1", title: "Holiday Travel",    category: "Travel",        amount: -649.00, date: "2025-12-15", type: "debit",  icon: "navigation" },
  { id: "t64", cardId: "card-1", title: "Whole Foods",       category: "Groceries",     amount: -158.40, date: "2025-12-05", type: "debit",  icon: "shopping-bag" },
  { id: "t65", cardId: "card-2", title: "Holiday Flight",    category: "Travel",        amount: -950.00, date: "2025-12-18", type: "debit",  icon: "navigation" },
  { id: "t66", cardId: "card-2", title: "Resort Hotel",      category: "Travel",        amount: -720.00, date: "2025-12-22", type: "debit",  icon: "home" },
  { id: "t67", cardId: "card-2", title: "Holiday Dining",    category: "Food & Drink",  amount: -280.00, date: "2025-12-25", type: "debit",  icon: "coffee" },
  { id: "t68", cardId: "card-2", title: "Airport Shopping",  category: "Shopping",      amount: -220.00, date: "2025-12-19", type: "debit",  icon: "shopping-bag" },
  { id: "t69", cardId: "card-3", title: "Amazon Xmas",       category: "Shopping",      amount: -679.99, date: "2025-12-18", type: "debit",  icon: "package" },
  { id: "t70", cardId: "card-3", title: "Cash Back Dec",     category: "Income",        amount: 120.00,  date: "2025-12-10", type: "credit", icon: "gift" },
  { id: "t71", cardId: "card-3", title: "Target Xmas",       category: "Shopping",      amount: -279.50, date: "2025-12-14", type: "debit",  icon: "shopping-bag" },
  { id: "t72", cardId: "card-3", title: "Spotify",           category: "Entertainment", amount: -9.99,   date: "2025-12-01", type: "debit",  icon: "music" },

  // ── Nov 2025 ──────────────────────────────────────────────────────────────
  { id: "t80", cardId: "card-1", title: "Salary Deposit",    category: "Income",        amount: 4500.00, date: "2025-11-22", type: "credit", icon: "trending-up" },
  { id: "t81", cardId: "card-1", title: "Black Friday Shop", category: "Shopping",      amount: -449.99, date: "2025-11-28", type: "debit",  icon: "shopping-bag" },
  { id: "t82", cardId: "card-1", title: "Thanksgiving Meal", category: "Groceries",     amount: -199.80, date: "2025-11-27", type: "debit",  icon: "shopping-bag" },
  { id: "t83", cardId: "card-1", title: "Netflix",           category: "Entertainment", amount: -15.99,  date: "2025-11-15", type: "debit",  icon: "film" },
  { id: "t84", cardId: "card-2", title: "Thanksgiving Flight",category: "Travel",       amount: -580.00, date: "2025-11-25", type: "debit",  icon: "navigation" },
  { id: "t85", cardId: "card-2", title: "Hotel Hilton",      category: "Travel",        amount: -450.00, date: "2025-11-26", type: "debit",  icon: "home" },
  { id: "t86", cardId: "card-2", title: "Thanksgiving Meal", category: "Food & Drink",  amount: -145.00, date: "2025-11-27", type: "debit",  icon: "coffee" },
  { id: "t87", cardId: "card-2", title: "Away Luggage",      category: "Shopping",      amount: -85.00,  date: "2025-11-10", type: "debit",  icon: "package" },
  { id: "t88", cardId: "card-3", title: "Amazon BF Deal",    category: "Shopping",      amount: -450.00, date: "2025-11-28", type: "debit",  icon: "package" },
  { id: "t89", cardId: "card-3", title: "Cash Back Nov",     category: "Income",        amount: 85.00,   date: "2025-11-10", type: "credit", icon: "gift" },
  { id: "t90", cardId: "card-3", title: "Target BF",         category: "Shopping",      amount: -379.99, date: "2025-11-28", type: "debit",  icon: "shopping-bag" },
  { id: "t91", cardId: "card-3", title: "Spotify",           category: "Entertainment", amount: -9.99,   date: "2025-11-01", type: "debit",  icon: "music" },

  // ── Oct 2025 ──────────────────────────────────────────────────────────────
  { id: "t100",cardId: "card-1", title: "Salary Deposit",    category: "Income",        amount: 4500.00, date: "2025-10-22", type: "credit", icon: "trending-up" },
  { id: "t101",cardId: "card-1", title: "Halloween Decor",   category: "Shopping",      amount: -119.99, date: "2025-10-28", type: "debit",  icon: "shopping-bag" },
  { id: "t102",cardId: "card-1", title: "Amazon",            category: "Shopping",      amount: -94.50,  date: "2025-10-15", type: "debit",  icon: "package" },
  { id: "t103",cardId: "card-1", title: "Whole Foods",       category: "Groceries",     amount: -110.20, date: "2025-10-08", type: "debit",  icon: "shopping-bag" },
  { id: "t104",cardId: "card-1", title: "Coffee Shop",       category: "Food & Drink",  amount: -35.00,  date: "2025-10-04", type: "debit",  icon: "coffee" },
  { id: "t105",cardId: "card-2", title: "Fall Flight",       category: "Travel",        amount: -380.00, date: "2025-10-12", type: "debit",  icon: "navigation" },
  { id: "t106",cardId: "card-2", title: "Airbnb Stay",       category: "Travel",        amount: -320.00, date: "2025-10-13", type: "debit",  icon: "home" },
  { id: "t107",cardId: "card-2", title: "Restaurants",       category: "Food & Drink",  amount: -95.00,  date: "2025-10-14", type: "debit",  icon: "coffee" },
  { id: "t108",cardId: "card-2", title: "Uber",              category: "Transport",     amount: -60.00,  date: "2025-10-18", type: "debit",  icon: "map-pin" },
  { id: "t109",cardId: "card-3", title: "Amazon",            category: "Shopping",      amount: -199.99, date: "2025-10-20", type: "debit",  icon: "package" },
  { id: "t110",cardId: "card-3", title: "Spotify",           category: "Entertainment", amount: -9.99,   date: "2025-10-01", type: "debit",  icon: "music" },
  { id: "t111",cardId: "card-3", title: "Halloween Party",   category: "Shopping",      amount: -95.00,  date: "2025-10-28", type: "debit",  icon: "gift" },
  { id: "t112",cardId: "card-3", title: "Target",            category: "Shopping",      amount: -159.99, date: "2025-10-10", type: "debit",  icon: "shopping-bag" },

  // ── Sep 2025 ──────────────────────────────────────────────────────────────
  { id: "t120",cardId: "card-1", title: "Salary Deposit",    category: "Income",        amount: 4500.00, date: "2025-09-22", type: "credit", icon: "trending-up" },
  { id: "t121",cardId: "card-1", title: "Back to School",    category: "Shopping",      amount: -349.99, date: "2025-09-05", type: "debit",  icon: "package" },
  { id: "t122",cardId: "card-1", title: "Whole Foods",       category: "Groceries",     amount: -140.00, date: "2025-09-12", type: "debit",  icon: "shopping-bag" },
  { id: "t123",cardId: "card-1", title: "Restaurant",        category: "Food & Drink",  amount: -65.00,  date: "2025-09-18", type: "debit",  icon: "coffee" },
  { id: "t124",cardId: "card-1", title: "Netflix",           category: "Entertainment", amount: -15.99,  date: "2025-09-15", type: "debit",  icon: "film" },
  { id: "t125",cardId: "card-2", title: "Amtrak Train",      category: "Travel",        amount: -120.00, date: "2025-09-08", type: "debit",  icon: "navigation" },
  { id: "t126",cardId: "card-2", title: "Hotel Embassy",     category: "Travel",        amount: -280.00, date: "2025-09-09", type: "debit",  icon: "home" },
  { id: "t127",cardId: "card-2", title: "Restaurant NYC",    category: "Food & Drink",  amount: -80.00,  date: "2025-09-10", type: "debit",  icon: "coffee" },
  { id: "t128",cardId: "card-2", title: "Museum Tickets",    category: "Entertainment", amount: -40.00,  date: "2025-09-11", type: "debit",  icon: "film" },
  { id: "t129",cardId: "card-3", title: "Amazon",            category: "Shopping",      amount: -88.00,  date: "2025-09-15", type: "debit",  icon: "package" },
  { id: "t130",cardId: "card-3", title: "Cash Back Sep",     category: "Income",        amount: 42.00,   date: "2025-09-10", type: "credit", icon: "gift" },
  { id: "t131",cardId: "card-3", title: "Spotify",           category: "Entertainment", amount: -9.99,   date: "2025-09-01", type: "debit",  icon: "music" },
  { id: "t132",cardId: "card-3", title: "Home Depot",        category: "Home",          amount: -94.99,  date: "2025-09-20", type: "debit",  icon: "home" },
  { id: "t133",cardId: "card-3", title: "Target",            category: "Shopping",      amount: -130.00, date: "2025-09-25", type: "debit",  icon: "shopping-bag" },

  // ── Aug 2025 ──────────────────────────────────────────────────────────────
  { id: "t140",cardId: "card-1", title: "Salary Deposit",    category: "Income",        amount: 4500.00, date: "2025-08-22", type: "credit", icon: "trending-up" },
  { id: "t141",cardId: "card-1", title: "Restaurant",        category: "Food & Drink",  amount: -94.50,  date: "2025-08-15", type: "debit",  icon: "coffee" },
  { id: "t142",cardId: "card-1", title: "Gas",               category: "Transport",     amount: -70.00,  date: "2025-08-10", type: "debit",  icon: "map-pin" },
  { id: "t143",cardId: "card-1", title: "Car Insurance",     category: "Insurance",     amount: -249.00, date: "2025-08-01", type: "debit",  icon: "shield" },
  { id: "t144",cardId: "card-1", title: "Amazon",            category: "Shopping",      amount: -87.99,  date: "2025-08-20", type: "debit",  icon: "package" },
  { id: "t145",cardId: "card-2", title: "Southwest Flight",  category: "Travel",        amount: -350.00, date: "2025-08-05", type: "debit",  icon: "navigation" },
  { id: "t146",cardId: "card-2", title: "Beach Resort",      category: "Travel",        amount: -420.00, date: "2025-08-07", type: "debit",  icon: "home" },
  { id: "t147",cardId: "card-2", title: "Car Rental",        category: "Transport",     amount: -180.00, date: "2025-08-05", type: "debit",  icon: "map-pin" },
  { id: "t148",cardId: "card-2", title: "Beach Dining",      category: "Food & Drink",  amount: -95.00,  date: "2025-08-10", type: "debit",  icon: "coffee" },
  { id: "t149",cardId: "card-3", title: "Amazon",            category: "Shopping",      amount: -119.99, date: "2025-08-18", type: "debit",  icon: "package" },
  { id: "t150",cardId: "card-3", title: "Spotify",           category: "Entertainment", amount: -9.99,   date: "2025-08-01", type: "debit",  icon: "music" },
  { id: "t151",cardId: "card-3", title: "School Supplies",   category: "Shopping",      amount: -279.99, date: "2025-08-25", type: "debit",  icon: "package" },
  { id: "t152",cardId: "card-3", title: "Target",            category: "Shopping",      amount: -154.50, date: "2025-08-12", type: "debit",  icon: "shopping-bag" },
  { id: "t153",cardId: "card-3", title: "Gas Station",       category: "Transport",     amount: -61.50,  date: "2025-08-08", type: "debit",  icon: "map-pin" },

  // ── Jul 2025 ──────────────────────────────────────────────────────────────
  { id: "t160",cardId: "card-1", title: "Salary Deposit",    category: "Income",        amount: 4500.00, date: "2025-07-22", type: "credit", icon: "trending-up" },
  { id: "t161",cardId: "card-1", title: "Whole Foods",       category: "Groceries",     amount: -97.80,  date: "2025-07-10", type: "debit",  icon: "shopping-bag" },
  { id: "t162",cardId: "card-1", title: "Amazon",            category: "Shopping",      amount: -149.99, date: "2025-07-15", type: "debit",  icon: "package" },
  { id: "t163",cardId: "card-1", title: "Netflix",           category: "Entertainment", amount: -15.99,  date: "2025-07-15", type: "debit",  icon: "film" },
  { id: "t164",cardId: "card-1", title: "Summer Clothing",   category: "Shopping",      amount: -229.50, date: "2025-07-04", type: "debit",  icon: "shopping-bag" },
  { id: "t165",cardId: "card-2", title: "Hotel Miami",       category: "Travel",        amount: -380.00, date: "2025-07-02", type: "debit",  icon: "home" },
  { id: "t166",cardId: "card-2", title: "Uber Rides",        category: "Transport",     amount: -55.00,  date: "2025-07-05", type: "debit",  icon: "map-pin" },
  { id: "t167",cardId: "card-2", title: "Miami Restaurants", category: "Food & Drink",  amount: -120.00, date: "2025-07-04", type: "debit",  icon: "coffee" },
  { id: "t168",cardId: "card-2", title: "Boat Excursion",    category: "Entertainment", amount: -180.00, date: "2025-07-03", type: "debit",  icon: "film" },
  { id: "t169",cardId: "card-3", title: "Amazon Prime Day",  category: "Shopping",      amount: -165.00, date: "2025-07-15", type: "debit",  icon: "package" },
  { id: "t170",cardId: "card-3", title: "Cash Back Jul",     category: "Income",        amount: 52.00,   date: "2025-07-10", type: "credit", icon: "gift" },
  { id: "t171",cardId: "card-3", title: "Spotify",           category: "Entertainment", amount: -9.99,   date: "2025-07-01", type: "debit",  icon: "music" },
  { id: "t172",cardId: "card-3", title: "Summer Clothing",   category: "Shopping",      amount: -179.99, date: "2025-07-04", type: "debit",  icon: "shopping-bag" },
  { id: "t173",cardId: "card-3", title: "Gas Station",       category: "Transport",     amount: -58.00,  date: "2025-07-08", type: "debit",  icon: "map-pin" },

  // ── Jun 2025 ──────────────────────────────────────────────────────────────
  { id: "t180",cardId: "card-1", title: "Salary Deposit",    category: "Income",        amount: 4500.00, date: "2025-06-22", type: "credit", icon: "trending-up" },
  { id: "t181",cardId: "card-1", title: "Whole Foods",       category: "Groceries",     amount: -145.20, date: "2025-06-10", type: "debit",  icon: "shopping-bag" },
  { id: "t182",cardId: "card-1", title: "Europe Flights",    category: "Travel",        amount: -799.00, date: "2025-06-05", type: "debit",  icon: "navigation" },
  { id: "t183",cardId: "card-1", title: "Paris Hotel",       category: "Travel",        amount: -449.00, date: "2025-06-12", type: "debit",  icon: "home" },
  { id: "t184",cardId: "card-1", title: "Fine Dining Paris", category: "Food & Drink",  amount: -199.00, date: "2025-06-15", type: "debit",  icon: "coffee" },
  { id: "t185",cardId: "card-2", title: "Intl Flight",       category: "Travel",        amount: -1199.00,date: "2025-06-01", type: "debit",  icon: "navigation" },
  { id: "t186",cardId: "card-2", title: "Luxury Hotel",      category: "Travel",        amount: -679.00, date: "2025-06-07", type: "debit",  icon: "home" },
  { id: "t187",cardId: "card-2", title: "Euro Dining",       category: "Food & Drink",  amount: -230.00, date: "2025-06-10", type: "debit",  icon: "coffee" },
  { id: "t188",cardId: "card-2", title: "Souvenir Shopping", category: "Shopping",      amount: -180.00, date: "2025-06-15", type: "debit",  icon: "shopping-bag" },
  { id: "t189",cardId: "card-3", title: "Amazon",            category: "Shopping",      amount: -199.99, date: "2025-06-18", type: "debit",  icon: "package" },
  { id: "t190",cardId: "card-3", title: "Spotify",           category: "Entertainment", amount: -9.99,   date: "2025-06-01", type: "debit",  icon: "music" },
  { id: "t191",cardId: "card-3", title: "Apple Music",       category: "Entertainment", amount: -10.99,  date: "2025-06-01", type: "debit",  icon: "music" },
  { id: "t192",cardId: "card-3", title: "Target",            category: "Shopping",      amount: -144.99, date: "2025-06-12", type: "debit",  icon: "shopping-bag" },
  { id: "t193",cardId: "card-3", title: "Gas Station",       category: "Transport",     amount: -64.50,  date: "2025-06-08", type: "debit",  icon: "map-pin" },

  // ── May 2025 ──────────────────────────────────────────────────────────────
  { id: "t200",cardId: "card-1", title: "Salary Deposit",    category: "Income",        amount: 4500.00, date: "2025-05-22", type: "credit", icon: "trending-up" },
  { id: "t201",cardId: "card-1", title: "Restaurant",        category: "Food & Drink",  amount: -109.50, date: "2025-05-15", type: "debit",  icon: "coffee" },
  { id: "t202",cardId: "card-1", title: "Doctor Visit",      category: "Health",        amount: -199.00, date: "2025-05-05", type: "debit",  icon: "activity" },
  { id: "t203",cardId: "card-1", title: "Amazon",            category: "Shopping",      amount: -74.99,  date: "2025-05-20", type: "debit",  icon: "package" },
  { id: "t204",cardId: "card-1", title: "Spotify",           category: "Entertainment", amount: -9.99,   date: "2025-05-01", type: "debit",  icon: "music" },
  { id: "t205",cardId: "card-2", title: "Airbnb Rental",     category: "Travel",        amount: -549.00, date: "2025-05-10", type: "debit",  icon: "home" },
  { id: "t206",cardId: "card-2", title: "Car Rental",        category: "Transport",     amount: -210.00, date: "2025-05-10", type: "debit",  icon: "map-pin" },
  { id: "t207",cardId: "card-2", title: "Local Restaurants", category: "Food & Drink",  amount: -140.00, date: "2025-05-12", type: "debit",  icon: "coffee" },
  { id: "t208",cardId: "card-2", title: "Activities",        category: "Entertainment", amount: -95.00,  date: "2025-05-13", type: "debit",  icon: "film" },
  { id: "t209",cardId: "card-3", title: "Amazon",            category: "Shopping",      amount: -139.99, date: "2025-05-18", type: "debit",  icon: "package" },
  { id: "t210",cardId: "card-3", title: "Cash Back May",     category: "Income",        amount: 45.00,   date: "2025-05-10", type: "credit", icon: "gift" },
  { id: "t211",cardId: "card-3", title: "Spotify",           category: "Entertainment", amount: -9.99,   date: "2025-05-01", type: "debit",  icon: "music" },
  { id: "t212",cardId: "card-3", title: "Costco",            category: "Groceries",     amount: -319.99, date: "2025-05-15", type: "debit",  icon: "shopping-bag" },
  { id: "t213",cardId: "card-3", title: "Gas Station",       category: "Transport",     amount: -69.50,  date: "2025-05-08", type: "debit",  icon: "map-pin" },

  // ── Apr 2025 ──────────────────────────────────────────────────────────────
  { id: "t220",cardId: "card-1", title: "Salary Deposit",    category: "Income",        amount: 4500.00, date: "2025-04-22", type: "credit", icon: "trending-up" },
  { id: "t221",cardId: "card-1", title: "Gas Station",       category: "Transport",     amount: -84.50,  date: "2025-04-10", type: "debit",  icon: "map-pin" },
  { id: "t222",cardId: "card-1", title: "CVS Pharmacy",      category: "Health",        amount: -44.99,  date: "2025-04-05", type: "debit",  icon: "activity" },
  { id: "t223",cardId: "card-1", title: "Planet Fitness",    category: "Health",        amount: -50.00,  date: "2025-04-01", type: "debit",  icon: "activity" },
  { id: "t224",cardId: "card-1", title: "Electric Bill",     category: "Utilities",     amount: -179.99, date: "2025-04-15", type: "debit",  icon: "zap" },
  { id: "t225",cardId: "card-2", title: "Southwest Flight",  category: "Travel",        amount: -279.00, date: "2025-04-08", type: "debit",  icon: "navigation" },
  { id: "t226",cardId: "card-2", title: "Hampton Inn",       category: "Travel",        amount: -190.00, date: "2025-04-09", type: "debit",  icon: "home" },
  { id: "t227",cardId: "card-2", title: "Cheesecake Factory",category: "Food & Drink",  amount: -70.00,  date: "2025-04-10", type: "debit",  icon: "coffee" },
  { id: "t228",cardId: "card-2", title: "Uber",              category: "Transport",     amount: -44.50,  date: "2025-04-11", type: "debit",  icon: "map-pin" },
  { id: "t229",cardId: "card-2", title: "Points Promo",      category: "Income",        amount: 199.00,  date: "2025-04-05", type: "credit", icon: "gift" },
  { id: "t230",cardId: "card-3", title: "Amazon",            category: "Shopping",      amount: -94.99,  date: "2025-04-18", type: "debit",  icon: "package" },
  { id: "t231",cardId: "card-3", title: "Spotify",           category: "Entertainment", amount: -9.99,   date: "2025-04-01", type: "debit",  icon: "music" },
  { id: "t232",cardId: "card-3", title: "Target",            category: "Shopping",      amount: -219.99, date: "2025-04-12", type: "debit",  icon: "shopping-bag" },
  { id: "t233",cardId: "card-3", title: "Home Depot",        category: "Home",          amount: -179.99, date: "2025-04-20", type: "debit",  icon: "home" },
  { id: "t234",cardId: "card-3", title: "Gas Station",       category: "Transport",     amount: -55.00,  date: "2025-04-08", type: "debit",  icon: "map-pin" },

  // ── Mar 2025 ──────────────────────────────────────────────────────────────
  { id: "t240",cardId: "card-1", title: "Salary Deposit",    category: "Income",        amount: 4500.00, date: "2025-03-22", type: "credit", icon: "trending-up" },
  { id: "t241",cardId: "card-1", title: "Whole Foods",       category: "Groceries",     amount: -120.00, date: "2025-03-12", type: "debit",  icon: "shopping-bag" },
  { id: "t242",cardId: "card-1", title: "Restaurant",        category: "Food & Drink",  amount: -84.50,  date: "2025-03-18", type: "debit",  icon: "coffee" },
  { id: "t243",cardId: "card-1", title: "Netflix",           category: "Entertainment", amount: -15.99,  date: "2025-03-15", type: "debit",  icon: "film" },
  { id: "t244",cardId: "card-1", title: "Amazon",            category: "Shopping",      amount: -219.99, date: "2025-03-08", type: "debit",  icon: "package" },
  { id: "t245",cardId: "card-2", title: "Spring Break Flight",category: "Travel",       amount: -419.00, date: "2025-03-10", type: "debit",  icon: "navigation" },
  { id: "t246",cardId: "card-2", title: "Cancun Hotel",      category: "Travel",        amount: -319.00, date: "2025-03-11", type: "debit",  icon: "home" },
  { id: "t247",cardId: "card-2", title: "Resort Dining",     category: "Food & Drink",  amount: -84.50,  date: "2025-03-13", type: "debit",  icon: "coffee" },
  { id: "t248",cardId: "card-2", title: "Uber",              category: "Transport",     amount: -34.50,  date: "2025-03-15", type: "debit",  icon: "map-pin" },
  { id: "t249",cardId: "card-2", title: "Miles Credit",      category: "Income",        amount: 180.00,  date: "2025-03-05", type: "credit", icon: "gift" },
  { id: "t250",cardId: "card-3", title: "Amazon",            category: "Shopping",      amount: -179.99, date: "2025-03-18", type: "debit",  icon: "package" },
  { id: "t251",cardId: "card-3", title: "Cash Back Mar",     category: "Income",        amount: 38.00,   date: "2025-03-10", type: "credit", icon: "gift" },
  { id: "t252",cardId: "card-3", title: "Spotify",           category: "Entertainment", amount: -9.99,   date: "2025-03-01", type: "debit",  icon: "music" },
  { id: "t253",cardId: "card-3", title: "Target",            category: "Shopping",      amount: -144.99, date: "2025-03-12", type: "debit",  icon: "shopping-bag" },
  { id: "t254",cardId: "card-3", title: "Gas Station",       category: "Transport",     amount: -60.00,  date: "2025-03-08", type: "debit",  icon: "map-pin" },
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
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidLinkedAccount[]>([]);
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

  const cancelScheduledPayment = useCallback((id: string) => {
    setScheduledPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addBankAccount = useCallback(
    (bank: Omit<BankAccount, "id">) => {
      const newBank: BankAccount = { ...bank, id: `bank-${Date.now()}` };
      setBankAccounts((prev) => [...prev, newBank]);
    },
    []
  );

  const addPlaidAccounts = useCallback((accounts: PlaidLinkedAccount[]) => {
    setPlaidAccounts((prev) => {
      const existingIds = new Set(prev.map((a) => a.accountId));
      const newOnes = accounts.filter((a) => !existingIds.has(a.accountId));
      return [...prev, ...newOnes];
    });
  }, []);

  return (
    <FinanceContext.Provider
      value={{
        cards,
        transactions,
        scheduledPayments,
        bankAccounts,
        plaidAccounts,
        pendingPayment,
        totalBalance,
        addScheduledPayment,
        cancelScheduledPayment,
        addBankAccount,
        addPlaidAccounts,
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
