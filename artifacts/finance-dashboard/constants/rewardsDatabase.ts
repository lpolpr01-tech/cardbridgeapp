// Static reward rules for popular US credit cards.
// Used by the Card Detail → Rewards tab. If a card matches one of these specs,
// rewards are calculated automatically from the transaction history. If not,
// the UI falls back to a manual-entry form pre-filled with 1x defaults.
//
// Reward categories are coarse-grained because Plaid's category data only
// gets us so far — for things like "5x flights via Chase Travel" we'd need
// merchant-level signal we don't have, so headline-rate fields below approximate
// the most common path (direct purchase) and add a note for the portal-only rate.

import type { PlaidTransaction } from "@/context/FinanceContext";

export type RewardUnit = "points" | "cashback_pct";

export type RewardCategory =
  | "DINING"
  | "GROCERIES"
  | "TRAVEL"
  | "FLIGHTS"
  | "HOTELS"
  | "GAS"
  | "TRANSIT"
  | "STREAMING"
  | "DRUGSTORES"
  | "OTHER";

export type RewardRule = {
  category: RewardCategory;
  multiplier: number;
  note?: string;
};

export type CardSpec = {
  key: string;
  displayName: string;
  unit: RewardUnit;
  // Highest-priority rule first. Each transaction is matched to the FIRST rule
  // whose category fits — anything else falls through to baseRate.
  rules: RewardRule[];
  baseRate: number;
  // Substrings matched (case-insensitive) against `${institutionName} ${cardName}`.
  matchPatterns: string[];
  description: string;
  // Optional caveats shown under the breakdown.
  notes?: string[];
};

