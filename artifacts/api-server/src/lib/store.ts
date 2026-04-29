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
