import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import { apiUrl } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";

// ─── Legacy types kept for back-compat with screens not yet migrated ──────────
// New screens (Card List on home tab, Card Detail) read PlaidCreditCard /
// PlaidTransaction directly. The legacy fields below stay typed but always
// resolve to empty arrays so old screens render their empty states.

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

// ─── New Plaid-sourced types ──────────────────────────────────────────────────

export type PlaidCreditCard = {
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
  apr: number | null;
  minimumPayment: number | null;
  nextPaymentDueDate: string | null;
  lastStatementIssueDate: string | null;
  lastStatementBalance?: number | null;
};

export type PlaidTransaction = {
  id: string;
  accountId: string;
  title: string;
  category: string;
  categoryDetailed: string | null;
  amount: number;
  date: string;
  type: "debit" | "credit";
  pending: boolean;
};

// ─── Context type ─────────────────────────────────────────────────────────────

type FinanceContextType = {
  // Legacy (always empty — kept so older screens keep compiling)
  cards: Card[];
  transactions: Transaction[];
  scheduledPayments: ScheduledPayment[];
  bankAccounts: BankAccount[];
  hiddenPlaidAccountIds: string[];
  pendingPayment: PendingPayment | null;
  totalBalance: number;
  addScheduledPayment: (payment: Omit<ScheduledPayment, "id" | "status">) => void;
  cancelScheduledPayment: (id: string) => void;
  addBankAccount: (bank: Omit<BankAccount, "id">) => void;
  togglePlaidAccountVisibility: (accountId: string) => void;
  setPendingPayment: (p: PendingPayment | null) => void;

  // Real Plaid data
  plaidAccounts: PlaidLinkedAccount[]; // raw exchange-time list (used by Settings list)
  plaidCards: PlaidCreditCard[]; // enriched credit cards (APR, due date, etc.)
  plaidBankAccounts: PlaidLinkedAccount[]; // depository accounts
  transactionsByCard: Record<string, PlaidTransaction[]>;

  loadingCards: boolean;
  cardsError: string | null;

  // Actions
  addPlaidAccounts: (accounts: PlaidLinkedAccount[]) => void;
  refreshCards: () => Promise<void>;
  refreshBankAccounts: () => Promise<void>;
  fetchTransactionsForCard: (
    accountId: string,
    days?: number,
  ) => Promise<PlaidTransaction[]>;
};

const FinanceContext = createContext<FinanceContextType | null>(null);

