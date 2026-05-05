import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import {
  useFinance,
  type PlaidCreditCard,
  type PlaidTransaction,
} from "@/context/FinanceContext";
import { useTheme } from "@/context/ThemeContext";
import { secureGet, secureSet } from "@/lib/secure-storage";
import {
  CARD_SPECS,
  REWARD_CATEGORY_LABEL,
  calculateRewards,
  classifyTransaction,
  detectCardSpec,
  type CardSpec,
  type RewardCategory,
  type RewardRule,
  type RewardUnit,
} from "@/constants/rewardsDatabase";

const TABS = ["Overview", "Transactions", "Rewards"] as const;
type TabKey = (typeof TABS)[number];

const ALL_CATEGORIES: RewardCategory[] = [
  "DINING",
  "GROCERIES",
  "TRAVEL",
  "FLIGHTS",
  "HOTELS",
  "GAS",
  "TRANSIT",
  "STREAMING",
  "DRUGSTORES",
  "OTHER",
];

const CATEGORY_ICON: Record<string, string> = {
  FOOD_AND_DRINK: "coffee",
  TRAVEL: "navigation",
  TRANSPORTATION: "map-pin",
  ENTERTAINMENT: "film",
  GENERAL_MERCHANDISE: "shopping-bag",
  HOME_IMPROVEMENT: "home",
  MEDICAL: "activity",
  PERSONAL_CARE: "user",
  GENERAL_SERVICES: "briefcase",
  TRANSFER_IN: "trending-up",
  TRANSFER_OUT: "trending-down",
  INCOME: "trending-up",
  LOAN_PAYMENTS: "credit-card",
  BANK_FEES: "alert-triangle",
  RENT_AND_UTILITIES: "zap",
  GOVERNMENT_AND_NON_PROFIT: "flag",
};

function categoryIcon(category: string, detailed: string | null): string {
  if (detailed === "FOOD_AND_DRINK_GROCERIES") return "shopping-bag";
  if (detailed === "FOOD_AND_DRINK_RESTAURANTS") return "coffee";
  if (detailed === "TRAVEL_FLIGHTS") return "send";
  if (detailed === "TRAVEL_LODGING") return "home";
  if (detailed === "TRANSPORTATION_GAS") return "droplet";
  return CATEGORY_ICON[category] ?? "credit-card";
}