export const CARD_SPECS: CardSpec[] = [
  {
    key: "chase-sapphire-preferred",
    displayName: "Chase Sapphire Preferred",
    unit: "points",
    baseRate: 1,
    rules: [
      { category: "DINING", multiplier: 3 },
      { category: "STREAMING", multiplier: 3 },
      { category: "TRAVEL", multiplier: 2 },
    ],
    matchPatterns: ["sapphire preferred"],
    description: "3x dining, 3x streaming, 2x travel, 1x everything else",
  },
  {
    key: "chase-sapphire-reserve",
    displayName: "Chase Sapphire Reserve",
    unit: "points",
    baseRate: 1,
    rules: [
      { category: "HOTELS", multiplier: 3, note: "10x via Chase Travel portal" },
      { category: "FLIGHTS", multiplier: 3, note: "5x via Chase Travel portal" },
      { category: "DINING", multiplier: 3 },
      { category: "TRAVEL", multiplier: 3 },
    ],
    matchPatterns: ["sapphire reserve"],
    description: "10x hotels via Chase Travel, 5x flights via Chase Travel, 3x dining/travel, 1x other",
    notes: [
      "Portal rates (10x hotels, 5x flights) only apply when booked through Chase Travel — we credit the base 3x rate here.",
    ],
  },
  {
    key: "chase-freedom-unlimited",
    displayName: "Chase Freedom Unlimited",
    unit: "cashback_pct",
    baseRate: 1.5,
    rules: [
      { category: "DINING", multiplier: 3 },
      { category: "DRUGSTORES", multiplier: 3 },
    ],
    matchPatterns: ["freedom unlimited"],
    description: "3% dining/drugstores, 1.5% everything else",
  },
  {
    key: "chase-freedom-flex",
    displayName: "Chase Freedom Flex",
    unit: "cashback_pct",
    baseRate: 1,
    rules: [
      { category: "DINING", multiplier: 3 },
      { category: "DRUGSTORES", multiplier: 3 },
    ],
    matchPatterns: ["freedom flex"],
    description: "5% rotating quarterly categories, 3% dining/drugstores, 1% other",
    notes: [
      "5% rotating-category bonuses (groceries, gas, etc. by quarter) need Chase enrollment and aren't auto-credited here.",
    ],
  },
  {
    key: "amex-gold",
    displayName: "American Express Gold",
    unit: "points",
    baseRate: 1,
    rules: [
      { category: "DINING", multiplier: 4 },
      { category: "GROCERIES", multiplier: 4 },
      { category: "FLIGHTS", multiplier: 3 },
    ],
    matchPatterns: ["amex gold", "american express gold", "membership rewards gold"],
    description: "4x dining/groceries (US supermarkets), 3x flights booked direct, 1x other",
  },
  {
    key: "amex-platinum",
    displayName: "American Express Platinum",
    unit: "points",
    baseRate: 1,
    rules: [
      { category: "FLIGHTS", multiplier: 5 },
      { category: "HOTELS", multiplier: 5, note: "5x prepaid hotels via Amex Travel" },
    ],
    matchPatterns: ["amex platinum", "american express platinum"],
    description: "5x flights/hotels booked through Amex Travel, 1x everything else",
    notes: [
      "5x rate requires booking through amextravel.com — we credit 5x on flights/hotels regardless here.",
    ],
  },
  {
    key: "amex-blue-cash-preferred",
    displayName: "Amex Blue Cash Preferred",
    unit: "cashback_pct",
    baseRate: 1,
    rules: [
      { category: "GROCERIES", multiplier: 6, note: "6% on first $6k/yr at US supermarkets" },
      { category: "STREAMING", multiplier: 6 },
      { category: "TRANSIT", multiplier: 3 },
      { category: "GAS", multiplier: 3 },
    ],
    matchPatterns: ["blue cash preferred"],
    description: "6% groceries/streaming, 3% transit/gas, 1% other",
    notes: [
      "6% on groceries caps at $6,000/year, then drops to 1% — we don't track the cap here.",
    ],
  },
  {
    key: "capital-one-venture",
    displayName: "Capital One Venture",
    unit: "points",
    baseRate: 2,
    rules: [
      { category: "HOTELS", multiplier: 5, note: "5x hotels via Capital One Travel" },
      { category: "TRAVEL", multiplier: 5, note: "Includes rental cars via Capital One Travel" },
    ],
    matchPatterns: ["capital one venture", "venture rewards"],
    description: "5x hotels/rental cars via Capital One Travel, 2x everything else",
    notes: [
      "5x portal rate only applies when booked through capitalone.com/travel.",
    ],
  },
  {
    key: "capital-one-quicksilver",
    displayName: "Capital One Quicksilver",
    unit: "cashback_pct",
    baseRate: 1.5,
    rules: [],
    matchPatterns: ["quicksilver"],
    description: "1.5% cash back on everything",
  },
  {
    key: "citi-double-cash",
    displayName: "Citi Double Cash",
    unit: "cashback_pct",
    baseRate: 2,
    rules: [],
    matchPatterns: ["double cash"],
    description: "2% on everything (1% when you buy + 1% when you pay)",
    notes: [
      "Citi splits this as 1% at purchase + 1% on payment — we count it as a flat 2%.",
    ],
  },
  {
    key: "citi-custom-cash",
    displayName: "Citi Custom Cash",
    unit: "cashback_pct",
    baseRate: 1,
    rules: [],
    matchPatterns: ["custom cash"],
    description: "5% on your top spending category each month, 1% other",
    notes: [
      "5% category is selected automatically by Citi based on your highest-spend category that month, capped at $500.",
      "We show the flat 1% rate here — your actual rewards will be higher once Citi credits the 5% category.",
    ],
  },
  {
    key: "discover-it",
    displayName: "Discover it",
    unit: "cashback_pct",
    baseRate: 1,
    rules: [],
    matchPatterns: ["discover it"],
    description: "5% rotating quarterly categories, 1% other",
    notes: [
      "Quarterly 5% categories (groceries, restaurants, gas, etc.) require enrollment — we show the flat 1% rate here.",
    ],
  },
];

// ─── Card detection ──────────────────────────────────────────────────────────

export function detectCardSpec(
  cardName: string,
  institutionName: string | null,
): CardSpec | null {
  const haystack = `${institutionName ?? ""} ${cardName ?? ""}`.toLowerCase();

  // Match longest pattern first so "sapphire reserve" beats "sapphire" if both
  // existed in the DB.
  let best: { spec: CardSpec; len: number } | null = null;
  for (const spec of CARD_SPECS) {
    for (const pattern of spec.matchPatterns) {
      if (haystack.includes(pattern.toLowerCase())) {
        if (!best || pattern.length > best.len) {
          best = { spec, len: pattern.length };
        }
      }
    }
  }
  return best?.spec ?? null;
}

// ─── Plaid PFC → reward category mapper ──────────────────────────────────────