const HIDDEN_PLAID_KEY = "@finapp_hidden_plaid_accounts";
const LINKED_ACCOUNT_IDS_KEY = "@cardbridge_linked_account_ids";

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { token: authToken, isAuthenticated } = useAuth();

  // Legacy state — always empty, but kept so old screens don't crash.
  const [cards] = useState<Card[]>([]);
  const [transactions] = useState<Transaction[]>([]);
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);

  // Plaid-sourced state
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidLinkedAccount[]>([]);
  const [plaidCards, setPlaidCards] = useState<PlaidCreditCard[]>([]);
  const [plaidBankAccounts, setPlaidBankAccounts] = useState<PlaidLinkedAccount[]>([]);
  const [transactionsByCard, setTransactionsByCard] = useState<Record<string, PlaidTransaction[]>>({});
  const [hiddenPlaidAccountIds, setHiddenPlaidAccountIds] = useState<string[]>([]);

  const [loadingCards, setLoadingCards] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);

  // Track latest token via ref so AppState listener always reads fresh value.
  const tokenRef = useRef<string | null>(null);
  useEffect(() => {
    tokenRef.current = authToken;
  }, [authToken]);

  // ─── Load hidden visibility prefs ──────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(HIDDEN_PLAID_KEY).then((val) => {
      if (val) {
        try {
          setHiddenPlaidAccountIds(JSON.parse(val) as string[]);
        } catch {
          /* ignore */
        }
      }
    });
  }, []);

  // ─── Plaid hydration ───────────────────────────────────────────────────────
  const refreshCards = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    setLoadingCards(true);
    setCardsError(null);
    try {
      const res = await fetch(apiUrl("/api/plaid/credit-cards"), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setCardsError("Couldn't load credit cards.");
        return;
      }
      const data = (await res.json()) as { cards: PlaidCreditCard[] };
      setPlaidCards(data.cards ?? []);
    } catch {
      setCardsError("Network error loading credit cards.");
    } finally {
      setLoadingCards(false);
    }
  }, []);

  const refreshBankAccounts = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const res = await fetch(apiUrl("/api/plaid/accounts"), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { accounts: PlaidLinkedAccount[] };
      const accounts = data.accounts ?? [];
      setPlaidAccounts(accounts);
      setPlaidBankAccounts(
        accounts.filter(
          (a) => a.type === "depository" || a.subtype === "checking" || a.subtype === "savings",
        ),
      );

      // Persist linked account IDs so the app remembers something is linked,
      // even before the next API call returns.
      const ids = accounts.map((a) => a.accountId);
      try {
        await AsyncStorage.setItem(LINKED_ACCOUNT_IDS_KEY, JSON.stringify(ids));
      } catch {
        /* ignore */
      }
    } catch {
      /* swallow — settings screen handles its own error state */
    }
  }, []);

  // Hydrate on auth + on app foreground.
  useEffect(() => {
    if (!isAuthenticated) {
      setPlaidCards([]);
      setPlaidBankAccounts([]);
      setPlaidAccounts([]);
      setTransactionsByCard({});
      return;
    }
    refreshCards();
    refreshBankAccounts();
  }, [isAuthenticated, refreshCards, refreshBankAccounts]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active" && tokenRef.current) {
        refreshCards();
        refreshBankAccounts();
      }
    });
    return () => sub.remove();
  }, [refreshCards, refreshBankAccounts]);

  // ─── Per-card transaction fetch (cached) ───────────────────────────────────
  const fetchTransactionsForCard = useCallback(
    async (accountId: string, days = 90): Promise<PlaidTransaction[]> => {
      const token = tokenRef.current;
      if (!token) return [];
      try {
        const res = await fetch(apiUrl("/api/plaid/transactions"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ account_id: accountId, days }),
        });
        if (!res.ok) return [];
        const data = (await res.json()) as { transactions: PlaidTransaction[] };
        const list = data.transactions ?? [];
        setTransactionsByCard((prev) => ({ ...prev, [accountId]: list }));
        return list;
      } catch {
        return [];
      }
    },
    [],
  );

  // ─── Legacy actions kept as no-ops or local-only state ─────────────────────
  const totalBalance = plaidCards.reduce((sum, c) => sum + (c.balanceCurrent ?? 0), 0);

  const addScheduledPayment = useCallback(
    (payment: Omit<ScheduledPayment, "id" | "status">) => {
      const newPayment: ScheduledPayment = {
        ...payment,
        id: `sp-${Date.now()}`,
        status: "pending",
      };
      setScheduledPayments((prev) => [...prev, newPayment]);
    },
    [],
  );

  const cancelScheduledPayment = useCallback((id: string) => {
    setScheduledPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addBankAccount = useCallback((bank: Omit<BankAccount, "id">) => {
    const newBank: BankAccount = { ...bank, id: `bank-${Date.now()}` };
    setBankAccounts((prev) => [...prev, newBank]);
  }, []);

  const addPlaidAccounts = useCallback(
    (accounts: PlaidLinkedAccount[]) => {
      setPlaidAccounts((prev) => {
        const existingIds = new Set(prev.map((a) => a.accountId));
        const newOnes = accounts.filter((a) => !existingIds.has(a.accountId));
        return [...prev, ...newOnes];
      });
      // Re-fetch enriched data so the new card's APR / due date show up.
      refreshCards();
      refreshBankAccounts();
    },
    [refreshCards, refreshBankAccounts],
  );

  const togglePlaidAccountVisibility = useCallback((accountId: string) => {
    setHiddenPlaidAccountIds((prev) => {
      const next = prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId];
      AsyncStorage.setItem(HIDDEN_PLAID_KEY, JSON.stringify(next));
      return next;
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
        plaidCards,
        plaidBankAccounts,
        transactionsByCard,
        loadingCards,
        cardsError,
        hiddenPlaidAccountIds,
        pendingPayment,
        totalBalance,
        addScheduledPayment,
        cancelScheduledPayment,
        addBankAccount,
        addPlaidAccounts,
        togglePlaidAccountVisibility,
        setPendingPayment,
        refreshCards,
        refreshBankAccounts,
        fetchTransactionsForCard,
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
