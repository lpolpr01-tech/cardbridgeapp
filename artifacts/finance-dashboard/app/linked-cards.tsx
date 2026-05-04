import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { apiUrl } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import { useFinance, type Card } from "@/context/FinanceContext";

type EnrichedPlaidAccount = {
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
  cashbackRate: number | null;
  cashbackTotal: number | null;
  pointsTotal: number | null;
};

function formatCurrency(amount: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getDayLabel(day: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = day % 100;
  return day + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getNextDate(day: number): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), day);
  if (target <= now) target.setMonth(target.getMonth() + 1);
  return target.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Synthetic billing dates per local card (matches card-detail screen)
const LOCAL_BILLING: Record<string, { dueDay: number; statementOpen: number; statementClose: number; minPayment: number; apr: number }> = {
  "card-1": { dueDay: 15, statementOpen: 1, statementClose: 30, minPayment: 25, apr: 18.99 },
  "card-2": { dueDay: 20, statementOpen: 5, statementClose: 2, minPayment: 35, apr: 21.49 },
  "card-3": { dueDay: 25, statementOpen: 10, statementClose: 7, minPayment: 20, apr: 16.99 },
};

// ─── Card row ────────────────────────────────────────────────────────────────

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function LocalCardCard({ card }: { card: Card }) {
  const billing = LOCAL_BILLING[card.id] ?? { dueDay: 15, statementOpen: 1, statementClose: 28, minPayment: 25, apr: 19.99 };
  const available = Math.max(0, card.limit - card.balance);
  const usagePct = Math.min((card.balance / card.limit) * 100, 100);

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/card-detail/[id]", params: { id: card.id } })}
      style={({ pressed }) => [s.cardWrap, pressed && { opacity: 0.85 }]}
    >
      <LinearGradient colors={card.color} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cardHero}>
        <View style={s.cardHeroTop}>
          <View>
            <Text style={s.cardName}>{card.name}</Text>
            <Text style={s.cardNumber}>•••• {card.lastFour}</Text>
          </View>
          <View style={s.typePill}>
            <Text style={s.typePillText}>{card.type.toUpperCase()}</Text>
          </View>
        </View>
        <View style={s.cardHeroMid}>
          <Text style={s.balLabel}>Balance</Text>
          <Text style={s.balance}>{formatCurrency(card.balance)}</Text>
        </View>
        <View style={s.progBg}>
          <View style={[s.progFill, { width: `${usagePct}%` as any }]} />
        </View>
      </LinearGradient>

      <View style={s.detailGrid}>
        <DetailRow label="Available Credit" value={formatCurrency(available)} color={Colors.positive} />
        <DetailRow label="Credit Limit" value={formatCurrency(card.limit)} />
        <DetailRow label="APR" value={`${billing.apr.toFixed(2)}%`} />
        <DetailRow label="Min Payment" value={formatCurrency(billing.minPayment)} color={Colors.negative} />
        <DetailRow label="Due Date" value={getNextDate(billing.dueDay)} />
        <DetailRow label="Statement Opens" value={getNextDate(billing.statementOpen)} />
        <DetailRow label="Statement Closes" value={getNextDate(billing.statementClose)} />
        {card.rewards.cashbackRate != null && (
          <DetailRow label="Cashback Rate" value={`${card.rewards.cashbackRate}%`} color={Colors.positive} />
        )}
        {card.rewards.cashbackTotal != null && (
          <DetailRow label="Cashback Earned" value={formatCurrency(card.rewards.cashbackTotal)} color={Colors.positive} />
        )}
        {card.rewards.pointsTotal != null && (
          <DetailRow label="Rewards Points" value={card.rewards.pointsTotal.toLocaleString()} color={Colors.primaryLight} />
        )}
      </View>

      <View style={s.viewBtn}>
        <Text style={s.viewBtnText}>View transactions & rewards</Text>
        <Feather name="arrow-right" size={14} color={Colors.primary} />
      </View>
    </Pressable>
  );
}