export function classifyTransaction(
  category: string,
  detailed: string | null,
): RewardCategory {
  const d = (detailed ?? "").toUpperCase();
  const p = (category ?? "").toUpperCase();

  // Most specific signals first — detailed PFC categories.
  if (
    d === "FOOD_AND_DRINK_RESTAURANTS" ||
    d === "FOOD_AND_DRINK_FAST_FOOD" ||
    d === "FOOD_AND_DRINK_COFFEE"
  ) {
    return "DINING";
  }
  if (d === "FOOD_AND_DRINK_GROCERIES") return "GROCERIES";
  if (d === "TRAVEL_FLIGHTS") return "FLIGHTS";
  if (d === "TRAVEL_LODGING") return "HOTELS";
  if (
    d === "TRAVEL_TAXIS_AND_RIDE_SHARES" ||
    d === "TRAVEL_PUBLIC_TRANSIT" ||
    d === "TRANSPORTATION_PARKING" ||
    d === "TRANSPORTATION_TOLLS" ||
    d === "TRANSPORTATION_PUBLIC_TRANSIT"
  ) {
    return "TRANSIT";
  }
  if (d === "TRAVEL_RENTAL_CARS") return "TRAVEL";
  if (d === "TRANSPORTATION_GAS") return "GAS";
  if (
    d === "ENTERTAINMENT_TV_AND_MOVIES" ||
    d === "ENTERTAINMENT_MUSIC_AND_AUDIO"
  ) {
    return "STREAMING";
  }
  if (d === "GENERAL_MERCHANDISE_PHARMACIES_AND_DRUG_STORES") return "DRUGSTORES";

  // Fall back to primary category.
  if (p === "FOOD_AND_DRINK") return "DINING";
  if (p === "TRAVEL") return "TRAVEL";

  return "OTHER";
}

// ─── Reward calculation ──────────────────────────────────────────────────────

export type RewardBreakdown = {
  totalEarned: number;
  unit: RewardUnit;
  byCategory: Record<RewardCategory, { spend: number; earned: number; multiplier: number }>;
  totalSpend: number;
};

export function calculateRewards(
  spec: CardSpec | null,
  manualRules: { rules: RewardRule[]; baseRate: number; unit: RewardUnit } | null,
  transactions: PlaidTransaction[],
): RewardBreakdown {
  const rules = spec?.rules ?? manualRules?.rules ?? [];
  const baseRate = spec?.baseRate ?? manualRules?.baseRate ?? 1;
  const unit: RewardUnit = spec?.unit ?? manualRules?.unit ?? "cashback_pct";

  const byCategory: Record<RewardCategory, { spend: number; earned: number; multiplier: number }> = {
    DINING: { spend: 0, earned: 0, multiplier: baseRate },
    GROCERIES: { spend: 0, earned: 0, multiplier: baseRate },
    TRAVEL: { spend: 0, earned: 0, multiplier: baseRate },
    FLIGHTS: { spend: 0, earned: 0, multiplier: baseRate },
    HOTELS: { spend: 0, earned: 0, multiplier: baseRate },
    GAS: { spend: 0, earned: 0, multiplier: baseRate },
    TRANSIT: { spend: 0, earned: 0, multiplier: baseRate },
    STREAMING: { spend: 0, earned: 0, multiplier: baseRate },
    DRUGSTORES: { spend: 0, earned: 0, multiplier: baseRate },
    OTHER: { spend: 0, earned: 0, multiplier: baseRate },
  };

  // Apply rule multipliers
  for (const rule of rules) {
    byCategory[rule.category].multiplier = rule.multiplier;
  }

  let totalSpend = 0;
  let totalEarned = 0;

  for (const t of transactions) {
    if (t.type !== "debit") continue; // only outflows earn rewards
    const spend = Math.abs(t.amount);
    if (spend <= 0) continue;
    const cat = classifyTransaction(t.category, t.categoryDetailed);
    const bucket = byCategory[cat];
    bucket.spend += spend;
    const earned =
      unit === "points"
        ? spend * bucket.multiplier // points = $ × multiplier (each $1 = N points)
        : (spend * bucket.multiplier) / 100; // cashback = % of spend
    bucket.earned += earned;
    totalSpend += spend;
    totalEarned += earned;
  }

  return { totalEarned, unit, byCategory, totalSpend };
}

export const REWARD_CATEGORY_LABEL: Record<RewardCategory, string> = {
  DINING: "Dining",
  GROCERIES: "Groceries",
  TRAVEL: "Travel",
  FLIGHTS: "Flights",
  HOTELS: "Hotels",
  GAS: "Gas",
  TRANSIT: "Transit",
  STREAMING: "Streaming",
  DRUGSTORES: "Drugstores",
  OTHER: "Other",
};
