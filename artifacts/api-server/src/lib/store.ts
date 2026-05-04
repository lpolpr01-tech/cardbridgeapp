export type PlaidAccount = {
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

type PlaidItem = {
  accessToken: string;
  itemId: string;
  institutionName: string;
  accounts: PlaidAccount[];
};

const plaidStore = new Map<string, PlaidItem[]>();

export function getPlaidItems(userId: string): PlaidItem[] {
  return plaidStore.get(userId) ?? [];
}

export function addPlaidItem(userId: string, item: PlaidItem): void {
  const existing = plaidStore.get(userId) ?? [];
  plaidStore.set(userId, [...existing, item]);
}

export function getPlaidAccounts(userId: string): PlaidAccount[] {
  return getPlaidItems(userId).flatMap((item) => item.accounts);
}

export function getPlaidAccessToken(userId: string, accountId: string): string | null {
  for (const item of getPlaidItems(userId)) {
    if (item.accounts.some((a) => a.accountId === accountId)) {
      return item.accessToken;
    }
  }
  return null;
}

// ─── Scheduled payments (in-memory; replace with DB for production) ──────────

export type ScheduledPaymentRecord = {
  id: string;
  userId: string;
  accountId: string;
  amounts: Record<string, number>;
  totalAmount: number;
  date: string;
  note: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
};

const scheduledPaymentStore = new Map<string, ScheduledPaymentRecord[]>();

export function addScheduledPaymentRecord(userId: string, record: ScheduledPaymentRecord): void {
  const existing = scheduledPaymentStore.get(userId) ?? [];
  scheduledPaymentStore.set(userId, [...existing, record]);
}

export function getScheduledPaymentRecords(userId: string): ScheduledPaymentRecord[] {
  return scheduledPaymentStore.get(userId) ?? [];
}
