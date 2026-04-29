import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useFinance } from "@/context/FinanceContext";
import type { CardRewards } from "@/context/FinanceContext";
import { SUBSCRIPTIONS, CARD_COLORS } from "@/constants/subscriptions";

// ─── Merchant logo / emoji helpers ────────────────────────────────────────────

const MERCHANT_DOMAINS: Record<string, string> = {
  Netflix: "netflix.com",
  Amazon: "amazon.com",
  Spotify: "spotify.com",
  Apple: "apple.com",
  YouTube: "youtube.com",
  Starbucks: "starbucks.com",
  Walmart: "walmart.com",
  Uber: "uber.com",
  DoorDash: "doordash.com",
  GitHub: "github.com",
  Xbox: "xbox.com",
};

const CATEGORY_EMOJI: Record<string, string> = {
  Entertainment: "🎬",
  "Food & Drink": "☕",
  Food: "☕",
  Dining: "☕",
  Groceries: "🛒",
  Transport: "🚗",
  Shopping: "🛍️",
  Income: "💰",
  Gaming: "🎮",
  Developer: "💻",
  Healthcare: "🏥",
  Health: "🏥",
  Travel: "✈️",
  Music: "🎵",
  Video: "📺",
  Storage: "☁️",
  Creative: "🎨",
  News: "📰",
  Education: "🦉",
  Security: "🔑",
  Other: "💳",
};

const CANCEL_URLS: Record<string, string> = {
  Netflix: "https://www.netflix.com/cancelplan",
  Spotify: "https://www.spotify.com/account/subscription/cancel",
  "Amazon Prime": "https://www.amazon.com/mc/optOutEligibility",
  "YouTube Premium": "https://myaccount.google.com/payments-and-subscriptions",
  "Xbox Game Pass": "https://account.microsoft.com/services",
  "GitHub Pro": "https://github.com/settings/billing",
};

function getCancelUrl(name: string): string {
  if (CANCEL_URLS[name]) return CANCEL_URLS[name];
  return `https://www.google.com/search?q=cancel+${encodeURIComponent(name)}+subscription`;
}