function formatCurrencyExact(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function utilizationColor(pct: number): string {
  if (pct >= 70) return "#FF6B8A";
  if (pct >= 30) return "#F59E0B";
  return "#4ADEAA";
}

// Estimate next statement close = last_statement_issue_date + ~30d.
function estimateStatementClose(lastIssue: string | null): string | null {
  if (!lastIssue) return null;
  const d = new Date(lastIssue);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function OverviewTab({ card }: { card: PlaidCreditCard }) {
  const balance = card.balanceCurrent ?? 0;
  const limit = card.balanceLimit;
  const available = card.balanceAvailable;
  const usagePct = limit && limit > 0 ? Math.min((balance / limit) * 100, 100) : 0;
  const due = daysUntil(card.nextPaymentDueDate);
  const dueIsUrgent = due != null && due <= 7;
  const statementClose = estimateStatementClose(card.lastStatementIssueDate);

  return (
    <View style={s.tabBody}>
      <View style={s.card}>
        <Text style={s.sectionTitle}>Balance</Text>
        <Text style={s.bigBalance}>{formatCurrencyExact(balance)}</Text>
        {limit ? (
          <>
            <View style={s.progressBg}>
              <View
                style={[
                  s.progressFill,
                  { width: `${Math.max(usagePct, 2)}%` as any, backgroundColor: utilizationColor(usagePct) },
                ]}
              />
            </View>
            <Text style={[s.utilText, { color: utilizationColor(usagePct) }]}>
              {usagePct.toFixed(0)}% utilization
            </Text>
          </>
        ) : null}
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Credit</Text>
        <DetailRow label="Credit Limit" value={formatCurrencyExact(limit)} />
        <DetailRow
          label="Available Credit"
          value={formatCurrencyExact(available)}
          color="#4ADEAA"
        />
        <DetailRow
          label="APR"
          value={card.apr != null ? `${card.apr.toFixed(2)}%` : "—"}
        />
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Payment</Text>
        <DetailRow
          label="Next Payment Due"
          value={formatDate(card.nextPaymentDueDate)}
          color={dueIsUrgent ? "#FF6B8A" : undefined}
        />
        <DetailRow
          label="Minimum Payment"
          value={formatCurrencyExact(card.minimumPayment)}
        />
        {due != null && due >= 0 ? (
          <View style={s.dueBanner}>
            <Feather
              name={dueIsUrgent ? "alert-circle" : "clock"}
              size={14}
              color={dueIsUrgent ? "#FF6B8A" : Colors.textSecondary}
            />
            <Text
              style={[
                s.dueBannerText,
                dueIsUrgent && { color: "#FF6B8A", fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {due === 0 ? "Due today" : `Due in ${due} day${due === 1 ? "" : "s"}`}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Statement</Text>
        <DetailRow
          label="Last Statement Date"
          value={formatDate(card.lastStatementIssueDate)}
        />
        <DetailRow
          label="Next Statement Closes"
          value={statementClose ? `~ ${formatDate(statementClose)}` : "—"}
        />
        <DetailRow
          label="Last Statement Balance"
          value={formatCurrencyExact(card.lastStatementBalance ?? null)}
        />
      </View>
    </View>
  );
}

// ─── Transactions tab ─────────────────────────────────────────────────────────

type TxGroup = { label: string; items: PlaidTransaction[] };

function groupTransactions(txs: PlaidTransaction[]): TxGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(today.getDate() - 30);

  const buckets: Record<string, PlaidTransaction[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    "This Month": [],
    Earlier: [],
  };

  for (const t of txs) {
    const d = new Date(t.date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) buckets.Today.push(t);
    else if (d.getTime() === yesterday.getTime()) buckets.Yesterday.push(t);
    else if (d >= weekAgo) buckets["This Week"].push(t);
    else if (d >= monthAgo) buckets["This Month"].push(t);
    else buckets.Earlier.push(t);
  }

  const order = ["Today", "Yesterday", "This Week", "This Month", "Earlier"];
  return order
    .filter((k) => buckets[k]!.length > 0)
    .map((k) => ({ label: k, items: buckets[k]! }));
}

function TransactionRow({ tx }: { tx: PlaidTransaction }) {
  const icon = categoryIcon(tx.category, tx.categoryDetailed);
  const isCredit = tx.type === "credit";
  const amountColor = isCredit ? "#4ADEAA" : Colors.textPrimary;
  const sign = isCredit ? "+" : "";

  return (
    <View style={s.txRow}>
      <View style={s.txIcon}>
        <Feather name={icon as any} size={16} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.txTitleRow}>
          <Text style={s.txTitle} numberOfLines={1}>{tx.title}</Text>
          {tx.pending && (
            <View style={s.pendingBadge}>
              <Feather name="clock" size={10} color="#F59E0B" />
              <Text style={s.pendingText}>Pending</Text>
            </View>
          )}
        </View>
        <Text style={s.txSub} numberOfLines={1}>
          {formatShortDate(tx.date)} · {(tx.categoryDetailed ?? tx.category).replaceAll("_", " ").toLowerCase()}
        </Text>
      </View>
      <Text style={[s.txAmount, { color: amountColor }]}>
        {sign}{formatCurrencyExact(Math.abs(tx.amount))}
      </Text>
    </View>
  );
}

function TransactionsTab({ accountId }: { accountId: string }) {
  const { transactionsByCard, fetchTransactionsForCard } = useFinance();
  const [loading, setLoading] = useState(false);
  const txs = transactionsByCard[accountId] ?? [];

  useEffect(() => {
    if (txs.length === 0) {
      setLoading(true);
      fetchTransactionsForCard(accountId, 90).finally(() => setLoading(false));
    }
  }, [accountId, txs.length, fetchTransactionsForCard]);

  const groups = useMemo(() => groupTransactions(txs), [txs]);

  if (loading && txs.length === 0) {
    return (
      <View style={s.tabBody}>
        <View style={s.loadingBlock}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={s.loadingText}>Loading transactions…</Text>
        </View>
      </View>
    );
  }

  if (txs.length === 0) {
    return (
      <View style={s.tabBody}>
        <View style={s.empty}>
          <Feather name="inbox" size={28} color={Colors.textMuted} />
          <Text style={s.emptyTitle}>No transactions yet</Text>
          <Text style={s.emptyBody}>
            Plaid will send transactions for this card within a few minutes of linking.
            Pull to refresh, or come back later.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.tabBody}>
      {groups.map((g) => (
        <View key={g.label} style={s.txGroup}>
          <Text style={s.txGroupLabel}>{g.label}</Text>
          <View style={s.card}>
            {g.items.map((t, i) => (
              <React.Fragment key={t.id}>
                {i > 0 && <View style={s.txDivider} />}
                <TransactionRow tx={t} />
              </React.Fragment>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Rewards tab ──────────────────────────────────────────────────────────────

type ManualRewards = {
  unit: RewardUnit;
  baseRate: number;
  rules: RewardRule[];
};

function manualKey(accountId: string) {
  return `cardbridge.rewards.${accountId}`;
}

function defaultManualRewards(): ManualRewards {
  return {
    unit: "cashback_pct",
    baseRate: 1,
    rules: ALL_CATEGORIES.filter((c) => c !== "OTHER").map((category) => ({
      category,
      multiplier: 1,
    })),
  };
}

function ManualEntryForm({
  manual,
  onChange,
  onSave,
}: {
  manual: ManualRewards;
  onChange: (next: ManualRewards) => void;
  onSave: () => void;
}) {
  const updateRule = (cat: RewardCategory, value: string) => {
    const n = parseFloat(value) || 0;
    onChange({
      ...manual,
      rules: manual.rules.map((r) =>
        r.category === cat ? { ...r, multiplier: n } : r,
      ),
    });
  };

  return (
    <View style={s.card}>
      <Text style={s.sectionTitle}>Set your reward rates</Text>
      <Text style={s.hint}>
        Enter your card's earn rate per category. We'll use this to estimate rewards from your
        transactions.
      </Text>

      <View style={s.unitRow}>
        <Pressable
          onPress={() => onChange({ ...manual, unit: "cashback_pct" })}
          style={[s.unitBtn, manual.unit === "cashback_pct" && s.unitBtnActive]}
        >
          <Text style={[s.unitBtnText, manual.unit === "cashback_pct" && s.unitBtnTextActive]}>
            % Cash Back
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onChange({ ...manual, unit: "points" })}
          style={[s.unitBtn, manual.unit === "points" && s.unitBtnActive]}
        >
          <Text style={[s.unitBtnText, manual.unit === "points" && s.unitBtnTextActive]}>
            x Points
          </Text>
        </Pressable>
      </View>

      {manual.rules.map((r) => (
        <View key={r.category} style={s.manualRow}>
          <Text style={s.manualLabel}>{REWARD_CATEGORY_LABEL[r.category]}</Text>
          <View style={s.manualInputWrap}>
            <TextInput
              style={s.manualInput}
              value={String(r.multiplier)}
              onChangeText={(v) => updateRule(r.category, v)}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={s.manualUnit}>{manual.unit === "points" ? "x" : "%"}</Text>
          </View>
        </View>
      ))}

      <View style={s.manualRow}>
        <Text style={[s.manualLabel, { color: Colors.textPrimary }]}>Everything else</Text>
        <View style={s.manualInputWrap}>
          <TextInput
            style={s.manualInput}
            value={String(manual.baseRate)}
            onChangeText={(v) => onChange({ ...manual, baseRate: parseFloat(v) || 0 })}
            keyboardType="decimal-pad"
          />
          <Text style={s.manualUnit}>{manual.unit === "points" ? "x" : "%"}</Text>
        </View>
      </View>

      <Pressable
        onPress={onSave}
        style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.85 }]}
      >
        <Feather name="check" size={15} color="#fff" />
        <Text style={s.saveBtnText}>Save Rates</Text>
      </Pressable>
    </View>
  );
}

function RewardsTab({ card }: { card: PlaidCreditCard }) {
  const { transactionsByCard, fetchTransactionsForCard } = useFinance();
  const [manual, setManual] = useState<ManualRewards | null>(null);
  const [editingManual, setEditingManual] = useState(false);
  const [loading, setLoading] = useState(true);

  const detected = useMemo(
    () => detectCardSpec(card.name, card.institutionName),
    [card.name, card.institutionName],
  );

  // Load manual rates for unrecognized cards (or null for known ones).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (detected) {
        if (!cancelled) setLoading(false);
        return;
      }
      const stored = await secureGet(manualKey(card.accountId));
      if (cancelled) return;
      if (stored) {
        try {
          setManual(JSON.parse(stored));
        } catch {
          setManual(defaultManualRewards());
        }
      } else {
        setManual(defaultManualRewards());
        setEditingManual(true); // first time → start in edit mode
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [detected, card.accountId]);

  // Make sure we have transactions to compute against.
  useEffect(() => {
    if (!transactionsByCard[card.accountId]) {
      fetchTransactionsForCard(card.accountId, 30);
    }
  }, [card.accountId, transactionsByCard, fetchTransactionsForCard]);

  const txs = transactionsByCard[card.accountId] ?? [];
  const breakdown = useMemo(
    () => calculateRewards(detected, manual, txs),
    [detected, manual, txs],
  );

  const saveManual = useCallback(async () => {
    if (!manual) return;
    await secureSet(manualKey(card.accountId), JSON.stringify(manual));
    setEditingManual(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [manual, card.accountId]);

  if (loading) {
    return (
      <View style={s.tabBody}>
        <View style={s.loadingBlock}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </View>
    );
  }

  // Unrecognized card flow
  if (!detected) {
    if (!manual) return null;
    return (
      <View style={s.tabBody}>
        {editingManual ? (
          <ManualEntryForm manual={manual} onChange={setManual} onSave={saveManual} />
        ) : (
          <RewardsBreakdownView
            card={card}
            spec={null}
            unit={manual.unit}
            breakdown={breakdown}
            onEdit={() => setEditingManual(true)}
          />
        )}
      </View>
    );
  }

  return (
    <View style={s.tabBody}>
      <RewardsBreakdownView
        card={card}
        spec={detected}
        unit={detected.unit}
        breakdown={breakdown}
      />
    </View>
  );
}

function RewardsBreakdownView({
  card,
  spec,
  unit,
  breakdown,
  onEdit,
}: {
  card: PlaidCreditCard;
  spec: CardSpec | null;
  unit: RewardUnit;
  breakdown: ReturnType<typeof calculateRewards>;
  onEdit?: () => void;
}) {
  const formatEarned = (n: number) =>
    unit === "points" ? `${Math.round(n).toLocaleString()} pts` : formatCurrencyExact(n);

  const sortedCats = ALL_CATEGORIES.filter(
    (cat) => breakdown.byCategory[cat].spend > 0,
  ).sort((a, b) => breakdown.byCategory[b].earned - breakdown.byCategory[a].earned);

  const recognizedHeader = spec ? (
    <View style={s.card}>
      <View style={s.recognizedRow}>
        <View style={s.recognizedIcon}>
          <Feather name="check-circle" size={16} color="#4ADEAA" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.recognizedTitle}>{spec.displayName}</Text>
          <Text style={s.recognizedSub}>{spec.description}</Text>
        </View>
      </View>
      {spec.notes?.map((note, i) => (
        <View key={i} style={s.noteRow}>
          <Feather name="info" size={11} color={Colors.textMuted} />
          <Text style={s.noteText}>{note}</Text>
        </View>
      ))}
    </View>
  ) : null;

  const customHeader = !spec ? (
    <View style={s.card}>
      <View style={s.recognizedRow}>
        <View style={[s.recognizedIcon, { backgroundColor: "rgba(245,158,11,0.15)", borderColor: "rgba(245,158,11,0.35)" }]}>
          <Feather name="edit-2" size={14} color="#F59E0B" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.recognizedTitle}>Custom rates</Text>
          <Text style={s.recognizedSub}>
            We didn't recognize {card.name}. You're using rates you entered manually.
          </Text>
        </View>
        {onEdit && (
          <Pressable onPress={onEdit} hitSlop={12}>
            <Feather name="edit-3" size={16} color={Colors.primary} />
          </Pressable>
        )}
      </View>
    </View>
  ) : null;

  return (
    <>
      {recognizedHeader}
      {customHeader}

      <View style={s.card}>
        <Text style={s.sectionTitle}>Estimated this period</Text>
        <Text style={s.bigBalance}>{formatEarned(breakdown.totalEarned)}</Text>
        <Text style={s.estSub}>
          From {formatCurrencyExact(breakdown.totalSpend)} of spend (last 30 days)
        </Text>
      </View>

      {sortedCats.length > 0 ? (
        <View style={s.card}>
          <Text style={s.sectionTitle}>By category</Text>
          {sortedCats.map((cat, i) => {
            const b = breakdown.byCategory[cat];
            return (
              <React.Fragment key={cat}>
                {i > 0 && <View style={s.rowDivider} />}
                <View style={s.catRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.catLabel}>{REWARD_CATEGORY_LABEL[cat]}</Text>
                    <Text style={s.catSub}>
                      {formatCurrencyExact(b.spend)} spent · {b.multiplier}
                      {unit === "points" ? "x" : "%"}
                    </Text>
                  </View>
                  <Text style={s.catEarned}>{formatEarned(b.earned)}</Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.hint}>
            No qualifying transactions in the last 30 days yet. Once spending shows up here,
            we'll calculate your earnings.
          </Text>
        </View>
      )}
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CardDetailScreen() {
  const insets = useSafeAreaInsets();
  const { effectiveBgStart, effectiveBgEnd } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const accountId = typeof params.id === "string" ? params.id : null;
  const { plaidCards } = useFinance();
  const [tab, setTab] = useState<TabKey>("Overview");

  const card = useMemo(
    () => plaidCards.find((c) => c.accountId === accountId),
    [plaidCards, accountId],
  );

  if (!card) {
    return (
      <LinearGradient colors={[effectiveBgStart, effectiveBgEnd]} style={s.gradient}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
          </Pressable>
          <Text style={s.headerTitle}>Card not found</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={s.empty}>
          <Feather name="credit-card" size={28} color={Colors.textMuted} />
          <Text style={s.emptyTitle}>Card not in your account</Text>
          <Text style={s.emptyBody}>
            This card may have been unlinked. Pull to refresh on the Card List, or link it again.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[effectiveBgStart, effectiveBgEnd]} style={s.gradient}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={s.headerTitle} numberOfLines={1}>{card.name}</Text>
          <Text style={s.headerSub} numberOfLines={1}>
            {card.institutionName}
            {card.mask ? ` · •••• ${card.mask}` : ""}
          </Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <View style={s.tabBar}>
        {TABS.map((t) => (
          <Pressable
            key={t}
            onPress={() => {
              Haptics.selectionAsync();
              setTab(t);
            }}
            style={s.tabBtn}
          >
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>{t}</Text>
            {tab === t && <View style={s.tabIndicator} />}
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {tab === "Overview" && <OverviewTab card={card} />}
        {tab === "Transactions" && <TransactionsTab accountId={card.accountId} />}
        {tab === "Rewards" && <RewardsTab card={card} />}
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  gradient: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: { padding: 4, width: 22 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  tabBtn: { paddingVertical: 14, marginRight: 24 },
  tabLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textMuted,
  },
  tabLabelActive: { color: Colors.textPrimary, fontFamily: "Inter_600SemiBold" },
  tabIndicator: {
    height: 2,
    backgroundColor: Colors.primary,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 1,
  },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  tabBody: { gap: 14 },
  card: {
    backgroundColor: "rgba(28,14,70,0.88)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    padding: 18,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 12,
  },
  bigBalance: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  progressBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 4,
    marginBottom: 6,
  },
  progressFill: { height: 6, borderRadius: 3 },
  utilText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  rowLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted },
  rowValue: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  rowDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginVertical: 4 },
  dueBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginTop: 10,
  },
  dueBannerText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary, flex: 1 },
  txGroup: { gap: 8 },
  txGroupLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  txDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginLeft: 48 },
  txIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(108,158,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  txTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  txTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary, flex: 1 },
  pendingBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.3)",
  },
  pendingText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#F59E0B", letterSpacing: 0.4 },
  txSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  txAmount: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  loadingBlock: { alignItems: "center", paddingVertical: 60, gap: 10 },
  loadingText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },
  empty: { alignItems: "center", paddingVertical: 50, paddingHorizontal: 30, gap: 10 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary, marginTop: 6 },
  emptyBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
  recognizedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  recognizedIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(74,222,170,0.12)",
    borderWidth: 1, borderColor: "rgba(74,222,170,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  recognizedTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  recognizedSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 10 },
  noteText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, flex: 1, lineHeight: 16 },
  estSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  catRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  catLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  catSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  catEarned: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#4ADEAA" },
  hint: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  unitRow: { flexDirection: "row", gap: 8, marginBottom: 16, marginTop: 4 },
  unitBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  unitBtnActive: {
    backgroundColor: "rgba(108,158,255,0.18)",
    borderColor: "rgba(108,158,255,0.4)",
  },
  unitBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },
  unitBtnTextActive: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },
  manualRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  manualLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary, flex: 1 },
  manualInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    width: 96,
  },
  manualInput: {
    flex: 1,
    paddingVertical: 8,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: "right",
  },
  manualUnit: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primaryDark,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 14,
  },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
});