function PlaidCardCard({ account }: { account: EnrichedPlaidAccount }) {
  const balance = account.balanceCurrent ?? 0;
  const limit = account.balanceLimit;
  const available = account.balanceAvailable;
  const usagePct = limit ? Math.min((balance / limit) * 100, 100) : 0;
  const cardColor: [string, string] = ["#1E5FAD", "#3E8EDD"];

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/card-detail/[id]", params: { id: account.accountId } })}
      style={({ pressed }) => [s.cardWrap, pressed && { opacity: 0.85 }]}
    >
      <LinearGradient colors={cardColor} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cardHero}>
        <View style={s.cardHeroTop}>
          <View>
            <Text style={s.cardName}>{account.name}</Text>
            <Text style={s.cardNumber}>{account.institutionName}{account.mask ? ` · •••• ${account.mask}` : ""}</Text>
          </View>
          <View style={s.typePill}>
            <Text style={s.typePillText}>{(account.subtype ?? account.type ?? "card").toUpperCase()}</Text>
          </View>
        </View>
        <View style={s.cardHeroMid}>
          <Text style={s.balLabel}>Balance</Text>
          <Text style={s.balance}>{formatCurrency(balance)}</Text>
        </View>
        {limit ? (
          <View style={s.progBg}>
            <View style={[s.progFill, { width: `${usagePct}%` as any }]} />
          </View>
        ) : null}
      </LinearGradient>

      <View style={s.detailGrid}>
        <DetailRow label="Available Credit" value={formatCurrency(available)} color={Colors.positive} />
        <DetailRow label="Credit Limit" value={formatCurrency(limit)} />
        <DetailRow label="APR" value={account.apr != null ? `${account.apr.toFixed(2)}%` : "—"} />
        <DetailRow label="Min Payment" value={formatCurrency(account.minimumPayment)} color={Colors.negative} />
        <DetailRow label="Due Date" value={formatDate(account.nextPaymentDueDate)} />
        <DetailRow label="Statement Opens" value={formatDate(account.lastStatementIssueDate)} />
        {account.cashbackRate != null && (
          <DetailRow label="Cashback Rate" value={`${account.cashbackRate}%`} color={Colors.positive} />
        )}
        {account.cashbackTotal != null && (
          <DetailRow label="Cashback Earned" value={formatCurrency(account.cashbackTotal)} color={Colors.positive} />
        )}
        {account.pointsTotal != null && (
          <DetailRow label="Rewards Points" value={account.pointsTotal.toLocaleString()} color={Colors.primaryLight} />
        )}
      </View>

      <View style={s.viewBtn}>
        <Text style={s.viewBtnText}>View transactions & rewards</Text>
        <Feather name="arrow-right" size={14} color={Colors.primary} />
      </View>
    </Pressable>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function LinkedCardsScreen() {
  const insets = useSafeAreaInsets();
  const { cards } = useFinance();
  const { token: authToken } = useAuth();
  const [plaidAccounts, setPlaidAccounts] = useState<EnrichedPlaidAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/plaid/credit-cards"), {
        method: "GET",
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      if (!res.ok) {
        setError("Could not load linked credit cards.");
        return;
      }
      const data = (await res.json()) as { cards: EnrichedPlaidAccount[] };
      setPlaidAccounts(data.cards ?? []);
    } catch {
      setError("Could not load linked credit cards.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAccounts();
  }, [fetchAccounts]);

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={{ flex: 1 }}
    >
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
          <Text style={s.backText}>Settings</Text>
        </Pressable>
        <Text style={s.title}>Linked Cards</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <Text style={s.intro}>
          {cards.length + plaidAccounts.length} card{cards.length + plaidAccounts.length === 1 ? "" : "s"} linked to your account
        </Text>

        {cards.map((c) => (
          <LocalCardCard key={c.id} card={c} />
        ))}

        {loading && plaidAccounts.length === 0 && (
          <View style={s.loadingBlock}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={s.loadingText}>Loading linked cards…</Text>
          </View>
        )}

        {error && (
          <View style={s.errorBox}>
            <Feather name="alert-circle" size={14} color={Colors.negative} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {plaidAccounts.map((a) => (
          <PlaidCardCard key={a.accountId} account={a} />
        ))}

        {!loading && plaidAccounts.length === 0 && (
          <View style={s.emptyBlock}>
            <Feather name="credit-card" size={28} color={Colors.textMuted} />
            <Text style={s.emptyTitle}>No bank-linked credit cards yet</Text>
            <Text style={s.emptyText}>
              Add a credit card via Plaid Link from Settings to see live balances, APR, and statement dates here.
            </Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, width: 80 },
  backText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textPrimary },
  title: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  intro: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 16,
  },
  cardWrap: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 12,
    marginBottom: 14,
    overflow: "hidden",
  },
  cardHero: {
    borderRadius: 14,
    padding: 16,
    minHeight: 130,
    overflow: "hidden",
    marginBottom: 12,
  },
  cardHeroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff", marginBottom: 3 },
  cardNumber: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.7)" },
  typePill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typePillText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: "#fff",
    letterSpacing: 0.8,
  },
  cardHeroMid: { paddingVertical: 10 },
  balLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  balance: { fontFamily: "Inter_700Bold", fontSize: 24, color: "#fff", letterSpacing: -0.5 },
  progBg: { height: 3, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, overflow: "hidden" },
  progFill: { height: 3, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 2 },
  detailGrid: { gap: 8, paddingHorizontal: 4, paddingTop: 4 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  detailLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  detailValue: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: "rgba(108,158,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(108,158,255,0.2)",
  },
  viewBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.primary },
  loadingBlock: { alignItems: "center", gap: 8, paddingVertical: 24 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,107,138,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,107,138,0.25)",
    padding: 12,
    marginBottom: 14,
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.negative },
  emptyBlock: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