function MerchantLogo({ title, category, icon }: { title: string; category: string; icon: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const domain = Object.entries(MERCHANT_DOMAINS).find(
    ([key]) => title.toLowerCase().includes(key.toLowerCase())
  )?.[1];
  const emoji = icon || CATEGORY_EMOJI[category] || "💳";

  if (domain && !imgFailed) {
    return (
      <View style={txp.txIcon}>
        <Image
          source={{ uri: `https://logo.clearbit.com/${domain}` }}
          style={{ width: 22, height: 22, borderRadius: 4 }}
          onError={() => setImgFailed(true)}
        />
      </View>
    );
  }
  return (
    <View style={txp.txIcon}>
      <Text style={{ fontSize: 17 }}>{emoji}</Text>
    </View>
  );
}

const { width } = Dimensions.get("window");
const PANEL_WIDTH = width - 40;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

// ─── Mock billing data per card ───────────────────────────────────────────────

type BillingInfo = {
  dueDay: number;
  statementOpen: number;
  statementClose: number;
  minPayment: number;
};

const BILLING_DATA: Record<string, BillingInfo> = {
  "card-1": { dueDay: 15, statementOpen: 1,  statementClose: 30, minPayment: 25 },
  "card-2": { dueDay: 20, statementOpen: 5,  statementClose: 2,  minPayment: 35 },
  "card-3": { dueDay: 25, statementOpen: 10, statementClose: 7,  minPayment: 20 },
};

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

// ─── Card type badge ──────────────────────────────────────────────────────────

function CardTypeBadge({ type }: { type: "visa" | "mastercard" | "amex" }) {
  const labels: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", amex: "American Express" };
  const colors: Record<string, string> = { visa: "#1A1F71", mastercard: "#EB001B", amex: "#007BC1" };
  return (
    <View style={[styles.typeBadge, { backgroundColor: `${colors[type]}22`, borderColor: `${colors[type]}44` }]}>
      <Text style={[styles.typeBadgeText, { color: colors[type] === "#1A1F71" ? Colors.primaryLight : colors[type] }]}>
        {labels[type]}
      </Text>
    </View>
  );
}

// ─── Rewards panel ────────────────────────────────────────────────────────────

function RewardsPanel({ rewards }: { rewards: CardRewards }) {
  const threshold = rewards.type === "points" || rewards.type === "both" ? 10000 : 100;
  const earned = rewards.cashbackTotal ?? (rewards.pointsTotal ? rewards.pointsTotal / 100 : 0);
  const progressPct = Math.min((earned / threshold) * 100, 100);

  return (
    <View style={styles.infoPage}>
      <View style={styles.rewardsPanelHeader}>
        <Feather name="gift" size={16} color={Colors.primary} />
        <Text style={styles.rewardsPanelTitle}>Rewards & Benefits</Text>
      </View>
      <Text style={styles.rewardsDescription}>{rewards.description}</Text>

      <View style={rwdS.summaryBanner}>
        <View style={rwdS.summaryTop}>
          <Text style={rwdS.summaryLabel}>Rewards Progress</Text>
          <Text style={rwdS.summaryPct}>{Math.round(progressPct)}%</Text>
        </View>
        <View style={rwdS.progTrack}>
          <View style={[rwdS.progFill, { width: `${progressPct}%` as any, backgroundColor: Colors.primary }]} />
        </View>
        <Text style={rwdS.summaryHint}>
          {progressPct >= 100
            ? "🎉 Threshold reached — reward available!"
            : `${(threshold - earned).toFixed(rewards.type === "points" || rewards.type === "both" ? 0 : 2)} more to reach next reward`}
        </Text>
      </View>

      <View style={styles.rewardsGrid}>
        {(rewards.type === "cashback" || rewards.type === "both") && (
          <View style={styles.rewardBox}>
            <View style={styles.rewardBoxIcon}>
              <Feather name="percent" size={16} color={Colors.positive} />
            </View>
            <Text style={styles.rewardBoxLabel}>Cash Back Rate</Text>
            <Text style={[styles.rewardBoxValue, { color: Colors.positive }]}>{rewards.cashbackRate}%</Text>
            <Text style={styles.rewardBoxSub}>Per purchase</Text>
          </View>
        )}
        {(rewards.type === "cashback" || rewards.type === "both") && rewards.cashbackTotal !== undefined && (
          <View style={styles.rewardBox}>
            <View style={[styles.rewardBoxIcon, { backgroundColor: "rgba(74,222,170,0.12)" }]}>
              <Feather name="dollar-sign" size={16} color={Colors.positive} />
            </View>
            <Text style={styles.rewardBoxLabel}>Total Earned</Text>
            <Text style={[styles.rewardBoxValue, { color: Colors.positive }]}>{formatCurrency(rewards.cashbackTotal)}</Text>
            <Text style={styles.rewardBoxSub}>Cash back</Text>
          </View>
        )}
        {(rewards.type === "points" || rewards.type === "both") && (
          <View style={styles.rewardBox}>
            <View style={[styles.rewardBoxIcon, { backgroundColor: "rgba(168,200,255,0.12)" }]}>
              <Feather name="zap" size={16} color={Colors.primaryLight} />
            </View>
            <Text style={styles.rewardBoxLabel}>Points Rate</Text>
            <Text style={[styles.rewardBoxValue, { color: Colors.primaryLight }]}>{rewards.pointsRate}x</Text>
            <Text style={styles.rewardBoxSub}>Per dollar</Text>
          </View>
        )}
        {(rewards.type === "points" || rewards.type === "both") && rewards.pointsTotal !== undefined && (
          <View style={styles.rewardBox}>
            <View style={[styles.rewardBoxIcon, { backgroundColor: "rgba(168,200,255,0.12)" }]}>
              <Feather name="award" size={16} color={Colors.primaryLight} />
            </View>
            <Text style={styles.rewardBoxLabel}>Total Points</Text>
            <Text style={[styles.rewardBoxValue, { color: Colors.primaryLight }]}>{rewards.pointsTotal.toLocaleString()}</Text>
            <Text style={styles.rewardBoxSub}>Points earned</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Billing panel ────────────────────────────────────────────────────────────

function getUrgencyStyle(daysUntil: number): { color: string; label: string; bg: string } {
  if (daysUntil < 0) return { color: "#FF2D55", label: "OVERDUE", bg: "rgba(255,45,85,0.15)" };
  if (daysUntil <= 2) return { color: "#FF2D55", label: `${daysUntil}d left`, bg: "rgba(255,45,85,0.12)" };
  if (daysUntil <= 6) return { color: "#F59E0B", label: `${daysUntil}d left`, bg: "rgba(245,158,11,0.12)" };
  return { color: "#4ADEAA", label: `${daysUntil}d`, bg: "rgba(74,222,170,0.12)" };
}

function getDaysUntil(day: number): number {
  const now = new Date();
  const today = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (day >= today) return day - today;
  return daysInMonth - today + day;
}

function BillingPanel({ cardId, balance }: { cardId: string; balance: number }) {
  const info = BILLING_DATA[cardId] ?? { dueDay: 15, statementOpen: 1, statementClose: 28, minPayment: 25 };

  const dueDate = getNextDate(info.dueDay);
  const openDate = getNextDate(info.statementOpen);
  const closeDate = getNextDate(info.statementClose);
  const daysUntilDue = getDaysUntil(info.dueDay);
  const urgency = getUrgencyStyle(daysUntilDue);

  const billingItems = [
    {
      icon: "alert-circle" as const,
      label: "Payment Due",
      value: dueDate,
      sub: `${getDayLabel(info.dueDay)} of each month`,
      color: Colors.negative,
      bg: "rgba(255,107,138,0.1)",
      border: "rgba(255,107,138,0.2)",
    },
    {
      icon: "calendar" as const,
      label: "Statement Opens",
      value: openDate,
      sub: `${getDayLabel(info.statementOpen)} of each month`,
      color: Colors.primary,
      bg: "rgba(108,158,255,0.1)",
      border: "rgba(108,158,255,0.2)",
    },
    {
      icon: "check-square" as const,
      label: "Statement Closes",
      value: closeDate,
      sub: `${getDayLabel(info.statementClose)} of each month`,
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.1)",
      border: "rgba(245,158,11,0.2)",
    },
    {
      icon: "credit-card" as const,
      label: "Minimum Payment",
      value: formatCurrency(info.minPayment),
      sub: "Due by payment date",
      color: Colors.positive,
      bg: "rgba(74,222,170,0.1)",
      border: "rgba(74,222,170,0.2)",
    },
  ];

  return (
    <View style={styles.infoPage}>
      <View style={[styles.rewardsPanelHeader, { justifyContent: "space-between" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name="calendar" size={16} color={Colors.primary} />
          <Text style={styles.rewardsPanelTitle}>Billing Dates</Text>
        </View>
        <View style={[bill.urgencyBadge, { backgroundColor: urgency.bg }]}>
          <View style={[bill.urgencyDot, { backgroundColor: urgency.color }]} />
          <Text style={[bill.urgencyText, { color: urgency.color }]}>{urgency.label}</Text>
        </View>
      </View>

      <View style={bill.grid}>
        {billingItems.map((item) => (
          <View key={item.label} style={[bill.card, { backgroundColor: item.bg, borderColor: item.border }]}>
            <View style={[bill.iconWrap, { backgroundColor: item.bg }]}>
              <Feather name={item.icon} size={16} color={item.color} />
            </View>
            <Text style={bill.itemLabel}>{item.label}</Text>
            <Text style={[bill.itemValue, { color: item.color }]}>{item.value}</Text>
            <Text style={bill.itemSub}>{item.sub}</Text>
          </View>
        ))}
      </View>

      <View style={bill.currentBalance}>
        <Text style={bill.cbLabel}>Current Statement Balance</Text>
        <Text style={bill.cbValue}>{formatCurrency(balance)}</Text>
      </View>
    </View>
  );
}

// ─── Subscriptions panel ──────────────────────────────────────────────────────

function SubscriptionsPanel({ cardId }: { cardId: string }) {
  const cardColor = CARD_COLORS[cardId] || Colors.primary;
  const subs = SUBSCRIPTIONS.filter((s) => s.cardId === cardId);
  const total = subs.reduce((sum, s) => sum + s.amount, 0);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <View style={[styles.infoPage, { gap: 10 }]}>
      <View style={styles.rewardsPanelHeader}>
        <Feather name="repeat" size={16} color={cardColor} />
        <Text style={styles.rewardsPanelTitle}>Subscriptions</Text>
      </View>

      {subs.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <Feather name="inbox" size={28} color={Colors.textMuted} />
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, marginTop: 8 }}>
            No subscriptions on this card
          </Text>
        </View>
      ) : (
        <>
          <View style={[subPnl.totalRow, { borderColor: `${cardColor}30` }]}>
            <Text style={subPnl.totalLabel}>Monthly Total</Text>
            <Text style={[subPnl.totalAmt, { color: cardColor }]}>
              ${total.toFixed(2)}<Text style={subPnl.mo}>/mo</Text>
            </Text>
          </View>
          {subs.map((sub, i) => (
            <View key={sub.id}>
              <View style={[subPnl.row, { borderLeftColor: cardColor }]}>
                <View style={[subPnl.iconWrap, { backgroundColor: `${cardColor}20` }]}>
                  <Text style={subPnl.icon}>{sub.icon}</Text>
                </View>
                <View style={subPnl.info}>
                  <Text style={subPnl.name}>{sub.name}</Text>
                  <Text style={subPnl.category}>{sub.category} · {sub.cycle}</Text>
                  <Text style={subPnl.nextDate}>Next {formatDate(sub.nextDate)}</Text>
                </View>
                <View style={subPnl.right}>
                  <Text style={subPnl.amount}>${sub.amount.toFixed(2)}</Text>
                  <Pressable
                    onPress={() => Linking.openURL(getCancelUrl(sub.name))}
                    style={({ pressed }) => [subPnl.cancelBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={subPnl.cancelText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
              {i < subs.length - 1 && <View style={subPnl.sep} />}
            </View>
          ))}
          <View style={subPnl.disclaimer}>
            <Feather name="info" size={11} color={Colors.textMuted} />
            <Text style={subPnl.disclaimerText}>
              CardFlow does not cancel subscriptions on your behalf. You will be redirected to the provider's official cancellation page.
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

// ─── Donut chart (dot-ring style) ────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#FF6B8A",
  Shopping: "#6C9EFF",
  Travel: "#4ADEAA",
  Transport: "#F59E0B",
  Entertainment: "#C084FC",
  Healthcare: "#34D399",
  Income: "#F472B6",
  Other: "#94A3B8",
};

function getCategoryGroup(cat: string): string {
  const map: Record<string, string> = {
    "Groceries": "Food",
    "Food & Drink": "Food",
    "Entertainment": "Entertainment",
    "Shopping": "Shopping",
    "Travel": "Travel",
    "Transport": "Transport",
    "Health": "Healthcare",
    "Insurance": "Other",
    "Income": "Income",
    "Electronics": "Shopping",
    "Home": "Other",
    "Utilities": "Other",
    "Dining": "Food",
    "Subscriptions": "Other",
  };
  return map[cat] || "Other";
}

type CatSlice = { label: string; value: number; pct: number; color: string };

function buildCategoryData(transactions: { type: string; category: string; amount: number }[]): CatSlice[] {
  const debits = transactions.filter((t) => t.type === "debit");
  const totals: Record<string, number> = {};
  for (const t of debits) {
    const g = getCategoryGroup(t.category);
    totals[g] = (totals[g] ?? 0) + Math.abs(t.amount);
  }
  const total = Object.values(totals).reduce((s, v) => s + v, 0);
  if (total === 0) return [];
  return Object.entries(totals)
    .map(([label, value]) => ({ label, value, pct: value / total, color: CATEGORY_COLORS[label] || "#94A3B8" }))
    .sort((a, b) => b.value - a.value);
}

function DonutChart({ slices, size = 170 }: { slices: CatSlice[]; size?: number }) {
  const DOT_COUNT = 60;
  const DOT_R = size / 2 - 16;
  const DOT_SIZE = 5;

  const dots: string[] = [];
  for (const sl of slices) {
    const count = Math.round(sl.pct * DOT_COUNT);
    for (let i = 0; i < count; i++) dots.push(sl.color);
  }
  while (dots.length < DOT_COUNT) dots.push(slices[slices.length - 1]?.color || Colors.divider);
  const trimmed = dots.slice(0, DOT_COUNT);

  const topCat = slices[0];

  return (
    <View style={{ alignItems: "center", gap: 16 }}>
      <View style={{ width: size, height: size }}>
        {trimmed.map((color, i) => {
          const angle = ((i * 360) / DOT_COUNT - 90) * (Math.PI / 180);
          const x = size / 2 + DOT_R * Math.cos(angle) - DOT_SIZE / 2;
          const y = size / 2 + DOT_R * Math.sin(angle) - DOT_SIZE / 2;
          return (
            <View
              key={i}
              style={{
                position: "absolute", left: x, top: y,
                width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2,
                backgroundColor: color, opacity: 0.92,
              }}
            />
          );
        })}
        <View
          style={{
            position: "absolute",
            left: 28, top: 28, right: 28, bottom: 28,
            borderRadius: (size - 56) / 2,
            backgroundColor: Colors.background,
            alignItems: "center", justifyContent: "center",
          }}
        >
          {topCat ? (
            <>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff" }}>{topCat.label}</Text>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 18, color: topCat.color, marginTop: 2 }}>
                {Math.round(topCat.pct * 100)}%
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 1 }}>
                top spend
              </Text>
            </>
          ) : (
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted }}>No data</Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 8, justifyContent: "center" }}>
        {slices.slice(0, 6).map((sl) => (
          <View key={sl.label} style={{ flexDirection: "row", alignItems: "center", gap: 6, minWidth: "42%" }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sl.color }} />
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, flex: 1 }}>
              {sl.label}
            </Text>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textPrimary }}>
              {Math.round(sl.pct * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Transactions tab panel ───────────────────────────────────────────────────

const TX_PENDING_CUTOFF = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

function TransactionsPanel({ cardId }: { cardId: string }) {
  const { transactions } = useFinance();
  const cardTxs = transactions.filter((t) => t.cardId === cardId);
  const [txStatus, setTxStatus] = useState<"pending" | "posted">("posted");

  const swipeRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 10,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -15) setTxStatus("posted");
        else if (gs.dx > 15) setTxStatus("pending");
      },
    })
  ).current;

  const slices = buildCategoryData(cardTxs);

  const shown = cardTxs
    .filter((t) => {
      const d = new Date(t.date);
      return txStatus === "pending" ? d >= TX_PENDING_CUTOFF : d < TX_PENDING_CUTOFF;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <View style={[styles.infoPage, { paddingTop: 20 }]}>
      {slices.length > 0 ? (
        <>
          <Text style={txp.chartTitle}>Spending by Category</Text>
          <DonutChart slices={slices} />
        </>
      ) : (
        <View style={txp.emptyChart}>
          <Feather name="pie-chart" size={28} color={Colors.textMuted} />
          <Text style={txp.emptyText}>No spending data yet</Text>
        </View>
      )}

      <View style={txp.divider} />

      <View style={txp.toggleRow} {...swipeRef.panHandlers}>
        <Text style={txp.toggleLabel}>Transactions</Text>
        <View style={txp.toggle}>
          {(["pending", "posted"] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => setTxStatus(s)}
              style={[txp.toggleBtn, txStatus === s && txp.toggleBtnActive]}
            >
              {s === "pending" && (
                <View style={[txp.dot, { backgroundColor: txStatus === "pending" ? "#F59E0B" : Colors.textMuted }]} />
              )}
              <Text style={[txp.toggleText, txStatus === s && txp.toggleTextActive]}>
                {s === "pending" ? "Pending" : "Posted"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {shown.length === 0 ? (
        <View style={txp.emptyList}>
          <Feather name="inbox" size={22} color={Colors.textMuted} />
          <Text style={txp.emptyText}>
            No {txStatus} transactions
          </Text>
        </View>
      ) : (
        shown.map((t, i) => (
          <View key={t.id} style={[txp.txRow, i < shown.length - 1 && txp.txBorder]}>
            <MerchantLogo title={t.title} category={t.category} icon={t.icon} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={txp.txTitle} numberOfLines={1} ellipsizeMode="tail">{t.title}</Text>
              <Text style={txp.txCat} numberOfLines={1}>{t.category} · {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Text>
            </View>
            <Text style={[txp.txAmt, { color: t.type === "credit" ? Colors.positive : Colors.negative, flexShrink: 0 }]}>
              {t.type === "credit" ? "+" : "-"}{formatCurrency(Math.abs(t.amount))}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const txp = StyleSheet.create({
  chartTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary, textAlign: "center", marginBottom: 16 },
  emptyChart: { alignItems: "center", gap: 8, paddingVertical: 24 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 20 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  toggleLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  toggle: {
    flexDirection: "row", gap: 3,
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16, padding: 3,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 13 },
  toggleBtnActive: { backgroundColor: Colors.primaryDark },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  toggleText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textMuted },
  toggleTextActive: { color: "#fff" },
  emptyList: { alignItems: "center", gap: 8, paddingVertical: 20 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted },
  txRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  txBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  txIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  txTitle: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textPrimary },
  txCat: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  txAmt: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
});

// ─── Horizontally scrollable info panel ──────────────────────────────────────

const TAB_ICONS: Record<number, any> = { 0: "gift", 1: "calendar", 2: "repeat", 3: "activity" };

function CardInfoScroll({ rewards, cardId, balance }: { rewards: CardRewards; cardId: string; balance: number }) {
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newPage = Math.round(e.nativeEvent.contentOffset.x / PANEL_WIDTH);
    setPage(newPage);
  };

  const tabs = ["Rewards & Benefits", "Billing Dates", "Subscriptions", "Transactions"];

  return (
    <View style={styles.infoScrollWrap}>
      {/* Tab pills */}
      <View style={[styles.tabRow, { flexWrap: "wrap" }]}>
        {tabs.map((tab, i) => (
          <Pressable
            key={tab}
            onPress={() => {
              setPage(i);
              scrollRef.current?.scrollTo({ x: i * PANEL_WIDTH, animated: true });
            }}
            style={[styles.tabPill, page === i && styles.tabPillActive]}
          >
            <Feather
              name={TAB_ICONS[i]}
              size={12}
              color={page === i ? "#fff" : Colors.textMuted}
            />
            <Text style={[styles.tabText, page === i && styles.tabTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      {/* Scrollable content */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        style={{ width: PANEL_WIDTH }}
      >
        <RewardsPanel rewards={rewards} />
        <BillingPanel cardId={cardId} balance={balance} />
        <SubscriptionsPanel cardId={cardId} />
        <TransactionsPanel cardId={cardId} />
      </ScrollView>

      {/* Page dots */}
      <View style={styles.pageDots}>
        {tabs.map((_, i) => (
          <View key={i} style={[styles.pageDot, page === i && styles.pageDotActive]} />
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { cards, transactions } = useFinance();

  const card = cards.find((c) => c.id === id);
  const cardTransactions = transactions.filter((t) => t.cardId === id);
  const totalSpent = cardTransactions.filter((t) => t.type === "debit").reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalIncome = cardTransactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);

  if (!card) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Card not found</Text>
      </View>
    );
  }

  const usagePct = Math.min((card.balance / card.limit) * 100, 100);

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.gradient}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
            <Text style={styles.backText}>Cards</Text>
          </Pressable>
        </View>

        <LinearGradient
          colors={card.color as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroName}>{card.name}</Text>
              <Text style={styles.heroNumber}>•••• •••• •••• {card.lastFour}</Text>
            </View>
            <CardTypeBadge type={card.type} />
          </View>

          <View style={styles.heroMid}>
            <Text style={styles.heroBalLabel}>Current Balance</Text>
            <Text style={styles.heroBal}>{formatCurrency(card.balance)}</Text>
          </View>

          <View>
            <View style={styles.heroLimitRow}>
              <Text style={styles.heroLimitText}>Credit limit: {formatCurrency(card.limit)}</Text>
              <Text style={styles.heroLimitText}>{usagePct.toFixed(0)}% used</Text>
            </View>
            <View style={styles.heroProg}>
              <View style={[styles.heroProgFill, { width: `${usagePct}%` as any }]} />
            </View>
          </View>

          <View style={styles.heroShimmer1} />
          <View style={styles.heroShimmer2} />
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Spent</Text>
            <Text style={[styles.statValue, { color: Colors.negative }]}>-{formatCurrency(totalSpent)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total In</Text>
            <Text style={[styles.statValue, { color: Colors.positive }]}>+{formatCurrency(totalIncome)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Transactions</Text>
            <Text style={styles.statValue}>{cardTransactions.length}</Text>
          </View>
        </View>

        {/* Horizontally scrollable info: Rewards, Billing, Subscriptions, Transactions */}
        <CardInfoScroll rewards={card.rewards} cardId={card.id} balance={card.balance} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  list: { paddingHorizontal: 0 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  backText: { fontFamily: "Inter_500Medium", fontSize: 16, color: Colors.textPrimary },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },
  notFoundText: { fontFamily: "Inter_500Medium", fontSize: 16, color: Colors.textSecondary },
  heroCard: {
    marginHorizontal: 20, borderRadius: 22, padding: 24, minHeight: 200,
    overflow: "hidden", justifyContent: "space-between", marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 12,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroName: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff", marginBottom: 4 },
  heroNumber: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.65)", letterSpacing: 1.5 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  typeBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  heroMid: { paddingVertical: 8 },
  heroBalLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  heroBal: { fontFamily: "Inter_700Bold", fontSize: 36, color: "#fff", letterSpacing: -1 },
  heroLimitRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  heroLimitText: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.55)" },
  heroProg: { height: 4, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, overflow: "hidden" },
  heroProgFill: { height: 4, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 2 },
  heroShimmer1: { position: "absolute", width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.06)", right: -20, top: -30 },
  heroShimmer2: { position: "absolute", width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.04)", left: 20, bottom: -25 },
  statsRow: {
    flexDirection: "row", marginHorizontal: 20, marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16, borderWidth: 1, borderColor: Colors.divider, paddingVertical: 16,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  statDivider: { width: 1, backgroundColor: Colors.divider, marginVertical: 4 },

  // Horizontal scroll info container
  infoScrollWrap: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    overflow: "hidden",
  },
  tabRow: {
    flexDirection: "row",
    padding: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  tabPillActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  tabText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
  },
  tabTextActive: { color: "#fff" },
  pageDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.divider,
  },
  pageDotActive: {
    backgroundColor: Colors.primary,
    width: 14,
  },

  // Info pages (both rewards and billing share this)
  infoPage: {
    width: PANEL_WIDTH,
    padding: 14,
    gap: 12,
  },
  rewardsPanelHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  rewardsPanelTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  rewardsDescription: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  rewardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  rewardBox: {
    flex: 1, minWidth: "45%",
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 12, gap: 4,
    borderWidth: 1, borderColor: Colors.divider,
  },
  rewardBoxIcon: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: "rgba(74,222,170,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  rewardBoxLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.7 },
  rewardBoxValue: { fontFamily: "Inter_700Bold", fontSize: 20 },
  rewardBoxSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 8 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textPrimary },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 4, paddingHorizontal: 8 },
  seeAllText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.primary },
  separator: { height: 1, backgroundColor: Colors.divider, marginHorizontal: 20 },
  empty: { paddingTop: 40, alignItems: "center", gap: 10 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
});

// ─── Billing styles ───────────────────────────────────────────────────────────

const rwdS = StyleSheet.create({
  summaryBanner: {
    backgroundColor: "rgba(79,127,255,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(79,127,255,0.18)",
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  summaryPct: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: Colors.primary,
  },
  progTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progFill: {
    height: 6,
    borderRadius: 3,
  },
  summaryHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 15,
  },
});

const bill = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  itemLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  itemValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    lineHeight: 18,
  },
  itemSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
  },
  currentBalance: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  cbLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cbValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.textPrimary,
  },
  urgencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  urgencyText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.3,
  },
});

// ─── Subscription panel styles ────────────────────────────────────────────────

const subPnl = StyleSheet.create({
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  totalLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  totalAmt: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  mo: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderLeftWidth: 3,
    paddingLeft: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  icon: { fontSize: 18 },
  info: { flex: 1, gap: 2 },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  category: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  right: { alignItems: "flex-end", gap: 2, flexShrink: 0 },
  amount: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  nextDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  sep: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 62,
    marginRight: 4,
  },
  cancelBtn: {
    backgroundColor: "rgba(255,107,138,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,107,138,0.25)",
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: 4,
  },
  cancelText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: Colors.negative,
    letterSpacing: 0.3,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  disclaimerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
    flex: 1,
    lineHeight: 14,
  },
});
